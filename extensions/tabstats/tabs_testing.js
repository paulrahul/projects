url_id_map = {}

async function sleep(seconds) {
    await new Promise(
        r => setTimeout(r,
                        seconds * 1000));
}

function runTest() {
    createTestTab("google.com")
    createTestTab("reddit.com", 1)
    createTestTab("news.ycombinator.com", 2)

    visitTestTab("reddit.com", 3)
    deleteTestTab("reddit.com", 4)
}

async function createTestTab(url, delay_mins=null) {
    if (delay_mins) {
        sleep(delay_mins * 60)
    }

    createProperties = {
        url: url,
        active: true
    };

    chrome.tabs.create(createProperties, function(tab) {
        url_id_map[url] = tab.id
    });
}

async function visitTestTab(url, delay_mins=null) {
    if (delay_mins) {
        sleep(delay_mins * 60)
    }

    highlightInfo = {
        tabs: [url_id_map[url]]
    };

    chrome.tabs.highlight(createProperties, function(window) {
    });
}

function deleteTestTab(url, delay_mins=null) {
    if (delay_mins) {
        sleep(delay_mins * 60)
    }

    chrome.tabs.remove(url_id_map[url], function() {
    });
}