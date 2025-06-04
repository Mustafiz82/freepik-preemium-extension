console.log("🔍 Detected Freepik website");

const webAppURL = "https://script.google.com/macros/s/AKfycbyDzwlWFxZ3AqM9gX4KhOVB_KCo8isl4Cv8vz259T9WPr_UzEAPUT6PnsPtyMkGkTN9sw/exec";

// ✅ On Page Load → Check download limit
chrome.storage.local.get("userId", (result) => {
  const userId = result.userId;
  if (!userId) return;

  fetch(`${webAppURL}?userId=${userId}`)
    .then(res => res.json())
    .then(data => {
      const used = parseInt(data.downloadsUsedToday) || 0;
      const limit = parseInt(data.downloadsPerDay) || 15;

      if (used >= limit) {
        console.warn(`🚫 Limit exceeded: ${used}/${limit}. Removing cookies...`);

        ["GR_REFRESH", "GR_TOKEN"].forEach(name => {
          chrome.runtime.sendMessage({ type: "removeCookie", cookieName: name }, (res) => {
            console.log(`🧹 Removed ${name}`, res);
          });
        });

        const banner = document.createElement("div");
        banner.innerText = "🚫 Download limit exceeded. Premium access disabled.";
        banner.style.cssText = "position:fixed;top:0;left:0;width:100%;z-index:9999;padding:10px;background:#c00;color:#fff;font-weight:bold;text-align:center";
        document.body.appendChild(banner);
      }
    })
    .catch(err => {
      console.error("❌ Failed to check limit:", err);
    });
});

// ✅ Monitor buttons (Download & Generate)
function monitorDownloadButtons() {
  const buttons = getFilteredDownloadButtons();
  buttons.forEach((btn) => addDownloadListener(btn));
  observeForButtons(); // one observer for both types
}

function getFilteredDownloadButtons() {
  const excluded = ['dropdown-download-type', 'dropdown-download-options'];
  return Array.from(document.querySelectorAll('[data-cy*="download"]')).filter(
    (btn) => !excluded.includes(btn.getAttribute('data-cy'))
  );
}

function addDownloadListener(button) {
  if (!button.dataset.listenerAdded) {
    button.addEventListener("click", () => {
      console.log("✅ Download button clicked:", button);

      chrome.runtime.sendMessage({ type: "download" }, (response) => {
        if (response?.success) {
          console.log("📤 Download logged to Google Sheet");
        } else {
          console.warn("⚠️ Failed to log download or hit limit");
        }
      });
    });

    button.dataset.listenerAdded = "true";
  }
}

// ✅ Unified observer for download + generate buttons
function observeForButtons() {
  const observer = new MutationObserver(() => {
    // Handle download buttons
    const downloadButtons = getFilteredDownloadButtons();
    downloadButtons.forEach((btn) => addDownloadListener(btn));

    // Handle generate buttons
    const generateButtons = document.querySelectorAll('[data-cy="generate-button"]');
    generateButtons.forEach((button) => {
      if (!button.dataset.listenerAdded) {
        button.addEventListener("click", () => {
          console.log("🟢 Detected generate button click");

          setTimeout(() => {
            const creditElement = document.querySelector('span[uses-left-translation-key="common.creditsCostt"] span');
            const creditText = creditElement?.textContent.trim();
            const creditValue = parseInt(creditText);

            console.log("creditelement:", creditElement);
            console.log("creditText:", creditText);
            console.log("creditvalue:", creditValue);

            if (!isNaN(creditValue)) {
              console.log("🟢 Credits Used:", creditValue);

              chrome.storage.local.get("userId", (result) => {
                const userId = result.userId;
                if (!userId) return;

                chrome.runtime.sendMessage({
                  type: "credit",
                  creditValue: creditValue
                }, (response) => {
                  if (response?.success) {
                    console.log("📤 Credit logged to Google Sheet");
                  } else {
                    console.warn("⚠️ Failed to log credit");
                  }
                });
              });
            } else {
              console.warn("⚠️ Could not detect credit value.");
            }
          }, 500); // Wait for UI to update
        });

        button.dataset.listenerAdded = "true";
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ✅ Start monitoring buttons
monitorDownloadButtons();
