
import { ApifyClient, log, Actor, KeyValueStore } from "apify";
import { KeyValueListItem, KeyValueStoreRecord } from "apify-client";
import { chunk } from "crawlee";
import { Readable } from "stream";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import Promise, { is } from "bluebird";
import { APIFY_TOKEN, DOWNLOAD_CONCURRENCY, DOWNLOAD_DELAY, FILES_PER_ZIP, ZIP_ExcludedStores, ZIP_IncludedStores, filterArrayByPartialMatch, getKeyValueStores, tempFilePath } from "./main.js";
import * as glob from "glob";

let ZIP_FILE_NAME = "";

export async function zipKVS(
    KVS_ID: string,
    _API_TOKEN?: string | undefined,
    FILES_PER_ZIP: number = 500,
    _MAX_ZIP_SIZE_MB: number = 250,
    isAtHome?: boolean
) {
    // Generate structure of the zip file
    FILES_PER_ZIP = (0 + FILES_PER_ZIP)

    log.info(`${isAtHome ? "On Apify" : "On local machine"}`);
    await IteratorGetKVSValuesIterx(KVS_ID, _MAX_ZIP_SIZE_MB)
}


export function bufferToStream(data: Buffer | Uint8Array) {
    let readableStream = new Readable({ autoDestroy: true });
    readableStream.push(data);

    readableStream.push(null);
    return readableStream;
}

/* Returns an array of KeyValueStoreRecords */
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
                if ((<any> item.value)?.value?.data) {
                    item.value = (<any> item.value).value.data;
                }
                ++i;
                items.push(item);

                // log.info(`#${i} of ${keys.length}`);
            }
        }
    }

    if (!client && !Actor.isAtHome()) {
        for await (const it of keys) {
            const item = await (await Actor.openKeyValueStore(KVS_ID)).getValue(it.key!)

            if (item) {
                items.push({ key: it, value: item as any } as unknown as KeyValueStoreRecord<any>);
            }
        }
    }
    yield items;
}
/* Returns one KeyValueStoreRecord */
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

// Gets an item from the remote KVS
async function loopItemsIterAsync(
    KVS_ID: string,
    keys: KeyValueListItem[],
    client?: ApifyClient
) {
    let i = 0;
    for await (const it of keys) {
        await delay(0.2);
        const item: KeyValueStoreRecord<any> = await client.keyValueStore(KVS_ID).getRecord(it.key!)

        if (item.value) {
            ++i;
            return item;
        }
    }
    return null
}

/* Downloads all files from one or many KVS */
async function IteratorGetKVSValuesIterx(
    KVS_NAME: string,
    _MAX_ZIP_SIZE_MB: number = 500,
) {
    try {
        let client = new ApifyClient({ token: APIFY_TOKEN });
        let kvs0 = (await client.keyValueStores().list()).items;
        let kvs = kvs0.find((k) => k.id === KVS_NAME || k.name === KVS_NAME || k.title === KVS_NAME);
        let totalCount = 0;
        let runningCount = 0;
        let kvs_id = kvs?.id;
        totalCount = (await client.keyValueStore(kvs_id).listKeys()).count;

        let { nextExclusiveStartKey, items: kvsItemKeys } = (await client.keyValueStore(kvs_id).listKeys());
        while (nextExclusiveStartKey) {
            if (
                nextExclusiveStartKey != undefined &&
                nextExclusiveStartKey != null &&
                nextExclusiveStartKey.length !== 0
            ) {
                // Get the next set of items and update the nextExclusiveStartKey
                let resp = await client.keyValueStore(kvs_id).listKeys({
                    exclusiveStartKey: nextExclusiveStartKey,
                });
                nextExclusiveStartKey = resp.nextExclusiveStartKey;

                // Update list of keys
                kvsItemKeys.push(...resp.items);

                log.info(`Processed ${runningCount} of ${totalCount} items`);
            } else {
                // If there are no more items, yield the remaining items
                if (nextExclusiveStartKey === null) {
                    break;
                }
            }
        }

        log.info(`Processing ${totalCount} of ${kvsItemKeys.length} total items.`)

        // Optionally chunk the array of keys

        let kvsItemKeyChunks = (() => {
            if (FILES_PER_ZIP) {
                return chunk(kvsItemKeys, FILES_PER_ZIP)
            }
            else {
                return sliceArrayByKeyValueListItemSize(kvsItemKeys, _MAX_ZIP_SIZE_MB)
            }
        })();

        // await createZipFile(kvsItemKeys, kvs_id, KVS_NAME);
        for (let index = 0; index < kvsItemKeyChunks.length; index++) {
            const chunk = kvsItemKeyChunks[index];
            await createZipFile(chunk, kvs_id, `${KVS_NAME}-${index}`);
        }

        log.info(`Processed all items`);
        log.info(`Processed a total of ${runningCount} out of ${totalCount} items in ${KVS_NAME} (${kvs_id})`);
    } catch (e) {
        log.error(e)
    }

}

