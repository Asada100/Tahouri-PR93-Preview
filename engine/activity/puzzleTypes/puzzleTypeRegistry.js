// =====================================
// Tahouri Edu Platform
// Puzzle Type Registry
// Version 1.0
// =====================================

const PuzzleTypeRegistry = {

    types: {},


    register: function (type, handler) {

        if (!type || !handler) {

            console.error(
                "Puzzle Type Registry: Invalid Registration",
                type
            );

            return false;

        }

        this.types[type] = handler;

        console.log(
            "Puzzle Type Registered:",
            type
        );

        return true;
    },


    get: function (type) {

        return this.types[type] || null;

    },


    has: function (type) {

        return Boolean(
            this.types[type]
        );

    },


    list: function () {

        return Object.keys(
            this.types
        );

    }

};


window.PuzzleTypeRegistry =
    PuzzleTypeRegistry;


console.log(
    "Puzzle Type Registry v1.0 Ready"
);