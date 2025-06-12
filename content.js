console.log("🔍 Detected Freepik website");

// ✅ Reusable removal function
function removeSidebarLink({ textIncludes = "", hrefIncludes = "" }) {
  const links = document.querySelectorAll("a");

  for (const link of links) {
    const hasText = textIncludes && link.textContent.includes(textIncludes);
    const hasHref = hrefIncludes && link.href.includes(hrefIncludes);

    if ((textIncludes && hasText) || (hrefIncludes && hasHref)) {
      console.log(`❌ Removed sidebar link: "${link.textContent.trim()}"`);
      link.remove();
      return true;
    }
  }

  return false;
}

// ✅ Setup observer and event binding
function setupMenuButtonWatcher(removalTargets = []) {
  const menuBtn = document.querySelector('button[title="toggle menu"]');

  if (!menuBtn) {
    // console.warn("⚠️ Menu button not found yet. Retrying...");
    setTimeout(() => setupMenuButtonWatcher(removalTargets), 500);
    return;
  }

  console.log("✅ Menu button found, adding click listener.");

  menuBtn.addEventListener("click", () => {
    console.log("👆 Menu button clicked");

    setTimeout(() => {
      let allRemoved = true;

      for (const target of removalTargets) {
        const removed = removeSidebarLink(target);

        if (!removed) {
          allRemoved = false;

          const observer = new MutationObserver(() => {
            const removedNow = removeSidebarLink(target);
            if (removedNow) {
              observer.disconnect();
              console.log(`✅ Observer removed "${target.textIncludes || target.hrefIncludes}"`);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      }
    }, 300);
  });
}

// 🚀 Start it with any links you want to remove
setupMenuButtonWatcher([
  { textIncludes: "AI Assistant", hrefIncludes: "/pikaso/assistant" },
  { textIncludes: "Retouch", hrefIncludes: "/pikaso/retouch" },
  { textIncludes: "Image Editor", hrefIncludes: "/pikaso/adjust" },
  { textIncludes: "Video Upscaler", hrefIncludes: "https://www.freepik.com/pikaso/video-upscaler" },
  { textIncludes: "Lip Sync", hrefIncludes: "https://www.freepik.com/pikaso/video-lip-sync" },
  { textIncludes: "Sound Effects", hrefIncludes: "https://www.freepik.com/pikaso/video-soundfx" },
  { textIncludes: "Video Editor", hrefIncludes: "https://www.freepik.com/pikaso/video-editor" },
  { textIncludes: "Sketch to Image", hrefIncludes: "https://www.freepik.com/pikaso/sketch" },
  { textIncludes: "Mockups Generator", hrefIncludes: "https://www.freepik.com/pikaso/mockup" },
  { textIncludes: "Designer", hrefIncludes: "/designer/edit?template=new-artboard" },
  { textIncludes: "AI Icon Generator", hrefIncludes: "/ai/icon-generator/tool" },
  { textIncludes: "Voiceovers", hrefIncludes: "https://www.freepik.com/audio/ai-voice-generator" },
  { textIncludes: "All Tools", hrefIncludes: "/ai" }

]);


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

function watchFileInput() {
  const fileInputs = document.querySelectorAll('input[type="file"]');

  fileInputs.forEach((input) => {
    if (!input.dataset.uploadListenerAdded) {
      console.log("📦 File input detected");

      input.addEventListener("change", () => {
        if (input.files && input.files.length > 0) {
          console.log("📤 File selected → Deduct 3 credits");

          chrome.storage.local.get("userId", (result) => {
            const userId = result.userId;
            if (!userId) return;

            chrome.runtime.sendMessage(
              {
                type: "credit",
                creditValue: 3,
              },
              (response) => {
                if (response?.success) {
                  console.log("✅ 3 credits deducted for image upload");
                } else {
                  console.warn("⚠️ Failed to log upload credit");
                }
              }
            );
          });
        }
      });

      input.dataset.uploadListenerAdded = "true";
    }
  });
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
          console.log("🟢 Generate button clicked");

          // Step 1: Capture credit cost immediately (before modal opens)
          const creditElement = document.querySelector('span[uses-left-translation-key="common.creditsCostt"] span');
          const creditText = creditElement?.textContent.trim();
          const creditValue = parseInt(creditText);

          if (isNaN(creditValue)) {
            console.warn("⚠️ Could not detect credit value on button click.");
            return;
          }

          console.log(`💳 Credit detected before modal: ${creditValue}`);

          // Step 2: Delay to allow modal to appear
          setTimeout(() => {
            const resizeModal = document.querySelector('div[data-state="open"].fixed.inset-0');
            const resizeConfirmBtn = document.querySelector('button[data-cy="resize-image-modal-confirm"]');
            const resizeCancelBtn = document.querySelector('button svg use[href="#icon-cross-medium"]')?.closest("button");

            if (resizeModal && resizeConfirmBtn) {
              console.log("🟡 Resize modal detected. Waiting for user action...");

              resizeConfirmBtn.addEventListener("click", () => {
                console.log("✅ Resize confirmed. Logging credit...");
                logCredit(creditValue);
              }, { once: true });

              if (resizeCancelBtn) {
                resizeCancelBtn.addEventListener("click", () => {
                  console.log("❌ Resize canceled. Credit NOT logged.");
                }, { once: true });
              }
            } else {
              console.log("➡️ No resize modal. Logging credit immediately.");
              logCredit(creditValue);
            }
          }, 400); // Enough delay for modal appearance
        });

        button.dataset.listenerAdded = "true";
      }


      // Helper function
      function logCredit(creditValue) {
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
      }


    });


    watchFileInput();

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
