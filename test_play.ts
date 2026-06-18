import fetch from "node-fetch";

async function testPlay() {
  const videoId = "kJQP7kiw5Fk";
  try {
    const infoUrl = `https://iv.melmac.space/api/v1/videos/${videoId}`;
    console.log("Resolving video direct link via iv.melmac.space...");
    const res = await fetch(infoUrl);
    if (!res.ok) {
      console.log("Failed to resolve metadata");
      return;
    }
    const data: any = await res.json();
    const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
    if (audios.length === 0) {
      console.log("No audio formats found.");
      return;
    }
    const realAudioUrl = audios[0].url;
    console.log("Real Audio URL length:", realAudioUrl.length);
    console.log("Real Audio URL:", realAudioUrl.substring(0, 100));

    console.log("Pinging google video stream from server...");
    const streamRes = await fetch(realAudioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("Response Status:", streamRes.status);
    console.log("Content-Length:", streamRes.headers.get("content-length"));
  } catch (err: any) {
    console.log("Error during check:", err.message);
  }
}

testPlay();
