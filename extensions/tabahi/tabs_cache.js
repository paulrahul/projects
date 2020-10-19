/****
 * File containing code to maintain various caches and states related to the
 * tabs.
 */

GC_INTERVAL_MINS = 1;
MIN_TAB_FOCUS_TIME_SECS = 5;  // Must be <= GC_INTERVAL_MINS
NUM_MIN_TABS = 3;  // Minimum number of tabs to retain.

last_visited_tab = null;  // {id, ts}

// Tabs LRU linked list has nodes of the following structure:
// { url: <tab_url>, next: <next node id>, prev: <previous node id> }
//
// Head -> LRU tab node id.
// Tail -> Most recently used tab node id.
tab_lru_cache = {};  // { tab_id: {url, next, prev} }
head_id = null;
tail_id = null;

function millisToSec(ms) {
    return Math.floor(ms / 1000);
}

function millisToMin(ms) {
    return Math.floor(millisToSec(ms) / 60);
}

function moveToTail(tab_id) {
    tab_lru_cache[tail_id].next = tab_id;
    tab_lru_cache[tab_id].prev = tail_id;
    tail_id = tab_id;
}

function addTabEntry(tab_id, tab_url, now=null) {
    tab_lru_cache[tab_id] = {url: tab_url, next: null, prev: null};
    if (!head_id) {
        head_id = tail_id = tab_id;
    } else {
        moveToTail(tab_id);
    }

    setLastVisitedTabId(tab_id, now);    
}

function bumpTabEntry(tab_id, now=null) {
    // First check if the previous tab was in focus for enough time to deserve
    // a promotion.
    now = now ? now : Date.now();
    if (millisToSec(now - last_visited_tab.ts) > MIN_TAB_FOCUS_TIME_SECS) {
        // Move previous tab to tail.
        last_tab_id = getLastVisitedTabId();
        tab_lru_cache[last_tab_id].prev.next = tab_lru_cache[last_tab_id].next;
        moveToTail(last_tab_id);
    } else {
        console.log("Tab " + getLastVisitedTabId() + " was not on focus.");
    }

    setLastVisitedTabId(tab_id, ts=now);    
}

function removeTabEntry(tab_id, now=null) {
    if (head_id == tab_id) {
        // Head is being removed. Time to reassign head.
        head_id = tab_lru_cache[tab_id].next;
    } else {
        tab_lru_cache[tab_id].prev.next = tab_lru_cache[tab_id].next;
    }

    if (tail_id == tab_id) {
        // Tail is being removed. Time to reassign tail.
        tail_id = tab_lru_cache[tab_id].prev;
    }

    delete tab_lru_cache[tab_id];    
    setLastVisitedTabId(tab_id, now);
}

function GC() {
    // Cull the oldest tabs keeping back up to NUM_MIN_TABS.
    // Do not cull the current tab.

    num_tabs = Object.keys(tab_lru_cache.length).length;
    if (num_tabs <= MIN_TAB_FOCUS_TIME_SECS) {
        console.log("No enough tabs to cull!");
        return;
    }

    num_tabs_to_cull = num_tabs - NUM_MIN_TABS;
    last_tab_id = getLastVisitedTabId();
    for (i = 0; i < num_tabs_to_cull; ++i) {
        if (head_id != last_tab_id) {
            removeTabEntry(head_id);
        }
    }
}

function getLastVisitedTabId () {
    return last_visited_tab.id;
}

function setLastVisitedTabId (tab_id, ts=null) {
    ts = ts ? ts : Date.now();
    last_visited_tab = {id: tab_id, ts: ts};
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

    console.log(ret);
}

function test() {
    now = 1000;
    for (i = 0; i < 5; ++i) {
        addTabEntry(i + 1, String.fromCharCode('A'.charCodeAt() + i), now);
    }
    printCache();

    bumpTabEntry(4, now + 1000);
    bumpTabEntry(3, now + 1500);
    bumpTabEntry(2, now + 1600);    
    printCache();
}

test();