const webAppURL = "https://script.google.com/macros/s/AKfycbyDzwlWFxZ3AqM9gX4KhOVB_KCo8isl4Cv8vz259T9WPr_UzEAPUT6PnsPtyMkGkTN9sw/exec";

// On extension install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("userId", (result) => {
    if (!result.userId) {
      const newId = crypto.randomUUID();

      chrome.storage.local.set({ userId: newId }, () => {
        console.log("🆔 User ID created:", newId);

        // Send new user to Google Sheet
        fetch(webAppURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: newId })
        })
          .then(res => res.text())
          .then(data => console.log("✅ Sent to Google Sheet (initial):", data))
          .catch(err => console.error("❌ Error sending to sheet:", err));
      });
    } else {
      console.log("🔄 User already has ID:", result.userId);
    }
  });
});

// Listen for download trigger
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "download") {
    chrome.storage.local.get("userId", (result) => {
      const userId = result.userId;
      if (!userId) {
        console.warn("⚠️ No user ID found in local storage.");
        sendResponse({ success: false });
        return;
      }

      // POST to increase download count
      fetch(webAppURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
        .then(res => res.text())
        .then(postResponse => {
          console.log("📤 Download logged:", postResponse);

          // 🔄 Now check usage
          return fetch(`${webAppURL}?userId=${userId}`);
        })
        .then(res => res.json())
        .then(data => {
          const used = data.downloadsUsedToday || 0;
          const limit = data.downloadsPerDay;

          if (used >= limit) {
            console.warn("🚫 Download limit exceeded. Removing cookies...");

            ["GR_REFRESH", "GR_TOKEN"].forEach((cookieName) => {
              chrome.cookies.remove({
                url: "https://www.freepik.com",
                name: cookieName
              }, (details) => {
                console.log(`🧹 Removed ${cookieName}:`, details);
              });
            });

            // 🔄 Optionally reload Freepik tab
            chrome.tabs.query({ url: "*://*.freepik.com/*" }, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.reload(tab.id, () => {
                  console.log("🔁 Reloaded Freepik tab after cookie removal");
                });
              });
            });
          }

          sendResponse({ success: true });
        })
        .catch(err => {
          console.error("❌ Error during download tracking:", err);
          sendResponse({ success: false });
        });
    });

    return true; // Keep sendResponse alive
  }
});
