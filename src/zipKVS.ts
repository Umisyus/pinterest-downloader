
import { ApifyClient, log, Actor } from "apify";
import { KeyValueListItem, KeyValueStoreRecord } from "apify-client";
import { AsyncZipOptions, AsyncZippable, strFromU8, strToU8, zip as zipCallback } from "fflate";
import { chunk } from "crawlee";
import { Readable } from "stream";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { debug } from "console";

let ZIP_FILE_NAME = "";

export function bufferToStream(data: Buffer | Uint8Array) {
    let readableStream = new Readable({ autoDestroy: true });
    readableStream.push(data);

    readableStream.push(null);
    return readableStream;
}
export async function zipKVS(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP: number = 250,
    MAX_ZIP_SIZE_MB: number = 250,
    isAtHome?: boolean
) {
    let f: AsyncGenerator | any = null;
    // Generate structure of the zip file

    // let zipObj: any = {};

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`);
    if (isAtHome) {
        f = IteratorGetKVSValues(KVS_ID, API_TOKEN, FILES_PER_ZIP, MAX_ZIP_SIZE_MB);
    } else {
        f = IteratorGetKVSValuesLocal(KVS_ID);
    }
    // see if a folder with name .cached was made
    if (!fs.existsSync(path.join(path.resolve('.'), '.cached'))) {
        fs.mkdirSync(path.join(path.resolve('.'), '.cached'));
    }

    let i = 0;
    for await (const records of f) {
        ZIP_FILE_NAME = `${KVS_ID}-${i}.zip`;
        const fp = path.join(path.resolve('.'), '.cached', ZIP_FILE_NAME);

        let output = fs.createWriteStream(fp);

        let zip = archiver.create("zip", { zlib: { level: 0 } });
        // Pipe archive data to the zip file
        zip.pipe(output);
        // file name (string) : file contents (Buffer)
        for await (const record of records) {
            let kvs_record: Buffer = record?.value ?? null;
            if (API_TOKEN || isAtHome == true) {

                if (record.key && kvs_record) {
                    // on apify
                    log.info(`Writing ${record.key} to zip file...`);
                    // zipObj[record.key + ".png"] = Uint8Array.from(kvs_record as Buffer);
                    try {
                        zip.append(bufferToStream(kvs_record as Buffer), { name: record.key });
                    } catch (error) {
                        console.error(error);
                    }

                } else {
                    log.info(`Skipping ${record.key}...`);
                }
            } else {
                // on local machine
                // zipObj[record.key] = Uint8Array.from((<any>kvs_record).data);
                zip.append(bufferToStream(kvs_record as Buffer), { name: record.key });
            }
            console.log(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);
            kvs_record = null;
            console.log(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);

        }
        i++;

        log.info("Generating zip file...");

        await zip.finalize();
        let zfs = fs.createReadStream(fp);
        console.debug(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);

        await Actor.setValue(ZIP_FILE_NAME, zfs, { contentType: "application/zip" }).then(() => {
            log.info(`Zip file ${ZIP_FILE_NAME} saved to Apify key-value store.`);
            // console.debug(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);

            zfs.close();
            zfs.destroy();
            output.close();
            output.destroy();
            zip = null;
            output = null;
            zfs = null;

            // console.debug(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);
            // console.debug(`Read stream for ${ZIP_FILE_NAME} was destroyed.`)
        }).catch((err) => {
            log.error(err);
        })
    }


}

function sizeInMB(res: number) {
    return res / 1024 / 1024;
}

async function* loopItemsIterArray(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
): AsyncGenerator<KeyValueStoreRecord<Buffer>[]> {
    let items: KeyValueStoreRecord<any>[] = [];
    if (client) {
        let i = 0;
        for await (const it of keys) {
            await delay(0.2);
            const item = await client.keyValueStore(KVS_ID).getRecord(it.key!);
            if (item) {
                if ((<any>item.value)?.value?.data) {
                    item.value = (<any>item.value).value.data;
                }
                ++i;
                items.push(item);

                log.info(`#${i} of ${keys.length}`);
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
    yield items;
}

async function* loopItemsIter(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
): AsyncGenerator<KeyValueStoreRecord<Buffer>> {
    if (client) {
        let i = 0;
        for await (const it of keys) {
            await delay(0.2);
            const item: KeyValueStoreRecord<any> = await client.keyValueStore(KVS_ID).getRecord(it.key!)

            if (item.value) {
                ++i;
                yield item;

                log.info(`#${i} of ${keys.length}`);
            }
        }
    }
}


