// Debugging functions.
function log_tabs(tabs) {
    tabs.forEach(element => {
        console.log(element.url);
    });
}

// Functions

function bootStrap() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            createTab(tab);
        });    
    });

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
    //closeTab(tabId);
})

