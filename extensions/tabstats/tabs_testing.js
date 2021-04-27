url_id_map = {}

async function createTestTab(url) {
    createProperties = {
        url: url,
        active: true
    };

    // chrome.tabs.create(createProperties, function(tab) {
    //     url_id_map[url] = tab.id
    // });
}

async function visitTestTab(url) {
    highlightInfo = {
        tabs: [url_id_map[url]]
    };

    // chrome.tabs.highlight(createProperties, function(window) {
    // });
}

function deleteTestTab(url) {
    // chrome.tabs.remove(url_id_map[url], function() {
    // });
}

function sleep(seconds) {
    return new Promise(
        r => setTimeout(r,
                        seconds * 1000));
}

async function performAfterDelay(cb, delay_mins=null) {
    if (delay_mins) {
        // console.log("Before sleep of " + delay_mins)
        await sleep(delay_mins * 60)
        // console.log("After sleep")
    }
    await cb()
}

async function runTest() {
    await performAfterDelay(function() {
        createTestTab("google.com")
    })
    await performAfterDelay(function() {
        createTestTab("reddit.com")
    }, 1)
    await performAfterDelay(function() {
        createTestTab("news.ycombinator.com")
    }, 2)

    await performAfterDelay(function() {
        visitTestTab("reddit.com")
    }, 3)

    await performAfterDelay(function() {
        deleteTestTab("reddit.com")
    }, 4)
}

runTest()