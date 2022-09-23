// Open all files in folder with fs

const path = require('path');
const { pathToFileURL } = require('url');
const pw = require('playwright')
const fs = require('fs').promises;
// open folder and read files
let fileNames = []
let OUTDIR = 'PDF_FILES'

const getDirectories = async source =>
    (await fs.readdir(source, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .filter(dirent => dirent.name != 'other documents')
        .map(dirent => dirent.name)

let dirs = getDirectories('./TO SEND')
let SRC_DIR = './TO SEND'
// open files in folder and read files
async function file_list(SRC_DIR) {

    return Promise.resolve(await dirs.then(async dir =>
        Promise.all(Array.from(
            dir.map(async directoryName => {
                let fileNames = (await fs.readdir(`${SRC_DIR}/${directoryName}`))
                    // add source dir to path
                    .map(file => {
                        let file_path = path.normalize(`${SRC_DIR}/${directoryName}/${file}`)
                        return pathToFileURL(file_path).toString()
                    })
                return { directoryName, files: fileNames }
            })))));
    // .catch(e => console.log(e)))
}


(async () => {
    let result = (await file_list(SRC_DIR).then(r => r))
        .filter(f => f !== null)
    // Filter nulls ???

    // Read and PDF all files with Playwright
    // console.log(result);

    let context = (await (await pw.chromium.launch({ headless: true })).newContext())
    let p = await context.newPage()

    for await (const { directoryName, files } of result) {
        for await (f of files) {
            Promise.all([await p.goto(f, { waitUntil: 'load', timeout: 60000 }),
            await p.pdf({ path: `./PDFs/${directoryName}/${f}` })])

                .then(x => console.log(`Done.
                \n ${(async () => (await x[0].json().then(x => x)))}
                size is: ${x[1].byteLength}
                `))
        }
    }


})()
