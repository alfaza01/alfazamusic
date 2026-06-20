/**
 * InnerTube API Client untuk React / Browser
 * Diadaptasi dari MusicCuba (AuraMusic) InnerTube.kt
 * 
 * Modul ini menggunakan klien WEB_REMIX bersama dengan PoToken
 * untuk menipu sistem keamanan YouTube agar tidak diblokir.
 */

import { generatePoToken } from "./poToken";

export interface StreamingData {
  url: string;
  mimeType: string;
  bitrate: number;
}

export async function getPlayerStream(videoId: string): Promise<string | null> {
  console.log("[InnerTube] Mengambil PoToken (BotGuard) untuk video:", videoId);
  
  // Menghasilkan PoToken rahasia menggunakan script BotGuard
  const poToken = await generatePoToken(videoId);
  
  if (!poToken) {
    console.warn("[InnerTube] Gagal mendapatkan PoToken, pemutaran mungkin diblokir!");
  } else {
    console.log("[InnerTube] PoToken berhasil diamankan:", poToken.substring(0, 20) + "...");
  }

  // Menyiapkan Payload yang sama persis dengan InnerTube.kt di AuraMusic
  const payload = {
    context: {
      client: {
        clientName: "WEB_REMIX", // Klien YouTube Music Web
        clientVersion: "1.20230725.01.00",
        hl: "id",
        gl: "ID"
      }
    },
    videoId: videoId,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: await getSignatureTimestamp()
      }
    },
    // Menyisipkan token anti-bot agar YouTube tidak menolak request kita
    serviceIntegrityDimensions: poToken ? {
      poToken: poToken
    } : undefined
  };

  try {
    const res = await fetch("https://music.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Origin": "https://music.youtube.com",
        "X-YouTube-Client-Name": "67", // WEB_REMIX
        "X-YouTube-Client-Version": "1.20230725.01.00",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    // Periksa status Playability (apakah diblokir atau UNPLAYABLE)
    if (data.playabilityStatus && data.playabilityStatus.status !== 'OK') {
      console.warn("[InnerTube] Status pemutaran:", data.playabilityStatus.status);
    }

    const formats = data.streamingData?.adaptiveFormats || [];
    
    // Cari format audio mp4 (m4a) atau webm
    const audio = formats.find((f: any) => f.mimeType && f.mimeType.includes("audio/mp4")) ||
                  formats.find((f: any) => f.mimeType && f.mimeType.includes("audio/"));

    if (audio && audio.url) {
      console.log("[InnerTube] Audio URL Stream berhasil didapatkan dari server Google!");
      return audio.url;
    }

  } catch (err) {
    console.error("[InnerTube] Gagal memanggil API player:", err);
  }

  return null;
}

// Helper untuk mendapatkan signature timestamp yang dibutuhkan oleh YouTube
async function getSignatureTimestamp(): Promise<number> {
  try {
    const swJsRes = await fetch("https://music.youtube.com/sw.js_data");
    const text = await swJsRes.text();
    // Ekstrak timestamp dari response text (mirip dengan getSwJsData di Kotlin)
    const match = text.match(/\"signatureTimestamp\":(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
  } catch (e) {}
  return 19740; // Default fallback fallback
}
