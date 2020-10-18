chrome.runtime.onInstalled.addListener(function(details) {
    chrome.tabs.query({}, function(tabs) {
        bootStrap(tabs);
    });
})