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

GC_INTERVAL_MINS = 1;

WATER_INTERVAL_MINS = 90;
STANDUP_INTERVAL_MINS = 60;
PUSHUPS_INTERVAL_MINS = 240;

// Functions

function bootStrap() {
    runGC();
}

function postWebRequest(url, payload, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE) {
            console.log("Received dump call response: " + this.status +
                        "; " + this.responseText);
            cb(this.status, this.responseText);
        }
    }
    xhr.send(payload);
}

// Listeners.
chrome.tabs.onCreated.addListener(function(tab) {
    // createTab(tab);
})

chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
    if ("url" in change_info) {
        createTab(tab);
    }
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

// Periodic jobs.

async function runPeriodicJob(job, interval_mins, num_runs=-1) {
    i = 0;
    while (true) {
        await new Promise(
            r => setTimeout(r,
                            interval_mins * 60 * 1000));
        job();
        i++;

        if (num_runs > 0 && i == num_runs) {
            break;
        }
    }
}

async function runGC() {
    runPeriodicJob(gcStore, GC_INTERVAL_MINS);
}
