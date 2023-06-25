// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, log } from "apify";
import { randomUUID } from "crypto";
import { AsyncZipOptions, AsyncZippable, zip as zipCallback } from "fflate";
import * as fs from "fs";
import { zipKVS } from "./zipKVS.js";
await Actor.init();

let {
    IncludedStores = [] as string[],
    APIFY_TOKEN = undefined,
    ExcludedStores,
    multi_zip = true,
    MAX_SIZE_MB = 250,
    FILES_PER_ZIP = 1000,
} = await Actor.getInput<any>();

const excluded = new Array().concat(
    ExcludedStores ?? (process.env.ExcludedStores as unknown as string[]) ?? []
);
let isAtHome = Actor.isAtHome()

// APIFY_TOKEN = APIFY_TOKEN ?? process.env.APIFY_TOKEN

log.info(`Excluded key-value stores: ${excluded.join(", ")}`);

if (isAtHome == true && !APIFY_TOKEN) {
    console.error("No APIFY_TOKEN provided!");
    await Actor.exit({
        exitCode: 1,
        statusMessage: "No APIFY_TOKEN provided!",
    });
}

// Setup client
const client = new ApifyClient({ token: APIFY_TOKEN });

client.baseUrl = "https://api.apify.com/v2/";
client.token = APIFY_TOKEN;

if (FILES_PER_ZIP == undefined || FILES_PER_ZIP < 1 || FILES_PER_ZIP > 1000) {
    log.info(`FILES_PER_ZIP is invalid. Setting FILES_PER_ZIP to 200`)
    FILES_PER_ZIP = 200;
}

if (MAX_SIZE_MB < 1) {
    log.info(`MAX_SIZE_MB is invalid. Setting MAX_SIZE_MB to 250`)
    MAX_SIZE_MB = 250;
}

await zipToKVS();
await Actor.exit();

async function zipToKVS() {
    console.time("zipToKVS");
    if (multi_zip) {
        await writeManyZips();
    } else {
        await writeSingleZip();
    }
    console.timeEnd("zipToKVS");
    log.info("Finished zipping to key-value store!");


}
async function writeManyZips() {
    IncludedStores = IncludedStores.filter((item: any) => !excluded.includes(item));

    // for (let index = 0; index < IncludedStores.length; index++) {
    //     const kvs = IncludedStores[index];
    //     log.info(`Zipping ${kvs} key-value store...`);
    //     // Split zip file into chunks to fit under the 9 MB limit
    //     // Get the ID and list all keys of the key-value store
    //     console.log("Fetching items...");
    //     await zipKVS(kvs, APIFY_TOKEN, FILES_PER_ZIP, MAX_SIZE_MB);
    // }

    // List all key-value stores
    let stores: any[] = [];

    if (isAtHome) {
        if (IncludedStores.length > 0) { stores.push(...IncludedStores); }
        else {
            log.info("No KVS ID was provided...");
            log.info("Fetching all remote key-value stores...");

            stores = (await client.keyValueStores().list()).items;

        }
        stores.filter((item) => !excluded.includes(item));

        await onlineKVS(stores);
    } else {
        // Locally
        // Get items either from the listed stores or from the default store

        if (IncludedStores.length > 0) { stores.push(...IncludedStores); }
        else {
            log.info("No KVS ID was provided...");
            log.info("Fetching all key-value stores...");
            stores = IncludedStores.length > 0 ? IncludedStores :
                [(((await Actor.openKeyValueStore()).name) ?? ((await Actor.openKeyValueStore()).id))];
        }
        stores = stores.filter((item: string) => !excluded.includes(item));

        await localKVS(stores);
    }
    // log.info('Done.');
}

async function localKVS(store: any[]) {

    log.info(`Zipping ${store.length} key-value stores...`);

    printNumberedList(store);

    for (let index = 0; index < store.length; index++) {
        const element = store[index];
        console.log("Fetching local items...");
        await zipKVS(element, undefined, FILES_PER_ZIP, MAX_SIZE_MB, isAtHome);
    }
}

