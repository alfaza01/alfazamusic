import fetch from "node-fetch";

async function testInvidious() {
  try {
    const videoId = "kJQP7kiw5Fk";
    console.log("Fetching instances from invidious.io...");
    const res = await fetch("https://api.invidious.io/instances.json");
    if (!res.ok) {
      console.log("Failed to fetch list");
      return;
    }
    const instances: any[] = await res.json();
    console.log("Total instances fetched:", instances.length);
    const httpsInstances = instances
      .map((item: any) => item[1])
      .filter((inst: any) => inst.type === "https" && !inst.monitor?.down && inst.uri)
      .sort((a: any, b: any) => (b.monitor?.uptime || 0) - (a.monitor?.uptime || 0));

    console.log(`Checking top 10 instances...`);
    for (const inst of httpsInstances.slice(0, 10)) {
      const uri = inst.uri;
      try {
        console.log(`\nTrying instance: ${uri}`);
        const streamRes = await fetch(`${uri}/api/v1/videos/${videoId}`);
        console.log(`Status: ${streamRes.status}`);
        if (streamRes.ok) {
          const data = await streamRes.json() as any;
          if (data.adaptiveFormats) {
            const audios = data.adaptiveFormats.filter((f: any) => f.type && f.type.startsWith("audio/"));
            console.log(`Found ${audios.length} audio streams!`);
            if (audios.length > 0) {
              const best = audios[0];
              console.log(`Example audio URL: ${best.url.substring(0, 100)}...`);
              
              // Now let's try to ping the URL to see if it's reachable or returns 403
              console.log("Pinging audio stream...");
              const pingRes = await fetch(best.url, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              });
              console.log(`Audio Stream Ping Status: ${pingRes.status}`);
            }
          } else {
            console.log("No adaptive formats.");
          }
        }
      } catch (err: any) {
        console.log("Error on instance:", err.message);
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

testInvidious();
