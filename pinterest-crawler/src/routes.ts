import { Dataset, createPlaywrightRouter, Request, enqueueLinks, Dictionary, createPuppeteerRouter, Log } from 'crawlee';

import { randomUUID } from 'crypto'
import { SELECTORS } from './constants/constants_selectors.js';
import Playwright from 'playwright';
import { Pin } from './constants/types.js';
import fs from 'fs'
import { CheerioAPI } from 'cheerio';
import { Datum } from './pin-board-data-type.js';
import { InfiniteScrollOptions } from '@crawlee/playwright/internals/utils/playwright-utils.js';
import { ds } from './main.js';

export let router = createPlaywrightRouter();

// Scroll down page to load all pins
router.addDefaultHandler(async ({ log, request, blockRequests, crawler, response }) => {
    // Block images from loading
    await blockRequests({ urlPatterns: ['.png', '.jpg', '.jpeg', '.gif', '.svg'] })

    log.info(`Processing all pins: ${request.url}`);

    let bookmark = '';
    // Detect if this is the first page of pins
    if (request.url.includes('UserPinsResource')) {
        // get bookmark from json data
        let json_data = null;

        try {
            json_data = await response?.json();
            log.debug(`JSON data received`);
            bookmark = json_data?.resource?.options?.bookmarks[0];

            if (bookmark && !bookmark.includes('end')) {
                log.debug(`Bookmark: ${bookmark}`);
                let pins = parsePinterestBoardJSON(json_data);
                log.info(`Found ${pins.length} pins`);
                let userName = json_data.resource.options.username;
                let next_url = pins_url_bookmark(userName, bookmark)
                log.info(`Next url: ${next_url}`);
                await crawler.addRequests([next_url])
            } else {
                log.info(`No more pins to load`);
            }
        } catch (e) {
            console.error(e)
        }

    }
})

function pins_url_bookmark(userName: string, bookmark: string) { return `https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2F${userName}%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22${userName}%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%2C%22bookmarks%22%3A%5B%22${bookmark}%22%5D%7D%2C%22context%22%3A%7B%7D%7D&_=1670393784068` }

export function parsePinterestBoardJSON(json_data: any) {
    let pin_data: Datum[] = json_data.resource_response.data as Datum[];
    let origin = json_data.client_context.origin;
    return pin_data.map(({ board, grid_title, link, id, images, videos, story_pin_data }) => {
        let board_title = board.name
        let board_link = new URL(`${origin}${board.url}`)
        let pin_title = (grid_title !== "" ? grid_title.replace(/\s{2,}/, ' ').substring(0, 69) : "Untitled Pin").trim();
        let video = ''
        if (story_pin_data !== undefined && story_pin_data !== null) {
            video = (Array.from(Object.values(story_pin_data?.pages[0]?.blocks[0]?.video?.video_list ?? {})).pop())?.url ?? '';
        }
        let pin_video = ''
        if (videos !== undefined && videos !== null
            && videos.video_list !== undefined && videos.video_list !== null) {
            pin_video = (Array.from(Object.values((videos.video_list ?? {}) ?? {})).pop()).url ?? '';
        }

        let pin_link = `https://www.pinterest.ca/pin/${id}`
        let pin_original_image = (Object.values(images ?? {}).pop())?.url ?? '';
        let pin_video_link = [video, pin_video].filter(Boolean).pop() ?? ''
        return ({ board_title, board_link, pin_title: (pin_title) ?? 'Untitled Pin', pin_link, origin_link: link ?? '', pin_original_image: pin_original_image, pin_video_link });

    }).filter((i) => {
        if (typeof i?.pin_title === 'object') return false;
        return true
    });
}
