import http from 'http';
import fs from 'fs';
import path from 'path';

const SITE_DIR = path.resolve(process.cwd(), 'site');

const server = http.createServer((req, res) => {
  const filePath = path.join(SITE_DIR, req.url === '/' ? 'index.html' : req.url!);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}).listen(8989, () => {
  console.log('Server started on port 8989');
});

export default server;