async function createZipFile(kvsItemKeys: KeyValueListItem[], KVS_ID: string, fileName?: string | undefined) {
    const arr_len = kvsItemKeys.length
    let client = Actor.apifyClient

    log.info("Generating zip file...");
    kvsItemKeys = kvsItemKeys.filter(Boolean)

    ZIP_FILE_NAME = `${fileName ?? KVS_ID}`;
    let zipFilePath = path.join(path.resolve('.'), tempFilePath, ZIP_FILE_NAME);
    let output = fs.createWriteStream(zipFilePath);
    let zip = archiver.create("zip", { zlib: { level: 0 } });
    // Pipe archive data to the zip file
    zip.pipe(output);
    let downloadKey = (key: KeyValueListItem) => new Promise(async (res) => {
        await delay(DOWNLOAD_DELAY ?? 2)
            .then(async () => {
                console.log(`delayed for ${(DOWNLOAD_DELAY ?? 2)} second(s)`);
            })
        const p = await loopItemsIterAsync(KVS_ID, [key], client)
        addToZip(p, zip);
        res();
    })

    // Loop through the async items and add them to the zip file

    await Promise.map(kvsItemKeys, async (key, index) => {
        await downloadKey(key)
        log.info(`#${arr_len - index + 1} of ${arr_len}`);
    }, { concurrency: DOWNLOAD_CONCURRENCY ?? 3 })

    log.info(`Saved all items to zip file ${ZIP_FILE_NAME}`);
    log.info(`Saving zip file ${ZIP_FILE_NAME} to Apify...`);
    await zip.finalize().then(async () => {
        // output.close();
        let zipFileStream = fs.createReadStream(zipFilePath);
        await Actor.setValue(ZIP_FILE_NAME, zipFileStream, { contentType: "application/zip" })
            .then(() => {
                output.close();
                zipFileStream.close();
                log.info(`Saved ${ZIP_FILE_NAME} to Apify.`);
            });

    });
}
async function createZipFileWithLocalData(kvsItemKeys: string[], KVS_ID: string, fileName?: string | undefined) {
    const arr_len = kvsItemKeys.length

    log.info("Generating zip file...");
    kvsItemKeys = kvsItemKeys.filter(Boolean)
    const kvs = await Actor.openKeyValueStore(KVS_ID);
    ZIP_FILE_NAME = fileName ?? KVS_ID;
    const zipFilePath = path.join(path.resolve('.'), tempFilePath, ZIP_FILE_NAME);
    const output = fs.createWriteStream(zipFilePath);
    const zip = archiver.create("zip", { zlib: { level: 0 } });
    // Pipe archive data to the zip file
    zip.pipe(output);
    const downloadKey = (key: string) => new Promise(async (res, reject) => {
        // Get value
        const record = {
            value: await kvs.getValue(key) as Buffer | Uint8Array,
            key
        }

        if (record.value) {
            addToZip(record, zip);
            res();
        }
        reject('Failed to add item to zip file');
    })

    // Loop through the async items and add them to the zip file

    await Promise.map(kvsItemKeys, async (key, index) => {
        await downloadKey(key)
        log.info(`#${arr_len - index + 1} of ${arr_len}`);
    }, { concurrency: DOWNLOAD_CONCURRENCY ?? 3 })

    log.info(`Saved all items to zip file ${ZIP_FILE_NAME}`);
    log.info(`Saving zip file ${ZIP_FILE_NAME} to Apify...`);
    await zip.finalize().then(async () => {
        // output.close();
        const zipFileStream = fs.createReadStream(zipFilePath);
        await Actor.setValue(ZIP_FILE_NAME, zipFileStream, { contentType: "application/zip" })
            .then(() => {
                output.close();
                zipFileStream.close();
                log.info(`Saved ${ZIP_FILE_NAME} to Apify.`);
            });

    });
}

