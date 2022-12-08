import { Dataset, createPlaywrightRouter } from 'crawlee';

import fs from 'fs';
import { ds } from './main.js';
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
        let url_title = request.url.split('/')[request.url.split('/').length - 1];
        let item = ds.items.find((item: any) => item.images.orig.url === request.url);
        let innerFolder = '';
        if (item) {
            const { grid_title, board } = item as any;
            let boardName = board.name;
            innerFolder = boardName + '/';
            if (grid_title) {
                filename = grid_title.replace(/[^a-zA-Z0-9]|\\+\//g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/, '')
            } else {

                filename = url_title;
            }
        }
        // TODO: Prevent recursive folder creation
        // TODO: Prevent duplicate file names
        folderPath = baseFolder + innerFolder;
        // Note: This is a checking if the FOLDER EXISTS, if not, create it
        if (!fs.existsSync(folderPath)) {
            fs.mkdir(folderPath, () => log.info("Created folder: " + folderPath));
        }

        // Save the file with board name and pin title or url id
        let file = fs.createWriteStream(folderPath + filename)

        file.write(body ?? text);

        file.on('finish', async () => {
            log.info('Downloaded the page... ' + request.url);
            // report.pushData({ url: request.url, completed: true })

            file.close();
        })
        file.on('error', (err: Error) => {
            log.error(err.message)
            // report.pushData({ url: request.url, completed: false })

        });
    }

});
