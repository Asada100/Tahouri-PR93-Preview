// =====================================
// Tahouri Edu Platform
// Spelling Performance Analyzer
// Version 2.0
// =====================================
(function (window) {
    "use strict";

    function resolveRecords(source, level) {
        if (Array.isArray(source)) return source;
        if (!source || typeof source !== "object") return [];
        if (level === "target" && Array.isArray(source.targetAnswers)) return source.targetAnswers;
        if (level === "question" && Array.isArray(source.answers)) return source.answers;
        if (Array.isArray(source.records)) return source.records;
        if (Array.isArray(source.answers)) return source.answers;
        if (Array.isArray(source.targetAnswers)) return source.targetAnswers;
        return [];
    }

    function createBucket(extra) {
        return Object.assign({
            attempts: 0,
            completed: 0,
            characterErrors: 0,
            errorAttempts: 0,
            completionRate: 0,
            averageCharacterErrors: 0,
            errorRate: 0
        }, extra || {});
    }

    function addRecord(bucket, record) {
        bucket.attempts++;
        if (record.completed) bucket.completed++;

        const errors = Math.max(0, Number(record.characterErrors) || 0);
        bucket.characterErrors += errors;

        if (errors > 0) bucket.errorAttempts++;
    }

    function finalize(bucket) {
        bucket.completionRate = bucket.attempts
            ? bucket.completed / bucket.attempts
            : 0;

        bucket.averageCharacterErrors = bucket.attempts
            ? bucket.characterErrors / bucket.attempts
            : 0;

        bucket.errorRate = bucket.attempts
            ? bucket.errorAttempts / bucket.attempts
            : 0;

        return bucket;
    }

    const SpellingPerformanceAnalyzer = {
        version: "2.0",

        getRecords: function (source, level) {
            return resolveRecords(source, level);
        },

        analyze: function (records) {
            const list = resolveRecords(records);
            const byRule = {};
            const byTarget = {};

            list.forEach(function (record) {
                if (!record) return;

                const rule = record.spellingRule || "unclassified";
                const target = record.target || "unknown";

                const ruleBucket = byRule[rule] || (
                    byRule[rule] = createBucket({ rule: rule })
                );

                const targetBucket = byTarget[target] || (
                    byTarget[target] = createBucket({
                        target: target,
                        rule: rule
                    })
                );

                addRecord(ruleBucket, record);
                addRecord(targetBucket, record);
            });

            Object.keys(byRule).forEach(function (id) {
                finalize(byRule[id]);
            });

            Object.keys(byTarget).forEach(function (id) {
                finalize(byTarget[id]);
            });

            return {
                total: list.length,
                byRule: byRule,
                byTarget: byTarget
            };
        },

        analyzeSession: function (session) {
            const questions = resolveRecords(session, "question");
            const targets = resolveRecords(session, "target");

            return {
                questions: this.analyze(questions),
                targets: this.analyze(targets)
            };
        },

        rankRules: function (records) {
            const analysis = this.analyze(records);

            return Object.keys(analysis.byRule)
                .map(function (id) {
                    return analysis.byRule[id];
                })
                .sort(function (a, b) {
                    return (
                        b.averageCharacterErrors -
                        a.averageCharacterErrors
                    ) || (
                        b.errorRate -
                        a.errorRate
                    ) || (
                        a.completionRate -
                        b.completionRate
                    );
                });
        },

        rankTargets: function (records) {
            const analysis = this.analyze(
                resolveRecords(records, "target")
            );

            return Object.keys(analysis.byTarget)
                .map(function (id) {
                    return analysis.byTarget[id];
                })
                .sort(function (a, b) {
                    return (
                        b.averageCharacterErrors -
                        a.averageCharacterErrors
                    ) || (
                        b.errorRate -
                        a.errorRate
                    ) || (
                        a.completionRate -
                        b.completionRate
                    );
                });
        },

        getWeakRules: function (records) {
            return this.rankRules(records).filter(function (item) {
                return item.characterErrors > 0;
            });
        },

        getWeakTargets: function (records) {
            return this.rankTargets(records).filter(function (item) {
                return item.characterErrors > 0;
            });
        },

        getRulePerformance: function (records, rule) {
            const analysis = this.analyze(records);
            return analysis.byRule[rule] || null;
        },

        getTargetPerformance: function (records, target) {
            const analysis = this.analyze(records);
            return analysis.byTarget[target] || null;
        },

        summarize: function (records) {
            const analysis = this.analyze(records);

            return {
                total: analysis.total,
                rules: Object.keys(analysis.byRule).length,
                targets: Object.keys(analysis.byTarget).length,
                weakRules: this.getWeakRules(records),
                weakTargets: this.getWeakTargets(records)
            };
        },

        summarizeSession: function (session) {
            const questions = resolveRecords(session, "question");
            const targets = resolveRecords(session, "target");

            return {
                questionCount: questions.length,
                targetCount: targets.length,
                questions: this.analyze(questions),
                targets: this.analyze(targets),
                weakRules: this.getWeakRules(questions),
                weakTargets: this.getWeakTargets(targets)
            };
        }
    };

    window.SpellingPerformanceAnalyzer = SpellingPerformanceAnalyzer;

    if (typeof console !== "undefined") {
        console.log("Spelling Performance Analyzer v2.0 Ready");
    }
})(window);
