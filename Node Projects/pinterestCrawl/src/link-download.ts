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
            boardName: data.board.boardName, board_pins: {
                pins: data.board.board_pins.flatMap((i: any) => i[1].image)
            }
        }
    } else

        if (data.section !== undefined) {
            return {section: data.section, section_pins: data.section_pins.flatMap((i: any) => i[1].image)}
            // .map((p: { section: string; section_pins: string[]; }) =>
            //     ({ section: p.section, section_pins: p.section_pins.flatMap((i: any) => i)[1].image }))

        } else

            if (data !== undefined && !data.section && !data.board) {
                // return all objects from array
            }

    if (data.board) {
        // return all objects from array
        return data.map((p: { section: string; section_pins: string[]; }) =>
            ({ section: p.section, section_pins: p.section_pins.flatMap((i: string) => i) }))
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


// let links = Convert.toPinterestData()

links.map(i => i.toString())
// Get image links from one board
//  json.map(i=>i.board !== undefined ? i.board.board_pins[1] : null).filter(i=>i !== null && i !== undefined).map(i=>i[1].image)
let crawler = new PlaywrightCrawler({ maxConcurrency: 10, persistCookiesPerSession: true });
crawler.addRequests(links);

let resp = crawler.run()


console.log(resp);

// })
