import { Writable, Readable } from 'stream';
import { WritableStream, ReadableStream } from 'stream/web';
import { AsyncCompress, AsyncDeflate, AsyncGzip, strToU8 } from "fflate";

function toNativeStream(stream: AsyncDeflate) {
    const writable = new WritableStream({
        write(dat: Uint8Array) { stream.push(dat); },
        close() { stream.push(new Uint8Array(0), true); }
    });
    const readable = new ReadableStream({
        start(controller: ReadableStreamDefaultController<Uint8Array>) {
            stream.ondata = (err, chunk, final) => {
                if (err) writable.abort(err.message);
                controller.enqueue(chunk);
                if (final) controller.close();
            }
        }
    });
    return { readable, writable };
}

let stream = new AsyncGzip()
stream.ondata = (err, chunk, final) => ({ err, chunk, final })

// let { writable, readable } = streams(stream)
stream.push(strToU8("Hello dunya"), true)

//readable.pipe(process.stdout);
stream.push(new Uint8Array(500));


// Zip using GZip compression
// fs.createReadStream(pathF)
//     .pipe(createGzip({ level: 9 }))
//     .pipe(fs.createWriteStream('GZIPPED_FILE' + '.gz'))
//     .close(() => {
//         console.log('done');
//         process.exit(0);
//     })
// let pathF = '/home/umit/Node Projects/pin_down/pinterest-downloader/hello.test.zip'
// for await (const d of fs.createReadStream(pathF).pipe(createGzip({ level: 9 }))) {
//     console.log(d)
// };
let cb = (_err: any, chunk: Uint8Array, final: boolean) => {
    s.writable.getWriter().write(chunk)
    if (final) {
        s.writable.getWriter().close()
    }
}

let fakeZip = new AsyncCompress(cb)
var s = toNativeStream(fakeZip)
fakeZip.push(strToU8("H".repeat(10e7)), true)


// Print the stream to stdout 
// for await (const d of s.readable) {
//     console.log(d);
// }

await s.readable.pipeTo(new WritableStream({
    write: (chunk) => {
        console.log(chunk)
    }
}));