package com.abid.zara;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final int REQUEST_FILE = 7820;
    private WebView web;
    private NativeBridge bridge;
    private ProgressBar progress;
    private LinearLayout offline;
    private ValueCallback<Uri[]> fileCallback;
    private String bridgeScript;
    private boolean injectAfterLoad;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(23,19,30)); root.setFitsSystemWindows(true);
        LinearLayout toolbar = new LinearLayout(this); toolbar.setPadding(dp(8),dp(2),dp(8),dp(2));
        TextView title = new TextView(this); title.setText("Zara"); title.setTextSize(19); title.setTextColor(Color.rgb(239,178,203)); title.setGravity(android.view.Gravity.CENTER_VERTICAL);
        toolbar.addView(title,new LinearLayout.LayoutParams(0,dp(44),1));
        Button local = button("Offline"); local.setOnClickListener(v -> startActivity(new Intent(this, OfflineActivity.class))); toolbar.addView(local);
        Button reload = button("Reload"); reload.setOnClickListener(v -> loadHome()); toolbar.addView(reload);
        Button chrome = button("Chrome"); chrome.setOnClickListener(v -> openExternal(OriginPolicy.START_URL)); toolbar.addView(chrome);
        root.addView(toolbar,new LinearLayout.LayoutParams(-1,-2));
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); progress.setMax(100); root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        offline = new LinearLayout(this); offline.setOrientation(LinearLayout.VERTICAL); offline.setPadding(dp(18),dp(12),dp(18),dp(12)); offline.setVisibility(View.GONE);
        TextView notice = new TextView(this); notice.setText("Zara load nahi ho saki. Internet check karke Retry dabayein. Is version mein offline AI model nahi hai."); notice.setTextColor(Color.WHITE); offline.addView(notice);
        Button retry = button("Retry"); retry.setOnClickListener(v -> loadHome()); offline.addView(retry); root.addView(offline,new LinearLayout.LayoutParams(-1,-2));
        web = new WebView(this); web.setBackgroundColor(Color.rgb(23,19,30)); root.addView(web,new LinearLayout.LayoutParams(-1,0,1)); setContentView(root);
        WebSettings settings = web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        if (android.os.Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        bridge = new NativeBridge(this);
        try (InputStream input = getAssets().open("native-bridge.js"); ByteArrayOutputStream output = new ByteArrayOutputStream()) { byte[] buffer = new byte[4096]; int size; while ((size = input.read(buffer)) != -1) output.write(buffer,0,size); bridgeScript = new String(output.toByteArray(), StandardCharsets.UTF_8); } catch (Exception error) { bridgeScript = ""; }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) && !bridgeScript.isEmpty()) {
            WebViewCompat.addWebMessageListener(web,"ZaraAndroid",Collections.singleton(OriginPolicy.ORIGIN),(view,message,sourceOrigin,isMainFrame,replyProxy) -> {
                try { if (isMainFrame && OriginPolicy.isTrustedOrigin(sourceOrigin.toString()) && OriginPolicy.isAppPage(view.getUrl())) bridge.handle(message.getData(),replyProxy); } catch (Exception ignored) {}
            });
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) WebViewCompat.addDocumentStartJavaScript(web,bridgeScript,Collections.singleton(OriginPolicy.ORIGIN));
            else injectAfterLoad = true;
        }
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString(); if (OriginPolicy.isAppPage(url)) return false;
                if (request.hasGesture() && OriginPolicy.canOpenExternally(url)) openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,Bitmap favicon) { bridge.onPageChanging(); progress.setVisibility(View.VISIBLE); offline.setVisibility(View.GONE); }
            @Override public void onPageFinished(WebView view,String url) { progress.setVisibility(View.GONE); if (injectAfterLoad && OriginPolicy.isAppPage(url)) view.evaluateJavascript(bridgeScript,null); }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error) { if (request.isForMainFrame()) { offline.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE); } }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) { handler.cancel(); offline.setVisibility(View.VISIBLE); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view,int value) { progress.setProgress(value); }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if (!OriginPolicy.isAppPage(view.getUrl())) { callback.onReceiveValue(null); return true; }
                if (fileCallback != null) fileCallback.onReceiveValue(null); fileCallback = callback;
                try { Intent intent = params.createIntent(); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); startActivityForResult(intent,REQUEST_FILE); }
                catch (Exception error) { fileCallback = null; callback.onReceiveValue(null); Toast.makeText(MainActivity.this,"Files app available nahi.",Toast.LENGTH_LONG).show(); }
                return true;
            }
        });
        loadHome();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private Button button(String text) { Button button = new Button(this); button.setText(text); button.setTextSize(12); button.setAllCaps(false); return button; }
    private void loadHome() { if (bridge != null) bridge.onPageChanging(); offline.setVisibility(View.GONE); web.loadUrl(OriginPolicy.START_URL); }
    private void openExternal(String url) { if (!OriginPolicy.canOpenExternally(url)) return; try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url))); } catch (ActivityNotFoundException error) { Toast.makeText(this,"Browser available nahi.",Toast.LENGTH_LONG).show(); } }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == REQUEST_FILE) {
            ValueCallback<Uri[]> callback = fileCallback; fileCallback = null;
            if (callback != null) {
                Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode,data); ArrayList<Uri> valid = new ArrayList<>();
                if (result != null) for (Uri uri : result) if (uri != null && "content".equals(uri.getScheme())) valid.add(uri);
                callback.onReceiveValue(valid.isEmpty()?null:valid.toArray(new Uri[0]));
            }
        } else if (bridge != null) bridge.onActivityResult(requestCode,resultCode,data);
    }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); if (bridge != null) bridge.onResume(); }
    @Override protected void onPause() { if (bridge != null) bridge.stopTts(); if (web != null) web.onPause(); super.onPause(); }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; } if (bridge != null) bridge.close(); if (web != null) { web.stopLoading(); web.destroy(); web = null; } super.onDestroy(); }
}
