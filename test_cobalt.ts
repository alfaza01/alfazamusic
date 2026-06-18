import fetch from "node-fetch";

async function testCobalt() {
  const CobaltInstances = [
    "https://cobalt.fast-minds.net/",
    "https://co.e7.to/",
    "https://cobalt.perv.cat/",
    "https://cobalt.vky.app/",
    "https://api.cobalt.sh/",
    "https://api.cobalt.moe/"
  ];
  const videoId = "kJQP7kiw5Fk";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log("Testing Cobalt instances...");

  for (const api of CobaltInstances) {
    try {
      console.log(`\nTesting instance: ${api}`);
      const streamRes = await fetch(api, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          url,
          isAudioOnly: true,
          downloadMode: "audio",
          audioFormat: "mp3",
          audioBitrate: "128"
        })
      });

      console.log("Status:", streamRes.status);
      if (streamRes.ok) {
        const data = await streamRes.json() as any;
        console.log("Response data:", JSON.stringify(data, null, 2));
      } else {
        const errText = await streamRes.text();
        console.log("Error text:", errText.substring(0, 200));
      }
    } catch (err: any) {
      console.log("Fetch failed:", err.message);
    }
  }
}

testCobalt();
