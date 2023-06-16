import express from 'express';
const app = express();

app.get('/api/chat', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

app.listen(4000, () => {
  console.log('Server listening on port 4000');
});