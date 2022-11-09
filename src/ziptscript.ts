if (zip) {

    let file_path = await download.path() ?? img_path;
    let file_name = download.suggestedFilename() ?? img_name

    if (options?.zip) {
        let zip = new JSZip()
        // Save to zip
        // add to zip file
        // board-name/[section-name]/image_name.png

        let folder = zip.folder(bn);

        if (sn) {
            folder = folder?.folder(sn) ?? folder;
        }

        folder?.file(file_name, file_path)

            .generateAsync({ type: "blob" })
            .then(async (content) => { fs.writeFileSync(img_path, await content.text()) })
    }
}
