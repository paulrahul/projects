/****
 * File containing code to maintain various caches and states related to the
 * tabs.
 */

TEST_MODE = false;

GC_INTERVAL_MINS = 30;
MIN_TAB_FOCUS_TIME_SECS = 5;  // Must be <= GC_INTERVAL_MINS
NUM_MIN_TABS = 3;  // Minimum number of tabs to retain.

last_gc_ts = null;

last_visited_tab = null;  // {id, ts}

// Tabs LRU linked list has nodes of the following structure:
// { url: <tab_url>, next: <next node id>, prev: <previous node id> }
//
// Head -> LRU tab node id.
// Tail -> Most recently used tab node id.
tab_lru_cache = {};  // { tab_id: {url, next, prev} }
head_id = null;
tail_id = null;

// Cache internal or utility methods.

function millisToSec(ms) {
    return Math.floor(ms / 1000);
}

function millisToMin(ms) {
    return Math.floor(millisToSec(ms) / 60);
}

function getCache() {
    return {
        cache: tab_lru_cache,
        head_id: head_id,
        tail_id: tail_id,
        last_visited_tab: last_visited_tab,
        last_gc_ts: last_gc_ts
    };
}

function setCache(store_cache) {
    if (!store_cache) {
        console.log("Store cache is null!!");
        return;
    }
    tab_lru_cache = store_cache.cache;
    head_id = store_cache.head_id;
    tail_id = store_cache.tail_id;
    last_visited_tab = store_cache.last_visited_tab;
    last_gc_ts = store_cache.last_gc_ts;
}

function reloadCache() {
    if (TEST_MODE) {
        return;
    }
    if (!last_visited_tab) {
        console.log("Reloading cache..");
        chrome.storage.sync.get("cache", function (items) {
            for (i in items) {
                setCache(JSON.parse(items[i]));
            }
        }); 
    }
}

function flushCache() {
    chrome.storage.sync.set({"cache": JSON.stringify(getCache())}, function() {
    });
    clearCache();
}

function clearCache() {
    if (!tab_lru_cache) {
        console.log("tab_lru_cache is null!!");
        return;
    }
    keys = Object.keys(tab_lru_cache);
    for (k in keys) {
        delete tab_lru_cache[k];
    }
    head_id = tail_id = null;
    last_visited_tab = null;
    last_gc_ts = null;
}

function removeNode(tab_id) {
    if (!tab_id in tab_lru_cache) {
        console.log("Could not find tab_id " + tab_id + " in tab_lru_cache");
        return;
    }

    // Link the previous and next nodes.
    prev_id = tab_lru_cache[tab_id].prev;
    next_id = tab_lru_cache[tab_id].next;

    if (prev_id) {
        tab_lru_cache[prev_id].next = next_id;
    }

    if (next_id) {
        tab_lru_cache[next_id].prev = prev_id;
    }
}

function moveToTail(tab_id) {
    if (tab_id == tail_id) {
        return;
    }
    tab_lru_cache[tail_id].next = tab_id;
    tab_lru_cache[tab_id].prev = tail_id;
    tab_lru_cache[tab_id].next = null;
    tail_id = tab_id;
}

function getLastVisitedTabId () {
    return last_visited_tab.id;
}

function setLastVisitedTabId (tab_id, ts=null) {
    ts = ts ? ts : Date.now();
    last_visited_tab = {id: tab_id, ts: ts};
}

function setLastGCTs(ts=null) {
    ts = ts ? ts : Date.now();
    last_gc_ts = ts;  
}

function getTabURL(tab_id) {
    reloadCache();

    if (tab_id in tab_lru_cache) {
        return tab_lru_cache[tab_id].url;
    }

    return null;
}

// Cache CRUD methods.

function addTabEntry(tab_id, tab_url, now=null) {
    reloadCache();
    if (tab_id in tab_lru_cache) {
        console.log("Suspicious input; key " + tab_id + " already in cache " +
                    "with value: " + JSON.stringify(tab_lru_cache[tab_id]));
        return;
    }
    tab_lru_cache[tab_id] = {url: tab_url, next: null, prev: null};
    if (!head_id) {
        head_id = tail_id = tab_id;
    } else {
        moveToTail(tab_id);
    }

    setLastVisitedTabId(tab_id, now);    
}

