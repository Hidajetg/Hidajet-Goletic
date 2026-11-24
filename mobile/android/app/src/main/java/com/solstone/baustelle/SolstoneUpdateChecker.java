package com.solstone.baustelle;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

/** Checks only the company's public, approved release channel. Never installs silently. */
final class SolstoneUpdateChecker {
    private static final String REPO="https://github.com/Hidajetg/Hidajet-Goletic/releases/";
    private static final long CHECK_INTERVAL=6L*60*60*1000;
    private static final long MAX_APK=100L*1024*1024;
    private final MainActivity activity;
    private final SharedPreferences prefs;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private boolean busy=false, closed=false, awaitingSettings=false;
    private File pending;
    private long pendingVersion;
    SolstoneUpdateChecker(MainActivity activity){
        this.activity=activity;
        prefs=activity.getSharedPreferences("solstone_updates",0);
    }
    void onResume(){
        if(closed)return;
        if(awaitingSettings){
            awaitingSettings=false;
            if(canInstall() && pending!=null) launchInstaller();
            else pending=null;
            return;
        }
        if(pending!=null){offerInstall();return;}
        long now=System.currentTimeMillis(), last=prefs.getLong("lastCheck",0);
        if(busy || (now>=last && now-last<CHECK_INTERVAL))return;
        busy=true;
        executor.execute(()->{
            File apk=null;long version=0;boolean checked=false;
            try {
                PackageInfo installed=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
                long current=versionOf(installed);
                byte[] manifest;
                try(ByteArrayOutputStream out=new ByteArrayOutputStream()){
                    download(REPO+"latest/download/solstone-update.json",out,16384);
                    manifest=out.toByteArray();
                }catch(FileNotFoundException e){checked=true;return;}
                JSONObject m=new JSONObject(new String(manifest,java.nio.charset.StandardCharsets.UTF_8));
                version=m.getLong("versionCode");
                String name=m.getString("versionName"),digest=m.getString("sha256");
                long size=m.getLong("size");
                if(!activity.getPackageName().equals(m.getString("appId")) ||
                   !name.matches("1\\.0\\.[0-9]{1,7}\\.[0-9]{1,3}") ||
                   !digest.matches("[a-f0-9]{64}") || size<=0 || size>MAX_APK ||
                   version!=10000L+100L*Long.parseLong(name.split("\\.")[2])+Long.parseLong(name.split("\\.")[3]))throw new IOException("Invalid release");
                if(version<=current){checked=true;return;}
                File dir=new File(activity.getCacheDir(),"solstone-updates");
                if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Cache unavailable");
                File target=new File(dir,"update-"+version+".apk");
                if(!verified(target,version,size,digest)){
                    File part=new File(dir,"download.part.apk");
                    try{
                        try(FileOutputStream out=new FileOutputStream(part)){
                            download(REPO+"download/android-v"+name+"/Solstone-Baustelle-v"+name+".apk",out,size);
                        }
                        if(!verified(part,version,size,digest))throw new IOException("APK verification failed");
                        if(target.exists()&&!target.delete())throw new IOException("Cache busy");
                        if(!part.renameTo(target))throw new IOException("Cache move failed");
                    }finally{part.delete();}
                }
                apk=target;checked=true;
                File[] old=dir.listFiles();
                if(old!=null)for(File f:old)if(!f.equals(target)&&f.getName().matches("update-[0-9]+\\.apk"))f.delete();
            }catch(Exception ex){Log.w("SolstoneUpdate","Update unavailable: "+ex.getClass().getSimpleName());}
            finally{
                if(checked)prefs.edit().putLong("lastCheck",System.currentTimeMillis()).apply();
                final File ready=apk;final long code=version;
                activity.runOnUiThread(()->{
                    busy=false;
                    if(closed||ready==null)return;
                    pending=ready;pendingVersion=code;
                    if(MainActivity.foreground)offerInstall();
                });
            }
        });
    }
    private boolean verified(File file,long expected,long size,String digest)throws Exception{
        if(!file.isFile()||file.length()!=size)return false;
        MessageDigest hash=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1)hash.update(b,0,n);}
        StringBuilder hex=new StringBuilder();for(byte b:hash.digest())hex.append(String.format(Locale.ROOT,"%02x",b&255));
        if(!digest.contentEquals(hex))return false;
        PackageManager pm=activity.getPackageManager();
        int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo archive=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags);
        PackageInfo installed=pm.getPackageInfo(activity.getPackageName(),flags);
        if(archive==null||!activity.getPackageName().equals(archive.packageName)||versionOf(archive)!=expected||expected<=versionOf(installed))return false;
        Signature[] a=signers(archive), b=signers(installed);
        return a!=null&&b!=null&&a.length==1&&b.length==1&&Arrays.equals(a,b);
    }
    @SuppressWarnings("deprecation") private static Signature[] signers(PackageInfo p){
        return Build.VERSION.SDK_INT>=28?(p.signingInfo==null?null:p.signingInfo.getApkContentsSigners()):p.signatures;
    }
    @SuppressWarnings("deprecation") private static long versionOf(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;}
    private boolean canInstall(){return Build.VERSION.SDK_INT<26||activity.getPackageManager().canRequestPackageInstalls();}
    private void offerInstall(){
        if(!MainActivity.foreground||pending==null||closed)return;
        if(!canInstall()){
            // Android owns this permission screen. Do not bypass user consent.
            awaitingSettings=true;
            try{
                Toast.makeText(activity,"Solstone Update: Installation erlauben / Dozvoli nadogradnju",Toast.LENGTH_LONG).show();
                activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())));
            }catch(Exception e){awaitingSettings=false;pending=null;}
        }else launchInstaller();
    }
    private void launchInstaller(){
        File file=pending;pending=null;
        if(file==null||closed)return;
        try{
            if(pendingVersion<=versionOf(activity.getPackageManager().getPackageInfo(activity.getPackageName(),0)))return;
            Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".fileprovider",file);
            Intent intent=new Intent(Intent.ACTION_INSTALL_PACKAGE);
            intent.setDataAndType(uri,"application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        }catch(Exception e){Log.w("SolstoneUpdate","System installer unavailable");}
    }
    void close(){closed=true;executor.shutdownNow();}
    private static boolean trusted(URL u){
        String h=u.getHost().toLowerCase(Locale.ROOT);
        return "https".equals(u.getProtocol())&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443)
            &&("github.com".equals(h)||"release-assets.githubusercontent.com".equals(h)||"objects.githubusercontent.com".equals(h));
    }
    private static void download(String source,OutputStream out,long limit)throws Exception{
        URL url=new URL(source);
        for(int redirects=0;redirects<6;redirects++){
            if(!trusted(url))throw new IOException("Untrusted release host");
            HttpURLConnection conn=(HttpURLConnection)url.openConnection();
            conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(10000);conn.setReadTimeout(20000);
            conn.setRequestProperty("Accept-Encoding","identity");conn.setRequestProperty("User-Agent","Solstone-Android-Updater");
            try{
                int status=conn.getResponseCode();
                if(status==404)throw new FileNotFoundException();
                if(status>=300&&status<400){String next=conn.getHeaderField("Location");if(next==null)throw new IOException("No redirect");url=new URL(url,next);continue;}
                if(status!=200)throw new IOException("HTTP "+status);
                long count=0;byte[] buf=new byte[32768];
                try(InputStream in=conn.getInputStream()){int n;while((n=in.read(buf))!=-1){count+=n;if(count>limit)throw new IOException("Download too large");out.write(buf,0,n);}}
                return;
            }finally{conn.disconnect();}
        }
        throw new IOException("Too many redirects");
    }
}
