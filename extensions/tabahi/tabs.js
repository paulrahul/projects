/*****
 * 
 * File containing the main Tab controller methods.
 * 
 */

// Debugging functions.
function log_tabs(tabs) {
    tabs.forEach(element => {
        console.log(element.url);
    });
}

// Functions

function bootStrap() {
    clearStore(function () {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                createTab(tab);
            });    
        });
    });

    runGC();

    // dumpStore(null);
}

// Listeners.
chrome.tabs.onCreated.addListener(function(tab) {
    createTab(tab);
})

chrome.tabs.onHighlighted.addListener(function(highlightInfo) {
    tabIds = highlightInfo.tabIds
    for (tabId of tabIds) {
        visitTab(tabId);
    }
})

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    closeTab(tabId);
})

function tabsGC() {
    tabs_to_cull = getTabsForGC();

    if (tabs_to_cull && Object.keys(tabs_to_cull).length > 0) {
        tabs_url = Object.values(tabs_to_cull);
        msg = "Paged out tabs: " + tabs_url;
        // chrome.tabs.remove(Object.keys(tabs_to_cull), function() {
        //     console.log("Paged out tabs: " + tabs_url);    
        // });
        // notify(msg);
        // console.log(msg);
    }
    setLastGCTs(Date.now());
}

function notify(msg) {
    chrome.notifications.create(
        "tabahi", {
            type: "basic",
            title: "Tabahi GC!",
            message: msg,
            iconUrl: "images/tabahi-32bits-32.png"
        }, function(notificationId) {
    });
}

async function runGC() {
    i = 0;
    while (i < 10) {
        await new Promise(r => setTimeout(r, 60000));  // sleep for 1 min.
        tabsGC();
        i++;
    }
}

