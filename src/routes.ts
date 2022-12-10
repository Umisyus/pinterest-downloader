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
        // EX. URL: *pinterest-pin-id[.png,.jpg,.webp]
        let item = imageset.find((item: any) => item.images.orig.url === request.url);

        let innerFolder = '';
        if (item) {
            const { grid_title, board } = item as any;
            let boardName = board.name;
            innerFolder = boardName + '/';
            if (grid_title) {
                filename = grid_title
                    .trim().slice(0, 69)
                    .replace(/[^a-zA-Z0-9]|\\+\//g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/, '') + '.png'
            } else {
                let id = item.id + '.png'
                filename = request.url.split('/')?.pop() ?? id;
            }

            // TODO: Prevent recursive folder creation
            // TODO: Prevent duplicate file names √
            folderPath = baseFolder + innerFolder;
            // Note: This is a checking if the FOLDER EXISTS, if not, create it
            if (!fs.existsSync(folderPath)) {
                fs.mkdir(folderPath, () => log.info("Created folder: " + folderPath));
            }

            /* Save image */
            // Save with file name or ID?

            await imageKeyValueStore.setValue(filename, body, { contentType: 'image/png' });
            log.info("Saved image: " + filename);
        }

    }

});