async function onlineKVS(stores: any[]) {
    printNumberedList(stores.map((i) => i.name ?? i.title ?? i.id ?? i));

    // Get the ID and list all keys of the key-value store
    for (let index = 0; index < stores.length; index++) {
        const kvs = stores[index];
        const remoteKVSID = kvs.name ?? kvs.title ?? kvs.id ?? kvs;
        log.info(`Zipping '${remoteKVSID}' key-value store...`);
        // Split zip file into chunks to fit under the 9 MB limit
        console.log("Fetching items...");
        await zipKVS(remoteKVSID, APIFY_TOKEN, FILES_PER_ZIP, MAX_SIZE_MB, isAtHome);
    }
}

function printNumberedList(store: string[]) {
    log.info(`List:` + `\n` + `${store.map((i, ii) => `#${1 + ii}: ${i}`).join(",\n")}`);
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
        let filteredKVSListItem = item_names.items.filter(
            (item) => !excluded.includes(item.key)
        );

        log.info(
            `Zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id
            } key-value store...`
        );
        // .filter((item) => is_excluded(item));
        for (let index = 0; index < filteredKVSListItem.length; index++) {
            const kvsListItem = filteredKVSListItem[index];

            // Get the record of each key
            const record = await client
                .keyValueStore(kvs.id)
                .getRecord(kvsListItem.key);
            record?.key ? (fileName = record?.key) : (fileName = randomUUID());
            // If the record is a file, download it and save it to the key-value store
            // if (record?.contentType === 'image/jpg' || record?.contentType === 'image/jpeg' || record?.contentType === 'image/png') {
            const file = await client
                .keyValueStore(kvs.id)
                .getRecord(kvsListItem.key);
            if (file && file?.value) {
                const fName = `${folderName}/_${fileName ?? randomUUID()}.png`;

                log.info(`Adding file ${fName} to zip file...`);
                // console.log(file.key, file.value);
                const buffered = Buffer.from(file.value as string, "binary");
                toZip[`${folderName}/${[fName]}`] = [buffered];

                // log.info(`Finished adding file ${fName} to zip file...`);
            } else {
                log.info(`File ${fileName} is not a valid file!`);
            }

            log.info(
                `${index}/${filteredKVSListItem.length} files added to zip file...`
            );
        }

        zipped = await zip(toZip);

        // Done zipping
        log.info(
            `Finished zipping ${filteredKVSListItem.length} files from ${kvs.name ?? kvs.title ?? kvs.id
            } key-value store...`
        );
        console.log("Writing zip...");
        // Get the name of the key-value store
        // Do not reset the zip file

        saveToFS(zipped, undefined, `${folderName}.zip`);
    }

    const kvsName = folderName;
    // Save the zip file to the key-value store
    log.info(`Saving zipped files to key-value store...`);
    saveToFS(zipped);
    // await Actor.setValue(`${randomUUID()}_${folderName}.zip`, zipped, { contentType: 'application/zip' })
    // await saveToKVS(zipped);

    log.info(`Finished saving zipped files to key-value store ${kvsName}...`);
}

export function saveToFS(
    zipped: any,
    outFolder = "images-folder",
    fileName = "image-downloads.zip"
) {
    const path = `${outFolder}/${fileName}`;
    try {
        if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);

        fs.writeFileSync(path, zipped);
    } catch (e) {
        console.error(e);
    }

    console.log("Done!");
}

async function getKeyValueStoreList(client: ApifyClient) {
    let kvs1 = await client.keyValueStores().list();
    // Read all keys of the key-value store
    log.info(`Found key-value stores: \n${kvs1.items.join(", ")}`);

    let filteredActorKVSItem = kvs1.items.filter(
        (kvs) => !excluded.includes(kvs.name ?? kvs.title ?? "")
    );
    log.info(
        `Filtered key-value stores: \n${filteredActorKVSItem
            .map((k) => k.name)
            .join(", ")}`
    );

    return filteredActorKVSItem;
}

export const zip = (
    data: AsyncZippable,
    options: AsyncZipOptions = { level: 0 }
): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
        zipCallback(data, options, (err, resultData) => {
            if (err) {
                console.warn("err = ", err);
                reject(err);
            }
            return resolve(resultData);
        });
    });
};


