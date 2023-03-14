import { Transform, pipeline, Writable, Readable, Stream, PassThrough } from "stream";
import fs, { createWriteStream, ReadStream, WriteStream } from "fs";
import { ZipPassThrough, Zlib, Zip, gzip, AsyncGzip } from "fflate";
import { Actor } from "apify";
import streamSaver from 'streamsaver';
import { sleep } from "crawlee";

const uppercase = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
        let ch = chunk.toString().toUpperCase()
        // callback(null, JSON.stringify({ data: ch, encoding }));
        callback(null, ch);
    },
});


let zipFile = new Zip()
zipFile.ondata = (err, chunk, final) => {
    zipStream.push(chunk)
}

const zipStream = new Transform({
    objectMode: true,
    transform(chunk: Uint8Array, encoding: BufferEncoding, callback: (err: Error | null, data: Uint8Array) => void) {
        zipFile.ondata = (err, chunk, final) => (final ? callback(null, chunk) : null)
        let file = new ZipPassThrough('chunk')
        zipFile.add(file)
        file.push(chunk, true)
        // zipFile.end()
        // callback(null, chunk);

    },
});

// const rs = new Readable({
//     read(size) { },
// });

// rs.push('hello \n');
// rs.push('world \n');

// pipeline(rs, uppercase, process.stdout, (err) => {
//     if (err) {
//         console.error('Pipeline failed.', err);
//     } else {
//         console.log('Pipeline succeeded.');
//     }
// });

// let readableFile = fs.createReadStream('storage/key_value_stores/partial concept-art zips/0c4dd575-e363-49ae-bb55-7a10e06a8426-concept-art-1/2b689bea404f99785a1fa6c6eb054b38.jpg')

// let zpt = new ZipPassThrough((readableFile.path instanceof String) ? readableFile.path.split('/').pop() ?? "" : "")
// // zipFile.add(zpt)

// zpt.ondata = (err, chunk, final) => {
//     if (final)
//         zipStream.push(chunk)
// }

// zipFile.add(zpt)

// while (true) {
//     let done = readableFile.read()
//     if (done === null) {
//         zpt.push(new Uint8Array(0), true);
//         break
//     }
//     zpt.push(Uint8Array.from(done), false);
// }

// zipStream.on('end', () => {
//     console.log("zipStream ended");

//     zipFile.end()
// })

// zipStream.on('data', (chunk) => {
//     console.log("zipStream data", chunk);
// })

// zipStream.on('finish', () => {
//     console.log("zipStream finished");
// })

// pipeline(readableFile, zipStream, process.stdout, (err) => {
//     if (err) {
//         console.error('Pipeline failed.', err);
//     } else {
//         console.log('Pipeline succeeded.');
//     }
// });

// let rs = new Stream.Readable({ read() { } })

// await Actor.init()

// const handleFiles = async (fileArray: any[], outStream: Writable) => await Promise.all(fileArray.map(async (file: Blob) => {
//     const gzip = new AsyncGzip();

//     const fileReader = file.stream().getReader();
//     const readable = new Readable({ read() { } })

//     gzip.ondata = (err, chunk, final) => {
//         if (err) console.error(err)

//         if (final) {
//             if (chunk !== null)
//                 readable.push(chunk)
//         }
//         readable.push(chunk)
//     }

//     while (true) {
//         const { done, value } = await fileReader.read();
//         if (done) {
//             gzip.push(new Uint8Array(0), true);
//             break;
//         }
//         gzip.push(value);
//     }
//     readable.on('data', (chunk) => {
//         console.log("readable data", chunk.toString());
//     })

//     // readable.pipe(outStream)
//     let d = readable.read()
//     while (d !== null) {
//         console.log(d.toString());
//         d = readable.read()
//     }
// }));

// let files = [new Blob(["hello world"])]

// await (handleFiles(files, process.stdout))
// .then(() => {
//     console.log("done")
//     process.exit(0)
// });

// Fflate GZip stream

// Install this: https://github.com/jimmywarting/StreamSaver.js
// Or do this:
// import streamSaver from 'https://cdn.skypack.dev/streamsaver';

// Promise.all for parallelism
// const handleFiles = (fileArray: any[]) => Promise.all(fileArray.map(async file => {
//     const gzip = new AsyncGzip();
//     const gzipReadableStream = fflToRS(gzip);

//     // addDownloadButton(gzipReadableStream, `${file.name}.gz`);
//     const fileReader = file.stream().getReader();
//     while (true) {
//         const { done, value } = await fileReader.read();
//         if (done) {
//             gzip.push(new Uint8Array(0), true);
//             break;
//         }
//         gzip.push(value);
//     }
// }));

// const addDownloadButton = (stream, filename) => {
//     // const downloadButton = document.createElement('button');
//     // downloadButton.textContent = `Download ${filename}`;
//     // downloadButton.addEventListener('click', event => {
//     //     stream.pipeTo(streamSaver.createWriteStream(filename));
//     // });
//     // const downloadElement = document.createElement('li');
//     // downloadElement.appendChild(downloadButton);

// }

// function fflToRS(gzip: AsyncGzip): Readable {
//     return new Readable({

//         async read() {
//             gzip.ondata = (err, chunk, final) => {
//                 if (final) {
//                     this.emit('end')
//                 } else {
//                     this.push(chunk)
//                 }
//             }
//         }
//     });
// }

console.log("PROCESS ID: " + process.pid);

let readable = new Readable({ read() { } })
// let writable = new Writable({
//     autoDestroy: true, highWaterMark: 65_000, write(chunk, encoding, callback) {
//         console.log("write", chunk.length);
//         callback()
//     }
// });

let i = 0;
console.time("write");
let writable = fs.createWriteStream('text-streams-2-3-4.txt')

function writeMany() {
    console.log("Writing to stream...");
    let writes = 1_000_000

    while (i < writes) {
        let bf = Buffer.from(`${i}`, 'utf8');

        if (i === writes - 1) {
            console.log("Last write");
            writable.end(bf);
            return;
        }

        if (writable.write(bf) === false) {
            break;
        }
        i++
    }

}

writeMany()
// console.time("write");
// // read from command line and write to stdout
// console.log("Enter 'q' to quit");
// let go = false
// process.stdin.on('data', (chunk) => {
//     let inp = chunk.toString().trim().toLocaleLowerCase();
//     console.log("inp: ", inp);

//     // return inp == 'q'.toLocaleLowerCase() ? go = true : console.log("Enter 'q' to quit");
//     // writeMany();
// })

// if (!go) {
//     writeMany();
// }

writable.on('drain', () => {
    console.log("DRAINED!!!");
    writeMany();
})
writable.on('error', (err) => {
    console.log("ERROR", err);
})
writable.on('close', () => {
    console.log("CLOSED!!!");

})
writable.on('finish', () => {
    writable.close(() => {
        console.timeEnd("write");
        console.log("~Write Stream has Ended~");
        process.exit(0)
    });
})
