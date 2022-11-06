// json.map(i=>i).map(i=>
//     i.section ? ({
//         section: i.section,
//         pins: Array.from(i.section_pins.map(i=>( (i[1]) ))) // extract data from json
//         })
//     :
// ({board: i.board, pins: i.board.board_pins})  ) // parse combined array of board and sections


// mapped = json.map(i=>i).map(i=>
//     i.section ? ({
//         section: i.section,
//         pins: Array.from(i.section_pins.map(i=>( (i[1]) ))) // extract data from json, GOOD!
//         })
//     :
// ({board: i.board, pins: i.board.board_pins})  ) // parse combined array of board and sections



// section_map = (arr) => {
//     debugger;
//     console.log(arr);
//     console.log(typeof arr)
//     return arr.map(i =>
//     ({
//         section: i.section,
//         pins: Array.from(i.section_pins.map(i => ({ data: i[1] }))) // extract data from json, GOOD!
//     }))
// }


// Parse json for array of section objects
// section_map = (arr) => {
//     debugger;
//     console.log(arr);
//     console.log(typeof arr)
//     return arr.map(i =>
//     ({
//         section: i.section,
//         pins: Array.from(i.section_pins.map(i => ({ data: i[1] }))) // extract data from json, GOOD!
//     }))
// }
interface Board {
    boardName: string,
    board_pins: Array<Object>

}

// Parse json for array of section objects
section_map = (arr) => {
    debugger;
    console.log(arr);
    console.log(typeof arr)
    return arr.map(i =>
    ({
        section: i.section,
        pins: Array.from(i.section_pins.map(i => (i[1]))) // extract data from json, GOOD!
    }))
}

// Get array of image links from sections
my_Sections = section_map(json.filter(i => i.section !== undefined)) // Maps sections
let links = [...my_Sections.flatMap(s => s.pins.map(p => p.image))]


// Parse json for array of section objects
function parse_boards(json) {
    board_map = (arr) => {

        return arr.map(i =>
        ({
            board: i.board.boardName,
            pins: Array.from(i.board.board_pins.map(i => (i[1]))) // extract data from json, GOOD!
        }))
    }

    // Get array of image links from sections
    let my_boards = board_map(json.filter(i => i.board !== undefined)) // Maps sections
    return [...my_boards.flatMap(s => s.pins.map(p => p.image))]
}

console.log(parse_boards(json))


