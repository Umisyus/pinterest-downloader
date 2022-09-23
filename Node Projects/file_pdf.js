// Open all files in folder with fs

const path = require('path');
const { pathToFileURL } = require('url');

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
                    .map(file =>{
                        let file_path = path.normalize(`${SRC_DIR}/${directoryName}/${file}`)
                        return pathToFileURL(file_path).toString()
                    })
                return { directoryName, files: fileNames }
         }))))
        .catch(e => console.log(e)))
}


(async () => {
    let result = await file_list(SRC_DIR).then(r => console.log(r))

    url_builder = (filename) =>{

    }

})()
