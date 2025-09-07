import * as http from 'node:http';
const PORT = 8989;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (req.url === '/') {
        res.end('<html><head><title>Root</title></head><body><a href="/page1">Page 1</a></body></html>');
    }
    else if (req.url === '/page1') {
        res.end('<html><head><title>Page 1</title></head><body>Content Page 1</body></html>');
    }
    else {
        res.writeHead(404);
        res.end();
    }
});
server.listen(PORT, () => {
    // This log is useful for debugging, but will be silenced in the publish script
    // console.log(`Server started on port ${PORT}`);
});
