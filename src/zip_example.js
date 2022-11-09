import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import JSZip from "jszip";

let files = [
    { title: "IMG 1", data: randomUUID() },
    { title: "IMG 2", data: randomUUID() },
    { title: "IMG 3", data: randomUUID() },
]
let section_name = "Section 1";

function zipData(boardName, sectionName, files) {
    var zip = new JSZip();

    // Create a folder for the board
    let imgs = zip.folder("board-name");
    // Add the files to the board folder
    files.forEach((file) => {
        imgs.file(file.title, file.data);
    })
    // Create a folder for the section
    if (sectionName) {
        imgs = imgs.folder("section-name");
    }
    console.log("Adding files to zip");
    // Add files to the section folder
    files.forEach(file => {
        imgs.file(file.title, file.data);
    });

    const zip_name = 'imgs.zip';

    console.log("Writing zip to file");
    zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(createWriteStream(zip_name))
        .on('finish', function () {
            // JSZip generates a readable stream with a "end" event,
            // but is piped here in a writable stream which emits a "finish" event.
            console.log(`${zip_name} written.`);
        });
}

zipData("concept-art", "creatures", files);
// var fs = require("fs");
// var JSZip = require("jszip");

// var zip = new JSZip();
// // zip.file("file", content);
// // ... and other manipulations

// zip
// .generateNodeStream({type:'nodebuffer',streamFiles:true})
// .pipe(fs.createWriteStream('out.zip'))
// .on('finish', function () {
//     // JSZip generates a readable stream with a "end" event,
//     // but is piped here in a writable stream which emits a "finish" event.
//     console.log("out.zip written.");
// });
