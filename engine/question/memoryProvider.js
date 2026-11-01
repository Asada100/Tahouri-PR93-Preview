// =====================================
// Tahouri Edu Platform
// Version 1.0
// Memory Provider
//
// Extracted from:
// QuestionProvider v4.5
//
// Responsibilities:
// - Memory content loading
// - Memory card normalization
// - Generated memory cards
// - Mixed memory cards
// - Shared memory data utilities
//
// Important:
// - MemoryEngine is NOT changed.
// - QuestionProvider is NOT changed yet.
// - This Provider is prepared for the
//   new Provider architecture.
// =====================================


const MemoryProvider = {


    // =====================================
    // STATE
    // =====================================

    lastSource: null,

    lastCards: [],


    // =====================================
    // MAIN MEMORY ENTRY
    // =====================================

    getMemoryCards: async function (
        activityData
    ) {

        if (
            !activityData
        ) {

            console.error(
                "MemoryProvider: Activity Data Missing"
            );

            return [];

        }


        const settings =
            activityData.settings || {};


        const source =
            settings.cardSource ||
            settings.questionSource ||
            "file";


        console.log(
            "MemoryProvider Source:",
            source
        );


        // =================================
        // FILE
        // =================================

        if (
            source === "file"
        ) {

            const cards =
                await this.loadMemoryCards(
                    activityData
                );


            this.lastSource =
                "file";


            this.lastCards =
                cards;


            return cards;

        }


        // =================================
        // GENERATED
        // =================================

        if (
            source === "generated"
        ) {

            const cards =
                this.generateMemoryCards(
                    activityData
                );


            this.lastSource =
                "generated";


            this.lastCards =
                cards;


            return cards;

        }


        // =================================
        // MIXED
        // =================================

        if (
            source === "mixed"
        ) {

            const cards =
                await this.getMixedMemoryCards(
                    activityData
                );


            this.lastSource =
                "mixed";


            this.lastCards =
                cards;


            return cards;

        }


        console.warn(
            "MemoryProvider: Unknown Source:",
            source
        );


        this.lastSource =
            null;


        this.lastCards =
            [];


        return [];

    },


    // =====================================
    // LOAD MEMORY CARDS
    // =====================================

    loadMemoryCards: async function (
        activityData
    ) {

        try {

            // =================================
            // DataManager Check
            // =================================

            if (
                typeof DataManager ===
                "undefined"
            ) {

                console.error(
                    "MemoryProvider: DataManager Not Available"
                );

                return [];

            }


            // =================================
            // Load Cards
            // =================================

            const cards =
                await DataManager.getCards(
                    activityData
                );


            // =================================
            // Validate
            // =================================

            if (
                !Array.isArray(
                    cards
                )
            ) {

                console.error(
                    "MemoryProvider: Invalid Memory Cards"
                );

                return [];

            }


            // =================================
            // Normalize
            // =================================

            const normalized =
                cards.map(
                    function (
                        card,
                        index
                    ) {

                        return {

                            id:

                                card.id !==
                                undefined

                                    ?

                                    card.id

                                    :

                                    `card_${index}`,

                            value:
                                card.value,

                            pairId:

                                card.pairId !==
                                undefined

                                    ?

                                    card.pairId

                                    :

                                    card.value,

                            dataType:

                                card.dataType ||

                                "text"

                        };

                    }
                );


            // =================================
            // Shuffle
            // =================================

            const shuffled =
                this.shuffle(
                    normalized
                );


            console.log(
                "MemoryProvider: Cards Loaded:",
                shuffled.length
            );


            return shuffled;

        }

        catch (
            error
        ) {

            console.error(
                "MemoryProvider: Memory Card Load Error:",
                error
            );


            return [];

        }

    },


    // =====================================
    // GENERATED MEMORY CARDS
    // =====================================

    generateMemoryCards: function (
        activityData
    ) {

        const settings =
            activityData.settings || {};


        // =================================
        // Pairs
        // =================================

        const pairs =
            Math.max(

                1,

                Number(
                    settings.pairs
                ) || 4

            );


        // =================================
        // Values
        // =================================

        const values =
            Array.isArray(
                settings.values
            )

                ?

                [...settings.values]

                :

                [];


        if (
            values.length <
            pairs
        ) {

            console.warn(
                "MemoryProvider: Generated Values Missing"
            );


            return [];

        }


        // =================================
        // Build Cards
        // =================================

        const cards =
            [];


        for (

            let i = 0;

            i < pairs;

            i++

        ) {

            const value =
                values[i];


            // =================================
            // First Card
            // =================================

            cards.push({

                id:
                    `memory_${i}_a`,

                value:
                    value,

                pairId:
                    `pair_${i}`,

                dataType:

                    this.detectDataType([

                        value

                    ])

            });


            // =================================
            // Second Card
            // =================================

            cards.push({

                id:
                    `memory_${i}_b`,

                value:
                    value,

                pairId:
                    `pair_${i}`,

                dataType:

                    this.detectDataType([

                        value

                    ])

            });

        }


        const shuffled =
            this.shuffle(
                cards
            );


        console.log(
            "MemoryProvider: Generated Cards:",
            shuffled.length
        );


        return shuffled;

    },


    // =====================================
    // MIXED MEMORY
    // =====================================

    getMixedMemoryCards: async function (
        activityData
    ) {

        const settings =
            activityData.settings || {};


        const totalPairs =
            Math.max(

                1,

                Number(
                    settings.pairs
                ) || 4

            );


        const bank =
            await this.loadMemoryCards(
                activityData
            );


        const generated =
            this.generateMemoryCards(
                activityData
            );


        const combined =
            this.shuffle([

                ...bank,

                ...generated

            ]);


        // =================================
        // Optional Pair Limit
        // =================================
        //
        // We preserve the existing
        // behavior of the old Provider:
        // both sources are combined.
        //
        // No aggressive slicing here,
        // because a pair consists of
        // multiple cards.
        // =================================

        const minimumExpectedCards =
            totalPairs * 2;


        if (
            combined.length <
            minimumExpectedCards
        ) {

            console.warn(
                "MemoryProvider: Mixed Cards Below Expected Pair Count:",
                combined.length,
                minimumExpectedCards
            );

        }


        console.log(
            "MemoryProvider: Mixed Cards:",
            combined.length
        );


        return combined;

    },


    // =====================================
    // DATA TYPE
    // =====================================

    detectDataType: function (
        items
    ) {

        if (
            !Array.isArray(
                items
            )
        ) {

            return "text";

        }


        if (
            items.length === 0
        ) {

            return "text";

        }


        // =================================
        // Image
        // =================================

        if (
            items.every(
                function (
                    item
                ) {

                    return (

                        typeof item ===
                        "string"

                        &&

                        (

                            /\.(png|jpg|jpeg|gif|webp|svg)$/i
                                .test(
                                    item
                                )

                            ||

                            item.startsWith(
                                "data:image/"
                            )

                        )

                    );

                }
            )
        ) {

            return "image";

        }


        // =================================
        // Number
        // =================================

        if (
            items.every(
                function (
                    item
                ) {

                    return (
                        typeof item ===
                        "number"
                    );

                }
            )
        ) {

            return "number";

        }


        return "text";

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
    // LAST SOURCE
    // =====================================

    getLastSource: function () {

        return this.lastSource;

    },


    // =====================================
    // LAST CARDS
    // =====================================

    getLastCards: function () {

        return this.lastCards;

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        this.lastSource =
            null;


        this.lastCards =
            [];

    }

};


// =====================================
// GLOBAL
// =====================================

window.MemoryProvider =
    MemoryProvider;


// =====================================
// READY
// =====================================

console.log(
    "Memory Provider v1.0 Ready"
);