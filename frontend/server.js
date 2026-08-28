const http = require('http');
const next = require('next');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.APP_HOST || '0.0.0.0';
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((request, response) => {
    handle(request, response);
  }).listen(port, hostname, () => {
    console.log(`Next.js listening on http://${hostname}:${port}`);
  });
}).catch((error) => {
  console.error('Unable to start Next.js', error);
  process.exit(1);
});
