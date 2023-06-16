import express from 'express';
import { Readable } from 'node:stream';

const app = express();

app.get('/api/chat', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  
  // Create a readable stream with your data
  const data = 'Hello from the backend!';
  const buffer = [data] as (string | null)[];

  setTimeout(() => {
    console.log('push chunk 2')
    buffer.push('chunk 2');
  }, 1000);
  
  setTimeout(() => {
    console.log('push null')
    buffer.push(null);
  }, 2000);

  const stream = new Readable({
    read() {
      console.log('read')
      let chunk;
      while (chunk = buffer.shift()) {
        console.log('got chunk', chunk)
        this.push(chunk);
      }
    },
  });

  // Pipe the stream to the response
  stream.pipe(res);
});

app.listen(4000, () => {
  console.log('Server listening on port 4000');
});
