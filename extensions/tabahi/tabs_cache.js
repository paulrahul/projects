/****
 * File containing code to maintain various caches and states related to the
 * tabs.
 */

GC_INTERVAL_MINS = 1;
MIN_TAB_FOCUS_TIME_SECS = 5;  // Must be <= GC_INTERVAL_MINS
NUM_MIN_TABS = 3;  // Minimum number of tabs to retain.

last_visited_tab = null;  // {id, ts}
last_gc_ts = null;

// Tabs LRU linked list has nodes of the following structure:
// { url: <tab_url>, next: <next node id>, prev: <previous node id> }
//
// Head -> LRU tab node id.
// Tail -> Most recently used tab node id.
tab_lru_cache = {};  // { tab_id: {url, next, prev} }
head_id = null;
tail_id = null;

function millisToMin(ms) {
    return Math.floor(ms / 60000);
}

function moveToTail(tab_id) {
    tab_lru_cache[tail_id].next = tab_id;
    tab_lru_cache[tab_id].prev = tail_id;
    tail_id = tab_id;
}

function addTabEntry(tab_id, tab_url) {
    tab_lru_cache[tab_id] = {url: tab_url, next: null, prev: null};
    if (!head_id) {
        head_id = tail_id = tab_id;
    } else {
        moveToTail(tab_id);
    }

    setLastVisitedTabId(tab_id);    
}

function bumpTabEntry(tab_id) {
    // First check if the previous tab was in focus for enough time to deserve
    // a promotion.
    now = Date.now();
    if (millisToMin(now - last_visited_tab.ts) > MIN_TAB_FOCUS_TIME_SECS) {
        // Move previous tab to tail.
        last_tab_id = getLastVisitedTabId();
        tab_lru_cache[last_tab_id].prev.next = tab_lru_cache[last_tab_id].next;
        moveToTail(last_tab_id);
    }

    setLastVisitedTabId(tab_id, ts=now);    
}

function removeTabEntry(tab_id) {
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

    setLastVisitedTabId(tab_id);
    delete tab_lru_cache[tab_id];
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