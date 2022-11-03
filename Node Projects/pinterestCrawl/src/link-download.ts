import { PlaywrightCrawler } from "crawlee";
import fs from "fs";
import path from "path";


let __dirname = path.resolve(`${path.dirname(process.argv[1])}/../`)
// Test in console
// json.map(i=>i.board !== undefined ? i.board : null).filter(i=>i !== null && i !== undefined).map(i => i.section_pins ? ({ board: i.boardName, section_pins: [i.section_pins], pins: i.board_pins }) : null).filter(i => i !== null && i !== undefined)

// await launch_login().then(async () => {
let [...pin_data] = fs.readdirSync(__dirname + '/' + "storage/pinterest-crawl-data/", { withFileTypes: true })
    .map((file) => fs.readFileSync(file.isFile() ? __dirname + '/' + "storage/pinterest-crawl-data/" + file.name : file.name))
    .map((data) => JSON.parse(data.toString('utf-8')))

// let [...requests] = fs.readdirSync(__dirname + '/' + "storage/pinterest-crawl-data/", { withFileTypes: true })
//     .map((file) => fs.readFileSync(file.isFile() ? __dirname + '/' + "storage/pinterest-crawl-data/" + file.name : file.name))
//     .map((data) => (data.toString('utf-8')))

// parse pin_data
let [...pin_data_parsed] = pin_data.map((data) => {
    if (data.board !== undefined) {
        return {
            boardName: data.board.boardName,
            board_pins: data.board.board_pins.flatMap((i: any) => i[1].image)

        }
    } else

        if (data.section !== undefined) {
            return { section: data.section, section_pins: data.section_pins.flatMap((i: any) => i[1].image) }
            // .map((p: { section: string; section_pins: string[]; }) =>
            //     ({ section: p.section, section_pins: p.section_pins.flatMap((i: any) => i)[1].image }))

        }

    if (data.board) {
        // return all objects from array
        return data.map((p: { boardName: string; board_pins: string[]; }) =>
            ({ board: p.boardName, board_pins: p.board_pins.flatMap((i: string) => i[1]) }))
    }
})

JSON.stringify(pin_data_parsed)
let all_sections: Section[] = pin_data_parsed.filter((i: any) => i.section !== undefined)
let all_boards: Board[] = pin_data_parsed.filter((i: any) => i.board !== undefined)

interface Section {
    section: string,
    section_pins: string[]
}
interface Board {
    boardName: string,
    board_pins: string[]
}

function findImageBoard(img_link: string, pin_data: Board[]) {
    let board = pin_data
        .map((i: Board) => i);
    let found = board.find((i: Board) =>
        i.board_pins.find(i => i === img_link));

    return found ?? null
}

function findImageSection(img_link: string, pin_data: Section[]) {
    let section = pin_data
        .map((i: Section) => i);
    let found = section.find((i: Section) =>
        i.section_pins.find(i => i === img_link));

    return found ?? null
}


let board_links = pin_data_parsed.map(i => i.board_pins)
    .filter(i => i !== '' && i !== null && i !== undefined).flatMap(i => i)
let section_links = pin_data_parsed.map(i => i.section_pins)
    .filter(i => i !== '' && i !== null && i !== undefined).flatMap(i => i)

// Map each section to a board

let links: string[] = board_links.concat(section_links)
    .filter(i => i !== '' && i !== null && i !== undefined)

// let arr = links.map((i) =>
// ({
//     data: findImageBoard(i, all_boards)
//         ?? findImageSection(i, all_sections)
//         ?? "Not Found"
// }))

const browser_downloads_folder = "./storage/pinterest-image-downloads";
const browser_data_folder = "../pinterest-download-data";
// links.map(i => i.toString())
// Get image links from one board
//  json.map(i=>i.board !== undefined ? i.board.board_pins[1] : null).filter(i=>i !== null && i !== undefined).map(i=>i[1].image)
let crawler = new PlaywrightCrawler(
    // { useSessionPool: true, sessionPoolOptions: { maxPoolSize: 10 }, maxConcurrency: 10, persistCookiesPerSession: true }
    {
        maxConcurrency: 3,
        maxRequestsPerMinute: 10,
        // maxRequestsPerCrawl: 2000,
        launchContext: {
            userDataDir: browser_data_folder,
            launchOptions: {
                headless: true,
                // Downalod images to 'Node Projects/storage/pinterest-crawl-data' folder
                downloadsPath: browser_downloads_folder
            }
        },
        //@ts-ignore
        requestHandler: async ({ request, response, page }) => {

            // Detect orignal image link, find board name and save image to folder

            console.log(`Processing: ${request.url}`)
            await page.goto(request.url, { waitUntil: "networkidle" });

            let fileName = ""
            let board_section_name = ""
            let board = findImageBoard(request.url, all_boards)?.boardName
            let section = findImageSection(request.url, all_sections)?.section

            if (board !== undefined) {
                // Extract board name from url
                let boardLink = board.split('/')
                let boardName = boardLink[boardLink.length - 1]
                board_section_name += boardName
            }
            if (section !== undefined) {
                // Extract section name from url
                let sectionLink = section.split('/')
                let sectionName = sectionLink[sectionLink.length - 1]
                board_section_name += sectionName
            }

            fileName = "pinterest-image_" + board_section_name

            let [download] = await Promise.all([
                page.waitForEvent('download'),
                page.evaluate((fileName) => {
                    const url = window.location.href;
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    // the filename you want
                    a.download = `${fileName}.png`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                }, fileName)
            ]);

            console.log(`Downloading: ${request.url}`);
            console.log(`Downloading: ${fileName}`);

            console.log(`Downloaded to: ${await download.path()}`);
            // Wait
            // await page.waitForTimeout(5000)
            // page.on('download', () => { })
        },
    });

// crawler.addRequests(links);

let resp = await crawler.run(links, { waitForAllRequestsToBeAdded: true })


console.log(resp);

// })
