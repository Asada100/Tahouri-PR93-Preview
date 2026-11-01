// =====================================
// Tahouri Edu Platform
// Matching Type Registry
// Version 1.0
//
// Responsibilities:
// - Register Matching types
// - Retrieve Matching handlers
// - Keep type routing separate from MatchingEngine
//
// Design:
// - Generic
// - Subject-agnostic
// - No rendering
// - No educational content logic
// =====================================


const MatchingTypeRegistry = {


    types: {},


    register: function (type, handler) {

        if (!type || !handler) {

            console.error(
                "Matching Type Registry: Invalid Registration",
                type
            );

            return false;

        }

        this.types[type] = handler;

        console.log(
            "Matching Type Registered:",
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


window.MatchingTypeRegistry =
    MatchingTypeRegistry;


console.log(
    "Matching Type Registry v1.0 Ready"
);