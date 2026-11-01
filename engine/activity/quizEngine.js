// =====================================
// Tahouri Edu Platform
// Version 5.0
// Quiz Engine
// Execution Only
// Question Provider Integration
// =====================================


const QuizEngine = {


    // =====================================
    // State
    // =====================================

    state: {

        started: false,

        isFinished: false

    },


    // =====================================
    // Current Activity
    // =====================================

    activity: null,


    // =====================================
    // Questions
    // =====================================

    questions: [],


    currentQuestion: 0,


    // =====================================
    // Init
    // =====================================

    init: function(){

        this.state.started =
            false;


        this.state.isFinished =
            false;

    },


    // =====================================
    // Start
    // =====================================

    start: async function(activityData){

        console.log(
            "Activity Data:",
            activityData
        );


        console.log(
            "Activity Settings:",
            activityData.settings
        );


        this.activity =
            activityData;


        this.state.started =
            true;


        this.state.isFinished =
            false;


        // =====================================
        // Get Questions
        // =====================================

        if(
            typeof QuestionProvider ===
            "undefined"
        ){

            console.error(
                "QuestionProvider Not Available"
            );


            this.state.started =
                false;


            return null;

        }


        this.questions =
            await QuestionProvider.getQuestions(
                activityData
            );

        // Optional concept challenge appears after the 10 scored practice questions.
        // It is not included in the round score and can be skipped without penalty.
        if (
            activityData.settings &&
            activityData.settings.mode === "evenOddSum" &&
            activityData.settings.optionalChallenge === true &&
            Array.isArray(this.questions)
        ) {
            this.questions.push({
                type: "quiz",
                mode: "evenOddSum",
                optional: true,
                text: "چالش اختیاری: آیا می‌توان سه عدد فرد پیدا کرد که مجموعشان ۲۶ شود؟",
                answer: "خیر",
                options: ["بله", "خیر"],
                explanation: "سه عدد فرد همیشه مجموعی فرد دارند، اما ۲۶ زوج است؛ پس چنین سه عددی وجود ندارد."
            });
        }


        // =====================================
        // Validate Questions
        // =====================================

        if(

            !Array.isArray(
                this.questions
            )

            ||

            this.questions.length === 0

        ){

            console.error(
                "QuizEngine: No Questions Available"
            );


            this.state.started =
                false;


            return null;

        }


        console.log(
            "Quiz Questions Ready:",
            this.questions.length
        );


        // =====================================
        // Start Position
        // =====================================

        this.currentQuestion =
            0;


        ScoreManager.reset();


        console.log(
            "Quiz Started:",
            activityData.id
        );


        // =====================================
        // Events
        // =====================================

        EventManager.emit(
            "activityStarted",
            activityData
        );


        EventManager.emit(
            "activityPlaying"
        );


        // =====================================
        // First Question
        // =====================================

        return this.getQuestion();

    },


    // =====================================
    // Get Question
    // =====================================

    getQuestion: function(){

        return this.questions[
            this.currentQuestion
        ];

    },


    // =====================================
    // Check Answer
    // =====================================

    checkAnswer: function(answer){

        const question =
            this.getQuestion();


        if(!question){

            return false;

        }


        if (question.optional) {
            const optionalCorrect = answer === question.answer;
            EventManager.emit(
                optionalCorrect ? "answer:correct" : "answer:wrong",
                question
            );
            return optionalCorrect;
        }


        if(
            answer ===
            question.answer
        ){

            ScoreManager.addCorrect();


            console.log(
                "Correct Answer"
            );


            EventManager.emit(
                "answer:correct",
                question
            );


            return true;

        }


        // In even/odd sum practice, an incorrect attempt triggers guidance and retry,
        // not a score penalty. Other quiz modes keep their existing scoring behavior.
        if (question.mode !== "evenOddSum") {
            ScoreManager.addWrong();
        }


        console.log(
            "Wrong Answer"
        );


        EventManager.emit(
            "answer:wrong",
            question
        );


        return false;

    },


    // =====================================
    // Next Question
    // =====================================

    next: function(){

        this.currentQuestion++;


        if(

            this.currentQuestion >=
            this.questions.length

        ){

            this.finish();


            return null;

        }


        return this.getQuestion();

    },


    // =====================================
    // Finish
    // =====================================

    finish: function(){

        this.state.isFinished =
            true;


        console.log(
            "Quiz Finished"
        );


        const rawResult =
            this.getResult();


        const result =
            ActivityResult.create({

                activityId:

                    this.activity
                    ?
                    this.activity.id
                    :
                    null,

                score:
                    rawResult.score,

                totalQuestions:
                    rawResult.totalQuestions,

                correctAnswers:
                    rawResult.correctAnswers,

                wrongAnswers:
                    rawResult.wrongAnswers,

                correct:
                    rawResult.correctAnswers,

                wrong:
                    rawResult.wrongAnswers,

                percentage:
                    rawResult.percentage,

                message:
                    "🎉 آزمون تمام شد"

            });


        EventManager.emit(
            "activityFinished",
            result
        );

    },


    // =====================================
    // Reset
    // =====================================

    reset: function(){

        this.state.started =
            false;


        this.state.isFinished =
            false;


        this.activity =
            null;


        this.questions =
            [];


        this.currentQuestion =
            0;


        ScoreManager.reset();

    },


    // =====================================
    // Result
    // =====================================

    getResult: function(){

        const total =
            this.questions.filter(
                question => !question.optional
            ).length;


        const result =
            ScoreManager.getResult(
                total
            );


        return {

            score:
                result.score || 0,

            totalQuestions:
                total,

            correctAnswers:
                result.correct || 0,

            wrongAnswers:
                result.wrong || 0,

            percentage:
                result.percentage || 0

        };

    }

};


// =====================================
// Global Access
// =====================================

window.QuizEngine =
    QuizEngine;


// =====================================
// Ready
// =====================================

console.log(
    "Quiz Engine Ready"
);