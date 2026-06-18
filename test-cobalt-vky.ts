async function testVky() {
  const videoId = "dQw4w9WgXcQ";
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = [
    "https://cobalt.vky.app/",
    "https://cobalt.fast-minds.net/",
    "https://co.e7.to/",
    "https://cobalt.perv.cat/"
  ];

  for (const inst of instances) {
    console.log(`\nTesting instance: ${inst}`);
    // 1. Test clean payload
    try {
      const res = await fetch(inst, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({
          url: url,
          downloadMode: "audio",
          audioFormat: "mp3"
        })
      });
      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Body excerpt:", text.slice(0, 500));
    } catch (err: any) {
      console.error("Error with clean:", err.message);
    }
  }
}
testVky();
