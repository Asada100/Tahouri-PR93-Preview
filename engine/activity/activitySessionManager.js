// Activity Session Manager v1.8
// Stable session lifecycle and engine-level restore.
// Completion cleanup is performed by ActivityLifecycle after completion data is processed.
const ActivitySessionManager = {
    BASE_KEY: "Tahouri_ActivitySession",
    VERSION: "1.9",
    currentSession: null,
    exitControlId: "activitySessionControl",
    overlayId: "activitySessionOverlay",
    gameplayActive: false,
    initialized: false,
    restoringSession: false,

    storageKey() {
        return typeof ProfileContext !== "undefined" && typeof ProfileContext.key === "function"
            ? ProfileContext.key(this.BASE_KEY)
            : null;
    },

    load(activityId) {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined") return null;

        const session = SaveManager.load(key);
        if (!session || !session.activityId) return null;

        if (activityId && session.activityId !== activityId) return null;

        // Discard broken empty Classification sessions created before content
        // was loaded correctly. They cannot be restored safely.
        if (
            (session.activityType === "classification" || session.activityType === "ClassificationEngine") &&
            session.engineState &&
            Array.isArray(session.engineState.items) &&
            Array.isArray(session.engineState.categories) &&
            (session.engineState.items.length === 0 || session.engineState.categories.length === 0)
        ) {
            console.warn("ActivitySessionManager: Ignoring invalid empty classification session", session.activityId);
            SaveManager.remove(key);
            this.currentSession = null;
            return null;
        }

        this.currentSession = session;
        return session;
    },

    save(session) {
        const key = this.storageKey();
        if (!key || typeof SaveManager === "undefined" || !session) return false;

        session.version = this.VERSION;
        session.updatedAt = Date.now();

        const ok = SaveManager.save(key, session);
        if (ok) this.currentSession = session;
        return ok;
    },

    clear() {
        const key = this.storageKey();
        if (key && typeof SaveManager !== "undefined") SaveManager.remove(key);
        this.currentSession = null;
        this.restoringSession = false;
    },

    getEngine(name) {
        if (typeof EngineManager === "undefined") return null;
        try {
            return EngineManager.getEngine(name);
        } catch (error) {
            console.error("ActivitySessionManager engine error", error);
            return null;
        }
    },

    type(activity) {
        return activity ? (activity.engine || activity.type || null) : null;
    },

    snapshot(activity) {
        const engineName = this.type(activity);
        const engine = this.getEngine(engineName);
        if (!engine) return null;

        if (engineName === "DictationEngine" || engineName === "dictation") {
            if (typeof engine.getSessionState === "function") {
                const state = engine.getSessionState();
                if (!state) return null;
                return {
                    kind: "dictation",
                    activity: engine.activity || activity,
                    content: engine.content ? JSON.parse(JSON.stringify(engine.content)) : null,
                    state: JSON.parse(JSON.stringify(state))
                };
            }
            return null;
        }

        if (typeof engine.getSessionState === "function") {
            return engine.getSessionState();
        }

        if (engineName === "QuizEngine" || engineName === "quiz") {
            return {
                kind: "quiz",
                activity: engine.activity || activity,
                state: { ...(engine.state || {}) },
                questions: Array.isArray(engine.questions) ? JSON.parse(JSON.stringify(engine.questions)) : [],
                currentQuestion: Number(engine.currentQuestion || 0),
                score: Number(typeof ScoreManager !== "undefined" ? ScoreManager.score || 0 : 0),
                correct: Number(typeof ScoreManager !== "undefined" ? ScoreManager.correct || 0 : 0),
                wrong: Number(typeof ScoreManager !== "undefined" ? ScoreManager.wrong || 0 : 0)
            };
        }

        if (engineName === "MemoryEngine" || engineName === "memory") {
            return {
                kind: "memory",
                activity: engine.activity || activity,
                cards: Array.isArray(engine.cards) ? JSON.parse(JSON.stringify(engine.cards)) : [],
                matchedPairs: Number(engine.matchedPairs || 0),
                moves: Number(engine.moves || 0),
                totalPairs: Number(engine.totalPairs || 0),
                finished: !!engine.finished,
                score: Number(typeof ScoreManager !== "undefined" ? ScoreManager.score || 0 : 0),
                correct: Number(typeof ScoreManager !== "undefined" ? ScoreManager.correct || 0 : 0),
                wrong: Number(typeof ScoreManager !== "undefined" ? ScoreManager.wrong || 0 : 0)
            };
        }

        if (engineName === "PuzzleEngine" || engineName === "puzzle") {
            return {
                kind: "puzzle",
                activity: engine.activity || activity,
                state: { ...(engine.state || {}) },
                puzzle: engine.puzzle ? JSON.parse(JSON.stringify(engine.puzzle)) : null,
                items: Array.isArray(engine.items) ? JSON.parse(JSON.stringify(engine.items)) : [],
                userAnswer: engine.userAnswer,
                moves: Number(engine.moves || 0)
            };
        }

        return null;
    },

    begin(activity) {
        if (!activity || !activity.id) return null;

        // Never replace an active session for the same activity. This is
        // important because ActivityManager emits activityReady after the
        // engine starts; that event must not create a second session.
        if (
            this.currentSession &&
            this.currentSession.activityId === activity.id &&
            this.currentSession.status === "active"
        ) {
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            return this.currentSession;
        }

        const old = this.load(activity.id);
        if (old && old.activityId === activity.id && old.status === "resumable") {
            return old;
        }

        const session = {
            version: this.VERSION,
            id: "activity-session-" + activity.id + "-" + Date.now(),
            profileId:
                typeof ProfileContext !== "undefined" && typeof ProfileContext.getStudentId === "function"
                    ? ProfileContext.getStudentId()
                    : null,
            activityId: activity.id,
            activityType: this.type(activity),
            status: "active",
            startedAt: Date.now(),
            updatedAt: Date.now(),
            engineState: null
        };

        this.currentSession = session;
        this.save(session);
        this.gameplayActive = true;
        document.body.classList.add("activity-playing");
        return session;
    },

    capture(status) {
        const activity = typeof ActivityManager !== "undefined" ? ActivityManager.getCurrent() : null;
        if (!activity || !activity.id) return false;

        let session = this.currentSession;
        if (!session || session.activityId !== activity.id) session = this.begin(activity);

        const state = this.snapshot(activity);
        if (!state) return false;

        session.activityId = activity.id;
        session.activityType = this.type(activity);
        session.engineState = state;
        session.status = status || "resumable";

        return this.save(session);
    },

    exit() {
        if (!this.capture("resumable")) return false;

        this.gameplayActive = false;
        document.body.classList.remove("activity-playing");
        this.hideOverlay();
        this.removeExitControl();

        if (typeof ActivityManager !== "undefined" && typeof ActivityManager.resetRuntime === "function") {
            ActivityManager.resetRuntime();
        }

        EventManager.emit("activityExited", this.currentSession);

        // Return directly to the dashboard through the platform navigation
        // controller so the dashboard history and active navigation stay in sync.
        if (typeof Navigation !== "undefined" && typeof Navigation.openDashboard === "function") {
            Navigation.openDashboard();
        } else if (typeof DashboardController !== "undefined" && typeof DashboardController.open === "function") {
            DashboardController.open();
        } else if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
            Screen.showHome();
        } else if (typeof App !== "undefined" && typeof App.goHome === "function") {
            App.goHome();
        }

        return true;
    },

    getResumable(activityId) {
        const session = this.load();
        if (!session || session.status !== "resumable" || !session.engineState) return null;
        if (activityId && session.activityId !== activityId) return null;
        return session;
    },

    async resume(activityId) {
        const session = this.getResumable(activityId);
        if (!session) return false;

        if (typeof App === "undefined" || typeof App.resolveActivityById !== "function") {
            return false;
        }

        const activity = App.resolveActivityById(session.activityId);
        if (!activity) {
            this.clear();
            return false;
        }

        // Mark the session as the active restore target before touching the
        // engine. This prevents lifecycle events from replacing it.
        this.currentSession = session;
        this.restoringSession = true;

        try {
            const restored = await this.restoreEngine(activity, session);
            if (!restored) return false;

            session.status = "active";
            this.save(session);
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            this.installExitControl();
            EventManager.emit("activityResumed", session);

            console.log("ActivitySessionManager: Session restored", {
                activityId: session.activityId,
                activityType: session.activityType
            });

            return true;
        } finally {
            this.restoringSession = false;
        }
    },

    async restoreEngine(activity, session) {
        const data = session && session.engineState;
        const engineName = (session && session.activityType) || this.type(activity);
        const engine = this.getEngine(engineName);

        if (!engine || !data) return false;

        // Restore never calls engine.start(). The engine must receive the
        // saved state directly; calling start() would reset progress to zero.
        ActivityManager.currentActivity = activity;
        ActivityState.set("started");
        ActivityState.set("playing");

        if (data.kind === "dictation" && (engineName === "DictationEngine" || engineName === "dictation")) {
            if (!data.state || typeof engine.restoreSession !== "function") return false;

            engine.activity = data.activity || activity;
            engine.content = data.content
                ? JSON.parse(JSON.stringify(data.content))
                : (typeof DictationProvider !== "undefined" && typeof DictationProvider.getContent === "function"
                    ? DictationProvider.getContent(engine.activity)
                    : null);

            if (!engine.content || !Array.isArray(engine.content.questions) || !engine.content.questions.length) {
                return false;
            }

            if (!engine.restoreSession(data.state)) return false;

            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            document.body.classList.add("activity-playing");

            if (typeof DictationScreen !== "undefined" && typeof DictationScreen.render === "function") {
                DictationScreen.render(engine.getState());
            }

            console.log("ActivitySessionManager: Dictation session restored", {
                activityId: activity.id,
                question: Number(engine.state.currentIndex || 0) + 1,
                totalQuestions: Number(engine.state.totalQuestions || 0)
            });
            return true;
        }

        if (data.kind === "wordPuzzle" && (engineName === "WordPuzzleEngine" || engineName === "wordPuzzle")) {
            if (typeof engine.restoreSession !== "function") return false;
            if (!engine.restoreSession(data)) return false;
            ActivityManager.currentActivity = activity;
            ActivityState.set("started");
            ActivityState.set("playing");
            document.body.classList.add("activity-playing");
            return true;
        }

        if (data.kind === "quiz" && (engineName === "QuizEngine" || engineName === "quiz")) {
            engine.activity = data.activity || activity;
            engine.questions = Array.isArray(data.questions) ? JSON.parse(JSON.stringify(data.questions)) : [];
            engine.currentQuestion = Number(data.currentQuestion || 0);
            engine.state = { ...(data.state || {}), started: true, isFinished: false };

            if (typeof ScoreManager !== "undefined") {
                ScoreManager.score = Number(data.score || 0);
                ScoreManager.correct = Number(data.correct || 0);
                ScoreManager.wrong = Number(data.wrong || 0);
            }

            const question = typeof engine.getQuestion === "function" ? engine.getQuestion() : null;
            if (question && typeof QuizScreen !== "undefined" && typeof QuizScreen.show === "function") {
                QuizScreen.reset();
                QuizScreen.show({
                    title: activity.title,
                    score: ScoreManager.score,
                    currentQuestion: engine.currentQuestion + 1,
                    totalQuestions: engine.questions.length,
                    question
                });
            }
            return true;
        }

        if (data.kind === "memory" && (engineName === "MemoryEngine" || engineName === "memory")) {
            engine.activity = data.activity || activity;
            engine.cards = Array.isArray(data.cards) ? JSON.parse(JSON.stringify(data.cards)) : [];
            engine.firstCard = null;
            engine.secondCard = null;
            engine.lockBoard = false;
            engine.matchedPairs = Number(data.matchedPairs || 0);
            engine.moves = Number(data.moves || 0);
            engine.totalPairs = Number(data.totalPairs || 0);
            engine.finished = false;

            if (typeof ScoreManager !== "undefined") {
                ScoreManager.score = Number(data.score || 0);
                ScoreManager.correct = Number(data.correct || 0);
                ScoreManager.wrong = Number(data.wrong || 0);
            }

            if (typeof MemoryScreen !== "undefined" && typeof MemoryScreen.show === "function") {
                MemoryScreen.show({ title: activity.title || "بازی حافظه", cards: engine.cards });
            }
            return true;
        }

        if (data.kind === "puzzle" && (engineName === "PuzzleEngine" || engineName === "puzzle")) {
            engine.activity = data.activity || activity;
            engine.state = { ...(data.state || {}), started: true, isFinished: false };
            engine.puzzle = data.puzzle ? JSON.parse(JSON.stringify(data.puzzle)) : null;
            // Reconcile persisted Jigsaw state with the current activity definition.
            // Older sessions may contain the old nested { content: { image, rows, cols } }
            // shape, so the saved session must not override the current asset definition.
            if (engine.puzzle && engine.puzzle.type === "jigsaw" && activity.puzzle) {
                const currentPuzzle = activity.puzzle;
                const currentContent = currentPuzzle.content || {};
                const currentImage = currentPuzzle.image || currentContent.image;
                const currentRows = currentPuzzle.rows || currentContent.rows;
                const currentCols = currentPuzzle.cols || currentContent.cols;
                if (currentImage) engine.puzzle.image = currentImage;
                if (currentRows) engine.puzzle.rows = currentRows;
                if (currentCols) engine.puzzle.cols = currentCols;
            }
            engine.items = Array.isArray(data.items) ? JSON.parse(JSON.stringify(data.items)) : [];
            engine.userAnswer = data.userAnswer;
            engine.moves = Number(data.moves || 0);

            // Rebuild the in-memory Jigsaw core from the restored PuzzleEngine state
            // before rendering. Without this, the board is visible but move/reset
            // operations have no Jigsaw core state to operate on.
            if (engine.puzzle && engine.puzzle.type === "jigsaw" && typeof JigsawPuzzle !== "undefined" && typeof JigsawPuzzle.restoreFromEngine === "function") {
                JigsawPuzzle.restoreFromEngine();
            }

            if (typeof PuzzleScreen !== "undefined" && typeof PuzzleScreen.show === "function") {
                PuzzleScreen.show(engine.getState());
            }
            return true;
        }

        if (engineName === "classification" || engineName === "ClassificationEngine") {
            if (typeof engine.restoreSession !== "function") return false;
            if (!Array.isArray(data.items) || !Array.isArray(data.categories)) return false;
            if (data.items.length === 0 || data.categories.length === 0) return false;

            const fullActivity =
                typeof ActivityManager !== "undefined" && typeof ActivityManager.loadActivityConfig === "function"
                    ? await ActivityManager.loadActivityConfig(activity)
                    : activity;

            if (!fullActivity || !fullActivity.classification) return false;

            ActivityManager.currentActivity = fullActivity;
            engine.activityData = fullActivity;

            // ClassificationEngine.restoreSession() is the only operation
            // that reconstructs the saved classification state. Do not call
            // ClassificationEngine.start() on this path.
            if (!engine.restoreSession(data)) return false;

            if (typeof ClassificationScreen !== "undefined" && typeof ClassificationScreen.show === "function") {
                ClassificationScreen.currentActivity = fullActivity;
                ClassificationScreen.currentState = engine.getState();
                ClassificationScreen.lastMessage = "";
                ClassificationScreen.show(engine.getState());
            }

            return true;
        }

        return false;
    },

    complete() {
        this.clear();
        this.gameplayActive = false;
        document.body.classList.remove("activity-playing");
        document.body.classList.remove("activity-result-open");
        this.hideOverlay();
        this.removeExitControl();
    },

    installExitControl() {
        this.removeExitControl();
        if (!this.gameplayActive) return;

        const button = document.createElement("button");
        button.id = this.exitControlId;
        button.type = "button";
        button.textContent = "☰";
        button.title = "مکث و خروج";
        button.setAttribute("aria-label", "مکث و خروج از فعالیت");
        button.onclick = () => this.showOverlay();
        document.body.appendChild(button);
    },

    removeExitControl() {
        const button = document.getElementById(this.exitControlId);
        if (button) button.remove();
    },

    showOverlay() {
        const saved = this.capture("resumable");
        this.hideOverlay();

        const overlay = document.createElement("div");
        overlay.id = this.overlayId;
        overlay.dir = "rtl";

        const box = document.createElement("div");
        box.className = "activityRuntimeModal";
        box.innerHTML = '<h2>فعالیت متوقف شد</h2><p>' + (saved ? 'وضعیت فعلی ذخیره شد.' : 'ذخیره خودکار این بازی در دسترس نیست؛ می‌توانید به فعالیت‌ها برگردید.') + '</p><div class="activityRuntimeActions"><button id="activitySessionResumeBtn" type="button">ادامه فعالیت</button><button id="activitySessionExitBtn" type="button">' + (saved ? 'خروج و ذخیره' : 'خروج') + '</button></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const resumeButton = document.getElementById("activitySessionResumeBtn");
        const exitButton = document.getElementById("activitySessionExitBtn");

        if (resumeButton) resumeButton.onclick = () => this.hideOverlay();
        if (exitButton) exitButton.onclick = () => this.exit();
    },

    hideOverlay() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    },

    connect() {
        if (this.initialized) return;
        this.initialized = true;

        EventManager.on("activityReady", payload => {
            if (!payload || !payload.activity) return;

            // A restore path does not need a new session. More importantly,
            // never replace a restored session with a fresh one on lifecycle
            // events.
            if (this.restoringSession) {
                console.log("ActivitySessionManager: activityReady ignored during session restore");
                return;
            }

            this.begin(payload.activity);
            this.gameplayActive = true;
            document.body.classList.add("activity-playing");
            this.installExitControl();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden" && this.gameplayActive) {
                this.capture("resumable");
            }
        });

        window.addEventListener("beforeunload", () => {
            if (this.gameplayActive) this.capture("resumable");
        });

        console.log("Activity Session Manager v1.9 Ready");
    }
};

window.ActivitySessionManager = ActivitySessionManager;
ActivitySessionManager.connect();