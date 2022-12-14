// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from 'apify';
import { KeyValueListItem } from 'apify-client';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { AsyncGzip, strToU8, zipSync } from 'fflate';
import fs from 'fs';
// import * as tokenJson from "../storage/token.json"
await Actor.init();

let { APIFY_TOKEN, ExcludedStores } =
// await Actor.getInput<any>()
{
    APIFY_TOKEN: undefined, ExcludedStores:
        [
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

    await writeManyZips();

    await writeSingleZip();

    async function writeManyZips() {
        let toZip: any = {};
        let zipped: any = {};
        // Read all key-value stores
        let kvs1 = await client.keyValueStores().list({ offset: 1, limit: 2 });
        // Read all keys of the key-value store
        let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""));
        for (let index = 0; index < filteredActorKVSItem.length; index++) {
            const kvs = filteredActorKVSItem[index];
            // Get the ID and list all keys of the key-value store
            let fileName = "";
            let folderName = kvs.name ?? kvs.title ?? kvs.id;

            let item_names = await client.keyValueStore(kvs.id).listKeys({ limit: 20 });
            let filteredKVSListItem = item_names.items;
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
                    console.log(file.key, file.value);
                    const buffered = Buffer.from((file.value as string), 'binary');
                    toZip[`${folderName}/${([file.key])}`] = [buffered];

                    log.info(`Finished adding file ${fName} to zip file...`);
                } else { log.info(`File ${fileName} is not a valid file!`); }


            };

            zipped = zipSync(
                toZip
            );

            // Done zipping
            log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
            console.log('Writing to file...');
            // Get the name of the key-value store
            const kvsName = kvs.name ?? kvs.title ?? kvs.id;
            // Save the zip file to the key-value store
            log.info(`Saving zipped files to key-value store ${kvsName}...`);
            // saveToFS(zipped, undefined, `${kvsName}.zip`);

            await saveToKVS(zipped, `${randomUUID()}_${kvsName}`);
            // await Actor.setValue(`${randomUUID()}_${folderName}`, big_data, { contentType: 'application/zip' })
            log.info(`Finished saving zipped files to key-value store ${kvsName}...`);
            // Reset the zip file
            toZip = {};
        }
    }
    async function writeSingleZip() {
        let toZip: any = {};
        let zipped: any = {};
        let folderName = "";
        let fileName = "";
        // Read all key-value stores
        let kvs1 = await client.keyValueStores().list({ offset: 1, limit: 2 });
        // Read all keys of the key-value store
        let filteredActorKVSItem = kvs1.items.filter((kvs) => !excluded.includes(kvs.name ?? kvs.title ?? ""));
        for (let index = 0; index < filteredActorKVSItem.length; index++) {
            const kvs = filteredActorKVSItem[index];
            // Get the ID and list all keys of the key-value store
            fileName = "";
            folderName = kvs.name ?? kvs.title ?? kvs.id;

            let item_names = await client.keyValueStore(kvs.id).listKeys({ limit: 20 });
            let filteredKVSListItem = item_names.items;
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
                    console.log(file.key, file.value);
                    const buffered = Buffer.from((file.value as string), 'binary');
                    toZip[`${folderName}/${([file.key])}`] = [buffered];

                    log.info(`Finished adding file ${fName} to zip file...`);
                } else { log.info(`File ${fileName} is not a valid file!`); }


            };

            zipped = zipSync(
                toZip
            );
            // Done zipping
            log.info(`Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id} key-value store...`);
            console.log('Writing to file...');
            // Get the name of the key-value store
            // Do not reset the zip file
        }

        const kvsName = folderName
        // Save the zip file to the key-value store
        log.info(`Saving zipped files to key-value store...`);
        // saveToFS(zipped);
        // await Actor.setValue(`${randomUUID()}_${folderName}.zip`, zipped, { contentType: 'application/zip' })
        await saveToKVS(zipped);

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
}

async function saveToKVS(zipped: any, fileName: string = "image_downloads") {
    await Actor.setValue(`${fileName}`, Buffer.from(zipped), { contentType: 'application/zip' });
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
