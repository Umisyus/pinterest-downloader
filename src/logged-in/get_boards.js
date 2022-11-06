/* Use when logged in */
function get_boards(boards_selector = "div[data-test-id='pwt-grid-item']") {
    // Check if null or empty
    if (boards_selector == null || boards_selector == "")
        boards_selector = "div[data-test-id='pwt-grid-item']"
    let boards = $$(boards_selector)
    let links = boards.map(i => i.querySelector('a')).map(i => i.href)
    return links
}
