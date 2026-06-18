import fetch from "node-fetch";

async function testVeviozHost() {
  const urls = [
    "https://vevioz.com",
    "https://www.vevioz.com",
    "https://button.vevioz.com",
    "https://api.vevioz.com"
  ];
  for (const url of urls) {
    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url);
      console.log(`Success! Status: ${res.status}`);
    } catch (err: any) {
      console.log(`Failed! ${err.message}`);
    }
  }
}

testVeviozHost();
