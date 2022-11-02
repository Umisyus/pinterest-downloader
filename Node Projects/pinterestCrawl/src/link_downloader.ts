import * as playwright from 'playwright';
import { Locator } from 'playwright';
import { randomUUID } from 'crypto';

import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path';

import { autoScroll } from './pinterest-crawler.js';

// Get path of script
let __dirname = path.dirname(process.argv[1])

// Read login credentials from file
let obj = (await fs.readFile(__dirname + '/../storage/login.json')).toString('utf8').trim()

let user = JSON.parse(obj).user
let pass = JSON.parse(obj).pass

const browser = await playwright.chromium
    .launchPersistentContext('./pinterest-download-data', {
        headless: false, devtools: true,
        // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    })

const page = await browser!.newPage();
await page.goto('https://pinterest.ca/login');

export async function launch_login() {

    // let cookies = await page.evaluate(() => document.cookie);
    // const closeModalBtnSelector = 'button[aria-label="close"]';

    if (await page.getByLabel('Email').count() > 0) {
        await page.getByLabel('Email').fill(user);
        await page.getByLabel('Password').fill(pass);
        await page.getByText('Log in').click();

        // Save signed-in state to 'storageState.json'.
        (await page.context()
            .storageState({ path: '../storage/storageState.json' })
            .then((s) => console.log("SAVED STORAGE STATE" + JSON.stringify(s)))
            .catch(err => console.error("FAILED TO SAVE STATE: " + err)));
    }
    return page
    // await page.close();
    // await browser.close();

}
export async function link_downloader(page: playwright.Page) {

    await page.goto("https://www.pinterest.ca/dracana96");

    await page.waitForTimeout(2000)

    let user_boards = () => {
        // @ts-ignore
        const $x = xp => {
            const snapshot = document.evaluate(
                xp, document, null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
            );
            return [...new Array(snapshot.snapshotLength)]
                .map((_, i) => snapshot.snapshotItem(i))
                ;
        };

        /* Use when logged in */
        function get_boards(boards_selector = "") {
            // Check if null or empty
            if (boards_selector == null || boards_selector == "")
                boards_selector = 'div[data-test-id="pwt-grid-item"]'

            // @ts-ignore
            let boards = Array.from(document.querySelectorAll(boards_selector))
            // @ts-ignore
            let links = [];
            // @ts-ignore
            links.push(...boards.map(i => i.querySelector('a')).map(i => i.href))

            // @ts-ignore
            console.log(links);

            // @ts-ignore
            return links
        }

        let boards = get_boards()

        // // @ts-ignore
        console.log(boards);

        return JSON.stringify(boards)
    }

    let board_sections = () => {
        function get_sections() {

            // @ts-ignore
            const $x = xp => {
                const snapshot = document.evaluate(
                    xp, document, null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                );
                return [...new Array(snapshot.snapshotLength)]
                    .map((_, i) => snapshot.snapshotItem(i))
                    ;
            };

            let sections = $x('*//div[starts-with(@data-test-id,"section")]')
            // @ts-ignore
            return sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')))
        }

        let sections = get_sections()

        console.log(sections);

        return JSON.stringify(sections)

    }

    let ops: any[] = [
        user_boards, board_sections

    ]
    let eval_ops = ops.map(i => page.evaluate(i))
    // Remove as unnecessary
    let [board_links, section_links]: any[] = await Promise.all([...eval_ops])
    board_links = board_links as IBoard
    interface IBoard {
        boards: string[]
    }
    console.log({ board_links, section_links });

    const boards = JSON.parse(board_links) as string[]

    for (let index = 0; index < boards.length; index++) {
        const boardName = boards[index] as string;

        if (boardName.includes("/pins")) {
            console.log(`Board ${boardName} skipped.`);

            continue
        }

        console.log("Going to board: ", boardName);

        await page.goto(boardName);
        console.log("Went to board: ", boardName);

        await page.waitForLoadState('networkidle');

        /* Sections */
        console.log("Getting sections...");

        let sections_json = await page.evaluate(board_sections)
        let sectionLinks: string[] = JSON.parse(sections_json)

        let parsedSections = []

        if (!sectionLinks || sectionLinks.length == 0) {
            console.log("No sections found.");
        }


        if (sectionLinks.length > 0) {
            console.log(`Found ${sectionLinks.length} sections`);
            // Start new page for each section

            for await (const section of sectionLinks as string[]) {
                let crawler_page = await page.context().newPage();
                await crawler_page.bringToFront()
                let [a, b, c, d, section_pins] = await Promise.all([
                    console.log("Going to section: ", section),
                    await crawler_page.goto(section),
                    console.log("Getting pins of section: ", section),
                    await crawler_page.waitForLoadState('domcontentloaded'),
                    // await autoScroll(crawler_page),
                    await crawler_page.close(),
                ])
                parsedSections.push({ section, section_pins })
            }

        }

        /* Pins */
        console.log(`Getting pins from board ${boardName}`);

        // let board_pins = await autoScroll(page);
        let board_pins: any[] = []

        let data = { board: {boardName, sections: parsedSections, board_pins: board_pins } }

        console.log(data)
        console.log("Saving data to file...");

        await saveToFile(data)

    }

    console.log("closing browser");

    await page.close();
    await browser.close();

}

console.log("Closed.");

async function* iterateLocator(locator: Locator): AsyncGenerator<Locator> {
    for (let index = 0; index < await locator.count(); index++) {
        yield locator.nth(index)
    }
}


/* Use when not logged in */
// export
function crawl(THRESHOLD = 100) {
    var chunks = new Set();
    let ii = 0
    // TODO: add username later.
    if (!THRESHOLD) THRESHOLD = 100

    // Crawl the page
    let i = 0;
    const pins_selector = "div[id^='boardfeed'] > div > div > div > div > div > div > div > div > a"

    console.info("IN CRAWLER FUNCTION");

    do {
        do {
            // Get current chunk of images
            let chunks_before = Array.from(document.querySelectorAll(pins_selector))

            // scroll down to load more images
            window.scrollBy(0, 100)
            //Add current chunk to set
            chunks_before.forEach(chunks.add, chunks)
            // Show progress
            console.info(chunks.size)
            i++
        } while (i < 100)
        ii++
    }
    while (ii < THRESHOLD)
    // get srcset from imgs
    // @ts-ignore
    let srcset = Array.from(chunks).map(x => x.href)
    return srcset
}
function startCrawl() {
    // @ts-ignore
    let pins = crawl(2000)

    console.log(pins);

    // @ts-ignore
    return pins
}
async function saveToFile(data: any) {
    let todays_date = () => {
        // https://stackoverflow.com/questions/2013255/how-to-get-year-month-day-from-a-date-object
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();

        return year + "-" + month + "-" + day;
    }

    /* SAVE */
    // write results to json file
    // check directory exists
    let dir = `./storage/pinterest-crawl-data/`
    if (await pathExists(dir) == false) {
        fs.mkdir(dir, { recursive: true });
    }

    // write to file
    let file = `${dir}pinterest.json`
    await fs.writeFile(file, JSON.stringify(data, null, 2))
    await fs.writeFile(`${dir}results-${todays_date()}_${randomUUID()}.json`, JSON.stringify(data))
}
async function pathExists(dir: string) {
    return existsSync(dir)
}


