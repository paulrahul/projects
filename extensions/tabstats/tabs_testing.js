url_id_map = {}

async function sleep(seconds) {
    await new Promise(
        r => setTimeout(r,
                        seconds * 1000));
}

function test() {
    createTestTab("google.com")
    createTestTab("reddit.com")
    createTestTab("news.ycombinator.com")

    visitTestTab("reddit.com")
    deleteTestTab("reddit.com")
}

function createTestTab(url) {
    createProperties = {
        url: url,
        active: true
    };

    chrome.tabs.create(createProperties, function(tab) {
        url_id_map[url] = tab.id
    });
}

function visitTestTab(url) {
    highlightInfo = {
        tabs: [url_id_map[url]]
    };

    chrome.tabs.highlight(createProperties, function(window) {
    });
}

function deleteTestTab(url) {
    chrome.tabs.remove(url_id_map[url], function() {
    });
}