// =====================================
// Tahouri Edu Platform
// Sequence Puzzle
// Version 1.0
// =====================================

const SequencePuzzle = {


    start: function (
        engine,
        data
    ) {

        const items =
            Array.isArray(
                data.items
            )
                ? [...data.items]
                : [];


        const missingIndex =
            Number.isInteger(
                data.missingIndex
            )
                ? data.missingIndex
                : -1;


        if (
            items.length === 0
        ) {

            console.error(
                "Sequence Puzzle: Items Missing"
            );

            return null;

        }


        if (
            missingIndex < 0 ||
            missingIndex >= items.length
        ) {

            console.error(
                "Sequence Puzzle: Invalid Missing Index"
            );

            return null;

        }


        if (
            data.answer === undefined ||
            data.answer === null
        ) {

            console.error(
                "Sequence Puzzle: Answer Missing"
            );

            return null;

        }


        engine.puzzle = {

            type:
                "sequence",

            dataType:
                data.dataType ||
                engine.detectDataType(
                    items
                ),

            source:
                data.source ||
                "generated",

            instruction:
                data.instruction ||
                "عضو بعدی الگو را پیدا کن",

            items:
                [...items],

            missingIndex:
                missingIndex,

            answer:
                data.answer,

            pattern:
                data.pattern ||
                null,

            step:
                data.step !== undefined
                    ? data.step
                    : null,

            multiplier:
                data.multiplier !== undefined
                    ? data.multiplier
                    : null

        };


        engine.items =
            [...items];


        engine.items[
            missingIndex
        ] = null;


        engine.logSequence();

        engine.emitStarted();


        console.log(
            "Sequence Puzzle Started"
        );


        return engine.getState();

    },


    check: function (
        engine
    ) {

        const value =
            engine.items[
                engine.puzzle.missingIndex
            ];


        const correct =
            engine.valuesEqual(
                value,
                engine.puzzle.answer
            );


        if (correct) {

            console.log(
                "Sequence Correct"
            );

            engine.finish();

            return true;

        }


        console.log(
            "Sequence Wrong"
        );


        engine.emitWrong();


        return false;

    }

};


window.SequencePuzzle =
    SequencePuzzle;


PuzzleTypeRegistry.register(
    "sequence",
    SequencePuzzle
);


console.log(
    "Sequence Puzzle v1.0 Ready"
);