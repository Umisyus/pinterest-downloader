import { KeyValueStore } from 'apify';
import { createPlaywrightRouter, Dataset } from 'crawlee';

import fs from 'fs';
import { imageKeyValueStore, imageset } from './main.js';
export const router = createPlaywrightRouter();
const baseFolder = './images/';
// let report = (await Dataset.open('completed-downloads'))
let folderPath = '';
router.addDefaultHandler(async ({ log, request, response }) => {

    log.info('Downloading the page... ' + request.url);
    if (response && response?.ok()) {
        let body = await response.body();
        let text = await response.text();

        let filename = ''
        let ext = 'png'
        // EX. URL: *pinterest-pin-id[.png,.jpg,.webp]
        let item = imageset.find((item: any) => item.images.orig.url === request.url);

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
            } else {
                // Source: https://www.bannerbear.com/blog/how-to-download-images-from-a-website-using-puppeteer/#downloading-images-from-a-website
                const matches = /.(jpg|png|svg|gif)/.exec(response.url());
                if (matches && matches.length > 1) {
                    ext = matches[1];
                }

                let pin_url_id = request.url.split('/').filter(Boolean).pop()
                let id_ext = item.id + `.${ext}`
                filename = pin_url_id ?? id_ext;
            }

            // TODO: Prevent recursive folder creation
            // TODO: Prevent duplicate file names √

            /* Save image */
            // Save with file name or ID?

            let boardURLName = boardUrl[boardUrl.length - 1] === '/' ? boardUrl.split('/').filter(Boolean).pop() : boardUrl.split('/').pop();
            // Save image to store in it's board folder
            let boardImageStore = await KeyValueStore.open(boardURLName as string);
            // Save image to store as it's specific type (png, jpg, gif, etc.)
            await boardImageStore.setValue(`${filename}`, body, { contentType: `image/${ext}` });
            log.info("Saved image: " + filename + " to " + `${boardName}/${filename}`);
        }

    }

});
