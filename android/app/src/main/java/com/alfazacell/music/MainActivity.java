package com.alfazacell.music;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onPause() {
        // Do NOT call super.onPause() on the WebView so audio keeps playing in background
        super.onPause();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume(); // Keep WebView "alive" when app goes to background
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();
        }
    }
}
