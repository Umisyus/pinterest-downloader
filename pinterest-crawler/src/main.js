// This is the main Node.js source code file of your actor.
// An actor is a program that takes an input and produces an output.
import { Dataset, log } from 'crawlee';
import fetch from 'node-fetch'
// For more information, see https://sdk.apify.com
import { Actor } from 'apify';
// For more information, see https://crawlee.dev
// import { CheerioCrawler } from 'crawlee';

// Initialize the Apify SDK

async function getData(userName = 'dracana96', THRESHOLD = 50) {
    // NODE VERSION

    console.log(userName)
    let pins_url_bookmark = (userName, bookmark) => `https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2F${userName}%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22${userName}%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%2C%22bookmarks%22%3A%5B%22${bookmark}%22%5D%7D%2C%22context%22%3A%7B%7D%7D&_=1670393784068`

    let query = pins_url_bookmark(userName, "")
    let list = []
    // let parse = ({ board, grid_title, link, id, images, videos, story_pin_data }) => {
    //     let origin = 'https://www.pinterest.ca'
    //     let board_title = board.name
    //     let board_link = new URL(`${origin}${board.url}`)
    //     let pin_title = (grid_title !== "" ? grid_title.replace(/\s{2,}/, ' ').substring(0, 69) : "Untitled Pin").trim();
    //     let video = ''
    //     if (story_pin_data !== undefined && story_pin_data !== null) {
    //         video = (Array.from(Object.values(story_pin_data?.pages[0]?.blocks[0]?.video?.video_list ?? {})).pop())?.url ?? '';
    //     }
    //     let pin_video = ''
    //     if (videos !== undefined && videos !== null
    //         && videos.video_list !== undefined && videos.video_list !== null) {
    //         pin_video = (Array.from(Object.values((videos.video_list ?? {}) ?? {})).pop()).url ?? '';
    //     }

    //     let pin_link = `https://www.pinterest.ca/pin/${id}`
    //     let pin_original_image = (Object.values(images ?? {}).pop())?.url ?? '';
    //     let pin_video_link = [video, pin_video].filter(Boolean).pop() ?? ''
    //     return ({ board_title, board_link, pin_title: (pin_title) ?? 'Untitled Pin', pin_link, origin_link: link ?? '', pin_original_image: pin_original_image, pin_video_link });

    // }
    do {
        console.log(query)
        let response_json = await (await fetch(query)).json();
        let bookmark = response_json.resource.options.bookmarks[0];
        query = pins_url_bookmark(userName, bookmark)

        let [...pins] = response_json.resource_response.data
        list.push(...pins)

        log.info(`list length: ${list.length}`);

        // pins.map(pin =>log.info( pin.grid_title))
        list.map(pin => log.info(pin.grid_title))

        if (list.length >= THRESHOLD || bookmark.includes('end')) {
            console.log('end');
            log.info(`# of pins: ${list.length}`);

            await Actor.pushData(list)

            console.log("saved to file");
            break;
        }
    } while (true)

    log.info('Done, will now exit...')
}
// Get input of the actor (here only for demonstration purposes).
await Actor.init()

let { threshold, profileName } = Actor.getInput()
log.info(`threshold: ${threshold}, profileName: ${profileName}`)

await getData(profileName, threshold)

// Exit successfully
await Actor.exit();
