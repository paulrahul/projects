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

// Tab API methods.

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

function writeTab(ts, url, event_type, platform, dump=false) {
    new_row = {
        ts: ts,
        event_type: event_type,
        platform: platform,
    };
    new_row_json = JSON.stringify(new_row);
    payload = {};
    payload[url] = new_row_json;
    chrome.storage.sync.set(payload, function() {
        if (dump) {
            dumpStore();
        }
        console.log('Value of ' + url + ' is set to ' + new_row_json);
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

function createTab(tab, pagein=false) {
    success = updateTab(tab_id=null, "created", dump=false, url=tab.url);
}

function visitTab(tab_id) {
    success = updateTab(tab_id, "entered", dump=false);
}

function closeTab(tab_id) {
    success = updateTab(tab_id, "closed");
}

function getTabURL(tab_id) {
  getTab(tab_id, function(tab) {
    return tab.url;
  });
}

function getTab(tab_id, cb) {
    chrome.storage.sync.get(tab_id, cb);
}

function getAllStoreTabs(cb) {
    chrome.storage.sync.get(null, cb);
}
