// =====================================
// Tahouri Edu Platform
// Input / Output Puzzle
// Version 2.0
//
// Puzzle Type:
// - inputOutput
//
// Purpose:
// - Discover the transformation rule from examples.
// - Apply the discovered rule to the missing output.
//
// Supported rule forms:
// - { operation: "add", value: 3 }
// - { operation: "subtract", value: 2 }
// - { operation: "multiply", value: 2 }
// - { operation: "divide", value: 2 }
// - { operation: "multiplyAdd", multiplier: 2, add: 1 }
// - { operation: "addMultiply", add: 1, multiplier: 2 }
// - { operation: "power", value: 2 }
// - { operation: "identity" }
//
// Legacy compatibility:
// - If no usable rule is supplied, answer remains the fallback validator.
// =====================================


const InputOutputPuzzle = {


    // =====================================
    // RULE EVALUATION
    // =====================================

    evaluateRule: function (
        input,
        rule
    ) {

        if (
            rule === null
            ||
            rule === undefined
        ) {

            return {
                usable: false,
                value: null
            };

        }


        // Numeric rule shorthand means addition.
        if (
            typeof rule === "number"
        ) {

            return {
                usable: true,
                value: Number(input) + rule
            };

        }


        if (
            typeof rule !== "object"
        ) {

            return {
                usable: false,
                value: null
            };

        }


        const operation =
            String(
                rule.operation
                ||
                rule.type
                ||
                ""
            ).toLowerCase();


        const value =
            Number(
                rule.value
                !== undefined
                    ? rule.value
                    : rule.amount
            );


        const multiplier =
            Number(
                rule.multiplier
                !== undefined
                    ? rule.multiplier
                    : rule.factor
            );


        const add =
            Number(
                rule.add
                !== undefined
                    ? rule.add
                    : rule.offset
            );


        switch (
            operation
        ) {

            case "identity":
            case "same":
                return {
                    usable: true,
                    value: Number(input)
                };


            case "add":
            case "plus":
                if (
                    !Number.isFinite(value)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value: Number(input) + value
                };


            case "subtract":
            case "minus":
                if (
                    !Number.isFinite(value)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value: Number(input) - value
                };


            case "multiply":
            case "times":
                if (
                    !Number.isFinite(value)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value: Number(input) * value
                };


            case "divide":
                if (
                    !Number.isFinite(value)
                    ||
                    value === 0
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value: Number(input) / value
                };


            case "multiplyadd":
            case "multiply_add":
            case "scaleoffset":
                if (
                    !Number.isFinite(multiplier)
                    ||
                    !Number.isFinite(add)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value:
                        Number(input) * multiplier + add
                };


            case "addmultiply":
            case "add_multiply":
                if (
                    !Number.isFinite(multiplier)
                    ||
                    !Number.isFinite(add)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value:
                        (Number(input) + add) * multiplier
                };


            case "power":
                if (
                    !Number.isFinite(value)
                ) {
                    return {
                        usable: false,
                        value: null
                    };
                }

                return {
                    usable: true,
                    value: Math.pow(
                        Number(input),
                        value
                    )
                };


            default:
                return {
                    usable: false,
                    value: null
                };

        }

    },


    // =====================================
    // VALIDATE DECLARED RULE
    // =====================================

    validateRuleAgainstExamples: function (
        inputs,
        outputs,
        missingIndex,
        rule,
        valuesEqual
    ) {

        const hasRule =
            rule !== null
            &&
            rule !== undefined;


        if (
            !hasRule
        ) {
            return {
                usable: false,
                valid: true,
                expected: null
            };
        }


        const missingResult =
            this.evaluateRule(
                inputs[missingIndex],
                rule
            );


        if (
            !missingResult.usable
        ) {
            return {
                usable: false,
                valid: false,
                expected: null
            };
        }


        for (
            let index = 0;
            index < inputs.length;
            index += 1
        ) {

            if (
                index === missingIndex
            ) {
                continue;
            }

            const result =
                this.evaluateRule(
                    inputs[index],
                    rule
                );


            if (
                !result.usable
                ||
                !valuesEqual(
                    result.value,
                    outputs[index]
                )
            ) {

                return {
                    usable: true,
                    valid: false,
                    expected:
                        missingResult.value
                };

            }

        }


        return {
            usable: true,
            valid: true,
            expected:
                missingResult.value
        };

    },


    // =====================================
    // START
    // =====================================

    start: function (
        engine,
        data
    ) {

        const inputs =
            Array.isArray(
                data.inputs
            )
                ? [...data.inputs]
                : [];


        const outputs =
            Array.isArray(
                data.outputs
            )
                ? [...data.outputs]
                : [];


        if (
            inputs.length === 0
        ) {

            console.error(
                "Input Output Puzzle: Inputs Missing"
            );

            return null;

        }


        if (
            outputs.length !==
            inputs.length
        ) {

            console.error(
                "Input Output Puzzle: Inputs And Outputs Length Mismatch"
            );

            return null;

        }


        const missingIndices = [];


        outputs.forEach(
            function (
                value,
                index
            ) {

                if (
                    value === null
                    ||
                    value === undefined
                ) {

                    missingIndices.push(
                        index
                    );

                }

            }
        );


        if (
            missingIndices.length !== 1
        ) {

            console.error(
                "Input Output Puzzle: Exactly One Missing Output Is Required"
            );

            return null;

        }


        const missingIndex =
            missingIndices[0];


        const rule =
            data.rule ||
            null;


        const ruleValidation =
            this.validateRuleAgainstExamples(
                inputs,
                outputs,
                missingIndex,
                rule,
                function (
                    left,
                    right
                ) {
                    return engine.valuesEqual(
                        left,
                        right
                    );
                }
            );


        if (
            ruleValidation.usable
            &&
            !ruleValidation.valid
        ) {

            console.error(
                "Input Output Puzzle: Declared Rule Does Not Match Examples"
            );

            return null;

        }


        engine.puzzle = {

            type:
                "inputOutput",

            dataType:
                data.dataType ||
                "number",

            source:
                data.source ||
                "generated",

            instruction:
                data.instruction ||
                "قانون تبدیل را پیدا کن و خروجی مناسب را کامل کن",

            inputs:
                inputs,

            outputs:
                outputs,

            missingIndex:
                missingIndex,

            rule:
                rule,

            ruleExpected:
                ruleValidation.usable
                    ? ruleValidation.expected
                    : null,

            answer:
                data.answer

        };


        engine.items =
            outputs.map(
                function (
                    value
                ) {

                    return value;

                }
            );


        engine.emitStarted();


        console.log(
            "Input Output Puzzle Started"
        );


        if (
            ruleValidation.usable
        ) {

            console.log(
                "Input Output Rule Validated"
            );

        }


        return engine.getState();

    },


    // =====================================
    // CHECK
    // =====================================

    check: function (
        engine
    ) {

        const value =
            engine.items[
                engine.puzzle.missingIndex
            ];


        let correct = false;


        // Rule is authoritative when it was declared
        // and validated during start().
        if (
            engine.puzzle.ruleExpected !==
            null
        ) {

            correct =
                engine.valuesEqual(
                    value,
                    engine.puzzle.ruleExpected
                );

        }
        else {

            // Backward-compatible fallback for old content
            // that has no usable rule definition.
            correct =
                engine.valuesEqual(
                    value,
                    engine.puzzle.answer
                );

        }


        if (
            correct
        ) {

            console.log(
                "Input Output Correct"
            );

            engine.finish();

            return true;

        }


        console.log(
            "Input Output Wrong"
        );

        engine.emitWrong();

        return false;

    }

};


window.InputOutputPuzzle =
    InputOutputPuzzle;


PuzzleTypeRegistry.register(
    "inputOutput",
    InputOutputPuzzle
);


console.log(
    "Input Output Puzzle v2.0 Ready"
);