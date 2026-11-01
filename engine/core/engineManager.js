// =====================================
// Tahouri Edu Platform
// Engine Manager
// Version 1.6
// Engine Name Resolver
// Quiz + Memory + Puzzle + Matching + Classification + Dictation
// =====================================


const EngineManager = {


    engines: {},


    // =====================================
    // Register Engine
    // =====================================

    register: function(id, engine) {

        if(engine){

            this.engines[id] =
                engine;

            console.log(
                "Engine Registered:",
                id
            );

        }

    },


    // =====================================
    // Get Engine
    // =====================================

    getEngine: function(id) {

        if(!id){

            return null;

        }


        if(
            this.engines[id]
        ){

            return this.engines[id];

        }


        const normalized =

            id
            .replace("Engine", "")
            .toLowerCase();


        if(
            this.engines[normalized]
        ){

            return this.engines[
                normalized
            ];

        }


        return null;

    },


    // =====================================
    // Initialize
    // =====================================

    init: function() {


        // =================================
        // Quiz Engine
        // =================================

        if(
            window.QuizEngine
        ){

            this.register(
                "quiz",
                window.QuizEngine
            );

        }


        // =================================
        // Memory Engine
        // =================================

        if(
            window.MemoryEngine
        ){

            this.register(
                "memory",
                window.MemoryEngine
            );

        }


        // =================================
        // Puzzle Engine
        // =================================

        if(
            window.PuzzleEngine
        ){

            this.register(
                "puzzle",
                window.PuzzleEngine
            );

        }


        // =================================
        // Matching Engine
        // =================================

        if(
            window.MatchingEngine
        ){

            this.register(
                "matching",
                window.MatchingEngine
            );

        }


        // =================================
        // Classification Engine
        // =================================

        if(
            window.ClassificationEngine
        ){

            this.register(
                "classification",
                window.ClassificationEngine
            );

        }


        // =================================
        // Word Puzzle Engine
        // =================================
        if(window.WordPuzzleEngine){ this.register("wordPuzzle", window.WordPuzzleEngine); }

        // =================================
        // Composite Activity Engine
        // =================================
        if (window.CompositeActivityEngine) {
            this.register("composite", window.CompositeActivityEngine);
        }

        // =================================
        // Dictation Engine
        // =================================
        if(
            window.DictationEngine
        ){
            this.register(
                "dictation",
                window.DictationEngine
            );
        }


        console.log(
            "Engine Manager Initialized"
        );

    }

};


// =====================================
// Global Access
// =====================================

window.EngineManager =
    EngineManager;


// =====================================
// Ready
// =====================================

console.log(
    "Engine Manager Ready"
);


// =====================================
// Initialize
// =====================================

EngineManager.init();