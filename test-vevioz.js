fetch('https://api.vevioz.com/api/button/mp3/TChKr4XLM3k')
  .then(r => r.text())
  .then(html => {
    const match = html.match(/href="([^"]+)"/g);
    console.log(match);
  })
  .catch(console.error);
