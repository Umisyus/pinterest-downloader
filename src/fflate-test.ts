import { ApifyClient, log, Actor, KeyValueStore, KeyConsumer } from 'apify';
import { KeyValueListItem, KeyValueStoreRecord } from 'apify-client';
import { AsyncZipOptions, AsyncZippable, zip as zipCallback } from 'fflate';
import * as fs from 'fs';
import { chunk } from 'crawlee';
import { bufferToStream } from './kvs-test.js';
import { randomUUID } from "crypto";
// let KVS_ID = "wykmmXcaTrNgYfJWm"
let KVS_ID = "data-kvs-copy"
// let KVS_ID = "YmY3H1ypC9ZUOhDbH"// - umisyus/data-kvs
let ZIP_FILE_NAME = ''

async function* loopItemsIterArray(KVS_ID: string, keys: KeyValueListItem[], client?: ApifyClient): AsyncGenerator<KeyValueStoreRecord<Buffer>[]> {
    let items: KeyValueStoreRecord<any>[] = []
    if (client) {
        for await (const it of keys) {
            await delay(0.2);
            const item = await client.keyValueStore(KVS_ID).getRecord(it.key!)
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            if (item) {
                if ((<any> item.value)?.value?.data) {
                    item.value = (<any> item.value).value.data
                }
                items.push(item);
            }
        }
    }

    if (!client && !Actor.isAtHome()) {
        for await (const it of keys) {
            const item = await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!)
            // await delay(0.2);
            // items.push((await client.keyValueStore(KVS_ID).getRecord(it.key))!);
            if (item) {
                items.push(item as KeyValueStoreRecord<any>);
            }
        }
    }
    yield items
}

export function zip(
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            console.warn("err = ", err, "err data = ", data);
            console.log("data = ", data);
            if (err) return reject(err);
            return resolve(data);
        });
    });
};
/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValues(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {
    if (Actor.isAtHome() == false) {
        let client = new ApifyClient({ token: API_TOKEN });

        let { nextExclusiveStartKey, items } = (await client.keyValueStore(KVS_ID).listKeys({ limit: FILES_PER_ZIP }));
        let totalCount = (await client.keyValueStore(KVS_ID).listKeys()).count;

        let kvs = (await client.keyValueStores().list()).items.find((k) => k.id === KVS_ID || k.name === KVS_ID || k.title === KVS_ID)
        ZIP_FILE_NAME = (kvs?.name ?? kvs?.title ?? kvs?.id) ?? KVS_ID

        let runningCount = 0;

        do {
            // Find a way to yield the images instead of waiting for all of them to be processed
            let images = loopItemsIterArray(KVS_ID, items, client);
            for await (const i of images) {

                let chunked = sliceArrayBySize(i, 100)
                log.info(`Processing ${chunked.length} chunk(s)`)

                for await (const ch of chunked) {
                    yield ch
                }
            }

            if (nextExclusiveStartKey !== null) {
                let resp = ((await (client.keyValueStore(KVS_ID).listKeys({ exclusiveStartKey: nextExclusiveStartKey, limit: FILES_PER_ZIP }))))
                nextExclusiveStartKey = resp.nextExclusiveStartKey
                items = resp.items

                runningCount += items.length
                log.info(`Processed ${runningCount} of ${totalCount} items`)

            } else {
                items = []
            }
        } while (items.length > 0)
    }

    log.info(`Processed all items`)
    await Actor.exit()
}
/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValuesLocal(KVS_ID: string, API_TOKEN?: string | undefined, FILES_PER_ZIP?: number) {

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
                    log.info(`Chunk #${ii} of ${runningCount}`)
                    yield ch
                    runningCount += ch.length
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
        const valueSizeMB = (<any> value.value)?.data?.length;
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
        log.info(`Waiting ${s} second(s)`);
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
async function main() {
    let f = IteratorGetKVSValuesLocal(KVS_ID, undefined);
    // Generate structure of the zip file
    let isAtHome = Actor.isAtHome();

    let i = 0;
    let zipObj: any = {};

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`)

    for await (const records of f) {
        // file name (string) : file contents (Buffer)
        for await (const record of records) {
            log.info(`records: ${records.length}`)

            let kvs_record: any = record.value;
            if (token && isAtHome == true) {
                // on apify

                zipObj[record.key + '.png'] = Uint8Array.from(kvs_record as Buffer);
            } else {
                // on local machine
                zipObj[record.key] = Uint8Array.from(kvs_record.data);
            }

        }

        i++;
        log.info("Generating zip file...");
        await zip(zipObj as AsyncZippable, { level: 9, mem: 8 })
            .then(async (res) => {
                log.info("Writing file to disk");
                const zip_file_name = `${ZIP_FILE_NAME}-${i}`;

                if (!fs.existsSync('./test-zips')) { fs.mkdirSync('./test-zips'); }
                let stream = bufferToStream(Buffer.from(res))

                await Actor.setValue(zip_file_name, stream, { contentType: "application/zip" })

            });
        zipObj = {};
    }
}

log.info("Starting script")
await Actor.init()

// log.info("Reading token from file")
const token = //(
    process.env.APIFY_TOKEN // ??
// fs.readFile('./storage/token.json', (_, data) =>
// data ? JSON.parse(data.toString()).token : undefined)) ?? undefined

await main();
await Actor.exit()
