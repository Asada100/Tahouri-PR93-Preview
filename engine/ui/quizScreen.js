// =====================================
// Tahouri Edu Platform
// Version 1.1
// Quiz Screen
//
// Responsible for:
// - Quiz UI Rendering
// - Question Display
// - Score Display
// - Answer Buttons
// - Activity Ready Integration
//
// Execution remains in QuizEngine
// =====================================


const QuizScreen = {


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (
            typeof EventManager ===
            "undefined"
        ) {

            console.error(
                "Quiz Screen: EventManager Not Available"
            );

            return;

        }


        // جلوگیری از ثبت Listener تکراری
        if (
            this.activityReadyConnected
        ) {

            return;

        }


        EventManager.on(

            "activityReady",

            function (payload) {

                QuizScreen.handleActivityReady(
                    payload
                );

            }

        );


        this.activityReadyConnected =
            true;


        console.log(
            "Quiz Screen: Activity Ready Listener Connected"
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

            engineName !==
            "QuizEngine"

            &&

            engineName !==
            "quiz"

        ) {

            return;

        }


        const activity =
            payload.activity;

        const engine =
            payload.engine;

        const result =
            payload.result;


        if (!activity) {

            console.error(
                "Quiz Screen: Activity Missing"
            );

            return;

        }

        if (!engine) {

            console.error(
                "Quiz Screen: Engine Missing"
            );

            return;

        }

        if (!result) {

            console.error(
                "Quiz Screen: Question Missing"
            );

            return;

        }


        console.log(
            "Quiz Screen: Activity Ready Received",
            activity.id
        );


        this.reset();


        this.show({

            title:
                activity.title,
            activityId: activity.id,
            activityGroup: activity.group,
            score:
                ScoreManager.score,

            currentQuestion:
                engine.currentQuestion + 1,

            totalQuestions:
                engine.questions.filter(
                    question => !question.optional
                ).length,

            question:
                result

        });

    },


    // =====================================
    // SHOW
    // =====================================

    show: function (
        data
    ) {

        if (!data) {

            console.error(
                "Quiz Screen: Data Missing"
            );

            return;

        }


        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Quiz Screen: App Container Not Found"
            );

            return;

        }


        const question =
            data.question;


        if (!question) {

            console.error(
                "Quiz Screen: Question Missing"
            );

            return;

        }


        const options =
            Array.isArray(
                question.options
            )
                ?
                question.options
                :
                [
                    "زوج",
                    "فرد"
                ];


        const activityId = data.activityId || "";
        const activityGroup = data.activityGroup || "";
        const isDivisibility = /divisib|divisible/i.test(activityId + " " + activityGroup);
        const themeClass = isDivisibility ? "quizThemeDivisibility" : "quizThemeGeneral";
        const badgeIcon = isDivisibility ? "➗" : question.mode === "evenOddSum" ? "🎲" : /evenodd/i.test(activityId) ? "🔢" : "🧠";
        const subtitle = isDivisibility
            ? "ماموریت بخش‌پذیری؛ قانون را کشف کن ✨"
            : question.mode === "evenOddSum"
                ? "بازی کشف قانون عددها ✨"
                : "تمرین کن، کشف کن، پیشرفت کن ✨";
        const totalQuestions = Math.max(1, Number(data.totalQuestions) || 10);
        const currentQuestion = Math.max(1, Number(data.currentQuestion) || 1);
        const progress = question.optional ? 100 : Math.min(100, Math.round((currentQuestion / totalQuestions) * 100));

        app.innerHTML = `

            <div class="quizScreen quizGameBoard ${themeClass}" dir="rtl">
                <div class="gameMasthead">
                    <div class="gameBrand">
                        <div class="gameBadge" aria-hidden="true">${badgeIcon}</div>
                        <div>
                            <h1>پلتفرم آموزشی طهوری</h1>
                            <p>${subtitle}</p>
                        </div>
                    </div>
                    <div class="gameScore" aria-live="polite">⭐ ${data.score || 0} امتیاز</div>
                </div>

                <h2 class="gameTitle">${data.title || "آزمون"}</h2>

                <div class="gameProgress">
                    <div class="gameProgressLabels">
                        <span>${question.optional ? "مرحلهٔ جایزه‌ای" : "مرحلهٔ " + currentQuestion + " از " + totalQuestions}</span>
                        <span>${question.optional ? "چالش ویژه" : isDivisibility ? "قانون بخش‌پذیری را پیدا کن!" : "در مسیر یادگیری!"}</span>
                    </div>
                    <div class="gameProgressTrack" role="progressbar" aria-label="پیشرفت بازی" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                        <div class="gameProgressFill" style="width:${progress}%"></div>
                    </div>
                </div>

                <div class="questionBox">
                    ${question.optional
                        ? "چالش اختیاری — بدون امتیاز"
                        : question.mode === "evenOddSum" ? "🧩 معمای عددی" : isDivisibility ? "➗ چالش بخش‌پذیری" : "🎯 سؤال " + currentQuestion + " از " + totalQuestions}
                </div>

                <h2 class="quizQuestion">${question.text || ""}</h2>

                <div id="quizOptions" class="quizOptions">
                    ${options.map(function (option) {
                        return `
                            <button class="quizOptionBtn" data-option="${String(option)}" type="button">
                                ${option}
                            </button>
                        `;
                    }).join("")}
                </div>

                ${question.optional ? `
                    <button id="skipOptionalChallenge" class="quizOptionBtn" type="button">
                        فعلاً از این چالش می‌گذرم
                    </button>
                ` : ""}

                <div id="messageBox" class="quizMessage" aria-live="polite"></div>
            </div>

        `;

        this.bindEvents();

    },


    // =====================================
    // BIND EVENTS
    // =====================================

    bindEvents: function () {

        const buttons =
            document.querySelectorAll(
                ".quizOptionBtn"
            );

        if (!buttons.length) {

            console.warn(
                "Quiz Screen: No Option Buttons Found"
            );

            return;

        }

        buttons.forEach(
            function (button) {

                button.onclick =
                    function () {

                        const answer =
                            this.dataset.option;

                        QuizScreen.answer(
                            answer
                        );

                    };

            }
        );

        const skipButton =
            document.getElementById("skipOptionalChallenge");

        if (skipButton) {
            skipButton.onclick = function () {
                QuizScreen.skipOptionalChallenge();
            };
        }

        console.log(
            "Quiz Screen Buttons Connected:",
            buttons.length
        );

    },


    // =====================================
    // ANSWER
    // =====================================

    answer: function (
        answer
    ) {

        if (
            this.isLocked
        ) {

            return;

        }

        this.isLocked =
            true;

        const buttons =
            document.querySelectorAll(
                ".quizOptionBtn"
            );

        buttons.forEach(
            function (button) {
                button.disabled = true;
            }
        );

        const question =
            QuizEngine.getQuestion();

        const correct =
            QuizEngine.checkAnswer(
                answer
            );

        let delay = 1200;

        if (correct) {
            this.showMessage(
                question && question.optional
                    ? "✅ درست است! این چالش اختیاری بود و امتیاز را تغییر نمی‌دهد."
                    : "✅ آفرین! پاسخ درست است.",
                question && question.optional ? "learning" : "correct"
            );
        }
        else {
            const explanation =
                question && question.explanation
                    ? question.explanation
                    : "قانون جمع را به یاد بیاور: زوج + زوج = زوج، فرد + فرد = زوج، و زوج + فرد = فرد.";

            this.showMessage(
                "اشکالی ندارد؛ با هم یاد می‌گیریم. " + explanation,
                "learning"
            );

            if (question && question.mode === "evenOddSum") {
                // Let the student use the explanation and try again without losing points.
                buttons.forEach(function (button) {
                    button.disabled = false;
                });
                this.isLocked = false;
                return;
            }

            delay = 2800;
        }

        setTimeout(
            function () {
                QuizScreen.next();
            },
            delay
        );

    },


    // =====================================
    // SKIP OPTIONAL CHALLENGE
    // =====================================

    skipOptionalChallenge: function () {
        const question = QuizEngine.getQuestion();
        if (!question || !question.optional || this.isLocked) {
            return;
        }

        this.isLocked = true;
        const buttons = document.querySelectorAll(".quizOptionBtn");
        buttons.forEach(function (button) {
            button.disabled = true;
        });

        this.showMessage(
            "چالش رد شد؛ امتیازی کم نمی‌شود.",
            "learning"
        );

        setTimeout(function () {
            QuizScreen.next();
        }, 600);
    },


    // =====================================
    // NEXT
    // =====================================

    next: function () {

        const nextQuestion =
            QuizEngine.next();

        if (nextQuestion) {

            const activity =
                QuizEngine.activity;

            this.isLocked =
                false;

            this.show({
                title:
                    activity
                        ? activity.title
                        : "آزمون",
                activityId: activity ? activity.id : "",
                activityGroup: activity ? activity.group : "",
                score:
                    ScoreManager.score,
                currentQuestion:
                    QuizEngine.currentQuestion + 1,
                totalQuestions:
                    QuizEngine.questions.filter(
                        question => !question.optional
                    ).length,
                question:
                    nextQuestion
            });

            return;

        }

        this.isLocked =
            false;

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function (
        message,
        type
    ) {

        const box =
            document.getElementById(
                "messageBox"
            );

        if (!box) {
            return;
        }

        box.textContent =
            message;

        box.className =
            "quizMessage " +
            (type || "");

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {
        this.isLocked = false;
    },


    // =====================================
    // STATE
    // =====================================

    isLocked:
        false,

    activityReadyConnected:
        false

};


// =====================================
// GLOBAL
// =====================================

window.QuizScreen =
QuizScreen;


// =====================================
// CONNECT EVENT
// =====================================

QuizScreen.init();


// =====================================
// READY
// =====================================

console.log(
    "Quiz Screen v1.1 Ready"
);