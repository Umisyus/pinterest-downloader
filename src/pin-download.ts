import { launch_login } from "./crawler.js";
import * as Playwright from "playwright";
// import { findImageBoard, findImageSection } from "./link-download.js";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { Board, Pin, Section } from "./types.js";
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

    interface DownloadRecord {
        pin_link: string,
        is_downloaded: boolean,
    }

    let downloadRecord: DownloadRecord[] = []

    let [...pin_data]: Board[] = fs.readdirSync(dir, { withFileTypes: true })
        .map((file) => fs.readFileSync(dir + "/" + file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))

    const options = { zip: true }

    await launch_login().then(async (page: Playwright.Page) => {

        // await getBoardPins(pin_data, page, dir);
        // zip.folder("pinterest-boards");

        // let s = pin_data.flatMap(b => b.sections)
        // await getSectionPins(s, page, dir);

        // // boards.forEach(async b => {
        // //     let [mydownload, board_name, section_name, pin_title] = [(await b)?.value, (await b)?.value?.board_name, (await b)?.value?.section_name, (await b)?.value?.pin_title]
        // // })

        const zip_name = 'imgs.zip';
        // Filter pin_data to only include pins that are valid
        let valid_pins = pin_data.filter(b => b.boardPins.filter(p => p.is_video == false))[0]
        for (let index = 0; index < [valid_pins].length; index++) {
            const data = pin_data[index];

            await dlPinBoard(data, page)

        }

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
        await page.context().close();
    });
})();

async function getBoardPins(board: Board[], page: Playwright.Page, __dirname: string) {
    for await (const b of board) {
        downloadPins(b.boardPins, page, __dirname, b.boardName, "")
    }

}

async function getSectionPins(section: Section[], page: Playwright.Page, __dirname: string) {

    for await (const s of section) {
        downloadPins(s.sectionPins, page, __dirname, s.boardName, s.sectionName)
    }

}

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
    let fileName = img_name ?? download.suggestedFilename();
    let data = (await fs.promises.readFile(img_path));
    let stream = await download.createReadStream();
    return { img_path, fileName: img_fileName, data, stream };
}

async function downloadPins(pin_data: Pin[], page: Playwright.Page, __dirname: string, board_name: string, section_name: string) {

    for await (const pin of pin_data) {

        console.log(pin.image_link);

        console.log("Downloading pin: " + pin.pin_link);

        let total_pins = pin_data.length;

        console.log(`Downloading pin: ${pin_data.indexOf(pin) + 1} / ${total_pins}` + ` (from ${section_name == "" ? board_name : board_name + "/" + section_name})`);
        console.log(`Downloading pin: ${pin.title} @ ${pin.image_link}`);

        let pin_title = pin.title.trim()

        if (pin.image_link == undefined || pin.image_link == null || pin.image_link == '') {


            console.warn(`Pin titled ${pin_title} @ ${pin.pin_link} has no image link `);
            if (pin.is_video == true) {
                console.warn(`becuase it is a video`);
                continue;
            }
            continue;
        }

        console.log("Downloading pin: " + pin_title.replace('\s{2,}', ' '));

        await page.goto(pin.image_link);

        // Format the title so we can save without any issues
        let img_name = (pin_title.substring(0, 69) + "_")
            .replace(/[^a-zA-Z0-9]/g, '_').replace('_{2,}', '_');

        let bn: string = (board_name ?? "")
        let sn: string = (section_name ?? "")
        // PinterestCrawl/dist/../src/storage/board-name/[section-name]/image_name.png
        let img_path = __dirname + '/' + bn + "/" + sn + img_name + '.png';
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
        let data = (await download.createReadStream())?.read()
        zip.file((img_path), (data ?? ""));

    }
}


// let files = [
//     { title: "IMG 1", data: randomUUID() },
//     { title: "IMG 2", data: randomUUID() },
//     { title: "IMG 3", data: randomUUID() },
// ]
// let section_name = "Section 1";

// function zipData(boardName: string, sectionName: string, files: any[]) {
//     var zip = new JSZip();

//     // Create a folder for the board
//     let imgs = zip.folder(boardName)!;
//     // Add the files to the board folder
//     files.forEach((file) => {
//         imgs.file(file.title, file.data);
//     })
//     // Create a folder for the section
//     if (sectionName) {
//         imgs = imgs.folder(sectionName)!;
//     }
//     console.log("Adding files to zip");
//     // Add files to the section folder
//     files.forEach(file => {
//         imgs.file(file.title, file.data);
//     });

//     const zip_name = 'imgs.zip';

//     console.log("Writing zip to file");
//     zip
//         .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
//         .pipe(fs.createWriteStream(zip_name))
//         .on('finish', function () {
//             // JSZip generates a readable stream with a "end" event,
//             // but is piped here in a writable stream which emits a "finish" event.
//             console.log(`${zip_name} written.`);
//         });
// }

// var fs = require("fs");
// var JSZip = require("jszip");

// var zip = new JSZip();
// // zip.file("file", content);
// // ... and other manipulations

// zip
// .generateNodeStream({type:'nodebuffer',streamFiles:true})
// .pipe(fs.createWriteStream('out.zip'))
// .on('finish', function () {
//     // JSZip generates a readable stream with a "end" event,
//     // but is piped here in a writable stream which emits a "finish" event.
//     console.log("out.zip written.");
// });


// async function downloadAllSectionPins(pin_data: Section[], page: Playwright.Page, __dirname: string) {
//     for await (const section of pin_data) {

