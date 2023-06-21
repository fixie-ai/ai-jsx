import httpProxy from 'http-proxy';
import http from 'node:http';

/**
 * This is a demo proxy server that allows you to use the OpenAI API without exposing your key to the client.
 *
 * If you deploy this, you may wish to expand on the proxy to deny-list endpoints your app doesn't use, to prevent abuse by third parties.
 */

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable must be set');
}

const proxy = httpProxy.createProxy({ target: 'https://api.openai.com', changeOrigin: true, selfHandleResponse: true });
proxy.on('proxyRes', (proxyRes, _req, res) => {
  proxyRes.on('data', res.write.bind(res));
  proxyRes.on('end', res.end.bind(res));
});
const server = http.createServer(function (req, res) {
  req.headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
  proxy.web(req, res);
});

server.listen(4000, () => {
  console.log('Server listening on port 4000');
});
