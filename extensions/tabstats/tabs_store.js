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

DISALLOWED_TABS = ["chrome://newtab/", "chrome://extensions/"];
SAME_DOMAIN_EXCEPTIONS = ["reddit.com"];

LAST_TAB_URL = null;

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
function loadAllTabs(){
    chrome.tabs.query({}, function(results) {
        results.forEach(function(tab) {
            all_tabs[tab.id] = tab;
        });
    });
}

function sendToDB(rows, cb) {
    rows = JSON.stringify(rows);
    // console.log("Writing to local storage: " + rows);
    postWebRequest("http://localhost:8080/dump", rows, cb);
}

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

        if (rows.length > 0) {
            // console.log("Rows = " + JSON.stringify(rows));
            sendToDB(rows, function(status, res) {
                if (status == 200) {
                    // Delete the keys from the store.
                    removeStoreTabs(del_keys);
                } else {
                    console.log("Dumping of " + rows + " failed with: " +
                                status + "; " + res);
                }
            });
        }
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

function tabAllowed(tab_url) {
    if (DISALLOWED_TABS.includes(tab_url)) {
        return false;
    }

    if (tab_url.includes("onetab")) {
      return false;
    }

    if (tab_url.includes("localhost:8080")) {
      return false;
    }

    return true;
}

function getDomain(src_url) {
    if (!src_url) {
        return src_url;
    }

    const url = new URL(src_url);
    return url.hostname;
}

function domainChangeAllowed(domain) {
    for (domain_exc in SAME_DOMAIN_EXCEPTIONS) {
        if (domain.includes(domain_exc)) {
            return true;
        }
    }

    return false;
}

function subRedditChanged(old_url, new_url) {
    const regex = /.*reddit.com\/r\/(\w+)/;

    old_sr = old_url.match(regex)[1];
    new_sr = new_url.match(regex)[1];

    return old_sr != new_sr;
}

function recordTabEvent(tab_id, event_type, ts, dump=false, url=null) {
    let tab_url = url;
    if (!tab_url) {
        tab_url = getTabURL(tab_id);
    }
    
    if (event_type == "created" || event_type == "entered") {
        LAST_TAB_URL = tab_url;
    } else if (event_type == "closed" || event_type == "exited") {
        LAST_TAB_URL = null
    }

    if (!tab_url) {
        // console.log("Null URL for tab_id: " + tab_id +
        //             ", event_type: " + event_type);
        return true;
    }

    if (!tabAllowed(tab_url)) {
        // console.log("Not writing " + tab_url);
        return true;
    }

    writeTab(ts, tab_url, event_type, "Chrome", dump);
    return true;
}

function createTab(tab) {
    all_tabs[tab.id] = tab;
    return recordTabEvent(
      tab_id=null, "created", ts=Date.now(), dump=false, url=tab.url);
}

function updateTab(tab) {
    // If the website domain hasn't changed, then we won't log this event, for
    // most cases. Exceptions - reddit, if the subreddit changes.

    new_domain = getDomain(tab.url);
    old_url = getLastTabURL();
    old_domain = getDomain(old_url);
    LAST_TAB_URL = tab.url
    if (new_domain && old_domain && new_domain == old_domain) {
        if (!domainChangeAllowed(new_domain)) {
            return;
        }
    }

    if (!old_domain || new_domain != old_domain) {
        // New domain altogether; record a create event.
        // console.log("Calling closed in updateTab for: " + old_url);
        if (recordTabEvent(
          tab_id=null, "closed", ts=Date.now(), dump=false, url=old_url)) {
            success = createTab(tab);
        }
    } else if (new_domain.includes("reddit.com") &&
               subRedditChanged(old_url, tab.url)) {
        visitTab(tab.id);
    }
}

function visitTab(visited_tab_id) {
    // console.log("Calling exited in visitTab");

    last_url = getLastTabURL()
    success =  (
        (last_url && recordTabEvent(
            tab_id=null, "exited", ts=Date.now(), dump=false, url=last_url)) ||
        (!last_url && true))

    // TODO: Bug here since we record the exit event without ensuring if the
    // entered event will go through or not. Both exited and entered should be
    // atomically committed. 
    if (success) {
        return recordTabEvent(
            visited_tab_id, "entered", ts=Date.now(), dump=false);
    }
}

function closeTab(tab_id) {
    success = recordTabEvent(tab_id, "closed", ts=Date.now(), dump=false);
    delete all_tabs[tab_id];
}

function unFocusChrome() {
    // Record last tab as having been exited.
    // console.log("Calling exited in unFocusChrome");
    success = recordTabEvent(
      tab_id=null, "exited", ts=Date.now(), dump=false, url=getLastTabURL());
    LAST_TAB_URL = null;
}

function getTabURL(tab_id) {
    if (Object.keys(all_tabs).length == 0) {
      loadAllTabs()
    }

    // console.log(tab_id + ", " + Object.keys(all_tabs));

    if (tab_id in all_tabs) {
        return all_tabs[tab_id].url;
    }

    return null;
}

function getLastTabURL(tab_id=null) {
    if (LAST_TAB_URL) {
        return LAST_TAB_URL;
    } else if (tab_id) {
        LAST_TAB_URL = getTabURL(tab_id);
    }

    // TODO: Fetch last tab url from DB
    return LAST_TAB_URL;
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
