// =====================================
// Tahouri Edu Platform
// Spelling Rules Registry
// Version 1.0
// =====================================

(function (window) {
    "use strict";

    const RULES = {
        "s-sad-se": { id: "s-sad-se", sound: "س", letters: ["س", "ص", "ث"] },
        "z": { id: "z", sound: "ز", letters: ["ز", "ذ", "ض", "ظ"] },
        "t": { id: "t", sound: "ت", letters: ["ت", "ط"] },
        "h": { id: "h", sound: "ه", "letters": ["ه", "ح"] },
        "gh": { id: "gh", sound: "ق/غ", letters: ["ق", "غ"] }
    };

    const SpellingRules = {
        get: function (id) {
            return id && RULES[id] ? { ...RULES[id] } : null;
        },
        getLetters: function (id) {
            const rule = this.get(id);
            return rule ? rule.letters.slice() : [];
        },
        all: function () {
            return JSON.parse(JSON.stringify(RULES));
        }
    };

    window.SpellingRules = SpellingRules;
})(window);

console.log("Spelling Rules v1.0 Ready");
