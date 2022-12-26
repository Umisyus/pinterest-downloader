// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log, } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import { zipSync } from 'fflate';
import create from 'archiver';
import fs from 'fs';
import { KeyValueStoreRecord } from '@crawlee/types';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

let { APIFY_TOKEN, ExcludedStores, multi_zip = true, FILES_PER_ZIP = 10 } =
// await Actor.getInput<any>()
{
    APIFY_TOKEN: undefined, ExcludedStores:
        [
            'completed-downloads'
            // 'concept-art', 'cute-funny-animals'
        ]
};

const excluded = new Array().concat(ExcludedStores ?? process.env.ExcludedStores as unknown as string[] ?? []);
const token = APIFY_TOKEN ?? process.env.APIFY_TOKEN ?? '';

log.info(`Excluded key-value stores: ${excluded.join(', ')}`);
if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    console.log('No APIFY_TOKEN provided!');
    await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
}

// export let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');

const client = new ApifyClient({ token });

client.baseUrl = 'https://api.apify.com/v2/';
client.token = token;

// await downloadZip(client)
await zipToKVS(client
)
await Actor.exit()

async function zipToKVS(client: ApifyClient) {
    console.time('zipToKVS');
    if (multi_zip) {
        await writeManyZips();
    } else {
        await writeSingleZip();
    }
    console.timeEnd('zipToKVS');
    log.info('Finished zipping to key-value store!');

    // SOURCE: https://stackoverflow.com/a/54029307
    function chunkArray(arr: KeyValueStoreRecord[], size: number): any[] {
        return arr.length > size
            ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
            : [arr];
    }

    async function writeManyZips() {
        // List all key-value stores
        const defaultKVS = await Actor.openKeyValueStore()

        let kvs_items = (await client.keyValueStores().list({
            // Optional limit and offset
            // offset: 1, limit: 2
        })).items
            .filter((item) => !excluded.includes(item.name ?? item.title ?? item.id));
        // Get the ID and list all keys of the key-value store
        for (const kvs of kvs_items) {

            // Split zip file into chunks to fit under the 9 MB limit
            let items = await getKVSValues(kvs.id, 100) as KeyValueStoreRecord[];
            // slice into array into chunks of 10
            let a_chunks = chunkArray(items, FILES_PER_ZIP) as KeyValueStoreRecord[][];

            for (let [index, chunk] of a_chunks.entries()) {
                // Humans count from 1
                index++;

                let nom = `${randomUUID()}-${kvs.name ?? kvs.title ?? kvs.id}-${index}`
                log.info(`Zipping ${nom} key-value store...`);

                let ff = await archiveKVS2(chunk);

                log.info(`Saving chunk #${index} as ${nom} to file system...`);
                saveToFS(ff, undefined, `${nom}.zip`);

                log.info(`Saving chunk #${index} as ${nom} to key-value store...`);
                await saveToKVS(ff, nom).then(async () => {
                    await Actor.pushData({
                        download: defaultKVS.getPublicUrl(nom)
                    })
                });

                console.log(ff.length);

            }
        }

    }
}

async function getKVSValues(kvs_id: string, limit: number) {
    let items = (await client.keyValueStore(kvs_id).listKeys({ limit: limit })).items
        .map(async (key) => {
            return await (client.keyValueStore(kvs_id)).getRecord(key.key);
        })
    return Promise.all(items);
}

