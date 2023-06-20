import express from 'express';
import expressHttpProxy from 'express-http-proxy';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable must be set');
}
const app = express();

app.post('*', expressHttpProxy('https://api.openai.com', {
  proxyReqOptDecorator(req) {
    req.headers = req.headers ?? {};
    req.headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
    return req;
  }
}));

app.listen(4000, () => {
  console.log('Server listening on port 4000');
});