async function createZipFileWithLocalFiles() {
    let i = 1;

    log.info("Generating zip file...");
    let folders = glob.sync(path.join(process.cwd(), 'storage', 'key_value_stores/*'), { ignore: ['**/*.json', '**/*.zip'] })
    folders = filterArrayByPartialMatch(folders, ZIP_ExcludedStores);
    for await (const f of folders) {
        let name = path.basename(f);
        ZIP_FILE_NAME = `${name}-${i}`;
        let zipFilePath = path.join(path.resolve('.'), ZIP_FILE_NAME);
        let output = fs.createWriteStream(zipFilePath);
        let zip = archiver.create("zip", { zlib: { level: 0 } });
        // Pipe archive data to the zip file
        zip.pipe(output);

        // Loop through the async items and add them to the zip file
        zip.glob("**/*", { cwd: f });

        log.info(`Saved all items to zip file ${ZIP_FILE_NAME}`);
        log.info(`Saving zip file ${ZIP_FILE_NAME} to Apify...`);
        await zip.finalize().then(async () => {
            // output.close();
            let zipFileStream = fs.createReadStream(zipFilePath);
            await Actor.setValue(ZIP_FILE_NAME, zipFileStream, { contentType: "application/zip" })
                .then(() => {
                    output.close();
                    zipFileStream.close();
                    log.info(`Saved ${ZIP_FILE_NAME} to Apify.`);
                });

        });

        i++;
    }
    console.log(`Done creating ${folders.length} zip file${folders.length > 1 || folders.length == 0 ? "s" : ""}`);

}

async function createZipFileWithLocalFile(KVS_ID: string) {
    let i = 1;

    log.info("Generating zip file...");
    let folders = glob.sync(path.join(process.cwd(), 'storage', 'key_value_stores', KVS_ID))
    folders = filterArrayByPartialMatch(folders, ZIP_ExcludedStores);
    for await (const f of folders) {
        let name = path.basename(f);
        ZIP_FILE_NAME = `${name}-${i}.zip`;
        let zipFilePath = path.join(path.resolve('.'), ZIP_FILE_NAME);
        let output = fs.createWriteStream(zipFilePath);
        let zip = archiver.create("zip", { zlib: { level: 0 } });
        // Pipe archive data to the zip file
        zip.pipe(output);

        // Loop through the async items and add them to the zip file
        zip.glob("**/*", { cwd: f });

        log.info(`Saved all items to zip file ${ZIP_FILE_NAME}`);
        log.info(`Saving zip file ${ZIP_FILE_NAME} to Apify...`);
        await zip.finalize().then(async () => {
            // output.close();
            let zipFileStream = fs.createReadStream(zipFilePath);
            await Actor.setValue(ZIP_FILE_NAME, zipFileStream, { contentType: "application/zip" })
                .then(() => {
                    output.close();
                    zipFileStream.close();
                    log.info(`Saved ${ZIP_FILE_NAME} to Apify.`);
                });

        });

        i++;
    }
    console.log(`Done creating ${folders.length} zip file${folders.length > 1 || folders.length == 0 ? "s" : ""}`);

}
function addToZip(record: KeyValueStoreRecord<any>, zip: archiver.Archiver) {
    let kvs_record: Buffer = record?.value ?? null;

    if (record.key && kvs_record) {
        log.info(`Writing ${record.key} to zip file...`);
        try {
            zip.append(bufferToStream(Buffer.from(kvs_record) as Buffer), { name: record.key });
        } catch (error) {
            console.error(error);
        }

    } else {
        log.info(`Skipping ${record.key}...`);
    }

    console.log(`Memory used: ${process.memoryUsage().rss / 1024 / 1024} MB`);
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
        const valueSizeMB = (<any> value.value)?.data?.length;
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

export function sliceArrayByKeyValueListItemSize(
    values: KeyValueListItem[],
    maxSizeMB: number = 9.5
): KeyValueListItem[][] {
    let totalSizeMB = 0;
    const slicedArrays = [];
    let slicedValues = [];
    for (const value of values) {
        const valueSizeMB = value.size
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

export function getLocalFolderNames() {
    try {
        return glob.sync(path.join(process.cwd(), 'storage', 'key_value_stores', '/*'));
    } catch (error) {
        return [];
    }
}
