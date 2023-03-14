// express server
import http from 'http';
import fs from 'fs';
import { promisify } from 'util';
// const requestListener = function (req, res) {
//     res.writeHead(200);
//     res.end("My first server!");
// };

const app = http.createServer();

let readdir = promisify(fs.readdir)

app.on('request', async (req, res) => {
    if (!req.url) { res.writeHead(404); res.end(); return; }

    let url = new URL(req.url, 'http://localhost:3000')

    let last = url.pathname
    switch (!!last) {

        case req.url === '/': {
            // res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write('Hello World!');
            res.end();
            break;
        }
        case req.url.includes('file' + '/'): {
            // res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write('Hello World!');
            res.end();
            break;
        }
        case req.url.includes('file2'): {
            res.writeHead(200);
            // let find files in directory
            let fileList = await readdir('storage/key_value_stores/default/')
            let ls = last.split('/').pop()
            let l = (fileList.find((file) => file.includes(ls)))
            if (l) {
                res.writeHead(200, { 'Content-Type': 'application/zip' });
                console.log('File found');

                fs.createReadStream('storage/key_value_stores/default/' + l).pipe(res);
            }
            else {
                res.end('File not found');
                console.log('File not found');
            }
            break;
        }
    }
});
const port = 3000;
const host = 'localhost';
app.listen(port, host, () => console.log(`Server running at http://${host}:${port}/`));

