// =====================================
// Tahouri Edu Platform
// Difficulty Modal v1.2
// CSS is owned by difficultyModal.css
// =====================================

const DifficultyModal = {
    isOpen: false,
    escapeHandler: null,

    init: function () {
        console.log("Difficulty Modal Ready");
    },

    open: async function (activityData, onSelect) {
        if (!activityData) {
            console.error("Difficulty Modal: Activity Missing");
            return;
        }

        // Divisibility quizzes use the same level-selection modal as puzzles,
        // but must not pass through the Jigsaw-only validation below.
        const activitySettings = activityData.settings || {};
        const isDivisibilityQuiz =
            String(activityData.group || "").toLowerCase() === "divisibility" ||
            String(activitySettings.mode || "").toLowerCase() === "divisibility";

        if (isDivisibilityQuiz) {
            if (this.isOpen) return;
            this.isOpen = true;

            const overlay = document.createElement("div");
            overlay.id = "difficultyModalOverlay";
            overlay.innerHTML = `
                <div class="difficultyModal" role="dialog" aria-modal="true">
                    <h2>انتخاب سطح سؤال</h2>
                    <p>${activityData.title || "بخش‌پذیری"}</p>
                    <div class="difficultyOptions">
                        <button class="difficultyOption" data-difficulty="easy" type="button">🟢 ساده <small>اعداد کوچک‌تر</small></button>
                        <button class="difficultyOption" data-difficulty="medium" type="button">🟡 معمولی <small>اعداد متوسط</small></button>
                        <button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت <small>اعداد بزرگ‌تر</small></button>
                    </div>
                    <button id="difficultyCancelBtn" type="button">انصراف</button>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelectorAll(".difficultyOption").forEach(function (button) {
                button.onclick = function () {
                    const selectedActivity = {
                        ...activityData,
                        settings: {
                            ...(activityData.settings || {}),
                            difficulty: this.dataset.difficulty
                        }
                    };
                    DifficultyModal.close();
                    if (typeof onSelect === "function") onSelect(selectedActivity);
                };
            });

            const cancelButton = overlay.querySelector("#difficultyCancelBtn");
            if (cancelButton) cancelButton.onclick = function () { DifficultyModal.close(); };
            overlay.onclick = function (event) {
                if (event.target === overlay) DifficultyModal.close();
            };
            this.escapeHandler = function (event) {
                if (event.key === "Escape") DifficultyModal.close();
            };
            document.addEventListener("keydown", this.escapeHandler);
            return;
        }

        let puzzle = activityData.puzzle || {};
        let mode = activityData.jigsawMode ||
            (puzzle.image ? "image" :
                ((puzzle.content && Array.isArray(puzzle.content.words)) || Array.isArray(puzzle.words) || Array.isArray(puzzle.questions) ? "words" : null));

        // Activity index entries intentionally contain only routing metadata.
        // Load the activity definition before deciding which Jigsaw UI to show.
        if ((!mode || String(puzzle.type || "").toLowerCase() !== "jigsaw") &&
            activityData.path &&
            typeof DataManager !== "undefined" &&
            typeof DataManager.loadJSON === "function") {
            try {
                const config = await DataManager.loadJSON(activityData.path + "/activity.json");
                if (config && config.puzzle) {
                    puzzle = config.puzzle;
                    mode = puzzle.image ? "image" :
                        ((puzzle.content && Array.isArray(puzzle.content.words)) || Array.isArray(puzzle.words) || Array.isArray(puzzle.questions) ? "words" : null);
                }
            } catch (error) {
                console.warn("Difficulty Modal: Could not load Jigsaw activity definition.", error);
            }
        }

        if (String(puzzle.type || "").toLowerCase() !== "jigsaw" || !mode) {
            console.error("Difficulty Modal: Jigsaw definition missing.", activityData.id);
            this.isOpen = false;
            return;
        }

        if (this.isOpen) return;
        this.isOpen = true;

        const isWord = mode === "words";
        const options = isWord
            ? '<button class="difficultyOption" data-difficulty="easy" type="button">🟢 ساده <small>۴ کلمه تصادفی</small></button>' +
              '<button class="difficultyOption" data-difficulty="medium" type="button">🟡 متوسط <small>۸ کلمه تصادفی</small></button>' +
              '<button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت <small>همه کلمات تصادفی</small></button>'
            : '<button class="difficultyOption" data-difficulty="easy" type="button">🟢 ساده <small>۳×۳</small></button>' +
              '<button class="difficultyOption" data-difficulty="medium" type="button">🟡 متوسط <small>۳×۴ / ۴×۳ / ۴×۴</small></button>' +
              '<button class="difficultyOption" data-difficulty="hard" type="button">🔴 سخت <small>۴×۵ / ۵×۴ / ۵×۵</small></button>';

        const overlay = document.createElement("div");
        overlay.id = "difficultyModalOverlay";
        overlay.innerHTML = `
            <div class="difficultyModal" role="dialog" aria-modal="true">
                <h2>انتخاب سطح سؤال</h2>
                <p>${activityData.title || ""}</p>
                <div class="difficultyOptions">${options}</div>
                <button id="difficultyCancelBtn" type="button">انصراف</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll(".difficultyOption").forEach(function (button) {
            button.onclick = async function () {
                const difficulty = this.dataset.difficulty;

                // Set the level grid immediately so a slow/failed image
                // dimension check can never silently fall back to 3×3.
                const baseGrid = difficulty === "hard"
                    ? { rows: 5, cols: 5 }
                    : difficulty === "medium"
                        ? { rows: 4, cols: 4 }
                        : { rows: 3, cols: 3 };

                const selectedActivity = {
                    ...activityData,
                    settings: {
                        ...(activityData.settings || {}),
                        difficulty: difficulty,
                        jigsawLevelSelected: true
                    }
                };

                if (isWord) {
                    selectedActivity.settings.wordJigsawDifficulty =
                        difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;
                    DifficultyModal.close();
                    if (typeof onSelect === "function") onSelect(selectedActivity);
                    return;
                }

                selectedActivity.settings.jigsawRows = baseGrid.rows;
                selectedActivity.settings.jigsawCols = baseGrid.cols;

                // Jigsaw grid size follows the actual image orientation.
                // The image is inspected before the engine starts so the
                // player chooses only the level, not technical row/column data.
                if (String(activityData.type || "").toLowerCase() === "puzzle" &&
                    String(activityData.engine || "").toLowerCase() === "puzzle" &&
                    activityData.path && typeof DataManager !== "undefined" &&
                    typeof DataManager.loadJSON === "function") {
                    try {
                        const config = await DataManager.loadJSON(activityData.path + "/activity.json");
                        const puzzle = config && config.puzzle ? config.puzzle : null;
                        if (puzzle && String(puzzle.type || "").toLowerCase() === "jigsaw" && puzzle.image) {
                            const image = new Image();
                            image.onload = function () {
                                const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
                                const orientation = ratio > 1.08 ? "landscape" : (ratio < 0.92 ? "portrait" : "square");
                                let rows = 3, cols = 3;
                                if (difficulty === "medium") {
                                    if (orientation === "landscape") { rows = 3; cols = 4; }
                                    else if (orientation === "portrait") { rows = 4; cols = 3; }
                                    else { rows = 4; cols = 4; }
                                } else if (difficulty === "hard") {
                                    if (orientation === "landscape") { rows = 4; cols = 5; }
                                    else if (orientation === "portrait") { rows = 5; cols = 4; }
                                    else { rows = 5; cols = 5; }
                                }
                                selectedActivity.settings.jigsawRows = rows;
                                selectedActivity.settings.jigsawCols = cols;
                                DifficultyModal.close();
                                if (typeof onSelect === "function") onSelect(selectedActivity);
                            };
                            image.onerror = function () {
                                DifficultyModal.close();
                                if (typeof onSelect === "function") onSelect(selectedActivity);
                            };
                            image.src = puzzle.image;
                            return;
                        }
                    } catch (error) {
                        console.warn("Difficulty Modal: Could not inspect Jigsaw image orientation.", error);
                    }
                }

                DifficultyModal.close();
                if (typeof onSelect === "function") onSelect(selectedActivity);
            };
        });

        const cancelBtn = overlay.querySelector("#difficultyCancelBtn");
        if (cancelBtn) cancelBtn.onclick = function () { DifficultyModal.close(); };

        overlay.onclick = function (event) {
            if (event.target === overlay) DifficultyModal.close();
        };

        this.escapeHandler = function (event) {
            if (event.key === "Escape") DifficultyModal.close();
        };
        document.addEventListener("keydown", this.escapeHandler);
    },

    close: function () {
        const overlay = document.getElementById("difficultyModalOverlay");
        if (overlay) overlay.remove();

        if (this.escapeHandler) {
            document.removeEventListener("keydown", this.escapeHandler);
            this.escapeHandler = null;
        }

        this.isOpen = false;
    }
};

window.DifficultyModal = DifficultyModal;
DifficultyModal.init();
