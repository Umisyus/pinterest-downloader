
// interface PinterestJSON {
//     data: Array<Object>
// }

// interface Board {
//     boardName: string,
//     board_pins: Array<Object>

// }

// Parse json for array of section objects
let section_map = (arr: any) => {

    // @ts-ignore
    return arr.map(i =>
    ({
        section: i.section,
        // @ts-ignore
        pins: Array.from(i.section_pins.map(i => (i[1]))) // extract data from json, GOOD!
    }))
}


// Get array of image links from sections
// @ts-ignore
let my_Sections = section_map(json.filter(i => i.section !== undefined)) // Maps sections
// @ts-ignore
let links = [...my_Sections.flatMap(s => s.pins.map(p => p.image))]


// Parse json for array of section objects
// @ts-ignore
function parse_boards(json) {
    // @ts-ignore
    board_map = (arr) => {
        // @ts-ignore
        return arr.map(i =>
        ({
            board: i.board.boardName,
            // @ts-ignore
            pins: Array.from(i.board.board_pins.map(i => (i[1]))) // extract data from json, GOOD!
        }))
    }

    // Get array of image links from sections
    // @ts-ignore
    let my_boards = board_map(json.filter(i => i.board !== undefined)) // Maps sections
    // @ts-ignore
    return [...my_boards.flatMap(s => s.pins.map(p => p.image))]
}

// @ts-ignore
console.log(parse_boards(json))


