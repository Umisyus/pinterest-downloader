import apify, { Actor, KeyValueStore } from 'apify'

import { AsyncDeflate, AsyncZlib, FlateError, zip } from 'fflate'
import fs from 'fs';

(async () => {
    await Actor.init().then(() => console.log('Actor initialized'))
    let files: { key: string, value: Buffer }[] = []

    let kvs = await Actor.openKeyValueStore(`data-kvs`)
    await kvs.setValue('test', 'test')

  await kvs.forEachKey(async (key: string) => {
        let val = (await kvs.getValue(key)) as Buffer
        files.push({ key, value: val })
        console.log(val);

    }).then(async () => {
        console.log(files.length)
        await zipFiles(files)
        await Actor.exit()
    })


})();


async function zipFiles(files: { key: string, value: Buffer }[]) {
    // let handler = (err: FlateError | null, data: Uint8Array, final: boolean) => {
    //     if (err) {
    //         console.log(err)
    //     }
    //     else {
    //         console.log(data)
    //     }
    //     if (final) {
    //         console.log('done')
    //     }
    // }
    let zipObj = {} as any

    let callback = (err: FlateError | null, data: Uint8Array) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log(data)
        }

    }
    let left = files.length
    for (let file of files) {
        processFile( left--, file)
    }

    const fileToU8 = (file: File, cb: (out: Uint8Array) => void) => {
        const fr = new FileReader();
        fr.onloadend = () => {
            cb(new Uint8Array(fr.result as ArrayBuffer));
        }
        return file.stream().tee()
    };

    function processFile( left: number, file: { key: string, value: Buffer }) {
       // var ext = file.key.slice(file.key.lastIndexOf('.') + 1).toLowerCase();
        bufToU8(file.value, (buf: Uint8Array) => {
            // With fflate, we can choose which files we want to compress
            zipObj[file.key] = [buf, {
                level: 0
            }];

            // If we didn't want to specify options:
            // zipObj[file.name] = buf;

            if (!--left) {
                zip(zipObj, {
                    // If you want to control options for every file, you can do so here
                    // They are merged with the per-file options (if they exist)
                    // mem: 9
                }, async function (err, out) {
                    if (err) console.error(err);

                    else {
                        // You may want to try downloading to see that fflate actually works:
                        // download(out, 'fflate-demo.zip');
                        console.log(out);
                     fs.writeFileSync('test.zip', out)
                    }
                });
            }
        });
    }
}

function bufToU8(value: Buffer, arg1: (buf: Uint8Array) => void) {
    let u = Uint8Array.from(value, c => c)
    arg1(u)
    return u
}
