import { PlaywrightCrawler } from "crawlee";
import fs from "fs";
import path from "path";
import { Convert } from './types.js'

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

        } else

            if (data !== undefined && !data.section && !data.board) {
                // return all objects from array
            }

    if (data.board) {
        // return all objects from array
        return data.map((p: { boardName: string; board_pins: string[]; }) =>
            ({ board: p.boardName, board_pins: p.board_pins.flatMap((i: string) => i[1]) }))
    }
})

JSON.stringify(pin_data_parsed)
// Convert.toPinterestDatum(merged)

// console.log(JSON.stringify(merged));

// let links = requests
// .map(i => i.board !== undefined ? i.board.board_pins[1] : null)
// .filter(i => i !== null && i !== undefined)
// .map(i => i[1].image)
// let links = (requests[0]).board.board_pins.map(i => i[1])


let board_links = pin_data_parsed.map(i => i.board_pins)
    .filter(i => i !== '' && i !== null && i !== undefined).flatMap(i => i)
let section_links = pin_data_parsed.map(i => i.section_pins)
    .filter(i => i !== '' && i !== null && i !== undefined).flatMap(i => i)

// Map each section to a board

let links = board_links.concat(section_links)
    .filter(i => i !== '' && i !== null && i !== undefined)

// links.map(i => i.toString())
// Get image links from one board
//  json.map(i=>i.board !== undefined ? i.board.board_pins[1] : null).filter(i=>i !== null && i !== undefined).map(i=>i[1].image)
let crawler = new PlaywrightCrawler(
    // { useSessionPool: true, sessionPoolOptions: { maxPoolSize: 10 }, maxConcurrency: 10, persistCookiesPerSession: true }
    {
        launchContext: {
            userDataDir: "../pinterest-download-data",
            launchOptions: {
                headless: false,
                downloadsPath: "../storage/pinterest-image-downloads"
            }
        },
        requestHandler: async ({ request, response, page }) => {
            console.log({ request, response, page });
            console.log(`Processing: ${request.url}`)
            await page.goto(request.url, { waitUntil: "networkidle" });

            let [download] = await Promise.all([
                page.waitForEvent('download'),
                page.evaluate(() => {
                    const url = window.location.href;
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    // the filename you want
                    a.download = 'pinterest-board-image';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
            ]);

            console.log(`Downloaded: ${request.url}`);
            console.log(`Downloaded: ${await download.path()}`);

            // page.on('download', () => { })
        },
    });

// crawler.addRequests(links);

let resp = await crawler.run(links)

console.log(resp);

// })
