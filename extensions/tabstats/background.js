chrome.runtime.onInstalled.addListener(function(details) {
    bootStrap();
})

chrome.runtime.onStartup.addListener(function() {
    bootStrap();
})

chrome.runtime.onSuspend.addListener(function() {
    gcStore();
})

chrome.windows.onFocusChanged.addListener(function(window_id) {
    if (window_id == chrome.windows.WINDOW_ID_NONE) {
        // Chrome has lost focus; flush the pending events.
        unFocusChrome();
        gcStore();
    }
})
