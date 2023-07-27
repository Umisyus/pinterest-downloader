import { Dataset, KeyValueStore } from 'apify';
import { createPlaywrightRouter } from 'crawlee';
import { randomUUID } from 'crypto'
import { getImageset, imageDownloadStatusKeyValueStore, pin_items } from './main.js';
import { PinData } from './Pinterest DataTypes.js';

export const router = createPlaywrightRouter();

// let report = (await Dataset.open('completed-downloads'))
router.addDefaultHandler(async ({ log, request, response }) => {

    let items: PinData[] = pin_items ?? [];

    log.info('Downloading the pin... ' + request.url);
    if (response && response?.ok()) {

        if (items.length === 0) {
            items = (await getImageset() ?? [])
        }
        let body = await response.body();

        let filename = ''
        let ext = 'png'
        // EX. URL: *pinterest-pin-id[.png,.jpg,.webp]
        let item = items.find((item: PinData) => item.images?.orig.url === request.url) ?? null;

        let innerFolder = '';
        if (item) {
            const { grid_title, board } = item as PinData;
            let boardName = board?.name ?? randomUUID().slice(0, 5);
            let boardUrl = board?.url ?? "";
            innerFolder = boardName + '/';
            if (grid_title) {
                filename = grid_title
                    .trim().slice(0, 69)
                    .replace(/[^a-zA-Z0-9]|\\+\//g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/, '') + '.png'
                if (filename === undefined || filename === '' || filename === `.${ext}`)
                    filename = `pin-${item.id ?? randomUUID()}` + `.${ext}`
            } else {
                // Source: https://www.bannerbear.com/blog/how-to-download-images-from-a-website-using-puppeteer/#downloading-images-from-a-website
                const matches = /.(jpg|png|svg|gif)/.exec(response.url());
                if (matches && matches.length > 1) {
                    ext = matches[1];
                }

                let pin_url_id = request.url.split('/').filter(Boolean).pop();

                if (pin_url_id === undefined) pin_url_id = item.id;
                if (pin_url_id !== undefined)
                    pin_url_id[pin_url_id.length - 1] === '/' ? boardUrl?.split('/').filter(Boolean).pop() : boardUrl.split('/').pop();
                log.info("pin_url_id: " + pin_url_id);

                let pin_id = item.id
                log.info("pin_id: " + pin_id);

                if (filename === undefined || filename === '' || filename === `.${ext}`)
                    filename = pin_id ?? `unknown-${randomUUID()}` + `.${ext}`;
                // filename = [pin_id, pin_url_id].filter(t => t !== undefined && t !== '' && t !== `${ext}`).pop() ?? `unkown-${randomUUID()}.png`
            }

            // TODO: Prevent recursive folder creation
            // TODO: Prevent duplicate file names √

            /* Save image */
            // Save with file name or ID?

            let boardURLName = boardUrl![boardUrl!.length - 1] === '/' ? boardUrl?.split('/').filter(Boolean).pop() : boardUrl?.split('/').pop();
            boardURLName = formatBoardName(boardURLName ?? randomUUID().slice(0, 5));
            // Save image to store in it's board folder
            let boardImageStore = await KeyValueStore.open(boardURLName as string);
            // Save image to store as it's specific type (png, jpg, gif, etc.)
            await boardImageStore.setValue(`${filename}`, body, { contentType: `image/${ext ?? 'png'}` });
            log.info("Saved image: " + filename + " to " + `${boardName}/${filename}`);
            // Save status to keyvalue store
            // await imageDownloadStatusKeyValueStore.setValue(`${filename}`, { url: request.url, pin_id: item.id, status: 'completed', isDownloaded: true });
            await imageDownloadStatusKeyValueStore.setValue(`${filename}`, { id: item.id, url: item.images.orig.url });

            await Dataset.open('completed-downloads').then(async (ds) => await ds.pushData({ id: item.id, url: item.images.orig.url }))
        } else {
            log.info("Item not found: " + request.url);
        }

    }

});
function formatBoardName(s: string) {
    return s.replace(/[^a-zA-Z0-9]|\\+\//g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/, '');
}
