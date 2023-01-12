import apify, { Actor, KeyValueStore } from 'apify'
import { randomUUID } from 'crypto';

import { AsyncDeflate, AsyncZipOptions, AsyncZippable, AsyncZlib, FlateError, zip as zipCallback } from 'fflate'
import fs from 'fs';

let zipObj = {} as any

(async () => {
    await Actor.init().then(() => console.log('Actor initialized'))
    let files: { key: string, value: Buffer }[] = []

    let kvs = await Actor.openKeyValueStore(`data-kvs`)

    await kvs.forEachKey(async (key: string) => {
        let val = (await kvs.getValue(key)) as Buffer
        files.push({ key, value: val })
        // console.log(val);

    })
    console.log(files.length)
    await zipFiles(files)
        .then(async () => {
            // await Actor.exit()
        })

})();

async function zipFiles(files: { key: string, value: Buffer }[]) {

    for (let file of files) {
        processFile(file)
    }

    await zipStructure(zipObj, { level: 0 })
        .then(async (out) => {
            console.log("Done zipping")
            console.log("Wriiting file");
            let kvs = await Actor.openKeyValueStore()
            let nom = randomUUID() + "test_file"
            const file = Buffer.from(out);
            await fs.promises.writeFile("./storage/key_value_stores/default/test_file.zip", file)
                .then(() => console.log("File written to disk"))

            await kvs.setValue(nom, file.toString('base64'), { contentType: 'application/zip' })
                .then(() => console.log("File written to kvs"))
                .then(() => console.log(kvs.getPublicUrl(nom)))
                .then(() => Actor.exit())
        })
}

export const zipStructure = (data: AsyncZippable, options: AsyncZipOptions = { level: 0 }): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            console.warn("err = ", err);
            console.log("data = ", data);
            if (err) return reject(err);
            return resolve(data);
        });
    });

async function processFile(file: { key: string, value: Buffer }) {

    bufToU8(file.value, (buf: Uint8Array) => {
        zipObj[file.key] = [buf, {
            level: 0
        }];
    });

}

function bufToU8(value: Buffer, arg1: (buf: Uint8Array) => void) {
    let u = Uint8Array.from(value, c => c)
    arg1(u)
}
