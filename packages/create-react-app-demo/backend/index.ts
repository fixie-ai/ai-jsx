// import httpProxy from 'http-proxy';
// import http from 'node:http';

// if (!process.env.OPENAI_API_KEY) {
//   throw new Error('OPENAI_API_KEY environment variable must be set');
// }

// const proxy = httpProxy.createProxy({ target: 'https://api.openai.com', changeOrigin: true });
// const server = http.createServer(function(req, res) {
//   req.headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
//   proxy.web(req, res);
//   proxy.on('proxyRes', (proxyRes, req, res) => {
//     proxyRes.on('data', (data) => {
//       console.log('got data', data.toString());
//       res.write(data);
//     });
//     proxyRes.on('end', () => {
//       console.log('end event');
//       res.end();
//     })
//   })
// });

// server.listen(4000, () => {
//   console.log('Server listening on port 4000');
// });


import path from "path";
import express from "express";
const PORT = 4000;

import { createProxyMiddleware } from "http-proxy-middleware";
const app = express();

// app.use(express.static(path.join(__dirname, "public")));

app.use(
  "/v1/",
  createProxyMiddleware({
    target: "https://api.openai.com",
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(req.originalUrl);
      proxyReq.setHeader("Authorization", `Bearer ${process.env.OPENAI_API_KEY}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers["Access-Control-Allow-Origin"] = "*";
      proxyRes.headers["Access-Control-Allow-Headers"] =
        "Content-Type,Content-Length, Authorization, Accept,X-Requested-With";
    },
  })
);
app
  .listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    console.log(err);
  });
