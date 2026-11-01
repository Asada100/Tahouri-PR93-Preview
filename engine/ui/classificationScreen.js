// =====================================
// Tahouri Edu Platform
// Classification Screen
// Version 2.0
// =====================================
// Drag UX:
// - One Pointer Events path for mouse + touch
// - Live drag overlay follows the pointer
// - Original grab offset is preserved
// - Pointer capture keeps the drag alive
// - requestAnimationFrame keeps movement smooth
// - Drop uses a short snap / return animation
// =====================================

const ClassificationScreen = {
    activityReadyConnected: false,
    currentActivity: null,
    currentState: null,
    lastMessage: "",
    selectedItemId: null,
    dragItemId: null,
    dragActive: false,
    dragSubmissionLocked: false,
    touchDrag: null,
    touchMoveHandler: null,
    touchEndHandler: null,
    touchCancelHandler: null,

    init: function () {
        if (typeof EventManager === "undefined") return;
        if (this.activityReadyConnected) return;
        EventManager.on("activityReady", function (payload) { ClassificationScreen.handleActivityReady(payload); });
        EventManager.on("activityFinished", function (result) {
            if (result && result.activityId === ClassificationScreen.getActivityId()) ClassificationScreen.showFinished(result);
        });
        this.activityReadyConnected = true;
        console.log("Classification Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload || !payload.activity || !payload.result) return;
        if (payload.engineName !== "classification" && payload.engineName !== "ClassificationEngine") return;
        this.cancelTouchDrag();
        this.currentActivity = payload.activity;
        this.currentState = payload.result;
        this.lastMessage = "";
        this.selectedItemId = null;
        this.dragItemId = null;
        this.dragActive = false;
        this.dragSubmissionLocked = false;
        this.touchDrag = null;
        this.show(payload.result);
    },

    getMode: function () {
        const activity = this.currentActivity || {};
        return activity.classification && activity.classification.mode
            ? String(activity.classification.mode) : "choice";
    },

    getCurrentStage: function () {
        if (this.getMode() !== "multiStage") return null;
        const classification = this.currentActivity && this.currentActivity.classification;
        const stages = classification && Array.isArray(classification.stages) ? classification.stages : [];
        const index = this.currentState && Number.isInteger(this.currentState.currentStage)
            ? this.currentState.currentStage : 0;
        return stages[index] || null;
    },

    getStageMode: function () {
        const stage = this.getCurrentStage();
        return stage && stage.mode ? String(stage.mode) : "choice";
    },

    show: function (state) {
        if (!state) return;
        const app = document.getElementById("app");
        if (!app) return;
        const categories = Array.isArray(state.categories) ? state.categories : [];
        const items = Array.isArray(state.items) ? state.items : [];
        const classifications = state.classifications || {};
        const activity = this.currentActivity || {};
        const mode = this.getMode();
        const stage = this.getCurrentStage();
        const isMultiStage = mode === "multiStage";
        const isDragDrop = mode === "dragDrop" || (isMultiStage && this.getStageMode() === "dragDrop");

        const categoryHTML = categories.map(function (category) {
            const id = ClassificationScreen.escapeAttribute(category.id);
            const title = ClassificationScreen.escapeHTML(category.title || category.id);
            if (isDragDrop) {
                return `<div class="classificationDropZone" data-category-id="${id}" tabindex="0" role="button" aria-label="${title}">
                    <div class="classificationDropZoneTitle">${title}</div>
                    <div class="classificationDropZoneItems" data-category-items="${id}"></div>
                </div>`;
            }
            return `<button type="button" class="classificationCategoryBtn" data-category-id="${id}">${title}</button>`;
        }).join("");

        const itemsHTML = items.map(function (item) {
            const classified = Object.prototype.hasOwnProperty.call(classifications, item.id);
            const answer = classifications[item.id];
            const status = classified ? (answer.correct ? "correct" : "wrong") : "";
            const content = item.type === "image" && item.content
                ? `<img src="${ClassificationScreen.escapeAttribute(item.content)}" alt="">`
                : ClassificationScreen.escapeHTML(item.content);
            if (isDragDrop) {
                if (classified && answer && answer.correct) return "";
                return `<button type="button" class="classificationItem classificationDragItem ${status}" data-item-id="${ClassificationScreen.escapeAttribute(item.id)}">${content}</button>`;
            }
            return `<button type="button" class="classificationItem ${status}" data-item-id="${ClassificationScreen.escapeAttribute(item.id)}" ${classified || state.finished ? "disabled" : ""}>${content}</button>`;
        }).join("");

        const instruction = isDragDrop
            ? "هر مورد را بگیر و در دسته مناسب رها کن."
            : (state.instruction || "هر مورد را در دسته مناسب قرار بده");

        app.innerHTML = `<div class="screen classificationScreen classificationMode-${ClassificationScreen.escapeAttribute(mode)} ${isDragDrop ? "classificationDragMode" : ""} ${activity.id === "parityTrain" ? "classificationActivity-parityTrain" : ""}" dir="rtl">
            <h1>${ClassificationScreen.escapeHTML(activity.title || "دسته‌بندی")}</h1>
            ${isMultiStage && stage ? `<div class="classificationStageTitle">مرحله ${Number(state.currentStage) + 1} از ${Number(state.totalStages)}${stage.title ? " — " + ClassificationScreen.escapeHTML(stage.title) : ""}</div>` : ""}
            <p class="classificationInstruction">${ClassificationScreen.escapeHTML(instruction)}</p>
            <div class="classificationStatus">${isMultiStage ? `این مرحله: ${Math.max(0, (items.length || 0) - (state.classifiedItems || 0))} مورد باقی‌مانده از ${items.length || 0} | کل فعالیت: ${state.totalClassifiedItems || 0} از ${state.totalItems || 0}` : `باقی‌مانده: ${Math.max(0, (state.totalItems || 0) - (state.classifiedItems || 0))} از ${state.totalItems || 0}`}</div>
            <div class="classificationItems">${itemsHTML}</div>
            <div class="classificationCategories ${isDragDrop ? "classificationDropZones" : ""}">${categoryHTML}</div>
            <div id="classificationMessage" class="classificationMessage">${ClassificationScreen.escapeHTML(this.lastMessage)}</div>
            <button type="button" id="classificationBackBtn" class="classificationBackBtn">بازگشت</button>
        </div>`;
        if (isDragDrop) this.renderPlacements(state);
        this.bindEvents();
    },

    bindEvents: function () {
        const self = this;
        if (this.getMode() === "dragDrop" || (this.getMode() === "multiStage" && this.getStageMode() === "dragDrop")) {
            this.bindDragDropEvents();
        } else {
            let selected = null;
            document.querySelectorAll(".classificationItem:not(:disabled)").forEach(function (button) {
                button.onclick = function () {
                    document.querySelectorAll(".classificationItem").forEach(function (b) { b.classList.remove("selected"); });
                    selected = this.dataset.itemId;
                    self.selectedItemId = selected;
                    this.classList.add("selected");
                    self.lastMessage = "حالا دسته مناسب را انتخاب کن.";
                    self.updateMessage();
                };
            });
            document.querySelectorAll(".classificationCategoryBtn").forEach(function (button) {
                button.onclick = function () {
                    if (!selected) { self.lastMessage = "ابتدا یک مورد را انتخاب کن."; self.updateMessage(); return; }
                    self.submitClassification(selected, this.dataset.categoryId, "user");
                    selected = null;
                    self.selectedItemId = null;
                };
            });
        }
        const back = document.getElementById("classificationBackBtn");
        if (back) back.onclick = function () {
            if (typeof App !== "undefined" && typeof App.showActivities === "function") App.showActivities();
        };
    },

    bindDragDropEvents: function () {
        const self = this;
        document.querySelectorAll(".classificationDragItem").forEach(function (item) {
            item.addEventListener("pointerdown", function (event) {
                self.startPointerDrag(event, this);
            }, { passive: false });
        });
    },

    startPointerDrag: function (event, item) {
        if (!event || !item || !event.isTrusted || this.touchDrag || this.dragSubmissionLocked) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        event.preventDefault();
        this.cancelTouchDrag();

        const rect = item.getBoundingClientRect();
        this.dragItemId = item.dataset.itemId;
        this.dragActive = false;
        this.dragSubmissionLocked = false;

        const overlay = item.cloneNode(true);
        overlay.classList.remove("dragging", "correct", "wrong");
        overlay.classList.add("classificationDragOverlay");
        overlay.removeAttribute("draggable");
        overlay.setAttribute("aria-hidden", "true");
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.top = `${rect.top}px`;
        overlay.style.transform = "translate3d(0,0,0)";
        document.body.appendChild(overlay);

        item.classList.add("classificationDragSource");

        this.touchDrag = {
            itemId: item.dataset.itemId,
            item: item,
            overlay: overlay,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            originLeft: rect.left,
            originTop: rect.top,
            originWidth: rect.width,
            originHeight: rect.height,
            active: false,
            frame: 0,
            pendingX: event.clientX,
            pendingY: event.clientY
        };

        if (typeof item.setPointerCapture === "function") {
            try { item.setPointerCapture(event.pointerId); } catch (error) {}
        }

        this.touchMoveHandler = function (moveEvent) {
            const drag = ClassificationScreen.touchDrag;
            if (!drag || moveEvent.pointerId !== drag.pointerId) return;
            ClassificationScreen.handlePointerDragMove(moveEvent);
        };
        this.touchEndHandler = function (upEvent) {
            const drag = ClassificationScreen.touchDrag;
            if (!drag || upEvent.pointerId !== drag.pointerId) return;
            ClassificationScreen.handlePointerDragEnd(upEvent);
        };
        this.touchCancelHandler = function (cancelEvent) {
            const drag = ClassificationScreen.touchDrag;
            if (!drag || cancelEvent.pointerId !== drag.pointerId) return;
            ClassificationScreen.finishPointerDragWithoutDrop();
        };

        document.addEventListener("pointermove", this.touchMoveHandler, { passive: false });
        document.addEventListener("pointerup", this.touchEndHandler, { passive: false });
        document.addEventListener("pointercancel", this.touchCancelHandler, { passive: false });
    },

    handlePointerDragMove: function (event) {
        const drag = this.touchDrag;
        if (!drag || !event.isTrusted) return;
        event.preventDefault();

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.active && Math.hypot(dx, dy) < 5) return;

        drag.active = true;
        this.dragActive = true;
        drag.pendingX = event.clientX;
        drag.pendingY = event.clientY;

        if (!drag.frame) {
            drag.frame = requestAnimationFrame(function () {
                const current = ClassificationScreen.touchDrag;
                if (!current || !current.overlay) return;
                current.frame = 0;
                const left = current.pendingX - current.offsetX;
                const top = current.pendingY - current.offsetY;
                current.overlay.style.transform = `translate3d(${left - current.originLeft}px, ${top - current.originTop}px, 0)`;
            });
        }

        this.updateDropTarget(event.clientX, event.clientY);
    },

    updateDropTarget: function (clientX, clientY) {
        document.querySelectorAll(".classificationDropZone").forEach(function (zone) {
            zone.classList.remove("drag-over");
        });
        const target = document.elementFromPoint(clientX, clientY);
        const zone = target && target.closest ? target.closest(".classificationDropZone") : null;
        if (zone) zone.classList.add("drag-over");
    },

    handlePointerDragEnd: function (event) {
        const drag = this.touchDrag;
        if (!drag || !event.isTrusted || this.dragSubmissionLocked) return;
        event.preventDefault();

        const target = document.elementFromPoint(event.clientX, event.clientY);
        const zone = target && target.closest ? target.closest(".classificationDropZone") : null;
        const itemId = drag.itemId;
        const categoryId = zone ? zone.dataset.categoryId : null;
        const wasDragging = drag.active;

        if (!wasDragging) {
            this.animateDragReturn(false);
            return;
        }

        this.dragSubmissionLocked = true;
        this.dragActive = false;
        this.dragItemId = null;
        document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });

        if (categoryId) {
            this.animateDragToDrop(zone, function () {
                ClassificationScreen.finishPointerDragState();
                ClassificationScreen.submitClassification(itemId, categoryId, "user");
            });
        } else {
            this.animateDragReturn(true);
        }
    },

    animateDragToDrop: function (zone, callback) {
        const drag = this.touchDrag;
        if (!drag || !drag.overlay || !zone) { if (callback) callback(); return; }

        const zoneRect = zone.getBoundingClientRect();
        const targetLeft = zoneRect.left + (zoneRect.width - drag.originWidth) / 2;
        const targetTop = zoneRect.top + Math.min(24, Math.max(0, (zoneRect.height - drag.originHeight) / 2));
        drag.overlay.style.transition = "transform 180ms cubic-bezier(.22,.8,.3,1)";
        drag.overlay.style.transform = `translate3d(${targetLeft - drag.originLeft}px, ${targetTop - drag.originTop}px, 0)`;
        window.setTimeout(function () { if (callback) callback(); }, 190);
    },

    animateDragReturn: function (keepLocked) {
        const drag = this.touchDrag;
        if (!drag || !drag.overlay) {
            this.finishPointerDragState();
            this.dragSubmissionLocked = !!keepLocked;
            return;
        }
        drag.overlay.style.transition = "transform 180ms cubic-bezier(.22,.8,.3,1)";
        drag.overlay.style.transform = "translate3d(0,0,0)";
        window.setTimeout(function () {
            ClassificationScreen.finishPointerDragState();
            ClassificationScreen.dragSubmissionLocked = false;
        }, 190);
    },

    finishPointerDragWithoutDrop: function () {
        this.dragSubmissionLocked = false;
        this.dragActive = false;
        this.dragItemId = null;
        this.animateDragReturn(false);
    },

    finishPointerDragState: function () {
        const drag = this.touchDrag;
        if (drag && drag.frame) {
            cancelAnimationFrame(drag.frame);
            drag.frame = 0;
        }
        this.clearTouchDragListeners();
        if (drag && drag.item) drag.item.classList.remove("classificationDragSource");
        if (drag && drag.overlay && drag.overlay.parentNode) drag.overlay.parentNode.removeChild(drag.overlay);
        document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });
        this.touchDrag = null;
        this.dragItemId = null;
        this.dragActive = false;
    },

    clearTouchDragListeners: function () {
        if (this.touchMoveHandler) document.removeEventListener("pointermove", this.touchMoveHandler);
        if (this.touchEndHandler) document.removeEventListener("pointerup", this.touchEndHandler);
        if (this.touchCancelHandler) document.removeEventListener("pointercancel", this.touchCancelHandler);
        this.touchMoveHandler = null;
        this.touchEndHandler = null;
        this.touchCancelHandler = null;
    },

    cancelTouchDrag: function () {
        const drag = this.touchDrag;
        if (drag && drag.frame) cancelAnimationFrame(drag.frame);
        this.clearTouchDragListeners();
        if (drag && drag.item) drag.item.classList.remove("classificationDragSource");
        if (drag && drag.overlay && drag.overlay.parentNode) drag.overlay.parentNode.removeChild(drag.overlay);
        document.querySelectorAll(".classificationDropZone").forEach(function (z) { z.classList.remove("drag-over"); });
        this.touchDrag = null;
        this.dragItemId = null;
        this.dragActive = false;
    },

    submitClassification: function (itemId, categoryId, source) {
        if (source !== "user") return null;
        if (!window.ClassificationEngine) return null;
        if ((this.getMode() === "dragDrop" || (this.getMode() === "multiStage" && this.getStageMode() === "dragDrop")) && this.dragSubmissionLocked === false) return null;

        const result = window.ClassificationEngine.classifyItem(itemId, categoryId);
        if (!result) {
            this.dragSubmissionLocked = false;
            return null;
        }
        if (result.stageCompleted === true) {
            this.lastMessage = `✓ مرحله ${Number(result.completedStage) + 1} تمام شد؛ مرحله بعدی شروع شد.`;
        } else {
            this.lastMessage = result.correct === true ? "✓ درست" : (result.retryAllowed ? "✗ دوباره تلاش کن" : "✗ نادرست");
        }
        this.currentState = window.ClassificationEngine.getState();
        if (this.currentState && this.currentState.finished) {
            this.showFinished(this.currentState.result);
            return result;
        }

        this.show(this.currentState);
        this.dragSubmissionLocked = false;
        return result;
    },

    renderPlacements: function (state) {
        const classifications = state.classifications || {};
        const categories = state.categories || [];
        const itemsById = {};
        (state.items || []).forEach(function (item) { itemsById[item.id] = item; });
        categories.forEach(function (category) {
            const target = document.querySelector(`[data-category-items="${ClassificationScreen.escapeAttribute(category.id)}"]`);
            if (!target) return;
            Object.keys(classifications).forEach(function (itemId) {
                const placement = classifications[itemId];
                if (!placement || !placement.correct || String(placement.categoryId) !== String(category.id)) return;
                const item = itemsById[itemId];
                if (!item) return;
                const content = item.type === "image" && item.content
                    ? `<img src="${ClassificationScreen.escapeAttribute(item.content)}" alt="">`
                    : ClassificationScreen.escapeHTML(item.content);
                target.insertAdjacentHTML("beforeend", `<div class="classificationPlacedItem">${content}</div>`);
            });
        });
    },

    showFinished: function (result) {
        if (!result) return;
        this.cancelTouchDrag();
        const app = document.getElementById("app");
        if (!app) return;
        app.innerHTML = `<div class="screen classificationScreen classificationFinished" dir="rtl">
            <h1>فعالیت تمام شد 🎉</h1>
            <div class="classificationResultCard">
                <div>امتیاز: <strong>${Number(result.score) || 0}</strong></div>
                <div>درصد: <strong>${Number(result.percentage) || 0}%</strong></div>
                <div>ستاره: <strong>${Number(result.stars) || 0} ⭐</strong></div>
                <div>پاسخ درست: <strong>${Number(result.correctAnswers) || 0}</strong></div>
                <div>پاسخ نادرست: <strong>${Number(result.wrongAnswers) || 0}</strong></div>
                <div>تعداد تلاش: <strong>${Number(result.moves) || 0}</strong></div>
            </div>
            <button type="button" id="classificationFinishedBackBtn" class="classificationBackBtn">بازگشت به فعالیت‌ها</button>
        </div>`;
        const back = document.getElementById("classificationFinishedBackBtn");
        if (back) back.onclick = function () {
            if (typeof App !== "undefined" && typeof App.showActivities === "function") App.showActivities();
        };
    },

    updateMessage: function () {
        const message = document.getElementById("classificationMessage");
        if (message) message.textContent = this.lastMessage || "";
    },

    getActivityId: function () { return this.currentActivity ? this.currentActivity.id : null; },
    escapeHTML: function (value) {
        const text = value === null || value === undefined ? "" : String(value);
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    },
    escapeAttribute: function (value) { return this.escapeHTML(value); }
};

window.ClassificationScreen = ClassificationScreen;
ClassificationScreen.init();
console.log("Classification Screen Ready v2.2");
