import { launch_login } from "./crawler.js";
import * as Playwright from "playwright";
import fs from "fs";
import path from "path";
import { Board, Pin } from "./types.js";
import { randomUUID } from 'crypto';
import JSZip from 'jszip';

/*
#TODO: Add a way to find pins already downloaded
#TODO: Add a way to zip downloaded pins

*/
let zip = new JSZip();

let __dirname = path.dirname(process.argv[1]);

(async () => {
    let PINTEREST_DATA_DIR = path.resolve(`${__dirname + '/' + '..' + '/' + 'src' + '/' + 'storage/pinterest-boards/'}`)

    let dir = path.resolve(`${PINTEREST_DATA_DIR}/`)
    console.log(dir);



    let [...pin_data]: Board[] = fs.readdirSync(dir, { withFileTypes: true })
        .map((file) => fs.readFileSync(dir + "/" + file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))


    await launch_login().then(async (page: Playwright.Page) => {
        // Filter pin_data to only include pins that are valid
        if (pin_data.length == 0) {
            console.log("No boards found");
            return page
        }

        // Doesn't work
        let valid_pins = pin_data.filter(b => b.boardPins.filter(p => p.is_video == false))
        // Get username from board link
        let bl = valid_pins[0].boardLink

        for (let index = 0; index < valid_pins.length; index++) {
            const data = pin_data[index];

            await dlPinBoard(data, page)

        }
        const un = bl.split('/')[bl.split('/').length - 3] ?? "user";
        const zip_name = `${un}-pins.zip`;
        console.log("Writing zip to file");
        zip
            .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(zip_name))
            .on('finish', function () {
                // JSZip generates a readable stream with a "end" event,
                // but is piped here in a writable stream which emits a "finish" event.
                console.log(`${zip_name} written.`);
            });

        console.log("Done downloading images");

        return page;

    }).then(async (page) => {
        console.log("Closing browser");

        await page.context().close();
    });
    console.log("Exiting...");

})();

async function dlPinBoard(board: Board, page: Playwright.Page) {
    zip.folder(board.boardName);

    for (let index = 0; index < board.boardPins.length; index++) {
        const pin = board.boardPins[index];

        let { data, fileName, stream } = await dlPin(pin, page, board.boardName, "");

        // Add images to board folder
        // Board folder is the root folder
        let zipped_image_path = `${board.boardName}/${fileName}`
        if (data !== "" || stream !== "") {
            zip.file((zipped_image_path), (stream ?? data ?? ""));
            console.log("Added file to zip");
        }
    }
    for (let index = 0; index < board.sections.length; index++) {
        const section = board.sections[index];
        // Create section folder
        // zip = zip.folder(section.sectionName)!;
        for (let index = 0; index < section.sectionPins.length; index++) {
            const pin = section.sectionPins[index];
            let { fileName, data, stream } = await dlPin(pin, page, board.boardName, section.sectionName);
            // Add image to folder, board folder is the root folder
            let zipped_image_path = `${board.boardName}/${section.sectionName}/${fileName}`

            if (data !== "" || stream !== "") {
                zip.file((zipped_image_path), (stream ?? data ?? ""));
                console.log("Added file to zip");
            }
        }
    }
    console.log("Done downloading entire board");

}

async function dlPin(pin: Pin, page: Playwright.Page, boardName: string, sectionName: string) {

    if (pin.image_link == "" || pin.is_video == true) {
        console.warn(`No Link for ${pin.title}`);
        return { fileName: "", data: "", stream: "" };
    }
    console.log(pin.image_link);

    console.log(`Downloading pin: ${pin.title} @ ${pin.image_link}`);

    let pin_title = pin.title.trim();

    if (pin.image_link == undefined || pin.image_link == null || pin.image_link == '') {


        console.warn(`Pin titled ${pin_title} @ ${pin.pin_link} has no image link `);
        return { fileName: "", data: "", stream: "" };
    }

    console.log("Downloading pin: " + pin_title.replace('\s{2,}', ' '));

    await page.waitForTimeout(3000);
    await page.goto(pin.image_link);

    // Format the title so we can save without any issues
    let img_name = (pin_title.substring(0, 69))
        .replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');

    let bn: string = boardName;
    let sn: string = sectionName;
    // PinterestCrawl/dist/../src/storage/board-name/[section-name]/image_name.png
    let rand = (img_name.toLocaleLowerCase().includes("unknown".toLocaleLowerCase()) ? randomUUID() : "") ?? "";
    let img_fileName = `${img_name}_${rand}.png`;
    let img_path = __dirname + '/' + bn + "/" + sn + img_fileName + '.png';
    let img_link = pin.image_link;

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

    console.log(`Saved pin ${pin.title} to: ${img_path}`);
    await download.saveAs(img_path);
    let data = (await fs.promises.readFile(img_path));
    let stream = await download.createReadStream();
    return { img_path, fileName: img_fileName, data, stream };
}
