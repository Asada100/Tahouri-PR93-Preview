// =====================================
// Tahouri Edu Platform
// Report Activity Title Resolver
// Version 1.0
//
// Purpose:
// - Keep report activity names data-driven
// - Resolve activity IDs from the canonical activity data
// - Prevent new activities from appearing by raw ID in reports
// =====================================

(function () {

    "use strict";

    const REPORTS_MODAL_ID = "reportsModal";
    let observingModal = null;
    let observer = null;
    let normalizing = false;

    function getActivities() {
        if (typeof App !== "undefined" && Array.isArray(App.activities)) {
            return App.activities;
        }

        if (typeof activities !== "undefined" && Array.isArray(activities)) {
            return activities;
        }

        return [];
    }

    function getTitleMap() {
        const map = Object.create(null);

        getActivities().forEach(function (activity) {
            if (!activity || !activity.id || !activity.title) return;
            map[String(activity.id)] = String(activity.title);
        });

        return map;
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function normalizeTextNode(node, titleMap) {
        if (!node || !node.nodeValue) return;

        let value = node.nodeValue;
        let changed = false;

        Object.keys(titleMap).forEach(function (id) {
            if (!id || value.indexOf(id) === -1) return;

            const pattern = new RegExp("(^|[^A-Za-z0-9_])" + escapeRegExp(id) + "(?=$|[^A-Za-z0-9_])", "g");
            const next = value.replace(pattern, function (match, prefix) {
                changed = true;
                return prefix + titleMap[id];
            });

            value = next;
        });

        if (changed && value !== node.nodeValue) {
            node.nodeValue = value;
        }
    }

    function normalizeModal(modal) {
        if (!modal || normalizing) return;

        const titleMap = getTitleMap();
        if (!Object.keys(titleMap).length) return;

        normalizing = true;
        try {
            const walker = document.createTreeWalker(
                modal,
                NodeFilter.SHOW_TEXT
            );

            const nodes = [];
            let node;
            while ((node = walker.nextNode())) {
                nodes.push(node);
            }

            nodes.forEach(function (textNode) {
                normalizeTextNode(textNode, titleMap);
            });
        }
        finally {
            normalizing = false;
        }
    }

    function watchModal(modal) {
        if (!modal || observingModal === modal) {
            if (modal) normalizeModal(modal);
            return;
        }

        if (observer) observer.disconnect();

        observingModal = modal;
        normalizeModal(modal);

        observer = new MutationObserver(function () {
            if (!normalizing) normalizeModal(modal);
        });

        observer.observe(modal, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function checkModal() {
        const modal = document.getElementById(REPORTS_MODAL_ID);
        if (modal) watchModal(modal);
        else {
            observingModal = null;
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
    }

    function init() {
        const bodyObserver = new MutationObserver(checkModal);
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        checkModal();
        console.log("Report Activity Title Resolver v1.0 Ready");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }

})();
