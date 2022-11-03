import path from "path"
import fs from "fs"
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
// TODO: format json data to match Board and Section interface
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
    sections: Section[] | []
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

let found = []

console.log("Processing...");

links.forEach(link => {
    let board = findImageBoard(link, all_boards)
    let section = findImageSection(link, all_sections)

    if (board !== undefined) {
        // console.log(`Link: ${link} | Board: ${board}`);
    }
    if (section !== undefined) {
        // console.log(`Link: ${link} | Section: ${section}`);
    }
    if (!(board && section)) {
        console.log(`Link ${link} was not found in any board or section`);
    }

})
