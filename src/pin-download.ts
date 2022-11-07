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

        downloadAllSectionPins(pin_data.flatMap(i => i.sections), page, __dirname)
        downloadAllBoardPins(pin_data, page, __dirname)

        console.log("Done downloading images");

        await page.close()
    });
})();

async function downloadAllSectionPins(pin_data: Section[], page: Playwright.Page, __dirname: string) {
    for await (const section of pin_data) {

        if (section.sectionPins !== undefined && section.sectionPins.length === 0) {
            console.log("no sections");
            continue
        }

        console.log("Downloading section: " + section.sectionName, section.sectionLink);

        let total_pins = section.sectionPins.length;
        for await (const sectionPin of section.sectionPins) {
            console.log(`Downloading pin: ${section.sectionPins.indexOf(sectionPin) + 1} / ${total_pins}`);
            console.log(`Downloading pin: ${sectionPin.title} @ ${sectionPin.image_link}`);

            if (sectionPin.image_link == undefined || sectionPin.image_link == null || sectionPin.image_link == '') {

                console.warn(`Pin titled ${sectionPin.title} @ ${sectionPin.pin_link} has no image link `);
                if (sectionPin.is_video == true) {
                    console.warn(`becuase it is a video`);
                    continue;
                }
                continue;
            }
            console.log("Downloading pin: " + sectionPin.title);

            await page.goto(sectionPin.image_link);
            let img_name = sectionPin.title.substring(0, 69)
                .replace(/[^a-zA-Z0-9]/g, '_') + randomUUID() + '.png';

            let section_name = findImageSection(sectionPin.image_link, pin_data)?.sectionName ?? "";
            // PinterestCrawl/dist/../src/storage/section-name/image_name.jpg
            let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + section.sectionName + (section_name !== '' ? "/" + section_name : "") + '/' + img_name;
            let img_link = sectionPin.image_link;

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
                        return downloadImage(img_link, img_name);
                    },
                    [img_link, img_name]),
            ]);

            console.log(`Downloaded to: ${await download.path()}`);

            console.log(`Saving ${sectionPin.title} to: ${img_path}`);
            await download.saveAs(img_path);
            console.log(`Saved pin ${sectionPin.title} to: ${img_path}`);
            // downloadRecord.push({ pin_link: pin.pin_link, is_downloaded: true })
        }
    }
}


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

/*
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
    let img_name = pin.title.substring(0, 69)
        .replace(/[^a-zA-Z0-9]/g, '_') + randomUUID() + '.png'

    let section_name = findImageSection(pin.image_link, board.sections)?.sectionName ?? ""
    // PinterestCrawl/dist/../src/storage/board-name/image_name.jpg
    let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + board.boardName + (section_name !== '' ? "/" + section_name : "") + '/' + img_name
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
 */

async function downloadAllBoardPins(pin_data: Board[], page: Playwright.Page, __dirname: string) {
    for await (const board of pin_data) {

        console.log(board.boardLink);

        if (board.sections !== undefined && board.sections.length === 0) {
            console.log("no sections");
            continue
        }

        console.log("Downloading board: " + board.boardName, board.boardLink);

        let total_pins = board.boardPins.length;
        for await (const boardPin of board.boardPins) {
            console.log(`Downloading pin: ${board.boardPins.indexOf(boardPin) + 1} / ${total_pins}`);
            console.log(`Downloading pin: ${boardPin.title} @ ${boardPin.image_link}`);

            if (boardPin.image_link == undefined || boardPin.image_link == null || boardPin.image_link == '') {

                console.warn(`Pin titled ${boardPin.title} @ ${boardPin.pin_link} has no image link `);
                if (boardPin.is_video == true) {
                    console.warn(`becuase it is a video`);
                    continue;
                }
                continue;
            }
            console.log("Downloading pin: " + boardPin.title);

            await page.goto(boardPin.image_link);
            let img_name = boardPin.title.substring(0, 69)
                .replace(/[^a-zA-Z0-9]/g, '_') + randomUUID() + '.png';

            let board_name = findImageBoard(boardPin.image_link, pin_data)?.boardName ?? "";
            // PinterestCrawl/dist/../src/storage/board-name/image_name.jpg
            let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + board.boardName + "/" + img_name;
            let img_link = boardPin.image_link;

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
                        return downloadImage(img_link, img_name);
                    },
                    [img_link, img_name]),
            ]);

            console.log(`Downloaded to: ${await download.path()}`);

            console.log(`Saving ${boardPin.title} to: ${img_path}`);
            await download.saveAs(img_path);
            console.log(`Saved pin ${boardPin.title} to: ${img_path}`);
            // downloadRecord.push({ pin_link: pin.pin_link, is_downloaded: true })
        }

    }
}


