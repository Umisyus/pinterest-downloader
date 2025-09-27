// For more information, see https://crawlee.dev/
import { Actor, ApifyClient, KeyValueStore, Log, log, RecordOptions } from "apify";
import { FileDownload } from "crawlee";
import { Input, Item } from './types.js';
import { PinData } from './pin-data.js';
import * as fs from "node:fs";
import path, * as Path from "node:path";
import { createZipFromFolder } from "./archive-files.js";
import { info } from "node:console";

await Actor.init()

const input = await Actor.getInput<any>();

if (!(input && input satisfies Input)) {
    throw new Error(`Input is missing required fields!`);
}

const {
    APIFY_TOKEN = undefined,
    APIFY_USERNAME = undefined,
    DATASET_NAME_OR_ID = undefined,
    DOWNLOAD_LIMIT = 5,
    DATASET_URL = undefined,
    CONCURRENT_DOWNLOADS = 5,
    ZIP = false
} = input;

const dataSetToDownload = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME_OR_ID}` : DATASET_NAME_OR_ID;
const dataseturl = DATASET_URL
const completedDownloads = 'completed-downloads';
// WHERE THE FLOCK IS THIS STORAGE FOLDER, YOU POS!?>!?!?!?!!?!?
const storagePath = Path.join('.', 'storage', 'key_value_stores', 'downloads-files')
const zipStoragePath = Path.join('.')
const zipFileName = 'pinterest-downloads.zip';

const dlkvs = await Actor.openKeyValueStore('downloads-files')
const zipkvs = await Actor.openKeyValueStore('downloads-zip')

let kvs = await Actor.openKeyValueStore()
let token = [APIFY_TOKEN, process.env.APIFY_TOKEN].filter(Boolean).pop()

if (token) {
    const client = new ApifyClient({ token });
}
const client = new ApifyClient();
let pin_items: PinData[] = await getImageSet(dataSetToDownload) ?? [];

async function getImageSet(dataSetNameOrID: string) {

    if (dataseturl) {
        const url = new URL(dataseturl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const datasetIdFromUrl = pathParts.pop()
        if (datasetIdFromUrl) {
            dataSetNameOrID = datasetIdFromUrl;
        } else {
            throw new Error(`Invalid DATASET_URL format. Expected format: https://api.apify.com/v2/datasets/{DATASET_ID}`);
        }
    }
    try {
        return await client.dataset(dataSetNameOrID).listItems({ limit: DOWNLOAD_LIMIT })
            .then((data) => data?.items as unknown as PinData[] ?? [])
    } catch (error) {
        log.error(`Failed to open dataset with name or ID of '${dataSetNameOrID}'! \n${error}`)
    }
    return []
}

function findData(url: string, pin_items: PinData[]) {
    return pin_items.find((item: PinData) => item.url === url) ?? null;
}

function getPathForName(url: string) {
    let fileName: string;
    let data = findData(url, pin_items)
    if (data) {
        fileName = `${[data.board, data.section].filter(Boolean).map((s: string) => s.substring(0, 15)).join('/')}`
        if (data.video)
            fileName = `${[data.board, data.section].filter(Boolean).join('/')}`
    } else {
        fileName = `profile-${Date.now()}`
    }
    fileName = fileName.replaceAll(/[^a-zA-Z\d]|\s/g, '-');
    return fileName;
}
let imageDownloadStatusKeyValueStore = await KeyValueStore.open(completedDownloads);

