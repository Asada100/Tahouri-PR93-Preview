// =====================================
// Tahouri Edu Platform
// Spelling Smart Question Selector
// Version 1.0
// Skill-aware ordering for spelling only
// =====================================
(function (window) {
    "use strict";

    const SpellingSmartQuestionSelector = {
        version: "1.0",

        getPerformance: function () {
            if (
                !window.SpellingPerformanceStore ||
                typeof window.SpellingPerformanceStore.getPerformance !== "function"
            ) {
                return null;
            }

            try {
                return window.SpellingPerformanceStore.getPerformance();
            } catch (error) {
                console.warn(
                    "SpellingSmartQuestionSelector: performance lookup failed",
                    error
                );
                return null;
            }
        },

        getPriority: function (item, analysis) {
            if (!item || !analysis) return 50;

            const target = String(item.answer || "");
            const rule = item.spellingRule || "unclassified";

            const targetPerformance =
                analysis.byTarget && analysis.byTarget[target];

            const rulePerformance =
                analysis.byRule && analysis.byRule[rule];

            let priority = 50;

            if (targetPerformance) {
                priority += Math.min(
                    40,
                    Math.round(targetPerformance.averageCharacterErrors * 20)
                );

                if (targetPerformance.errorRate > 0) {
                    priority += 15;
                }
            } else if (rulePerformance) {
                priority += Math.min(
                    30,
                    Math.round(rulePerformance.averageCharacterErrors * 15)
                );

                if (rulePerformance.errorRate > 0) {
                    priority += 10;
                }
            } else {
                // Unseen material remains important, but does not
                // displace repeatedly difficult material.
                priority = 50;
            }

            return Math.min(100, Math.max(0, priority));
        },

        select: function (items, performance) {
            if (!Array.isArray(items) || items.length < 2) {
                return Array.isArray(items) ? items.slice() : [];
            }

            if (
                !window.SpellingPerformanceAnalyzer ||
                typeof window.SpellingPerformanceAnalyzer.analyze !== "function"
            ) {
                return items.slice();
            }

            const source =
                performance || this.getPerformance();

            if (!source) {
                return items.slice();
            }

            const records =
                Array.isArray(source)
                    ? source
                    : (
                        Array.isArray(source.targetAnswers) && source.targetAnswers.length
                            ? source.targetAnswers
                            : Array.isArray(source.answers)
                                ? source.answers
                                : []
                    );

            if (!Array.isArray(records) || !records.length) {
                return items.slice();
            }

            const analysis =
                window.SpellingPerformanceAnalyzer.analyze(records);

            return items
                .map(function (item, index) {
                    return {
                        item: item,
                        index: index,
                        priority:
                            SpellingSmartQuestionSelector.getPriority(
                                item,
                                analysis
                            )
                    };
                })
                .sort(function (a, b) {
                    return (
                        b.priority - a.priority
                    ) || (
                        a.index - b.index
                    );
                })
                .map(function (entry) {
                    return entry.item;
                });
        }
    };

    window.SpellingSmartQuestionSelector =
        SpellingSmartQuestionSelector;

    console.log("Spelling Smart Question Selector v1.0 Ready");
})(window);
