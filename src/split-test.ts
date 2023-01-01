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
    let images = (await GetKVSValues(KVS_ID!, API_TOKEN)).filter(Boolean);
    items.push(...images);
    log.info(`Got ${items.length} key(s)`)

    let chunks = splitArray(items, 25)
    console.dir(chunks);
    console.dir("chunks_length: " + chunks.length);

    await Promise.all(chunks.map(async chunk => {
        archiveKVS2(chunk).then(async (zip) => {
            // fs.writeFileSync(`test-${randomUUID()}.zip`, zip)
            await Actor.setValue(`test-${randomUUID()}.zip`, zip, { contentType: 'application/zip' })
        })
    })).then(async () => {
        log.info('Done')
        await Actor.exit()
    });

})()

async function GetKVSValues(KVS_ID: string, API_TOKEN: string | undefined, FILES_PER_ZIP: number = 50) {
    let client = new ApifyClient({ token: API_TOKEN });
    let total = (await client.keyValueStore(KVS_ID).listKeys()).count;
    let ALL_ITEMS: Buffer[] = [];

    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    do {
        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;
        items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        if (items.length > 0) {
            ALL_ITEMS.push(...(await loopItems(items)));
        }
        if (nextExclusiveStartKey !== undefined || nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
            ALL_ITEMS.push(...(await loopItems(items)));
        }
    } while (nextExclusiveStartKey)

    log.info(`Got ${ALL_ITEMS.length} key(s)`)
    return ALL_ITEMS;
    // return await Promise.all((await (client.keyValueStore(KVS_ID)
    //     .listKeys({ exclusiveStartKey: nextExclusiveStartKey })))
    //     .items.map(i => client.keyValueStore(KVS_ID).getRecord(i.key)));

    async function loopItems(keys: KeyValueListItem[]) {
        let items: any[] = []
        for await (const it of keys) {
            await delay(1);
            items.push(await client.keyValueStore(KVS_ID).getRecord(it.key));
        }
        return items;
    }
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

        archive.on('error', console.log);
        // Append each file from the key-value store to the archive
        // imageArray.forEach(async (item, index) => {
        for (let index = 0; index < imageArray.length; index++) {
            const item = imageArray[index];
            archive.append(Buffer.from(item.value), { name: `${item.key}` })
        }

        await archive.finalize()
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
