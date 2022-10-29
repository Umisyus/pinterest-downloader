// selectors
export const selectors = {
    // h3 with text "like this" or "like this" or "Find some ideas for this board"
    more_like_this_text_h2_element_selector: "//h2[contains(text(), 'More ideas like') or contains(text(),'this')]",
    find_more_ideas_for_this_board_h3_text_element_selector: "//h3[contains(text(), 'Find more') or contains(text(),'this')]",

    pins_xpath_selector: "//div[@data-test-id='pin']",
    pins_selector: 'div[data-test-id="pin"]',
    video_pin_selector: 'div[data-test-id="PinTypeIdentifier"]',
    pin_bottom_selector: 'div[data-test-id="pointer-events-wrapper"]',
    pin_title_selector: 'div[data-test-id="pointer-events-wrapper"] a',
    pin_img_xpath: '//div[@data-test-id="pin"]//img', // or 'img'
}
