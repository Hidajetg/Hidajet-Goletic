package com.solstone.baustelle;

import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.webkit.WebBackForwardList;
import android.webkit.WebHistoryItem;
import androidx.activity.OnBackPressedCallback;
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
    private boolean backInProgress = false;
    private static final long EXIT_INTERVAL_MS = 2000L;
    private long lastBackAt = -EXIT_INTERVAL_MS;
    private Toast backToast;

    @Override public void onResume() {
        super.onResume(); foreground = true;
        if (updater != null) updater.onResume();
    }
    @Override public void onPause() {
        foreground = false;
        lastBackAt = -EXIT_INTERVAL_MS;
        if (backToast != null) backToast.cancel();
        super.onPause();
    }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        registerPlugin(SolstonePushPlugin.class);
        super.onCreate(savedInstanceState);
        updater = new SolstoneUpdateChecker(this);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleAppBack(); }
        });

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setDownloadListener(
                (url, userAgent, contentDisposition, mimeType, contentLength) ->
                    startSystemDownload(url, userAgent, contentDisposition, mimeType)
            );
        }
    }

    /** Native Back: close panels first, protect edits, then go back once.
     * A second eligible press within two seconds backgrounds the task, not the
     * authenticated session. Android handles the IME before this callback. */
    private void handleAppBack() {
        if (backInProgress || bridge == null || bridge.getWebView() == null) return;
        final WebView view = bridge.getWebView();
        final String current = view.getUrl();
        final String origin = bridge.getServerUrl();
        if (current == null || origin == null) return;
        final long pressedAt = SystemClock.elapsedRealtime();
        if (!sameAppOrigin(current, origin)) {
            lastBackAt = -EXIT_INTERVAL_MS;
            navigateAppBack(view, current, origin);
            return;
        }

        backInProgress = true;
        // Preserve the existing cancellable panel event. The web guard also
        // consumes Back if a draft must be protected.
        view.evaluateJavascript("!window.dispatchEvent(new Event('solstone-native-back',{cancelable:true}))", result -> {
            backInProgress = false;
            if (isFinishing() || isDestroyed() || !foreground || !current.equals(view.getUrl())) {
                lastBackAt = -EXIT_INTERVAL_MS;
                return;
            }
            // Fail closed if the page did not return a boolean.
            if (!"false".equals(result)) {
                lastBackAt = -EXIT_INTERVAL_MS;
                if (backToast != null) backToast.cancel();
                return;
            }
            if (pressedAt - lastBackAt < EXIT_INTERVAL_MS) {
                lastBackAt = -EXIT_INTERVAL_MS;
                if (backToast != null) backToast.cancel();
                moveTaskToBack(true);
                return;
            }
            lastBackAt = pressedAt;
            navigateAppBack(view, current, origin);
            if (backToast != null) backToast.cancel();
            // Read language from the trusted web origin, without exposing any
            // authentication data.
            view.evaluateJavascript("(localStorage.getItem('lang')||'ba')", value -> {
                if (!foreground || isFinishing() || isDestroyed() || lastBackAt != pressedAt) return;
                String hint = "Pritisni ponovo za izlazak";
                if ("\"de\"".equals(value)) hint = "Zum Beenden erneut drücken";
                else if ("\"en\"".equals(value)) hint = "Press again to exit";
                else if ("\"cz\"".equals(value)) hint = "Pro ukončení stiskněte znovu";
                else if ("\"uz\"".equals(value)) hint = "Chiqish uchun yana bosing";
                backToast = Toast.makeText(getApplicationContext(), hint, Toast.LENGTH_SHORT);
                backToast.show();
            });
        });
    }

    private static boolean sameAppOrigin(String candidate, String origin) {
        if (candidate == null || origin == null) return false;
        Uri a = Uri.parse(candidate), b = Uri.parse(origin);
        if (!"https".equalsIgnoreCase(a.getScheme()) || !"https".equalsIgnoreCase(b.getScheme())
                || a.getHost() == null || b.getHost() == null) return false;
        int ap = a.getPort() == -1 ? 443 : a.getPort();
        int bp = b.getPort() == -1 ? 443 : b.getPort();
        return a.getHost().equalsIgnoreCase(b.getHost()) && ap == bp;
    }

    private static boolean rootPath(String path) {
        return path == null || path.isEmpty() || "/".equals(path)
            || "/dashboard".equals(path) || "/dashboard/".equals(path)
            || "/login".equals(path) || "/login/".equals(path)
            || "/login-secure".equals(path);
    }

    private void navigateAppBack(WebView view, String current, String origin) {
        String path = Uri.parse(current).getPath();
        if (sameAppOrigin(current, origin) && rootPath(path)) return;

        WebBackForwardList history = view.copyBackForwardList();
        int index = history.getCurrentIndex();
        if (view.canGoBack() && index > 0) {
            WebHistoryItem previous = history.getItemAtIndex(index - 1);
            if (previous != null && sameAppOrigin(previous.getUrl(), origin)) {
                String previousPath = Uri.parse(previous.getUrl()).getPath();
                if (previousPath != null && !"/".equals(previousPath)
                        && !previousPath.startsWith("/login")) {
                    view.goBack();
                    return;
                }
            }
        }

        // Deep links and notification launches may have no useful history.
        // Fall back to the parent room or site, otherwise the dashboard.
        String parent = "/dashboard";
        if (sameAppOrigin(current, origin) && path != null) {
            if (path.matches("/baustellen/[0-9]+/prostorije/[0-9]+/[^/]+/?")) {
                String trimmed = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
                parent = trimmed.substring(0, trimmed.lastIndexOf('/'));
            } else if (path.matches("/baustellen/[0-9]+/prostorije/[0-9]+/?")) {
                parent = path.split("/")[1].equals("baustellen") ? "/baustellen/" + path.split("/")[2] + "/prostorije" : "/dashboard";
            } else if (path.matches("/baustellen/[0-9]+/[^/]+/?")) {
                parent = "/baustellen/" + path.split("/")[2];
            } else if (path.matches("/baustellen/[0-9]+/?")) {
                parent = "/baustellen";
            }
        }
        view.loadUrl(Uri.parse(origin).buildUpon().path(parent).clearQuery().fragment(null).build().toString());
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
