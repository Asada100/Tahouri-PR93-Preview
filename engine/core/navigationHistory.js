// =====================================
// Tahouri Edu Platform
// Version 4.5
// Navigation History
// Persistent Stack
// =====================================

const NavigationHistory = {

    stack: [],


    // =====================================
    // Push
    // =====================================

    push: function(page, data) {

        this.stack.push({

            page: page,

            data: data

        });


        console.log(
            "History Added:",
            page,
            data
        );

    },


    // =====================================
    // Back
    // =====================================

    back: function() {

        if(this.stack.length <= 1) {

            return null;

        }


        this.stack.pop();


        const previous =
            this.stack[
                this.stack.length - 1
            ];


        console.log(
            "Back To:",
            previous
        );


        return previous;

    },


    // =====================================
    // Current
    // =====================================

    current: function() {

        if(this.stack.length === 0) {

            return null;

        }


        return this.stack[
            this.stack.length - 1
        ];

    },


    // =====================================
    // Clear
    // =====================================

    clear: function() {

        this.stack = [];


        console.log(
            "Navigation History Cleared"
        );

    },


    // =====================================
    // Debug
    // =====================================

    debug: function() {

        console.log(
            "Navigation History:",
            this.stack
        );

    }

};


// =====================================
// Global Access
// =====================================

window.NavigationHistory =
    NavigationHistory;


// =====================================
// Ready
// =====================================

console.log(
    "Navigation History Ready"
);