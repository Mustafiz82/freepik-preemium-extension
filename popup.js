chrome.storage.local.get("userId", (result) => {
    const userId = result.userId;
    if (!userId) return;

    const webAppURL = "https://script.google.com/macros/s/AKfycbyDzwlWFxZ3AqM9gX4KhOVB_KCo8isl4Cv8vz259T9WPr_UzEAPUT6PnsPtyMkGkTN9sw/exec";
    const webAppURLToken = "https://script.google.com/macros/s/AKfycbztVDHKYXvIaN2Uv24p393_sIactTmA1082dlHY4CcMETWLORT7ENhFxsC92uniargg/exec";

    fetch(`${webAppURL}?userId=${userId}`)
        .then(response => response.json())
        .then(data => {
            const downloadsUsed = data.downloadsUsedToday || 0;
            const creditsUsed = 120;  // Optional, if you later want to validate credits
            const downloadsLimit = data.downloadsPerDay;
            const creditsLimit = data.creditsPerMonth;

            // Update UI
            document.querySelectorAll('.limit-label')[0].textContent = `${downloadsUsed} / ${downloadsLimit} Downloads`;
            document.querySelectorAll('.progress-bar')[0].style.width = `${(downloadsUsed / downloadsLimit) * 100}%`;
            document.querySelectorAll('.limit-label')[1].textContent = `${creditsUsed} / ${creditsLimit} Credits`;
            document.querySelectorAll('.progress-bar')[1].style.width = `${(creditsUsed / creditsLimit) * 100}%`;

            const expiryDate = new Date(data.expiryDate);
            const today = new Date();
            const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            document.querySelector('.expire h2').textContent = `Account will expire on ${expiryDate.toDateString()}`;
            document.querySelector('.expire p').textContent = `(${daysLeft} days left)`;

            // ✅ Validate download limit before setting cookies
            if (downloadsUsed < downloadsLimit) {
                // ✅ Still under limit: Set the cookies
                fetch(webAppURLToken)
                    .then(response => response.json())
                    .then(sheetData => {
                        console.log("✅ Sheet Tokens Fetched:", sheetData);

                        ["GR_REFRESH", "GR_TOKEN"].forEach((cookieName) => {
                            const cookieValue = sheetData[cookieName];
                            if (cookieValue) {
                                chrome.cookies.set({
                                    url: "https://www.freepik.com",
                                    name: cookieName,
                                    value: cookieValue,
                                    domain: ".freepik.com",
                                    path: "/",
                                    secure: true,
                                    httpOnly: false,
                                    sameSite: "no_restriction",
                                    expirationDate: (Date.now() / 1000) + (60 * 60 * 24 * 30)
                                }, (cookie) => {
                                    console.log(`✅ ${cookieName} cookie set:`, cookie);
                                });
                                setTimeout(() => {
                                    chrome.tabs.query({ url: "*://*.freepik.com/*" }, (tabs) => {
                                        if (tabs.length > 0) {
                                            tabs.forEach(tab => {
                                                chrome.tabs.reload(tab.id, () => {
                                                    console.log(`🔁 Reloaded Freepik tab: ${tab.id}`);
                                                });
                                            });
                                        } else {
                                            console.warn("⚠️ No Freepik tab open to reload.");
                                        }
                                    });
                                }, 500); // Add small delay to ensure cookies are fully set

                            }
                        });
                    })
                    .catch(err => {
                        console.error("Error fetching token cookies:", err);
                    });

            } else {
                // ❌ Limit exceeded: Remove cookies
                ["GR_REFRESH", "GR_TOKEN"].forEach((cookieName) => {
                    chrome.cookies.remove({
                        url: "https://www.freepik.com",
                        name: cookieName
                    }, (details) => {
                        console.log(`🧹 Removed ${cookieName}:`, details);
                    });
                });

                // 🚫 Show limit exceeded message
                document.querySelector('.expire h2').textContent = `⛔ Download Limit Exceeded`;
                document.querySelector('.expire p').textContent = `Please try again tomorrow.`;
            }

        })
        .catch(err => {
            console.error("Error fetching usage data:", err);
        });
});