async function writeSingleZip() {
    let toZip: any = {};
    let zipped: any = {};
    let folderName = "";
    let fileName = "";
    // Read all key-value stores
    let filteredActorKVSItem = await getKeyValueStoreList(client);

    for (let index = 0; index < filteredActorKVSItem.length; index++) {
        const kvs = filteredActorKVSItem[index];
        // Get the ID and list all keys of the key-value store
        fileName = "";
        folderName = kvs.name ?? kvs.title ?? kvs.id;

        let item_names = await client.keyValueStore(kvs.id).listKeys();
        let filteredKVSListItem = item_names.items.filter((item) => !excluded.includes(item.key));

        log.info(`Zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
        // .filter((item) => is_excluded(item));
        for (let index = 0; index < filteredKVSListItem.length; index++) {
            const kvsListItem = filteredKVSListItem[index];

            // Get the record of each key
            const record = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
            record?.key ? fileName = record?.key : fileName = randomUUID();
            // If the record is a file, download it and save it to the key-value store
            // if (record?.contentType === 'image/jpg' || record?.contentType === 'image/jpeg' || record?.contentType === 'image/png') {
            const file = await client.keyValueStore(kvs.id).getRecord(kvsListItem.key);
            if (file && file?.value) {
                const fName = `${folderName}/_${fileName ?? randomUUID()}.png`;

                log.info(`Adding file ${fName} to zip file...`);
                // console.log(file.key, file.value);
                const buffered = Buffer.from((file.value as string), 'binary');
                toZip[`${folderName}/${([fName])}`] = [buffered];

                // log.info(`Finished adding file ${fName} to zip file...`);
            } else { log.info(`File ${fileName} is not a valid file!`); }

            log.info(`${index}/${filteredKVSListItem.length} files added to zip file...`);
        };

        zipped = zipSync(
            toZip
        );
        // Done zipping
        log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
        console.log('Writing zip...');
        // Get the name of the key-value store
        // Do not reset the zip file

        saveToFS(zipped, undefined, `${folderName}.zip`);
    }

    const kvsName = folderName
    // Save the zip file to the key-value store
    log.info(`Saving zipped files to key-value store...`);
    saveToFS(zipped);
    // await Actor.setValue(`${randomUUID()}_${folderName}.zip`, zipped, { contentType: 'application/zip' })
    // await saveToKVS(zipped);

    log.info(`Finished saving zipped files to key-value store ${kvsName}...`);
}

function saveToFS(zipped: any, outFolder = 'images-folder', fileName = 'image-downloads.zip') {
    const path = `${outFolder}/${fileName}`;
    try {
        if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);

        fs.writeFileSync(path, zipped, { encoding: 'binary' });
    }
    catch (e) {
        console.error(e)
    }

    console.log('Done!');
}


async function getKeyValueStoreList(client: ApifyClient) {
    let kvs1 = await client.keyValueStores().list();
    // Read all keys of the key-value store
    log.info(`Found key-value stores: \n${kvs1.items.join(', ')}`);

    let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""));
    log.info(`Filtered key-value stores: \n${filteredActorKVSItem.map(k => k.name).join(', ')}`);

    return filteredActorKVSItem;
}

async function saveToKVS(zipped: any, fileName: string = "image_downloads") {
    const b = Buffer.from(zipped)
    log.info(`ZIP: NAME: ${fileName} LENGTH IN BYTES: ${b.length}`)
    await Actor.setValue(`${fileName}`, b, { contentType: 'application/zip' });
    log.info(`${fileName} was saved to KVS successfully!`)
}

function is_excluded(i: KeyValueListItem): boolean {
    log.info(`Checking if ${i.key} is excluded...`)
    if ('INPUT' == i.key) {
        // Ignored by default
        log.info(`Excluding ${i.key}...`)
        return false;
    }
    return !excluded.includes(i.key);
}

function getExtension(filename: string) {
    return filename.split('.').pop() ?? '';
}

async function archiveKVS(store: KeyValueStore, limit: number | undefined = FILES_PER_ZIP) {
    const buffers: Uint8Array[] = [];

    await new Promise<void>(async (resolve, reject) => {

        const archive = create('zip', {
            zlib: { level: 0 } // Sets the compression level.
        });

        archive.on('data', (chunk: Uint8Array) => {
            buffers.push(chunk)
        });

        archive.on('end', () => {
            console.log('End called');
            resolve();
        });

        archive.on('error', reject);
        // Append each file from the key-value store to the archive
        let items: any[] = [];

        log.info(`Getting all keys from ${store.name ?? store.id} key-value store...`);
        // Get all keys from the key-value store
        let keys: string[] = []
        await store.forEachKey(async (key) => (<any> keys.push(key)))

        // Limit the number of files to zip
        if (FILES_PER_ZIP && FILES_PER_ZIP > 0) {
            keys = keys.slice(0, limit)
        }
        // log.info(`Got ${keys.length} keys from ${store.name ?? store.id} key-value store...`);

        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            // keys.forEach(async (key, index) => {
            // if (index >= limit) return;

            let value = await store.getValue(key) as any
            // log.info(`Adding ${key} to archive...`);
            if (!value || value.length < 1) console.log(`#${index} was skipped because it was empty!`, value);

            console.log(`Value is ${value.length} bytes`);

            archive.append(value, { name: `${key}` })
            log.info(`Added #${index + 1}: ${key} to archive...`);
            // console.log(`#${index + 1} of ${keylength} added to ...`);
        }

        // store.forEachKey(async (key, index) => {
        //     // if (index >= limit) return;

        //     let value = await store.getValue(key) as Buffer
        //     // log.info(`Adding ${key} to archive...`);
        //     if (!value || value.length < 1) console.log(`#${index} was skipped because it was empty!`, value);

        //     console.log(`Value is ${value.length} bytes`);

        //     archive.append(value, { name: `${key}` })
        //     log.info(`Added #${index + 1}: ${key} to archive...`);
        //     // console.log(`#${index + 1} of ${keylength} added to ...`);
        // })

        archive.finalize()
    })
    return Buffer.concat(buffers)
}

async function archiveKVS2(store: any[], limit: number | undefined = FILES_PER_ZIP) {
    const buffers: Uint8Array[] = [];

    await new Promise<void>(async (resolve, reject) => {

        const archive = create('zip', {
            zlib: { level: 0 } // Sets the compression level.
        });

        archive.on('data', (chunk: Uint8Array) => {
            buffers.push(chunk)
        });

        archive.on('end', () => {
            console.log('End called');
            resolve();
        });

        archive.on('error', reject);
        // Append each file from the key-value store to the archive
        store.forEach(async (item, index) => {

            if (!item.value || item.value.length < 1) console.log(`#${index} was skipped because it was empty!`, item.value);

            console.log(`Value is ${item.value.length} bytes`);

            archive.append(item.value, { name: `${item.key}` })
            log.info(`Added #${index + 1}: ${item.key} to archive...`);
        })

        await archive.finalize()
    })
    return Buffer.concat(buffers)
}
