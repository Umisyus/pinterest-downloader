import * as playwright from 'playwright';
import { Locator } from 'playwright';
import { randomUUID } from 'crypto';
import type { Section, Board, Pin } from './test-json-parse.js';
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path';

import { autoScroll } from './pinterest-crawler.js';

const PINTEREST_DATA_DIR = './storage/pinterest-crawl-data/'
// Get path of script
let __dirname = path.dirname(process.argv[1])

const exclusion_file = await fs.readFile(__dirname + '/../src/' + 'exclusions.json', 'utf8').catch((err) => {
    console.error('Could not read exclusions', err)
})
interface Exclusion {
    boardLink?: string,
    boardName?: string,
    sectionName?: string,
    sectionLink?: string
}


let exclusions = JSON.parse(exclusion_file ?? '[]')

let my_exclusions = [...exclusions] as string[]

exclusions.push(my_exclusions)

// function checkExcluded(url, { boardLink, boardName, sectionLink, sectionName }: { boardLink?: string | URL, boardName?: string, sectionLink?: string | URL, sectionName?: string }) {
//     let excluded = false
//     for (let index = 0; index < exclude.length; index++) {
//         const exclusion = exclude[index];
//         if (exclusion.boardLink == boardLink) {
//             excluded = true
//             break
//         }
//         if (exclusion.boardName == boardName) {
//             excluded = true
//             break
//         }
//         if (exclusion.sectionLink == sectionLink) {
//             excluded = true
//             break
//         }
//         if (exclusion.sectionName == sectionName) {
//             excluded = true
//             break
//         }
//     }
//     return excluded


// }

function checkExcluded(url: string, exclusions: string[]): boolean {
    let excluded = false

    if (url === undefined) {
        return false
    }

    if (exclusions !== undefined &&
        Array.isArray(exclusions) &&
        exclusions.length === 0) {
        return false
    }

    exclusions = filterUndefinedNullEmptyString(exclusions);

    // return url in exclusions

    return exclusions.map((e) => {
        if (e !== undefined && url.includes(e) || url.endsWith(e) || url == e) {
            excluded = true
            console.log(`'${e}' IS IN ${url}`);
        }
        return excluded
    })
        // Get boolean value of excluded
        .reduce((acc, curr) => acc || curr)
}

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
export async function crawl_start(page: playwright.Page) {

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

    console.log({ board_links, section_links });

    let boards = JSON.parse(board_links) as string[]

    // If a baord is excluded, remove it from the list
    boards = boards.filter(b => checkExcluded(b, exclusions))

    for (let index = 0; index < boards.length; index++) {
        const boardLink = boards[index] as string;

        if (boardLink.includes("/pins")) {
            console.log(`Board ${boardLink} skipped.`);
            continue
        }

        console.log("Going to board: ", boardLink);

        await page.goto(boardLink);
        console.log("Went to board: ", boardLink);

        await page.waitForLoadState('networkidle');

        /* Sections */
        console.log("Getting sections...");

        let sections_json = await page.evaluate(board_sections)
        let sectionLinks: string[] = JSON.parse(sections_json)

        let parsedSections: Section[] = []

        if (!sectionLinks || sectionLinks.length == 0) {
            console.log("No sections found.");
        }

        if (sectionLinks.length > 0) {
            console.log(`Found ${sectionLinks.length} sections`);

            // If an excluded section exists (exclude is true), skip
            sectionLinks = sectionLinks.filter(sectionLink => checkExcluded(sectionLink, my_exclusions))

            for await (const sectionLink of sectionLinks) {
                // Start new page for each section
                let crawler_page = await page.context().newPage();
                await crawler_page.bringToFront()
                let [a, b, c, d, section_pins] = await Promise.all([
                    console.log("Going to section: ", sectionLink),
                    await crawler_page.goto(sectionLink),
                    console.log("Getting pins of section: ", sectionLink),
                    await crawler_page.waitForLoadState('domcontentloaded'),
                    await autoScroll(crawler_page),
                    await crawler_page.close(),
                ])

                let board_name = boardLink.split("/")[boardLink.split("/").length - 2]
                let section_name = sectionLink.split("/")[sectionLink.split("/").length - 2]

                parsedSections.push({ sectionName: section_name, boardLink, boardName: board_name, sectionLink, section_pins: section_pins as Pin[] } as Section)

                // why not save after crawling each section?
                try {
                    // Get the latest section
                    // let section_pins = parsedSections[parsedSections.length - 1] ?? []

                    // let board_name = boardLink.split("/")[boardLink.split("/").length - 2]
                    // let section_name = sectionLink.split("/")[sectionLink.split("/").length - 2]

                    // Stop saving sections on their own for now

                    // await save_to_file({
                    //     section: sectionLink,
                    //     boardLink,
                    //     sectionName: section_name,
                    //     sectionLink, section_pins
                    // } as Section,
                    //     { fileName: `${board_name}-${section_name}`, toDir: PINTEREST_DATA_DIR })
                    //     .then((fullFilePath) => console.log("Saved to file", fullFilePath))

                } catch (error) {
                    console.log("Error saving to file: ", error);
                }
            }


        }

        /* Pins */
        console.log(`Getting pins from board ${boardLink}`);

        let board_pins = await autoScroll(page);
        // let board_pins: any[] = []

        let board = {
            boardName: boardLink,
            boardLink,
            sections: parsedSections,
            board_pins: board_pins,
        } as Board


        console.log(board)
        console.log("Saving data to file...");

        await save_to_file(board, { fileName: board.boardName, addDate: true, randomized: true, toDir: PINTEREST_DATA_DIR })
            .then((fullFilePath) => console.log("Saved to file", fullFilePath))
            .catch(console.error)

    }

    console.log("closing browser");

    await page.close();
    await browser.close();

}

