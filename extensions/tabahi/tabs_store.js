/*
 * File containing methods to interact with Store.
 *
 * Tabs Object store format:
 *
 * url (string, <primary key>)
 * category ([string])
 * created ([Date])
 * closed ([Date])
 * visits ([start Date, end Date])
 * pageout ([Date])
 * pagein ([Date])
 * 
 */

 // TODO: Maintain a cache of tab_id: url and also the last visited one.

TAGS = {
    "work" : ["nutanix", "smartsheet", "https://drive.google.com/drive/u/1/",
              "docs.google.com"],
    "communication": ["mail"]
};

// Debugging methods.
function dumpStore(query) {
    chrome.storage.sync.get(query, function(items) {
        console.log('Retrieved the following: ');
        for (i in items) {
            console.log(i + ": " + items[i]);
        }
    });    
}

// Utility methods.

function getTags(url) {
    result = []
    for (tag in TAGS) {
        patterns = TAGS[tag];
        for (p of patterns) {
            if (url.includes(p)) {
                result.push(tag);
                break;
            }
        }
    }

    return result;
}

function isCommunication(tags) {
    return tags.includes("communication");
}

function isWork(tags) {
    return tags.includes("work");
}

function getCategory(url) {
    return getTags(url);
}

function clearStore(cb) {
    chrome.storage.sync.clear(cb);
}

function flushToStore() {
    console.log("Flushing to Store!");
    flushCache();
}

// Tab API methods.

function writeTab(url, old_row, changes, dump=false) {
    new_row = old_row ? old_row : changes;
    if (old_row) {
        for (key in changes) {
            old_val = (key in old_row) ? old_row[key] : null;

            if (old_val) {
                old_val.push(changes[key]);
                new_row[key] = old_val;
            } else {
                new_row[key] = [changes[key]];
            }            
        }
    }
    new_row_json = JSON.stringify(new_row);
    payload = {};
    payload[url] = new_row_json;
    chrome.storage.sync.set(payload, function() {
        if (dump) {
            dumpStore();
        }
        // console.log('Value of ' + url + ' is set to ' + new_row_json);
    });
}

function updateTab(tab_id, update, dump=false) {
    let tab_url = getTabURL(tab_id);
    // console.log("Cache tab url: " + tab_url);
    chrome.storage.sync.get(tab_url, function(items) {
        for (i in items) {
            writeTab(tab_url, JSON.parse(items[i]),
                    update, dump);
        }
    });    
}

function createTab(tab) {
    tags = getTags(tab.url);
    created = [Date.now()];

    new_row = {
        category: tags,
        created: created,
        closed: [],
        visits: [],
        pageout: [],
        pagein: []
    };
    writeTab(tab.url, null, new_row);
    addTabEntry(tab.id, tab.url);
}

function visitTab(tab_id) {
    updateTab(tab_id, {visits: Date.now()}, dump=false);
    bumpTabEntry(tab_id);
}

function closeTab(tab_id) {
    updateTab(tab_id, {closed: Date.now()});
    removeTabEntry(tab_id);
}

function getPageinTabs() {
    // chrome.storage.sync.get(query, function(items) {
    //     for (i in items) {
    //         console.log(i + ": " + items[i]);
    //     }
    // });  
}