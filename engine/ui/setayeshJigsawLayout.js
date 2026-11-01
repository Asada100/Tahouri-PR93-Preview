// =====================================
// Tahouri Edu Platform
// Generic Grouped Word Jigsaw Layout
// Version 3.1
// =====================================

(function () {
    "use strict";

    if (typeof JigsawScreen === "undefined") return;

    const originalRenderWordBuilder = JigsawScreen.renderWordBuilder.bind(JigsawScreen);

    function getGroups(engine) {
        const puzzle = engine && engine.puzzle ? engine.puzzle : {};
        const lengths = Array.isArray(puzzle.groupLengths) ? puzzle.groupLengths.map(Number).filter(function (n) { return Number.isInteger(n) && n > 0; }) : [];
        if (lengths.length) return lengths;
        const first = Number(puzzle.firstLineLength || 0);
        const total = Array.isArray(puzzle.correctOrder) ? puzzle.correctOrder.length : 0;
        return first > 0 && first < total ? [first, total - first] : [];
    }

    function groupStarts(lengths) {
        const starts = [];
        let sum = 0;
        lengths.forEach(function (length) { starts.push(sum); sum += length; });
        return starts;
    }

    function occurrenceGroup(correctOrder, word, occurrence) {
        let seen = 0;
        for (let i = 0; i < correctOrder.length; i++) {
            if (String(correctOrder[i]) !== String(word)) continue;
            seen++;
            if (seen === occurrence) return i;
        }
        return -1;
    }

    function getWordGroup(engine, word, sourceIndex, zone) {
        const puzzle = engine.puzzle || {};
        const correct = Array.isArray(puzzle.correctOrder) ? puzzle.correctOrder.map(String) : [];
        if (!correct.length) return -1;

        let occurrence = 0;
        if (zone === "source") {
            const source = puzzle.availableWords || [];
            for (let i = 0; i <= sourceIndex; i++) if (String(source[i]) === String(word)) occurrence++;
        } else {
            const target = puzzle.targetWords || [];
            for (let i = 0; i <= sourceIndex; i++) if (String(target[i]) === String(word)) occurrence++;
        }
        const correctIndex = occurrenceGroup(correct, word, occurrence);
        if (correctIndex < 0) return -1;

        const lengths = getGroups(engine);
        let total = 0;
        for (let g = 0; g < lengths.length; g++) {
            total += lengths[g];
            if (correctIndex < total) return g;
        }
        return -1;
    }

    function groupForTargetIndex(index, lengths) {
        let total = 0;
        for (let g = 0; g < lengths.length; g++) {
            total += lengths[g];
            if (index < total) return g;
        }
        return lengths.length - 1;
    }

    function getRows(target) {
        return [...target.querySelectorAll(".wordBuilderPoetryLine")];
    }

    function rowIndex(row, rows) {
        return rows.indexOf(row);
    }

    function createRows(target, groupCount) {
        const rows = [];
        for (let i = 0; i < groupCount; i++) {
            const row = document.createElement("div");
            row.className = "wordBuilderPoetryLine wordBuilderPoetryLineGroup wordBuilderPoetryLineGroup" + (i + 1);
            row.dataset.groupIndex = String(i);
            row.style.width = "100%";
            row.style.display = "flex";
            row.style.flexWrap = "wrap";
            row.style.justifyContent = "center";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.minHeight = "54px";
            row.style.boxSizing = "border-box";
            row.style.border = "2px dashed rgba(120,120,120,.45)";
            row.style.borderRadius = "10px";
            row.style.padding = "8px";
            row.style.marginBottom = "8px";
            rows.push(row);
        }
        return rows;
    }

    function applyGroupedRows(target, lengths) {
        const pieces = [...target.querySelectorAll("[data-target-index]")];
        if (!pieces.length || !lengths.length) return;

        const rows = createRows(target, lengths.length);
        pieces.forEach(function (piece, index) {
            const group = groupForTargetIndex(index, lengths);
            if (rows[group]) rows[group].appendChild(piece);
        });
        rows.forEach(function (row) { target.appendChild(row); });
    }

    function getInsertIndex(row, target, event, direction) {
        const pieces = [...row.querySelectorAll("[data-target-index]")];
        const all = [...target.querySelectorAll("[data-target-index]")];
        if (!pieces.length) {
            const rows = getRows(target);
            const group = rowIndex(row, rows);
            let start = 0;
            const lengths = getGroups(PuzzleEngine);
            for (let i = 0; i < group; i++) start += Math.min(lengths[i] || 0, all.length - start);
            return start;
        }

        let nearest = null;
        let nearestDistance = Infinity;
        pieces.forEach(function (piece) {
            const rect = piece.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            const distance = inside ? 0 : (dx * dx + dy * dy);
            if (distance < nearestDistance) { nearestDistance = distance; nearest = { piece: piece, rect: rect }; }
        });
        if (!nearest) return all.length;
        const nearestGlobal = all.indexOf(nearest.piece);
        if (nearestGlobal < 0) return all.length;
        const center = nearest.rect.left + nearest.rect.width / 2;
        if (direction === "rtl") return event.clientX > center ? nearestGlobal : nearestGlobal + 1;
        return event.clientX < center ? nearestGlobal : nearestGlobal + 1;
    }

    function getRowForPoint(target, event) {
        const rows = getRows(target);
        if (!rows.length) return null;
        for (const row of rows) {
            const rect = row.getBoundingClientRect();
            if (event.clientY >= rect.top && event.clientY <= rect.bottom) return row;
        }
        const first = rows[0].getBoundingClientRect();
        return event.clientY < first.top ? rows[0] : rows[rows.length - 1];
    }

    function installGroupedDrag(target, source, engine) {
        const lengths = getGroups(engine);
        if (!target || !source || !engine || !lengths.length) return;
        let dragData = null;

        target.querySelectorAll("[data-target-index]").forEach(function (piece) {
            piece.addEventListener("dragstart", function () {
                const index = Number(piece.dataset.targetIndex);
                dragData = { zone: "target", index: index, group: getWordGroup(engine, engine.puzzle.targetWords[index], index, "target") };
            }, true);
        });
        source.querySelectorAll("[data-source-index]").forEach(function (piece) {
            piece.addEventListener("dragstart", function () {
                const index = Number(piece.dataset.sourceIndex);
                dragData = { zone: "source", index: index, group: getWordGroup(engine, engine.puzzle.availableWords[index], index, "source") };
            }, true);
        });

        target.addEventListener("dragover", function (event) {
            if (!dragData) return;
            const row = getRowForPoint(target, event);
            const group = row ? Number(row.dataset.groupIndex) : -1;
            if (group !== dragData.group) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        }, true);

        target.addEventListener("drop", function (event) {
            if (!dragData) return;
            const row = getRowForPoint(target, event);
            const group = row ? Number(row.dataset.groupIndex) : -1;
            if (group !== dragData.group) { dragData = null; return; }
            event.preventDefault();
            event.stopImmediatePropagation();

            let insertAt = getInsertIndex(row, target, event, getComputedStyle(target).direction || "rtl");
            const all = [...target.querySelectorAll("[data-target-index]")];
            const rowPieces = [...row.querySelectorAll("[data-target-index]")];
            const firstIndex = rowPieces.length ? all.indexOf(rowPieces[0]) : insertAt;
            const afterIndex = rowPieces.length ? firstIndex + rowPieces.length : firstIndex;
            insertAt = Math.max(firstIndex, Math.min(insertAt, afterIndex));

            if (dragData.zone === "source") {
                if (JigsawPuzzleHandler.moveWordToTarget(engine, dragData.index, insertAt)) JigsawScreen.render(engine.getState());
            } else {
                let toIndex = insertAt;
                if (toIndex > dragData.index) toIndex--;
                if (toIndex !== dragData.index && JigsawPuzzleHandler.reorderTarget(engine, dragData.index, toIndex)) JigsawScreen.render(engine.getState());
            }
            dragData = null;
        }, true);
    }

    JigsawScreen.renderWordBuilder = function (state) {
        originalRenderWordBuilder(state);
        const target = document.getElementById("wordBuilderTarget");
        const source = document.getElementById("wordBuilderSource");
        const engine = typeof PuzzleEngine !== "undefined" ? PuzzleEngine : null;
        if (!target || !source || !engine || !engine.puzzle || engine.puzzle.twoStageWordOrder !== true) return;

        // Partial Word Jigsaw difficulty owns its fixed target slots and
        // placement events. Do not rebuild its rows or attach the generic
        // grouped-drag layer, otherwise the slots become separate flex items
        // and a selected word can jump to another line.
        const difficulty = Number(engine.puzzle.wordJigsawDifficulty || 3);
        // Hard level now renders its own stable hemistich rows in Stage 2.
        // Do not rebuild those rows here, or insertion positions become detached from the visual row.
        if (difficulty >= 3) return;
        if (difficulty < 3) return;

        const lengths = getGroups(engine);
        if (!lengths.length) return;
        applyGroupedRows(target, lengths);
        installGroupedDrag(target, source, engine);
    };

    console.log("Generic Grouped Word Jigsaw Layout v3.1 Ready");
})();