console.log("Closed.");

async function* iterate_locator(locator: Locator): AsyncGenerator<Locator> {
    for (let index = 0; index < await locator.count(); index++) {
        yield locator.nth(index)
    }
}

/* SAVE */
async function save_to_file(data: any, options?: { fileName?: string, addDate?: Boolean, randomized?: Boolean, toDir?: string }) {
    // let thisRandomUUID = randomUUID()

    let todays_date = () => {
        // https://stackoverflow.com/questions/2013255/how-to-get-year-month-day-from-a-date-object
        var dateObj = new Date();
        var month = dateObj.getUTCMonth() + 1; //months from 1-12
        var day = dateObj.getUTCDate();
        var year = dateObj.getUTCFullYear();

        return year + "-" + month + "-" + day;
    }

    // write results to json file
    // check directory exists

    let dirName = `./storage/pinterest-crawl-data/`
    let file = ""
    // .json
    file = `pinterest-crawl-data-${todays_date()}_${randomUUID()}`

    if (options) {
        if (options?.fileName) file = options.fileName
        if (options?.addDate) file = `${file}_${todays_date()}`
        if (options?.randomized) file = `${file}_${randomUUID()}`
        if (options?.toDir) dirName = options.toDir
    }

    file += `.json`

    console.log(`Test if folder ${dirName} already exists...`);

    if (await path_exists(dirName) == false) {
        fs.mkdir(dirName, { recursive: true });
    }

    let fullFilePath = path.join(dirName, file) ?? `${dirName}${file}`
    // write data to file, should append to container folder if it exists
    // Test if a file using the same name exists
    console.log(`Test if file ${fullFilePath} already exists...`);

    if (await path_exists(fullFilePath) == true) {
        // Append to file
        console.log(`File ${fullFilePath} already exists, appending to file...`);

        //  await fs.appendFile(fullFilePath, JSON.stringify(data))
    }
    else {
        console.log(`File ${fullFilePath} does not exist, creating file...`);
        await fs.writeFile(fullFilePath, JSON.stringify(data))
    }

    // Return full file path
    return path.resolve(fullFilePath)
}
async function path_exists(dir: string) {
    return existsSync(dir)
}


function filterUndefinedNullEmptyString(exclusions: string[]) {
    return exclusions.filter((i: string) => i !== undefined || i !== '');
}
