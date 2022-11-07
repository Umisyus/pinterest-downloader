import { launch_login } from "./crawler.js";
import * as Playwright from "playwright";
// import { findImageBoard, findImageSection } from "./link-download.js";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { Board, Section } from "./types.js";
import { randomUUID } from 'crypto';

(async () => {
    let __dirname = dirname(process.argv[1])
    let PINTEREST_DATA_DIR = path.resolve(`${__dirname + '/' + '..' + '/' + 'src' + '/' + 'storage/pinterest-boards/'}`)

    let dir = path.resolve(`${PINTEREST_DATA_DIR}/`)
    console.log(dir);

    let [...pin_data]: Board[] = fs.readdirSync(dir, { withFileTypes: true })
        .map((file) => fs.readFileSync(dir + "/" + file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))


    await launch_login().then(async (page: Playwright.Page) => {

        for await (const board of pin_data) {
            let boardPins = board.boardPins

            console.log(board.boardLink);

            for await (const pin of boardPins) {
                await page.goto(pin.image_link as string)
                let img_name = pin.title
                // PinterestCrawl/dist/../src/storage/board-name/image_name.jpg
                let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + board.boardName + '/' + img_name + randomUUID()
                let img_link = pin.image_link

                // May or may not work
                let [download] = await Promise.all([
                    page.waitForEvent('download'),
                    page.evaluate(
                        ([img_link, img_name]) => {
                            // @ts-ignore
                            function downloadImage(url, fileName) {
                                let a = document.createElement("a");
                                a.href = url ?? window.location.href;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            };
                            // @ts-ignore
                            return downloadImage(img_link, img_name)
                        },
                        [img_link, img_name]),

                ])

                console.log(`Downloaded to: ${await download.path()}`);

                console.log(`Saving to: ${img_path}`);
                await download.saveAs(img_path)
            }
        }

        // let image_board = findImageBoard('', pin_data)
        // const sections = [...pin_data.map(i => i.sections)].flat();
        // let image_section = findImageSection('', sections)

        // sections.forEach(async (section: Section) => {
        //     let pinTitle = (section.sectionPins.find(i => i.image_link === ''))
        //     if (pinTitle) {
        //         console.log(pinTitle)
        //     }

        //     await Promise.all([
        //         page.goto(""),
        //         page.waitForLoadState(),
        //         downloadImage(section.sectionLink, pinTitle?.title ?? "pinterest_pin_")
        //     ]);
        // });
    });
})();
// @ts-ignore
function downloadImage(url, fileName) {
    let a = document.createElement("a");
    a.href = url ?? window.location.href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
