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

import { randomUUID } from 'crypto';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import { chunk, chunkBySize, keys } from 'crawlee';
import * as archiver from 'archiver';

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
    await GetKVSValues2Test(KVS_ID!, API_TOKEN)
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

export async function GetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });
    // let ALL_ITEMS: Buffer[] = [];
    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    log.info(`Found ${count} total key(s)`)
    do {

        let [...images] = [...(await loopItems(KVS_ID, items, client))];



        // Zip and upload
        let chunked = sliceArrayBySize(images, 9)
        log.info(`Processing ${chunked.length} chunk(s)`)
        for await (const ch of chunked) {
            await archiveKVS2(ch).then(async (zip) => {

                if (zip) {
                    log.info(`Writing ${ch.length} key(s) to KVS`)
                    await Actor.setValue(`${KVS_ID}-${randomUUID()}`, zip, {
                        contentType: 'application/zip'
                    })
                }
            }).catch((err) => {
                console.log(err);
            })

        }

        nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;

        if (nextExclusiveStartKey !== null) {
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }
        else break
    } while (nextExclusiveStartKey)

}
export async function GetKVSValues2Test(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    let client = new ApifyClient({ token: API_TOKEN });

    let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
    let count = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP })).count;
    log.info(`Found ${count} total key(s)`)

    do {
        /* Get images 200 keys at a time, zip & save */

        // Find a way to yield the images instead of waiting for all of them to be processed
        let split = chunk(items, 15)
        // Get all images from KVS

        split.forEach(async (e) => {
            // Zip array of items iteratively
            await loopItemsIterArray(KVS_ID, e ?? [], client).next().then(async (e) => {

                await processParts(e.value as any[], KVS_ID);
            }).then(async () => {
                log.info(`Archived ${e.length} key(s)`)
            })
        })

        if (nextExclusiveStartKey !== null) {
            nextExclusiveStartKey = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).nextExclusiveStartKey;
            items = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP })))).items
        }

        else break

    } while (nextExclusiveStartKey)

    log.info(`Processed all items`)
    // await Actor.exit()
}
async function loopItems(KVS_ID: string, keys: KeyValueListItem[], client: ApifyClient) {
    let items: KeyValueStoreRecord<any>[] = []
    for await (const it of keys) {
        await delay(0.2);
        items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
    }
    return items;
}
async function* loopItemsIter(KVS_ID: string, keys: KeyValueListItem[], client: ApifyClient) {
    let items: KeyValueStoreRecord<any>[] = []
    for await (const it of keys) {
        await delay(0.2);
        // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
        yield (await client.keyValueStore(KVS_ID).getRecord(it.key));
    }

}
async function* loopItemsIterArray(KVS_ID: string, keys: KeyValueListItem[], client: ApifyClient) {
    let items: KeyValueStoreRecord<Buffer>[] = []
    for await (const it of keys) {
        await delay(0.2);
        // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
        items.push(await client.keyValueStore(KVS_ID).getRecord(it.key!) as KeyValueStoreRecord<any>);
    }
    yield items
}

export function sliceArrayBySize(values: KeyValueStoreRecord<Buffer>[], maxSizeMB: number = 9.5) {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = value.value.length;
        if (totalSizeMB + valueSizeMB > (maxSizeMB * 1_000_000)) {
            slicedArrays.push(slicedValues);
            slicedValues = [];
            totalSizeMB = 0;
        }
        slicedValues.push(value);
        totalSizeMB += valueSizeMB;
    }
    if (slicedValues.length > 0) {
        slicedArrays.push(slicedValues);
    }
    return slicedArrays;
}


function manualChunk(array: KeyValueStoreRecord<any>[], sizeLimit = 9 * 1_000_000) {
    let results: any[] = []
    let chunk = []
    let sizeCount = 0;

    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        sizeCount += element.value.length;

        const bool = sizeCount < sizeLimit;

        if (bool) {
            chunk.push(element);
        } else {
            results.push(chunk)
            chunk = []
            sizeCount = 0;

        }



        if (index === array.length - 1 && sizeCount < sizeLimit) {
            // results.push(chunk)
            // Find any unadded items
            if (array.flat().filter(o => !results.flat().includes(o))) {
                chunk = []
                chunk.push(...array.flat().filter(o => !results.flat().includes(o)))
                results.push(chunk)
            }
        }

    }
    return results;
}

// let splitArr = manualChunk(stuff)

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
export async function delay(s: number) {
    return new Promise<void>((resolve) => {
        log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}
async function processParts(chunks: KeyValueStoreRecord<Buffer>[], nomDuFichier: string): Promise<void> {
    log.info(`Current # of items: ${chunks.length}`)

    let ff = await archiveKVS2(chunks);

    log.info(`Saving file ${nomDuFichier} to key-value store...`);
    await saveToKVS(ff, nomDuFichier).then(async () => {
        await Actor.pushData({
            download: (await Actor.openKeyValueStore()).getPublicUrl(nomDuFichier)
        })
    });
}
async function saveToKVS(zipped: Buffer, fileName: string = "image_downloads") {
    log.info(`ZIP's NAME: ${fileName} Zip's LENGTH IN BYTES: ${zipped.length}`)
    await Actor.setValue(`${fileName}`, zipped, { contentType: 'application/zip' });
    log.info(`${fileName} was saved to KVS successfully!`)
}
