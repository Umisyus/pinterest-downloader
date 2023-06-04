// import path from "path";
// noinspection JSVoidFunctionReturnValueUsed

import { readFiles } from "./read-stream-example/test-stream.js";
import { randomUUID } from "crypto"
import { slugify } from 'transliteration';

let files = (await readFiles('./test'))

import { Zip, AsyncZipDeflate } from 'fflate';
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

let handler = (err: any, chunk: any, final: any) => {
    if (err) throw err;
    writeStream.write(chunk);
    if (final) writeStream.end();
}
const re = /[^ -~]+/g;

const fixed_filename = (fileName) => {
    if (re.test(fileName)) {
        return slugify(fileName).slice(0,30)
    }
return fileName.slice(0,30)
}

const l = files.length
const fileNames = files.map(f => f.split('/').pop());

for (let index: number = 0; index < l; index++) {
    const fname = fixed_filename(fileNames[index])
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