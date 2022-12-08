const pinsUrlByName = (userName, path) => {
    const param = decodeURIComponent(userName)
    // '/poltronafrau/pins/&data={"options":{"username":"poltronafrau"},"context":{}}'

    // Start URL
    const pinsApiEndpoint = '/UserPinsResource/get/?source_url=%2F' + param +
        '%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Afalse%2C%22username%22%3A%22' +
        decodeURIComponent(userName) + '%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D&_='

    return `${apiBaseURL}${pinsApiEndpoint}`
}

// https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2Fdracana96%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22dracana96%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D&_=1670128238202

// https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2Fdracana96%2F&data=%7B%22options%22%3A%7B%22add_vase%22%3Atrue%2C%22field_set_key%22%3A%22mobile_grid_item%22%2C%22is_own_profile_pins%22%3Afalse%2C%22username%22%3A%22dracana96%22%7D%2C%22context%22%3A%7B%7D%7D&_=1670128410391

// https://www.pinterest.ca/resource/UserPinsResource/get/?source_url=%2Fdracana96%2Fpins%2F&data=%7B%22options%22%3A%7B%22is_own_profile_pins%22%3Atrue%2C%22username%22%3A%22dracana96%22%2C%22field_set_key%22%3A%22grid_item%22%2C%22pin_filter%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D&_=1670128238202

