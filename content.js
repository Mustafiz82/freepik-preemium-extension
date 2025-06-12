// ✅ 1. Log Script Start
console.log("🔍 Detected Freepik website");

// ✅ 2. Remove Specific Sidebar Links When Menu Clicked
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
function setupMenuButtonWatcher(removalTargets = []) {
  const buttons = [
    document.querySelector('button[title="toggle menu"]'),
    document.querySelector('button.menu-burger')
  ].filter(Boolean); // Only keep non-null buttons

  if (buttons.length === 0) {

    return setTimeout(() => setupMenuButtonWatcher(removalTargets), 500);
  }

  console.log(`✅ Found ${buttons.length} menu button(s), adding listeners.`);

  buttons.forEach((btn, i) => {
    if (btn.dataset.listenerAdded) return;

    btn.addEventListener("click", () => {
      console.log(`👆 Menu button ${i + 1} clicked`);
      setTimeout(() => {
        for (const target of removalTargets) {
          if (!removeSidebarLink(target)) {
            const observer = new MutationObserver(() => {
              if (removeSidebarLink(target)) {
                observer.disconnect();
                console.log(`✅ Observer removed target: ${target.textIncludes || target.hrefIncludes}`);
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          }
        }
      }, 300);
    });

    btn.dataset.listenerAdded = "true";
  });
}


setupMenuButtonWatcher([
  { textIncludes: "AI Assistant", hrefIncludes: "/pikaso/assistant" },
  { textIncludes: "Retouch", hrefIncludes: "/pikaso/retouch" },
  { textIncludes: "Image Editor", hrefIncludes: "/pikaso/adjust" },
  { textIncludes: "Video Upscaler", hrefIncludes: "video-upscaler" },
  { textIncludes: "Lip Sync", hrefIncludes: "video-lip-sync" },
  { textIncludes: "Sound Effects", hrefIncludes: "video-soundfx" },
  { textIncludes: "Video Editor", hrefIncludes: "video-editor" },
  { textIncludes: "Sketch to Image", hrefIncludes: "sketch" },
  { textIncludes: "Mockups Generator", hrefIncludes: "mockup" },
  { textIncludes: "Designer", hrefIncludes: "/designer/edit?template=new-artboard" },
  { textIncludes: "AI Icon Generator", hrefIncludes: "/ai/icon-generator/tool" },
  { textIncludes: "Voiceovers", hrefIncludes: "audio/ai-voice-generator" },
  // { textIncludes: "All Tools", hrefIncludes: "/ai" }
]);


// right option hiding and unhiding 

function trimAccountDropdown() {
  const upgrade = document.querySelector('a[data-cy="upgrade"]');
  const subscription = document.querySelector('[data-cy="popover-user-my-subscription"]');
  const account = document.querySelector('[data-cy="popover-account"]');
  const containers = document.querySelectorAll("div.flex.flex-col.w-full.text-sm");

  for (const el of containers) {
    // Optional: refine further by checking child content
    if (el.textContent.includes("Credit usage")) {
      el.remove()
      console.log("❌ Removed:  credit useds");
    }
  }

  if (upgrade) {
    upgrade.remove();
    console.log("❌ Removed: Upgrade");
  }

  if (subscription) {
    subscription.remove();
    console.log("❌ Removed: Subscription");
  }

  if (account) {
    account.remove();
    console.log("❌ Removed: Account");
  }
}


function setupAccountDropdownWatcher() {
  console.log("form funciton ")
  const accountBtn = document.querySelector('button[aria-controls="radix-:r1:"]')

  if (!accountBtn) {
    console.log("account button not foun")
    return setTimeout(setupAccountDropdownWatcher, 500);
  }

  accountBtn.addEventListener("click", () => {
    console.log("👤 Account button clicked");

    // Observe and filter dropdown
    const observer = new MutationObserver(() => {
      trimAccountDropdown();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fallback if dropdown appears instantly
    setTimeout(trimAccountDropdown, 300);
  });
}

setupAccountDropdownWatcher();



// ✅ 3. Check Credit & Download Limit
const webAppURL = "https://script.google.com/macros/s/.../exec";
chrome.storage.local.get("userId", (result) => {
  const userId = result.userId;
  if (!userId) return;

  fetch(`${webAppURL}?userId=${userId}`)
    .then(res => res.json())
    .then(data => {
      const downloadsUsed = parseInt(data.downloadsUsedToday) || 0;
      const downloadsLimit = parseInt(data.downloadsPerDay) || 1;
      const creditsUsed = parseInt(data.creditsUsed);
      const creditsLimit = parseInt(data.creditsPerMonth);

      if (downloadsUsed >= downloadsLimit || creditsUsed >= creditsLimit) {
        console.warn("🚫 Limit exceeded, removing cookies...");
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
    }).catch(err => console.error("❌ Limit check failed", err));
});

// ✅ 4. Handle Downloads
function monitorDownloadButtons() {
  getFilteredDownloadButtons().forEach(addDownloadListener);
  observeForButtons();
}

function getFilteredDownloadButtons() {
  const excluded = ['dropdown-download-type', 'dropdown-download-options'];
  return [...document.querySelectorAll('[data-cy*="download"]')].filter(btn => !excluded.includes(btn.getAttribute('data-cy')));
}

function addDownloadListener(button) {
  if (!button.dataset.listenerAdded) {
    button.addEventListener("click", () => {
      console.log("✅ Download button clicked");
      chrome.runtime.sendMessage({ type: "download" }, (response) => {
        if (response?.success) {
          console.log("📤 Download logged to Sheet");
        } else {
          console.warn("⚠️ Download logging failed");
        }
      });
    });
    button.dataset.listenerAdded = "true";
  }
}

// ✅ 5. Handle File Upload Credit
function watchFileInput() {
  document.querySelectorAll('input[type="file"]').forEach(input => {
    if (!input.dataset.uploadListenerAdded) {
      input.addEventListener("change", () => {
        if (input.files?.length > 0) {
          console.log("📤 File uploaded → Deduct 3 credits");
          chrome.storage.local.get("userId", (result) => {
            const userId = result.userId;
            if (!userId) return;
            chrome.runtime.sendMessage({ type: "credit", creditValue: 3 }, (response) => {
              if (response?.success) {
                console.log("✅ Upload credit deducted");
              } else {
                console.warn("⚠️ Upload credit log failed");
              }
            });
          });
        }
      });
      input.dataset.uploadListenerAdded = "true";
    }
  });
}

// ✅ 6. Observe Dynamic Elements (Generate / Upscale / Upload)
function observeForButtons() {
  const observer = new MutationObserver(() => {
    // Downloads
    getFilteredDownloadButtons().forEach(addDownloadListener);

    // AI Generate Buttons
    document.querySelectorAll('[data-cy="generate-button"]').forEach((button) => {
      if (!button.dataset.listenerAdded) {
        button.addEventListener("click", () => {
          const creditElement = document.querySelector('span[uses-left-translation-key="common.creditsCostt"] span');
          const creditValue = parseInt(creditElement?.textContent.trim());
          if (isNaN(creditValue)) return;
          setTimeout(() => {
            const modal = document.querySelector('div[data-state="open"].fixed.inset-0');
            const confirm = document.querySelector('button[data-cy="resize-image-modal-confirm"]');
            const cancel = document.querySelector('button svg use[href="#icon-cross-medium"]')?.closest("button");
            if (modal && confirm) {
              confirm.addEventListener("click", () => logCredit(creditValue), { once: true });
              cancel?.addEventListener("click", () => console.log("❌ Resize canceled"), { once: true });
            } else {
              logCredit(creditValue);
            }
          }, 400);
        });
        button.dataset.listenerAdded = "true";
      }
    });

    // Upscale buttons (fixed credit)
    document.querySelectorAll('[data-cy="generate-button"]').forEach((btn) => {
      const label = btn.querySelector("span")?.textContent.trim().toLowerCase();
      if (label === "upscale" && !btn.dataset.upscaleListenerAdded) {
        btn.addEventListener("click", () => logCredit(72));
        btn.dataset.upscaleListenerAdded = "true";
      }
    });

    // Watch Uploads
    watchFileInput();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function logCredit(creditValue) {
  chrome.storage.local.get("userId", (result) => {
    const userId = result.userId;
    if (!userId) return;
    chrome.runtime.sendMessage({ type: "credit", creditValue }, (response) => {
      if (response?.success) {
        console.log(`📤 ${creditValue} credits logged`);
      } else {
        console.warn("⚠️ Credit log failed");
      }
    });
  });
}

// ✅ 7. Start Monitoring
monitorDownloadButtons();
