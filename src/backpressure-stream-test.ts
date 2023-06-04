// noinspection DuplicatedCode

import { readFiles } from "./read-stream-example/test-stream.js";
let files = (await readFiles('./test'))
    .slice(0, 10)

import { AsyncZipDeflate, Zip } from 'fflate';
import { createWriteStream, createReadStream, WriteStream, ReadStream } from 'fs';
import { Readable, Writable } from 'stream';

const onBackpressure = (stream: AsyncZipDeflate, outputStream: Writable, cb: { (shouldApplyBackpressure: any): void; (arg0: boolean): void; }) => {
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
    const write = outputStream?.write;
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
// let outputStream = createWriteStream('out.zip', { highWaterMark: 64 * 10_000 });

let main = (async (files: string[], outPath: WriteStream | string): Promise<Readable> => {
    let outputStream: Writable;

    switch (typeof outPath) {
        case 'string':
            outputStream = createWriteStream(outPath, { highWaterMark: 64 * 10_000 });
            break;
        case 'object':
            if (outPath instanceof WriteStream) {
                outputStream = outPath;
                break;
            }
            break;
        // case 'undefined':
        //     break;
        default:
            throw new Error('Invalid output path: Must be String or WriteStream.')
    }

    let readStream = null;

    if (!outputStream) {
        readStream = new Readable({ autoDestroy: true, read() { } })
    }

    let handler = (err: any, chunk: any, final: any) => {
        if (err) throw err;
        outputStream?.write(chunk);
        if (final) outputStream.end();
    }

    const zip = new Zip((_err, dat, final) => {
        outputStream?.write(dat);
        readStream?.push(dat);
        if (final) {
            outputStream.end(() => {
                console.timeEnd('zip');
            });
        }
    });

    const fileNames = files.map(file => file.split('/').pop());

    for await (const [index, file] of files.entries()) {
        console.log(index, file);

        let fileStream = createReadStream(file)
        let azd = new AsyncZipDeflate(fileNames[index])
        azd.ondata = handler
        zip.add(azd)

        onBackpressure(azd, outputStream, (shouldApplyBackpressure: boolean) => {
            if (shouldApplyBackpressure) {
                fileStream.pause();
                console.log('pause');

            } else if (fileStream.isPaused()) {
                fileStream.resume()
                console.log('resume');
            }
        });

        fileStream.on('readable', (chunk: any) => {
            while (null !== (chunk = fileStream.read())) {
                azd.push(chunk)
            }
        })

        fileStream.on('end', () => {
            azd.push(new Uint8Array(0), true)
        })

    }

    zip.end()

    if (!!(outputStream) && readStream) {
        return readStream
    }

    // If there' no ReadStream, return a promise
    return new Promise<any>((r) => {
        r([])
    })
});

// Example of using the backpressure stream
let ws = createWriteStream('o.zip', { highWaterMark: 64 * 10_000 });

for await (const i of (await main(files, ws))) {
    console.log({ i });
}

ws.end()
