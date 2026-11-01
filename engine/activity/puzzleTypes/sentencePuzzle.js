// =====================================
// Tahouri Edu Platform
// Sentence Puzzle
// Version 1.0
//
// Supported Modes:
// - sentenceOrder
// - sentenceGrammar
//
// Future:
// - advanced grammar relations
// =====================================


const SentencePuzzle = {


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        if (
            !data
        ) {

            console.error(
                "Sentence Puzzle: Data Missing"
            );

            return null;

        }


        const mode =
            data.mode ||
            "sentenceOrder";


        // =================================
        // SENTENCE ORDER
        // =================================

        if (
            mode ===
            "sentenceOrder"
        ) {

            return this.startOrder(
                engine,
                data
            );

        }


        // =================================
        // SENTENCE GRAMMAR
        // =================================

        if (
            mode ===
            "sentenceGrammar"
        ) {

            return this.startGrammar(
                engine,
                data
            );

        }


        console.error(
            "Sentence Puzzle: Unsupported Mode:",
            mode
        );


        return null;

    },


    // =====================================
    // SENTENCE ORDER
    // =====================================

    startOrder: function (
        engine,
        data
    ) {

        const words =
            Array.isArray(
                data.words
            )
                ? [...data.words]
                : [];


        if (
            words.length < 2
        ) {

            console.error(
                "Sentence Puzzle: Not Enough Words"
            );

            return null;

        }


        const correctOrder =
            Array.isArray(
                data.correctOrder
            )
                ? [...data.correctOrder]
                : [];


        if (
            correctOrder.length !==
            words.length
        ) {

            console.error(
                "Sentence Puzzle: Invalid Correct Order"
            );

            return null;

        }


        engine.puzzle = {

            type:
                "sentence",

            mode:
                "sentenceOrder",

            dataType:
                "text",

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||
                "کلمات را به ترتیب درست قرار بده",

            words:
                words,

            correctOrder:
                correctOrder,

            grammar:
                data.grammar ||
                null

        };


        engine.items =
            this.shuffleIndexes(
                words.length
            );


        engine.emitStarted();


        console.log(
            "Sentence Order Puzzle Started"
        );


        return engine.getState();

    },


    // =====================================
    // SENTENCE GRAMMAR
    // =====================================

    startGrammar: function (
        engine,
        data
    ) {

        const words =
            Array.isArray(
                data.words
            )
                ? [...data.words]
                : [];


        if (
            words.length === 0
        ) {

            console.error(
                "Sentence Grammar: Words Missing"
            );

            return null;

        }


        const grammar =
            data.grammar ||
            {};


        engine.puzzle = {

            type:
                "sentence",

            mode:
                "sentenceGrammar",

            dataType:
                "text",

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||
                "نقش دستوری کلمات را مشخص کن",

            words:
                words,

            grammar:
                grammar,

            targets:
                Array.isArray(
                    data.targets
                )
                    ? [...data.targets]
                    : [],

            answers:
                Array.isArray(
                    data.answers
                )
                    ? [...data.answers]
                    : []

        };


        engine.items =
            [...words];


        engine.emitStarted();


        console.log(
            "Sentence Grammar Puzzle Started"
        );


        return engine.getState();

    },


    // =====================================
    // CHECK
    // =====================================

    check: function (
        engine
    ) {

        if (
            !engine.puzzle
        ) {

            return false;

        }


        if (
            engine.puzzle.mode ===
            "sentenceOrder"
        ) {

            return this.checkOrder(
                engine
            );

        }


        if (
            engine.puzzle.mode ===
            "sentenceGrammar"
        ) {

            return this.checkGrammar(
                engine
            );

        }


        return false;

    },


    // =====================================
    // CHECK ORDER
    // =====================================

    checkOrder: function (
        engine
    ) {

        const currentOrder =
            engine.items;


        const correctOrder =
            engine.puzzle.correctOrder;


        const correct =
            engine.areArraysEqual(
                currentOrder,
                correctOrder
            );


        if (
            correct
        ) {

            console.log(
                "Sentence Order Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Sentence Order Wrong"
        );


        engine.emitWrong();


        return false;

    },


    // =====================================
    // CHECK GRAMMAR
    // =====================================

    checkGrammar: function (
        engine
    ) {

        const answers =
            engine.userAnswer;


        if (
            !Array.isArray(
                answers
            )
        ) {

            console.log(
                "Sentence Grammar: Answer Missing"
            );


            engine.emitWrong();


            return false;

        }


        const correctAnswers =
            engine.puzzle.answers;


        if (
            !Array.isArray(
                correctAnswers
            )

            ||

            answers.length !==
            correctAnswers.length
        ) {

            console.error(
                "Sentence Grammar: Invalid Answer Structure"
            );


            return false;

        }


        const correct =
            answers.every(
                function (
                    value,
                    index
                ) {

                    return (

                        String(value)
                        ===
                        String(
                            correctAnswers[
                                index
                            ]
                        )

                    );

                }
            );


        if (
            correct
        ) {

            console.log(
                "Sentence Grammar Correct"
            );


            engine.finish();


            return true;

        }


        console.log(
            "Sentence Grammar Wrong"
        );


        engine.emitWrong();


        return false;

    },


    // =====================================
    // SET ANSWER
    // =====================================

    setAnswer: function (
        engine,
        value
    ) {

        if (
            !engine.puzzle
        ) {

            return false;

        }


        if (
            engine.puzzle.mode ===
            "sentenceOrder"
        ) {

            if (
                !Array.isArray(
                    value
                )
            ) {

                return false;

            }


            engine.items =
                [...value];

        }


        if (
            engine.puzzle.mode ===
            "sentenceGrammar"
        ) {

            if (
                !Array.isArray(
                    value
                )
            ) {

                return false;

            }


            engine.userAnswer =
                [...value];

        }


        engine.moves++;


        EventManager.emit(
            "puzzleChanged",
            engine.getState()
        );


        return true;

    },


    // =====================================
    // SHUFFLE INDEXES
    // =====================================

    shuffleIndexes: function (
        length
    ) {

        const indexes =
            [];


        for (
            let i = 0;
            i < length;
            i++
        ) {

            indexes.push(
                i
            );

        }


        for (
            let i =
                indexes.length - 1;

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
                indexes[i];


            indexes[i] =
                indexes[j];


            indexes[j] =
                temp;

        }


        return indexes;

    }

};


window.SentencePuzzle =
    SentencePuzzle;


PuzzleTypeRegistry.register(
    "sentence",
    SentencePuzzle
);


console.log(
    "Sentence Puzzle v1.0 Ready"
);