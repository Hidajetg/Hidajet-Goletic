package com.solstone.baustelle;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class SolstoneMessagingService extends FirebaseMessagingService {
    static final String CHAT="solstone_messages_v1", CALL="solstone_calls_v1";
    static void channels(Context c) {
        if(Build.VERSION.SDK_INT>=26) {
            NotificationManager m=c.getSystemService(NotificationManager.class);
            if(m==null)return;
            for(String id:new String[]{CHAT,CALL}){
                NotificationChannel channel=new NotificationChannel(id,id.equals(CALL)?"Solstone Anrufe":"Solstone Nachrichten",NotificationManager.IMPORTANCE_HIGH);
                channel.enableVibration(true);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
                m.createNotificationChannel(channel);
            }
        }
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        Map<String,String> data=message.getData();
        String kind=data.get("kind"), binding=data.get("binding");
        if(!"chat".equals(kind) && !"call".equals(kind))return;
        long now=System.currentTimeMillis(), expires;
        try {expires=Long.parseLong(data.get("expires"));} catch(Exception e){return;}
        if(expires<=now || expires>now+180000)return;
        android.content.SharedPreferences prefs=SolstonePushPlugin.prefs(this);
        if(binding==null || !binding.equals(prefs.getString("binding","")) || prefs.getLong("expires",0)<=now)return;
        // Existing authorized web alerts handle foreground chat; don't ring twice.
        if(MainActivity.foreground && "chat".equals(kind))return;
        if(!NotificationManagerCompat.from(this).areNotificationsEnabled())return;
        channels(this);
        boolean call="call".equals(kind);
        Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap=PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder n=new NotificationCompat.Builder(this,call?CALL:CHAT)
            .setSmallIcon(R.drawable.ic_solstone_notification)
            .setContentTitle("Solstone Baustelle")
            .setContentText(call?"Eingehender Anruf / Dolazni poziv":"Neue Nachricht / Nova poruka")
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(tap).setAutoCancel(true);
        if(call)n.setTimeoutAfter(Math.max(1,expires-now));
        try { NotificationManagerCompat.from(this).notify(call?7102:7101,n.build()); }
        catch(SecurityException ignored){}
    }
    @Override public void onNewToken(String token) {
        // Refresh binding and server registration on next authenticated foreground sync.
        SolstonePushPlugin.prefs(this).edit().clear().apply();
    }
}
