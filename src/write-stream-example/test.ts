import { AsyncDecompress, AsyncDeflate, AsyncZipDeflate, Zip, ZipPassThrough } from "fflate";

import fs, { createReadStream } from "fs";
import path from "path";
import { readdir, stat } from "fs/promises";
import { chunk } from "crawlee";

let readFiles = async (path = '.') => {
    let folders = await readdir(path);
    let filePaths: string[] = []
    // Read folders
    for await (const folder of folders) {

        if (folder.startsWith('.'))
            continue;

        // Read folders within folders
        await stat(`${path}/${folder}`).then(async (stats) => {

            if (!stats.isDirectory())
                return;
            let files = await readdir(path + '/' + folder)
            // Read files within folders
            files.forEach(async (file) => {
                filePaths.push(`${path}/${folder}/${file}`)
                // console.log('>>>', file);
            })
        })

    }
    return filePaths
}
let zipFile = new Zip(
    // (err, chunk, final) => {
//     if (chunk !== undefined && chunk !== null && chunk.length)
//         zipWriteStream.write(chunk);

//     if (err || final) {
//         return zipWriteStream.close();
//     }
// }
)

zipFile.ondata = (err, chunk, final) => {
    // if (chunk !== undefined && chunk !== null && chunk.length)
    zipWriteStream.write(chunk);

    if (err || final) {
        zipWriteStream.close();
    }
};
let zipWriteStream = fs.createWriteStream("test.zip");

let files = await readFiles('./images')
let flen = files.length;
let current = 0;
for await (const iterator of chunk(files.slice(0,50), 25)) {

    console.log('PROCESSING... ' + (current += iterator.length) + ' / ' + flen);

    await processFiles(iterator).catch(err => console.log(err));
}
zipFile.end();

// zipWriteStream.close();

// readFiles('./images').then(processFiles()).then(() => {
//     console.log('Done...')
// })
async function processFiles(files: string[]) {

    // return new Promise<void>(async (resolve, reject) => {
    files = files.map(file => path.resolve(file));

    console.log("PROCESS ID: " + process.pid);

    await Promise.all(files.map(file => addToZip(file)))
        .then(() => console.log('DONE'))
        .catch(err => console.log(err));

    async function addToZip(file: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {

            const fileName = file.split('/').pop();
            const zf = new ZipPassThrough(fileName);
            // const zf = new AsyncZipDeflate(fileName, { level: 1, mem: 1 });

            // zf.ondata = (err, chunk, final) => { zipFile.ondata(err, chunk, final) }

            zipFile.add(zf);
            const fileStream = createReadStream(file);

            fileStream.on('readable', () => {
                let chunk = fileStream.read();
                while (chunk !== undefined && chunk !== null && chunk.length) {
                    zf.push(chunk);
                    chunk = fileStream.read();
                }
            });

            fileStream.on('end', () => {

                zf.push(new Uint8Array(0), true);
                fileStream.close();
                console.log('File added: ' + fileName);
                resolve();
            });
        })
    };
}
