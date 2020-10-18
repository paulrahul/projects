// Functions

function bootStrap(tabs) {
    tabs.forEach(tab => {
        createTab(tab);
    });

    chrome.storage.sync.get(null, function(items) {
        console.log('Retrived the following: ');
        for (i in items) {
            console.log(i + ": " + items[i]);
        }
    });
}

function log_tabs(tabs) {
    tabs.forEach(element => {
        console.log(element.url);
    });
}


// Listeners.

