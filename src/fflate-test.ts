import { ApifyClient, log, Actor } from 'apify';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import { AsyncZipOptions, AsyncZippable, zip as zipCallback } from 'fflate';
import * as fs from 'fs';
import { chunk } from 'crawlee';
import { bufferToStream } from './kvs-test.js';

let ZIP_FILE_NAME = ''

let showDebugInfo = false

export async function zipKVS(KVS_ID: string, API_TOKEN?: string | undefined, MAX_ZIP_SIZE_MB: number = 250) {
    let f: AsyncGenerator | any = null;
    // Generate structure of the zip file
    let isAtHome = Actor.isAtHome();

    let i = 0;
    let zipObj: any = {};

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`)
    if (!isAtHome) {
        f = IteratorGetKVSValues(KVS_ID, API_TOKEN, 10, MAX_ZIP_SIZE_MB)
    } else {
        f = IteratorGetKVSValuesLocal(KVS_ID)
    }

    for await (const records of f) {
        // file name (string) : file contents (Buffer)
        for await (const record of records) {

            let kvs_record: any = record.value;
            if (API_TOKEN || isAtHome == true) {

                if (record.key && kvs_record) {
                    // on apify
                    log.info(`Writing ${record.key} to zip file...`)
                    zipObj[record.key + '.png'] = Uint8Array.from(kvs_record as Buffer);
                }
                else {
                    log.info(`Skipping ${record.key}...`)
                }

            } else {
                // on local machine
                zipObj[record.key] = Uint8Array.from(kvs_record.data);
            }

        }

        i++;
        log.info("Generating zip file...");
        await zip(zipObj as AsyncZippable, { level: 0 })
            .then(async (res) => {
                log.info("Writing file to disk");
                const zip_file_name = `${ZIP_FILE_NAME}-${i}`;

                let stream = bufferToStream(Buffer.from(res))

                await Actor.setValue(zip_file_name, stream, { contentType: "application/zip" })

            });
        zipObj = {};
    }
}

async function* loopItemsIterArray(KVS_ID: string, keys: KeyValueListItem[], client?: ApifyClient): AsyncGenerator<KeyValueStoreRecord<Buffer>[]> {
    let items: KeyValueStoreRecord<any>[] = []
    if (client) {
        let i = 0
        for await (const it of keys) {
            await delay(0.2);
            const item = await client.keyValueStore(KVS_ID).getRecord(it.key!)
            if (item) {
                if ((<any>item.value)?.value?.data) {
                    item.value = (<any>item.value).value.data
                }
                ++i
                items.push(item);

                log.info(`#${i} of ${keys.length}`)
            }
        }
    }

    if (!client && !Actor.isAtHome()) {
        for await (const it of keys) {
            const item = await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!)

            if (item) {
                items.push(item as KeyValueStoreRecord<any>);
            }
        }
    }
    yield items
}

async function* loopItemsIter(KVS_ID: string, keys: KeyValueListItem[], client?: ApifyClient): AsyncGenerator<KeyValueStoreRecord<Buffer>> {
    if (client) {
        let i = 0
        for await (const it of keys) {
            await delay(0.2);
            const item: KeyValueStoreRecord<any> = await client.keyValueStore(KVS_ID).getRecord(it.key!)

            if (item.value) {

                ++i
                yield item;

                log.info(`#${i} of ${keys.length}`)
            }
        }
    }
}

export function zip(
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
};

