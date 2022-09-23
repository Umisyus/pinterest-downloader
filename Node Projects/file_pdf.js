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
    let file_tree = []

    let res = async () => await dirs.then(async dir => {
        let [...r] = (dir.map(async d => {
            let files = (await fs.readdir(`./TO SEND/${d}`))
            file_tree.push({ d, files })
            return { d, files }
        }))

        console.log(r)
        return await Promise.all(Array.from(r))
    })
    return await res()
}


(async () => {
    let result = await file_list().then(r => console.log(r))

})()
