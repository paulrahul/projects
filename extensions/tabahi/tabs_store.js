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

TAGS = {
    "work" : ["nutanix", "smartsheet", "https://drive.google.com/drive/u/1/",
              "docs.google.com"],
    "communication": ["mail"]
};

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

function writeTab(url, old_row, changes) {
    new_row = changes;
    if (old_row != null) {
        for (key in changes) {
            old_val = (key in old_row) ? old_row[key] : null;
            new_row[key] = (old_val) ? old_val + changes[key] : changes[key];
        }
    }
    new_row_json = JSON.stringify(new_row);
    payload = {};
    payload[url] = new_row_json;
    chrome.storage.sync.set(payload, function() {
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