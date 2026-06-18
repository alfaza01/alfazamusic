import fetch from "node-fetch";

async function testCobaltOfficial() {
  const apis = [
    "https://api.cobalt.tools",
    "https://api.cobalt.tools/",
    "https://cobalt.tools",
    "https://api.cobalt.moe" // wait, let's see if this one also resolved
  ];
  const videoId = "kJQP7kiw5Fk";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  for (const api of apis) {
    try {
      console.log(`\nTesting official: ${api}`);
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
      const text = await streamRes.text();
      console.log("Response text:", text.substring(0, 300));
    } catch (err: any) {
      console.log("Failed:", err.message);
    }
  }
}

testCobaltOfficial();
