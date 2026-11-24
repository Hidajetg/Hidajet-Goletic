package com.solstone.baustelle;

import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

/**
 * Web/PIN internal test shell.
 *
 * The hosted Next.js web app already generates files such as PDF reports and
 * construction-site exports. Android's WebView does not download HTTP(S)
 * attachments by itself, so hand direct download links to DownloadManager.
 *
 * Blob URLs and JS-generated files are not handled here; those still need
 * separate testing with real user workflows before production rollout.
 */
public class MainActivity extends BridgeActivity {
    static volatile boolean foreground = false;
    private SolstoneUpdateChecker updater;

    @Override public void onResume() {
        super.onResume(); foreground = true;
        if (updater != null) updater.onResume();
    }
    @Override public void onPause() { foreground = false; super.onPause(); }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        registerPlugin(SolstonePushPlugin.class);
        super.onCreate(savedInstanceState);
        updater = new SolstoneUpdateChecker(this);

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setDownloadListener(
                (url, userAgent, contentDisposition, mimeType, contentLength) ->
                    startSystemDownload(url, userAgent, contentDisposition, mimeType)
            );
        }
    }

    @Override public void onDestroy() {
        if (updater != null) updater.close();
        super.onDestroy();
    }

    private void startSystemDownload(
        String url,
        String userAgent,
        String contentDisposition,
        String mimeType
    ) {
        if (url == null || url.isEmpty()) {
            showMessage("Download link unavailable.");
            return;
        }

        final Uri uri = Uri.parse(url);
        // Refuse blob:, data:, file: and plain HTTP links, including cleartext
        // URLs from external pages. Never attach session cookies to them.
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            showMessage("Only HTTPS file downloads are supported.");
            return;
        }

        try {
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            if (fileName == null || fileName.isEmpty()) {
                fileName = "solstone-download";
            }
            // File names must not contain path separators, control characters
            // or platform-reserved characters from Content-Disposition headers.
            fileName = fileName.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
            if (".".equals(fileName) || "..".equals(fileName)) {
                fileName = "solstone-download";
            }

            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle(fileName);
            request.setDescription("Solstone Baustelle");
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );

            if (mimeType != null && !mimeType.isEmpty()) {
                request.setMimeType(mimeType);
            }
            if (userAgent != null && !userAgent.isEmpty()) {
                request.addRequestHeader("User-Agent", userAgent);
            }

            // Attach WebView cookies ONLY to the exact HTTPS origin hosting
            // the Solstone website. Never forward them to other domains.
            String appUrl = bridge != null ? bridge.getServerUrl() : null;
            if (appUrl != null && appUrl.startsWith("https://")) {
                Uri appUri = Uri.parse(appUrl);
                boolean sameOrigin =
                    appUri.getHost() != null &&
                    appUri.getHost().equalsIgnoreCase(uri.getHost()) &&
                    appUri.getPort() == uri.getPort();
                if (sameOrigin) {
                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null && !cookies.isEmpty()) {
                        request.addRequestHeader("Cookie", cookies);
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, fileName
                );
            } else {
                // API 28 and below: avoid requesting storage permission by
                // using the app-specific Downloads folder.
                request.setDestinationInExternalFilesDir(
                    this, Environment.DIRECTORY_DOWNLOADS, fileName
                );
            }

            DownloadManager manager =
                (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                showMessage("Android DownloadManager unavailable.");
                return;
            }
            manager.enqueue(request);
            showMessage("Download started: " + fileName);
        } catch (Exception exception) {
            android.util.Log.e("SolstoneDownload", "Unable to start download", exception);
            showMessage("Unable to download this file.");
        }
    }

    private void showMessage(String message) {
        runOnUiThread(() ->
            Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show()
        );
    }
}
