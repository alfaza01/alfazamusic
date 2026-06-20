const { execSync } = require('child_process');
try {
  const url = execSync('bin\\\\yt-dlp.exe -g -f bestaudio "https://www.youtube.com/watch?v=kJQP7kiw5Fk"', {stdio: 'pipe'}).toString();
  console.log("SUCCESS:", url);
} catch(e) {
  console.log("FAILED:", e.message);
  console.log("STDERR:", e.stderr.toString());
}
