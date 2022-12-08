// This is the main Node.js source code file of your actor.
// An actor is a program that takes an input and produces an output.
import { Dataset, log } from 'crawlee';
import fetch from 'node-fetch'
// For more information, see https://sdk.apify.com
import { Actor, ApifyClient } from 'apify';
// For more information, see https://crawlee.dev
// import { CheerioCrawler } from 'crawlee';

// Initialize the Apify SDK

async function getData(userName = 'dracana96', THRESHOLD = 100) {
    // NODE VERSION

    const ds = new ApifyClient().dataset('pinterest-json')

    console.log(userName)
    let pins_url_bookmark = (userName, bookmark) => `https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2F${userName}%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22${userName}%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%2C%22bookmarks%22%3A%5B%22${bookmark}%22%5D%7D%2C%22context%22%3A%7B%7D%7D&_=1670393784068`

    let query = pins_url_bookmark(userName, "")
    let list = []

    do {
        console.log(query)
        let response_json = await (await fetch(query)).json();
        let bookmark = response_json.resource.options.bookmarks[0];
        query = pins_url_bookmark(userName, bookmark)

        let [...pins] = response_json.resource_response.data
        list.push(...pins)

        log.info(`running total: ${list.length}`);

        list.map(pin => log.debug(pin.grid_title))

        if (list.length >= THRESHOLD || bookmark.includes('end')) {
            console.log('end');
            log.info(`Total # of pins: ${list.length}`);

            await ds.pushData(list)

            console.log("saved to file");
            break;
        }
    } while (true)

    log.info('Done, will now exit...')
}

// Get input of the actor (here only for demonstration purposes).
await Actor.init()

// let { threshold, profileName } = await Actor.getInput()
let { threshold, profileName } = { threshold: 100, profileName: 'dracana96' }

log.info(`threshold: ${threshold}, profileName: ${profileName}`)
if (!profileName) throw new Error('No username specified! Please specify a username to crawl.')

await getData(profileName, threshold)

// Exit successfully
await Actor.exit();
json
