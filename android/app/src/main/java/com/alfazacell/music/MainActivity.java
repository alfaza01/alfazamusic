package com.alfazacell.music;

import android.os.Bundle;
import android.webkit.WebView;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Trigger Picture-in-Picture mode when the user presses the home button (minimize)
        // This keeps the WebView active and tricks YouTube into thinking it's still visible!
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(21, 9)) // Wide aspect ratio for a mini audio player
                    .build();
                enterPictureInPictureMode(params);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.onResume(); // Keep WebView "alive" when app goes to background
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
}
