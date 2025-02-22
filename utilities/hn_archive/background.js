// Create the context menu on extension startup
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "hackedNewsPost",
        title: "Hacked News post",
        contexts: ["all"] // Show on all pages
    });
});

async function getHNEntry(url) {
    async function searchHN(query) {
        let searchUrl = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story`;
        let response = await fetch(searchUrl);
        let data = await response.json();
        return data.hits.length > 0 ? data.hits[0].objectID : null;
    }

    let hnStoryId = await searchHN(url);
    
    // If no result, retry by stripping query parameters from the URL
    if (!hnStoryId) {
        let cleanUrl = url.split("?")[0];  // Remove query params
        hnStoryId = await searchHN(cleanUrl);
    }

    return hnStoryId;
}

async function getArchiveLink(hnStoryId) {
    let hnUrl = `https://news.ycombinator.com/item?id=${hnStoryId}`;
    let response = await fetch(hnUrl);
    let text = await response.text();

    // Decode HTML entities (e.g., &#x2F; → /)
    function decodeHtmlEntities(encodedStr) {
        return encodedStr.replace(/&#x2F;/g, "/");
    }

    // Search for an archive link in the HTML
    let archiveLinkMatch = text.match(/href="(https?:&#x2F;&#x2F;archive\.[a-z]+&#x2F;[^"]+)"/i);

    if (archiveLinkMatch) {
        let encodedLink = archiveLinkMatch[1];  // Extract encoded URL
        return decodeHtmlEntities(encodedLink); // Decode and return the proper URL
    }

    return null;
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: title,
        message: message
    });
}

function sendErrorReport(error) {
    const reportData = {
        access_key: "0b16b735-8eea-4343-ae9c-d607e1a00e79",
        subject: "HaNe Error Report",
        message: `Error: ${error.toString()}\nStack: ${error.stack || "No stack trace"}\nTime: ${new Date().toISOString()}`,
        replyTo: "hane.extension@gmail.com"
    };

    fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
    })
    .then(response => console.log("Error report sent:", response.status))
    .catch(err => console.error("Failed to send error report:", err));
}

async function doWithRetries(fn, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();  // Call the function passed as argument
        } catch (error) {
            if (attempt === retries) {
                showNotification("Error", "Encountered repeated errors, please retry later. Last error:" + error);
                sendErrorReport(error);
            } else {
                showNotification("Error", "An error occurred, retrying...");
            }
        }
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    // Show busy state
    chrome.action.setBadgeText({ text: "🔍", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#FF5733" });

    await doWithRetries(async () => {
        let hnStoryId = await getHNEntry(tab.url);
        
        if (hnStoryId) {
            let archiveLink = await getArchiveLink(hnStoryId);
            
            if (archiveLink) {
                chrome.tabs.create({ url: archiveLink, index: tab.index + 1 });
            } else {
                showNotification("No Archive Link Found", "No archive link found for this article");
            }
        } else {
            showNotification("Not Found", "No Hacker News post found for this link");
        }
    });

    // Clear busy state
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "hackedNewsPost") {

        await doWithRetries(async () => {
            let hnStoryId = await getHNEntry(tab.url);
            
            if (hnStoryId) {
                let hnUrl = `https://news.ycombinator.com/item?id=${hnStoryId}`;
                chrome.tabs.create({ url: hnUrl, index: tab.index + 1 });
            } else {
                showNotification("Not Found", "No Hacker News post found for this link");
            }
        });
    }
});
