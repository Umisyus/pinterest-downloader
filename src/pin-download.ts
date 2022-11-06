import { launch_login } from "./crawler.js";
import * as Playwright from "playwright";
// import { findImageBoard, findImageSection } from "./link-download.js";
import fs from "fs";
import { dirname } from "path";
import { Board, Section } from "./types.js";

(async () => {
    let __dirname = dirname(process.argv[1])

    let [...pin_data]: Board[] = fs.readdirSync(__dirname + '/' + '../' + "storage/pinterest-crawl-data/", { withFileTypes: true })
        .map((file) => fs.readFileSync(__dirname + '/' + '../' + "storage/pinterest-crawl-data/" + file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))


    await launch_login().then(async (page: Playwright.Page) => {

        for await (const board of pin_data) {
            let boardPins = board.boardPins

            console.log(board.boardLink);

            for await (const pin of boardPins) {
                await page.goto(pin.image_link)
                let img_name = pin.title
                let img_path = __dirname + '/' + "storage/pinterest-crawl-data/" + board.boardName + '/' + img_name
                let img_link = pin.image_link

                // May or may not work
                let [download] = await Promise.all([
                    page.waitForEvent('download'),
                    page.evaluate(([img_link, img_name]) => downloadImage(img_link, img_name),
                        [downloadImage, img_link, img_name]),
                ])

                console.log(`Downloaded to: ${download.path()}`);

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
