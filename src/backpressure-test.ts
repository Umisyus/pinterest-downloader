// import path from "path";
import { readFiles } from "./read-stream-example/test-stream.js";
import { randomUUID } from "crypto"
import { transliterate as tr, slugify } from 'transliteration';
// import {createReadStream, createWriteStream} from "fs";
// import {AsyncZipDeflate, Zip} from "fflate";


// const onBackpressure = (stream, outputStream, cb) => {
//     const runCb = () => {
//         // Pause if either output or internal backpressure should be applied
//         cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
//     }

//     // Internal backpressure (for when AsyncZipDeflate is slow)
//     const backpressureThreshold = 65536;
//     let backpressure = [];
//     let backpressureBytes = 0;
//     const push = stream.push;
//     stream.push = (dat, final) => {
//         backpressure.push(dat.length);
//         backpressureBytes += dat.length;
//         runCb();
//         push.call(stream, dat, final);
//     }
//     let ondata = stream.ondata;
//     const ondataPatched = (err, dat, final) => {
//         ondata.call(stream, err, dat, final);
//         backpressureBytes -= backpressure.shift();
//         runCb();
//     }
//     if (ondata) {
//         stream.ondata = ondataPatched;
//     } else {
//         // You can remove this condition if you make sure to
//         // call zip.add(file) before calling onBackpressure
//         Object.defineProperty(stream, 'ondata', {
//             get: () => ondataPatched,
//             set: cb => ondata = cb
//         });
//     }

//     // Output backpressure (for when outputStream is slow)
//     let applyOutputBackpressure = false
//     const write = outputStream.write;
//     outputStream.write = (data) => {
//         const outputNotFull = write.call(outputStream, data);
//         applyOutputBackpressure = !outputNotFull;
//         runCb();
//     }
//     outputStream.on('drain', () => {
//         applyOutputBackpressure = false;
//         runCb();
//     })
// }

// const writeStream = createWriteStream('out.zip');
// const zip = new Zip((_err, dat, final) => {
//     writeStream.write(dat);
//     if (final) writeStream.end();
// });
let files = (await readFiles('./test')) 

// async function zipFile(files: string[]) {
//     for (let i = 0; i < files.length; i++) {
//         let file = path.resolve(files[i])
//         let fileName = file.split('/').pop()

//         const txt = createReadStream(file);

//         const file1 = new AsyncZipDeflate(fileName);
//         zip.add(file1);
//         const backpressureThreshold = 65536;
//         onBackpressure(file1, writeStream, backpressure => {
//             if (backpressure > backpressureThreshold) {
//                 txt.pause();
//             } else if (txt.isPaused()) {
//                 txt.resume()
//             }
//         });
//         // @ts-ignore
//         txt.on('data', (chunk: Uint8Array) => file1.push(chunk));
//         txt.on('end', () => file1.push(new Uint8Array(0), true));

//     }
//     zip.end();
// }

// await zipFile(files)

import { Zip, AsyncZipDeflate, ZipPassThrough } from 'fflate';
import { createWriteStream, createReadStream, WriteStream } from 'fs';

const onBackpressure = (stream: AsyncZipDeflate, outputStream: WriteStream, cb: { (shouldApplyBackpressure: any): void; (arg0: boolean): void; }) => {
    const runCb = () => {
        // Pause if either output or internal backpressure should be applied
        cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
    }

    // Internal backpressure (for when AsyncZipDeflate is slow)
    const backpressureThreshold = 65536;
    let backpressure = [];
    let backpressureBytes = 0;
    const push = stream.push;
    stream.push = (dat: any, final: any) => {
        backpressure.push(dat.length);
        backpressureBytes += dat.length;
        runCb();
        push.call(stream, dat, final);
    }
    let ondata = stream.ondata;
    const ondataPatched = (err: any, dat: any, final: any) => {
        ondata.call(stream, err, dat, final);
        backpressureBytes -= backpressure.shift();
        runCb();
    }
    if (ondata) {
        stream.ondata = ondataPatched;
    } else {
        // You can remove this condition if you make sure to
        // call zip.add(file) before calling onBackpressure
        Object.defineProperty(stream, 'ondata', {
            get: () => ondataPatched,
            set: cb => ondata = cb
        });
    }

    // Output backpressure (for when outputStream is slow)
    let applyOutputBackpressure = false
    const write = outputStream.write;
    outputStream.write = (data: any) => {
        const outputNotFull = write.call(outputStream, data);
        applyOutputBackpressure = !outputNotFull;
        runCb();
        return outputNotFull;
    }
    outputStream.on('drain', () => {
        applyOutputBackpressure = false;
        runCb();
    })
}

console.time('zip');
const writeStream = createWriteStream('out.zip', { highWaterMark: 64 * 10_000 });

const zip = new Zip((_err, dat, final) => {
    writeStream.write(dat);
    if (final) {

        writeStream.end();
    }
});
let lists = (function* (files) {
    let i = 0;
    while (i < files.length) {
        yield files.slice(i, i += 20);
    }
})(files)

// let i=0;
// for await (const list of lists) {
// console.log(`start list ${++i}`);

//     for (const file of list) {
//         let txt = createReadStream(file);

//         const file1 = new AsyncZipDeflate(file.split('/').pop());

//         zip.add(file1);

//         onBackpressure(file1, writeStream, shouldApplyBackpressure => {
//             if (shouldApplyBackpressure) {
//                 txt.pause();
// console.log('pause');

//             } else if (txt.isPaused()) {
//                 txt.resume()
// console.log('resume');
//             }
//         });
//         txt.on('data', (chunk: Uint8Array) => file1.push(chunk));
//         txt.on('end', () => file1.push(new Uint8Array(0), true));
//     }
//     console.log(`done list ${i}`);

// }
// zip.end();
// console.log('done zippping');

let handler = (err: any, chunk: any, final: any) => {
    if (err) throw err;
    writeStream.write(chunk);
    if (final) writeStream.end();
}
const re = /[^ -~]+/g;

const fixed_filename = (fileName) => {
    if (re.test(fileName)) {
        return randomUUID().slice(0, 20);
    }
    return fileName.slice(0, 30);
}
const fileNames = files.map(f => slugify(f.split('/').pop()));
const l = files.length

for (let index: number = 0; index < l; index++) {
    const fname = fixed_filename(fileNames[index]) + randomUUID().slice(0, 10)
    const file = files[index];

    let zFile = new AsyncZipDeflate(fname);
    zFile.ondata = handler;
    zip.add(zFile);
    let fileStream = createReadStream(file);
    onBackpressure(zFile, writeStream, (shouldApplyBackpressure: any) => {
        if (shouldApplyBackpressure) {
            fileStream.pause();
            console.log('pause');

        } else if (fileStream.isPaused()) {
            fileStream.resume()
            console.log('resume');
        }
    });
    fileStream.on('data', (chunk: Uint8Array) => zFile.push(chunk));
    fileStream.on('end', () => zFile.push(new Uint8Array(0), true));

}
let timer = setInterval(() => {
    console.log(`RAM usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);

}, 1000)

zip.end();

writeStream.on('close', () => {
    clearInterval(timer);
    console.timeEnd('zip');
    console.log('done zippping');
})