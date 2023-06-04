import { KeyValueStore } from 'apify';
import { createPlaywrightRouter } from 'crawlee';
import { randomUUID } from 'crypto'
import { imageset } from './main.js';
export const router = createPlaywrightRouter();

// let report = (await Dataset.open('completed-downloads'))
router.addDefaultHandler(async ({ log, request, response }) => {

    log.info('Downloading the pin... ' + request.url);
    if (response && response?.ok()) {
        let body = await response.body();

        let filename = ''
        let ext = 'png'
        // EX. URL: *pinterest-pin-id[.png,.jpg,.webp]
        let item = (await imageset).find((item: any) => item.images.orig.url === request.url);

        let innerFolder = '';
        if (item) {
            const { grid_title, board } = item as any;
            let boardName = board.name;
            let boardUrl = board.url;
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
                    pin_url_id[pin_url_id.length - 1] === '/' ? boardUrl.split('/').filter(Boolean).pop() : boardUrl.split('/').pop();
                log.info("pin_url_id: " + pin_url_id);

                let pin_id = item.id
                log.info("id_ext: " + pin_id);

                if (filename === undefined || filename === '' || filename === `.${ext}`)
                    filename = pin_id ?? `unknown-${randomUUID()}` + `.${ext}`;
                // filename = [pin_id, pin_url_id].filter(t => t !== undefined && t !== '' && t !== `${ext}`).pop() ?? `unkown-${randomUUID()}.png`
            }

            // TODO: Prevent recursive folder creation
            // TODO: Prevent duplicate file names √

            /* Save image */
            // Save with file name or ID?

            let boardURLName = boardUrl[boardUrl.length - 1] === '/' ? boardUrl.split('/').filter(Boolean).pop() : boardUrl.split('/').pop();
            boardURLName = boardURLName.replace(/[^a-zA-Z0-9]|\\+\//g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/, '');
            // Save image to store in it's board folder
            let boardImageStore = await KeyValueStore.open(boardURLName as string);
            // Save image to store as it's specific type (png, jpg, gif, etc.)
            await boardImageStore.setValue(`${filename}`, body, { contentType: `image/${ext}` });
            log.info("Saved image: " + filename + " to " + `${boardName}/${filename}`);
            // Save status to keyvalue store
            let imageDownloadStatusKeyValueStore = await KeyValueStore.open('completed-downloads');
            await imageDownloadStatusKeyValueStore.setValue(`${filename}`, { url: request.url, pin_id: item.id, status: 'completed', isDownloaded: true });
        }

    }

});
