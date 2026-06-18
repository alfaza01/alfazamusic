import fetch from "node-fetch";

async function testAllInvidious() {
  const videoId = "kJQP7kiw5Fk";
  try {
    console.log("Fetching fresh instances from invidious.io...");
    const res = await fetch("https://api.invidious.io/instances.json");
    if (!res.ok) {
      console.log("Failed to fetch instance list");
      return;
    }
    const instances: any[] = await res.json();
    const activeInstances = instances
      .map((item: any) => item[1])
      .filter((inst: any) => inst.type === "https" && !inst.monitor?.down && inst.uri);

    console.log(`Analyzing ${activeInstances.length} active instances...`);
    
    for (const inst of activeInstances) {
      const uri = inst.uri;
      try {
        console.log(`\nTesting instance: ${uri}`);
        const apiRes = await fetch(`${uri}/api/v1/videos/${videoId}`, { timeout: 4000 });
        console.log(`  API Status: ${apiRes.status}`);
        if (apiRes.ok) {
          const data: any = await apiRes.json();
          if (data.adaptiveFormats) {
            const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
            console.log(`  Found ${audios.length} audio formats.`);
            if (audios.length > 0) {
              const bestAudio = audios[0];
              console.log(`  Stream sample URL: ${bestAudio.url.substring(0, 100)}...`);
              
              // Let's see if our backend server is blocked with 403 on this specific stream URL
              console.log("  Testing if server is blocked (pinging Googlevideo URL)...");
              const pingRes = await fetch(bestAudio.url, {
                method: "HEAD",
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout: 3000
              });
              console.log(`  Googlevideo HEAD Status: ${pingRes.status}`);
              if (pingRes.status === 200 || pingRes.status === 206) {
                console.log(`⭐⭐ FOUND WORKING INSTANCE!! ${uri}`);
              }
            }
          }
        }
      } catch (err: any) {
        console.log(`  Failed for ${uri}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error("Critical error:", err.message);
  }
}

testAllInvidious();
