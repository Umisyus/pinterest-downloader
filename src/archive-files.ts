import fs from 'fs';
import path from 'path';
import {Zip, AsyncZipDeflate} from 'fflate';
import * as Path from "node:path";

// Async function to recursively walk directory and yield file info
async function* walkDir(dir, basePath = dir) {
    const dirents = await fs.promises.readdir(dir, {withFileTypes: true});
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* walkDir(res, basePath);
        } else if (dirent.isFile()) {
            yield {
                diskPath: res,
                archivePath: path.relative(basePath, res).replace(/\\/g, '/'), // normalize
            };
        }
    }
}

export async function createZipFromFolder(folderPath: string, zipFilePath: string, fileName: string) {
    return new Promise<void>(async (resolve, reject) => {
        const filePath = Path.join(zipFilePath, fileName)
        const outputStream = fs.createWriteStream(filePath);
        const zip = new Zip();

        // Reject on any stream error
        outputStream.on('error', reject);
        // zip.on('error', reject);

        // Pipe zip output chunks to file stream
        zip.ondata = (err, chunk, final) => {
            if (err) {
                outputStream.close();
                reject(err);
                return;
            }
            outputStream.write(chunk);
            if (final) outputStream.end();
        };

        // Resolve only once on output finish (all data flushed)
        outputStream.on('finish', () => {
            resolve();
        });

        try {
            // Add files sequentially, waiting for each to be fully pushed by reading stream
            for await (const file of walkDir(folderPath)) {
                console.log(`Adding ${file.archivePath}`);

                await new Promise<void>((res, rej) => {
                    const zipFile = new AsyncZipDeflate(file.archivePath, {level: 0, mem: 5});
                    zip.add(zipFile);

                    const readStream = fs.createReadStream(file.diskPath);

                    readStream.on('error', rej);

                    readStream.on('data', chunk => zipFile.push(chunk as any));
                    readStream.on('end', () => {
                        zipFile.push(new Uint8Array(), true);
                        res();
                    });
                });
            }

            // Finalize ZIP after all files added
            zip.end();

        } catch (error) {
            reject(error);
        }
    });
}
