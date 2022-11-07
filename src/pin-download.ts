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

    interface DownloadRecord {
        pin_link: string,
        is_downloaded: boolean,
    }

    let downloadRecord: DownloadRecord[] = []

    let [...pin_data]: Board[] = fs.readdirSync(dir, { withFileTypes: true })
        .map((file) => fs.readFileSync(dir + "/" + file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))


    await launch_login().then(async (page: Playwright.Page) => {

        for await (const board of pin_data) {
            let boardPins = board.boardPins

            console.log(board.boardLink);

            for await (const pin of boardPins) {
                if (pin.image_link == undefined || pin.image_link == null || pin.image_link == '') {

                    console.log(`Pin titled ${pin.title} @ ${pin.pin_link} has no image link `);
                    if (pin.is_video == true) {
                        console.log(`becuase it is a video`);
                        continue
                    }
                    continue
                }

                await page.goto(pin.image_link)
                let img_name = pin.title
                let section_name = findImageSection(pin.image_link, board.sections)?.sectionName ?? ""
                // PinterestCrawl/dist/../src/storage/board-name/image_name.jpg
                let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + board.boardName + (section_name !== '' ? "/" + section_name : "") + '/' + img_name + randomUUID()
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

                console.log(`Saving ${pin.title} to: ${img_path}`);
                await download.saveAs(img_path)
                console.log(`Saved pin ${pin.title} to: ${img_path}`);
                // downloadRecord.push({ pin_link: pin.pin_link, is_downloaded: true })
            }
        }

    });
})();

function findImageBoard(img_link: string, pin_data: Board[]) {
    let board = pin_data
        .map((i) => i);
    let found = board.find((i) => i.boardPins.find(i => i.image_link === img_link));
    return found ?? null;
}
function findImageSection(img_link: string, pin_data: Section[]) {
    let section = pin_data
        .filter((i) => i !== undefined);
    let found = section.find((i) => i.sectionPins.find(i => i.image_link === img_link));
    return found ?? null;
}