export function zip(
    data: AsyncZippable,
    options: AsyncZipOptions = {}
): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValues(
    KVS_ID: string,
    API_TOKEN?: string | undefined,
    FILES_PER_ZIP: number = 250,
    MAX_ZIP_SIZE_MB: number = 250
) {

    let client = new ApifyClient({ token: API_TOKEN });
    let kvs = (await client.keyValueStores().list()).items
        .find((k) => k.id === KVS_ID || k.name === KVS_ID || k.title === KVS_ID);
    let totalCount = 0;
    let runningCount = 0;
    try {
        let kvs_id = kvs ? (kvs.id ?? kvs.name ?? kvs.title) : KVS_ID;
        totalCount = (await client.keyValueStore(kvs_id).listKeys()).count;

        let { nextExclusiveStartKey, items: kvsItemKeys } = (await client.keyValueStore(kvs_id)
            .listKeys({ limit: FILES_PER_ZIP }));

        // ZIP_FILE_NAME = (kvs?.name ?? kvs?.title ?? kvs?.id) ?? KVS_ID


        log.info(`Processing ${kvsItemKeys.length} of ${totalCount} total items.`)
        // Make code send collection where the size of the collection is the size of MAX_ZIP_SIZE_MB
        log.info(`Processing items totalling size of ${MAX_ZIP_SIZE_MB} MB`)
        let items: KeyValueStoreRecord<any>[] = []

        let currentSize = 0;

        do {
            // Find a way to yield the images instead of waiting for all of them to be processed
            let images = loopItemsIter(kvs_id, kvsItemKeys, client);

            for await (const i of images) {

                let value = (<any>i.value);
                // Get the size of the current item
                let size = value.length;
                // Add the size to the current size
                currentSize += size;
                // Add the item to the items array
                items.push(i);
                const isLimitReached = items.length >= FILES_PER_ZIP;
                // If the current size is greater than the max size, yield the items and reset the items array
                const isSizeLimitReached = currentSize >= MAX_ZIP_SIZE_MB * 1_000_000;

                // console.log({ FILES_PER_ZIP });
                //   console.log({
                //     itemCount: items.length,
                //     isLimitReached,
                //     currentSize,
                //     isSizeLimitReached,
                //   });

                if (isLimitReached || isSizeLimitReached) {
                    // Yield the items then reset the items array
                    yield items;
                    // Yield the items then reset the items array
                    runningCount += items.length;
                    items = [];
                    currentSize = 0;
                }
            }

            if (
                nextExclusiveStartKey != undefined &&
                nextExclusiveStartKey != null &&
                nextExclusiveStartKey.length !== 0
            ) {
                // Get the next set of items and update the nextExclusiveStartKey
                let resp = await client.keyValueStore(kvs_id).listKeys({
                    exclusiveStartKey: nextExclusiveStartKey,
                    limit: FILES_PER_ZIP,
                });
                nextExclusiveStartKey = resp.nextExclusiveStartKey;

                // Update list of keys
                kvsItemKeys = resp.items;

                log.info(`Processed ${runningCount} of ${totalCount} items`);
            } else {
                // If there are no more items, yield the remaining items
                if (nextExclusiveStartKey === null && items.length > 0) {
                    yield items;
                }
                // Clear the items
                items = [];
                break;
            }
        } while (true);
        // } while (items.length > 0);

        log.info(`Processed all items`);
        log.info(`Processed a total of ${runningCount} out of ${totalCount} items in ${ZIP_FILE_NAME} (${KVS_ID})`);
    } catch (e) {
        log.error(e)
        await Actor.exit(e);
    }

}



/* Returns an array of values split by their size in megabytes. */
async function* IteratorGetKVSValuesLocal(KVS_ID: string) {
    let client = await Actor.openKeyValueStore(KVS_ID);
    let localItems: any[] = [];
    function handleKey(key: string) {
        localItems.push({ key });
    }

    log.info("Getting keys...");
    // Get all keys
    await client.forEachKey(handleKey);

    let totalCount = localItems.length;
    // ZIP_FILE_NAME = KVS_ID;

    let runningCount = 0;

    do {
        let parcelList = chunk(localItems, 1000);
        // Find a way to yield the images instead of waiting for all of them to be processed
        for (let index = 0; index < parcelList.length; index++) {
            const element = parcelList[index];

            let images = loopItemsIterArray(KVS_ID, element);
            log.info(`Getting ${element.length} of ${localItems.length} images...`);
            for await (const i of images) {
                const chunked = sliceArrayBySize(i, 250);

                log.info(`Got ${i.length} images...`);

                log.info(`Processing ${chunked.length} chunk(s)`);
                let ii = 0;
                let l = chunked.length;

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
                    yield ch;
                    runningCount += ch.length;
                    log.info(`Chunk #${ii} of ${runningCount}`);
                }
            }
        }
        log.info(`Processed ${runningCount} items`);
    } while (runningCount < totalCount);

    log.info(`Processed all local items`);
}

export function sliceArrayBySize(
    values: KeyValueStoreRecord<Buffer>[],
    maxSizeMB: number = 9.5
) {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = (<any>value.value)?.data?.length;
        if (totalSizeMB + valueSizeMB > maxSizeMB * 1_000_000) {
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
