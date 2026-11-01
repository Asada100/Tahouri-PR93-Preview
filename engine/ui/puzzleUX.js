// =====================================
// Tahouri Edu Platform
// Puzzle UX Shared Layer
// Version 1.2
//
// Purpose:
// - Shared interaction vocabulary for all Puzzle types
// - Shared move-counter synchronization
// - Shared feedback state helpers
// - Shared interaction-family mapping
// - Shared Placement UX for Grid / WordGrid / CrossGrid
// - Shared Selection UX for Visual Math / Sentence Grammar
// - No Puzzle type owns common UX behavior
// =====================================

const PuzzleUX = {

    VERSION: "1.2",

    initialized: false,
    placementObserver: null,

    families: {
        ordering: "drag",
        sequence: "placement",
        visualMath: "selection",
        inputOutput: "placement",
        sentenceOrder: "drag",
        sentenceGrammar: "selection",
        grid: "placement",
        wordGrid: "placement",
        crossGrid: "placement"
    },

    interactionFamilies: {
        drag: {
            interaction: "drag",
            feedback: "snap"
        },
        placement: {
            interaction: "placement",
            feedback: "target"
        },
        selection: {
            interaction: "selection",
            feedback: "selected"
        }
    },

    placementSelectors:
        ".gridAnswerInput, .crossGridAnswerInput",

    selectionSelectors:
        ".visualComparisonBtn, .grammarSelect",

    getFamily: function (type, mode) {
        if (type === "sentence") {
            return this.families[mode || "sentenceOrder"] || "selection";
        }

        return this.families[type] || "selection";
    },

    getConfig: function (type, mode) {
        const family = this.getFamily(type, mode);
        return {
            type: type,
            mode: mode || null,
            family: family,
            ...(this.interactionFamilies[family] || this.interactionFamilies.selection)
        };
    },

    setFeedback: function (message, status) {
        if (!message) return;

        message.textContent = status === "correct"
            ? "درست است ✓"
            : status === "wrong"
                ? "هنوز درست نیست"
                : String(status || "");

        message.dataset.status = status || "";
        message.classList.remove(
            "puzzleFeedbackCorrect",
            "puzzleFeedbackWrong",
            "puzzleFeedbackNeutral"
        );

        message.classList.add(
            status === "correct"
                ? "puzzleFeedbackCorrect"
                : status === "wrong"
                    ? "puzzleFeedbackWrong"
                    : "puzzleFeedbackNeutral"
        );
    },

    clearFeedback: function (message) {
        if (!message) return;
        message.textContent = "";
        message.dataset.status = "";
        message.classList.remove(
            "puzzleFeedbackCorrect",
            "puzzleFeedbackWrong",
            "puzzleFeedbackNeutral"
        );
    },

    updateMoveCount: function (state) {
        const counter = document.getElementById("puzzleMoveCount");
        if (!counter || !state) return;
        counter.textContent = String(Number(state.moves || 0));
    },

    markTarget: function (element, active) {
        if (!element) return;
        element.classList.toggle("puzzleTargetActive", !!active);
    },

    animatePlacement: function (element) {
        if (!element) return;
        element.classList.remove("puzzlePlacementAnimation");
        void element.offsetWidth;
        element.classList.add("puzzlePlacementAnimation");
    },

    getPlacementCell: function (input) {
        if (!input) return null;

        return input.closest(
            ".gridMissing, .crossMissingCell"
        ) || input.parentElement;
    },

    decoratePlacementTargets: function () {
        const inputs = document.querySelectorAll(
            this.placementSelectors
        );

        inputs.forEach(function (input) {
            const cell = PuzzleUX.getPlacementCell(input);

            if (!cell) return;

            input.classList.add("puzzlePlacementInput");
            cell.classList.add("puzzlePlacementCell");

            if (!input.getAttribute("aria-label")) {
                input.setAttribute(
                    "aria-label",
                    "محل وارد کردن پاسخ"
                );
            }
        });
    },

    clearPlacementTargets: function (exceptCell) {
        document
            .querySelectorAll(
                ".puzzlePlacementCell.puzzleTargetActive"
            )
            .forEach(function (cell) {
                if (cell !== exceptCell) {
                    PuzzleUX.markTarget(cell, false);
                }
            });
    },

    handlePlacementFocus: function (input, active) {
        const cell = this.getPlacementCell(input);
        if (!cell) return;

        if (active) {
            this.clearPlacementTargets(cell);
            this.markTarget(cell, true);
            return;
        }

        this.markTarget(cell, false);
    },

    handlePlacementInput: function (input) {
        const cell = this.getPlacementCell(input);
        if (!cell) return;

        const hasValue = String(input.value || "").trim() !== "";
        const wasFilled = cell.dataset.filled === "true";

        cell.classList.toggle("puzzlePlacementFilled", hasValue);

        if (hasValue && !wasFilled) {
            this.animatePlacement(cell);
        }

        cell.dataset.filled = hasValue ? "true" : "false";
    },

    handlePlacementKeydown: function (event, input) {
        if (event.key !== "Enter") return;

        const screen = input.closest(".puzzleScreen");
        if (!screen) return;

        const checkButton =
            screen.querySelector("#gridCheckBtn") ||
            screen.querySelector("#crossGridCheckBtn");

        if (!checkButton) return;

        event.preventDefault();
        checkButton.click();
    },

    handleSelection: function (element) {
        if (!element) return;

        const selector = element.matches(".visualComparisonBtn")
            ? ".visualComparisonBtn"
            : ".grammarSelect";

        const scope = element.closest(".puzzleScreen") || document;

        scope.querySelectorAll(selector).forEach(function (item) {
            item.classList.remove("puzzleSelectionActive");
        });

        element.classList.add("puzzleSelectionActive");
    },

    decorateSelectionTargets: function () {
        document.querySelectorAll(this.selectionSelectors).forEach(function (element) {
            element.classList.add("puzzleSelectionTarget");
        });
    },

    bindSelectionEvents: function () {
        if (this.selectionEventsBound) return;
        this.selectionEventsBound = true;

        document.addEventListener("click", function (event) {
            const button = event.target.closest(".visualComparisonBtn");
            if (!button) return;
            PuzzleUX.handleSelection(button);
        });

        document.addEventListener("change", function (event) {
            const select = event.target.closest(".grammarSelect");
            if (!select) return;
            PuzzleUX.handleSelection(select);
        });
    },

    bindPlacementEvents: function () {
        if (this.placementEventsBound) return;
        this.placementEventsBound = true;

        document.addEventListener("focusin", function (event) {
            const input = event.target.closest(
                PuzzleUX.placementSelectors
            );

            if (!input) return;
            PuzzleUX.decoratePlacementTargets();
            PuzzleUX.handlePlacementFocus(input, true);
        });

        document.addEventListener("focusout", function (event) {
            const input = event.target.closest(
                PuzzleUX.placementSelectors
            );

            if (!input) return;
            PuzzleUX.handlePlacementFocus(input, false);
        });

        document.addEventListener("input", function (event) {
            const input = event.target.closest(
                PuzzleUX.placementSelectors
            );

            if (!input) return;
            PuzzleUX.handlePlacementInput(input);
        });

        document.addEventListener("keydown", function (event) {
            const input = event.target.closest(
                PuzzleUX.placementSelectors
            );

            if (!input) return;
            PuzzleUX.handlePlacementKeydown(event, input);
        });
    },

    observePlacementTargets: function () {
        if (this.placementObserver) return;
        if (typeof MutationObserver === "undefined") return;

        const root = document.getElementById("app") || document.body;
        if (!root) return;

        this.placementObserver = new MutationObserver(function () {
            PuzzleUX.decoratePlacementTargets();
            PuzzleUX.decorateSelectionTargets();
        });

        this.placementObserver.observe(root, {
            childList: true,
            subtree: true
        });

        this.decoratePlacementTargets();
        this.decorateSelectionTargets();
    },

    init: function () {
        if (this.initialized) return;
        this.initialized = true;

        this.bindPlacementEvents();
        this.bindSelectionEvents();
        this.observePlacementTargets();

        if (typeof EventManager !== "undefined") {
            EventManager.on("puzzleChanged", function (state) {
                PuzzleUX.updateMoveCount(state);
                PuzzleUX.decoratePlacementTargets();
                PuzzleUX.decorateSelectionTargets();
            });
        }

        console.log("Puzzle UX Shared Layer v1.2 Ready");
    }
};

window.PuzzleUX = PuzzleUX;
PuzzleUX.init();
