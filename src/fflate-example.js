import * as fflate from 'fflate';
import * as fs from 'fs';
import path from 'path';
let __dirname = path.dirname(process.argv[1]);

// This is an ArrayBuffer of data
const localFile = fs.readFileSync(path.resolve(__dirname + '/../images/Abstract Art/0b1c4669d46a2b2cefe13fb507709efe.jpg'))

let structure = {}
let files = [{ k: "name.png", v: localFile }, { k: "name2.png", v: localFile, k: "name3.png", v: localFile, k: "name4.png", v: localFile }]

let i = 0
let folderName = 'folder'

let arr = []

const toZip = {
    'dir1': {
        'nested': {
            // You can use Unicode in filenames
            '你好.txt': fflate.strToU8('Hey there!')
        },
        // You can also manually write out a directory path
        'other/tmp.txt': new Uint8Array([97, 98, 99, 100])
    },

    // PNG is pre-compressed; no need to waste time
    'superTinyFile.png': [localFile, { level: 0 }],
};
const zipped = fflate.zipSync(
    toZip[localFile] = {localFile}
);
for (let f of files) {
    zipped
    i++
}
let b = new Blob([zipped], { type: 'application/zip' })

await b.arrayBuffer().then(b => {
    fs.writeFileSync('test2.zip', zipped)
})



//
// Note that the asynchronous version (see below) runs in parallel and
// is *much* (up to 3x) faster for larger archives.

