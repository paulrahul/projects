url_id_map = {}
url_index_map = {}

async function createTestTab(url) {
    createProperties = {
        active: true
    };

    updateProperties = {
        url: url
    };

    testLog("Creating tab: " + url)
    chrome.tabs.create(createProperties, function(createdTab) {
        chrome.tabs.update(createdTab.id, updateProperties, function(updatedTab) {
            url_id_map[url] = createdTab.id
            url_index_map[url] = createdTab.index
        });
    });
}

async function visitTestTab(url) {
    highlightInfo = {
        tabs: [url_index_map[url]]
    };

    testLog("Visiting tab: " + url)
    chrome.tabs.highlight(highlightInfo, function(window) {
    });
}

function deleteTestTab(url) {
    testLog("Deleting tab: " + url)
    chrome.tabs.remove(url_id_map[url], function() {
    });
}

function sleep(seconds) {
    return new Promise(
        r => setTimeout(r,
                        seconds * 1000));
}

function testLog(str) {
    console.log("[" + (new Date()).getTime() + "] " + str)
}

async function performAfterDelay(cb, args, delay_mins=null) {
    if (delay_mins) {
        // console.log("Before sleep of " + delay_mins)
        await sleep(delay_mins * 2)
        // console.log("After sleep")
    }

    params = ["http://" + args]
    await cb.apply(this, params)
}

async function runTest() {
    testLog("Starting Test")
    await performAfterDelay(createTestTab, "freightwaves.com")
    await performAfterDelay(createTestTab, "krebsonsecurity.com", 1)
    await performAfterDelay(createTestTab, "mightyapp.com", 2)

    await performAfterDelay(visitTestTab, "krebsonsecurity.com", 3)

    await performAfterDelay(deleteTestTab, "krebsonsecurity.com", 4)
    testLog("Ending Test")
}

// runTest()