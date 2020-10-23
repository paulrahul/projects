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

DISALLOWED_TABS = ["chrome://newtab/"];

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
    // Fetch everything from sync.store and then flush to them to the DB, after
    // which, clear the sync.store.
    getAllStoreTabs(function(items) {
        rows = {};
        for (url in items) {
            // row = JSON.parse(items[url]);
            rows[url] = items[url];
        }
        // rows = JSON.stringify(rows);
        // console.log("Writing to local storage: " + JSON.stringify(rows));
        chrome.storage.local.set(rows, function() {
            // console.log("Done writing locally");
            chrome.storage.sync.clear(cb);            
        });    

        // rows = [];
        // for (url in items) {
        //     new_row = JSON.parse(items[url]);;
        //     new_row[url] = url;
        //     rows.push(new_row);
        // }

        // db_interface.write(TABS_TABLE, rows, function(err) {
        //     if (!err) chrome.storage.sync.clear(cb);
        //     else cb();
        // });
    });
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
            new_val = changes[key];
            if (Array.isArray(changes[key])) {
                if (changes[key].length == 0) {
                    new_val = null;
                } else {
                    new_val = changes[key][0];
                }
            } 

            if (old_val && new_val) {
                old_val.push(new_val);
                new_row[key] = old_val;
            } else if (new_val) {
                new_row[key] = [new_val];
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

function updateTab(tab_id, update, dump=false, url=null) {
    let tab_url = url;
    if (!tab_url) {
        tab_url = getTabURL(tab_id);
    }

    if (!tab_url) {
        console.log("Null URL for tab_id: " + tab_id +
                    ", updates: " + JSON.stringify(update));
        return false;
    }

    if (DISALLOWED_TABS.includes(tab_url)) {
        console.log("Not writing " + tab_url);
        return false;
    }

    // console.log("Cache tab url: " + tab_url);
    chrome.storage.sync.get(tab_url, function(items) {
        if (items && Object.keys(items).length > 0) {
            // console.log("Row to update: " + tab_url + ": " + items[tab_url]);
            writeTab(tab_url, JSON.parse(items[tab_url]),
                     update, dump);
        } else {
            writeTab(tab_url, null, update, dump);
        }
    });
    return true;      
}

function createTab(tab, pagein=false) {
    tags = getTags(tab.url);
    created = [Date.now()];
    pagein = pagein ? Date.now() : [];

    new_row = {
        category: tags,
        created: created,
        closed: [],
        visits: [],
        pageout: [],
        pagein: pagein
    };

    success = updateTab(tab_id=null, new_row, dump=false, url=tab.url);
    // writeTab(tab.url, null, new_row);
    if (success) {
        addTabEntry(tab.id, tab.url);
    }
}

function visitTab(tab_id) {
    success = updateTab(tab_id, {visits: Date.now()}, dump=false);
    if (success) {
        bumpTabEntry(tab_id);        
    }
}

function closeTab(tab_id) {
    success = updateTab(tab_id, {closed: Date.now()});
    if (success) {
        removeTabEntry(tab_id);        
    }
}

function getAllStoreTabs(cb) {
    chrome.storage.sync.get(null, cb);
}