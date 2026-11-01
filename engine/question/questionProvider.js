// =====================================
// Tahouri Edu Platform
// Version 5.0
// Question Provider Facade
//
// Architecture:
//
// QuizEngine
//      ↓
// QuestionProvider
//      ↓
// QuizProvider
//
// MemoryEngine
//      ↓
// QuestionProvider
//      ↓
// MemoryProvider
//
// PuzzleEngine
//      ↓
// QuestionProvider
//      ↓
// PuzzleProvider
//
// Responsibilities:
// - Public API compatibility
// - Provider delegation
// - Content type detection
// - Last source tracking
// - Last content tracking
//
// IMPORTANT:
// Existing Engine APIs are preserved:
//
// QuestionProvider.getQuestions()
// QuestionProvider.getPuzzleQuestions()
// QuestionProvider.getMemoryCards()
// QuestionProvider.getContent()
//
// No educational generation logic belongs here.
// =====================================


const QuestionProvider = {


    // =====================================
    // STATE
    // =====================================

    lastSource:
        null,

    lastQuestions:
        [],


    // =====================================
    // QUIZ
    // =====================================
    //
    // Public API preserved.
    //
    // QuizEngine continues to call:
    //
    // QuestionProvider.getQuestions()
    //
    // =====================================

    getQuestions: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "QuestionProvider: Activity Data Missing"
            );

            return [];

        }


        if (

            typeof QuizProvider !==
            "undefined"

            &&

            typeof QuizProvider.getQuestions ===
            "function"

        ) {

            console.log(
                "QuestionProvider: Delegating to QuizProvider"
            );


            try {

                const questions =
                    await QuizProvider.getQuestions(
                        activityData
                    );


                this.lastSource =

                    typeof QuizProvider.getLastSource ===
                    "function"

                        ?

                        QuizProvider.getLastSource()

                        :

                        null;


                this.lastQuestions =

                    Array.isArray(
                        questions
                    )

                        ?

                        questions

                        :

                        [];


                console.log(
                    "QuestionProvider: QuizProvider Returned:",
                    this.lastQuestions.length
                );


                return this.lastQuestions;

            }

            catch (
                error
            ) {

                console.error(
                    "QuestionProvider: QuizProvider Error:",
                    error
                );


                this.lastSource =
                    null;


                this.lastQuestions =
                    [];


                return [];

            }

        }


        console.error(
            "QuestionProvider: QuizProvider Not Available"
        );


        return [];

    },


    // =====================================
    // PUZZLE
    // =====================================
    //
    // Public API preserved.
    //
    // PuzzleEngine continues to call:
    //
    // QuestionProvider.getPuzzleQuestions()
    //
    // =====================================

    getPuzzleQuestions: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "QuestionProvider: Puzzle Activity Missing"
            );

            return [];

        }


        if (

            typeof PuzzleProvider !==
            "undefined"

            &&

            typeof PuzzleProvider.getPuzzleQuestions ===
            "function"

        ) {

            console.log(
                "QuestionProvider: Delegating to PuzzleProvider"
            );


            try {

                const questions =
                    await PuzzleProvider.getPuzzleQuestions(
                        activityData
                    );


                this.lastSource =

                    typeof PuzzleProvider.getLastSource ===
                    "function"

                        ?

                        PuzzleProvider.getLastSource()

                        :

                        null;


                this.lastQuestions =

                    Array.isArray(
                        questions
                    )

                        ?

                        questions

                        :

                        [];


                console.log(
                    "QuestionProvider: PuzzleProvider Returned:",
                    this.lastQuestions.length
                );


                return this.lastQuestions;

            }

            catch (
                error
            ) {

                console.error(
                    "QuestionProvider: PuzzleProvider Error:",
                    error
                );


                this.lastSource =
                    null;


                this.lastQuestions =
                    [];


                return [];

            }

        }


        console.error(
            "QuestionProvider: PuzzleProvider Not Available"
        );


        return [];

    },


    // =====================================
    // MEMORY
    // =====================================
    //
    // Public API preserved.
    //
    // MemoryEngine continues to call:
    //
    // QuestionProvider.getMemoryCards()
    //
    // =====================================

    getMemoryCards: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "QuestionProvider: Memory Activity Missing"
            );

            return [];

        }


        if (

            typeof MemoryProvider !==
            "undefined"

            &&

            typeof MemoryProvider.getMemoryCards ===
            "function"

        ) {

            console.log(
                "QuestionProvider: Delegating to MemoryProvider"
            );


            try {

                const cards =
                    await MemoryProvider.getMemoryCards(
                        activityData
                    );


                this.lastSource =

                    typeof MemoryProvider.getLastSource ===
                    "function"

                        ?

                        MemoryProvider.getLastSource()

                        :

                        null;


                this.lastQuestions =

                    Array.isArray(
                        cards
                    )

                        ?

                        cards

                        :

                        [];


                console.log(
                    "QuestionProvider: MemoryProvider Returned:",
                    this.lastQuestions.length
                );


                return this.lastQuestions;

            }

            catch (
                error
            ) {

                console.error(
                    "QuestionProvider: MemoryProvider Error:",
                    error
                );


                this.lastSource =
                    null;


                this.lastQuestions =
                    [];


                return [];

            }

        }


        console.error(
            "QuestionProvider: MemoryProvider Not Available"
        );


        return [];

    },


    // =====================================
    // UNIFIED CONTENT API
    // =====================================
    //
    // Preserves:
    //
    // QuestionProvider.getContent()
    //
    // =====================================

    getContent: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "QuestionProvider: Activity Data Missing"
            );

            return [];

        }


        const engine =
            activityData.engine ||
            activityData.type ||
            "";


        // =================================
        // QUIZ
        // =================================

        if (

            engine === "quiz"

            ||

            engine === "QuizEngine"

        ) {

            return this.getQuestions(
                activityData
            );

        }


        // =================================
        // PUZZLE
        // =================================

        if (

            engine === "puzzle"

            ||

            engine === "PuzzleEngine"

        ) {

            return this.getPuzzleQuestions(
                activityData
            );

        }


        // =================================
        // MEMORY
        // =================================

        if (

            engine === "memory"

            ||

            engine === "MemoryEngine"

        ) {

            const cards =
                await this.getMemoryCards(
                    activityData
                );


            return [

                {

                    type:
                        "memory",

                    dataType:

                        cards.length > 0

                            ?

                            (
                                cards[0].dataType ||
                                "text"
                            )

                            :

                            "text",

                    source:
                        this.lastSource ||

                        "file",

                    cards:
                        cards

                }

            ];

        }


        // =================================
        // AUTO DETECTION
        // =================================

        const puzzle =
            activityData.puzzle ||
            {};


        const settings =
            activityData.settings ||
            {};


        if (
            puzzle.type
        ) {

            return this.getPuzzleQuestions(
                activityData
            );

        }


        if (
            settings.mode
        ) {

            return this.getQuestions(
                activityData
            );

        }


        // =================================
        // ENGINE FIELD NOT FOUND
        // =================================

        console.warn(
            "QuestionProvider: Cannot Detect Content Type",
            activityData
        );


        return [];

    },


    // =====================================
    // LAST SOURCE
    // =====================================

    getLastSource: function () {

        return this.lastSource;

    },


    // =====================================
    // LAST QUESTIONS
    // =====================================

    getLastQuestions: function () {

        return this.lastQuestions;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.lastSource =
            null;


        this.lastQuestions =
            [];


        // =================================
        // Reset Quiz Provider
        // =================================

        if (

            typeof QuizProvider !==
            "undefined"

            &&

            typeof QuizProvider.reset ===
            "function"

        ) {

            QuizProvider.reset();

        }


        // =================================
        // Reset Memory Provider
        // =================================

        if (

            typeof MemoryProvider !==
            "undefined"

            &&

            typeof MemoryProvider.reset ===
            "function"

        ) {

            MemoryProvider.reset();

        }


        // =================================
        // Reset Puzzle Provider
        // =================================

        if (

            typeof PuzzleProvider !==
            "undefined"

            &&

            typeof PuzzleProvider.reset ===
            "function"

        ) {

            PuzzleProvider.reset();

        }


        console.log(
            "QuestionProvider Reset"
        );

    }

};


// =====================================
// GLOBAL
// =====================================

window.QuestionProvider =
    QuestionProvider;


// =====================================
// READY
// =====================================

console.log(
    "Question Provider Facade v5.0 Ready"
);