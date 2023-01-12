
// Workers will work in almost any browser (even IE11!)
// However, they fail below Node v12 without the --experimental-worker
// CLI flag, and will fail entirely on Node below v10.
import { ApifyClient, log, Actor } from 'apify';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import fflate, { AsyncZipDeflate, AsyncZipOptions, AsyncZippable, strFromU8, strToU8, Zip, zip as zipCallback } from 'fflate';
import * as fs from 'fs';
import pako from 'pako';

import { delay, GetKVSValues2Test, sliceArrayBySize } from './split-test.js';
// All of the async APIs use a node-style callback as so:

// Streaming ZIP archives can accept asynchronous streams. This automatically
// uses multicore compression.
// let files = [{ name: 'file1.txt', data: "Hello 1" }, { name: 'file2.txt', data: "Hello 2" }, { name: 'file3.txt', data: "Hello 3" }]
// // const zip = new fflate.Zip();

// zip.ondata = (err: any, chunk: any, final: any) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     console.log(chunk);
//     if (final) {
//         console.log('Done!');
//     }
// };

// // The JSON and BMP are compressed in parallel
// let chunks: any[] = [];
// const exampleFile2 = new fflate.AsyncZipDeflate('example2.bmp', { level: 9 });
// exampleFile2.ondata = (err: any, chunk: any, final: any) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     console.log(chunk);
//     chunks.push(chunk);

//     if (final) {
//         console.log('Done!');
//     }
// };

// // zip.add(exampleFile2);
// for (let index = 0; index < files.length; index++) {
//     const file = files[index];

//     exampleFile2.push(fflate.strToU8(file.data));
// }

// exampleFile2.push(fflate.strToU8(`hello world!!!!`), true);
// zip.end();

// console.log(exampleFile2.size)

// fs.writeFileSync('test.zip', Buffer.from(chunks));
async function* loopItemsIterArray(KVS_ID: string, keys: KeyValueListItem[], client?: ApifyClient) {
    let items: KeyValueStoreRecord<Buffer>[] = []
    if (client) {
        for await (const it of keys) {
            await delay(0.2);
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            items.push(await client.keyValueStore(KVS_ID).getRecord(it.key!) as KeyValueStoreRecord<any>);
        }
    }

    if (!client) {
        for await (const it of keys) {
            await delay(0.2);
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            items.push(await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!) as KeyValueStoreRecord<any>);
        }
    }
    yield items
}
export async function* GetKVSValues2Test2(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let keys: { key: string }[] = []
    if (!Actor.isAtHome()) {
        let kvs = await Actor.openKeyValueStore(KVS_ID)

        await kvs.forEachKey(async (k) => {
            let val = await kvs.getValue(k) as Buffer
            if (k && val)
                keys.push({ key: k } as KeyValueListItem)
        })


    }
    yield (await loopItemsIterArray(KVS_ID, keys as KeyValueListItem[]).next()).value as KeyValueStoreRecord<Buffer>[] ?? []
    // else {
    //     let client = new ApifyClient({ token: API_TOKEN });
    //     // let ALL_ITEMS: Buffer[] = [];
    //     let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    //     let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    //     log.info(`Found ${count} total key(s)`)

    //     do {
    //         /* Get images 200 keys at a time, zip & save */

    //         // Find a way to yield the images instead of waiting for all of them to be processed
    //         let split = sliceArrayBySize(items, 15)
    //         // Get all images from KVS
    //         for await (const e of split) {
    //             yield loopItemsIterArray(KVS_ID, e ?? [], client)
    //         }

    //         nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

    //         if (nextExclusiveStartKey !== null) {
    //             items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
    //         }
    //         else break

    //     } while (nextExclusiveStartKey)
    // }
    // log.info(`Processed all items`)
    // await Actor.exit()
}

export const zip = (
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            console.warn("err = ", err);
            console.log("data = ", data);
            if (err) return reject(err);
            return resolve(data);
        });
    });
};
export const fileToArrayBuffer = (file: File): Promise<Uint8Array> => {
    return new Promise(async (resolve, reject) => {
        try {
            let fileByteArray: Uint8Array;
            fileByteArray = strToU8(await file.text())
            return resolve(fileByteArray);
        }
        catch (e) {
            reject(e)
        }
    });

}

let f = GetKVSValues2Test2("data-kvs", undefined)

let zp = new pako.Deflate()

for await (let file of f
    // GetKVSValues2Test2("data-kvs", undefined //?? (process.env.APIFY_TOKEN)
    // )
) {
    if (file) {
        for await (const ff of file) {
            const fileBuffer = ff.value;
            log.info(`Zipping ${ff.key}`)
            zp.push(fileBuffer)
        }
    }
}

// zp.push("", true)

// finished
let chunks: any[] = []

log.info(`Zipped ${chunks.length} file(s)`)
fs.writeFileSync('hello.test.zip', Buffer.from(zp.result));

