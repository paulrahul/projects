chrome.runtime.onInstalled.addListener(function(details) {
    bootStrap();
})

chrome.runtime.onStartup.addListener(function() {
    bootStrap();
})

chrome.runtime.onSuspend.addListener(function() {
    flushToStore();
})
