import { HttpCrawler, PlaywrightCrawler } from "crawlee";
import { launch_login } from "./crawler.js";
import fs from "fs";
import path from "path";

let __dirname = path.resolve(`${path.dirname(process.argv[1])}/../`)
    // Test in console
    // json.map(i=>i.board !== undefined ? i.board : null).filter(i=>i !== null && i !== undefined).map(i => i.section_pins ? ({ board: i.boardName, section_pins: [i.section_pins], pins: i.board_pins }) : null).filter(i => i !== null && i !== undefined)

// await launch_login().then(async () => {
let [...requests] = fs.readdirSync(__dirname + '/' + "storage/pinterest-crawl-data/", { withFileTypes: true })
    .map((file) => fs.readFileSync(file.isFile() ? __dirname + '/' + "storage/pinterest-crawl-data/" + file.name : file.name))
    .map((data) => JSON.parse(data.toString('utf-8')))
let links = requests
    .map(i => i.board !== undefined ? i.board.board_pins[1] : null)
    .filter(i => i !== null && i !== undefined)
    .map(i => i[1].image)

// Get image links from one board
//  json.map(i=>i.board !== undefined ? i.board.board_pins[1] : null).filter(i=>i !== null && i !== undefined).map(i=>i[1].image)
let crawler = new PlaywrightCrawler({ maxConcurrency: 10, persistCookiesPerSession: true });
crawler.addRequests(links);

let resp = crawler.run()


console.log(resp);

// })
