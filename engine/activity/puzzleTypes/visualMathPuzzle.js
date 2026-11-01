// =====================================
// Tahouri Edu Platform
// Visual Math Puzzle
// Version 1.0
// =====================================

const VisualMathPuzzle = {


    operations: [

        "addition",
        "subtraction",
        "counting",
        "comparison"

    ],


    start: function (
        engine,
        data
    ) {

        const operation =
            data.operation ||
            "addition";


        if (
            !this.operations.includes(
                operation
            )
        ) {

            console.error(
                "Visual Math: Unsupported Operation:",
                operation
            );

            return null;

        }


        const items =
            Array.isArray(
                data.items
            )
                ? data.items
                : [];


        const requiredGroups =
            operation === "counting"
                ? 1
                : 2;


        if (
            items.length !==
            requiredGroups
        ) {

            console.error(
                "Visual Math: Invalid Group Count"
            );

            return null;

        }


        const normalizedItems =
            items.map(
                function (item) {

                    return {

                        image:
                            item.image,

                        count:
                            Number(
                                item.count
                            )

                    };

                }
            );


        const valid =
            normalizedItems.every(
                function (item) {

                    return (

                        typeof item.image ===
                        "string"

                        &&

                        Number.isInteger(
                            item.count
                        )

                        &&

                        item.count > 0

                    );

                }
            );


        if (!valid) {

            console.error(
                "Visual Math: Invalid Items"
            );

            return null;

        }


        let answer;


        if (
            operation ===
            "comparison"
        ) {

            answer =
                data.answer;


            if (

                answer !== "left" &&
                answer !== "right" &&
                answer !== "equal"

            ) {

                console.error(
                    "Visual Math: Invalid Comparison Answer"
                );

                return null;

            }

        }

        else {

            answer =
                Number(
                    data.answer
                );


            if (
                !Number.isFinite(
                    answer
                )
            ) {

                console.error(
                    "Visual Math: Answer Missing"
                );

                return null;

            }

        }


        let instruction =
            data.instruction;


        if (!instruction) {

            if (
                operation ===
                "addition"
            ) {

                instruction =
                    "با شمردن شکل‌ها حاصل جمع را پیدا کن";

            }

            else if (
                operation ===
                "subtraction"
            ) {

                instruction =
                    "با شمردن شکل‌ها حاصل تفریق را پیدا کن";

            }

            else if (
                operation ===
                "counting"
            ) {

                instruction =
                    "شکل‌ها را بشمار";

            }

            else {

                instruction =
                    "کدام گروه بیشتر است؟";

            }

        }


        engine.puzzle = {

            type:
                "visualMath",

            dataType:
                "image",

            source:
                data.source ||
                "generated",

            instruction:
                instruction,

            operation:
                operation,

            comparison:
                data.comparison ||
                null,

            items:
                normalizedItems,

            answer:
                answer

        };


        engine.items =
            normalizedItems.map(
                function (item) {

                    return {

                        image:
                            item.image,

                        count:
                            item.count

                    };

                }
            );


        engine.emitStarted();


        console.log(
            "Visual Math Puzzle Started:",
            operation
        );


        return engine.getState();

    },


    check: function (
        engine
    ) {

        const value =
            engine.userAnswer;


        if (
            engine.puzzle.operation ===
            "comparison"
        ) {

            const correct =
                String(value) ===
                String(
                    engine.puzzle.answer
                );


            if (correct) {

                engine.finish();

                return true;

            }


            engine.emitWrong();

            return false;

        }


        const correct =
            engine.valuesEqual(
                value,
                engine.puzzle.answer
            );


        if (correct) {

            engine.finish();

            return true;

        }


        engine.emitWrong();

        return false;

    }

};


window.VisualMathPuzzle =
    VisualMathPuzzle;


PuzzleTypeRegistry.register(
    "visualMath",
    VisualMathPuzzle
);


console.log(
    "Visual Math Puzzle v1.0 Ready"
);