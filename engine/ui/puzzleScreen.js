// =====================================
// Tahouri Edu Platform
// Puzzle Screen
// Version 2.0
//
// Supported:
// - ordering
// - sequence
// - visualMath
// - inputOutput
// - sentence
// - grid
// - wordGrid
// - crossGrid
//
// Architecture:
// ActivityManager
//      ↓
// PuzzleEngine
//      ↓
// activityReady
//      ↓
// PuzzleScreen
//
// Execution remains in PuzzleEngine
// and Puzzle Type Handlers.
// =====================================


const PuzzleScreen = {

    resetInProgress: false,
    currentOrder: [],

    activityReadyConnected: false,

    relationStreak: 0,
    relationActivityId: null,
    relationLastQuestionIndex: -1,

    spatialScreenActivatedAt: 0,

    spatialUserInitiatedDragAt: 0,

    coordinatePlaneActivityId: null,

    coordinatePlaneSolvedPoints: [],

    coordinatePlanePointNames: ["آ", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی"],


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (
            typeof EventManager ===
            "undefined"
        ) {

            console.error(
                "Puzzle Screen: EventManager Not Available"
            );

            return;

        }


        if (
            this.activityReadyConnected
        ) {

            return;

        }


        EventManager.on(
            "activityReady",
            function (payload) {

                PuzzleScreen.handleActivityReady(
                    payload
                );

            }
        );


        EventManager.on("puzzleWrong", function () {
            if (typeof PuzzleEngine !== "undefined" && PuzzleEngine.activity && PuzzleEngine.activity.id === "mathPatternRelation") {
                PuzzleScreen.relationStreak = 0;
                PuzzleScreen.relationLastQuestionWasWrong = true;
            }
        });

        // The final correct answer finishes the activity without loading another
        // question, so count it here instead of relying only on question transitions.
        EventManager.on("puzzleFinished", function (result) {
            if (!result || result.activityId !== "mathPatternRelation") return;
            if (PuzzleScreen.relationLastQuestionIndex >= 0 &&
                !PuzzleScreen.relationLastQuestionWasWrong) {
                PuzzleScreen.relationStreak = (PuzzleScreen.relationStreak || 0) + 1;
            }
        });

        this.activityReadyConnected =
            true;


        console.log(
            "Puzzle Screen: Activity Ready Listener Connected"
        );

    },


    // =====================================
    // ACTIVITY READY
    // =====================================

    handleActivityReady: function (
        payload
    ) {

        if (!payload) {

            return;

        }


        const engineName =
            payload.engineName;


        if (
            engineName !== "PuzzleEngine"
            &&
            engineName !== "puzzle"
        ) {

            return;

        }


        const engine = payload.engine;
        if (
            !engine ||
            typeof PuzzleEngine === "undefined" ||
            engine !== PuzzleEngine ||
            !engine.state ||
            !engine.state.started ||
            engine.state.isFinished ||
            engine.activity !== payload.activity ||
            engine.currentQuestion !== payload.questionIndex ||
            !engine.puzzle
        ) {
            return;
        }

        const result = payload.result;

        if (!result) {

            console.error(
                "Puzzle Screen: Puzzle Result Missing"
            );

            return;

        }


        if (payload.activity && payload.activity.id === "mathCoordinatePlane" &&
            Number(payload.questionIndex) === 0) {
            // A new run starts at question index 0, even when the activity ID is unchanged.
            this.coordinatePlaneActivityId = payload.activity.id;
            this.coordinatePlaneSolvedPoints = [];
        }

        if (payload.activity && payload.activity.id === "mathSpatialSymmetry") {
            this.spatialScreenActivatedAt = 0;
            this.spatialUserInitiatedDragAt = 0;
        }

        if (payload.result && payload.result.mode === "relation") {
            const index = Number(payload.questionIndex);
            const id = payload.activity && payload.activity.id;
            if (this.relationActivityId !== id || index === 0) {
                this.relationActivityId = id;
                this.relationStreak = 0;
                this.relationLastQuestionIndex = -1;
                this.relationLastQuestionWasWrong = false;
            }
            if (Number.isInteger(index) && index > this.relationLastQuestionIndex) {
                // A new question appears only after a correct answer; do not count
                // the transition if the previous question had any wrong attempt.
                if (this.relationLastQuestionIndex >= 0 && !this.relationLastQuestionWasWrong) {
                    this.relationStreak = (this.relationStreak || 0) + 1;
                }
                this.relationLastQuestionWasWrong = false;
                this.relationLastQuestionIndex = index;
            }
        }

        console.log(
            "Puzzle Screen: Activity Ready Received",
            payload.activity
                ? payload.activity.id
                : null
        );


        this.show(
            result
        );

    },


    // =====================================
    // SHOW ROUTER
    // =====================================

    show: function (
        state
    ) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // Jigsaw has its own dedicated screen and must not fall through
        // to the generic PuzzleScreen type switch.
        if (
            state.type === "jigsaw" &&
            typeof JigsawScreen !== "undefined" &&
            typeof JigsawScreen.show === "function"
        ) {
            JigsawScreen.show(state);
            return;
        }

        switch (
            state.type
        ) {

            case "ordering":

                this.showOrdering(
                    state
                );

                return;


            case "sequence":

                this.showSequence(
                    state
                );

                return;


            case "visualMath":

                this.showVisualMath(
                    state
                );

                return;


            case "inputOutput":

                this.showInputOutput(
                    state
                );

                return;


            case "sentence":

                this.showSentence(
                    state
                );

                return;


            case "grid":

                this.showGrid(
                    state
                );

                return;


            case "wordGrid":

                this.showWordGrid(
                    state
                );

                return;


            case "crossGrid":

                this.showCrossGrid(
                    state
                );

                return;

            case "pattern":

                this.showPattern(
                    state
                );

                return;

            case "spatial":

                this.showSpatial(
                    state
                );

                return;


            default:

                console.warn(
                    "Puzzle Screen: Unsupported Type:",
                    state.type
                );

        }

    },


    // =====================================
    // SPATIAL
    // =====================================

    showSpatial: function (state) {
        if (state && state.mode === "coordinatePlane") {
            this.showCoordinatePlane(state);
            return;
        }
        if (state && state.mode === "place") {
            this.showSpatialPlace(state);
            return;
        }

        if (state && state.mode === "symmetry") {
            this.showSpatialSymmetry(state);
            return;
        }

        this.showSpatialLegacy(state);
    },


    showCoordinatePlane: function (state) {
        const app = this.getApp();
        if (!app) return;
        const system = state.coordinateSystem;
        const task = state.task || {};
        if (!system || typeof SpatialPuzzle === "undefined") {
            app.innerHTML = "<div class='screen puzzleScreen'><p>اطلاعات صفحه مختصات معتبر نیست.</p></div>";
            return;
        }

        const width = 360, height = 300;
        const viewport = { left: 30, top: 20, right: 330, bottom: 270, width: 300, height: 250 };
        const xMin = Number(system.xMin), xMax = Number(system.xMax);
        const yMin = Number(system.yMin), yMax = Number(system.yMax);
        const step = Number(system.unitStep);
        const toPixel = function (point) {
            return SpatialPuzzle.mathToPixel(point, system, viewport);
        };
        const lines = [];
        for (let x = xMin; x <= xMax + 1e-8; x += step) {
            const p = toPixel({ x: x, y: yMin });
            if (p) lines.push("<line x1='" + p.x + "' y1='" + viewport.top + "' x2='" + p.x + "' y2='" + (viewport.top + viewport.height) + "' stroke='#dbe3ec' />");
        }
        for (let y = yMin; y <= yMax + 1e-8; y += step) {
            const p = toPixel({ x: xMin, y: y });
            if (p) lines.push("<line x1='" + viewport.left + "' y1='" + p.y + "' x2='" + (viewport.left + viewport.width) + "' y2='" + p.y + "' stroke='#dbe3ec' />");
        }

        const xa = toPixel({ x: xMin, y: 0 }), xb = toPixel({ x: xMax, y: 0 });
        const ya = toPixel({ x: 0, y: yMin }), yb = toPixel({ x: 0, y: yMax });
        if (xa && xb) lines.push("<line x1='" + xa.x + "' y1='" + xa.y + "' x2='" + xb.x + "' y2='" + xb.y + "' stroke='#334155' stroke-width='2' />");
        if (ya && yb) lines.push("<line x1='" + ya.x + "' y1='" + ya.y + "' x2='" + yb.x + "' y2='" + yb.y + "' stroke='#334155' stroke-width='2' />");

        // Render both axis label sets from one shared pattern so positive and negative
        // coordinate ranges keep the same spacing, typography, and readable axis offsets.
        // This is presentation only; coordinate math and answer validation stay unchanged.
        const axisLabels = [];
        const appendAxisLabels = function (min, max, axis, color) {
            for (let value = min; value <= max + 1e-8; value += step) {
                if (Math.abs(value) < 1e-8) continue;
                const point = axis === "x"
                    ? toPixel({ x: value, y: 0 })
                    : toPixel({ x: 0, y: value });
                if (!point) continue;
                const label = PuzzleScreen.escapeHTML(String(Number(value.toFixed(6))));
                const x = axis === "x" ? point.x : point.x - 12;
                const y = axis === "x" ? point.y + 14 : point.y + 3.5;
                const anchor = axis === "x" ? "middle" : "end";
                axisLabels.push("<text x='" + x + "' y='" + y + "' text-anchor='" + anchor + "' font-size='10' font-weight='600' fill='" + color + "'>" + label + "</text>");
            }
        };
        if (xa && xb) appendAxisLabels(xMin, xMax, "x", "#b45309");
        if (ya && yb) appendAxisLabels(yMin, yMax, "y", "#c2410c");

        let markers = "";
        if (task.kind === "placePoint" || task.kind === "readPoint") {
            markers = (this.coordinatePlaneSolvedPoints || []).map(function (point) {
                const p = toPixel(point);
                return p ? "<circle cx='" + p.x + "' cy='" + p.y + "' r='5' fill='#16a34a' /><text x='" + (p.x + 8) + "' y='" + (p.y - 8) + "' font-size='13' font-weight='700' fill='#15803d'>" + PuzzleScreen.escapeHTML(point.label) + "</text>" : "";
            }).join("");
            if (task.kind === "readPoint" && task.target) {
                const p = toPixel(task.target);
                if (p) markers += "<circle cx='" + p.x + "' cy='" + p.y + "' r='6' fill='#2563eb' /><text x='" + (p.x + 8) + "' y='" + (p.y - 8) + "' font-size='12' fill='#1d4ed8'>" + PuzzleScreen.escapeHTML(this.coordinatePlanePointNames[this.coordinatePlaneSolvedPoints.length] || "نقطه") + "</text>";
            }
        } else if (task.kind === "identifyPoint" && Array.isArray(task.points)) {
            markers = task.points.map(function (point) {
                const p = toPixel(point);
                return p ? "<circle cx='" + p.x + "' cy='" + p.y + "' r='5' fill='#2563eb' /><text x='" + (p.x + 7) + "' y='" + (p.y - 7) + "' font-size='12' fill='#1d4ed8'>" + PuzzleScreen.escapeHTML(point.label || point.id) + "</text>" : "";
            }).join("");
        }

        const instructionMarkup = task.kind === "placePoint" && task.target
            ? "مکان نقاط مشخص‌شده را در دستگاه مختصات مشخص کن."
            : (state.instruction || "نقاط و محورهای مختصات را بررسی کن.");
        const selected = state.userAnswer;
        const currentCoordinatePointName = this.coordinatePlanePointNames[this.coordinatePlaneSolvedPoints.length] || "نقطه";
        const targetMatrixMarkup = task.kind === "placePoint" && task.target
            ? "<div class='coordinateTargetMatrixWrap'><span class='coordinateTargetCaption'>مختصات هدف</span><div class='coordinateTargetNamedMatrix' dir='rtl'><span class='coordinateTargetLabels'><span>طول</span><span>عرض</span></span><div class='coordinateTargetMatrix' dir='ltr'><span class='coordinateTargetBracket coordinateTargetBracketRight'></span><span class='coordinateTargetRows'><span>" + Number(task.target.x) + "</span><span>" + Number(task.target.y) + "</span></span><span class='coordinateTargetBracket'></span></div><span class='coordinateTargetPointName'>= " + PuzzleScreen.escapeHTML(currentCoordinatePointName) + "</span></div><button id='coordinatePlaneCheckBtn' type='button' " + (selected === undefined || selected === null ? "disabled" : "") + ">بررسی</button></div>"
            : "";

        let selectionMarker = "";
        let selectionText = "نقطه‌ای را که فکر می‌کنی درست است، انتخاب کن.";
        if (task.kind === "identifyPoint" && typeof selected === "string") {
            const selectedPoint = (task.points || []).find(function (point) { return String(point.id) === selected; });
            if (selectedPoint) {
                const p = toPixel(selectedPoint);
                if (p) selectionMarker = "<circle cx='" + p.x + "' cy='" + p.y + "' r='9' fill='none' stroke='#ea580c' stroke-width='3' />";
                selectionText = "نقطهٔ انتخاب‌شده: " + PuzzleScreen.escapeHTML(selectedPoint.label || selectedPoint.id);
            }
        } else if (selected && typeof selected === "object" && Number.isFinite(Number(selected.x)) && Number.isFinite(Number(selected.y))) {
            const p = toPixel(selected);
            if (p) selectionMarker = "<circle id='coordinatePlaneSelectionMarker' cx='" + p.x + "' cy='" + p.y + "' r='7' fill='#ea580c' stroke='#fff' stroke-width='2' />";
            selectionText = "نقطه انتخاب شد؛ حالا «بررسی» را بزن.";
        }

        app.innerHTML = "<div class='screen puzzleScreen spatialScreen coordinatePlaneScreen' dir='rtl'><div class='coordinatePlaneHeader'><h1>مختصات نقطه‌ها</h1></div><div class='coordinatePlaneInstructionRow'><p class='puzzleInstruction'>" + PuzzleScreen.escapeHTML(instructionMarkup) + "</p></div>" + targetMatrixMarkup + "<div class='coordinatePlaneCanvas'><svg id='coordinatePlaneSvg' viewBox='0 0 " + width + " " + height + "' role='img' aria-label='صفحه مختصات؛ برای انتخاب نقطه لمس یا کلیک کن'>" + lines.join("") + axisLabels.join("") + markers + selectionMarker + "</svg></div><p id='coordinatePlaneStatus' class='coordinatePlaneStatus' aria-live='polite'>" + selectionText + "</p><div id='puzzleMessage' class='puzzleMessage'></div>" + "</div><style>.coordinatePlaneScreen{box-sizing:border-box;overflow:hidden}.coordinatePlaneHeader{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 3px}.coordinatePlaneHeader h1{margin:0;font-size:clamp(18px,4.5vw,25px);line-height:1.2}.coordinatePlaneInstructionRow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 auto 5px;max-width:620px}.coordinatePlaneInstructionRow .puzzleInstruction{flex:1;min-width:0;margin:0;text-align:center;line-height:1.5}.coordinateTargetMatrixWrap{display:flex;flex-direction:row;align-items:center;justify-content:center;flex-wrap:nowrap;gap:8px;margin:4px auto;color:#334155;font-size:14px;white-space:nowrap}.coordinateTargetCaption{font-weight:700;font-size:13px;margin-inline-end:10ch}.coordinateTargetNamedMatrix{direction:rtl;display:flex;align-items:center;justify-content:center;gap:1ch}.coordinateTargetPointName{font-size:16px;font-weight:700;white-space:nowrap}.coordinatePlaneScreen .coordinateTargetMatrixWrap #coordinatePlaneCheckBtn{position:relative;z-index:10;pointer-events:auto;display:block;flex:0 0 auto;margin:0;margin-inline-start:10px;padding:6px 10px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-size:13px;cursor:pointer}.coordinatePlaneScreen .coordinateTargetMatrixWrap #coordinatePlaneCheckBtn:disabled{opacity:.45;cursor:not-allowed}.coordinateTargetMatrix{direction:ltr;display:flex;align-items:stretch;gap:5px;font-size:17px;font-weight:600}.coordinateTargetRows{display:grid;grid-template-rows:1fr 1fr;gap:4px;align-items:center;min-width:24px;text-align:center}.coordinateTargetRows span{display:flex;align-items:center;justify-content:center;min-height:22px}.coordinateTargetBracket{width:7px;min-height:58px;box-sizing:border-box;border:2px solid #334155;border-left:0;border-radius:0 4px 4px 0}.coordinateTargetBracketRight{border:2px solid #334155;border-right:0;border-radius:4px 0 0 4px}.coordinateTargetLabels{display:grid;grid-template-rows:1fr 1fr;gap:4px;align-items:center;font-size:12px}.coordinateTargetLabels span{display:flex;align-items:center;justify-content:center}.coordinatePlaneCanvas{width:100%;max-width:620px;margin:6px auto;padding:4px;box-sizing:border-box;background:#fff;border:1px solid #dbe3ec;border-radius:14px}.coordinatePlaneCanvas svg{display:block;width:100%;height:auto;touch-action:manipulation;cursor:crosshair}.coordinatePlaneStatus{text-align:center;color:#475569;font-size:13px;min-height:20px;margin:3px 0}.coordinatePlaneScreen #coordinatePlaneCheckBtn{position:relative;z-index:10;pointer-events:auto;display:block;flex:0 0 auto;margin:0;padding:7px 13px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:14px;cursor:pointer}.coordinatePlaneScreen #coordinatePlaneCheckBtn:disabled{opacity:.45;cursor:not-allowed}@media(max-width:420px){.coordinatePlaneHeader h1{font-size:18px}.coordinatePlaneInstructionRow{gap:6px}.coordinatePlaneInstructionRow .puzzleInstruction{font-size:13px;line-height:1.35}.coordinateTargetMatrixWrap{gap:5px;font-size:12px}.coordinateTargetCaption{font-size:11px}.coordinateTargetNamedMatrix{gap:3px}.coordinateTargetPointName{font-size:14px}.coordinateTargetMatrix{gap:3px;font-size:15px}.coordinateTargetRows{min-width:19px}.coordinateTargetLabels{font-size:10px}.coordinateTargetBracket{width:5px;min-height:48px}.coordinatePlaneScreen .coordinateTargetMatrixWrap #coordinatePlaneCheckBtn{padding:5px 7px;font-size:12px}} </style>";

        const svg = app.querySelector("#coordinatePlaneSvg");
        if (svg) svg.addEventListener("pointerdown", function (event) {
            if (event.button !== undefined && event.button !== 0) return;
            // Convert the click from the rendered SVG rectangle into its fixed viewBox.
            // This SVG uses a 360x300 viewBox and is rendered at the same aspect ratio;
            // the direct rectangle ratio avoids incorrect coordinates from a stale/invalid
            // screen CTM in some browser/zoom/touch combinations.
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const pixel = {
                x: (event.clientX - rect.left) * (width / rect.width),
                y: (event.clientY - rect.top) * (height / rect.height)
            };
            if (pixel.x < viewport.left || pixel.x > viewport.left + viewport.width ||
                pixel.y < viewport.top || pixel.y > viewport.top + viewport.height) return;

            let answer;
            if (task.kind === "identifyPoint") {
                let nearest = null, nearestDistance = Infinity;
                (task.points || []).forEach(function (point) {
                    const pointPixel = toPixel(point);
                    if (!pointPixel) return;
                    const distance = Math.hypot(pointPixel.x - pixel.x, pointPixel.y - pixel.y);
                    if (distance < nearestDistance) { nearest = point; nearestDistance = distance; }
                });
                if (!nearest || nearestDistance > 18) return;
                answer = { id: String(nearest.id) };
            } else {
                answer = SpatialPuzzle.pixelToMath(pixel, system, viewport);
                if (!answer) return;
                answer = SpatialPuzzle.snapCoordinatePoint(answer, system);
                if (!answer) return;
            }

            if (PuzzleEngine.setTypeAnswer(answer)) {
                const updatedState = PuzzleEngine.getState();
                const status = app.querySelector("#coordinatePlaneStatus");
                const check = app.querySelector("#coordinatePlaneCheckBtn");
                const previousMarker = app.querySelector("#coordinatePlaneSelectionMarker");
                if (previousMarker) previousMarker.remove();

                let marker = null;
                let statusText = "نقطه انتخاب شد؛ حالا «بررسی» را بزن.";
                if (task.kind === "identifyPoint") {
                    const id = String(answer.id);
                    const point = (task.points || []).find(function (item) {
                        return String(item.id) === id;
                    });
                    if (point) {
                        const p = toPixel(point);
                        if (p) {
                            marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                            marker.setAttribute("id", "coordinatePlaneSelectionMarker");
                            marker.setAttribute("cx", String(p.x));
                            marker.setAttribute("cy", String(p.y));
                            marker.setAttribute("r", "9");
                            marker.setAttribute("fill", "none");
                            marker.setAttribute("stroke", "#ea580c");
                            marker.setAttribute("stroke-width", "3");
                        }
                        statusText = "نقطهٔ انتخاب‌شده: " + (point.label || point.id);
                    }
                } else {
                    const p = toPixel(answer);
                    if (p) {
                        marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        marker.setAttribute("id", "coordinatePlaneSelectionMarker");
                        marker.setAttribute("cx", String(p.x));
                        marker.setAttribute("cy", String(p.y));
                        marker.setAttribute("r", "7");
                        marker.setAttribute("fill", "#ea580c");
                        marker.setAttribute("stroke", "#fff");
                        marker.setAttribute("stroke-width", "2");
                    }
                    statusText = "نقطه انتخاب شد؛ حالا «بررسی» را بزن.";
                }

                if (marker) { marker.setAttribute("id", "coordinatePlaneSelectionMarker"); svg.appendChild(marker); }
                if (status) status.textContent = task.kind === "placePoint"
                    ? statusText
                    : statusText;
                if (check) check.disabled = updatedState.userAnswer === undefined || updatedState.userAnswer === null;
            }
        });

        const checkButton = app.querySelector("#coordinatePlaneCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (checkButton.disabled) return;
                const currentState = PuzzleEngine.getState();
                if (!currentState || currentState.userAnswer === undefined || currentState.userAnswer === null) {
                    const status = app.querySelector("#coordinatePlaneStatus");
                    if (status) status.textContent = "ابتدا نقطه را روی شبکه انتخاب کن.";
                    checkButton.disabled = true;
                    return;
                }
                const status = app.querySelector("#coordinatePlaneStatus");
                if (status) status.textContent = "پاسخ ثبت شد؛ در حال بررسی...";
                checkButton.disabled = true;
                if (task.kind === "placePoint" && task.target &&
                    currentState.userAnswer && typeof currentState.userAnswer === "object" &&
                    Number(currentState.userAnswer.x) === Number(task.target.x) &&
                    Number(currentState.userAnswer.y) === Number(task.target.y)) {
                    const existingPoint = (PuzzleScreen.coordinatePlaneSolvedPoints || []).some(function (point) {
                        return Number(point.x) === Number(task.target.x) && Number(point.y) === Number(task.target.y);
                    });
                    if (!existingPoint) {
                        const pointName = PuzzleScreen.coordinatePlanePointNames[PuzzleScreen.coordinatePlaneSolvedPoints.length] || "نقطه";
                        PuzzleScreen.coordinatePlaneSolvedPoints.push({
                            x: Number(task.target.x),
                            y: Number(task.target.y),
                            label: pointName
                        });
                    }
                }
                const accepted = PuzzleEngine.check();
                // A correct answer may synchronously render the next question.
                // Otherwise provide visible feedback and keep retry available.
                if (!accepted && checkButton.isConnected) {
                    checkButton.disabled = false;
                    if (status) status.textContent = "این نقطه درست نیست؛ به جایگاه آن روی محور‌ها دقت کن و دوباره تلاش کن.";
                }
            });
        }

        // This activity has no in-game restart or attempt counter; restarting remains available from the result screen.
    },

    showSpatialLegacy: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const cells = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const item = items.find(function (entry) {
                    return entry && Number(entry.row) === row && Number(entry.col) === col;
                });
                cells.push("<div class=\"spatialCell\">" +
                    (item ? PuzzleScreen.escapeHTML(item.label || item.id || "") : "") +
                    "</div>");
            }
        }

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen\" dir=\"rtl\">" +
                "<h1>درک فضایی</h1>" +
                "<p class=\"puzzleInstruction\">" + PuzzleScreen.escapeHTML(state.instruction) + "</p>" +
                (state.question ? "<div class=\"spatialQuestion\">" + PuzzleScreen.escapeHTML(state.question) + "</div>" : "") +
                "<div class=\"spatialGrid\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                "<div class=\"spatialOptions\">" +
                    options.map(function (option) {
                        const selected = PuzzleScreen.valuesEqualForDisplay(option, state.userAnswer) ? " selected" : "";
                        return "<button class=\"spatialOption" + selected + "\" data-answer=\"" + PuzzleScreen.escapeHTML(option) + "\">" + PuzzleScreen.escapeHTML(option) + "</button>";
                    }).join("") +
                "</div>" +
                "<button id=\"spatialCheckBtn\">بررسی پاسخ</button>" +
                "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        app.querySelectorAll(".spatialOption").forEach(function (button) {
            button.addEventListener("click", function () {
                PuzzleEngine.setTypeAnswer(button.dataset.answer);
                PuzzleScreen.show(PuzzleEngine.getState());
            });
        });

        const checkButton = app.querySelector("#spatialCheckBtn");
        if (checkButton) checkButton.addEventListener("click", function () {
            PuzzleEngine.check();
        });
    },


    showSpatialPlace: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const pieces = Array.isArray(state.pieces) ? state.pieces : [];
        const placements = state.placements || {};
        const placedByCell = {};

        pieces.forEach(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) {
                placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
            }
        });

        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const key = row + ":" + col;
                const piece = placedByCell[key];
                const targetPiece = pieces.find(function (entry) {
                    return entry &&
                        entry.target &&
                        Number(entry.target.row) === row &&
                        Number(entry.target.col) === col;
                });

                cells.push(
                    "<div class=\"spatialDropCell" + (piece ? " filled" : "") + (targetPiece && !piece ? " hasTarget" : "") + "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                        (piece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\">" + PuzzleScreen.escapeHTML(piece.label || piece.id) + "</div>"
                            : targetPiece
                                ? "<div class=\"spatialTargetGhost\" aria-hidden=\"true\">" + PuzzleScreen.escapeHTML(targetPiece.label || targetPiece.id) + "</div>"
                                : "<span class=\"spatialSlotHint\"></span>") +
                    "</div>"
                );
            }
        }

        const tray = pieces.map(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) return "";
            return "<div class=\"spatialDragPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\" tabindex=\"0\">" +
                PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
        }).join("");

        const placedCount = Object.keys(placements).filter(function (id) {
            return placements[id] !== null && placements[id] !== undefined;
        }).length;

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen spatialPlaceScreen\" dir=\"rtl\">" +
                "<h1>جای درست شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">هر شکل را روی جای هم‌شکل خودش قرار بده.</p>" +
                "<div class=\"spatialProgress\">" + placedCount + " از " + pieces.length + " شکل در صفحه قرار گرفته است</div>" +
                "<div class=\"spatialPlacementLayout\">" +
                    "<div class=\"spatialBoardWrap\">" +
                        "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                    "</div>" +
                    "<div class=\"spatialTray\">" +
                        "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                        "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                    "</div>" +
                "</div>" +
                "<button id=\"spatialPlaceCheckBtn\" class=\"spatialCheckButton\">بررسی چیدمان</button>" +
                "<div id=\"spatialPlaceMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        const beginDrag = function (pieceElement) {
            const pieceId = pieceElement.dataset.pieceId;
            if (!pieceId) return;

            const ghost = document.createElement("div");
            ghost.className = "spatialDragGhost";
            ghost.textContent = pieceElement.textContent || "";
            document.body.appendChild(ghost);

            const moveGhost = function (event) {
                ghost.style.left = (event.clientX - 32) + "px";
                ghost.style.top = (event.clientY - 32) + "px";
            };

            const finishDrag = function (event) {
                document.removeEventListener("pointermove", moveGhost);
                document.removeEventListener("pointerup", finishDrag);
                ghost.remove();

                const target = document.elementFromPoint(event.clientX, event.clientY);
                const cell = target && target.closest ? target.closest(".spatialDropCell") : null;

                if (cell && app.contains(cell)) {
                    PuzzleEngine.setTypeAnswer({
                        pieceId: pieceId,
                        row: Number(cell.dataset.row),
                        col: Number(cell.dataset.col)
                    });
                    PuzzleScreen.show(PuzzleEngine.getState());
                }
            };

            document.addEventListener("pointermove", moveGhost);
            document.addEventListener("pointerup", finishDrag, { once: true });
            moveGhost(event);
        };

        app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
            pieceElement.addEventListener("pointerdown", function (event) {
                event.preventDefault();
                beginDrag(pieceElement);
            });
        });

        const checkButton = app.querySelector("#spatialPlaceCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function () {
                const correct = PuzzleEngine.check();
                if (!correct) {
                    const message = app.querySelector("#spatialPlaceMessage");
                    if (message) message.textContent = "هنوز همه شکل‌ها در جای درست نیستند.";
                }
            });
        }
    },


    // =====================================
    // ORDERING
    // =====================================

    showOrdering: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        this.currentOrder =
            Array.isArray(
                state.items
            )
                ? [
                    ...state.items
                ]
                : [];


        const itemsHTML =
            this.currentOrder
                .map(
                    function (
                        item,
                        index
                    ) {

                        if (
                            state.dataType ===
                            "image"
                        ) {

                            return `

                                <button
                                    class="puzzleItem puzzleImageItem"
                                    data-index="${index}">

                                    <img
                                        src="${item}"
                                        alt="پازل"
                                        draggable="false">

                                </button>

                            `;

                        }


                        return `

                            <button
                                class="puzzleItem"
                                data-index="${index}">

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل مرتب‌سازی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    id="puzzleItems"
                    class="puzzleItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="puzzleCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <div class="puzzleMoves">

                    حرکت‌ها:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindOrderingEvents();

    },


    // =====================================
    // SEQUENCE
    // =====================================

    showSequence: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const itemsHTML =
            state.items
                .map(
                    function (
                        item,
                        index
                    ) {

                        if (
                            index ===
                            state.missingIndex
                        ) {

                            return `

                                <span
                                    class="sequenceMissing">

                                    ؟

                                </span>

                            `;

                        }


                        return `

                            <span
                                class="sequenceItem">

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

                            </span>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    دنباله
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="sequenceItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>

                <div
                    class="sequenceAnswerArea">

                    <input
                        id="sequenceAnswerInput"
                        type="number"
                        inputmode="numeric"
                        placeholder="پاسخ"
                        autocomplete="off">

                    <button
                        id="sequenceCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindSequenceEvents();

    },


    // =====================================
    // VISUAL MATH
    // =====================================

    showVisualMath: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const operation =
            state.operation;


        const groups =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        if (
            !groups.length
        ) {

            this.showUnsupported(
                "محتوای پازل تصویری وجود ندارد."
            );

            return;

        }


        // =================================
        // COUNTING
        // =================================

        if (
            operation ===
            "counting"
        ) {

            const group =
                this.renderVisualGroup(
                    groups[0]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        شمارش تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualMathCountingGroup"
                        dir="ltr">

                        ${group}

                    </div>

                    <div
                        class="visualMathAnswerArea">

                        <input
                            id="visualMathAnswerInput"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            placeholder="پاسخ"
                            autocomplete="off">

                        <button
                            id="visualMathCheckBtn">

                            بررسی پاسخ

                        </button>

                    </div>

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualMathEvents();

            return;

        }


        // =================================
        // COMPARISON
        // =================================

        if (
            operation ===
            "comparison"
        ) {

            const first =
                this.renderVisualGroup(
                    groups[0]
                );


            const second =
                this.renderVisualGroup(
                    groups[1]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        مقایسه تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualComparisonArea">

                        <div class="visualComparisonGroup">
                            ${first}
                        </div>

                        <div
                            class="visualComparisonSeparator">

                            ؟

                        </div>

                        <div class="visualComparisonGroup">
                            ${second}
                        </div>

                    </div>

                    <div
                        class="visualComparisonChoices">

                        <button
                            class="visualComparisonBtn"
                            data-answer="left">

                            گروه اول

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="equal">

                            برابر

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="right">

                            گروه دوم

                        </button>

                    </div>

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualComparisonEvents();

            return;

        }


        // =================================
        // ADDITION / SUBTRACTION
        // =================================

        if (
            groups.length !== 2
        ) {

            this.showUnsupported(
                "ساختار جمع یا تفریق تصویری نامعتبر است."
            );

            return;

        }


        const firstGroup =
            this.renderVisualGroup(
                groups[0]
            );


        const secondGroup =
            this.renderVisualGroup(
                groups[1]
            );


        const operator =
            operation ===
            "subtraction"
                ? "−"
                : "+";


        const title =
            operation ===
            "subtraction"
                ? "تفریق تصویری"
                : "جمع تصویری";


        app.innerHTML = `

            <div
                class="screen puzzleScreen visualMathScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="visualMathEquation"
                    dir="ltr">

                    <div class="visualMathGroup">
                        ${firstGroup}
                    </div>

                    <div class="visualMathOperator">
                        ${operator}
                    </div>

                    <div class="visualMathGroup">
                        ${secondGroup}
                    </div>

                    <div class="visualMathOperator">
                        =
                    </div>

                    <div class="visualMathQuestion">
                        ؟
                    </div>

                </div>

                <div
                    class="visualMathAnswerArea">

                    <input
                        id="visualMathAnswerInput"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        placeholder="پاسخ"
                        autocomplete="off">

                    <button
                        id="visualMathCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>

                ${this.renderStandardFooter(
                    state.moves
                )}

            </div>

        `;


        this.bindVisualMathEvents();

    },


    // =====================================
    // INPUT / OUTPUT
    // =====================================

    showInputOutput: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const inputs =
            Array.isArray(
                state.inputs
            )
                ? state.inputs
                : [];


        const outputs =
            Array.isArray(
                state.outputs
            )
                ? state.outputs
                : [];


        const rows =
            inputs
                .map(
                    function (
                        input,
                        index
                    ) {

                        const output =
                            outputs[index];


                        const outputHTML =
                            index ===
                            state.missingIndex

                                ?

                                `

                                <input
                                    class="ioAnswerInput"
                                    data-index="${index}"
                                    type="number"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    placeholder="؟">

                                `

                                :

                                `

                                <span
                                    class="ioOutputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        output
                                    )}

                                </span>

                                `;


                        return `

                            <div
                                class="ioRow">

                                <span
                                    class="ioInputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        input
                                    )}

                                </span>

                                <span
                                    class="ioArrow">

                                    ←

                                </span>

                                ${outputHTML}

                            </div>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ماشین ورودی و خروجی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="ioMachine">

                    ${rows}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="ioCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindInputOutputEvents();

    },


    // =====================================
    // SENTENCE
    // =====================================

    showSentence: function (
        state
    ) {

        if (
            state.mode ===
            "sentenceGrammar"
        ) {

            this.showSentenceGrammar(
                state
            );

            return;

        }


        this.showSentenceOrder(
            state
        );

    },


    // =====================================
    // SENTENCE ORDER
    // =====================================

    showSentenceOrder: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const indexes =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const wordHTML =
            indexes
                .map(
                    function (
                        wordIndex,
                        position
                    ) {

                        const word =
                            words[
                                wordIndex
                            ];


                        return `

                            <button
                                class="sentenceWord"
                                data-index="${position}">

                                ${PuzzleScreen.escapeHTML(
                                    word
                                )}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    جمله‌سازی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    id="sentenceWords"
                    class="sentenceWords">

                    ${wordHTML}

                </div>

                <div
                    class="sentencePreview"
                    id="sentencePreview">
                </div>

                <div class="puzzleControls">

                    <button
                        id="sentenceCheckBtn">

                        بررسی جمله

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindSentenceOrderEvents();

    },


    // =====================================
    // SENTENCE GRAMMAR
    // =====================================

    showSentenceGrammar: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const answers =
            Array.isArray(
                state.answers
            )
                ? state.answers
                : [];


        const targets =
            Array.isArray(
                state.targets
            )
                ? state.targets
                : [];


        let targetHTML =
            "";


        const roleOptions = [

            {
                value: "subject",
                label: "نهاد"
            },

            {
                value: "predicate",
                label: "گزاره"
            },

            {
                value: "verb",
                label: "فعل"
            },

            {
                value: "object",
                label: "مفعول"
            },

            {
                value: "adjective",
                label: "صفت"
            },

            {
                value: "adverb",
                label: "قید"
            }

        ];


        targets.forEach(
            function (
                target,
                index
            ) {

                const wordIndex =
                    Number(
                        target
                    );


                const word =
                    words[
                        wordIndex
                    ];


                const currentAnswer =
                    answers[index] ||
                    "";


                const optionsHTML =
                    roleOptions
                        .map(
                            function (
                                option
                            ) {

                                return `

                                    <option
                                        value="${option.value}"
                                        ${
                                            currentAnswer ===
                                            option.value
                                                ? "selected"
                                                : ""
                                        }>

                                        ${option.label}

                                    </option>

                                `;

                            }
                        )
                        .join("");


                targetHTML += `

                    <div
                        class="grammarRow">

                        <span
                            class="grammarWord">

                            ${PuzzleScreen.escapeHTML(
                                word
                            )}

                        </span>

                        <select
                            class="grammarSelect"
                            data-target-index="${index}">

                            <option value="">
                                انتخاب نقش
                            </option>

                            ${optionsHTML}

                        </select>

                    </div>

                `;

            }
        );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    نقش دستوری
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="grammarRows">

                    ${targetHTML}

                </div>

                <div class="puzzleControls">

                    <button
                        id="grammarCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindSentenceGrammarEvents();

    },


    // =====================================
    // PATTERN
    // =====================================

    showPattern: function (state) {
        const app = this.getApp();
        if (!app) return;
        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const selected = state.userAnswer === null || state.userAnswer === undefined ? "" : String(state.userAnswer);
        const relationMode = state.mode === "relation";
        const shapeMode = state.mode === "shapes";
        const toPersianDigits = function (value) {
            return String(value === null || value === undefined ? "" : value)
                .replace(/[0-9]/g, function (digit) { return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]; });
        };
        const renderValue = function (value) {
            if (value === null || value === undefined || value === "") return "؟";
            return PuzzleScreen.escapeHTML(toPersianDigits(value));
        };
        const shapeClassByToken = {
            "circle-red": "shapeCircle shapeRed",
            "square-blue": "shapeSquare shapeBlue",
            "triangle-purple": "shapeTriangle shapePurple",
            "diamond-green": "shapeDiamond shapeGreen",
            "circle-orange": "shapeCircle shapeOrange",
            "square-purple": "shapeSquare shapePurple",
            "triangle-up": "shapeTriangle shapeBlue",
            "triangle-right": "shapeTriangle shapeBlue shapeRotateRight",
            "triangle-down": "shapeTriangle shapeBlue shapeRotateDown",
            "triangle-left": "shapeTriangle shapeBlue shapeRotateLeft"
        };
        const renderShapeValue = function (value) {
            if (value === null || value === undefined || value === "") return "؟";
            return String(value).split("|").map(function (token) {
                const shapeClass = shapeClassByToken[token] || "shapeCircle shapeRed";
                return '<span class="shapeGlyph ' + shapeClass + '" aria-hidden="true"></span>';
            }).join("");
        };

        let itemsHTML = "";
        if (relationMode) {
            const pairs = items.map(function (item) {
                if (item && typeof item === "object") {
                    return {
                        circle: item.circle !== undefined ? item.circle : item.circleValue,
                        square: item.square !== undefined ? item.square : item.squareValue
                    };
                }
                const text = String(item === null || item === undefined ? "" : item);
                const circleMatch = text.match(/○\s*=\s*([0-9٠-٩۰-۹]+)/);
                const squareMatch = text.match(/□\s*=\s*([0-9٠-٩۰-۹]+)/);
                return { circle: circleMatch ? circleMatch[1] : "", square: squareMatch ? squareMatch[1] : "" };
            });
            const circleCells = pairs.map(function (pair) { return "<td>" + renderValue(pair.circle) + "</td>"; }).join("");
            const squareCells = pairs.map(function (pair) { return "<td>" + renderValue(pair.square) + "</td>"; }).join("");
            itemsHTML = "<table class=\"patternRelationTable\" dir=\"ltr\" aria-label=\"جدول رابطهٔ دایره و مربع\"><tbody>" +
                "<tr><th scope=\"row\">○</th>" + circleCells + "</tr>" +
                "<tr><th scope=\"row\">□</th>" + squareCells + "</tr>" +
                "</tbody></table>";
        } else {
            itemsHTML = items.map(function (item, index) {
                const missing = index === Number(state.missingIndex);
                const arrow = index < items.length - 1 ? "<span class=\"patternArrow\" aria-hidden=\"true\">→</span>" : "";
                const itemClass = "patternItem " + (missing ? "patternMissing" : "") + (shapeMode ? " shapePatternItem" : "");
                const itemContent = shapeMode ? renderShapeValue(item) : renderValue(item);
                return "<div class=\"patternStep\"><div class=\"" + itemClass + "\">" +
                    itemContent + "</div>" + arrow + "</div>";
            }).join("");
        }

        const optionLetters = ["آ", "ب", "پ", "ت"];
        const optionsHTML = options.map(function (option, index) {
            const value = String(option);
            const selectedClass = selected === value ? " selected" : "";
            const optionLabel = relationMode ? "<span class=\"patternOptionLetter\">" + optionLetters[index % optionLetters.length] + "</span>" : "";
            const optionClass = "patternOption" + selectedClass + (shapeMode ? " shapePatternOption" : "");
            const optionContent = shapeMode ? renderShapeValue(option) : renderValue(option);
            return "<button type=\"button\" class=\"" + optionClass +
                "\" data-pattern-value=\"" + PuzzleScreen.escapeHTML(value) + "\">" + optionLabel + optionContent + "</button>";
        }).join("");

        const relationMission = relationMode
            ? "<div class=\"relationMission\"><div class=\"relationMissionIcon\">🕵️</div><div class=\"relationMissionCopy\"><strong>پروندهٔ عددی باز شد!</strong><span>۴ شاهد را بررسی کن و قانون پنهان را پیدا کن.</span></div><div class=\"relationMissionTag\">مأموریت</div></div>"
            : "";
        const shapeMission = shapeMode
            ? "<div class=\"shapeMission\"><span>🎨</span><div><strong>کارگاه معمار الگوها</strong><small>به شکل، رنگ و تعداد قطعه‌ها دقت کن.</small></div></div>"
            : "";


        const relationHud = relationMode
            ? '<div class="relationScoreboard"><div class="relationStat"><span>پرونده</span><strong>' + toPersianDigits(Number(state.currentQuestion || 0) + 1) + ' از ' + toPersianDigits(state.totalQuestions || 10) + '</strong></div>' +
              '<div class="relationStat"><span>⭐ امتیاز</span><strong>' + toPersianDigits(typeof ScoreManager === "undefined" ? 0 : (ScoreManager.score || 0)) + '</strong></div>' +
              '<div class="relationStat"><span>🔥 زنجیرهٔ درست</span><strong>' + toPersianDigits(this.relationStreak || 0) + '</strong></div>' +
              '<div class="relationProgressTrack"><span style="width:' + Math.min(100, Math.round(((Number(state.currentQuestion || 0) + 1) / Math.max(1, Number(state.totalQuestions) || 10)) * 100)) + '%"></span></div></div>'
            : '';

        app.innerHTML =
            "<div class=\"screen puzzleScreen patternScreen" + (shapeMode ? " shapePatternScreen" : "") + "\" dir=\"rtl\"><div class=\"patternCard" + (relationMode ? " relationGameCard" : "") + (shapeMode ? " shapeGameCard" : "") + "\">" +
                "<div class=\"patternHeader\"><div class=\"patternBadge\">" + (relationMode ? "🗂️ پروندهٔ کارآگاهی" : (shapeMode ? "🧩 چالش تصویری" : "پازل الگو")) + "</div>" +
                "<h1>" + (relationMode ? "کارآگاه رابطه‌ها" : (shapeMode ? "معمار الگوها" : "الگو را کشف کن")) + "</h1>" +
                "<p class=\"puzzleInstruction\">" + PuzzleScreen.escapeHTML(state.instruction) + "</p></div>" +
                relationMission + shapeMission + relationHud +
                "<div class=\"patternBoard" + (relationMode ? " patternRelationBoard" : "") + (shapeMode ? " shapePatternBoard" : "") + "\" aria-label=\"" +
                    (relationMode ? "نمونه‌های رابطه" : (shapeMode ? "الگوی شکلی" : "الگوی عددی")) + "\">" + itemsHTML + "</div>" +
                "<div class=\"patternPrompt\"><span>" +
                    (relationMode ? "کدام قانون، همهٔ شاهدها را توضیح می‌دهد؟" : (shapeMode ? "کدام گزینه الگو را کامل می‌کند؟" : "عدد مناسب برای جای خالی را انتخاب کن")) +
                "</span></div><div class=\"patternOptions" + (relationMode ? " relationSuspects" : "") + (shapeMode ? " shapePatternOptions" : "") + "\">" + optionsHTML + "</div>" +
                "<div class=\"puzzleControls patternControls\"><button type=\"button\" id=\"patternCheckBtn\">" + (relationMode ? "🔎 بررسی مظنون" : (shapeMode ? "✨ بررسی الگو" : "بررسی پاسخ")) + "</button>" +
                "<button type=\"button\" id=\"puzzleResetBtn\">" + (relationMode ? "↻ پروندهٔ تازه" : (shapeMode ? "🎲 الگوی تازه" : "شروع دوباره")) + "</button></div>" +
                "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div></div></div>" +
            "<style>" +
                ".patternScreen{box-sizing:border-box;direction:rtl;width:100%;max-width:100%;min-width:0;margin:0 auto;padding:16px 8px 24px;overflow-x:hidden;}.patternScreen *{box-sizing:border-box;min-width:0;}" +
                ".patternCard{box-sizing:border-box;width:min(820px,100%);max-width:100%;min-width:0;margin:0 auto;padding:24px 18px 28px;background:var(--ui-surface,#fff);border:1px solid var(--ui-border,#dbe4ef);border-radius:24px;box-shadow:var(--ui-shadow-card,0 7px 20px rgba(31,41,55,.06));text-align:center;}" +
                ".patternHeader h1{margin:8px 0 6px;font-size:clamp(25px,4vw,34px);color:var(--ui-text,#172033);}" +
                ".patternBadge{display:inline-block;padding:6px 14px;border-radius:999px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);font-size:14px;color:var(--ui-muted,#667085);}" +
                ".patternHeader .puzzleInstruction{max-width:650px;margin:8px auto 22px;line-height:1.9;color:var(--ui-muted,#667085);}" +
                ".patternBoard{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:10px auto 22px;padding:18px 12px;border-radius:20px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);direction:ltr;}" +
                ".patternRelationBoard{display:block;max-width:100%;overflow-x:auto;padding:10px 6px;}" +
                ".patternRelationTable{direction:ltr;border-collapse:collapse;margin:0 auto;table-layout:fixed;width:100%;max-width:560px;}" +
                ".patternRelationTable th,.patternRelationTable td{min-width:44px;padding:8px 9px;border:1px solid var(--ui-border,#dbe4ef);font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:clamp(20px,4vw,28px);line-height:1.35;text-align:center;white-space:nowrap;}" +
                ".patternRelationTable th{min-width:38px;background:#fff;font-weight:700;color:var(--ui-text,#172033);}" +
                ".patternRelationTable td{background:#fff;font-weight:600;color:var(--ui-text,#172033);}" +


                ".patternStep{display:flex;align-items:center;gap:8px;direction:ltr;}" +
                ".patternItem{direction:ltr;unicode-bidi:isolate;min-width:64px;height:64px;padding:0 12px;display:flex;align-items:center;justify-content:center;border:2px solid var(--ui-border,#dbe4ef);border-radius:16px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:clamp(25px,5vw,34px);font-weight:700;color:var(--ui-text,#172033);box-shadow:0 3px 8px rgba(31,41,55,.06);}" +
                ".patternMissing{border-style:dashed;font-size:34px;color:var(--ui-muted,#667085);background:var(--ui-surface-soft,#f8fbff);}" +
                ".patternArrow{direction:ltr;unicode-bidi:isolate;font-size:25px;color:var(--ui-muted,#667085);line-height:1;}" +
                ".patternRelationHint{max-width:620px;margin:0 auto 10px;padding:8px 12px;border:1px solid var(--ui-border-soft,#e4e9f0);border-radius:10px;background:var(--ui-surface-soft,#f8fbff);color:var(--ui-muted,#667085);font-size:15px;line-height:1.7;font-weight:500;}" +
                ".patternPrompt{max-width:650px;margin:4px auto 12px;font-size:16px;line-height:1.8;color:var(--ui-text,#344054);font-weight:600;}" +
                ".patternOptions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:0 auto 20px;}" +
                ".patternOption{min-width:76px;min-height:58px;height:auto;padding:10px 14px;border:2px solid var(--ui-border,#dbe4ef);border-radius:15px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:" + (relationMode ? "clamp(16px,3vw,21px)" : "24px") + ";font-weight:700;color:var(--ui-text,#172033);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;}" +
                ".patternOption:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(31,41,55,.09);}" +
                ".patternOption.selected{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.14);}" +
                ".patternControls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}.patternControls button{min-width:130px;}" +
                ".shapeGameCard{background:radial-gradient(ellipse at top left,#fff7ed 0,transparent 42%),linear-gradient(145deg,#fff 0%,#f8fbff 100%);border-color:#fed7aa;box-shadow:0 14px 34px rgba(124,58,237,.10);}" +
                ".shapeGameCard:before{content:'';display:block;height:5px;margin:-24px -18px 18px;border-radius:24px 24px 0 0;background:linear-gradient(90deg,#f97316,#8b5cf6,#0ea5e9);}" +
                ".shapeGameCard .patternBadge{background:#fff7ed;border-color:#fed7aa;color:#9a3412;font-weight:800;}" +
                ".shapeMission{display:flex;align-items:center;gap:10px;text-align:right;max-width:620px;margin:0 auto 12px;padding:11px 14px;border:1px solid #fed7aa;border-radius:16px;background:linear-gradient(100deg,#fff7ed,#f5f3ff);color:#7c2d12;}" +
                ".shapeMission>span{font-size:28px;}.shapeMission div{display:flex;flex-direction:column;gap:3px;}.shapeMission strong{font-size:15px;}.shapeMission small{font-size:13px;color:#6b7280;}" +
                ".shapePatternBoard{gap:7px;padding:14px 8px;}" +
                ".shapePatternItem,.shapePatternOption{box-sizing:border-box;display:flex;align-items:center;justify-content:center;align-content:center;flex-wrap:wrap;gap:3px;max-width:100%;overflow:hidden;}" +
                ".shapePatternItem{width:82px;min-width:82px;height:74px;min-height:74px;padding:6px;border-radius:15px;}" +
                ".shapePatternOption{min-width:70px;min-height:58px;padding:8px;}" +
                ".shapeGlyph{display:inline-block;flex:0 0 18px;width:18px;height:18px;position:relative;}" +
                ".shapeCircle,.shapeSquare,.shapeDiamond{background:var(--shape-color);}" +
                ".shapeCircle{border-radius:50%;}.shapeSquare{border-radius:4px;}.shapeDiamond{border-radius:3px;transform:rotate(45deg) scale(.82);}" +
                ".shapeTriangle{width:18px;height:18px;flex:0 0 18px;border:0;background:var(--shape-color)!important;clip-path:polygon(50% 0,0 100%,100% 100%);}" +
                ".shapeRed{--shape-color:#ef4444;}.shapeBlue{--shape-color:#3b82f6;}.shapePurple{--shape-color:#8b5cf6;}.shapeGreen{--shape-color:#22a06b;}.shapeOrange{--shape-color:#f97316;}" +
                ".shapeRotateRight{transform:rotate(90deg);}.shapeRotateDown{transform:rotate(180deg);}.shapeRotateLeft{transform:rotate(270deg);}" +
                ".shapePatternOptions{gap:10px;}.shapePatternOption{width:88px;min-width:88px;min-height:68px;padding:8px;display:inline-flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;}" +
                ".shapePatternOption .shapeGlyph{flex-basis:18px;}" +
                "@media(max-width:520px){.shapeGameCard{padding:20px 10px 24px;}.shapeGameCard:before{margin:-20px -10px 16px;}.shapePatternBoard{gap:5px;padding:10px 4px;}.shapePatternItem{width:66px;min-width:66px;height:66px;min-height:66px;padding:4px;}.shapeGlyph{flex-basis:15px;width:15px;height:15px;}.shapeTriangle{width:15px;height:15px;flex-basis:15px;}.shapePatternOption{width:70px;min-width:70px;min-height:60px;padding:6px;}}" +
                ".relationGameCard{position:relative;overflow:visible;background:radial-gradient(ellipse at top right,#eff6ff 0,transparent 38%),linear-gradient(145deg,#fff 0%,#f8fbff 100%);border:1px solid #cbdcf5;box-shadow:0 16px 42px rgba(35,70,130,.12);}" +
                 "html:has(.relationGameCard){height:auto!important;min-height:100%;overflow-x:clip!important;overflow-y:auto!important;}body:has(.relationGameCard){height:auto!important;min-height:100vh!important;overflow-x:clip!important;overflow-y:visible!important;}#app:has(.relationGameCard){height:auto!important;min-height:0!important;overflow:visible!important;}.patternScreen:has(.relationGameCard){height:auto!important;min-height:0!important;max-height:none!important;overflow-x:clip!important;overflow-y:visible!important;padding-bottom:calc(var(--ui-shell-bottom-space,0px) + 32px);}.relationGameCard{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;}.relationGameCard .patternControls{position:static;float:none;clear:both;margin:14px auto 0;}.relationGameCard #puzzleMessage{position:static;float:none;clear:both;max-height:none;overflow:visible;}" +
                ".relationGameCard:before{content:'';position:absolute;inset:0 0 auto;height:6px;background:linear-gradient(90deg,#0f766e,#2563eb,#7c3aed);}" +
                ".relationGameCard .patternBadge{background:#eaf2ff;border-color:#c8dcff;color:#1d4ed8;font-weight:800;}" +
                ".relationMission{display:flex;align-items:center;gap:12px;text-align:right;margin:0 auto 12px;padding:13px 15px;max-width:650px;border:1px solid #c7d9f7;border-radius:18px;background:linear-gradient(110deg,#eff6ff,#f5f3ff);}" +
                ".relationScoreboard{box-sizing:border-box;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;align-items:stretch;width:100%;max-width:420px;min-width:0;margin:0 auto 10px;padding:7px;border:1px solid #dbeafe;border-radius:12px;background:#fff;text-align:center;}" +
                ".relationStat{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#64748b;font-size:10px;line-height:1.25;font-weight:700;white-space:normal;overflow-wrap:anywhere;}.relationStat strong{color:#1e293b;font-size:13px;line-height:1.3;font-weight:900;white-space:normal;overflow-wrap:anywhere;}" +
                ".relationProgressTrack{grid-column:1/-1;width:100%;min-width:0;height:5px;box-sizing:border-box;overflow:hidden;border-radius:999px;background:#e2e8f0;}.relationProgressTrack span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#0d9488,#2563eb,#7c3aed);transition:width .25s ease;}"+
                ".relationMissionIcon{display:grid;place-items:center;flex:0 0 48px;height:48px;border-radius:15px;background:#fff;box-shadow:0 4px 12px rgba(37,99,235,.12);font-size:27px;}" +
                ".relationMissionCopy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px;}.relationMissionCopy strong{font-size:16px;color:#1e3a8a;}.relationMissionCopy span{font-size:13px;line-height:1.6;color:#475569;}" +
                ".relationMissionTag{padding:5px 9px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;white-space:nowrap;}" +
                ".relationSteps{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 auto 14px;}.relationStep{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:700;}.relationStep b{display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#e2e8f0;color:#475569;font-size:11px;}.relationStep.active{background:#dcfce7;color:#166534;}.relationStep.active b{background:#16a34a;color:#fff;}" +
                ".relationGameCard .patternRelationBoard{background:linear-gradient(135deg,#f0fdfa,#eff6ff);border:1px solid #c7e4e8;box-shadow:inset 0 1px 0 #fff;}" +
                ".relationGameCard .patternRelationTable th{background:#e0f2fe;color:#075985;border-color:#b6d8ee;}.relationGameCard .patternRelationTable tr:nth-child(2) th{background:#ede9fe;color:#5b21b6;}.relationGameCard .patternRelationTable td{background:rgba(255,255,255,.94);border-color:#cbdcf5;font-weight:900;}" +
                ".relationGameCard .patternRelationTable td:first-of-type{border-inline-start:2px solid #93c5fd;}" +
                ".relationGameCard .patternRelationHint{background:#fffbeb;border-color:#fde68a;color:#92400e;text-align:right;}.relationGameCard .patternRelationHint span{font-weight:900;color:#b45309;}" +
                ".relationGameCard .patternPrompt{font-size:18px;font-weight:900;color:#1e293b;}" +
                ".relationSuspects{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:min(100%,420px);max-width:420px;margin-inline:auto;gap:10px;}" +
                "@media(min-width:521px){.relationSuspects .patternOption{width:100%;}}" +
                ".relationSuspects .patternOption{position:relative;display:flex;align-items:center;justify-content:flex-start;gap:8px;min-width:0;min-height:48px;padding:6px 10px;text-align:right;border:1px solid #d5deec;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc);box-shadow:0 4px 0 #e2e8f0;font-size:clamp(15px,2.7vw,20px);}" +
                ".relationSuspects .patternOption:before{content:'مظنون';position:absolute;top:5px;left:8px;color:#94a3b8;font-size:9px;font-weight:800;}" +
                ".patternOptionLetter{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:10px;background:#e0e7ff;color:#3730a3;font-size:14px;font-weight:900;}" +
                ".relationSuspects .patternOption.selected{border:2px solid #2563eb;background:#eff6ff;box-shadow:0 4px 0 #bfdbfe;transform:translateY(-2px);}" +
                ".relationGameCard #patternCheckBtn{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:0;border-radius:13px;box-shadow:0 4px 0 #c7d2fe;font-weight:900;}.relationGameCard #puzzleResetBtn{border:1px solid #cbd5e1;border-radius:13px;background:#fff;color:#475569;font-weight:800;}" +
                ".relationGameCard #puzzleMessage{margin:14px auto 0;max-width:650px;border-radius:14px;line-height:1.8;}" +
                "@media(max-width:520px){.patternScreen{padding:10px 5px 18px}.patternCard{padding:14px 8px 18px}.relationMission{box-sizing:border-box;width:100%;min-width:0;gap:8px;padding:9px;margin-bottom:8px}.relationMissionIcon{flex-basis:34px;height:34px;font-size:20px}.relationMissionCopy{overflow-wrap:anywhere}.relationMissionCopy strong{font-size:13px}.relationMissionCopy span{font-size:11px}.relationMissionTag{display:none}.relationScoreboard{grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;padding:6px;margin-bottom:8px}.relationStat{font-size:9px;line-height:1.25}.relationStat strong{font-size:12px;line-height:1.2}.relationStep{font-size:9px;padding:4px 6px}.relationSuspects{gap:7px}.relationSuspects .patternOption{min-height:42px;padding:5px 6px;gap:5px;font-size:13px}.patternOptionLetter{flex-basis:23px;height:23px;border-radius:7px}.relationSuspects .patternOption:before{font-size:8px;top:3px;left:5px}.relationGameCard .patternPrompt{font-size:15px}.relationGameCard .patternRelationHint{margin:8px 0 10px;padding:9px 11px;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;color:#78350f;font-size:13px;line-height:1.7;text-align:right;box-shadow:0 2px 7px rgba(146,64,14,.07)}.relationGameCard .patternRelationHint span{display:block;margin-bottom:2px;color:#b45309;font-size:11px;font-weight:900}.relationGameCard .patternPrompt{font-size:14px;margin:8px auto}.relationGameCard .patternControls{position:static;width:100%;margin:12px auto 0;padding:8px;display:flex;gap:8px;justify-content:center;background:#fff;border:1px solid #dbeafe;border-radius:14px;box-shadow:0 3px 10px rgba(15,23,42,.08)}.relationGameCard .patternControls button{flex:1;min-width:0;min-height:42px;padding:8px 6px;font-size:13px}.relationGameCard #puzzleMessage:not(:empty){position:static;width:100%;margin:10px auto 0;padding:8px 10px;background:#fff;border:1px solid #cbd5e1;box-shadow:none;font-size:13px;max-height:none;overflow:visible}.patternScreen:has(.relationGameCard){padding-bottom:24px}}" +
                "@media(max-width:600px){.patternCard{padding:18px 10px 24px;border-radius:20px}.patternBoard{gap:5px;padding:12px 4px}.patternRelationBoard{padding:8px 2px}.patternRelationTable th,.patternRelationTable td{min-width:38px;padding:7px 5px;font-size:20px}.patternStep{gap:5px}.patternItem{min-width:52px;height:54px;padding:0 8px}.patternArrow{font-size:19px}.patternOption{min-width:64px;height:52px;padding:0 14px}}"+
            "</style>";
        app.querySelectorAll(".patternOption").forEach(function (button) {
            button.onclick = function () {
                PuzzleEngine.setTypeAnswer(this.dataset.patternValue);
                app.querySelectorAll(".patternOption").forEach(function (item) { item.classList.remove("selected"); });
                this.classList.add("selected");
            };
        });
        const check = app.querySelector("#patternCheckBtn");
        if (check) check.onclick = function () { PuzzleScreen.checkPuzzle(); };
        this.bindResetButton();
    },


    // =====================================
    // GRID
    // =====================================

    showGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "grid",
            "جدول عددی"
        );

    },


    // =====================================
    // WORD GRID
    // =====================================

    showWordGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "wordGrid",
            "جدول واژه‌ها"
        );

    },


    // =====================================
    // GENERIC GRID
    // =====================================

    showGenericGrid: function (
        state,
        type,
        title
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const cells =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const value =
                    cells[
                        index
                    ];


                if (
                    missing.includes(
                        index
                    )
                ) {

                    const inputType =
                        type ===
                        "wordGrid"
                            ? "text"
                            : "number";


                    html += `

                        <div
                            class="gridCell gridMissing">

                            <input
                                class="gridAnswerInput"
                                data-index="${index}"
                                type="${inputType}"
                                ${
                                    type ===
                                    "wordGrid"
                                        ? ""
                                        : 'inputmode="numeric"'
                                }
                                value=""
                                autocomplete="off"
                                placeholder="؟">

                        </div>

                    `;

                }

                else {

                    html += `

                        <div
                            class="gridCell">

                            ${PuzzleScreen.escapeHTML(
                                value
                            )}

                        </div>

                    `;

                }

            }

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="genericGrid"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="gridCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindGridEvents(
            type
        );

    },


    // =====================================
    // CROSS GRID
    // =====================================

    showCrossGrid: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const items =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const cells =
            Array.isArray(
                state.cells
            )
                ? state.cells
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const cell =
                    cells[
                        index
                    ] ||
                    {};


                const value =
                    items[
                        index
                    ];


                // =================================
                // OPERATION CELL
                // =================================

                if (
                    cell.type ===
                    "operation"
                ) {

                    const operator =
                        cell.operator ||
                        cell.value ||
                        "";


                    html += `

                        <div
                            class="crossGridCell crossOperationCell">

                            ${PuzzleScreen.escapeHTML(
                                operator
                            )}

                        </div>

                    `;


                    continue;

                }


                // =================================
                // BLOCK
                // =================================

                if (
                    cell.type ===
                    "blocked"
                ) {

                    html += `

                        <div
                            class="crossGridCell crossBlockedCell">
                        </div>

                    `;


                    continue;

                }


                // =================================
                // MISSING
                // =================================

                if (
                    missing.includes(
                        index
                    )
                ) {

                    html += `

                        <div
                            class="crossGridCell crossMissingCell">

                            <input
                                class="crossGridAnswerInput"
                                data-index="${index}"
                                type="number"
                                inputmode="numeric"
                                autocomplete="off"
                                placeholder="?">

                        </div>

                    `;


                    continue;

                }


                // =================================
                // VALUE
                // =================================

                html += `

                    <div
                        class="crossGridCell">

                        ${
                            value !==
                            null &&
                            value !==
                            undefined

                                ?

                                PuzzleScreen.escapeHTML(
                                    value
                                )

                                :

                                "·"
                        }

                    </div>

                `;

            }

        }


        const pathsInfo =
            this.renderCrossGridPaths(
                state
            );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل شبکه‌ای
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="crossGridContainer"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                ${
                    pathsInfo
                }

                <div
                    class="puzzleControls">

                    <button
                        id="crossGridCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindCrossGridEvents();

    },


    // =====================================
    // CROSS GRID PATHS
    // =====================================

    renderCrossGridPaths: function (
        state
    ) {

        const paths = [

            ...(
                Array.isArray(
                    state.horizontalPaths
                )
                    ? state.horizontalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.verticalPaths
                )
                    ? state.verticalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.paths
                )
                    ? state.paths
                    : []
            )

        ];


        if (
            paths.length === 0
        ) {

            return "";

        }


        const unique = [];


        paths.forEach(
            function (
                path
            ) {

                if (!path) {

                    return;

                }


                const id =
                    path.id ||
                    (
                        path.direction +
                        "_" +
                        path.index
                    );


                if (
                    unique.some(
                        function (
                            item
                        ) {

                            return (
                                item.id ===
                                id
                            );

                        }
                    )
                ) {

                    return;

                }


                unique.push({

                    id:
                        id,

                    direction:
                        path.direction ||
                        "",

                    rule:
                        path.rule ||
                        "",

                    operation:
                        path.operation ||
                        ""

                });

            }
        );


        return `

            <div
                class="crossGridPaths">

                ${
                    unique
                        .map(
                            function (
                                path
                            ) {

                                const label =

                                    path.operation ||
                                    path.rule ||
                                    path.direction;


                                return `

                                    <span
                                        class="crossGridPathTag">

                                        ${PuzzleScreen.escapeHTML(
                                            label
                                        )}

                                    </span>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        `;

    },


    // =====================================
    // VISUAL GROUP
    // =====================================

    renderVisualGroup: function (
        group
    ) {

        if (!group) {

            return "";

        }


        const image =
            group.image;


        const count =
            Number(
                group.count
            ) || 0;


        let html =
            "";


        for (
            let i = 0;

            i < count;

            i++
        ) {

            html += `

                <img
                    class="visualMathImage"
                    src="${image}"
                    alt="شکل"
                    draggable="false">

            `;

        }


        return html;

    },


    // =====================================
    // ORDERING EVENTS
    // =====================================

    bindOrderingEvents: function () {

        const container =
            document.getElementById(
                "puzzleItems"
            );


        if (!container) {

            return;

        }


        let selectedIndex =
            null;


        container
            .querySelectorAll(
                ".puzzleItem"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                selectedIndex ===
                                null
                            ) {

                                selectedIndex =
                                    index;


                                this.classList.add(
                                    "selected"
                                );


                                return;

                            }


                            if (
                                selectedIndex ===
                                index
                            ) {

                                this.classList.remove(
                                    "selected"
                                );


                                selectedIndex =
                                    null;


                                return;

                            }


                            const temp =
                                PuzzleScreen
                                    .currentOrder[
                                        selectedIndex
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    selectedIndex
                                ] =
                                PuzzleScreen
                                    .currentOrder[
                                        index
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    index
                                ] =
                                temp;


                            PuzzleEngine.setOrder(
                                PuzzleScreen.currentOrder
                            );


                            selectedIndex =
                                null;


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "puzzleCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SEQUENCE EVENTS
    // =====================================

    bindSequenceEvents: function () {

        const input =
            document.getElementById(
                "sequenceAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "sequenceCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setSequenceAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // VISUAL MATH EVENTS
    // =====================================

    bindVisualMathEvents: function () {

        const input =
            document.getElementById(
                "visualMathAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "visualMathCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setVisualMathAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // COMPARISON EVENTS
    // =====================================

    bindVisualComparisonEvents: function () {

        const buttons =
            document.querySelectorAll(
                ".visualComparisonBtn"
            );


        buttons.forEach(
            function (
                button
            ) {

                button.onclick =
                    function () {

                        const answer =
                            this.dataset.answer;


                        buttons.forEach(
                            function (
                                item
                            ) {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        this.classList.add(
                            "selected"
                        );


                        PuzzleEngine
                            .setVisualMathAnswer(
                                answer
                            );


                        PuzzleScreen
                            .checkPuzzle();

                    };

            }
        );


        this.bindResetButton();

    },


    // =====================================
    // INPUT / OUTPUT EVENTS
    // =====================================

    bindInputOutputEvents: function () {

        const input =
            document.querySelector(
                ".ioAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "ioCheckBtn"
            );


        const submit =
            function () {

                if (
                    !input
                    ||
                    input.value ===
                    ""
                ) {

                    PuzzleScreen.showMessage(
                        "لطفاً خروجی را وارد کن."
                    );


                    if (input) {

                        input.focus();

                    }


                    return;

                }


                PuzzleEngine.setGenericAnswer(
                    Number(
                        input.value
                    )
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        if (input) {

            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE ORDER EVENTS
    // =====================================

    bindSentenceOrderEvents: function () {

        const container =
            document.getElementById(
                "sentenceWords"
            );


        if (!container) {

            return;

        }


        let order =
            Array.isArray(
                PuzzleEngine.items
            )
                ? [
                    ...PuzzleEngine.items
                ]
                : [];


        const render =
            function () {

                const preview =
                    document.getElementById(
                        "sentencePreview"
                    );


                if (!preview) {

                    return;

                }


                const words =
                    PuzzleEngine.puzzle &&
                    Array.isArray(
                        PuzzleEngine.puzzle.words
                    )
                        ? PuzzleEngine.puzzle.words
                        : [];


                preview.textContent =
                    order
                        .map(
                            function (
                                index
                            ) {

                                return (
                                    words[
                                        index
                                    ] ||
                                    ""
                                );

                            }
                        )
                        .join(
                            " "
                        );

            };


        container
            .querySelectorAll(
                ".sentenceWord"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                index ===
                                0
                            ) {

                                return;

                            }


                            const temp =
                                order[
                                    index
                                ];


                            order[
                                index
                            ] =
                                order[
                                    index - 1
                                ];


                            order[
                                index - 1
                            ] =
                                temp;


                            PuzzleEngine.setTypeAnswer(
                                order
                            );


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "sentenceCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleEngine.setTypeAnswer(
                        order
                    );


                    PuzzleScreen.checkPuzzle();

                };

        }


        render();


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE GRAMMAR EVENTS
    // =====================================

    bindSentenceGrammarEvents: function () {

        const checkBtn =
            document.getElementById(
                "grammarCheckBtn"
            );


        const submit =
            function () {

                const answers =
                    Array.from(
                        document.querySelectorAll(
                            ".grammarSelect"
                        )
                    )
                        .map(
                            function (
                                select
                            ) {

                                return (
                                    select.value
                                    ||
                                    ""
                                );

                            }
                        );


                PuzzleEngine.setGenericAnswer(
                    answers
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        this.bindResetButton();

    },


    // =====================================
    // GRID EVENTS
    // =====================================

    bindGridEvents: function (
        type
    ) {

        const inputs =
            document.querySelectorAll(
                ".gridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        const index =
                            Number(
                                this.dataset.index
                            );


                        const value =
                            type ===
                            "wordGrid"

                                ?

                                this.value

                                :

                                Number(
                                    this.value
                                );


                        if (
                            type ===
                            "wordGrid"
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                        else if (
                            this.value !==
                            ""
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "gridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CROSS GRID EVENTS
    // =====================================

    bindCrossGridEvents: function () {

        const inputs =
            document.querySelectorAll(
                ".crossGridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        if (
                            this.value ===
                            ""
                        ) {

                            return;

                        }


                        const index =
                            Number(
                                this.dataset.index
                            );


                        PuzzleEngine.setCell(
                            index,
                            Number(
                                this.value
                            )
                        );

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "crossGridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CHECK
    // =====================================

    checkPuzzle: function () {

        const correct =
            PuzzleEngine.check();


        if (
            correct
        ) {

            this.showMessage(
                "آفرین! پاسخ درست است. 🎉"
            );

        }

        else {

            this.showMessage(
                "هنوز درست نیست؛ دوباره فکر کن."
            );

        }

    },


    // =====================================
    // RESET
    // =====================================

    resetPuzzle: function () {

        // A fresh round is asynchronous: ignore repeated taps until it settles.
        if (this.resetInProgress) return;

        const activity = ActivityManager.currentActivity;
        if (!activity) return;

        this.resetInProgress = true;
        const resetBtn = document.getElementById("puzzleResetBtn");
        if (resetBtn) {
            resetBtn.disabled = true;
            resetBtn.setAttribute("aria-busy", "true");
        }

        Promise.resolve(PuzzleEngine.start(activity))
            .then(function (state) {
                if (state && ActivityManager.currentActivity === activity) {
                    PuzzleScreen.show(state);
                }
            })
            .catch(function (error) {
                console.error("PuzzleScreen: Could not start a fresh round:", error);
            })
            .finally(function () {
                PuzzleScreen.resetInProgress = false;
                const currentButton = document.getElementById("puzzleResetBtn");
                if (currentButton) {
                    currentButton.disabled = false;
                    currentButton.removeAttribute("aria-busy");
                }
            });

    },


    // =====================================
    // RENDER STATE
    // =====================================

    renderState: function () {

        const state =
            PuzzleEngine.getState();


        this.show(
            state
        );

    },


    // =====================================
    // RESET BUTTON
    // =====================================

    bindResetButton: function () {

        const resetBtn =
            document.getElementById(
                "puzzleResetBtn"
            );


        if (resetBtn) {

            resetBtn.onclick =
                function () {

                    PuzzleScreen.resetPuzzle();

                };

        }

    },


    // =====================================
    // STANDARD FOOTER
    // =====================================

    renderStandardFooter: function (
        moves
    ) {

        return `

            <div
                id="puzzleMessage"
                class="puzzleMessage">
            </div>

            <div class="puzzleControls">

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

            <div class="puzzleMoves">

                تلاش:
                <span id="puzzleMoveCount">

                    ${moves || 0}

                </span>

            </div>

        `;

    },


    // =====================================
    // APP
    // =====================================

    getApp: function () {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Puzzle Screen: App Container Not Found"
            );

            return null;

        }


        return app;

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function (
        message
    ) {

        const element =
            document.getElementById(
                "puzzleMessage"
            );


        if (element) {

            element.textContent =
                message;

        }

    },


    // =====================================
    // UNSUPPORTED
    // =====================================

    showUnsupported: function (
        message
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل
                </h1>

                <p class="puzzleMessage">
                    ${PuzzleScreen.escapeHTML(
                        message
                    )}
                </p>

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

        `;


        this.bindResetButton();

    },


    valuesEqualForDisplay: function (a, b) {
        if (a === null || a === undefined || b === null || b === undefined) return a === b;
        return String(a) === String(b);
    },

    // =====================================
    // HTML ESCAPE
    // =====================================

    escapeHTML: function (
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(
            value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    },


    // =====================================
    // STYLES
    // =====================================

    injectStyles: function () {

        const oldStyle =
            document.getElementById(
                "puzzleScreenStyles"
            );


        if (oldStyle) {

            oldStyle.remove();

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "puzzleScreenStyles";


        style.textContent = `

            /* ============================= */
            /* BASE */
            /* ============================= */

            .puzzleScreen {
                text-align: center;
                padding: 20px;
            }

            .puzzleInstruction {
                font-size: 18px;
                margin-bottom: 24px;
            }

            .puzzleControls {
                display: flex;
                justify-content: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 20px;
            }

            .puzzleControls button,
            #puzzleCheckBtn,
            #sequenceCheckBtn,
            #visualMathCheckBtn,
            #ioCheckBtn,
            #sentenceCheckBtn,
            #grammarCheckBtn,
            #gridCheckBtn,
            #crossGridCheckBtn {
                padding: 12px 22px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
            }

            .puzzleMessage {
                min-height: 30px;
                margin-top: 18px;
                font-size: 18px;
            }

            .puzzleMoves {
                margin-top: 14px;
                opacity: .7;
            }

            /* ============================= */
            /* PATTERN */
            /* ============================= */

            .patternItems { display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; margin: 30px auto; }
            .patternItem, .patternOption { min-width: 70px; min-height: 70px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 14px; background: white; font-size: 28px; display: flex; align-items: center; justify-content: center; }
            .patternMissing { border-style: dashed; }
            .patternOptions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 20px auto; }
            .patternOption { cursor: pointer; }
            .patternOption.selected { border-color: #333; transform: scale(1.04); }

            /* ============================= */
            /* SPATIAL */
            /* ============================= */

            .spatialQuestion { max-width: 720px; margin: 18px auto; font-size: 20px; font-weight: bold; }
            .spatialGrid { display: grid; grid-template-columns: repeat(var(--spatial-cols), minmax(65px, 100px)); gap: 6px; justify-content: center; margin: 28px auto; width: fit-content; }
            .spatialCell { min-width: 65px; min-height: 65px; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; border-radius: 12px; background: white; font-size: 20px; font-weight: bold; }
            .spatialOptions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 22px auto; }
            .spatialOption { min-width: 100px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 12px; background: white; cursor: pointer; font-size: 17px; }
            .spatialOption.selected { border-color: #333; transform: scale(1.04); }

            .spatialDropCell {
                position: relative;
                min-width: 88px;
                min-height: 88px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #d8d8d8;
                border-radius: 14px;
                background: #fff;
                overflow: hidden;
            }

            .spatialDropCell.hasTarget {
                border-style: dashed;
            }

            .spatialTargetGhost {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 68%;
                height: 68%;
                border: 2px dashed #aaa;
                border-radius: 12px;
                opacity: .28;
                font-size: 34px;
                font-weight: bold;
                pointer-events: none;
            }

            .spatialSourceCell { background: #fafafa; }
            .spatialAxisCell { box-shadow: inset 0 0 0 2px rgba(120, 120, 120, 0.25); }
            .spatialSourcePiece { font-size: 26px; font-weight: bold; opacity: 0.9; }
            .spatialAxisLabel { margin: 10px auto 18px; text-align: center; font-size: 15px; opacity: 0.75; }
            .spatialSlotHint {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                opacity: .12;
                background: currentColor;
            }

            /* ============================= */
            /* ORDERING */
            /* ============================= */

            .puzzleItems {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 14px;
                margin: 30px 0;
            }

            .puzzleItem {
                min-width: 80px;
                min-height: 80px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
                cursor: pointer;
                font-size: 22px;
            }

            .puzzleItem.selected {
                border-color: #333;
                transform: scale(1.05);
            }

            .puzzleImageItem {
                width: 150px;
                height: 150px;
                padding: 8px;
                overflow: hidden;
            }

            .puzzleImageItem img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                pointer-events: none;
            }

            /* ============================= */
            /* SEQUENCE */
            /* ============================= */

            .sequenceItems {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 30px 0;
                font-size: 28px;
            }

            .sequenceItem,
            .sequenceMissing {
                min-width: 70px;
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 14px;
            }

            .sequenceMissing {
                border-style: dashed;
                font-weight: bold;
            }

            .sequenceAnswerArea,
            .visualMathAnswerArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 20px 0;
            }

            #sequenceAnswerInput,
            #visualMathAnswerInput {
                width: 140px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* VISUAL MATH */
            /* ============================= */

            .visualMathEquation {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 22px;
                margin: 35px auto;
                direction: ltr;
                flex-wrap: wrap;
            }

            .visualMathGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                max-width: 220px;
            }

            .visualMathImage {
                width: 65px;
                height: 65px;
                object-fit: contain;
                display: block;
                border-radius: 10px;
            }

            .visualMathOperator {
                font-size: 36px;
                font-weight: bold;
            }

            .visualMathQuestion {
                width: 70px;
                height: 70px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px dashed #999;
                border-radius: 12px;
                font-size: 32px;
                font-weight: bold;
            }

            .visualMathCountingGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 10px;
                max-width: 500px;
                margin: 35px auto;
            }

            .visualComparisonArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 25px;
                margin: 35px auto;
                flex-wrap: wrap;
            }

            .visualComparisonGroup {
                width: 240px;
                min-height: 130px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 16px;
                background: white;
            }

            .visualComparisonSeparator {
                font-size: 34px;
                font-weight: bold;
            }

            .visualComparisonChoices {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin: 25px auto;
                flex-wrap: wrap;
            }

            .visualComparisonBtn {
                min-width: 120px;
                padding: 14px 22px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 17px;
            }

            .visualComparisonBtn.selected {
                border-color: #333;
                transform: scale(1.04);
            }

            /* ============================= */
            /* INPUT OUTPUT */
            /* ============================= */

            .ioMachine {
                width: min(620px, 100%);
                margin: 30px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .ioRow {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                gap: 12px;
                padding: 14px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
            }

            .ioInputValue,
            .ioOutputValue {
                font-size: 22px;
                font-weight: bold;
            }

            .ioArrow {
                font-size: 25px;
            }

            .ioAnswerInput {
                width: 110px;
                margin: auto;
                padding: 10px;
                border: 2px dashed #999;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* SENTENCE */
            /* ============================= */

            .sentenceWords {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                margin: 30px auto;
            }

            .sentenceWord {
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 18px;
            }

            .sentencePreview {
                min-height: 55px;
                max-width: 800px;
                margin: 20px auto;
                padding: 14px;
                border: 2px dashed #aaa;
                border-radius: 12px;
                font-size: 21px;
            }

            .grammarRows {
                width: min(650px, 100%);
                margin: 25px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .grammarRow {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                align-items: center;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 12px;
            }

            .grammarWord {
                font-size: 20px;
                font-weight: bold;
            }

            .grammarSelect {
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 16px;
            }

            /* ============================= */
            /* GRID */
            /* ============================= */

            .genericGrid,
            .crossGridContainer {
                display: grid;
                grid-template-columns:
                    repeat(
                        var(--grid-cols),
                        minmax(65px, 110px)
                    );
                justify-content: center;
                gap: 5px;
                margin: 30px auto;
                width: fit-content;
                max-width: 100%;
            }

            .gridCell,
            .crossGridCell {
                min-width: 65px;
                min-height: 65px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 8px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: white;
                font-size: 22px;
                font-weight: bold;
            }

            .gridMissing,
            .crossMissingCell {
                border-style: dashed;
            }

            .gridAnswerInput,
            .crossGridAnswerInput {
                width: 80%;
                min-width: 45px;
                padding: 8px;
                border: 0;
                outline: none;
                background: transparent;
                text-align: center;
                font-size: 20px;
            }

            /* ============================= */
            /* CROSS GRID */
            /* ============================= */

            .crossOperationCell {
                background: #f4f4f4;
                font-size: 22px;
            }

            .crossBlockedCell {
                background: transparent;
                border-color: transparent;
            }

            .crossGridPaths {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px;
                margin: 18px auto;
            }

            .crossGridPathTag {
                display: inline-block;
                padding: 6px 10px;
                border-radius: 10px;
                border: 1px solid #ddd;
                font-size: 14px;
            }

            /* ============================= */
            /* MOBILE */
            /* ============================= */

            @media (
                max-width: 700px
            ) {

                .visualMathEquation {
                    gap: 12px;
                }

                .visualMathImage {
                    width: 52px;
                    height: 52px;
                }

                .gridCell,
                .crossGridCell {
                    min-width: 52px;
                    min-height: 52px;
                    font-size: 18px;
                }

                .genericGrid,
                .crossGridContainer {
                    grid-template-columns:
                        repeat(
                            var(--grid-cols),
                            minmax(48px, 75px)
                        );
                }

                .ioRow {
                    grid-template-columns: 1fr auto 1fr;
                }

                .sentencePreview {
                    font-size: 18px;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    }

};




// =====================================
// SPATIAL SYMMETRY v2 UI OVERRIDE
// =====================================
PuzzleScreen.showSpatialSymmetry = function (state) {
    // Initialize the activation timestamp when the symmetry screen is first rendered.
    // handleActivityReady resets it to 0; without this assignment the 900ms launch-gesture
    // guard compares Date.now() against 0 and is effectively disabled.
    if (!PuzzleScreen.spatialScreenActivatedAt) {
        PuzzleScreen.spatialScreenActivatedAt = Date.now();
        PuzzleScreen.spatialUserInitiatedDragAt = 0;
    }

    const app = this.getApp();
    if (!app) return;

    const grid = state.grid || {};
    const rows = Math.max(1, Number(grid.rows) || 1);
    const cols = Math.max(1, Number(grid.cols) || 1);
    const pieces = Array.isArray(state.pieces) ? state.pieces : [];
    const placements = state.placements || {};
    const sourceByCell = {};
    const placedByCell = {};

    pieces.forEach(function (piece) {
        if (piece.source) {
            sourceByCell[Number(piece.source.row) + ":" + Number(piece.source.col)] = piece;
        }
        const placement = placements[String(piece.id)];
        if (placement) {
            placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
        }
    });

    const cells = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = row + ":" + col;
            const sourcePiece = sourceByCell[key];
            const placedPiece = placedByCell[key];
            const isAxis = state.axis === "vertical"
                ? (cols % 2 === 1 && col === Math.floor(cols / 2))
                : (rows % 2 === 1 && row === Math.floor(rows / 2));

            cells.push(
                "<div class=\"spatialDropCell spatialSymmetryCell" +
                    (placedPiece ? " filled" : "") +
                    (sourcePiece ? " spatialSourceCell" : "") +
                    (isAxis ? " spatialAxisCell" : "") +
                    "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                    (sourcePiece
                        ? "<div class=\"spatialSourcePiece\">" + this.escapeHTML(sourcePiece.label || sourcePiece.id) + "</div>"
                        : placedPiece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + this.escapeHTML(placedPiece.id) + "\">" + this.escapeHTML(placedPiece.label || placedPiece.id) + "</div>"
                            : "<span class=\"spatialSlotHint\"></span>") +
                "</div>"
            );
        }
    }

    const tray = pieces.map(function (piece) {
        if (placements[String(piece.id)]) return "";
        return "<div class=\"spatialDragPiece\" data-piece-id=\"" +
            PuzzleScreen.escapeHTML(piece.id) +
            "\" tabindex=\"0\">" +
            PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
    }).join("");

    const axisText = state.axis === "horizontal" ? "افقی" : "عمودی";

    app.innerHTML =
        "<div class=\"screen puzzleScreen spatialScreen spatialSymmetryScreen\" dir=\"rtl\">" +
            "<div class=\"spatialSymmetryHeader\">" +
                "<h1>تقارن شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">شکل‌ها را در جای قرینه قرار بده.</p>" +
            "</div>" +
            "<div class=\"spatialAxisLabel\">محور تقارن: " + axisText + "</div>" +
            "<div class=\"spatialPlacementLayout\">" +
                "<div class=\"spatialBoardWrap\">" +
                    "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + ";--spatial-rows:" + rows + "\">" +
                        cells.join("") +
                    "</div>" +
                "</div>" +
                "<div class=\"spatialTray\">" +
                    "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                    "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                "</div>" +
            "</div>" +
            "<button id=\"spatialSymmetryCheckBtn\" class=\"spatialCheckButton\" type=\"button\" disabled>بررسی پاسخ</button>" +
            "<div id=\"spatialSymmetryMessage\" class=\"puzzleMessage\" role=\"status\"></div>" +
            this.renderStandardFooter(state.moves) +
        "</div>";

    const beginDrag = function (pieceElement) {
        const pieceId = pieceElement.dataset.pieceId;
        if (!pieceId) return;

        // Do not let the pointer gesture that launched the activity become
        // the first puzzle drag when the screen appears underneath it.
        if (Date.now() - PuzzleScreen.spatialScreenActivatedAt < 900) return;
        PuzzleScreen.spatialUserInitiatedDragAt = Date.now();

        const ghost = document.createElement("div");
        ghost.className = "spatialDragGhost";
        ghost.textContent = pieceElement.textContent || "";
        document.body.appendChild(ghost);

        const moveGhost = function (event) {
            ghost.style.left = (event.clientX - 28) + "px";
            ghost.style.top = (event.clientY - 28) + "px";
        };

        const cancelDrag = function () {
            document.removeEventListener("pointermove", moveGhost);
            document.removeEventListener("pointerup", finishDrag);
            document.removeEventListener("pointercancel", cancelDrag);
            ghost.remove();
        };

        const finishDrag = function (event) {
            document.removeEventListener("pointermove", moveGhost);
            document.removeEventListener("pointerup", finishDrag);
            document.removeEventListener("pointercancel", cancelDrag);
            ghost.remove();

            const target = document.elementFromPoint(event.clientX, event.clientY);
            const cell = target && target.closest
                ? target.closest(".spatialDropCell")
                : null;

            if (cell && app.contains(cell) && !cell.classList.contains("spatialSourceCell")) {
                PuzzleEngine.setTypeAnswer({
                    pieceId: pieceId,
                    row: Number(cell.dataset.row),
                    col: Number(cell.dataset.col)
                });
                PuzzleScreen.show(PuzzleEngine.getState());
            }
        };

        document.addEventListener("pointermove", moveGhost);
        document.addEventListener("pointerup", finishDrag, { once: true });
        document.addEventListener("pointercancel", cancelDrag, { once: true });
        moveGhost(event);
    };

    app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
        pieceElement.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            beginDrag(pieceElement);
        });
    });

    const checkButton = app.querySelector("#spatialSymmetryCheckBtn");
    if (checkButton) {
        // Ignore release/click events that belong to the activity-launch
        // gesture and arrive while the newly rendered puzzle is taking over.
        const screenReadyAt = Date.now();
        let userActivatedCheckAt = 0;

        checkButton.addEventListener("pointerdown", function () {
            userActivatedCheckAt = Date.now();
        });

        setTimeout(function () {
            if (!checkButton.isConnected) return;
            checkButton.disabled = !(Number(state.moves) > 0);
        }, 0);

        checkButton.addEventListener("click", function () {
            const now = Date.now();
            const pointerStartedAt = userActivatedCheckAt;
            userActivatedCheckAt = 0;

            // A check is accepted only after the screen has settled and the
            // button itself received a fresh pointerdown for this click.
            if (now - screenReadyAt < 700) return;
            if (!pointerStartedAt || pointerStartedAt < screenReadyAt ||
                now - pointerStartedAt > 1500) return;

            const currentState = PuzzleEngine.getState();
            const currentPlacements = currentState.placements || {};
            const currentPieces = currentState.pieces || [];
            if (!PuzzleScreen.spatialUserInitiatedDragAt ||
                PuzzleScreen.spatialUserInitiatedDragAt < PuzzleScreen.spatialScreenActivatedAt ||
                Number(currentState.moves) <= 0 ||
                Object.keys(currentPlacements).length === 0 ||
                currentPieces.length === 0) {
                checkButton.disabled = true;
                return;
            }

            const correct = PuzzleEngine.check();
            const message = app.querySelector("#spatialSymmetryMessage");
            if (message) {
                message.textContent = correct
                    ? "آفرین! تقارن کامل است."
                    : "هنوز درست نیست؛ شکل‌ها را جابه‌جا کن و دوباره بررسی کن.";
            }
        });
    }
};

// =====================================
// GLOBAL
// =====================================

window.PuzzleScreen =
    PuzzleScreen;


// =====================================
// INITIALIZE
// =====================================

PuzzleScreen.injectStyles();

PuzzleScreen.init();


console.log(
    "Puzzle Screen v2.6 Ready"
);