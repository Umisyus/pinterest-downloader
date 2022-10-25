function get_sections() {
    let sections = $x('*//div[starts-with(@data-test-id,"section")]')
    return section_links = sections.map(i => (window.location.origin + i.querySelector('a').getAttribute('href')))
}
