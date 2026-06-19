package com.alfazacell.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/**
 * MusicPlayerService - Foreground Service for Background Audio Playback
 *
 * This Service does TWO critical things:
 * 1. Runs as a FOREGROUND SERVICE so Android never kills it (even in Doze/Battery Saver mode)
 * 2. Holds a WakeLock so the CPU stays awake to keep the audio stream alive
 *
 * Without this, Android's Battery Optimization kills WebView apps within ~3-5 minutes
 * of the screen being locked, cutting off audio playback.
 */
public class MusicPlayerService extends Service {

    private static final String CHANNEL_ID = "music_alfaza_playback_channel";
    private static final int NOTIFICATION_ID = 1001;

    // WakeLock keeps CPU running even when screen is off
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        startForeground(NOTIFICATION_ID, buildNotification("Memuat lagu...", "Music Alfaza"));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // If Android kills the service, restart it immediately
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Acquire a PARTIAL_WAKE_LOCK to keep the CPU running while the screen is off.
     * This is the KEY to preventing audio from stopping when the screen locks.
     */
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "MusicAlfaza::AudioPlaybackWakeLock"
            );
            wakeLock.acquire(); // Acquire indefinitely until we release it
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    /**
     * Create the notification channel required for Android 8.0+ (Oreo).
     * Without this, the Foreground Service notification cannot be shown.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Alfaza - Pemutaran Musik",
                NotificationManager.IMPORTANCE_LOW  // LOW = no sound, no vibration, but still visible
            );
            channel.setDescription("Notifikasi kontrol pemutar musik Music Alfaza");
            channel.setLightColor(Color.BLUE);
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Build a persistent notification. This is mandatory for Foreground Services.
     * The notification tells Android: "This app is actively doing something important,
     * do NOT kill it."
     */
    private Notification buildNotification(String title, String artist) {
        // Tap the notification to bring the app back to the foreground
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent, pendingIntentFlags
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)           // Cannot be swiped away
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on Lock Screen
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }
}
