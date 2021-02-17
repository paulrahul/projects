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

WATER_INTERVAL_MINS = 90;
STANDUP_INTERVAL_MINS = 60;
PUSHUPS_INTERVAL_MINS = 240;

// Functions

function postWebRequest(url, payload) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            console.log("Received dump call response: " + xhr.status);
        }
    }
    xhr.send(payload);
}

// Listeners.
chrome.tabs.onCreated.addListener(function(tab) {
    // createTab(tab);
})

chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    // if ("url" in change_info) {
    //     createTab(tab);
    // }
})

chrome.tabs.onHighlighted.addListener(function(highlightInfo) {
    // tabIds = highlightInfo.tabIds
    // for (tabId of tabIds) {
    //     visitTab(tabId);
    // }
})

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    // closeTab(tabId);
})
