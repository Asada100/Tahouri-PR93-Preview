// =====================================
// Tahouri Edu Platform
// Version 6.1
// Components Manager
//
// Responsibilities:
// - Shared Dashboard Button
// - Shared Home Button
//
// Quiz interaction:
// QuizScreen
//
// Memory interaction:
// MemoryScreen
//
// Architecture:
// QuizScreen -> QuizEngine
// MemoryScreen -> MemoryEngine
// Components -> Shared UI interactions
// =====================================


const Components = {


    // =====================================
    // DASHBOARD BUTTON
    // =====================================

    bindDashboardButton: function () {

        const dashboardBtn =
            document.getElementById(
                "dashboardBtn"
            );


        if (!dashboardBtn) {

            console.log(
                "Dashboard Button Not Found"
            );

            return;

        }


        dashboardBtn.onclick =
            function () {

                Navigation.openDashboard();

            };


        console.log(
            "Dashboard Button Connected"
        );

    },


    // =====================================
    // HOME BUTTON
    // =====================================

    bindHomeButton: function () {

        const homeBtn =
            document.getElementById(
                "homeBtn"
            );


        if (!homeBtn) {

            return;

        }


        homeBtn.onclick =
            function () {

                if (
                    typeof App !==
                    "undefined"

                    &&

                    typeof App.goHome ===
                    "function"
                ) {

                    App.goHome();

                    return;

                }


                if (
                    typeof Screen !==
                    "undefined"

                    &&

                    typeof Screen.showHome ===
                    "function"
                ) {

                    Screen.showHome();

                    return;

                }


                console.warn(
                    "Home Navigation Not Available"
                );

            };

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.Components =
    Components;


// =====================================
// READY
// =====================================

console.log(
    "Components Manager v6.1 Ready"
);