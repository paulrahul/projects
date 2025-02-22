// chrome.runtime.sendMessage({ request: "getSummary" }, (response) => {
//     if (response && response.summary) {
//         document.getElementById("summary").innerText = response.summary;
//     } else {
//         document.getElementById("summary").innerText = "Failed to fetch summary.";
//     }
// });

chrome.runtime.onMessage.addListener((message) => {
    if (message.summary) {
        document.getElementById("summary").innerText = decodeHTMLEntities(message.summary);
    }
});

function decodeHTMLEntities(text) {
    let textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}

