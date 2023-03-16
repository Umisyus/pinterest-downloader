import { AsyncDeflate, AsyncZipDeflate, Zip, zip, ZipPassThrough } from "fflate";
import { readFiles } from "../read-stream-example/test-stream.js";
import fs, { createReadStream } from "fs";
import path from "path";
import Stream from "stream";

readFiles('./images').then(async (files) => {
    files = files.map(file => path.resolve(file))
    let zipFile = new Zip();

    let zipWriteStream = fs.createWriteStream("test.zip");

    zipFile.ondata = (err, chunk, final) => {

        zipWriteStream.write(chunk)

        if (err || final) {
            return zipWriteStream.close();
        }
    }

    files.forEach(file => addToZip(file))
    //  addToZip(files[0])

    zipFile.end();

    console.log("END ZIP");

    function addToZip(file: string) {
        const fileName = file.split('/').pop();
        const zf = new ZipPassThrough(fileName);
        zipFile.add(zf);
        // return new Promise<void>((resolve, reject) => {
        // const { writable } = fflateToRS(zf);
        const fileStream = createReadStream(file);

        fileStream.on('readable', () => {
            let chunk = fileStream.read();
            while (chunk && chunk.length) {
                zf.push(chunk);
chunk	=	fileStream.read()
            }
        });

        fileStream.on('end', () => {
            // writable.write(new Uint8Array(0));
            zf.push(new Uint8Array(0), true);
        });
    }
})

function addToZipSync(file: string, zipFile: Zip) {
    const fileName = file.split('/').pop();
    const zf = new ZipPassThrough(fileName);
    zipFile.add(zf);
    const fileStream = createReadStream(file);
    let chunk;

    fileStream.on('readable', function () {
        while ((chunk = fileStream.read()) != null) {
            zf.push(chunk);
        }
    })
    fileStream.on('end', () => zf.push(new Uint8Array(0), true));

    console.log("END ZIP SYNC");

}

export default function fflateToRS(stream: AsyncDeflate) {
    const writable = new Stream.Writable({
        write(dat: Uint8Array) { stream.push(dat); },
        final() { stream.push(new Uint8Array(0), true); }
    });
    const readable = new Stream.Readable({
        read() { }
    });
    return { readable, writable };
}
