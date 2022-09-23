// Open all files in folder with fs

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

// open files in folder and read files
async function file_list() {

    return await dirs.then(async dir =>
         Array.from(dir.map(async d => {
            console.log(d);
            let files = (await fs.readdir(`./${d}`))
             return { d, files }
         })))
        .catch(e => console.log(e))
}


(async () => {
    let result = await file_list().then(r => console.log(r))

})()
