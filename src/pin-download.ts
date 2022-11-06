import { launch_login } from "./crawler";
import * as Playwright from "playwright";
import { findImageBoard, findImageSection } from "./link-download";
import fs from "fs";
import { dirname } from "path";

(async () => {
    let __dirname = dirname(process.argv[1])

    let [...pin_data] = fs.readdirSync(__dirname + '/' + "storage/pinterest-crawl-data/", { withFileTypes: true })
        .map((file) => fs.readFileSync(file.isFile() ? __dirname + '/' + "storage/pinterest-crawl-data/" + file.name : file.name))
        .map((data) => JSON.parse(data.toString('utf-8')))


    await launch_login().then(async (page: Playwright.Page) => {
        let image_board = findImageBoard('', pin_data)
        let image_section = findImageSection('', pin_data)

        await Promise.all([
            page.goto(""),
            page.waitForLoadState(),

        ]);
    });

    function downloadImage(url: string, fileName: string) {
        let a = document.createElement("a");
        a.href = url ?? window.location.href;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
})();
