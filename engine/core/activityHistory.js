// =====================================
// Tahouri Edu Platform
// Version 4.4
// Activity History Manager
// Persistent Continue Learning
// =====================================


const ActivityHistory = {


// =====================================
// Storage Key
// =====================================

    storageKey:
        "Tahouri_ActivityHistory",



// =====================================
// Current Activity
// =====================================

    currentActivity: null,



// =====================================
// Initialize
// =====================================

    init: function () {

        try {

            const saved =
                localStorage.getItem(
                    this.storageKey
                );


            if (!saved) {

                console.log(
                    "No Activity History Found"
                );

                return;

            }


            const activity =
                JSON.parse(saved);


            if (activity) {

                this.currentActivity =
                    activity;


                console.log(
                    "Activity History Loaded:",
                    activity.id
                );

            }


        } catch (error) {

            console.error(
                "Activity History Load Error:",
                error
            );


            this.currentActivity =
                null;

        }

    },



// =====================================
// Set Activity
// =====================================

    set: function (activity) {


        if (!activity) {

            console.error(
                "Invalid Activity History Data"
            );

            return false;

        }


        this.currentActivity =
            activity;


        try {

            localStorage.setItem(

                this.storageKey,

                JSON.stringify(activity)

            );


            console.log(
                "Activity History Saved:",
                activity.id
            );


            return true;


        } catch (error) {

            console.error(
                "Activity History Save Error:",
                error
            );


            return false;

        }

    },



// =====================================
// Get Activity
// =====================================

    get: function () {

        return this.currentActivity;

    },



// =====================================
// Clear History
// =====================================

    clear: function () {


        this.currentActivity =
            null;


        try {

            localStorage.removeItem(
                this.storageKey
            );


        } catch (error) {

            console.error(
                "Activity History Clear Error:",
                error
            );

        }


        console.log(
            "Activity History Cleared"
        );

    }

};



// =====================================
// Initialize History
// =====================================

ActivityHistory.init();



// =====================================
// Global Access
// =====================================

window.ActivityHistory =
    ActivityHistory;



// =====================================
// Ready
// =====================================

console.log(
    "Activity History Ready"
);