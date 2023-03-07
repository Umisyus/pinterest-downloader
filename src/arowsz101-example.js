// https://github.com/101arrowz/fflate/discussions/150?sort=top
// Zip: full zip archive
// ZipDeflate: zip file using compression
// ZipPassThrough: zip file uncompressed
// AsyncZipDeflate: zip compression offloaded to a separate thread
// EncodeUTF8: text to binary conversion

import { Zip, ZipDeflate, EncodeUTF8, ZipPassThrough, AsyncZipDeflate } from 'fflate';
import { createReadStream, createWriteStream, readFileSync, writeFile, WriteStream, ReadStream } from "fs";
import path from 'path';
import { Duplex, Readable, Stream } from 'stream';

let pathF = '/home/umit/Node Projects/pin_down/pinterest-downloader/dist/src/image0.jpg'
console.log(path.dirname((process.cwd())));

// // const chunks = [];


// // new ReadableStream({
// //     start(controller) {
// //         controller.enqueue(chunk);

// //     }
// // })
// let ws = createWriteStream('./fileStreamed.zip')



// const zip = new Zip((err, chunk, final) => {
//     if (err) throw err;

//     // You can also write this to another stream (like a file) rather than collecting and concatenating
//     // chunks.push(chunk);
//     ws.write(chunk)

//     if (final) {
//         // last chunk written
//         // const result = Buffer.concat(chunks);
//         console.log('got EPUB as buffer:');
//         // End
//         ws.end()
//     }
// });

// const addDir = name => {
//     const dir = new ZipPassThrough(name + '/');
//     zip.add(dir);
//     // make every directory an empty file
//     dir.push(new Uint8Array(0), true);
// }

// // returns an object where you can push binary data, e.g. an image
// const addBinaryFile = name => {
//     const file = new ZipPassThrough(name);
//     zip.add(file);
//     return file;
// }

// // returns an object where you can push text data
// const addTextFile = name => {
//     const file = new ZipDeflate(name);
//     zip.add(file);
//     // Write strings to this, get binary data out and pipe to file
//     const writer = new EncodeUTF8((data, final) => file.push(data, final));
//     return writer;
// }

// addDir('META-INF');
// // addDir('OPS');

// const contentOPF = addTextFile('OPS/content.opf');
// contentOPF.push('your text here', false);
// contentOPF.push('more text', false);
// // on the last chunk, the second argument is true
// contentOPF.push('end', true);


// const image = addBinaryFile('OPS/image0.jpg');
// image.push(readFileSync(pathF), true);

// // important: after you've added all your data, call this:
// zip.end();

let createAsyncZip = async (filename) => {
    let chunks = [];
    let rs = new Stream.Readable({ read(size) { } })

    return new Promise((resolve, reject) => {
        let z = new Zip(async (err, chunk, final) => {
            if (err) reject(err);

            rs.push(chunk)

            if (final) {

                console.log('got EPUB as buffer:');

                let list = [];
                while (true) {
                    let d = rs.read()
                    if (d === null) {
                        break;
                    }
                    // list.push(Buffer.from(d))
                    list.push(Uint8Array.from(d))
                }

                resolve(Buffer.concat(list))
            }
        })

        // Craeate a directory in the zip file
        const addDir = name => {
            const dir = new ZipPassThrough(name + '/');
            z.add(dir);
            // make every directory an empty file
            dir.push(new Uint8Array(0), true);
        }

        // returns an object where you can push binary data, e.g. an image
        const addBinaryFile = name => {
            const file = new ZipPassThrough(name);
            z.add(file);
            return file;
        }

        // returns an object where you can push text data
        const addTextFile = name => {
            const file = new ZipDeflate(name);
            z.add(file);
            // Write strings to this, get binary data out and pipe to file
            const writer = new EncodeUTF8((data, final) => file.push(data, final));
            return writer;
        }

        addDir('Example Directory');

        let bf = addBinaryFile('Example Image File');
        let rfs = createReadStream(pathF)

        rfs.on('readable', () => {
            console.log('.')
            while (true) {
                let done = rfs.read()
                if (done === null) {

                    break;
                }
                bf.push(done, false);
            }
        })

        rfs.on('end', () => {
            rfs.close();
            bf.push(new Uint8Array(0), true);
            console.log('end');

        })

        z.end()
    })
}
let filename = 'asyncZipHELLO!!!.zip'
createAsyncZip(filename).then((data) => {
    console.log(data);
    writeFile(filename, data, (err) => {
        if (err) throw err;
        console.log('done');
    })
})