/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP: number = 1000, MAX_ZIP_SIZE_MB: number = 200) {

    let client = new ApifyClient({ token: API_TOKEN });

    let kvs = (await client.keyValueStores().list()).items.find((k) => k.id === KVS_ID || k.name === KVS_ID || k.title === KVS_ID)
    let totalCount = (await client.keyValueStore(KVS_ID).listKeys()).count;

    let { nextExclusiveStartKey, items: kvsItemKeys } = (await client.keyValueStore(KVS_ID)
        .listKeys({ limit: FILES_PER_ZIP }));

    ZIP_FILE_NAME = (kvs?.name ?? kvs?.title ?? kvs?.id) ?? KVS_ID

    let runningCount = 0;
    // Find a way to yield the images instead of waiting for all of them to be processed

    log.info(`Processing ${kvsItemKeys.length} of ${totalCount} total items.`)
    // Make code send collection where the size of the collection is the size of MAX_ZIP_SIZE_MB 
    log.info(`Processing items totalling size of ${MAX_ZIP_SIZE_MB} MB`)
    let items: KeyValueStoreRecord<any>[] = []

    let currentSize = 0;


    do {
        // Find a way to yield the images instead of waiting for all of them to be processed
        let images = loopItemsIter(KVS_ID, kvsItemKeys, client);
        for await (const i of images) {
            // Get the size of the current item
            let size = i.value.length
            // Add the size to the current size
            currentSize += size
            // Add the item to the items array
            items.push(i)
            // If the current size is greater than the max size, yield the items and reset the items array
            if (currentSize >= MAX_ZIP_SIZE_MB * 1_000_000) {
                // Yield the items then reset the items array
                yield items
                items = []
                currentSize = 0
            }

        }

        if (nextExclusiveStartKey != undefined
            && nextExclusiveStartKey != null
            && nextExclusiveStartKey.length !== 0) {
            // Get the next set of items and update the nextExclusiveStartKey
            let resp = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP }))))
            nextExclusiveStartKey = resp.nextExclusiveStartKey

            // Update list of keys
            kvsItemKeys = resp.items

            runningCount += items.length
            log.info(`Processed ${items.length} of ${totalCount} items`)

        } else {
            // If there are no more items, yield the remaining items
            if (nextExclusiveStartKey === null && items.length > 0) {
                yield items
            }
            // Clear the items
            items = []
        }
    } while (items.length > 0)


    log.info(`Processed all items`)
    await Actor.exit()
}
/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValuesLocal(KVS_ID: string) {

    let client = await Actor.openKeyValueStore(KVS_ID)
    let localItems: any[] = []
    function handleKey(key: string) {
        localItems.push({ key })
    }

    log.info('Getting keys...')
    // Get all keys
    await client.forEachKey(handleKey)

    let totalCount = localItems.length;
    ZIP_FILE_NAME = KVS_ID

    let runningCount = 0;

    do {
        let parcelList = chunk(localItems, 1000)
        // Find a way to yield the images instead of waiting for all of them to be processed
        for (let index = 0; index < parcelList.length; index++) {
            const element = parcelList[index];

            let images = loopItemsIterArray(KVS_ID, element);
            log.info(`Getting ${element.length} of ${localItems.length} images...`)
            for await (const i of images) {

                const chunked = sliceArrayBySize(i, 250)

                log.info(`Got ${i.length} images...`)

                log.info(`Processing ${chunked.length} chunk(s)`)
                let ii = 0
                let l = chunked.length

                // Duplicate the data
                // let mem = [...chunked[0].slice()]
                // let slicedValues = [...mem.slice().reverse()];
                // slicedValues.map(record => {
                //     record.key = randomUUID().slice(0, 5) + record.key
                //     return record
                // })
                // let arr = [slicedValues.concat(mem).reverse()]

                // for await (const ch of arr) {

                /*
                Because the dataset is a lot of duplicate data with different names,
                the data is saved duplicated with the above code. Otherwise, the data
                is written as not duplicated. Use the above code to duplicate the data on local runs.
                */
                for await (const ch of chunked) {

                    ii++;
                    yield ch
                    runningCount += ch.length
                    log.info(`Chunk #${ii} of ${runningCount}`)
                }
            }
        }
        log.info(`Processed ${runningCount} items`)

    } while (runningCount < totalCount)

    log.info(`Processed all local items`)

}


export function sliceArrayBySize(values: KeyValueStoreRecord<Buffer>[], maxSizeMB: number = 9.5) {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = (<any>value.value)?.data?.length;
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

export async function delay(s: number) {
    return new Promise<void>((resolve) => {
        // log.info(`Waiting ${s} second(s)`);
        setTimeout(() => {
            resolve();
        }, s * 1000);
    });
}
async function saveToFS(zip_file_name: string, res: Uint8Array) {
    await fs.promises.writeFile('./test-zips/' + zip_file_name + '.zip', res)
        .then(async () => console.log("Written to disk"));
    log.info("Saved" + zip_file_name + " to disk");
}

// log.info("Starting script")
// await Actor.init()

// // log.info("Reading token from file")

// console.log(`Detected ${os.cpus().length} of ${os.cpus()[0].model} model CPUs`);
// console.log(os.totalmem());
// log.info(`Total memory: ${os.totalmem() / 1_000_000} GB`)
// console.log(os.freemem())
// console.time("Time")


// await zipKVS().then(() => {
//     log.info("Done")
//     console.timeEnd("Time");

//     stats();
// });


// await Actor.exit()

function stats() {
    if (showDebugInfo) {
        console.log(Object.entries(process.memoryUsage()).map(k => k[0] + ": " + k[1] / 1000000 + " MB").join(", "));

    }
}
