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

PAGE_IN_INTERVAL_MINS = 60;

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

function bootStrap() {
    // db_interface.init();
    clearStore(function () {
        queryInfo = {
            currentWindow: true
        };

        chrome.tabs.query(queryInfo, function(tabs) {
            tabs.forEach(tab => {
                createTab(tab);
            });    
        });
    });

    runGC();
    runScanner();
    dumpToDB();

    // dumpStore(null);
}

// Listeners.
chrome.tabs.onCreated.addListener(function(tab) {
    createTab(tab);
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

function tabsGC() {
    console.log("Running GC");
    tabs_to_cull = getTabsForGC();

    if (tabs_to_cull && Object.keys(tabs_to_cull).length > 0) {
        msg = "Paged out tabs: ";
        for (let tab_id in tabs_to_cull) {
            console.log("Removing: " + tab_id);
            chrome.tabs.remove(parseInt(tab_id), function() {
                console.log("Removed tab: " + tabs_to_cull[tab_id]);
                updateTab(tab_id, {pageout: Date.now()});
                clearStore(function() {}, clear_store=false);
            });
            msg += tabs_to_cull[tab_id] + ", ";
        }

        // notify(msg);
        console.log(msg);
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
    while (true) {
        await new Promise(
            r => setTimeout(r,
                            GC_INTERVAL_MINS * 60 * 1000)); // sleep for 30 mins
        tabsGC();
        i++;
    }
}

async function runScanner() {
    i = 0;
    while (true) {
        await new Promise(
            r => setTimeout(r,
                            PAGE_IN_INTERVAL_MINS * 60 * 1000)); // sleep for 60 mins.
        pageInTab();
        i++;
    }
}

async function dumpToDB() {
    i = 0;
    while (true) {
        await new Promise(
            r => setTimeout(r,
                            PAGE_IN_INTERVAL_MINS * 60 * 1000)); // sleep for 60 mins.
        clearStore(function(){});
        i++;
    }
}

function pageInTab() {
    getAllStoreTabs(pageInTabCb);
}

function pageInTabCb(items) {
    // Scan all rows and find out the ones having:
    // max(pageout) > max(pagein) and max(closed)
    // These need to be paged in.
    pagein_tabs = {};
    min_pageout_tab = null;
    for (url in items) {
        row = JSON.parse(items[url]);
        console.log("Scanning " + url + ": " + items[url]);
        if ("pageout" in row ) {
            pageouts = row["pageout"];
            pageins = row["pagein"];
            closed = row["closed"];

            max_po = pageouts && pageouts.length > 0 ? Math.max(...pageouts) : 0;
            max_pi = pageins && pageins.length > 0 ? Math.max(...pageins) : 0;
            max_c = closed && closed.length > 0 ? Math.max(...closed) : 0;

            if (max_po > max_pi && max_po > max_c) {
                pagein_tabs[url] = max_po;
                if (!min_pageout_tab || max_po < min_pageout_tab) {
                    min_pageout_tab = url;
                }
            }
        }
    }

    // Page in the one with min(max(pageout)) i.e. the one which got paged out
    // earliest.
    if (min_pageout_tab) {
        notify("Bringing back URL " + min_pageout_tab + " for your reading!");
        createProperties = {
            url: min_pageout_tab,
            active: true
        };

        chrome.tabs.create(createProperties, function(tab) {
            createTab(tab);
        });
    } else {
        console.log("No tab to be paged in at " + Date.now());
    }
}

