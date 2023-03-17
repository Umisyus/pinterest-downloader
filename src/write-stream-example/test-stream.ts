import { Transform, Readable, pipeline } from "stream";
import fs from "fs";
import { Zip, AsyncZipDeflate } from "fflate";
import { readFiles } from "../read-stream-example/test-stream.js";
import path from "path";
console.log("PROCESS ID: " + process.pid);

let zipFile = new Zip()

const zipStream = new Transform({

    objectMode: true,
    async transform(fileData: string, _encoding: BufferEncoding, callback: (err: Error | null, data: Uint8Array) => void) {
        // Push the file data to the zip file
        zipFile.ondata = (_err, chunk, _final) => {
            if (_err) {
                console.error(_err);
            }

            callback(null, chunk)
        }

        let fileName = fileData.split('/').pop();
        addFileToZip(fileName, fileData).then(() => {
        });
    },
})

zipStream.on('close', () => {
    console.log("END ZIP");
    zipFile.end();
})

let dataStream = await (async () => Readable.from((await readFiles('./images')).slice(0, 2)))();

dataStream.on('end', () => {
    console.log("END DATA STREAM")
});

dataStream.on('close', () => {
    console.log("CLOSED DATA STREAM")
});


pipeline(dataStream,
    zipStream,
    fs.createWriteStream('text-streams-2-3-4.zip'),
    (err: Error) => {
        if (err) {
            console.error("PIPELINE ERROR", err);
            return;
        }
        zipFile.end();
        console.log("PIPELINE SUCCESS");
    })


async function addFileToZip(fileName: string, filePath: string) {
    const pathFull = path.resolve(filePath);
    let fileData = fs.createReadStream(pathFull);
    let file = new AsyncZipDeflate(fileName);
    let fileDone = false;

    console.log({ pathFull });

    zipFile.add(file);
    console.log("File Data Length: " + fileData.readableLength);
    fileData.on('data', (chunk: Buffer) => {
        console.log(`File: ${fileName}`);

        file.push(chunk, true);

    })

    fileData.on('end', () => {
        console.log("END FILE DATA");

    })


    console.log(`File added: ${fileName}`);

}
