// For more information, see https://crawlee.dev/
import {Actor, ApifyClient, KeyValueStore, log} from 'apify';
import {FileDownload} from 'crawlee';
import {Input, Item} from './types.js';
import {PinData} from './pin-data.js';

await Actor.init()


const input = await Actor.getInput<Input>();
console.log('Input:', {input});
if (!(input && input satisfies Input)) {
    throw new Error(`Input is missing required fields!`);
}

const {
    APIFY_TOKEN,
    APIFY_USERNAME,
    DATASET_NAME_OR_ID,
    DOWNLOAD_LIMIT = 1000,
    DATASET_URL = undefined,
    CONCURRENT_DOWNLOADS = 5
} = input;
let token = [APIFY_TOKEN, process.env.APIFY_TOKEN].filter(Boolean).pop()

const client = new ApifyClient({token});
const dataSetToDownload = APIFY_USERNAME ? `${APIFY_USERNAME}/${DATASET_NAME_OR_ID}` : DATASET_NAME_OR_ID;
const dataseturl = DATASET_URL
const kvs = await Actor.openKeyValueStore();

const completedDownloads = 'completed-downloads';

export const getImageSet = async (dataSetNameOrID: string = dataSetToDownload) => {
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

    return await client.dataset(dataSetNameOrID).listItems({limit: DOWNLOAD_LIMIT})
        .then((data) => data?.items as unknown as PinData[] ?? [])
        .catch(console.error);
}

export let imageDownloadStatusKeyValueStore = await KeyValueStore.open(completedDownloads);
export let pin_items: PinData[] = await getImageSet(dataSetToDownload) ?? [];

function findData(url: string, pin_items: PinData[]) {
    return pin_items.find((item: PinData) => item.url === url) ?? null;
}

await Actor.main(async () => {

    if (!APIFY_TOKEN && !process.env.APIFY_TOKEN) {
        console.log('No APIFY_TOKEN provided!');
        await Actor.exit({exit: true, exitCode: 1, statusMessage: 'No APIFY_TOKEN provided!'});
    }

    if ((!DATASET_NAME_OR_ID && !process.env.DATASET_NAME_OR_ID) && !DATASET_URL) {
        console.log('No DATASET_NAME_OR_ID provided!');
        await Actor.exit({exit: true, exitCode: 1, statusMessage: 'No DATASET_NAME provided!'});
    }

    let vals: string[] = []

    await imageDownloadStatusKeyValueStore
        .forEachKey(async (key) => {
            let value = await imageDownloadStatusKeyValueStore.getValue(key) as Item
            // if (!(value?.isDownloaded) === true) {
            if ((value?.isDownloaded)) {
                vals.push(value?.url)
            } else {
                try {
                    if (!value.key)
                        value.key = <string>value.url.split('/').pop()
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
        maxRequestRetries: 5,
        requestHandler: async function ({body, request, contentType}) {
            const url = new URL(request.url);

            let fileName = getFileName(url.href)
            if (fileName != null) {
                if (JSON.stringify(body) !== undefined)
                    await kvs.setValue(fileName, body, {contentType: contentType.type});
            }

            log.info(`Downloaded ${fileName} from ${request.url} with content type: ${contentType.type}. Size: ${body?.length} bytes`);
            // @ts-ignore
            await imageDownloadStatusKeyValueStore.setValue(fileName),
                {
                    key: url.pathname.split('/').pop(),
                    url:
                    request.url,
                    isDownloaded: true
                }
        }
    });

    // crawler.addRequests(startUrls.map((url) => ({ url })));
    await crawler.run(startUrls);
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
    let fileName = url.split('/').pop();
    // if (!fileName) {
    let data = findData(url, pin_items)
    if (data) {
        fileName = `${[data.board, data.section, data.name, data.id].filter(Boolean).join('-')}.png`
        if (data.video)
            fileName = `${[data.board, data.section, data.name, data.id].filter(Boolean).join('-')}.mp4`
    } else {
        fileName = `unknown-${Date.now()}.png`
    }
    // }

    return fileName.replace(/[^a-zA-Z0-9!-_.']/, '-');
}