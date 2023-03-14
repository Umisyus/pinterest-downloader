import { open, readdir, stat } from "fs/promises";
import { pipeline, Transform } from "stream";
import * as Path from 'path'

const path = './images';
let folders = await readdir(path);
let filePaths = []
let throttle = new Transform({
    write(ch) {
        setTimeout(() => {
            this.push(ch);
        }, 5000);
    }
})

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

    for await (const filePath of (filePaths.slice(0,10))) {
        const fullPath = Path.resolve(filePath);
        console.log(`Reading file: ${fullPath}`);

        let file = await open(fullPath, 'r');

        let data = file.createReadStream();
        data.on('readable', () => {
            let ind = data.read();
            if (ind) {
                console.log('***', ind);
            }
        })

        // data.close()
        // pipeline(stream, process.stdout, (err) => { })
    }

}
