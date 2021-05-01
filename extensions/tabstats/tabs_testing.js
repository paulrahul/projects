all_tabs = {}

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
            all_tabs[url] = updatedTab
        });
    });
}

async function visitTestTab(url) {
    highlightInfo = {
        tabs: [all_tabs[url].index]
    };

    testLog("Visiting tab: " + url)
    chrome.tabs.highlight(highlightInfo, function(window) {
    });
}

async function getAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        for (tab of tabs) {
            console.log(tab.url + " in index: " + tab.index)
        }
    });
}

function deleteTestTab(url) {
    testLog("Deleting tab: " + url)
    chrome.tabs.remove(all_tabs[url].id, function() {
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
    await performAfterDelay(createTestTab, "thehustle.co")
    await performAfterDelay(createTestTab, "time.com", 2)
    await performAfterDelay(createTestTab, "theverge.com", 3)

    // await getAllTabs()
    await performAfterDelay(visitTestTab, "time.com", 4)

    await performAfterDelay(deleteTestTab, "time.com", 5)
    testLog("Ending Test")
}

// runTest()