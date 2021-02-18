/*
 * File containing methods to interact with Store.
 *
 * Tabs Stats store format:
 *
 * epoch_ts (Date, <primary key>)
 *
 * url (string)
 * event_type (string (created / closed / entered / exited))
 * platform (string)
 *
 */

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

all_tabs = {}

// Tab API methods.
// Get all existing tabs
chrome.tabs.query({}, function(results) {
    results.forEach(function(tab) {
        all_tabs[tab.id] = tab;
    });
});

/*
function clearStore(cb, clear_store=true) {
    // Fetch everything from sync.store and then flush to them to the DB, after
    // which, clear the sync.store.
    getAllStoreTabs(function(items) {
        payload = "";
        rows = [];
        store_rows = {};
        for (url in items) {
            new_row = JSON.parse(items[url]);
            new_row["url"] = url;
            rows.push(new_row);

            store_rows[url] = items[url];

            payload += url + ":" + items[url] + "\n";
        }

        rows = JSON.stringify(rows);
        // console.log("Writing to local storage: " + rows);

        chrome.storage.local.set(store_rows, function() {
            // console.log("Done writing locally");
            postWebRequest("http://localhost:8080/dump", rows);
            if (clear_store) {
                chrome.storage.sync.clear(cb);
            }
        });

        // db_interface.write(TABS_TABLE, rows, function(err) {
        //     if (!err) chrome.storage.sync.clear(cb);
        //     else cb();
        // });
    });
}*/

function gcStore(db=null) {
    getAllStoreTabs(function(items) {
        rows = [];
        del_keys = [];
        prefix = "stats";
        suffix_start = prefix.length;
        for (key in items) {
            if (!key.startsWith("stats")) {
                continue;
            }

            new_row = JSON.parse(items[key]);
            new_row["ts"] = key.substring(suffix_start);
            rows.push(new_row);

            del_keys.push(key);
        }

        console.log("Rows = " + JSON.stringify(rows));
        if (db) {
          // Send to DB here
        }

        // Delete the keys from the store.
        removeStoreTabs(del_keys);
    });
}

function writeTab(ts, url, event_type, platform, dump=false) {
    new_row = {
        url: url,
        event_type: event_type,
        platform: platform,
    };
    new_row_json = JSON.stringify(new_row);
    payload = {};
    key = "stats" + ts
    payload[key] = new_row_json;
    chrome.storage.sync.set(payload, function() {
        let log_payload = payload;
        if (dump) {
            // dumpStore();
            gcStore();
        }
        // console.log('Written ' + JSON.stringify(log_payload));
    });
}

function updateTab(tab_id, event_type, dump=false, url=null) {
    let tab_url = url;
    if (!tab_url) {
        tab_url = getTabURL(tab_id);
    }

    if (!tab_url) {
        console.log("Null URL for tab_id: " + tab_id +
                    ", event_type: " + event_type);
        return false;
    }

    if (DISALLOWED_TABS.includes(tab_url)) {
        console.log("Not writing " + tab_url);
        return false;
    }


    writeTab(Date.now(), tab_url, event_type, "Chrome", dump);
    return true;
}

function createTab(tab) {
    all_tabs[tab.id] = tab;
    success = updateTab(tab_id=null, "created", dump=false, url=tab.url);
}

function visitTab(tab_id) {
    success = updateTab(tab_id, "entered", dump=false);
}

function closeTab(tab_id) {
    success = updateTab(tab_id, "closed", dump=false);
    delete all_tabs[tab_id];
}

function getTabURL(tab_id) {
    if (tab_id in all_tabs) {
        return all_tabs[tab_id].url;
    }

    return null;
}

function getTab(tab_id, cb) {
    chrome.tabs.get(tab_id, cb);
}

function getAllStoreTabs(cb) {
    chrome.storage.sync.get(null, cb);
}

function removeStoreTabs(keys) {
    chrome.storage.sync.remove(keys, function() {});
}
