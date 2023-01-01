// // TEST SPLITTING
// function splitArray(array, MAX_SIZE_IN_BYTES = 9 * 1_000_000) {
//     let results = [];
//     let current = [];
//     let currentSize = 0
//     for (var i = 0; i < array.length; i += 10) {
//         results.push(array.slice(i, i + 10));
//     }
//     console.log(results.length);

//     return results;
// }
import { Actor, ApifyClient, log } from 'apify';
import archiver from 'archiver';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { KeyValueListItem } from 'apify-client';
import { keys } from 'crawlee';
// Actor.init().then(async () => {
(async () => {
    await Actor.init()
    let defkvs = await Actor.openKeyValueStore('data-kvs')

    let items: any[] = []
    log.info('Getting keys')

    const { KVS_ID, API_TOKEN } = { "KVS_ID": "wykmmXcaTrNgYfJWm", "API_TOKEN": process.env.APIFY_TOKEN }
    // process.env;

    // await defkvs.forEachKey(async (key) => {
    //     items.push((({
    //         key: (await defkvs.getValue(key) as any).key,
    //         value: (await defkvs.getValue(key) as any).value.data
    //     })))
    // })
    let images = await GetKVSValues(KVS_ID!, API_TOKEN, 20)
    // items.push(...images);
    // log.info(`Got ${items.length} key(s)`)

    // let chunks = splitArray(items, 25)
    // // console.dir(chunks);
    // // console.dir("chunks_length: " + chunks.length);

    // await Promise.all(chunks.map(async chunk => {
    //     await archiveKVS2(chunk).then(async (zip) => {
    //         // fs.writeFileSync(`test-${randomUUID()}.zip`, zip)
    //         await Actor.setValue(`test-${randomUUID()}.zip`, zip, { contentType: 'application/zip' })
    //     })
    // })).then(async () => {
    //     log.info('Done')
    //     await Actor.exit()
    // });

})()

async function GetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });
    let ALL_ITEMS: Buffer[] = [];
    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));

    do {

        let [...images] = [...(await loopItems(KVS_ID, items, client))];

        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

        if (nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break

        await archiveKVS2(images).then(async (zip) => {

            if (zip) {
                log.info(`Writing ${images.length} key(s) to KVS`)
                await Actor.setValue(`${KVS_ID}-${randomUUID()}`, zip, {
                    contentType: 'application/zip'
                })
            }
        }).catch((err) => {
            console.log(err);
        })

    } while (nextExclusiveStartKey)

    log.info(`Processed all items`)
    return ALL_ITEMS;


}
async function loopItems(KVS_ID: string, keys: KeyValueListItem[], client: ApifyClient) {
    let items: any[] = []
    for await (const it of keys) {
        await delay(0.2);
        items.push(await client.keyValueStore(KVS_ID).getRecord(it.key));
    }
    return items;
}
// .finally(async () => await Actor.exit());
async function archiveKVS2(imageArray: any[]) {
    const buffers: Buffer[] = [];

    await new Promise<void>(async (resolve, reject) => {

        const archive = archiver.create('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('data', (chunk) => {
            buffers.push(chunk)
        });

        archive.on('end', () => {
            console.log('End called');
            resolve();
        });

        archive.on('error', reject);
        // Append each file from the key-value store to the archive
        // imageArray.forEach(async (item, index) => {
        for (let index = 0; index < imageArray.length; index++) {
            const item = imageArray[index];
            archive.append(Buffer.from(item.value), { name: `${item.key}` })
        }

        archive.finalize()
    })
    return Buffer.concat(buffers)
}


function splitArray(array: any[], FILES_PER_ZIP: number = 50, MAX_SIZE_IN_BYTES = 9 * 1_000_000) {
    let results = [];

    for (var i = 0; i < array.length; i += FILES_PER_ZIP) {
        results.push(array.slice(i, i + FILES_PER_ZIP));
    }
    console.log(results.length);

    return results;
}


async function delay(s: number) {
    return new Promise<void>((resolve) => {
        log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}
