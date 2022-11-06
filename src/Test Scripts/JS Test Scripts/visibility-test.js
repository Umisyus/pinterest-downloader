// visibility test
let isVisible = (el, { halt_selectors }) => {
    function isVisible(el) {
        console.log("Element: ", el);
        if (!el || (el === null || el === undefined)) return false;
        let isInView = el.getBoundingClientRect().top <= window.innerHeight;
        console.log(`IsVisible: ` + isInView)
        return isInView
    }

    if (!halt_selectors) {
        return isVisible(el)
    }

    halt_selectors = [selectors.find_more_ideas_for_this_board_h3_text_element_selector, selectors.more_like_this_text_h2_element_selector]
    return halt_selectors.map(i => isVisible($x(i)[0])).map(Boolean).reduce(Boolean)
}
