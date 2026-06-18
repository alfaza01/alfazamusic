import fetch from "node-fetch";

async function testVevioz() {
  try {
    const url = "https://www.vevioz.com/api/button/mp3/kJQP7kiw5Fk";
    console.log("Fetching", url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("Text (first 500 chars):", text.substring(0, 500));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

testVevioz();
