import * as fflate from 'fflate';
import * as fs from 'fs';
import path from 'path';
let __dirname = path.dirname(process.argv[1]);

// This is an ArrayBuffer of data
const localFile = fs.readFileSync(path.resolve(__dirname + '/../images/Abstract Art/0b1c4669d46a2b2cefe13fb507709efe.jpg'))

// // To use fflate, you need a Uint8Array
// // Note that Node.js Buffers work just fine as well:
// let zipFile = new fflate.Zip((err, data, f) => {
//     if (err) {
//         console.log(err);
//     } else {
//         // fs.writeFileSync('test.zip', data);
//         console.log(`Zip got something!`);
//         if (f) {
//             console.log('File is done!');
//             fs.writeFileSync('test.zip', data);
//         }
//     }
// })
// // Higher level means lower performance but better compression
// // The level ranges from 0 (no compression) to 9 (max compression)
// // The default level is 6
// const pngName = 'test.png';
// let notSoMassive = new fflate.ZipPassThrough(pngName);

// notSoMassive.ondata = (err, data) => { if (err) console.error(err); console.log(data); }
// notSoMassive.filename = pngName;
// zipFile.add(notSoMassive)

// notSoMassive.push(localFile, true);

// zipFile.end();

let b = new Blob([
    fflate.zipSync({
        // Directories can be nested structures, as in an actual filesystem
        dir1: {
            "test.png": localFile
        }
    }, { level: 0 })
])

b.arrayBuffer().then((data) => {
    let d = new Uint8Array(data);
    console.log(d);

    fs.writeFileSync('test.zip', d, { encoding: 'binary' });
})
