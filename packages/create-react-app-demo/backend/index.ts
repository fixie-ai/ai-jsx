import httpProxy from 'http-proxy';
import http from 'node:http';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable must be set');
}

const proxy = httpProxy.createProxy({ target: 'https://api.openai.com' });
const server = http.createServer(function(req, res) {
  req.headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
  proxy.web(req, res);
});

server.listen(4000, () => {
  console.log('Server listening on port 4000');
});
