// =====================================
// Tahouri Edu Platform
// Word Jigsaw Difficulty
// Version 1.3
// Word-only difficulty layer.
// Image Jigsaw and all other puzzle types are untouched.
// =====================================

(function () {
    "use strict";

    if (typeof PuzzleEngine === "undefined" || typeof JigsawPuzzleHandler === "undefined" || typeof JigsawScreen === "undefined") {
        console.error("Word Jigsaw Difficulty: required modules are not available");
        return;
    }

    const originalStart = JigsawPuzzleHandler.start.bind(JigsawPuzzleHandler);
    const originalReset = JigsawPuzzleHandler.reset.bind(JigsawPuzzleHandler);
    const originalMoveToTarget = JigsawPuzzleHandler.moveWordToTarget.bind(JigsawPuzzleHandler);
    const originalMoveToSource = JigsawPuzzleHandler.moveWordToSource.bind(JigsawPuzzleHandler);
    const originalUndo = JigsawPuzzleHandler.undoStage2.bind(JigsawPuzzleHandler);
    const originalAlphabet = JigsawPuzzleHandler.alphabeticalHint.bind(JigsawPuzzleHandler);
    const originalCheck = JigsawPuzzleHandler.check.bind(JigsawPuzzleHandler);
    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);
    const originalGetState = PuzzleEngine.getState.bind(PuzzleEngine);

    function isWordJigsaw(engine) {
        return !!(
            engine &&
            engine.puzzle &&
            engine.puzzle.type === "jigsaw" &&
            engine.puzzle.dataType === "text" &&
            engine.puzzle.twoStageWordOrder === true
        );
    }

    function level(engine) {
        if (!isWordJigsaw(engine)) return 3;
        const value = Number(engine.puzzle.wordJigsawDifficulty || engine.puzzle.difficulty || 3);
        return Math.min(3, Math.max(1, Math.round(value)));
    }

    function partial(engine) {
        return isWordJigsaw(engine) && level(engine) < 3;
    }

    function shuffle(list) {
        const result = Array.isArray(list) ? list.slice() : [];
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        if (result.length > 1 && result.every(function (v, i) { return v === list[i]; })) {
            [result[0], result[1]] = [result[1], result[0]];
        }
        return result;
    }

    function configure(engine) {
        if (!partial(engine)) return;

        const words = Array.isArray(engine.puzzle.correctOrder)
            ? engine.puzzle.correctOrder.map(String)
            : (Array.isArray(engine.puzzle.words) ? engine.puzzle.words.map(String) : []);

        const count = level(engine) === 1 ? 4 : Math.min(8, words.length);
        const indexes = Array.from({ length: words.length }, function (_, i) { return i; });
        const movable = shuffle(indexes).slice(0, count).sort(function (a, b) { return a - b; });
        const movableSet = new Set(movable);

        engine.puzzle.movableIndexes = movable;
        engine.puzzle.fixedIndexes = indexes.filter(function (i) { return !movableSet.has(i); });
        engine.puzzle.availableWords = shuffle(movable.map(function (i) { return words[i]; }));
        engine.puzzle.targetWords = words.map(function (word, i) { return movableSet.has(i) ? null : word; });
        engine.puzzle.history = [];
        engine.puzzle.hintUsed = false;
        engine.puzzle.feedbackIndexes = [];
        engine.puzzle.checking = false;
        engine.items = [...engine.puzzle.targetWords];
        engine.moves = 0;
    }

    function snapshot(engine) {
        return {
            availableWords: [...(engine.puzzle.availableWords || [])],
            targetWords: [...(engine.puzzle.targetWords || [])],
            hintUsed: !!engine.puzzle.hintUsed
        };
    }

    // Normalize Arabic Yeh variants only for Word Jigsaw display.
    // Persian UI must consistently show Persian Yeh (ی), while the
    // underlying puzzle data/order remains unchanged.
    function displayWord(word) {
        return String(word == null ? "" : word)
            .replace(/\u0640/g, "")
            .replace(/\u064A/g, "\u06CC")
            .replace(/\u0649/g, "\u06CC");
    }

    function punctuation(state, index) {
        const marks = state && state.punctuation ? state.punctuation : {};
        return marks[String(index)] || "";
    }

    function renderPartial(state) {
        const app = document.getElementById("app");
        if (!app) return;

        const engine = PuzzleEngine;
        const correct = Array.isArray(state.correctWords) ? state.correctWords : [];
        const target = Array.isArray(state.targetWords) ? state.targetWords : [];
        const source = Array.isArray(state.availableWords) ? state.availableWords : [];
        const movable = new Set(Array.isArray(state.movableIndexes) ? state.movableIndexes : []);
        const feedback = state && state.feedbackIndexes ? new Set(state.feedbackIndexes.map(Number)) : new Set();
        const esc = JigsawScreen.escapeHTML.bind(JigsawScreen);
        const firstLineLength = Number(engine.puzzle.firstLineLength || 0);
        const groups = Array.isArray(engine.puzzle.groupLengths) && engine.puzzle.groupLengths.length
            ? engine.puzzle.groupLengths.map(Number)
            : (firstLineLength > 0 && firstLineLength < correct.length
                ? [firstLineLength, correct.length - firstLineLength]
                : [correct.length]);

        let cursor = 0;
        const lines = groups.map(function (length) {
            const html = correct.slice(cursor, cursor + length).map(function (word, offset) {
                const index = cursor + offset;
                const mark = punctuation(state, index);
                if (!movable.has(index)) {
                    return '<span class="wordBuilderPiece wordBuilderFixedPiece">' +
                        '<bdi dir="rtl" class="wordBuilderWord">' + esc(displayWord(word)) + '</bdi>' +
                        '</span>';
                }

                if (target[index] != null) {
                    const feedbackClass = feedback.has(index)
                        ? (String(target[index]).replace(/‌/g, " ").trim() === String(correct[index]).replace(/‌/g, " ").trim()
                            ? " wordBuilderCorrect"
                            : " wordBuilderWrong")
                        : "";
                    return '<button class="wordBuilderPiece wordBuilderTargetPiece' + feedbackClass + '" draggable="true" data-target-index="' + index + '" type="button">' +
                        '<bdi dir="rtl" class="wordBuilderWord">' + esc(displayWord(target[index])) + '</bdi>' +
                        '</button>';
                }

                return '<span class="wordBuilderPiece wordBuilderSlot" data-target-slot="' + index + '" role="button" tabindex="0" aria-label="جای خالی"></span>';
            }).join("");

            cursor += length;
            return '<div class="wordBuilderPoetryLine">' + html + '</div>';
        }).join("");

        app.innerHTML =
            '<div class="screen puzzleScreen jigsawScreen wordBuilderScreen" dir="rtl">' +
            '<div class="jigsawHeader wordJigsawHeader">' +
            '<div class="wordJigsawBadge">جورچین واژه‌ها</div>' +
            '<h1>ساختن شعر</h1>' +
            '<p class="jigsawObjective">کلمات مشخص‌شده را در جای درست قرار بده.</p>' +
            '<div class="wordBuilderLevelNote">سطح ' + (level(engine) === 1 ? 'ساده — ۴ کلمه' : 'متوسط — ۸ کلمه') + ' قابل جابه‌جایی است.</div>' +
            '</div>' +
            '<section class="wordBuilderSection"><h2>کلمات</h2><div id="wordBuilderSource" class="wordBuilderBox" data-drop-zone="source">' +
            source.map(function (word, i) {
                return '<button class="wordBuilderPiece" draggable="true" data-source-index="' + i + '" type="button"><bdi dir="rtl" class="wordBuilderWord">' + esc(displayWord(word)) + '</bdi></button>';
            }).join("") +
            (source.length ? "" : '<span class="wordBuilderEmpty">همه کلمات در پاسخ شما هستند.</span>') +
            '</div></section>' +
            '<section class="wordBuilderSection wordBuilderAnswerSection"><h2>پاسخ شما</h2><div id="wordBuilderTarget" class="wordBuilderBox wordBuilderTarget wordBuilderPartialTarget">' +
            lines +
            '</div></section>' +
            '<div class="wordBuilderControls"><button id="wordBuilderCheck" type="button">بررسی پاسخ</button><button id="wordBuilderUndo" type="button">↩ برگشت</button><button id="wordBuilderAlphabet" type="button">مرتب‌سازی الفبایی</button><button id="wordBuilderReset" type="button">شروع دوباره</button></div>' +
            '<div id="wordBuilderMessage" class="wordBuilderMessage" aria-live="polite"></div>' +
            '<div class="jigsawMoves">حرکت‌ها: <span>' + (state.moves || 0) + '</span></div>' +
            '</div>';

        bindPartialEvents();
    }

    function bindPartialEvents() {
        const source = document.getElementById("wordBuilderSource");
        const target = document.getElementById("wordBuilderTarget");
        if (!source || !target) return;

        let dragData = null;
        let dragGhost = null;
        let activeButton = null;
        let activePointerId = null;
        let startX = 0;
        let startY = 0;
        let dragging = false;
        let pendingMoveEvent = null;
        let moveFrame = 0;

        function rerender() { JigsawScreen.render(PuzzleEngine.getState()); }

        function clearDrag() {
            if (activeButton) activeButton.classList.remove("is-dragging");
            if (moveFrame) {
                cancelAnimationFrame(moveFrame);
                moveFrame = 0;
            }
            pendingMoveEvent = null;
            if (dragGhost && dragGhost.parentNode) dragGhost.parentNode.removeChild(dragGhost);
            source.classList.remove("is-drag-over");
            target.classList.remove("is-drag-over");
            target.querySelectorAll(".is-drag-over").forEach(function (el) { el.classList.remove("is-drag-over"); });
            dragData = null;
            dragGhost = null;
            activeButton = null;
            activePointerId = null;
            dragging = false;
        }

        function createGhost(button) {
            const rect = button.getBoundingClientRect();
            const ghost = button.cloneNode(true);
            ghost.removeAttribute("data-source-index");
            ghost.removeAttribute("data-target-index");
            ghost.removeAttribute("data-target-slot");
            ghost.style.position = "fixed";
            ghost.style.left = rect.left + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.margin = "0";
            ghost.style.zIndex = "99999";
            ghost.style.pointerEvents = "none";
            ghost.style.opacity = ".92";
            ghost.style.transform = "scale(1.04) rotate(-1deg)";
            ghost.style.transition = "none";
            document.body.appendChild(ghost);
            return ghost;
        }

        function updateGhost(event) {
            if (!dragGhost || !activeButton) return;
            const rect = activeButton.getBoundingClientRect();
            dragGhost.style.transform = "translate3d(" + (event.clientX - startX) + "px," + (event.clientY - startY) + "px,0) scale(1.04) rotate(-1deg)";
            dragGhost.style.left = rect.left + "px";
            dragGhost.style.top = rect.top + "px";
        }

        function scheduleGhostMove(event) {
            pendingMoveEvent = event;
            if (moveFrame) return;
            moveFrame = requestAnimationFrame(function () {
                moveFrame = 0;
                if (pendingMoveEvent) {
                    updateGhost(pendingMoveEvent);
                    pendingMoveEvent = null;
                }
            });
        }

        function elementAt(event) {
            if (dragGhost) dragGhost.style.display = "none";
            const element = document.elementFromPoint(event.clientX, event.clientY);
            if (dragGhost) dragGhost.style.display = "";
            return element;
        }

        function pointerDown(event, button, zone, index) {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            activeButton = button;
            activePointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            dragging = false;
            dragData = { zone: zone, index: Number(index) };
            if (button.setPointerCapture) {
                try { button.setPointerCapture(event.pointerId); } catch (e) {}
            }
        }

        function pointerMove(event) {
            if (!dragData || activePointerId !== event.pointerId || !activeButton) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) < 6) return;

            dragging = true;
            activeButton.classList.add("is-dragging");
            if (!dragGhost) dragGhost = createGhost(activeButton);
            scheduleGhostMove(event);
            event.preventDefault();

            const over = elementAt(event);
            source.classList.toggle("is-drag-over", !!(over && over.closest("#wordBuilderSource")));
            target.classList.toggle("is-drag-over", !!(over && over.closest("#wordBuilderTarget")));
            if (over) {
                const slot = over.closest("[data-target-slot]");
                if (slot) slot.classList.add("is-drag-over");
            }
        }

        function finish(event) {
            if (!dragData || activePointerId !== event.pointerId) return;
            if (pendingMoveEvent) updateGhost(pendingMoveEvent);
            const data = dragData;
            const over = elementAt(event);

            if (data.zone === "source") {
                if (over && over.closest("#wordBuilderTarget")) {
                    const button = over.closest("[data-target-index]");
                    if (button) {
                        const index = Number(button.dataset.targetIndex);
                        JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, index);
                        const sourceIndex = PuzzleEngine.puzzle.availableWords.length - 1;
                        if (JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, sourceIndex, index)) rerender();
                    } else {
                        const slot = over.closest("[data-target-slot]");
                        if (slot) {
                            const index = Number(slot.dataset.targetSlot);
                            if (JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, data.index, index)) rerender();
                        }
                    }
                }
            } else if (data.zone === "target") {
                if (over && over.closest("#wordBuilderSource")) {
                    if (JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, data.index)) rerender();
                } else if (over && over.closest("[data-target-index]")) {
                    // Simple/Medium: allow direct swapping of two movable words
                    // already placed in the answer. The student must not be
                    // forced to return a word to the source box just to swap
                    // two incorrect positions.
                    const button = over.closest("[data-target-index]");
                    const index = Number(button.dataset.targetIndex);
                    const movable = new Set(Array.isArray(PuzzleEngine.puzzle.movableIndexes)
                        ? PuzzleEngine.puzzle.movableIndexes.map(Number)
                        : []);
                    const targetWords = PuzzleEngine.puzzle.targetWords || [];
                    if (index !== data.index &&
                        movable.has(index) &&
                        movable.has(Number(data.index)) &&
                        targetWords[index] != null &&
                        targetWords[data.index] != null) {
                        PuzzleEngine.puzzle.history.push(snapshot(PuzzleEngine));
                        const temp = targetWords[data.index];
                        targetWords[data.index] = targetWords[index];
                        targetWords[index] = temp;
                        PuzzleEngine.puzzle.feedbackIndexes = [];
                        PuzzleEngine.items = [...targetWords];
                        PuzzleEngine.moves = Number(PuzzleEngine.moves || 0) + 1;
                        EventManager.emit("puzzleChanged", PuzzleEngine.getState());
                        rerender();
                    }
                } else if (over && over.closest("[data-target-slot]")) {
                    const index = Number(over.closest("[data-target-slot]").dataset.targetSlot);
                    if (index !== data.index && PuzzleEngine.puzzle.targetWords[index] == null) {
                        JigsawPuzzleHandler.moveWordToSource(PuzzleEngine, data.index);
                        const sourceIndex = PuzzleEngine.puzzle.availableWords.length - 1;
                        if (JigsawPuzzleHandler.moveWordToTarget(PuzzleEngine, sourceIndex, index)) rerender();
                    }
                }
            }

            clearDrag();
        }

        function bindButton(button, zone, index) {
            button.draggable = false;
            button.addEventListener("pointerdown", function (event) { pointerDown(event, button, zone, index); });
            button.addEventListener("pointermove", pointerMove, { passive: false });
            button.addEventListener("pointerup", finish);
            button.addEventListener("pointercancel", clearDrag);
        }

        source.querySelectorAll("[data-source-index]").forEach(function (button) {
            bindButton(button, "source", button.dataset.sourceIndex);
        });
        target.querySelectorAll("[data-target-index]").forEach(function (button) {
            bindButton(button, "target", button.dataset.targetIndex);
        });


        const check = document.getElementById("wordBuilderCheck");
        if (check) check.onclick = function () { PuzzleEngine.check(); };

        const undo = document.getElementById("wordBuilderUndo");
        if (undo) undo.onclick = function () {
            if (JigsawPuzzleHandler.undoStage2(PuzzleEngine)) rerender();
            else JigsawScreen.showWordBuilderMessage("حرکت قبلی برای برگشت وجود ندارد.");
        };

        const alphabet = document.getElementById("wordBuilderAlphabet");
        if (alphabet) alphabet.onclick = function () { JigsawPuzzleHandler.alphabeticalHint(PuzzleEngine); rerender(); };

        const reset = document.getElementById("wordBuilderReset");
        if (reset) reset.onclick = function () { if (JigsawPuzzleHandler.reset(PuzzleEngine)) rerender(); };
    }


    JigsawPuzzleHandler.start = function (engine, data) {
        const result = originalStart(engine, data);
        if (!result) return result;

        if (isWordJigsaw(engine)) {
            engine.puzzle.wordJigsawDifficulty = Number(data.difficulty || (data.content && data.content.difficulty) || 3);
            configure(engine);
            engine.items = [...(engine.puzzle.targetWords || [])];
        }

        return engine.getState();
    };

    JigsawPuzzleHandler.reset = function (engine) {
        if (!partial(engine)) return originalReset(engine);
        configure(engine);
        EventManager.emit("puzzleChanged", engine.getState());
        return engine.getState();
    };

    JigsawPuzzleHandler.moveWordToTarget = function (engine, sourceIndex, targetIndex, targetGroup) {
        // Hard mode is owned by Stage 2. Preserve the targetGroup argument
        // when forwarding the call; otherwise the hard board loses the
        // hemistich selected by the drag layer and falls back to a flat target.
        if (!partial(engine)) return originalMoveToTarget(engine, sourceIndex, targetIndex, targetGroup);

        const source = engine.puzzle.availableWords || [];
        const target = engine.puzzle.targetWords || [];
        const slot = Number(targetIndex);
        const sourcePos = Number(sourceIndex);

        if (!Number.isInteger(sourcePos) || sourcePos < 0 || sourcePos >= source.length) return false;
        if (!Number.isInteger(slot) || !engine.puzzle.movableIndexes.includes(slot) || target[slot] != null) return false;

        engine.puzzle.history.push(snapshot(engine));
        engine.puzzle.feedbackIndexes = [];
        target[slot] = source.splice(sourcePos, 1)[0];
        engine.items = [...target];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.moveWordToSource = function (engine, targetIndex) {
        if (!partial(engine)) return originalMoveToSource(engine, targetIndex);

        const target = engine.puzzle.targetWords || [];
        const slot = Number(targetIndex);

        if (!Number.isInteger(slot) || !engine.puzzle.movableIndexes.includes(slot) || target[slot] == null) return false;

        engine.puzzle.history.push(snapshot(engine));
        engine.puzzle.feedbackIndexes = [];
        engine.puzzle.availableWords.push(target[slot]);
        target[slot] = null;
        engine.items = [...target];
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.undoStage2 = function (engine) {
        if (!partial(engine)) return originalUndo(engine);
        const previous = engine.puzzle.history.pop();
        if (!previous) return false;
        engine.puzzle.availableWords = [...previous.availableWords];
        engine.puzzle.targetWords = [...previous.targetWords];
        engine.puzzle.hintUsed = !!previous.hintUsed;
        engine.items = [...engine.puzzle.targetWords];
        engine.moves = Math.max(0, Number(engine.moves || 0) - 1);
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.alphabeticalHint = function (engine) {
        if (!partial(engine)) return originalAlphabet(engine);
        engine.puzzle.history.push(snapshot(engine));
        engine.puzzle.availableWords = [...(engine.puzzle.availableWords || [])].sort(function (a, b) {
            return String(a).localeCompare(String(b), "fa");
        });
        engine.puzzle.hintUsed = true;
        engine.moves = Number(engine.moves || 0) + 1;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    };

    JigsawPuzzleHandler.check = function (engine) {
        if (!partial(engine)) return originalCheck(engine);
        if (engine.puzzle.checking) return false;

        const target = engine.puzzle.targetWords || [];
        const correct = engine.puzzle.correctOrder || engine.puzzle.words || [];
        const movable = Array.isArray(engine.puzzle.movableIndexes) ? engine.puzzle.movableIndexes : [];
        const normalize = function (word) {
            return String(word == null ? "" : word).replace(/‌/g, " ").trim();
        };
        const wrongIndexes = movable.filter(function (index) {
            return target[index] == null || normalize(target[index]) !== normalize(correct[index]);
        });
        const solved = wrongIndexes.length === 0;

        engine.puzzle.feedbackIndexes = solved ? movable.slice() : wrongIndexes;
        engine.puzzle.checking = true;
        EventManager.emit("puzzleChanged", engine.getState());
        JigsawScreen.render(engine.getState());

        if (solved) {
            engine.puzzle.stage = 3;
            engine.puzzle.hintUsed = !!engine.puzzle.hintUsed;
            // Keep completion inside the explicit check() call.
            // PuzzleEngine rejects delayed finish() calls outside check().
            engine.puzzle.checking = false;
            engine.puzzle.feedbackIndexes = [];
            engine.finish();
            return true;
        }

        engine.puzzle.checking = false;
        engine.emitWrong();
        return false;
    };

    PuzzleEngine.getState = function () {
        const state = originalGetState();
        if (isWordJigsaw(this)) {
            state.wordJigsawDifficulty = level(this);
            state.fixedIndexes = Array.isArray(this.puzzle.fixedIndexes) ? [...this.puzzle.fixedIndexes] : [];
            state.movableIndexes = Array.isArray(this.puzzle.movableIndexes) ? [...this.puzzle.movableIndexes] : [];
            state.availableWords = [...(this.puzzle.availableWords || [])];
            state.targetWords = [...(this.puzzle.targetWords || [])];
            state.feedbackIndexes = Array.isArray(this.puzzle.feedbackIndexes) ? [...this.puzzle.feedbackIndexes] : [];
        }
        return state;
    };

    JigsawScreen.renderWordBuilder = function (state) {
        if (!partial(PuzzleEngine)) return originalRenderWordBuilder(state);
        renderPartial(state);
    };

    console.log("Word Jigsaw Difficulty v1.1 Ready");
})();
