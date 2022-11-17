import path from 'path';
// SELECTORS AND CONSTANTS
export const SELECTORS = {
    closeModalBtnSelector: 'button[aria-label="close"]',
    // h3 with text "like this" or "like this" or "Find some ideas for this board"
    more_like_this_text_h2_element_selector: "//h2[contains(text(), 'More ideas like') or contains(text(),'this')]",
    find_more_ideas_for_this_board_h3_text_element_selector: "//h3[contains(text(), 'Find more') or contains(text(),'this')]",

    pins_xpath_selector: "//div[@data-test-id='pin']",
    pins_selector: 'div[data-test-id="pin"]',
    video_pin_selector_1: 'div[data-test-id="pinrep-video"]',
    video_pin_selector_2: 'div[data-test-id="PinTypeIdentifier"]',
    video_pin_selector_3: 'div[data-test-id="pincard-video-without-link"]',
    pin_bottom_selector: 'div[data-test-id="pointer-events-wrapper"]',
    pin_title_selector: 'div[data-test-id="pointer-events-wrapper"] a',
    pin_img_xpath: '//div[@data-test-id="pin"]//img', // or 'img'
}
export const CONSTANTS = {
    PINTEREST_DATA_DIR: 'storage/pinterest-boards/',
    dirname: `${path.dirname(process.argv[1])}/../../`,
    exclusion: 'exclusions.json',
    STORAGE_STATE_PATH: 'storage/storageState.json',
    LOGIN_CREDENTIALS_PATH: 'storage/login.json',
}
