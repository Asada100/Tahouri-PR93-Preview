// =====================================
// Tahouri Edu Platform
// Matching Screen
// Version 1.8
//
// Supports one-to-one and many-to-one Matching.
// Right-side targets remain reusable.
// Uses Pointer Events for mouse + touch.
// =====================================

const MatchingScreen = {

    activityReadyConnected: false,
    currentActivityId: null,
    lastMessage: "",
    lastMessageType: "",
    messageTimer: null,

    // Keeps only the visual path of already-correct connections.
    // MatchingEngine remains the source of truth for correctness.
    completedConnectionPaths: {},

    connection: {
        active: false,
        side: null,
        itemId: null,
        moveHandler: null,
        upHandler: null,
        cancelHandler: null,
        pointerId: null,
        pathPoints: [],
        lastTargetButton: null
    },

    init: function () {
        if (typeof EventManager === "undefined") {
            console.error("Matching Screen: EventManager Not Available");
            return;
        }

        if (this.activityReadyConnected) return;

        EventManager.on("activityReady", function (payload) {
            MatchingScreen.handleActivityReady(payload);
        });

        this.activityReadyConnected = true;
        console.log("Matching Screen: Activity Ready Listener Connected");
    },

    handleActivityReady: function (payload) {
        if (!payload) return;

        if (payload.engineName !== "MatchingEngine" && payload.engineName !== "matching") {
            return;
        }

        if (!payload.result) {
            console.error("Matching Screen: Matching Result Missing");
            return;
        }

        this.currentActivityId = payload.activity ? payload.activity.id : null;
        console.log(
            "Matching Screen: Activity Ready Received",
            this.currentActivityId
        );

        this.show(payload.result);
    },

    show: function (state) {
        if (!state) {
            console.error("Matching Screen: State Missing");
            return;
        }

        this.cancelPointerConnection();

        const app = this.getApp();
        if (!app) return;

        const leftItems = Array.isArray(state.leftItems) ? state.leftItems : [];
        const rightItems = Array.isArray(state.rightItems) ? state.rightItems : [];
        const matchedPairs = Array.isArray(state.matchedPairs) ? state.matchedPairs : [];

        // A new activity/session starts with no previous visual paths.
        // Existing correct matches are redrawn only when their paths are known.
        if (matchedPairs.length === 0) {
            this.completedConnectionPaths = {};
        }

        const selectedLeftId = state.selected && state.selected.left
            ? String(state.selected.left.id)
            : null;

        const selectedRightId = state.selected && state.selected.right
            ? String(state.selected.right.id)
            : null;

        const leftHTML = leftItems.map(function (item) {
            return MatchingScreen.renderItem(
                item,
                "left",
                selectedLeftId,
                matchedPairs,
                state
            );
        }).join("");

        const rightHTML = rightItems.map(function (item) {
            return MatchingScreen.renderItem(
                item,
                "right",
                selectedRightId,
                matchedPairs,
                state
            );
        }).join("");

        const message = this.lastMessage
            ? `<div class="matchingMessage ${this.lastMessageType}">${this.escapeHTML(this.lastMessage)}</div>`
            : "";

        app.innerHTML = `
            <div class="screen matchingScreen ${this.currentActivityId === "matchingManyToOne" ? "matchingActivity-detective" : ""}" dir="rtl">
                <h1>${this.currentActivityId === "matchingManyToOne" ? "کارآگاهان عدد 🔎" : "تطبیق موارد مرتبط"}</h1>

                <p class="matchingInstruction">
                    ${this.escapeHTML(state.instruction || "موارد مرتبط را به هم وصل کن.")}
                </p>

                <div class="matchingBoard" style="position:relative;">
                    <svg
                        class="matchingConnections"
                        aria-hidden="true"
                        focusable="false"
                        style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:3;">
                    </svg>

                    <div class="matchingColumn matchingLeftColumn" data-side="left" style="position:relative;z-index:2;">
                        <div class="matchingColumnTitle">${this.currentActivityId === "matchingManyToOne" ? "عددها" : "مورد اول"}</div>
                        <div class="matchingItems">${leftHTML}</div>
                    </div>

                    <div class="matchingColumn matchingRightColumn" data-side="right" style="position:relative;z-index:2;">
                        <div class="matchingColumnTitle">${this.currentActivityId === "matchingManyToOne" ? "زوج یا فرد" : "مورد دوم"}</div>
                        <div class="matchingItems">${rightHTML}</div>
                    </div>
                </div>

                <div class="matchingStatus">
                    حرکت‌ها: ${Number.isFinite(state.moves) ? state.moves : 0}
                    |
                    تطبیق‌ها: ${Array.isArray(state.matchedLeftIds) ? state.matchedLeftIds.length : matchedPairs.length}
                    از ${state.totalPairs || 0}
                </div>

                ${message}
            </div>
        `;

        this.bindEvents();
        this.drawMatchedConnections();
        this.scheduleMessageDismiss();
    },

    scheduleMessageDismiss: function () {
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }

        const message = document.querySelector(".matchingMessage");
        if (!message || !this.lastMessage) return;

        message.addEventListener("click", this.dismissMessage.bind(this), { once: true });

        this.messageTimer = window.setTimeout(function () {
            MatchingScreen.dismissMessage();
        }, 5000);
    },

    dismissMessage: function () {
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }

        const message = document.querySelector(".matchingMessage");
        if (!message) {
            this.lastMessage = "";
            this.lastMessageType = "";
            return;
        }

        message.classList.add("is-hiding");
        window.setTimeout(function () {
            if (message.parentNode) message.parentNode.removeChild(message);
            MatchingScreen.lastMessage = "";
            MatchingScreen.lastMessageType = "";
        }, 220);
    },

    renderItem: function (item, side, selectedId, matchedPairs, state) {
        const itemId = String(item.id);
        const matched = this.isItemMatched(side, itemId, matchedPairs, state);
        const selected = selectedId === itemId;
        const classes = ["matchingItem"];

        if (selected) classes.push("selected");
        if (matched) classes.push("matched");

        // Only a matched LEFT item becomes unavailable.
        // Right targets are reusable for many left items.
        const disabled = state.finished || (side === "left" && matched);

        return `
            <button
                type="button"
                class="${classes.join(" ")}"
                data-matching-side="${side}"
                data-matching-id="${this.escapeAttribute(itemId)}"
                ${disabled ? "disabled" : ""}>
                ${this.renderItemContent(item)}
            </button>
        `;
    },

    renderItemContent: function (item) {
        if (!item || typeof item !== "object") return "";

        if (item.image) {
            return `
                <span class="matchingItemImageWrap">
                    <img class="matchingItemImage" src="${this.escapeAttribute(item.image)}" alt="" draggable="false">
                </span>
            `;
        }

        const value = item.value !== undefined
            ? item.value
            : item.text !== undefined
                ? item.text
                : item.label !== undefined
                    ? item.label
                    : item.name !== undefined
                        ? item.name
                        : "";

        return this.escapeHTML(value);
    },

    bindEvents: function () {
        const buttons = document.querySelectorAll("[data-matching-side][data-matching-id]");

        buttons.forEach(function (button) {
            button.addEventListener("pointerdown", function (event) {
                MatchingScreen.beginPointerConnection(event, button);
            });
        });
    },

    beginPointerConnection: function (event, button) {
        if (!event || !button || button.disabled) return;

        // Pointer Events use button=0 for mouse. Touch pointers do not have
        // a mouse button value, so only reject non-primary mouse buttons.
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const side = button.getAttribute("data-matching-side");
        const itemId = button.getAttribute("data-matching-id");
        if (!side || !itemId) return;

        event.preventDefault();
        event.stopPropagation();
        this.cancelPointerConnection();

        this.connection.active = true;
        this.connection.side = side;
        this.connection.itemId = itemId;
        this.connection.pointerId = event.pointerId !== undefined ? event.pointerId : null;
        this.connection.pathPoints = [];
        this.connection.lastTargetButton = null;

        if (typeof button.setPointerCapture === "function" && event.pointerId !== undefined) {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
                // Pointer capture is optional; document-level listeners still handle the drag.
            }
        }

        this.connection.moveHandler = function (moveEvent) {
            if (moveEvent.pointerId !== event.pointerId) return;
            moveEvent.preventDefault();
            MatchingScreen.updatePreviewConnection(moveEvent.clientX, moveEvent.clientY);
        };

        this.connection.upHandler = function (upEvent) {
            if (upEvent.pointerId !== event.pointerId) return;
            MatchingScreen.finishPointerConnection(upEvent);
        };

        this.connection.cancelHandler = function (cancelEvent) {
            if (cancelEvent.pointerId !== event.pointerId) return;
            MatchingScreen.cancelPointerConnection();
        };

        document.addEventListener("pointermove", this.connection.moveHandler, {passive: false});
        document.addEventListener("pointerup", this.connection.upHandler, true);
        document.addEventListener("pointercancel", this.connection.cancelHandler, true);

        this.updatePreviewConnection(event.clientX, event.clientY);
    },

    finishPointerConnection: function (event) {
        if (!this.connection.active) return;

        const startSide = this.connection.side;
        const startId = this.connection.itemId;
        const pointerTarget = event
            ? document.elementFromPoint(event.clientX, event.clientY)
            : null;

        const pointerButton = pointerTarget && typeof pointerTarget.closest === "function"
            ? pointerTarget.closest("[data-matching-side][data-matching-id]")
            : null;

        const targetButton = this.connection.lastTargetButton || pointerButton;

        const targetSide = targetButton ? targetButton.getAttribute("data-matching-side") : null;
        const targetId = targetButton ? targetButton.getAttribute("data-matching-id") : null;

        const validTarget = targetButton &&
            !targetButton.disabled &&
            targetSide &&
            targetId &&
            targetSide !== startSide &&
            String(targetId) !== String(startId);

        const currentPath = this.connection.pathPoints.map(function(point) {
            return {x: point.x, y: point.y};
        });

        // The target center is used only for validation/highlighting.
        // The completed visual path must end exactly where the child released
        // the mouse/finger, so it never crosses the target text unnecessarily.

        this.cancelPointerConnection();
        if (!validTarget) return;

        if (typeof MatchingEngine === "undefined" || typeof MatchingEngine.select !== "function") {
            console.error("Matching Screen: Matching Engine Not Available");
            return;
        }

        const firstResult = MatchingEngine.select(startSide, startId);
        if (!firstResult) return;

        this.handleSelection(targetSide, targetId, {
            startSide: startSide,
            startId: startId,
            points: currentPath
        });
    },

    cancelPointerConnection: function () {
        if (this.connection.moveHandler) {
            document.removeEventListener("pointermove", this.connection.moveHandler, {passive: false});
        }

        if (this.connection.upHandler) {
            document.removeEventListener("pointerup", this.connection.upHandler, true);
        }

        if (this.connection.cancelHandler) {
            document.removeEventListener("pointercancel", this.connection.cancelHandler, true);
        }

        this.connection.active = false;
        this.connection.side = null;
        this.connection.itemId = null;
        this.connection.pointerId = null;
        this.connection.pathPoints = [];
        this.connection.lastTargetButton = null;
        this.connection.moveHandler = null;
        this.connection.upHandler = null;
        this.connection.cancelHandler = null;

        const svg = document.querySelector(".matchingConnections");
        if (svg) {
            const preview = svg.querySelector(".matchingPreviewConnection");
            if (preview) preview.remove();
        }

        document.querySelectorAll(".matchingItem.connectionTarget").forEach(function(item) {
            item.classList.remove("connectionTarget");
        });
    },

    // Backward-compatible name for any existing internal/external callers.
    cancelMouseConnection: function () {
        this.cancelPointerConnection();
    },

    updatePreviewConnection: function (clientX, clientY) {
        if (!this.connection.active) return;

        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");
        const startButton = this.findMatchingButton(this.connection.side, this.connection.itemId);
        if (!board || !svg || !startButton) return;

        const boardRect = board.getBoundingClientRect();
        const startPoint = this.getElementCenter(startButton, boardRect);
        const endPoint = {
            x: clientX - boardRect.left,
            y: clientY - boardRect.top
        };

        const path = this.connection.pathPoints;
        const last = path[path.length - 1];
        if (!last || Math.hypot(last.x - endPoint.x, last.y - endPoint.y) >= 3) {
            path.push(endPoint);

            // Keep the ORIGINAL starting point. On touch devices a long
            // gesture can generate many points; dropping points from the
            // beginning makes the completed green path appear to start
            // from the middle of the child's movement.
            if (path.length > 120) {
                const firstPoint = path[0];
                const lastPoint = path[path.length - 1];
                const sampled = [firstPoint];
                const interiorCount = 118;

                for (let index = 1; index <= interiorCount; index += 1) {
                    const sourceIndex = Math.round(
                        1 + (index - 1) * (path.length - 3) / (interiorCount - 1)
                    );
                    sampled.push(path[sourceIndex]);
                }

                sampled.push(lastPoint);
                this.connection.pathPoints = sampled;
            }
        }

        // Children may intentionally doodle/zig-zag while dragging.
        // If the CURRENT stroke becomes excessive, clear only that stroke.
        // Completed correct connections remain untouched.
        const maxPathLength = Math.max(900, Math.min(1800, boardRect.width * 2.2));
        if (this.getPathLength([startPoint].concat(path)) > maxPathLength) {
            this.connection.pathPoints = [];
            this.connection.lastTargetButton = null;

            document.querySelectorAll(".matchingItem.connectionTarget").forEach(function(item) {
                item.classList.remove("connectionTarget");
            });

            const oldPreview = svg.querySelector(".matchingPreviewConnection");
            if (oldPreview) oldPreview.remove();
            return;
        }

        let preview = svg.querySelector(".matchingPreviewConnection");
        if (!preview) {
            preview = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            preview.setAttribute("class", "matchingPreviewConnection");
            preview.setAttribute("fill", "none");
            preview.setAttribute("stroke", "#2563eb");
            preview.setAttribute("stroke-width", "4");
            preview.setAttribute("stroke-linecap", "round");
            preview.setAttribute("stroke-linejoin", "round");
            preview.setAttribute("stroke-dasharray", "7 6");
            svg.appendChild(preview);
        }

        const points = [startPoint].concat(path);
        preview.setAttribute("points", points.map(function(point) {
            return point.x + "," + point.y;
        }).join(" "));

        const pointerTarget = document.elementFromPoint(clientX, clientY);
        const pointerButton = pointerTarget && typeof pointerTarget.closest === "function"
            ? pointerTarget.closest("[data-matching-side][data-matching-id]")
            : null;

        if (pointerButton) {
            const targetSide = pointerButton.getAttribute("data-matching-side");
            const targetId = pointerButton.getAttribute("data-matching-id");
            if (targetSide && targetSide !== this.connection.side &&
                targetId && String(targetId) !== String(this.connection.itemId) &&
                !pointerButton.disabled) {
                this.connection.lastTargetButton = pointerButton;
                document.querySelectorAll(".matchingItem.connectionTarget").forEach(function(item) {
                    item.classList.remove("connectionTarget");
                });
                pointerButton.classList.add("connectionTarget");
            }
        }
    },

    getPathLength: function (points) {
        if (!Array.isArray(points) || points.length < 2) return 0;

        let length = 0;
        for (let index = 1; index < points.length; index += 1) {
            length += Math.hypot(
                points[index].x - points[index - 1].x,
                points[index].y - points[index - 1].y
            );
        }
        return length;
    },

    pointsToSmoothSvgPath: function (points) {
        if (!Array.isArray(points) || points.length === 0) return "";
        if (points.length === 1) {
            return "M " + points[0].x + " " + points[0].y;
        }

        let d = "M " + points[0].x + " " + points[0].y;

        for (let index = 0; index < points.length - 1; index += 1) {
            const p0 = points[index - 1] || points[index];
            const p1 = points[index];
            const p2 = points[index + 1];
            const p3 = points[index + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += " C " +
                cp1x + " " + cp1y + " " +
                cp2x + " " + cp2y + " " +
                p2.x + " " + p2.y;
        }

        return d;
    },

    drawMatchedConnections: function () {
        const board = document.querySelector(".matchingBoard");
        const svg = document.querySelector(".matchingConnections");
        if (!board || !svg) return;

        while (svg.firstChild) svg.removeChild(svg.firstChild);

        if (typeof MatchingEngine === "undefined" ||
            !MatchingEngine.matching ||
            !Array.isArray(MatchingEngine.matching.pairs)) {
            return;
        }

        const matchedPairs = Array.isArray(MatchingEngine.matchedPairs)
            ? MatchingEngine.matchedPairs
            : [];

        const boardRect = board.getBoundingClientRect();

        matchedPairs.forEach(function (pairId) {
            const pair = MatchingEngine.matching.pairs.find(function (item) {
                return String(item.id) === String(pairId);
            });

            if (!pair) return;

            const leftButton = MatchingScreen.findMatchingButton("left", pair.left.id);
            const rightButton = MatchingScreen.findMatchingButton("right", pair.right.id);
            if (!leftButton || !rightButton) return;

            const leftPoint = MatchingScreen.getElementCenter(leftButton, boardRect);
            const rightPoint = MatchingScreen.getElementCenter(rightButton, boardRect);

            const stored = MatchingScreen.completedConnectionPaths[String(pair.left.id)];
            const points = stored && Array.isArray(stored.points) && stored.points.length >= 2
                ? stored.points
                : [leftPoint, rightPoint];

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "matchingPairConnection");
            path.setAttribute("d", MatchingScreen.pointsToSmoothSvgPath(points));
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#16a34a");
            path.setAttribute("stroke-width", "4");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            svg.appendChild(path);
        });
    },

    findMatchingButton: function (side, itemId) {
        const buttons = document.querySelectorAll("[data-matching-side][data-matching-id]");
        const normalizedId = String(itemId);

        for (let index = 0; index < buttons.length; index += 1) {
            const button = buttons[index];
            if (button.getAttribute("data-matching-side") === side &&
                String(button.getAttribute("data-matching-id")) === normalizedId) {
                return button;
            }
        }

        return null;
    },

    getElementCenter: function (element, boardRect) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left - boardRect.left + rect.width / 2,
            y: rect.top - boardRect.top + rect.height / 2
        };
    },

    handleSelection: function (side, itemId, connectionData) {
        if (typeof MatchingEngine === "undefined" || typeof MatchingEngine.select !== "function") {
            console.error("Matching Screen: Matching Engine Not Available");
            return;
        }

        const result = MatchingEngine.select(side, itemId);
        if (!result) return;

        if (Object.prototype.hasOwnProperty.call(result, "correct")) {
            this.lastMessage = result.correct
                ? "آفرین! تطبیق درست است."
                : "این دو مورد با هم مرتبط نیستند.";

            this.lastMessageType = result.correct ? "success" : "error";

            if (result.correct &&
                connectionData &&
                Array.isArray(connectionData.points) &&
                connectionData.points.length >= 2) {
                const leftId = connectionData.startSide === "left"
                    ? String(connectionData.startId)
                    : String(itemId);

                const rightId = connectionData.startSide === "right"
                    ? String(connectionData.startId)
                    : String(itemId);

                this.completedConnectionPaths[leftId] = {
                    leftId: leftId,
                    rightId: rightId,
                    points: connectionData.points.map(function(point) {
                        return {x: point.x, y: point.y};
                    })
                };
            }

            this.show(MatchingEngine.getState());

            if (MatchingEngine.getState().finished) {
                this.lastMessage = "فعالیت با موفقیت کامل شد.";
                this.lastMessageType = "success";
                this.show(MatchingEngine.getState());
            }
            return;
        }

        this.show(MatchingEngine.getState());
    },

    isItemMatched: function (side, itemId, matchedPairs, state) {
        if (side === "right") {
            // Right targets are reusable and therefore never become matched/disabled.
            return false;
        }

        if (state && Array.isArray(state.matchedLeftIds)) {
            return state.matchedLeftIds.includes(String(itemId));
        }

        if (!Array.isArray(matchedPairs) || typeof MatchingEngine === "undefined" || !MatchingEngine.matching) {
            return false;
        }

        return MatchingEngine.matching.pairs.some(function (pair) {
            return matchedPairs.includes(pair.id) && String(pair.left.id) === String(itemId);
        });
    },

    getApp: function () {
        const app = document.getElementById("app");
        if (!app) {
            console.error("Matching Screen: App Container Not Found");
            return null;
        }
        return app;
    },

    escapeHTML: function (value) {
        const text = value === null || value === undefined ? "" : String(value);
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    escapeAttribute: function (value) {
        return this.escapeHTML(value);
    }
};

window.MatchingScreen = MatchingScreen;

// =====================================
// INITIALIZE MATCHING SCREEN
// =====================================
MatchingScreen.init();

console.log("Matching Screen Ready v1.8");