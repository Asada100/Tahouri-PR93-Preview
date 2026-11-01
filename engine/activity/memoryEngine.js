// =====================================
// Tahouri Edu Platform
// Version 3.3
// Memory Engine
// QuestionProvider Integration
// Activity Result Compatible
// Statistics Compatible
// MemoryScreen Integration
//
// UI Rendering:
// MemoryEngine -> MemoryScreen
// =====================================


const MemoryEngine = {

    // =====================================
    // STATE
    // =====================================

    cards: [],

    firstCard: null,

    secondCard: null,

    lockBoard: false,

    activity: null,

    matchedPairs: 0,

    moves: 0,

    totalPairs: 0,

    finished: false,


    // =====================================
    // START
    // =====================================

    start: async function(activity) {

        console.log(
            "Memory Engine Started"
        );


        this.activity =
            activity;


        this.firstCard =
            null;

        this.secondCard =
            null;

        this.lockBoard =
            false;

        this.matchedPairs =
            0;

        this.moves =
            0;

        this.finished =
            false;


        ScoreManager.reset();


        // =================================
        // QuestionProvider Check
        // =================================

        if (
            typeof QuestionProvider ===
            "undefined"
        ) {

            console.error(
                "Memory Engine: QuestionProvider Not Available"
            );

            return null;

        }


        // =================================
        // Get Memory Cards
        // =================================

        let cards = [];


        try {

            cards =
                await QuestionProvider.getMemoryCards(
                    activity
                );

        }

        catch (error) {

            console.error(
                "Memory Engine: QuestionProvider Error:",
                error
            );

            return null;

        }


        // =================================
        // Validate Cards
        // =================================

        if (
            !Array.isArray(cards) ||
            cards.length === 0
        ) {

            console.error(
                "Memory Engine: No Memory Cards Available"
            );

            return null;

        }


        if (
            cards.length % 2 !== 0
        ) {

            console.error(
                "Memory Engine: Card Count Must Be Even"
            );

            return null;

        }


        // =================================
        // Normalize Cards
        // =================================

        this.cards =
            cards.map(
                function(card, index) {

                    return {

                        id:
                            card.id !== undefined
                                ? card.id
                                : `memory_card_${index}`,

                        value:
                            card.value,

                        pairId:
                            card.pairId !== undefined
                                ? card.pairId
                                : card.value,

                        dataType:
                            card.dataType ||
                            "text",

                        flipped:
                            false,

                        matched:
                            false

                    };

                }
            );


        this.totalPairs =
            this.cards.length / 2;


        // =================================
        // Shuffle
        // =================================

        this.cards =
            this.shuffle(
                this.cards
            );


        console.log(
            "Memory Cards Ready:",
            this.cards.length
        );


        console.log(
            "Memory Pairs:",
            this.totalPairs
        );


        // =================================
        // Display
        // =================================

        this.refresh();


        // =================================
        // Events
        // =================================

        EventManager.emit(
            "activityStarted",
            activity
        );


        EventManager.emit(
            "activityPlaying"
        );


        return this.getCards();

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function(cards) {

        const array =
            [
                ...cards
            ];


        for (
            let i =
                array.length - 1;

            i > 0;

            i--
        ) {

            const j =
                Math.floor(
                    Math.random()
                    *
                    (
                        i + 1
                    )
                );


            const temp =
                array[i];


            array[i] =
                array[j];


            array[j] =
                temp;

        }


        return array;

    },


    // =====================================
    // FLIP CARD
    // =====================================

    flipCard: function(id) {

        if (
            this.lockBoard ||
            this.finished
        ) {

            return;

        }


        const card =
            this.cards.find(
                function(item) {

                    return (
                        item.id == id
                    );

                }
            );


        if (!card) {

            return;

        }


        if (
            card.flipped ||
            card.matched
        ) {

            return;

        }


        card.flipped =
            true;


        // =================================
        // First Card
        // =================================

        if (
            !this.firstCard
        ) {

            this.firstCard =
                card;


            this.refresh();


            return;

        }


        // =================================
        // Second Card
        // =================================

        this.secondCard =
            card;


        this.moves++;


        this.refresh();


        this.checkMatch();

    },


    // =====================================
    // CHECK MATCH
    // =====================================

    checkMatch: function() {

        this.lockBoard =
            true;


        const firstPair =
            this.getPairValue(
                this.firstCard
            );


        const secondPair =
            this.getPairValue(
                this.secondCard
            );


        if (
            firstPair ===
            secondPair
        ) {

            this.firstCard.matched =
                true;


            this.secondCard.matched =
                true;


            this.matchedPairs++;


            ScoreManager.addCorrect();


            console.log(
                "Memory Match"
            );


            if (
                this.matchedPairs ===
                this.totalPairs
            ) {

                setTimeout(
                    function() {

                        MemoryEngine.finish();

                    },
                    800
                );

            }

            else {

                this.resetTurn();

            }


            return;

        }


        // =================================
        // Wrong Match
        // =================================

        ScoreManager.addWrong();


        console.log(
            "Memory Wrong"
        );


        setTimeout(
            function() {

                if (
                    MemoryEngine.firstCard
                ) {

                    MemoryEngine
                        .firstCard
                        .flipped =
                        false;

                }


                if (
                    MemoryEngine.secondCard
                ) {

                    MemoryEngine
                        .secondCard
                        .flipped =
                        false;

                }


                MemoryEngine.resetTurn();

            },
            1000
        );

    },


    // =====================================
    // GET PAIR VALUE
    // =====================================

    getPairValue: function(card) {

        if (!card) {

            return null;

        }


        if (
            card.pairId !== undefined &&
            card.pairId !== null
        ) {

            return String(
                card.pairId
            );

        }


        return String(
            card.value
        );

    },


    // =====================================
    // RESET TURN
    // =====================================

    resetTurn: function() {

        this.firstCard =
            null;


        this.secondCard =
            null;


        this.lockBoard =
            false;


        if (
            !this.finished
        ) {

            this.refresh();

        }

    },


    // =====================================
    // FINISH
    // =====================================

    finish: function() {

        if (
            this.finished
        ) {

            return;

        }


        this.finished =
            true;


        this.lockBoard =
            true;


        const scoreResult =
            ScoreManager.getResult(
                this.totalPairs
            );


        const percentage =

            this.totalPairs > 0

                ?

                Math.round(

                    (
                        this.matchedPairs /
                        this.totalPairs
                    )
                    *
                    100

                )

                :

                0;


        const result =
            ActivityResult.create({

                activityId:

                    this.activity
                        ? this.activity.id
                        : null,

                score:
                    scoreResult.score || 0,

                totalQuestions:
                    this.totalPairs,

                correctAnswers:
                    this.matchedPairs,

                wrongAnswers:
                    scoreResult.wrong || 0,

                percentage:
                    percentage,

                message:
                    "🎉 بازی حافظه تمام شد"

            });


        console.log(
            "Memory Finished",
            result
        );


        EventManager.emit(
            "activityFinished",
            result
        );


    },


    // =====================================
    // REFRESH
    // =====================================

    refresh: function() {

        if (
            this.finished
        ) {

            return;

        }


        if (
            typeof MemoryScreen ===
            "undefined"
        ) {

            console.error(
                "Memory Engine: MemoryScreen Not Available"
            );

            return;

        }


        MemoryScreen.show({

            title:

                this.activity
                    ? this.activity.title
                    : "بازی حافظه",

            cards:
                this.cards

        });

    },


    // =====================================
    // GET CARDS
    // =====================================

    getCards: function() {

        return this.cards;

    }

};


// =====================================
// GLOBAL
// =====================================

window.MemoryEngine =
    MemoryEngine;


// =====================================
// READY
// =====================================

console.log(
    "Memory Engine v3.3 Ready"
);