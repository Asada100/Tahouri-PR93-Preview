// =====================================
// Tahouri Edu Platform
// Ordering Puzzle
// Version 1.0
// =====================================

const OrderingPuzzle = {


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


        if (
            items.length === 0
        ) {

            console.error(
                "Ordering Puzzle: Items Missing"
            );

            return null;

        }


        const correctOrder =
            Array.isArray(
                data.correctOrder
            )
                ? [...data.correctOrder]
                : engine.buildCorrectOrder(
                    items,
                    data.order
                );


        if (
            correctOrder.length === 0
        ) {

            console.error(
                "Ordering Puzzle: Correct Order Missing"
            );

            return null;

        }


        engine.puzzle = {

            type:
                "ordering",

            dataType:
                data.dataType ||
                engine.detectDataType(
                    items
                ),

            source:
                data.source ||
                "file",

            instruction:
                data.instruction ||
                "موارد را به ترتیب درست قرار بده",

            items:
                [...items],

            correctOrder:
                [...correctOrder]

        };


        engine.items =
            engine.shuffle(
                items
            );


        engine.logOrdering();

        engine.emitStarted();


        console.log(
            "Ordering Puzzle Started"
        );


        return engine.getState();

    },


    check: function (
        engine
    ) {

        const correct =
            engine.areArraysEqual(
                engine.items,
                engine.puzzle.correctOrder
            );


        if (correct) {

            console.log(
                "Ordering Correct"
            );

            engine.finish();

            return true;

        }


        console.log(
            "Ordering Wrong"
        );


        engine.emitWrong();


        return false;

    }

};


window.OrderingPuzzle =
    OrderingPuzzle;


PuzzleTypeRegistry.register(
    "ordering",
    OrderingPuzzle
);


console.log(
    "Ordering Puzzle v1.0 Ready"
);