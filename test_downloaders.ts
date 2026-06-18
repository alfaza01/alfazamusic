import fetch from "node-fetch";

async function testDownloaders() {
  const urls = [
    "https://api.v02.api-mp3.org.uk/download?id=kJQP7kiw5Fk&format=mp3",
    "https://cc.api-mp3.dev/download?id=kJQP7kiw5Fk&format=mp3",
    "https://api-mp3.org.uk/download?id=kJQP7kiw5Fk&format=mp3",
    "https://api.musicder.net",
    "https://api.ytmp3.cc"
  ];
  for (const url of urls) {
    try {
      console.log(`\nTesting downloader: ${url}`);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      console.log("Status:", res.status);
      console.log("Content-Type:", res.headers.get("content-type"));
      const text = await res.text();
      console.log("First 150 chars:", text.substring(0, 150));
    } catch (err: any) {
      console.log("Failed:", err.message);
    }
  }
}

testDownloaders();
