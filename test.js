import { createServer } from 'vite';
createServer({}).then(s => {
  console.log('started vite programmatically');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
