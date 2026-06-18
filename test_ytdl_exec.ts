import youtubeDl from "youtube-dl-exec";

async function testYtdlExec() {
  const videoId = "kJQP7kiw5Fk";
  try {
    console.log("Resolving with youtube-dl-exec...");
    const url = await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      getUrl: true,
      format: "bestaudio",
    });
    console.log("Success! Direct stream URL:", url);
  } catch (err: any) {
    console.error("youtube-dl-exec failed:", err.message || err);
  }
}

testYtdlExec();
