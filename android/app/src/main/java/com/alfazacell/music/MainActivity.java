package com.alfazacell.music;

import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity - Entry point of Music Alfaza
 *
 * Key responsibilities:
 * 1. Start MusicPlayerService as a Foreground Service when the app launches
 * 2. Stop the service when the user explicitly quits the app
 * 3. Keep WebView alive during background (onPause trick)
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Start the Foreground Service immediately on launch
        // This registers our "keep-alive" process with Android
        startMusicService();
        
        // Optimize WebView for background audio
        configureWebViewForAudio();
    }

    @Override
    public void onPause() {
        super.onPause();
        // CRITICAL: Call webView.onResume() inside onPause() so WebView
        // does NOT pause JavaScript execution when the app goes to background
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume();
        }
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    private void startMusicService() {
        Intent serviceIntent = new Intent(this, MusicPlayerService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Android 8.0+ requires startForegroundService() for background start
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }


    /**
     * Configure WebView to support background audio and media playback.
     */
    private void configureWebViewForAudio() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        
        WebSettings settings = webView.getSettings();
        
        // Allow media to play WITHOUT user gesture (critical for auto-play on reload)
        settings.setMediaPlaybackRequiresUserGesture(false);
        
        // Keep JS running even when WebView is not visible
        settings.setJavaScriptEnabled(true);
    }
}
