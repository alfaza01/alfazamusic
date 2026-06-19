const https = require('https');

https.get('https://soundcloud.com', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const scripts = [...data.matchAll(/<script crossorigin src=\"(https:\/\/a-v2.sndcdn.com\/assets\/[^\"]+)\"><\/script>/g)].map(m => m[1]);
    let found = false;
    let i = 0;
    const checkNext = () => {
      if (i >= scripts.length || found) return;
      https.get(scripts[i], (res2) => {
        let js = '';
        res2.on('data', d => js += d);
        res2.on('end', () => {
          const match = js.match(/client_id:"([a-zA-Z0-9]{32})/);
          if (match && !found) {
            found = true;
            console.log('CLIENT_ID:', match[1]);
          }
        });
      });
      i++;
      setTimeout(checkNext, 200);
    };
    checkNext();
  });
});
