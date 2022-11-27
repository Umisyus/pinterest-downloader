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
// import login data from file

const login_data = JSON.parse(fs.readFileSync('../storage/login.json', 'utf8'));

export let router = createPlaywrightRouter();

// Scroll down page to load all pins
router.addDefaultHandler(async ({ log, request, infiniteScroll, blockRequests }) => {
    // Block images from loading
    await blockRequests({ urlPatterns: ['.png', '.jpg', '.jpeg', '.gif', '.svg'] })

    log.info(`Processing all pins: ${request.url}`);

    await infiniteScroll({ waitForSecs: 20 });
})

export function parsePinterestBoardJSON(json_data: any) {
    let pin_data: Datum[] = json_data.resource_response.data as Datum[];

    return pin_data.map(({ board, grid_title, link, id, images, videos, story_pin_data }) => {
        let board_title = board.name
        let board_link = board.url

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
