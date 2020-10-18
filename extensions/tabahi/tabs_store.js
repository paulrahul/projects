/*
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

// Tab API methods.

function writeTab(url, old_row, changes, dump=false) {
    new_row = old_row ? old_row : changes;
    if (old_row) {
        for (key in changes) {
            old_val = (key in old_row) ? old_row[key] : null;
            new_row[key] = (old_val && old_val.length > 0) ?
                           [old_val, changes[key]] : [changes[key]];
        }
    }
    new_row_json = JSON.stringify(new_row);
    payload = {};
    payload[url] = new_row_json;
    chrome.storage.sync.set(payload, function() {
        if (dump) {
            dumpStore();
        }
        // console.log('Value of ' + url + ' is set.');
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
}

function visitTab(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        chrome.storage.sync.get(tab.url, function(items) {
            for (i in items) {
                writeTab(tab.url, JSON.parse(items[i]),
                        {visits: Date.now()}, dump=true);
            }
        });
    });
}

function closeTab(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        // TODO(BUG): Won't be able to get the tab from the tabs list
        // since it's gone.
        chrome.storage.sync.remove(tab.url, function() {
        });
    });
}