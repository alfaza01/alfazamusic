import ytdl from "@distube/ytdl-core";

async function testDistube() {
  const videoId = "kJQP7kiw5Fk";
  try {
    console.log(`Getting info from @distube/ytdl-core for ${videoId}...`);
    const info = await ytdl.getInfo(videoId);
    console.log("Success! Title:", info.videoDetails.title);
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    console.log(`Found ${audioFormats.length} audio formats.`);
    if (audioFormats.length > 0) {
      const best = audioFormats[0];
      console.log("Best format URL:", best.url.substring(0, 100) + "...");
    }
  } catch (err: any) {
    console.error("DisTube failed:", err.message || err);
  }
}

testDistube();
