// =====================================
// Tahouri Edu Platform
// Basic Matching Handler
// Version 1.1
//
// Responsibilities:
// - Define the base Matching type
// - Accept normalized generic relations
// - Preserve unique right-side options
//
// Design:
// - Subject-agnostic
// - One left item -> one correct right target
// - Many left items -> same right target is supported
// - No rendering
// - No game-state management
// =====================================

const BasicMatching = {

    type: "basic",

    prepare: function (data) {
        if (!data || !Array.isArray(data.pairs)) {
            console.error("Basic Matching: Invalid Data");
            return null;
        }

        if (data.pairs.length === 0) {
            console.error("Basic Matching: No Pairs Available");
            return null;
        }

        const rightItems = [];
        const rightIds = Object.create(null);

        data.pairs.forEach(function (pair) {
            const rightId = String(pair.right.id);

            if (!rightIds[rightId]) {
                rightIds[rightId] = true;
                rightItems.push({ ...pair.right });
            }
        });

        return {
            type: "basic",
            matchingType: "basic",
            instruction: data.instruction || "",
            pairs: data.pairs.map(function (pair) {
                return {
                    id: pair.id,
                    left: { ...pair.left },
                    right: { ...pair.right }
                };
            }),
            leftItems: Array.isArray(data.leftItems)
                ? data.leftItems.map(function (item) { return { ...item }; })
                : data.pairs.map(function (pair) { return { ...pair.left }; }),
            rightItems: rightItems
        };
    }
};

window.BasicMatching = BasicMatching;

MatchingTypeRegistry.register("basic", BasicMatching);

console.log("Basic Matching v1.1 Ready");