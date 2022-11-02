// readfile.js
// read json file and return json object
import { read, readFileSync } from 'fs';
import * as path from 'path';

let __dirname = path.dirname(process.argv[1])
var file = path.join(__dirname, 'pin-links-1501.json');
var obj = readFileSync(file);

let daaaataaaaa = JSON.parse(obj.toString('utf8'))

console.log((daaaataaaaa.data.length))
