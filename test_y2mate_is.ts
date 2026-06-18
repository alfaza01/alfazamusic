import fetch from "node-fetch";

async function testY2mateIs() {
  const videoId = "kJQP7kiw5Fk";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const endpoints = [
    "https://y2mate.is/api/convert",
    "https://y2mate.is/api/ajax",
    "https://y2mate.is/api/video",
    "https://y2mate.is/ajax.php",
    "https://y2mate.is/api/express"
  ];

  for (const ep of endpoints) {
    try {
      console.log(`\nTesting: ${ep}`);
      const res = await fetch(ep, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({ url }),
        timeout: 5000
      } as any);

      console.log(`  Status: ${res.status}`);
      const text = await res.text();
      console.log(`  Body (first 200 chars):`, text.substring(0, 200));
    } catch (e: any) {
      console.log(`  Failed for ${ep}: ${e.message}`);
    }
  }
}

testY2mateIs();
