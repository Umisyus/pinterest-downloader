import { readdir, stat } from "fs/promises";
export let readFiles = async (path = './images') => {
    let folders = await readdir(path);
    let filePaths = []
    // Read folders
    for await (const folder of folders) {

        if (folder.startsWith('.'))
            continue;

        // Read folders within folders
        await stat(`${path}/${folder}`).then(async (stats) => {

            if (!stats.isDirectory())
                return;
            let files = await readdir(path + '/' + folder)
            // Read files within folders
            files.forEach(async (file) => {
                filePaths.push(`${path}/${folder}/${file}`)
                console.log('>>>', file);
            })
        })
        // Read files within folders
        // for await (const filePath of (filePaths.slice(0, 10))) {
        //     const fullPath = Path.resolve(filePath);
        //     console.log(`Reading file: ${fullPath}`);

        //     let file = await open(fullPath);

        //     let data = file.createReadStream();
        //     data.on('readable', () => {
        //         let readableData = data.read();
        //         if (readableData) {
        //             console.log('***', readableData);
        //         }
        //     })
        // }
    }
    return filePaths
}
console.log('Done...');
