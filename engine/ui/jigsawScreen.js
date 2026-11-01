// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Screen
// Version 2.1
// Image jigsaw + attractive word/sentence jigsaw
// =====================================

const JigsawScreen = {
    connected: false,
    dragIndex: null,
    dragElement: null,
    dragStartX: 0,
    dragStartY: 0,
    dragMoved: false,
    selectedIndex: null,
    suppressClick: false,
    dragTargetIndex: null,
    imagePointerBound: false,
    imagePreviewTimer: null,
    imagePreviewInterval: null,
    imagePreviewCompleted: false,
    imagePreviewKey: null,
    inactivityTimer: null,
    inactivityMessageVisible: false,

    init: function () {
        if (typeof EventManager === "undefined" || this.connected) return;
        EventManager.on("activityReady", function (payload) { JigsawScreen.handleReady(payload); });
        EventManager.on("puzzleChanged", function (state) {
            if (state && state.type === "jigsaw" && !(PuzzleEngine.state && PuzzleEngine.state.isFinished)) JigsawScreen.render(state);
        });
        EventManager.on("activityFinished", function () {
            JigsawScreen.clearDrag();
            document.body.classList.remove("activity-playing");
        });
        this.connected = true;
        console.log("Jigsaw Screen v2.1 Ready");
    },

    handleReady: function (payload) {
        if (!payload) return;
        const engineName = String(payload.engineName || "").toLowerCase();
        if (engineName !== "puzzle" && engineName !== "puzzleengine") return;
        const active = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        if ((payload.result && payload.result.type) !== "jigsaw" && (!active || active.type !== "jigsaw")) return;
        this.selectedIndex = null;
        this.render(payload.result || PuzzleEngine.getState());
    },

    show: function (state) {
        return this.render(state);
    },

    render: function (state) {
        const app = document.getElementById("app");
        document.body.classList.add("activity-playing");
        const puzzle = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        if (!app || !puzzle || puzzle.type !== "jigsaw") return;
        const core = typeof JigsawPuzzle !== "undefined" ? JigsawPuzzle.getState() : null;
        if (!core) return;
        if (core.mode === "words") this.renderWords(app, puzzle, core, state || {});
        else this.renderImage(app, puzzle, core, state || {});
    },

    renderWords: function (app, puzzle, core, state) {
        const slots = [];
        for (let position = 0; position < core.pieceCount; position += 1) {
            const piece = core.pieces.find(function (item) { return item.currentIndex === position; });
            if (!piece) continue;
            const correct = JigsawPuzzle.normalizeWord(piece.word) === JigsawPuzzle.normalizeWord(core.words[position]);
            slots.push(`
                <button class="wordJigsawPiece${correct ? " isCorrect" : ""}${this.selectedIndex === position ? " isSelected" : ""}" data-position="${position}" type="button" aria-label="واژه ${position + 1}">
                    <span class="wordJigsawIndex">${position + 1}</span>
                    <span class="wordJigsawText">${this.escapeHTML(piece.word)}</span>
                </button>`);
        }

        app.innerHTML = `
            <div class="screen puzzleScreen jigsawScreen wordJigsawScreen" dir="rtl">
                <div class="jigsawHeader wordJigsawHeader">
                    <div class="wordJigsawBadge">جورچین واژه‌ها</div>
                    <h1>${this.escapeHTML(puzzle.title || "جمله را کامل کن")}</h1>
                    <p class="jigsawObjective">${this.escapeHTML(puzzle.objective || "واژه‌ها را در جای درست قرار بده")}</p>
                    <p class="jigsawInstruction">${this.escapeHTML(puzzle.instruction || "هر کارت را بکش و در جای مناسب رها کن.")}</p>
                </div>
                <div class="wordJigsawBoard" id="jigsawBoard" aria-label="جورچین واژه‌ها">${slots.join("")}</div>
                <div class="wordJigsawHint" id="jigsawStatus">واژه‌ها را جابه‌جا کن تا جمله کامل شود.</div>
                <div class="jigsawControls"><button id="jigsawResetBtn" type="button">شروع دوباره</button></div>
                <div class="jigsawMoves">حرکت‌ها: <span id="puzzleMoveCount">${state.moves || core.moves || 0}</span></div>
            </div>`;

        this.bindWordBoard();
    },

    bindWordBoard: function () {
        const board = document.getElementById("jigsawBoard");
        if (!board) return;
        const pieces = board.querySelectorAll(".wordJigsawPiece");
        const screen = this;

        pieces.forEach(function (piece) {
            piece.addEventListener("click", function () {
                if (screen.dragMoved || screen.isFinished()) { screen.dragMoved = false; return; }
                const index = Number(piece.dataset.position);
                if (screen.selectedIndex === null) {
                    screen.selectedIndex = index;
                    screen.render(PuzzleEngine.getState());
                    screen.showStatus("حالا کارت مقصد را انتخاب کن.");
                } else if (screen.selectedIndex === index) {
                    screen.selectedIndex = null;
                    screen.render(PuzzleEngine.getState());
                } else {
                    screen.swap(screen.selectedIndex, index);
                    screen.selectedIndex = null;
                }
            });

            piece.addEventListener("pointerdown", function (event) {
                if (screen.isFinished() || (event.button !== undefined && event.button !== 0)) return;
                screen.dragIndex = Number(piece.dataset.position);
                screen.dragElement = piece;
                screen.dragStartX = event.clientX;
                screen.dragStartY = event.clientY;
                screen.dragMoved = false;
                piece.classList.add("isDragging");
                if (piece.setPointerCapture) { try { piece.setPointerCapture(event.pointerId); } catch (e) {} }
            });

            piece.addEventListener("pointermove", function (event) {
                if (screen.dragElement !== piece || screen.dragIndex === null) return;
                const dx = event.clientX - screen.dragStartX;
                const dy = event.clientY - screen.dragStartY;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) screen.dragMoved = true;
                piece.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${Math.max(-2, Math.min(2, dx / 40))}deg)`;
            });

            piece.addEventListener("pointerup", function (event) {
                if (screen.dragIndex === null) return;
                const source = screen.dragIndex;
                const moved = screen.dragMoved;
                piece.style.pointerEvents = "none";
                const targetEl = document.elementFromPoint(event.clientX, event.clientY);
                const targetPiece = targetEl ? targetEl.closest(".wordJigsawPiece") : null;
                screen.clearDrag();
                if (!moved || !targetPiece) return;
                const target = Number(targetPiece.dataset.position);
                if (source !== target) screen.swap(source, target);
            });

            piece.addEventListener("pointercancel", function () { screen.clearDrag(); });
        });

        const reset = document.getElementById("jigsawResetBtn");
        if (reset) reset.onclick = function () {
            if (screen.isFinished()) return;
            if (JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState());
        };
    },

    renderImage: function (app, puzzle, core, state) {
        const rows = Number(puzzle.rows), cols = Number(puzzle.cols), image = puzzle.image;
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || !image) return;

        const previewKey = [
            (typeof PuzzleEngine !== "undefined" && PuzzleEngine.activity && PuzzleEngine.activity.id) || "",
            image, rows, cols
        ].join("|");
        if (this.imagePreviewKey !== previewKey) {
            this.clearImagePreviewTimer();
            this.imagePreviewKey = previewKey;
            this.imagePreviewCompleted = false;
        }
        if (!this.imagePreviewCompleted) {
            this.startImagePreview(app, puzzle, state);
            return;
        }

        const pieces = [];
        for (let position = 0; position < core.pieceCount; position += 1) {
            const piece = core.pieces.find(function (item) { return item.currentIndex === position; });
            if (!piece) continue;
            const row = Math.floor(piece.correctIndex / cols), col = piece.correctIndex % cols;
            pieces.push(`<button class="jigsawPiece" data-position="${position}" aria-label="قطعه ${piece.correctIndex + 1}" style="background-image:url('${this.escapeAttribute(image)}');background-position:${(col * 100) / (cols - 1 || 1)}% ${(row * 100) / (rows - 1 || 1)}%;--jigsaw-image-size:${cols * 100}% ${rows * 100}%"></button>`);
        }
        app.innerHTML = `<div class="screen puzzleScreen jigsawScreen imageJigsawScreen" dir="rtl"><div class="jigsawHeader"><h1>${this.escapeHTML(puzzle.title || "پازل تصویری")}</h1><p class="jigsawObjective">${this.escapeHTML(puzzle.objective || "تصویر را کامل کن")}</p><p class="jigsawInstruction">${this.escapeHTML(puzzle.instruction || "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.")}</p></div><div class="jigsawBoardWrap"><div id="jigsawBoard" class="jigsawBoard" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);aspect-ratio:\${cols}/\${rows};box-sizing:border-box;">${pieces.join("")}</div><div id="jigsawStatus" class="jigsawStatus jigsawInactivityHint" aria-live="polite"></div></div><div class="jigsawBottomRow"><div class="jigsawControls"><button id="jigsawResetBtn" type="button">شروع دوباره</button></div><div class="jigsawMoves">حرکت‌ها: <span id="puzzleMoveCount">${state.moves || core.moves || 0}</span></div></div></div>`;
        this.bindImageBoard();
    },

    startImagePreview: function (app, puzzle, state) {
        this.clearImagePreviewTimer();
        const screen = this;
        let remaining = 5;
        app.innerHTML = `<div class="screen puzzleScreen jigsawScreen imageJigsawScreen" dir="rtl">
                <div class="jigsawHeader">
                    <h1>آماده‌ای؟</h1>
                    <p class="jigsawObjective">تصویر را با دقت نگاه کن.</p>
                    <p class="jigsawInstruction">۵ ثانیه برای مشاهده تصویر فرصت داری.</p>
                </div>
                <div class="jigsawPreview" aria-live="polite" style="width:min(100%,620px);aspect-ratio:\${cols}/\${rows};margin:10px auto;overflow:hidden;border-radius:14px;background:#20252b;padding:3px;box-sizing:border-box;display:flex;align-items:stretch;justify-content:stretch;">
                    <img src="${this.escapeAttribute(puzzle.image)}" alt="تصویر کامل پازل" style="display:block;width:100%;height:100%;object-fit:fill;border-radius:11px;">
                </div>
                <div class="jigsawPreviewCountdown" id="jigsawPreviewCountdown">۵</div>
            </div>`;

        this.imagePreviewInterval = setInterval(function () {
            remaining -= 1;
            const countdown = document.getElementById("jigsawPreviewCountdown");
            if (countdown) countdown.textContent = remaining > 0 ? String(remaining) : "شروع!";
        }, 1000);

        this.imagePreviewTimer = setTimeout(function () {
            screen.clearImagePreviewTimer();
            screen.imagePreviewCompleted = true;
            screen.showImageBoardAfterPreview(puzzle);
        }, 5000);
    },

    showImageBoardAfterPreview: function (puzzle) {
        const preview = document.querySelector(".imageJigsawScreen .jigsawPreview");
        const header = document.querySelector(".imageJigsawScreen .jigsawHeader");
        if (!preview || !header) {
            this.render(PuzzleEngine.getState());
            return;
        }

        const rows = Number(puzzle.rows);
        const cols = Number(puzzle.cols);
        const image = puzzle.image;
        const core = typeof JigsawPuzzle !== "undefined" ? JigsawPuzzle.getState() : null;
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || !image || !core) {
            this.render(PuzzleEngine.getState());
            return;
        }

        const title = header.querySelector("h1");
        const objective = header.querySelector(".jigsawObjective");
        const instruction = header.querySelector(".jigsawInstruction");
        if (title) title.textContent = puzzle.title || "پازل تصویری";
        if (objective) objective.textContent = puzzle.objective || "تصویر را کامل کن";
        if (instruction) instruction.textContent = puzzle.instruction || "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود.";

        const pieces = [];
        for (let position = 0; position < core.pieceCount; position += 1) {
            const piece = core.pieces.find(function (item) { return item.currentIndex === position; });
            if (!piece) continue;
            const row = Math.floor(piece.correctIndex / cols);
            const col = piece.correctIndex % cols;
            pieces.push(`<button class="jigsawPiece" data-position="${position}" aria-label="قطعه ${piece.correctIndex + 1}" style="background-image:url('${this.escapeAttribute(image)}');background-position:${(col * 100) / (cols - 1 || 1)}% ${(row * 100) / (rows - 1 || 1)}%;--jigsaw-image-size:${cols * 100}% ${rows * 100}%"></button>`);
        }

        const boardWrap = document.createElement("div");
        boardWrap.className = "jigsawBoardWrap";
        const board = document.createElement("div");
        board.id = "jigsawBoard";
        board.className = "jigsawBoard";
        board.setAttribute("style", `grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);aspect-ratio:${cols}/${rows};box-sizing:border-box;`);
        board.innerHTML = pieces.join("");
        boardWrap.appendChild(board);
        preview.replaceWith(boardWrap);

        const countdown = document.getElementById("jigsawPreviewCountdown");
        if (countdown) countdown.remove();

        const status = document.createElement("div");
        status.id = "jigsawStatus";
        status.className = "jigsawStatus jigsawInactivityHint";
        status.setAttribute("aria-live", "polite");
        boardWrap.appendChild(status);

        const controls = document.createElement("div");
        controls.className = "jigsawControls";
        controls.innerHTML = '<button id="jigsawResetBtn" type="button">شروع دوباره</button>';
        const bottomRow = document.createElement("div");
        bottomRow.className = "jigsawBottomRow";
        bottomRow.appendChild(controls);

        const moves = document.createElement("div");
        moves.className = "jigsawMoves";
        moves.innerHTML = 'حرکت‌ها: <span id="puzzleMoveCount">' + (core.moves || 0) + '</span>';
        bottomRow.appendChild(moves);
        boardWrap.insertAdjacentElement("afterend", bottomRow);

        this.bindImageBoard();
    },

    clearInactivityTimer: function () {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
    },

    scheduleInactivityHint: function () {
        this.clearInactivityTimer();
        this.inactivityMessageVisible = false;
        const screen = this;
        this.inactivityTimer = setTimeout(function () {
            if (screen.isFinished()) return;
            screen.inactivityMessageVisible = true;
            screen.showStatus("ادامه بده؛ قطعه‌ها را جابه‌جا کن.");
        }, 10000);
    },

    clearInactivityHint: function () {
        this.clearInactivityTimer();
        this.inactivityMessageVisible = false;
        const status = document.getElementById("jigsawStatus");
        if (status && !this.isFinished()) status.textContent = "";
    },

    clearImagePreviewTimer: function () {
        if (this.imagePreviewTimer) clearTimeout(this.imagePreviewTimer);
        if (this.imagePreviewInterval) clearInterval(this.imagePreviewInterval);
        this.imagePreviewTimer = null;
        this.imagePreviewInterval = null;
    },

    bindImageBoard: function () {
        const board = document.getElementById("jigsawBoard");
        if (!board) return;
        const screen = this;
        const puzzle = typeof PuzzleEngine !== "undefined" ? PuzzleEngine.puzzle : null;
        const rows = puzzle ? Number(puzzle.rows) : 0;
        const cols = puzzle ? Number(puzzle.cols) : 0;

        function getTargetIndex(clientX, clientY) {
            const currentBoard = document.getElementById("jigsawBoard");
            if (!currentBoard || !rows || !cols) return null;
            const rect = currentBoard.getBoundingClientRect();
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
            const cellWidth = rect.width / cols;
            const cellHeight = rect.height / rows;
            if (!cellWidth || !cellHeight) return null;
            const col = Math.max(0, Math.min(cols - 1, Math.floor((clientX - rect.left) / cellWidth)));
            const row = Math.max(0, Math.min(rows - 1, Math.floor((clientY - rect.top) / cellHeight)));
            return row * cols + col;
        }

        this.scheduleInactivityHint();

        board.querySelectorAll(".jigsawPiece").forEach(function (piece) {
            piece.addEventListener("dragstart", function (event) { event.preventDefault(); });

            piece.addEventListener("click", function () {
                if (screen.suppressClick) { screen.suppressClick = false; return; }
                if (screen.isFinished()) return;
                screen.clearInactivityHint();
                const index = Number(piece.dataset.position);
                if (screen.selectedIndex === null) {
                    screen.selectedIndex = index;
                    piece.classList.add("isSelected");
                    console.log("[Jigsaw][SELECT]", { index });
                } else {
                    const source = screen.selectedIndex;
                    screen.selectedIndex = null;
                    if (source !== index) screen.swap(source, index);
                }
            });

            piece.addEventListener("pointerdown", function (event) {
                if (screen.isFinished() || (event.button !== undefined && event.button !== 0)) return;
                screen.clearInactivityHint();
                screen.selectedIndex = null;
                screen.suppressClick = false;
                screen.dragIndex = Number(piece.dataset.position);
                screen.dragElement = piece;
                screen.dragStartX = event.clientX;
                screen.dragStartY = event.clientY;
                screen.dragMoved = false;
                screen.dragTargetIndex = null;
                piece.style.zIndex = "20";
                if (piece.setPointerCapture && event.pointerId !== undefined) {
                    try { piece.setPointerCapture(event.pointerId); } catch (e) {}
                }
                console.log("[Jigsaw][DOWN]", { source: screen.dragIndex, x: event.clientX, y: event.clientY });
            });

            piece.addEventListener("pointermove", function (event) {
                if (screen.dragElement !== piece || screen.dragIndex === null) return;
                const dx = event.clientX - screen.dragStartX;
                const dy = event.clientY - screen.dragStartY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) screen.dragMoved = true;
                piece.style.transform = `translate3d(${dx}px,${dy}px,0)`;
                if (screen.dragMoved) screen.dragTargetIndex = getTargetIndex(event.clientX, event.clientY);
            });

            piece.addEventListener("pointerup", function (event) {
                if (screen.dragElement !== piece || screen.dragIndex === null) return;
                const source = screen.dragIndex;
                const moved = screen.dragMoved;
                const x = event.clientX;
                const y = event.clientY;
                if (piece.releasePointerCapture && event.pointerId !== undefined) {
                    try { piece.releasePointerCapture(event.pointerId); } catch (e) {}
                }
                const target = moved ? getTargetIndex(x, y) : null;
                console.log("[Jigsaw][DROP]", { source: source, target: target, moved: moved });
                screen.clearDrag();
                screen.suppressClick = moved;
                if (moved) setTimeout(function () { screen.suppressClick = false; }, 0);
                if (moved && target !== null && source !== target) screen.swap(source, target);
            });

            piece.addEventListener("pointercancel", function (event) {
                if (piece.releasePointerCapture && event.pointerId !== undefined) {
                    try { piece.releasePointerCapture(event.pointerId); } catch (e) {}
                }
                screen.clearDrag();
            });
        });

        const reset = document.getElementById("jigsawResetBtn");
        if (reset) reset.onclick = function () {
            if (screen.isFinished()) return;
            screen.clearImagePreviewTimer();
            screen.imagePreviewCompleted = false;
            if (JigsawPuzzleHandler.reset(PuzzleEngine)) screen.render(PuzzleEngine.getState());
        };
    },

    swap: function (source, target) {
        const from = Number(source);
        const to = Number(target);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return false;

        console.log("[Jigsaw][SWAP]", { source: from, target: to, mode: JigsawPuzzle && JigsawPuzzle.state ? JigsawPuzzle.state.mode : null });
        let moved = false;
        const isImageJigsaw = PuzzleEngine &&
            PuzzleEngine.puzzle &&
            PuzzleEngine.puzzle.type === "jigsaw" &&
            PuzzleEngine.puzzle.dataType === "image";

        if (isImageJigsaw && typeof JigsawImagePuzzle !== "undefined") {
            if (!JigsawImagePuzzle.state && typeof JigsawImagePuzzle.restoreFromEngine === "function") {
                JigsawImagePuzzle.restoreFromEngine();
            }

            moved = JigsawImagePuzzle.move(from, to);

            if (moved) {
                const state = JigsawImagePuzzle.getState();
                if (typeof JigsawPuzzle !== "undefined") JigsawPuzzle.state = state;
                PuzzleEngine.items = state.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
                PuzzleEngine.moves = state.moves;
                if (typeof EventManager !== "undefined" && EventManager.emit) EventManager.emit("puzzleChanged", PuzzleEngine.getState());

                if (state.solved && PuzzleEngine.check) {
                    const completed = PuzzleEngine.check();
                    if (!completed && PuzzleEngine.state && !PuzzleEngine.state.isFinished &&
                        typeof PuzzleEngine.finish === "function") {
                        console.warn("[Jigsaw][IMAGE_COMPLETE_FALLBACK] Core solved; completing activity through the explicit check context.");
                        PuzzleEngine.checking = true;
                        try {
                            PuzzleEngine.finish();
                        } finally {
                            PuzzleEngine.checking = false;
                        }
                    }
                }
            }
        } else {
            moved = JigsawPuzzleHandler.move(PuzzleEngine, from, to);
        }

        console.log("[Jigsaw][SWAP_RESULT]", {
            moved: moved,
            source: from,
            target: to,
            imageDirect: isImageJigsaw,
            items: PuzzleEngine && Array.isArray(PuzzleEngine.items) ? PuzzleEngine.items.slice() : [],
            moves: PuzzleEngine ? PuzzleEngine.moves : null
        });
        if (moved) {
            const solved = JigsawPuzzle.isSolved();
            this.clearInactivityTimer();
            this.inactivityMessageVisible = false;
            this.showStatus(solved ? "آفرین! تصویر کامل شد 🎉" : "");
            if (!solved) this.scheduleInactivityHint();
        }
        return moved;
    },

    showStatus: function (text) {
        const status = document.getElementById("jigsawStatus");
        if (status) status.textContent = text || "";
    },

    clearDrag: function () {
        if (this.dragElement) {
            this.dragElement.style.transform = "";
            this.dragElement.style.zIndex = "";
            this.dragElement.style.pointerEvents = "";
            this.dragElement.classList.remove("isDragging");
        }
        this.dragIndex = null;
        this.dragElement = null;
        this.dragMoved = false;
        this.dragTargetIndex = null;
    },

    isFinished: function () {
        return !!(typeof PuzzleEngine !== "undefined" && PuzzleEngine.state && PuzzleEngine.state.isFinished);
    },

    escapeHTML: function (value) {
        return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    escapeAttribute: function (value) { return this.escapeHTML(value); }
};

window.JigsawScreen = JigsawScreen;
JigsawScreen.init();
console.log("Jigsaw Screen v2.1 Ready");