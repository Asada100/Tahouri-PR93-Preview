// =====================================
// Tahouri Edu Platform
// Version 1.0
// Quiz Provider
//
// Extracted from:
// QuestionProvider v4.5
//
// Responsibilities:
// - Quiz content loading
// - Quiz question normalization
// - Even / Odd generation
// - Divisibility generation
// - Difficulty handling
// - Answer pattern generation
//
// Important:
// This Provider does NOT replace
// QuestionProvider yet.
//
// It is prepared for the new
// Provider architecture.
// =====================================


const QuizProvider = {

    // =====================================
    // STATE
    // =====================================

    lastSource: null,

    lastQuestions: [],


    // =====================================
    // MAIN ENTRY
    // =====================================

    getQuestions: async function (
        activityData
    ) {

        if (!activityData) {

            console.error(
                "QuizProvider: Activity Data Missing"
            );

            return [];

        }


        const settings =
            activityData.settings || {};


        const source =
            settings.questionSource ||
            "generated";


        console.log(
            "QuizProvider Source:",
            source
        );


        if (
            source === "file"
        ) {

            const questions =
                await this.loadFromFile(
                    activityData
                );


            this.lastSource =
                "file";


            this.lastQuestions =
                questions;


            return questions;

        }


        if (
            source === "generated"
        ) {

            const questions =
                this.generateQuestions(
                    activityData
                );


            this.lastSource =
                "generated";


            this.lastQuestions =
                questions;


            return questions;

        }


        if (
            source === "mixed"
        ) {

            const questions =
                await this.getMixedQuestions(
                    activityData
                );


            this.lastSource =
                "mixed";


            this.lastQuestions =
                questions;


            return questions;

        }


        console.warn(
            "QuizProvider: Unknown Source:",
            source
        );


        return [];

    },


    // =====================================
    // LOAD FROM FILE
    // =====================================

    loadFromFile: async function (
        activityData
    ) {

        try {

            if (
                typeof DataManager ===
                "undefined"
            ) {

                console.error(
                    "QuizProvider: DataManager Not Available"
                );

                return [];

            }


            const questions =
                await DataManager.getQuestions(
                    activityData
                );


            if (
                !Array.isArray(
                    questions
                )
            ) {

                console.error(
                    "QuizProvider: Invalid Questions File"
                );

                return [];

            }


            const normalized =
                this.normalizeQuestions(
                    questions,
                    activityData
                );


            const shuffled =
                this.shuffle(
                    normalized
                );


            console.log(
                "QuizProvider: Questions Loaded:",
                shuffled.length
            );


            return shuffled;

        }

        catch (error) {

            console.error(
                "QuizProvider: File Load Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // NORMALIZE QUESTIONS
    // =====================================

    normalizeQuestions: function (
        questions,
        activityData
    ) {

        const settings =
            activityData.settings || {};


        const mode =
            settings.mode ||
            "evenOdd";


        return questions.map(
            function (question) {

                const normalized = {

                    ...question

                };


                if (

                    Array.isArray(
                        normalized.options
                    )

                    &&

                    normalized.options.length >= 2

                ) {

                    return normalized;

                }


                if (
                    mode ===
                    "divisibility"
                ) {

                    normalized.options = [

                        "بله",
                        "خیر"

                    ];


                    return normalized;

                }


                if (
                    mode ===
                    "evenOdd"
                ) {

                    normalized.options = [

                        "زوج",
                        "فرد"

                    ];


                    return normalized;

                }


                normalized.options = [

                    "بله",
                    "خیر"

                ];


                return normalized;

            }
        );

    },


    // =====================================
    // QUIZ GENERATOR
    // =====================================

    generateQuestions: function (
        activityData
    ) {

        const settings =
            activityData.settings || {};


        const mode =
            settings.mode ||
            "evenOdd";

        // This activity must always generate exactly 10 scored questions.
        // Do not trust a stale catalog/session setting that may still say 12.
        const configuredCount =
            Math.max(
                0,
                Number(settings.questions) || 10
            );

        const count =
            mode === "evenOddSum"
                ? 10
                : configuredCount;

        if (
            count === 0
        ) {

            return [];

        }


        if (
            mode ===
            "evenOdd"
        ) {

            return this.generateEvenOddQuestions(

                activityData,

                count

            );

        }


        if (
            mode ===
            "divisibility"
        ) {

            return this.generateDivisibilityQuestions(

                activityData,

                count

            );

        }


        if (
            mode ===
            "evenOddSum"
        ) {

            return this.generateEvenOddSumQuestions(
                activityData,
                count
            );

        }


        console.warn(
            "QuizProvider: Unknown Mode:",
            mode
        );


        return [];

    },


    // =====================================
    // EVEN / ODD
    // =====================================

    generateEvenOddQuestions: function (
        activityData,
        count
    ) {

        const settings =
            activityData.settings || {};


        const min =
            settings.minNumber !== undefined

                ?

                settings.minNumber

                :

                1;


        const max =
            settings.maxNumber !== undefined

                ?

                settings.maxNumber

                :

                1000;


        const usedNumbers =
            new Set();


        const questions =
            [];


        let attempts =
            0;


        const maxAttempts =
            Math.max(

                count * 100,

                100

            );


        while (

            questions.length < count

            &&

            attempts < maxAttempts

        ) {

            attempts++;


            const number =
                this.randomNumber(

                    min,

                    max

                );


            if (
                usedNumbers.has(
                    number
                )
            ) {

                continue;

            }


            usedNumbers.add(
                number
            );


            questions.push({

                type:
                    "quiz",

                mode:
                    "evenOdd",

                text:
                    `عدد ${number} زوج است یا فرد؟`,

                answer:

                    number % 2 === 0

                        ?

                        "زوج"

                        :

                        "فرد",

                options: [

                    "زوج",
                    "فرد"

                ],

                number:
                    number

            });

        }


        return this.shuffle(
            questions
        );

    },


    // =====================================
    // EVEN / ODD SUM RULES
    // =====================================

    generateEvenOddSumQuestions: function (
        activityData,
        count
    ) {
        const questions = [];
        const usedTexts = new Set();
        const parityOptions = ["زوج", "فرد"];
        const targetCount = Math.max(0, Number(count) || 0);

        if (targetCount === 0) {
            return [];
        }

        const randomParityNumber = (parity) => {
            const base = this.randomInteger(1, 49);
            return parity === "زوج" ? base * 2 : base * 2 + 1;
        };

        const addQuestion = (question) => {
            if (!question || !question.text || usedTexts.has(question.text)) {
                return false;
            }

            const options = Array.isArray(question.options)
                ? question.options
                : [];

            if (
                options.length < 2 ||
                new Set(options).size !== options.length ||
                !options.includes(question.answer)
            ) {
                return false;
            }

            let explanation = question.explanation;
            if (!explanation) {
                if (question.text.includes("سه عدد فرد")) {
                    explanation = "بله؛ مثلاً ۵ + ۹ + ۱۱ = ۲۵. سه عدد فرد می‌توانند مجموع فرد بسازند.";
                } else {
                    const sumMatch = question.text.match(/حاصل(?: جمع)? (\d+) \+ (\d+)/);
                    if (sumMatch) {
                        const a = Number(sumMatch[1]);
                        const b = Number(sumMatch[2]);
                        const parity = (a + b) % 2 === 0 ? "زوج" : "فرد";
                        explanation = `حاصل جمع ${a} + ${b} برابر ${a + b} و عددی ${parity} است. به زوج یا فرد بودن هر دو عدد توجه کن.`;
                    } else {
                        explanation = "قانون جمع را به یاد بیاور: زوج + زوج = زوج، فرد + فرد = زوج، و زوج + فرد = فرد.";
                    }
                }
            }

            usedTexts.add(question.text);
            questions.push({
                type: "quiz",
                mode: "evenOddSum",
                ...question,
                explanation
            });
            return true;
        };

        // First build approachable practice questions with changing numbers.
        let practiceAttempts = 0;
        const maxPracticeAttempts = Math.max(targetCount * 100, 100);
        while (
            questions.length < Math.min(6, targetCount) &&
            practiceAttempts < maxPracticeAttempts
        ) {
            practiceAttempts++;
            const a = this.randomInteger(2, 49);
            const b = this.randomInteger(2, 49);
            const sumParity = (a + b) % 2 === 0 ? "زوج" : "فرد";
            const n = this.randomInteger(10, 99);
            const nParity = n % 2 === 0 ? "زوج" : "فرد";
            const mode = questions.length % 6;
            let question;

            if (mode === 0 || mode === 1) {
                question = {
                    text: `حاصل جمع ${a} + ${b} زوج است یا فرد؟`,
                    answer: sumParity,
                    options: parityOptions
                };
            } else if (mode === 2) {
                const ruleQuestions = [
                    { text: "حاصل جمع دو عدد زوج همیشه چه نوع عددی است؟", answer: "زوج" },
                    { text: "حاصل جمع دو عدد فرد همیشه چه نوع عددی است؟", answer: "زوج" },
                    { text: "حاصل جمع یک عدد زوج و یک عدد فرد چه نوع عددی است؟", answer: "فرد" }
                ];
                const available = ruleQuestions.filter(item => !usedTexts.has(item.text));
                const chosen = available[this.randomInteger(0, available.length - 1)];
                question = chosen ? { ...chosen, options: parityOptions } : null;
            } else if (mode === 3) {
                const target = this.randomInteger(0, 1) === 0 ? "زوج" : "فرد";
                const known = this.randomInteger(2, 99);
                const knownParity = known % 2 === 0 ? "زوج" : "فرد";
                const answer = target === knownParity ? "زوج" : "فرد";
                question = {
                    text: `اگر حاصل جمع ${known} و یک عدد نامعلوم ${target} باشد، عدد نامعلوم چه نوعی است؟`,
                    answer,
                    options: parityOptions
                };
            } else if (mode === 4) {
                const target = this.randomInteger(0, 1) === 0 ? "زوج" : "فرد";
                const answer = target === nParity ? "زوج" : "فرد";
                question = {
                    text: `برای اینکه حاصل ${n} + □ ${target} شود، جای خالی باید چه نوع عددی باشد؟`,
                    answer,
                    options: parityOptions
                };
            } else {
                const wrongParity = sumParity === "زوج" ? "فرد" : "زوج";
                question = {
                    text: `علی می‌گوید حاصل ${a} + ${b} عدد ${wrongParity} است. آیا گفته‌اش درست است؟`,
                    answer: "خیر",
                    options: ["بله", "خیر"]
                };
            }

            if (!addQuestion(question)) {
                // A fresh arithmetic prompt is the safe fallback; it is always solvable.
                const x = this.randomInteger(2, 49);
                const y = this.randomInteger(2, 49);
                addQuestion({
                    text: `حاصل جمع ${x} + ${y} زوج است یا فرد؟`,
                    answer: (x + y) % 2 === 0 ? "زوج" : "فرد",
                    options: parityOptions
                });
            }
        }

        // After practice, add two rule-discovery questions with immediate, unambiguous answers.
        const discoveryQuestions = this.shuffle([
            { text: "حاصل جمع دو عدد زوج همیشه چه نوع عددی است؟", answer: "زوج", options: parityOptions },
            { text: "حاصل جمع دو عدد فرد همیشه چه نوع عددی است؟", answer: "زوج", options: parityOptions },
            { text: "حاصل جمع یک عدد زوج و یک عدد فرد چه نوع عددی است؟", answer: "فرد", options: parityOptions },
            { text: "اگر حاصل جمع دو عدد زوج باشد و یکی از آن‌ها فرد باشد، عدد دیگر چیست؟", answer: "فرد", options: parityOptions },
            { text: "اگر حاصل جمع دو عدد فرد باشد و یکی از آن‌ها فرد باشد، عدد دیگر چیست؟", answer: "زوج", options: parityOptions }
        ]);

        for (const question of discoveryQuestions) {
            if (questions.length >= Math.min(8, targetCount)) break;
            addQuestion(question);
        }

        // A search task remains solvable: students can find many valid examples.
        if (questions.length < targetCount) {
            addQuestion({
                text: "آیا می‌توان سه عدد فرد پیدا کرد که مجموعشان ۲۵ شود؟",
                answer: "بله",
                options: ["بله", "خیر"]
            });
        }

        // Do not place a no-solution challenge in the required round until the activity UI
        // can mark it as optional and provide concept-first guidance.
        let attempts = 0;
        const maxAttempts = Math.max(targetCount * 100, 100);

        while (questions.length < targetCount && attempts < maxAttempts) {
            attempts++;
            const a = this.randomInteger(2, 49);
            const b = this.randomInteger(2, 49);
            addQuestion({
                text: `حاصل جمع ${a} + ${b} زوج است یا فرد؟`,
                answer: (a + b) % 2 === 0 ? "زوج" : "فرد",
                options: parityOptions
            });
        }

        if (questions.length !== targetCount) {
            console.warn("QuizProvider: Could not fill evenOddSum round with unique questions", {
                requested: targetCount,
                generated: questions.length
            });
        }

        return this.shuffle(questions);
    },

    // =====================================
    // DIVISIBILITY
    // =====================================

    generateDivisibilityQuestions: function (
        activityData,
        count
    ) {

        const settings =
            activityData.settings || {};


        const divisor =
            Number(
                settings.divisor
            ) || 2;


        const difficulty =
            settings.difficulty ||
            "medium";


        const range =
            this.getDifficultyRange(

                settings,

                difficulty

            );


        const min =
            range.min;


        const max =
            range.max;


        console.log(
            "Difficulty:",
            difficulty
        );


        console.log(
            "Difficulty Range:",
            min,
            max
        );


        const distribution =
            this.getSafeCorrectDistribution(

                count,

                settings

            );


        const correctTarget =
            distribution.correct;


        const wrongTarget =
            distribution.wrong;


        console.log(
            "Generated Correct Target:",
            correctTarget
        );


        console.log(
            "Generated Wrong Target:",
            wrongTarget
        );


        const answerPattern =
            this.buildAnswerPattern(

                correctTarget,

                wrongTarget,

                settings.maxSameAnswers

            );


        console.log(
            "Generated Answer Pattern:",
            answerPattern
        );


        const usedNumbers =
            new Set();


        const questions =
            [];


        for (

            let i = 0;

            i < answerPattern.length;

            i++

        ) {

            const shouldBeDivisible =
                answerPattern[i] ===
                "بله";


            const number =
                this.getUniqueDivisibilityNumber(

                    shouldBeDivisible,

                    divisor,

                    min,

                    max,

                    usedNumbers

                );


            if (
                number === null
            ) {

                console.error(
                    "QuizProvider: Could Not Generate Unique Number"
                );

                continue;

            }


            usedNumbers.add(
                number
            );


            questions.push({

                type:
                    "quiz",

                mode:
                    "divisibility",

                text:
                    `آیا عدد ${number} بر ${divisor} بخش‌پذیر است؟`,

                answer:

                    shouldBeDivisible

                        ?

                        "بله"

                        :

                        "خیر",

                options: [

                    "بله",
                    "خیر"

                ],

                number:
                    number,

                divisor:
                    divisor,

                difficulty:
                    difficulty

            });

        }


        console.log(
            "Generated Divisibility Questions:",
            questions.length
        );


        return questions;

    },


    // =====================================
    // SAFE CORRECT DISTRIBUTION
    // =====================================

    getSafeCorrectDistribution: function (
        count,
        settings
    ) {

        const total =
            Math.max(

                0,

                Number(count) || 0

            );


        if (
            total === 0
        ) {

            return {

                correct:
                    0,

                wrong:
                    0

            };

        }


        let correctMin =

            settings.correctMin !==
            undefined

                ?

                Number(
                    settings.correctMin
                )

                :

                6;


        let correctMax =

            settings.correctMax !==
            undefined

                ?

                Number(
                    settings.correctMax
                )

                :

                8;


        if (
            !Number.isFinite(
                correctMin
            )
        ) {

            correctMin =
                6;

        }


        if (
            !Number.isFinite(
                correctMax
            )
        ) {

            correctMax =
                8;

        }


        correctMin =
            Math.max(

                0,

                Math.min(

                    correctMin,

                    total

                )

            );


        correctMax =
            Math.max(

                0,

                Math.min(

                    correctMax,

                    total

                )

            );


        if (
            correctMin >
            correctMax
        ) {

            const temp =
                correctMin;


            correctMin =
                correctMax;


            correctMax =
                temp;

        }


        if (
            total >= 10
        ) {

            const correct =
                this.randomInteger(

                    correctMin,

                    correctMax

                );


            return {

                correct:
                    correct,

                wrong:
                    total - correct

            };

        }


        const smallMin =
            Math.max(

                1,

                Math.ceil(

                    total * 0.6

                )

            );


        const smallMax =
            Math.min(

                total,

                Math.ceil(

                    total * 0.8

                )

            );


        const finalMin =
            Math.min(

                smallMin,

                smallMax

            );


        const finalMax =
            Math.max(

                smallMin,

                smallMax

            );


        const correct =
            this.randomInteger(

                finalMin,

                finalMax

            );


        return {

            correct:
                correct,

            wrong:
                total - correct

        };

    },


    // =====================================
    // DIFFICULTY RANGE
    // =====================================

    getDifficultyRange: function (
        settings,
        difficulty
    ) {

        const configuredMin =

            settings.minNumber !==
            undefined

                ?

                settings.minNumber

                :

                1;


        const configuredMax =

            settings.maxNumber !==
            undefined

                ?

                settings.maxNumber

                :

                10000;


        if (
            difficulty ===
            "easy"
        ) {

            return {

                min:
                    configuredMin,

                max:

                    Math.min(

                        configuredMax,

                        Math.max(

                            configuredMin,

                            999

                        )

                    )

            };

        }


        if (
            difficulty ===
            "medium"
        ) {

            const mediumMin =
                Math.max(

                    configuredMin,

                    100

                );


            const mediumMax =
                Math.min(

                    configuredMax,

                    9999

                );


            if (
                mediumMin <=
                mediumMax
            ) {

                return {

                    min:
                        mediumMin,

                    max:
                        mediumMax

                };

            }

        }


        if (
            difficulty ===
            "hard"
        ) {

            const hardMin =
                Math.max(

                    configuredMin,

                    1000

                );


            if (
                hardMin <=
                configuredMax
            ) {

                return {

                    min:
                        hardMin,

                    max:
                        configuredMax

                };

            }

        }


        return {

            min:
                configuredMin,

            max:
                configuredMax

        };

    },


    // =====================================
    // ANSWER PATTERN
    // =====================================

    buildAnswerPattern: function (
        correctCount,
        wrongCount,
        maxSameAnswers
    ) {

        const limit =

            maxSameAnswers !==
            undefined

                ?

                Math.max(

                    1,

                    Number(
                        maxSameAnswers
                    )

                )

                :

                3;


        let bestPattern =
            [];


        let bestScore =
            Number.POSITIVE_INFINITY;


        for (

            let attempt = 0;

            attempt < 300;

            attempt++

        ) {

            const pattern =
                this.randomAnswerPattern(

                    correctCount,

                    wrongCount

                );


            const maxRun =
                this.getMaxSameRun(
                    pattern
                );


            const score =
                this.patternScore(

                    pattern,

                    maxRun,

                    limit

                );


            if (
                score <
                bestScore
            ) {

                bestScore =
                    score;


                bestPattern =
                    pattern;

            }


            if (
                maxRun <=
                limit
            ) {

                return pattern;

            }

        }


        return bestPattern;

    },


    // =====================================
    // RANDOM ANSWER PATTERN
    // =====================================

    randomAnswerPattern: function (
        correctCount,
        wrongCount
    ) {

        const pattern =
            [];


        for (

            let i = 0;

            i < correctCount;

            i++

        ) {

            pattern.push(
                "بله"
            );

        }


        for (

            let i = 0;

            i < wrongCount;

            i++

        ) {

            pattern.push(
                "خیر"
            );

        }


        return this.shuffle(
            pattern
        );

    },


    // =====================================
    // PATTERN SCORE
    // =====================================

    patternScore: function (
        pattern,
        maxRun,
        limit
    ) {

        let score =
            0;


        if (
            maxRun >
            limit
        ) {

            score +=

                (
                    maxRun -
                    limit
                ) * 100;

        }


        for (

            let i = 1;

            i < pattern.length;

            i++

        ) {

            if (
                pattern[i] ===
                pattern[i - 1]
            ) {

                score++;

            }

        }


        if (
            maxRun >= 3
        ) {

            score +=
                maxRun * 2;

        }


        return score;

    },


    // =====================================
    // MAX SAME RUN
    // =====================================

    getMaxSameRun: function (
        pattern
    ) {

        if (
            !pattern.length
        ) {

            return 0;

        }


        let currentRun =
            1;


        let maxRun =
            1;


        for (

            let i = 1;

            i < pattern.length;

            i++

        ) {

            if (
                pattern[i] ===
                pattern[i - 1]
            ) {

                currentRun++;

            }

            else {

                currentRun =
                    1;

            }


            if (
                currentRun >
                maxRun
            ) {

                maxRun =
                    currentRun;

            }

        }


        return maxRun;

    },


    // =====================================
    // UNIQUE DIVISIBILITY NUMBER
    // =====================================

    getUniqueDivisibilityNumber: function (
        shouldBeDivisible,
        divisor,
        min,
        max,
        usedNumbers
    ) {

        for (

            let attempt = 0;

            attempt < 1000;

            attempt++

        ) {

            const number =

                shouldBeDivisible

                    ?

                    this.randomDivisibleNumber(

                        divisor,

                        min,

                        max

                    )

                    :

                    this.randomNonDivisibleNumber(

                        divisor,

                        min,

                        max

                    );


            if (
                number === null
            ) {

                return null;

            }


            if (
                !usedNumbers.has(
                    number
                )
            ) {

                return number;

            }

        }


        return null;

    },


    // =====================================
    // RANDOM DIVISIBLE
    // =====================================

    randomDivisibleNumber: function (
        divisor,
        min,
        max
    ) {

        const firstMultiple =
            Math.ceil(

                min /
                divisor

            );


        const lastMultiple =
            Math.floor(

                max /
                divisor

            );


        if (
            firstMultiple >
            lastMultiple
        ) {

            return null;

        }


        const multiplier =
            this.randomInteger(

                firstMultiple,

                lastMultiple

            );


        return (

            multiplier *
            divisor

        );

    },


    // =====================================
    // RANDOM NON-DIVISIBLE
    // =====================================

    randomNonDivisibleNumber: function (
        divisor,
        min,
        max
    ) {

        if (
            min > max
        ) {

            return null;

        }


        for (

            let attempt = 0;

            attempt < 200;

            attempt++

        ) {

            const number =
                this.randomInteger(

                    min,

                    max

                );


            if (
                number %
                divisor !==
                0
            ) {

                return number;

            }

        }


        return null;

    },


    // =====================================
    // MIXED QUIZ
    // =====================================

    getMixedQuestions: async function (
        activityData
    ) {

        const settings =
            activityData.settings || {};


        const total =
            Math.max(

                1,

                Number(
                    settings.questions
                ) || 1

            );


        const bankCount =
            Math.max(

                0,

                Math.min(

                    Number(
                        settings.bankQuestions
                    )

                    ||

                    Math.floor(
                        total / 2
                    ),

                    total

                )

            );


        const generatedCount =
            Math.max(

                0,

                total -
                bankCount

            );


        let bankQuestions =
            [];


        if (
            bankCount > 0
        ) {

            bankQuestions =
                await this.loadFromFile(
                    activityData
                );


            bankQuestions =
                this.takeRandomUnique(

                    bankQuestions,

                    bankCount

                );

        }


        let generatedQuestions =
            [];


        if (
            generatedCount > 0
        ) {

            generatedQuestions =
                this.generateQuestions({

                    ...activityData,

                    settings: {

                        ...settings,

                        questions:
                            generatedCount

                    }

                });

        }


        const combined =
            this.shuffle([

                ...bankQuestions,

                ...generatedQuestions

            ]).slice(

                0,

                total

            );


        console.log(
            "Mixed Quiz Questions:",
            combined.length
        );


        return combined;

    },


    // =====================================
    // TAKE RANDOM UNIQUE
    // =====================================

    takeRandomUnique: function (
        array,
        count
    ) {

        if (
            !Array.isArray(
                array
            )
        ) {

            return [];

        }


        const shuffled =
            this.shuffle(
                array
            );


        return shuffled.slice(

            0,

            Math.max(

                0,

                Number(count) || 0

            )

        );

    },


    // =====================================
    // RANDOM NUMBER
    // =====================================

    randomNumber: function (
        min,
        max
    ) {

        return this.randomInteger(

            min,

            max

        );

    },


    // =====================================
    // RANDOM INTEGER
    // =====================================

    randomInteger: function (
        min,
        max
    ) {

        min =
            Math.ceil(
                Number(min)
            );


        max =
            Math.floor(
                Number(max)
            );


        if (

            !Number.isFinite(
                min
            )

            ||

            !Number.isFinite(
                max
            )

        ) {

            return 1;

        }


        if (
            min > max
        ) {

            const temp =
                min;


            min =
                max;


            max =
                temp;

        }


        return Math.floor(

            Math.random() *

            (

                max -
                min +
                1

            )

        ) + min;

    },


    // =====================================
    // SHUFFLE
    // =====================================

    shuffle: function (
        array
    ) {

        if (
            !Array.isArray(
                array
            )
        ) {

            return [];

        }


        const list =
            [
                ...array
            ];


        for (

            let i =
                list.length - 1;

            i > 0;

            i--

        ) {

            const j =
                Math.floor(

                    Math.random() *
                    (
                        i + 1
                    )

                );


            const temp =
                list[i];


            list[i] =
                list[j];


            list[j] =
                temp;

        }


        return list;

    },


    // =====================================
    // GET LAST SOURCE
    // =====================================

    getLastSource: function () {

        return this.lastSource;

    },


    // =====================================
    // GET LAST QUESTIONS
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

    }

};


// =====================================
// GLOBAL
// =====================================

window.QuizProvider =
    QuizProvider;


// =====================================
// READY
// =====================================

console.log(
    "Quiz Provider v1.0 Ready"
);