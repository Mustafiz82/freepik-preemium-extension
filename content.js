console.log("🔍 Detected Freepik website");

function removeLinkByText(linkText) {
  const links = document.querySelectorAll("a");
  for (const link of links) {
    if (link.textContent.trim().includes(linkText)) {
      console.log(`❌ Removed <a> tag with text: "${linkText}"`);
      link.remove();
      return true; // ✅ indicate removal success
    }
  }
  return false; // Not found yet
}


let removed = removeLinkByText("AI Assistant");

if (!removed) {
  // Set up observer to monitor DOM changes
  const observer = new MutationObserver(() => {
    const removedNow = removeLinkByText("AI Assistant");
    if (removedNow) {
      observer.disconnect(); // Stop observing after removal
      console.log("✅ Observer disconnected after removing AI Assistant");
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

const webAppURL = "https://script.google.com/macros/s/AKfycbyDzwlWFxZ3AqM9gX4KhOVB_KCo8isl4Cv8vz259T9WPr_UzEAPUT6PnsPtyMkGkTN9sw/exec";

// ✅ On Page Load → Check download limit
chrome.storage.local.get("userId", (result) => {
  const userId = result.userId;
  if (!userId) return;

  fetch(`${webAppURL}?userId=${userId}`)
    .then(res => res.json())
    .then(data => {
      const downloadUsed = parseInt(data.downloadsUsedToday) || 0;
      const downloadLimit = parseInt(data.downloadsPerDay) || 1;

      const creditUsed = parseInt(data.creditsUsed)
      const creditLimit = parseInt(data.creditsPerMonth)



      if ((downloadUsed >= downloadLimit) || (creditUsed >= creditLimit)) {
        console.warn(`🚫 Limit exceeded: ${downloadUsed}/${downloadLimit}. Removing cookies...`);

        ["GR_REFRESH", "GR_TOKEN"].forEach(name => {
          chrome.runtime.sendMessage({ type: "removeCookie", cookieName: name }, (res) => {
            console.log(`🧹 Removed ${name}`, res);
          });
        });

        const banner = document.createElement("div");
        banner.innerText = "🚫 Credit or download limit exceeded. Premium access disabled.";
        banner.style.cssText = "position:fixed;top:0;left:0;width:100%;z-index:9999;padding:10px;background:#c00;color:#fff;font-weight:bold;text-align:center";
        document.body.appendChild(banner);
      }
    })
    .catch(err => {
      console.error("❌ Failed to check limit:", err);
    });
});

// ✅ Monitor download buttons
function monitorDownloadButtons() {
  const buttons = getFilteredDownloadButtons();
  buttons.forEach((btn) => addDownloadListener(btn));
  observeForButtons(); // Also handles generate buttons
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

// ✅ Observe DOM for dynamically added buttons
function observeForButtons() {
  const observer = new MutationObserver(() => {
    // Download buttons
    const downloadButtons = getFilteredDownloadButtons();
    downloadButtons.forEach((btn) => addDownloadListener(btn));

    // Generate buttons (for AI credit use)
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
          }, 500); // Allow DOM to fully render credit amount
        });

        button.dataset.listenerAdded = "true";
      }
    });

    // ✅ Handle Upscale Button specifically
    const upscaleButtons = document.querySelectorAll('button[data-cy="generate-button"]');
    const creditElement = document.querySelector('span[uses-left-translation-key="common.creditsCostt"] span');

    upscaleButtons.forEach((btn) => {
      const label = btn.querySelector("span")?.textContent.trim().toLowerCase();
      if (label === "upscale" && !btn.dataset.upscaleListenerAdded) {
        btn.addEventListener("click", () => {
          console.log("✅ Upscale button clicked (via extension):", btn);
          const creditText = creditElement?.textContent.trim();
          const creditValue = parseInt(creditText);

          console.log("creditelement:", creditElement);
          console.log("creditText:", creditText);
          console.log("creditvalue:", creditValue);

          chrome.storage.local.get("userId", (result) => {
            const userId = result.userId;
            if (!userId) return;

            chrome.runtime.sendMessage({
              type: "credit",
              creditValue: 72
            }, (response) => {
              if (response?.success) {
                console.log("📤upscale  Credit logged to Google Sheet");
              } else {
                console.warn("⚠️ Failed to log credit");
              }
            });
          });
        });
        btn.dataset.upscaleListenerAdded = "true";
      }
    });

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ✅ Start script
monitorDownloadButtons();
