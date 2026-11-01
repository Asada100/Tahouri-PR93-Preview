// =====================================
// Tahouri Edu Platform
// Version 3.9
// Activity Screen
// =====================================

const ActivityScreen = {

    lockMessageTimer: null,

    show: function (activityList) {
        const app = document.getElementById("app");

        if (!app) {
            console.error("Activity Screen: App Container Not Found");
            return;
        }

        if (!Array.isArray(activityList)) {
            console.error("Activity Screen: Invalid Activity List");
            return;
        }

        const groupedActivities = {};
        const displayItems = [];
        const seenGroups = {};

        activityList.forEach(function (activity) {
            if (activity.group) {
                if (!groupedActivities[activity.group]) {
                    groupedActivities[activity.group] = [];
                }
                groupedActivities[activity.group].push(activity);

                if (!seenGroups[activity.group]) {
                    seenGroups[activity.group] = true;
                    displayItems.push({ type: "group", id: activity.group });
                }
            } else {
                displayItems.push({ type: "activity", activity: activity });
            }
        });

        let activitiesHTML = "";

        displayItems.forEach(function (item) {
            if (item.type === "activity") {
                const activity = item.activity;
                const locked = ActivityScreen.isLocked(activity);

                activitiesHTML += `
                    <button
                        class="activitySelectBtn"
                        data-id="${activity.id}"
                        type="button">
                        ${locked ? "🔒" : ""}
                        ${activity.title}
                    </button>
                `;
                return;
            }

            const groupId = item.id;
            const groupActivities = groupedActivities[groupId] || [];
            const groupLocked = groupActivities.every(function (activity) {
                return ActivityScreen.isLocked(activity);
            });
            const groupTitle = ActivityScreen.getGroupTitle(groupId);
            const groupIcon = ActivityScreen.getGroupIcon(groupId);

            activitiesHTML += `
                <button
                    class="activityGroupBtn"
                    data-group="${groupId}"
                    type="button">
                    ${groupLocked ? "🔒" : ""}
                    <span class="activityGroupIcon" aria-hidden="true">${groupIcon}</span>
                    <span>${groupTitle}</span>
                </button>
            `;
        });

        if (activitiesHTML === "") {
            activitiesHTML = `
                <p class="activityEmptyMessage">
                    فعالیتی برای این فصل وجود ندارد.
                </p>
            `;
        }

        app.innerHTML = `
            <div class="screen activityScreen" dir="rtl">
                <h1>انتخاب فعالیت</h1>
                <div id="activityList" class="activityList">
                    ${activitiesHTML}
                </div>
            </div>
        `;

        this.bindActivityButtons(activityList);
        this.bindGroupButtons(groupedActivities);

        console.log("Activity Screen Displayed:", activityList.length);
    },

    isLocked: function (activity) {
        if (!activity || !activity.id) {
            return true;
        }

        // The five parity games use the dedicated sequential progression
        // even if an older catalog or cached record marks one as open.
        if (
            typeof ContentLockManager !== "undefined" &&
            typeof ContentLockManager.isProgressionActivity === "function" &&
            ContentLockManager.isProgressionActivity(activity.id)
        ) {
            return ContentLockManager.isLocked(activity.id);
        }

        if (activity.locked === false) {
            return false;
        }

        if (typeof ContentLockManager === "undefined") {
            return activity.locked === true;
        }

        return ContentLockManager.isLocked(activity.id);
    },

    bindActivityButtons: function (activityList) {
        document.querySelectorAll(".activitySelectBtn").forEach(function (button) {
            button.onclick = function () {
                const id = this.dataset.id;
                const activity = activityList.find(function (item) {
                    return item.id === id;
                });

                if (!activity) {
                    console.error("Activity Screen: Activity Not Found:", id);
                    return;
                }

                if (ActivityScreen.isLocked(activity)) {
                    ActivityScreen.showLockMessage("این فعالیت قفل است.\nبرای ورود، شرط باز شدن آن را کامل کنید.");
                    return;
                }

                ActivityScreen.startActivity(activity);
            };
        });
    },

    bindGroupButtons: function (groupedActivities) {
        document.querySelectorAll(".activityGroupBtn").forEach(function (button) {
            button.onclick = function () {
                const groupId = this.dataset.group;
                const groupActivities = groupedActivities[groupId];

                if (!groupActivities || groupActivities.length === 0) {
                    return;
                }

                const groupLocked = groupActivities.every(function (activity) {
                    return ActivityScreen.isLocked(activity);
                });

                if (groupLocked) {
                    ActivityScreen.showLockMessage("این بخش قفل است.\nبرای ورود، شرط باز شدن آن را کامل کنید.");
                    return;
                }

                ActivityScreen.openGroup(groupId, groupActivities);
            };
        });
    },

    showLockMessage: function (message) {
        if (this.lockMessageTimer) {
            clearTimeout(this.lockMessageTimer);
            this.lockMessageTimer = null;
        }

        const oldOverlay = document.getElementById("activityLockMessageOverlay");
        if (oldOverlay) oldOverlay.remove();

        const overlay = document.createElement("div");
        overlay.id = "activityLockMessageOverlay";
        overlay.className = "activityLockMessageOverlay";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");

        const box = document.createElement("div");
        box.className = "activityLockMessage";
        box.innerHTML = "<div class=\"activityLockIcon\" aria-hidden=\"true\">🔒</div>" +
            "<div class=\"activityLockText\"></div>";
        box.querySelector(".activityLockText").textContent = message || "";

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const dismiss = function () {
            if (ActivityScreen.lockMessageTimer) {
                clearTimeout(ActivityScreen.lockMessageTimer);
                ActivityScreen.lockMessageTimer = null;
            }
            overlay.classList.add("is-hiding");
            window.setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 220);
        };

        overlay.addEventListener("click", dismiss);
        this.lockMessageTimer = window.setTimeout(dismiss, 5000);
    },

    openGroup: function (groupId, activities) {
        if (!Array.isArray(activities) || activities.length === 0) {
            return;
        }

        if (groupId === "divisibility") {
            if (typeof DivisibilityScreen !== "undefined" && typeof DivisibilityScreen.show === "function") {
                const firstActivity = activities[0];
                DivisibilityScreen.show(firstActivity.grade, firstActivity.subject, firstActivity.chapter);
                return;
            }

            if (typeof Screen !== "undefined" && typeof Screen.showDivisibility === "function") {
                const firstActivity = activities[0];
                Screen.showDivisibility(firstActivity.grade, firstActivity.subject, firstActivity.chapter);
                return;
            }

            console.error("Divisibility Screen Not Available");
            return;
        }

        ActivityScreen.showGroupActivities(groupId, activities);
    },

    showGroupActivities: function (groupId, activities) {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Activity Screen: App Container Not Found");
            return;
        }

        const groupTitle = this.getGroupTitle(groupId);
        const groupIcon = this.getGroupIcon(groupId);

        let buttonsHTML = "";

        activities.forEach(function (activity) {
            const locked = ActivityScreen.isLocked(activity);
            buttonsHTML += `
                <button
                    class="activitySelectBtn"
                    data-id="${activity.id}"
                    type="button">
                    ${locked ? "🔒" : ""}
                    <span>${activity.title}</span>
                </button>
            `;
        });

        app.innerHTML = `
            <div class="screen activityScreen activityGroupScreen" data-group-id="${groupId}" dir="rtl">
                <div class="activityGroupHeading">
                    <div class="activityGroupHeadingIcon" aria-hidden="true">${groupIcon}</div>
                    <h1>${groupTitle}</h1>
                    <p>یک بازی را انتخاب کن و شروع کن!</p>
                </div>

                <div id="activityList" class="activityList">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        this.bindActivityButtons(activities);

        console.log("Activity Group Displayed:", groupId, activities.length);
    },

    getGroupTitle: function (groupId) {
        const titles = {
            divisibility: "بخش‌پذیری",
            evenOdd: "بازی‌های زوج و فرد",
            setayesh: "ستایش"
        };

        return titles[groupId] || groupId;
    },

    getGroupIcon: function (groupId) {
        const icons = {
            divisibility: "➗",
            evenOdd: "🔢",
            setayesh: "📖"
        };

        return icons[groupId] || "🎮";
    },

    startActivity: function (activity) {
        if (!activity) {
            console.error("Activity Screen: Activity Missing");
            return;
        }

        // A deliberate selection from the activity list is an explicit new start.
        // Clear the post-completion guard so a previous result cannot block a new activity.
        if (
            typeof ActivityManager !== "undefined" &&
            typeof ActivityManager.allowNewActivityStart === "function"
        ) {
            ActivityManager.allowNewActivityStart();
        }

        if (typeof Navigation !== "undefined") {
            Navigation.selectActivity(activity.id);
        }

        if (typeof window !== "undefined" &&
            window.App &&
            typeof window.App.startActivity === "function") {
            console.log("Activity Screen: Start Activity:", activity);

            const buttons = document.querySelectorAll(".activitySelectBtn");
            buttons.forEach(function (button) {
                if (button.dataset.id === activity.id) {
                    button.disabled = true;
                }
            });

            setTimeout(function () {
                if (window.App && typeof window.App.startActivity === "function") {
                    window.App.startActivity(activity);
                } else {
                    console.error("Activity Screen: App.startActivity Not Available");
                }
            }, 0);
            return;
        }

        console.error("Activity Screen: App.startActivity Not Available");
    }
};

window.ActivityScreen = ActivityScreen;

console.log("Activity Screen v3.13 Ready");
