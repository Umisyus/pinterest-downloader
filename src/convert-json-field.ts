import path from "path";
import fs from "fs";
import { Board } from "./types";
// convert-json-field

let __dirname = path.dirname(process.argv[1])
let PINTEREST_DATA_DIR = path.resolve(`${__dirname + '/' + '..' + '/' + 'src' + '/' + 'storage/pinterest-boards/'}`)

let dir = path.resolve(`${PINTEREST_DATA_DIR}/`)
console.log(dir);

let [...pin_data]: Board[] = fs.readdirSync(dir, { withFileTypes: true })
    .map((file) => fs.readFileSync(dir + "/" + file.name))
    .map((data) => JSON.parse(data.toString('utf-8')))

let transmformed = pin_data.map((board) => {
    let tr_board = board.boardPins.map((pin: any) => {
        console.log(pin);

        pin.image_link = pin.image
        return pin
    })
    return tr_board
})
console.log(pin_data);

console.log(transmformed);

console.log("Done");
