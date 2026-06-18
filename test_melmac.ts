import fetch from "node-fetch";

async function testMelmacLocalMetadata() {
  const videoId = "kJQP7kiw5Fk";
  const url = `https://iv.melmac.space/api/v1/videos/${videoId}?local=true`;
  console.log("Testing API with local=true:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    if (res.ok) {
      const data: any = await res.json();
      console.log("Has adaptiveFormats:", !!data.adaptiveFormats);
      if (data.adaptiveFormats) {
        const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
        console.log(`Audios count: ${audios.length}`);
        if (audios.length > 0) {
          const sample = audios[0].url;
          console.log("Audio URL:", sample.substring(0, 150));
          // Test if we can make a GET request to this audio URL
          const ping = await fetch(sample, { 
            headers: {
              "Range": "bytes=0-10",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          console.log("Ping Status (GET first 10 bytes):", ping.status);
          console.log("Ping Content-Type:", ping.headers.get("content-type"));
          console.log("Ping Content-Range:", ping.headers.get("content-range"));
        }
      }
    }
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

testMelmacLocalMetadata();
