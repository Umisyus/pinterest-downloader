import {readdir, stat} from "fs/promises";
import path from "path";
export let readFiles = async (startPath) => {
    let folders = await readdir(startPath);
    let filePaths: string[] = []
    // Read folders
    for await (const folder of folders) {

        if (folder.startsWith('.'))
            continue;

        // Read folders within folders
        await stat(`${startPath}/${folder}`).then(async (stats) => {

            if (stats.isFile()) {
                filePaths.push(path.resolve(`${startPath}/${folder}`))
            } else {
                let files = await readdir(startPath + '/' + folder)
                // Read files within folders
                files.forEach((file) => {
                    // filePaths.push(`${path}/${folder}/${file}`)
                    filePaths.push(path.resolve(`${startPath}/${folder}/${file}`))
                    // console.log('>>>', file);
                })
            }
        })
    }
    return filePaths
}
// console.log('Done...');
