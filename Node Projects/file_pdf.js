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

                    // filter PDFs
                    .filter(f => !f.includes('pdf'))

                return { directoryName, files: fileNames }
            })))));
    // .catch(e => console.log(e)))
}


(async () => {
    let result = (await file_list(SRC_DIR).then(r => r))
        .filter(f => f !== null)

        console.log(result);
    // Filter nulls ???
    // result = result
    //     // Filter PDFs
    //     .filter(dirent => {
    //     dirent.files.filter(f=>f.includes('.pdf'))
    //     })

    // Read and PDF all files with Playwright
    // console.log(result);

    let context = (await (await pw.chromium.launch({ headless: true })).newContext())
    let p = await context.newPage()

    for await (const { directoryName, files } of result) {
        for await (f of files) {
            await p.goto(f)
            console.log(`Opening file ${f}`);

            // await p.waitForNavigation()
            console.log(`Creating PDF of ${await p.title()}`);

            await p.pdf({ path: `./PDFs/${directoryName}/${f}` })
                .then(x => console.log(`Done.

                \n ${(async () => (await x[0].json().then(x => x)))}
                size is: ${x[1].byteLength}

                `))

                await p.close()
            // console.log(f);
        }
    }


})()

//print bytes as human readable string
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}
humanFileSize(123456789, true); // '123.5 MB'
