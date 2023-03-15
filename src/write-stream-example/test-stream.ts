import { Transform, Readable, pipeline } from "stream";
import fs from "fs";
import { ZipPassThrough, Zip, AsyncZipDeflate } from "fflate";
import { readFiles } from "../read-stream-example/test-stream.js";
import { chunk } from "crawlee";
import path from "path";
console.log("PROCESS ID: " + process.pid);

let zipFile = new Zip()

const zipStream = new Transform({

    objectMode: true,
    async transform(fileData: string, _encoding: BufferEncoding, callback: (err: Error | null, data: Uint8Array) => void) {
        // Push the file data to the zip file
        zipFile.ondata = (_err, chunk, _final) => {
            if (_err) {
                // callback(_err, null)
                console.error(_err);
            }
            // if (_final) {
            //     callback(null, chunk)
            // }

            // if (_final) {
            this.push(chunk)
            // }

            // callback(null, chunk)
        }

        let fileName = fileData.split('/').pop();
        await addFileToZip(fileName, fileData).then(() => {
            console.log("File Added");
        });
    },
})

// zipStream.on('error', console.error)

// zipStream.on('data', (data) => console.log('DATA:', data ? data : "NODATA"))
// zipStream.on('end', () => console.log("END ZIP", zipFile.end()))

let dataStream = await (async () => Readable.from((await readFiles('./images')).slice(0, 4)))();

// dataStream.on('readable', (ch: any) => console.log('DATA:', ch))
// dataStream.on('end', () => console.log("END", zipStream.end(), zipFile.end()))
dataStream.on('close', () => console.log("CLOSE", zipStream.end(), zipFile.end()))
// dataStream.on('close', () => console.log("CLOSE", zipStream.end()))

pipeline(dataStream,
    zipStream,
    fs.createWriteStream('text-streams-2-3-4.zip'),
    (err: Error) => {
        if (err) {
            console.error("PIPELINE ERROR", err);
            return;
        }
        console.log("PIPELINE SUCCESS");
    })


async function addFileToZip(fileName: string, filePath: string) {
    const pathFull = path.resolve(filePath);
    let fileData = fs.createReadStream(pathFull);
    let file = new AsyncZipDeflate(fileName);

    console.log({ pathFull });

    zipFile.add(file);

    console.log("File Data Length: " + fileData.readableLength);
    fileData.on('data', (chunk: Buffer) => {
        if (chunk) {
            file.push(chunk);
        }
    })

    fileData.on('end', () => {
        file.push(new Uint8Array(0), true);
    })

}
// function writeMany() {
//     console.log("Writing to stream...");
//     let writes = 1_000_000

//     while (i < writes) {
//         let bf = Buffer.from(`${i}`, 'utf8');

//         if (i === writes - 1) {
//             console.log("Last write");
//             writable.end(bf);
//             return;
//         }

//         if (writable.write(bf) === false) {
//             break;
//         }
//         i++
//     }

// }

// writeMany()

// writable.on('drain', () => {
//     console.log("DRAINED!!!");
//     writeMany();
// })
// writable.on('error', (err) => {
//     console.log("ERROR", err);
// })
// writable.on('close', () => {
//     console.log("CLOSED!!!");

// })
// writable.on('finish', () => {
//     writable.close(() => {
//         console.timeEnd("write");
//         console.log("~Write Stream has Ended~");
//         process.exit(0)
//     });
// })