//         if (section.sectionPins !== undefined && section.sectionPins.length === 0) {
//             console.log("no sections");
//             continue
//         }

//         console.log("Downloading section: " + section.sectionName, section.sectionLink);

//         let total_pins = section.sectionPins.length;
//         for await (const sectionPin of section.sectionPins) {
//             console.log(`Downloading pin: ${section.sectionPins.indexOf(sectionPin) + 1} / ${total_pins}`);
//             console.log(`Downloading pin: ${sectionPin.title} @ ${sectionPin.image_link}`);

//             if (sectionPin.image_link == undefined || sectionPin.image_link == null || sectionPin.image_link == '') {

//                 console.warn(`Pin titled ${sectionPin.title} @ ${sectionPin.pin_link} has no image link `);
//                 if (sectionPin.is_video == true) {
//                     console.warn(`becuase it is a video`);
//                     continue;
//                 }
//                 continue;
//             }
//             console.log("Downloading pin: " + sectionPin.title);

//             await page.goto(sectionPin.image_link);
//             let img_name = sectionPin.title.substring(0, 69)
//                 .replace(/[^a-zA-Z0-9]/g, '_') + randomUUID() + '.png';

//             let section_name = findImageSection(sectionPin.image_link, pin_data)?.sectionName ?? "";
//             // PinterestCrawl/dist/../src/storage/section-name/image_name.jpg
//             let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + section.sectionName + (section_name !== '' ? "/" + section_name : "") + '/' + img_name;
//             let img_link = sectionPin.image_link;

//             let [download] = await Promise.all([
//                 page.waitForEvent('download'),
//                 page.evaluate(
//                     ([img_link, img_name]) => {
//                         // @ts-ignore
//                         function downloadImage(url, fileName) {
//                             let a = document.createElement("a");
//                             a.href = url ?? window.location.href;
//                             a.download = fileName;
//                             document.body.appendChild(a);
//                             a.click();
//                             document.body.removeChild(a);
//                         };
//                         // @ts-ignore
//                         return downloadImage(img_link, img_name);
//                     },
//                     [img_link, img_name]),
//             ]);

//             console.log(`Downloaded to: ${await download.path()}`);

//             console.log(`Saving ${sectionPin.title} to: ${img_path}`);
//             // await download.saveAs(img_path);
//             console.log(`Saved pin ${sectionPin.title} to: ${img_path}`);
//             // downloadRecord.push({ pin_link: pin.pin_link, is_downloaded: true })
//         }
//     }
// }

// async function downloadAllBoardPins(pin_data: Board[], page: Playwright.Page, __dirname: string) {
//     for await (const board of pin_data) {

//         console.log(board.boardLink);

//         if (board.sections !== undefined && board.sections.length === 0) {
//             console.log("no sections");
//             continue
//         }

//         console.log("Downloading board: " + board.boardName, board.boardLink);

//         let total_pins = board.boardPins.length;
//         for await (const boardPin of board.boardPins) {
//             console.log(`Downloading pin: ${board.boardPins.indexOf(boardPin) + 1} / ${total_pins}`);
//             console.log(`Downloading pin: ${boardPin.title} @ ${boardPin.image_link}`);

//             if (boardPin.image_link == undefined || boardPin.image_link == null || boardPin.image_link == '') {

//                 console.warn(`Pin titled ${boardPin.title} @ ${boardPin.pin_link} has no image link `);
//                 if (boardPin.is_video == true) {
//                     console.warn(`becuase it is a video`);
//                     continue;
//                 }
//                 continue;
//             }
//             console.log("Downloading pin: " + boardPin.title);

//             await page.goto(boardPin.image_link);
//             let img_name = boardPin.title.substring(0, 69)
//                 .replace(/[^a-zA-Z0-9]/g, '_') + randomUUID() + '.png';

//             let board_name = findImageBoard(boardPin.image_link, pin_data)?.boardName ?? "";
//             // PinterestCrawl/dist/../src/storage/board-name/image_name.jpg
//             let img_path = __dirname + '/' + "../" + "src/" + "storage/pinterest-images/" + board.boardName + "/" + img_name;
//             let img_link = boardPin.image_link;

//             // May or may not work
//             let [download] = await Promise.all([
//                 page.waitForEvent('download'),
//                 page.evaluate(
//                     ([img_link, img_name]) => {
//                         // @ts-ignore
//                         function downloadImage(url, fileName) {
//                             let a = document.createElement("a");
//                             a.href = url ?? window.location.href;
//                             a.download = fileName;
//                             document.body.appendChild(a);
//                             a.click();
//                             document.body.removeChild(a);
//                         };
//                         // @ts-ignore
//                         return downloadImage(img_link, img_name);
//                     },
//                     [img_link, img_name]),
//             ]);

//             console.log(`Downloaded to: ${await download.path()}`);

//             console.log(`Saving ${boardPin.title} to: ${img_path}`);
//             // await download.saveAs(img_path);
//             console.log(`Saved pin ${boardPin.title} to: ${img_path}`);
//             // downloadRecord.push({ pin_link: pin.pin_link, is_downloaded: true })
//         }

//     }
// }


// function findImageBoard(img_link: string, pin_data: Board[]) {
//     let board = pin_data
//         .map((i) => i);
//     let found = board.find((i) => i.boardPins.find(i => i.image_link === img_link));
//     return found ?? null;
// }

// function findImageSection(img_link: string, pin_data: Section[]) {
//     let section = pin_data
//         .filter((i) => i !== undefined);
//     let found = section.find((i) => i.sectionPins.find(i => i.image_link === img_link));
//     return found ?? null;
// }
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