await Actor.main(async () => {


    // if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
    //     console.log('No APIFY_TOKEN provided!');
    //     await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!' });
    // }

    if (!DATASET_NAME_OR_ID && !DATASET_URL) {
        await Actor.exit({ exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME_OR_ID provided!' });
    }

    let vals: string[] = []

    await imageDownloadStatusKeyValueStore
        .forEachKey(async (key) => {
            let value = await imageDownloadStatusKeyValueStore.getValue(key) as Item
            if ((value?.isDownloaded)) {
                vals.push(value?.url)
            } else {
                try {
                    if (!value.key)
                        value.key = value.url.split('/').pop() as string
                    value.isDownloaded = false
                    await imageDownloadStatusKeyValueStore.setValue(value.key, value)
                } catch (e) {
                    log.error(`Failed to fix key for url: ${value?.url} with error: ${e}`)
                }
            }
        })

    log.info(`Total links previously downloaded: ${vals.length}`);

    let startUrls: string[] = []
    try {
        pin_items = normalizePins(pin_items)
        startUrls = pin_items.map(p => p.url)

        log.info(`Total links: ${startUrls.length}`);
    } catch (e: any) {
        console.error(`Failed to read links: ${e}`)
    }

    // Filter out any pins already marked as downloaded
    let delta = startUrls.filter((url) => !vals.includes(url))
    log.info(`Total links downloaded: ${vals.length}`);
    log.info(`Total links to download: ${delta.length}`);
    startUrls = delta

    const crawler = new FileDownload({
        maxConcurrency: CONCURRENT_DOWNLOADS ?? 10,
        minConcurrency: 2,
        maxRequestRetries: 2,
        requestHandler: async function ({ body, request, contentType }) {
            const url = new URL(request.url);

            let fileName = getFileName(url.href)
            let path = getPathForName(url.href)

            // await saveAsFile(Path.join(storagePath, path), fileName, body)
            //     .then(() => console.log(`Wrote file to path: ${Path.join(storagePath, path)}`))
            //     .catch(error => console.error({error}))

            await dlkvs.setValue(fileName, body, { contentType: 'image/jpeg' })
                .then(_ => log.info(`Downloaded ${fileName} with content type: ${contentType.type}. Size: ${body?.length} bytes`))

            await imageDownloadStatusKeyValueStore.setValue(fileName,
                {
                    key: url.pathname.split('/').pop(),
                    url:
                        request.url,
                    isDownloaded: true
                })
        }
    });

    await crawler.run(startUrls).then(async (stats) => {
        if (ZIP && stats.requestsFinished > 0) {
            // Create the zip file here
            // folder and full path
            log.info("creating zip...")
            await createZipFromFolder(storagePath, zipStoragePath, zipFileName)
                .then(() => log.info(`Zip archive created at: ${Path.join(zipStoragePath, zipFileName)}`))
                .catch(e => log.error(`An error occurred! The file(s) or folder(s) do not exist ` + e));

            await saveToKVS(zipStoragePath, zipFileName, zipkvs, { contentType: 'application/zip' })

            log.info(`You can find your zip file here: ${kvs.getPublicUrl(zipFileName)}`)
        } else log.info('No files were downloaded...')


        await Actor.exit()

        log.info('Complete!')
    });

})

await Actor.exit()


function normalizePins(ALL_ITEMS: any[]) {
    return ALL_ITEMS.map((o: any) => {
        let url!: string;
        let video: string | undefined = undefined;

        if (o.images !== undefined)
            if (o.images.url !== undefined)
                url = o.images.url
        if ("images" in o && o.images && Object.keys(o.images).length > 0) {
            // @ts-ignore
            url = o.images[Object.keys(o['images']).at(-1)].url
        }
        if ("imageSpec_orig" in o)
            url = o.imageSpec_orig?.url

        if (!url) {
            throw new Error('Pin url not found! Was it a valid pin? ' + JSON.stringify(o));
        }

        if (o.videos) {
            if (o.videos.videoUrls && o.videos.videoUrls instanceof Array)
                if (o.videos.videoUrls.length > 0)
                    url = o.videos.videoUrls.sort().at(0)
        }

        return {
            name: [o.title ?? o.grid_title].filter(Boolean).pop() ?? o.id,
            id: o.id ?? o.entity_id,
            url,
            board: "board" in o ? (o.board.url).split('/').filter(Boolean).pop() : null,
            section: "section" in o ? o?.section?.title : null,
            video: video ?? null
        };
    });
}

function getFileName(url: string) {
    let fileName: string;

    let data = findData(url, pin_items)
    if (data) {
        fileName = `${[data.id].filter(Boolean).join('-')}.png`
        if (data.video)
            fileName = `${[data.id].filter(Boolean).join('-')}.mp4`
    } else {
        fileName = `unknown-${Date.now()}.png`
    }

    return fileName

}

async function saveToKVS(zipStoragePath: string, zipFileName: string, _kvs: KeyValueStore, contentType: { contentType: string; type?: any; }) {
    let fileStream = await fs.promises.readFile(Path.join(zipStoragePath, zipFileName))
        .catch(_ => log.error('Could not open ' + Path.join(zipStoragePath, zipFileName)))

    await _kvs.setValue(zipFileName, fileStream, contentType)
        .then(_ => log.info(`Saved ${zipFileName} to ${zipkvs.name} successfully!`))
        .catch(_ => log.error("Failed to store into Key-Value-Store!"))
}
