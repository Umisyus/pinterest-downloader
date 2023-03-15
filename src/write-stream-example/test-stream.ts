import { Transform, pipeline } from "stream";
import fs from "fs";
import { ZipPassThrough, Zip, AsyncZipDeflate } from "fflate";

console.log("PROCESS ID: " + process.pid);

let zipFile = new Zip()

const zipStream = new Transform({
    transform(fileData: Uint8Array, _encoding: BufferEncoding, callback: (err: Error | null, data: Uint8Array) => void) {
        // Push the file data to the zip file
        zipFile.ondata = (_err, chunk, _final) => {
            if (_err) {
                // callback(_err, null)
                console.error(_err);
            }
            // if (_final) {
            //     callback(null, chunk)
            // }
            this.push(chunk)
            // callback(null, chunk)
        }
        let file = new AsyncZipDeflate('file')
        zipFile.add(file)

        console.log("File Data Length: " + fileData.length);

        file.push(fileData, true)
        zipFile.end()
        // console.log(fileData);

        // callback(null, fileData)
    },
})

zipStream.on('error', console.error)

zipStream.on('data', (data) => console.log('DATA:', data ? data : "NODATA"))

zipStream.on('end', () => {
    console.log("ZIP END");
});

console.time("write");
let readableFile = fs.createReadStream('/Users/umit/Desktop/Github Test/Node Projects/pin_down/images/Abstract Art/0b1c4669d46a2b2cefe13fb507709efe.jpg')

// readableFile.on('readable', () => {
//     let readable = readableFile.read()
//     zipStream.push(readable)

// });
// readableFile.on('end', () => console.log('end readable', zipStream.end()));

readableFile.on('error', console.error)

pipeline(readableFile,
    zipStream,
    // process.stdout,
    fs.createWriteStream('text-streams-2-3-4.zip'),
    (err: Error) => {
        if (err) {
            console.log("PIPELINE ERROR", err);
            return;
        }
        console.log("PIPELINE SUCCESS");
    })

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
