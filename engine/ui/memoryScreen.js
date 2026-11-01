// =====================================
// Tahouri Edu Platform
// Version 1.1
// Memory Screen
//
// Responsible for:
// - Memory UI Rendering
// - Card Display
// - Card Interaction
//
// Execution remains in MemoryEngine
//
// Architecture:
// MemoryScreen
//     ↓
// MemoryEngine
// =====================================


const MemoryScreen = {


    // =====================================
    // SHOW
    // =====================================

    show: function (data) {

        if (!data) {

            console.error(
                "Memory Screen: Data Missing"
            );

            return;

        }


        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Memory Screen: App Container Not Found"
            );

            return;

        }


        const cards =
            Array.isArray(
                data.cards
            )
                ? data.cards
                : [];


        app.innerHTML = `

            <div
                class="memoryScreen"
                dir="rtl">

                <h1>

                    پلتفرم آموزشی طهوری

                </h1>


                <hr>


                <h2>

                    ${data.title || "بازی حافظه"}

                </h2>


                <div
                    class="scoreBox">

                    امتیاز:

                    ${
                        typeof ScoreManager !==
                        "undefined"

                            ?

                            ScoreManager.score

                            :

                            0
                    }

                </div>


                <div
                    id="memoryBoard"
                    class="memoryBoard">

                    ${
                        cards
                            .map(
                                function (card) {

                                    return `

                                        <button
                                            class="memoryCard"
                                            data-id="${card.id}">

                                            ${
                                                card.flipped ||
                                                card.matched

                                                    ?

                                                    card.value

                                                    :

                                                    "❓"
                                            }

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <div
                    id="memoryMessage"
                    class="memoryMessage">
                </div>


            </div>

        `;


        this.bindCards();

    },


    // =====================================
    // BIND CARDS
    // =====================================

    bindCards: function () {

        const cards =
            document.querySelectorAll(
                ".memoryCard"
            );


        if (!cards.length) {

            console.warn(
                "Memory Screen: No Cards Found"
            );

            return;

        }


        cards.forEach(
            function (card) {

                card.onclick =
                    function () {

                        const rawId =
                            this.dataset.id;


                        const id =
                            isNaN(
                                Number(rawId)
                            )

                                ?

                                rawId

                                :

                                Number(rawId);


                        MemoryScreen.selectCard(
                            id
                        );

                    };

            }
        );


        console.log(
            "Memory Screen Cards Connected:",
            cards.length
        );

    },


    // =====================================
    // SELECT CARD
    // =====================================

    selectCard: function (
        id
    ) {

        if (
            typeof MemoryEngine ===
            "undefined"
        ) {

            console.error(
                "MemoryEngine Not Available"
            );

            return;

        }


        MemoryEngine.flipCard(
            id
        );

    },


    // =====================================
    // RESET
    // =====================================

    reset: function () {

        console.log(
            "Memory Screen Reset"
        );

    }

};


// =====================================
// GLOBAL
// =====================================

window.MemoryScreen =
    MemoryScreen;


// =====================================
// READY
// =====================================

console.log(
    "Memory Screen v1.1 Ready"
);