function bumpTabEntry(tab_id, now=null) {
    reloadCache();

    // First check if the previous tab was in focus for enough time to deserve
    // a promotion.
    now = now ? now : Date.now();
    if (millisToSec(now - last_visited_tab.ts) > MIN_TAB_FOCUS_TIME_SECS) {
        // Move previous tab to tail.
        last_tab_id = getLastVisitedTabId();
        // console.log("current tab: " + tab_id + ", last tab: " + last_tab_id);
        if (last_tab_id != tail_id) {
            // console.log("Moving " + last_tab_id + " to tail.");
            removeNode(last_tab_id);
            moveToTail(last_tab_id);    
        }
    } else {
        // console.log("Tab " + getLastVisitedTabId() + " was not on focus.");
    }

    setLastVisitedTabId(tab_id, ts=now);
    // printCache();
}

function removeTabEntry(tab_id, now=null) {
    reloadCache();

    if (head_id == tab_id) {
        // Head is being removed. Time to reassign head.
        head_id = tab_lru_cache[tab_id].next;
    } else if (tail_id == tab_id) {
        // Tail is being removed. Time to reassign tail.
        tail_id = tab_lru_cache[tab_id].prev;
    }
    removeNode(tab_id);
    delete tab_lru_cache[tab_id];    
    setLastVisitedTabId(tab_id, now);
}

// Cache GC methods.

function getTabsForGC(force=false) {
    reloadCache();

    // First check if enough time has passed since last GC unless this is a
    // force GC.
    if (!force && last_gc_ts) {
        now = Date.now();
        time_since_last_gc = millisToMin(now - last_gc_ts);
        if (time_since_last_gc < GC_INTERVAL_MINS) {
            console.log("Not enough time since last GC. " +
                        "Time since last GC(mins): " + time_since_last_gc);
            return {};
        }
    }

    // Cull the oldest tabs keeping back up to NUM_MIN_TABS.
    // Do not cull the current tab.

    num_tabs = Object.keys(tab_lru_cache).length;
    if (num_tabs <= NUM_MIN_TABS) {
        console.log("Not enough tabs to cull!");
        return {};
    }

    tabs_to_cull = {};
    num_tabs_to_cull = num_tabs - NUM_MIN_TABS;
    curr_id = head_id;
    last_tab_id = getLastVisitedTabId();
    for (i = 0; i < num_tabs_to_cull && curr_id; ++i) {
        if (last_tab_id == curr_id) {
            // Do not cull the current tab.
            i--;
        } else {
            tabs_to_cull[curr_id] = tab_lru_cache[curr_id].url;
        }
        curr_id = tab_lru_cache[curr_id].next;
    }

    return tabs_to_cull;
}

function GC(force=false) {
    console.log("Performing GC...");
    // Cull the oldest tabs keeping back up to NUM_MIN_TABS.
    // Do not cull the current tab.
    tabs_to_cull = getTabsForGC(force);

    if (tabs_to_cull) {
        for (tab_id in tabs_to_cull) {
            removeTabEntry(tab_id);
        }
    }

    last_gc_ts = Date.now();
}

// Test

function printCache() {
    curr_id = head_id;

    ret = '';
    i = 0;
    while (curr_id) {
        // ret += (JSON.stringify(tab_lru_cache[curr_id]) + ", ");
        ret += (curr_id + ", ");        
        curr_id = tab_lru_cache[curr_id].next;
        i++;
    }

    ret += "head_id: " + head_id + ", tail_id: " + tail_id;

    console.log(ret);
}

function test() {
    TEST_MODE = true;

    now = 1000;
    for (i = 0; i < 5; ++i) {
        addTabEntry(i + 1, String.fromCharCode('A'.charCodeAt() + i), now);
    }
    // Expected (h) 1, 2, 3, 4, 5 (t)
    // printCache();

    bumpTabEntry(4, now + 6000); // Tab 5 in focus (6 secs)
    bumpTabEntry(3, now + 13000);  // Tab 4 in focus (7 secs)
    bumpTabEntry(2, now + 16000);  // Tab 3 not in focus (3 secs)
    // Expected (h) 1, 2, 3, 5, 4 (t)
    printCache();

    GC(force=true);
    // So 2 tabs to be culled. Only Tab 1 will be culled since tab 2 is
    // currently in focus.
    // Expected (h) 2, 3, 5, 4 (t)    
    printCache();

    // Add back Tab 1 and then run GC. This time, Tabs 2 and 3 should be culled,
    // since they are oldest now and current tab is 1.
    // Expected (h) 5, 4, 1 (t) 
    addTabEntry(1, "A", now + 16001);
    GC(force=true);
    printCache();

    // clearCache();
    // printCache();

    // addTabEntry(1, "A");
    // removeTabEntry(1);
    // printCache();

    // addTabEntry(1, "A");
    // addTabEntry(2, "B");    
    // removeTabEntry(1);
    // printCache();

    // addTabEntry(1, "A");
    // addTabEntry(2, "B");    
    // removeTabEntry(2);
    // printCache();
}

// test();
// console.log("Test done!");