function get_sections() {
    let sections = $x('*//div[starts-with(@data-test-id,"section")]')
    return sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')))
}
