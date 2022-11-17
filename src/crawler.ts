import * as Playwright from 'playwright';
import { Browser, Locator } from 'playwright';
import { randomUUID } from 'crypto';
import type { Section, Board, Pin } from './types';
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path';
import { SELECTORS, CONSTANTS } from "./selectors_constants.js"

let PINTEREST_DATA_DIR = CONSTANTS.PINTEREST_DATA_DIR
// Get path of script
let __dirname = CONSTANTS.dirname

console.log(__dirname);

PINTEREST_DATA_DIR = path.resolve(`${__dirname + '../' + 'src' + '/' + PINTEREST_DATA_DIR}`)
console.log(PINTEREST_DATA_DIR);

console.log('Starting Pinterest Crawler...');

const excl_path = __dirname  + CONSTANTS.exclusion;

const exclusion_file = await fs.readFile(excl_path, 'utf8').catch((err) => {
    console.error('Could not read exclusions', err)
})

let exclusions = JSON.parse(exclusion_file ?? '[]') as string[]

const browser = await Playwright.chromium
    .launchPersistentContext('./pinterest-download-data', {
        // headless: true, devtools: true,
        headless: false, devtools: false,
        // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    })

const STORAGE_STATE_PATH = CONSTANTS.STORAGE_STATE_PATH;
export async function launch_login() {
    let obj = (await fs.readFile(__dirname + CONSTANTS.LOGIN_CREDENTIALS_PATH)).toString('utf8').trim()

    let user = JSON.parse(obj).user
    let pass = JSON.parse(obj).pass


    const page = await browser!.newPage();
    await page.goto('https://pinterest.ca/login');

    // let cookies = await page.evaluate(() => document.cookie);
    // const closeModalBtnSelector = 'button[aria-label="close"]';

    if (await page.getByLabel('Email').count() > 0) {
        await page.getByLabel('Email').fill(user);
        await page.getByLabel('Password').fill(pass);
        await page.getByText('Log in').last().click();

        // Save signed-in state to 'storageState.json'.
        (await page.context()
            .storageState({ path: STORAGE_STATE_PATH })
            .then((s) => console.log("SAVED STORAGE STATE: " + JSON.stringify(s)))
            .catch(err => console.error("FAILED TO SAVE STATE: " + err)));
    }

    return page
    // await page.close();
    // await browser.close();

}
export async function crawl_start(page: Playwright.Page) {

    await page.goto("https://www.pinterest.ca/dracana96");

    // Wait for boards to load
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

    // console.log({ board_links, section_links });

    let boards = JSON.parse(board_links) as string[]

    console.log({ section_links, board_links });

    // If a baord is excluded, remove it from the list
    console.log("Checking exclusions");

    let boards_before = boards.length
    boards = boards.filter(b => checkExcluded(b, exclusions) == false)
    let boards_now = boards.length
    let delta = boards_before - boards_now


    if (delta > 0) {
        console.log(`Removed ${delta} boards from list`);
    }

    console.log({ boards });
    console.log(`Processing ${boards.length} boards`);


    for (const boardLink of boards) {

        if (boardLink.includes("/pins")) {
            console.log(`Board ${boardLink} skipped.`);
            continue
        }

        let boardName = getBoardOrSectionName(boardLink);

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
            console.log("Checking section exclusions...");
            let section_before = sectionLinks
            sectionLinks = sectionLinks.filter(sectionLink => checkExcluded(sectionLink, exclusions) == false)
            let delta = section_before.length - sectionLinks.length
            if (delta > 0) {
                // differernce between arrays
                console.log(`Excluded ${delta} sections`);
            }

            for (const sectionLink of sectionLinks) {
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

                parsedSections.push({ sectionName: section_name, boardLink, boardName: board_name, sectionLink, sectionPins: section_pins as Pin[] } as Section)

                console.log("Finished section: ", sectionLink);
            }


        }

        /* Pins */
        console.log(`Getting pins from board ${boardLink}`);

        let board_pins: Pin[] = await autoScroll(page);
        // let board_pins: any[] = []

        let board = {
            boardName: boardName,
            boardLink: boardLink,
            sections: parsedSections,
            boardPins: board_pins,
        } as Board

        let board_pins_total = board.boardPins.length
        let section_pins_total = parsedSections
            //get total number of pins in sections
            .map(i => i.sectionPins.length)
            //sum
            .reduce((a, b) => a + b, 0)

        console.log(board)
        console.log("Saving data to file...");
        console.log(`Saving ${board_pins_total} board pins`);
        console.log(`Saving ${section_pins_total} section pins`);

        await save_to_file(board, { fileName: board.boardName, addDate: true, randomized: true, toDir: CONSTANTS.dirname + PINTEREST_DATA_DIR }).then((fullFilePath) => console.log("Saved to file", fullFilePath)).catch(console.error)

    }

    console.log("All processes finished.");

    console.log("Closing browser");

    await page.close();
    await browser.close();

    console.log("Closed.");

}

function getBoardOrSectionName(boardLink: string) {
    const boardNameSplit = boardLink.split('/');
    return boardNameSplit[boardNameSplit.length - 2] ?? '';
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

export function checkExcluded(url: string, exclusions: string[]): boolean {
    let excluded = false

    if (url === undefined) {
        return false
    }

    if (exclusions !== undefined &&
        Array.isArray(exclusions) &&
        exclusions.length === 0) {
        return false
    }
    // Filter out undefined, null, and empty strings
    exclusions = filterUndefinedNullEmptyString(exclusions);

    // Compare all strings lowercased
    url = url.toLocaleLowerCase()
    return exclusions.map((e) => {
        e = e.toLocaleLowerCase()
        if (e !== undefined &&
            url.includes(e)
            || url.endsWith(e)
            || url == e) {
            excluded = true
            // console.log(`'${e}' IS IN ${url}`);
        }
        return excluded
    })
        // Get boolean value of excluded
        .reduce((acc, curr) => acc || curr)
}

function filterUndefinedNullEmptyString(exclusions: string[]) {
    return exclusions.filter((i: string) => i !== undefined || i !== '');
}

export async function autoScroll(page: Playwright.Page): Promise<Pin[]> {
    let selectors = SELECTORS

    return await page.evaluate(async (selectors) => {
        return await new Promise(async resolve => {
            async function crawl_function() {

                // script to run in browser #118

                // V 109
                // @ts-ignore
                function parsePins(...pins) {
                    // @ts-ignore
                    return [...pins].map(i => {
                        if (i == undefined || i == null) throw Error("Failed to parse pin")

                        let img = i.querySelector('img') ?? null
                        let original_img_link = ""

                        if (img !== null) {
                            // If there's no srcset, then the image is probably from a video
                            if (img.srcset !== "") {
                                // original_img_link = img.srcset ? img.srcset.split(' ')[6] : ""
                                let srcset = img.srcset.split(' ')
                                original_img_link = srcset[srcset.length - 2] ?? ""
                            }
                        }
                        // @ts-ignore
                        let is_video = (() => [
                            selectors.video_pin_selector_1,
                            selectors.video_pin_selector_2,
                            selectors.video_pin_selector_3
                        ]
                            .some(s => i.querySelector(s) ? true : false))()

                        let pin_link = i.querySelector('a').href ?? ""
                        // @ts-ignore
                        let title = (i) => {
                            let p_title = ""
                            let title_el = [...i.querySelectorAll('a')][1] ?? null;

                            if (title_el !== null) {
                                p_title = title_el.innerText
                            } else {
                                p_title = 'Unknown'
                            }
                            let pinAuthor = i.querySelector('span') == null ?
                                "Unknown" : i.querySelector('span').textContent

                            return p_title ? `${p_title} by ${pinAuthor}` : `Untitled Pin by ${pinAuthor} `
                        }
                        // @ts-ignore
                        title = title(i).trim()
                        is_video = is_video

                        if (original_img_link == "") {
                            // if video, return title, pin_link, is_video no image link
                            return { title, pin_link, is_video: true, image: "" }
                        }


                        if ((is_video == false) && (original_img_link !== undefined)) {
                            return { title, pin_link, is_video: false, image: original_img_link }
                            // console.log(`${ title }, ${ pin_link }, ${ is_video } `)
                        }
                        return { title, pin_link, is_video, image_link: original_img_link }
                    })
                }


                // @ts-ignore
                function $$(selector, context) {
                    context = context || document;
                    var elements = context.querySelectorAll(selector);
                    return Array.prototype.slice.call(elements);
                }

                // @ts-ignore
                function isVisible(el) {
                    console.log(el);
                    if (!el || (el === null || el === undefined)) return false;
                    return el.getBoundingClientRect().top <= window.innerHeight;
                }
                // @ts-ignore
                function $x(xp, el = document) {
                    // @ts-ignore
                    let snapshot = null
                    if (el !== undefined && el !== null) {
                        snapshot = document.evaluate(
                            xp, el, null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                        );
                    }
                    snapshot = document.evaluate(
                        xp, document, null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                    );

                    return [...new Array(snapshot.snapshotLength)]
                        // @ts-ignore
                        .map((_, i) => snapshot.snapshotItem(i))
                        ;
                };

                /* TODO: Make async callbacks for more data??? */
                return await new Promise((resolve) => {
                    // Quick browser test code
                    let pins = new Array()
                    let pinsMap = new Map()
                    /* SCROLLING MAY END */

                    setTimeout(() => { }, 1000)

                    // Find the "More ideas like this" text element or the "Find more ideas for this board" text element
                    // let h3 = $x("//h3[contains(text(),'Find')]")
                    // let h2 = $x("//h2[contains(text(),'like this')]")
                    let h3 = []

                    let timer = setInterval(() => {
                        h3 = $x("//h3[contains(text(),'Find')] | //h2[contains(text(),'More')]")
                        // let vis =  h3.getBoundingClientRect().top <= window.innerHeight
                        // let vis2 = h2.getBoundingClientRect().top <= window.innerHeight
                        // let vis = isVisible(h3)
                        // let vis2 = isVisible(h2)

                        let isVis = h3.some(i => isVisible(i))

                        // Scroll down
                        window.scrollBy(0, 200)

                        // @ts-ignore
                        pins.push(...[...$$('div[data-test-id="pin"]')])
                        // @ts-ignore
                        // If we see the "More ideas like this" text element or the "Find more ideas for this board" text element
                        // we can stop scrolling
                        if (isVis) {
                            clearInterval(timer)

                            // Parse results
                            let parsedPins = parsePins(...pins)
                            // @ts-ignore
                            // Add them to a Map to make them unique by pin_link
                            // check if pin_link is empty, add them to another array and add them to the map later

                            parsedPins = parsedPins
                                // @ts-ignore
                                .filter(p => p !== undefined)
                                .filter(p => p.pin_link !== undefined && p.pin_link !== null && p.pin_link !== "")

                            // @ts-ignore
                            parsedPins.forEach(p => pinsMap.set(p.pin_link, p))

                            console.log(pinsMap)

                            // return pins data
                            debugger
                            resolve([...pinsMap.values()])
                        }
                    }, 2000)

                });

            }

            let res = await crawl_function()
            // @ts-ignore
            resolve([...res])
        })
    }, selectors) as Pin[];
}
