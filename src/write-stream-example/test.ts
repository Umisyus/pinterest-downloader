import { AsyncZipDeflate, Zip, ZipPassThrough } from "fflate";

import fs, { createReadStream } from "fs";
import path from "path";
import { readdir, stat } from "fs/promises";
import { chunk, getMemoryInfo } from "crawlee";

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
            })
        })

    }
    return filePaths
}

let zipFile = new Zip()

zipFile.ondata = (err, chunk, final) => {
    zipWriteStream.write(chunk);

    if (err || final) {
        zipWriteStream.end()
    }
};

let zipWriteStream = fs.createWriteStream("test.zip");

let files = await readFiles('./images')
let flen = files.length;
let current = 0;

for await (const iterator of chunk(files.slice(), 1000)) {

    console.log('PROCESSING... ' + (current += iterator.length) + ' / ' + flen);

    await processFiles(iterator).catch(err => console.log(err));
    console.log('MEMORY USED: ' + process.memoryUsage().rss / 1024 / 1024 + ' MB');

}

zipFile.end();

async function processFiles(files: string[]) {

    files = files.map(file => path.resolve(file));

    console.log("PROCESS ID: " + process.pid);

    const fileStreams = files.map(file => addToZip(file));
    await Promise.all(fileStreams)
        .catch(err => console.error(err))
        .then(() => console.log('DONE'))


    async function addToZip(file: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {

            const fileName = file.split('/').pop();
            // const zf = new AsyncZipDeflate(fileName, { level: 4, mem: 4 });
            const zf = new ZipPassThrough(fileName)

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
                // console.log('File added: ' + fileName);
                resolve();
            });
        })
    };
}
