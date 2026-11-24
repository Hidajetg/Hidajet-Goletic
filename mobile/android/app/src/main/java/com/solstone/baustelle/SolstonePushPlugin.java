package com.solstone.baustelle;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name="SolstonePush", permissions={
    @Permission(alias="notifications", strings={Manifest.permission.POST_NOTIFICATIONS})
})
public class SolstonePushPlugin extends Plugin {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("solstone_push", Context.MODE_PRIVATE); }
    private boolean configured() { return !FirebaseApp.getApps(getContext()).isEmpty(); }
    private boolean allowed() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled() &&
            (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications")==PermissionState.GRANTED);
    }
    @PluginMethod public void status(PluginCall call) {
        JSObject result=new JSObject();
        result.put("configured",configured());
        result.put("enabled",configured() && allowed() &&
            prefs(getContext()).getLong("expires",0)>System.currentTimeMillis() &&
            !prefs(getContext()).getString("binding","").isEmpty());
        call.resolve(result);
    }
    @PluginMethod public void registration(PluginCall call) {
        if(!configured()) {call.reject("Firebase not configured");return;}
        if(Build.VERSION.SDK_INT>=33 && getPermissionState("notifications")!=PermissionState.GRANTED) {
            if(Boolean.TRUE.equals(call.getBoolean("prompt",false))) requestPermissionForAlias("notifications",call,"permissionResult");
            else call.resolve(new JSObject());
            return;
        }
        issueToken(call);
    }
    @PermissionCallback private void permissionResult(PluginCall call) { issueToken(call); }
    private void issueToken(PluginCall call) {
        if(!allowed()) {call.resolve(new JSObject());return;}
        SolstoneMessagingService.channels(getContext());
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{
            if(!task.isSuccessful()) {call.reject("FCM token unavailable");return;}
            JSObject result=new JSObject();result.put("token",task.getResult());call.resolve(result);
        });
    }
    @PluginMethod public void bind(PluginCall call) {
        String binding=call.getString("binding","");
        long expires;
        try {expires=Long.parseLong(call.getString("expiresAt",""));} catch(Exception e){call.reject("Invalid expiry");return;}
        String token=call.getString("token","");
        if(!allowed() || !binding.matches("[0-9a-f]{64}") || token.length()<32 || expires<=System.currentTimeMillis()) {
            call.reject("Invalid notification binding");return;
        }
        prefs(getContext()).edit().putString("binding",binding).putLong("expires",expires).putString("registeredToken",token).apply();
        call.resolve();
    }
    @PluginMethod public void clear(PluginCall call) {
        prefs(getContext()).edit().clear().apply();
        NotificationManager manager=(NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if(manager!=null){manager.cancel(7101);manager.cancel(7102);}
        call.resolve();
    }
}
