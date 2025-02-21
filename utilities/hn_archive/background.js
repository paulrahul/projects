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

chrome.action.onClicked.addListener(async (tab) => {
    // Show busy state
    chrome.action.setBadgeText({ text: "🔍", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#FF5733" });

    try {

        let hnStoryId = await getHNEntry(tab.url);
        
        if (hnStoryId) {
            let archiveLink = await getArchiveLink(hnStoryId);
            
            if (archiveLink) {
                chrome.tabs.create({ url: archiveLink, index: tab.index + 1 });
            } else {
                console.log("No archive link found for this article.");
            }
        } else {
            console.log("No Hacker News entry found for this article.");
        }

    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred.");
    }

    // Clear busy state
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
});
