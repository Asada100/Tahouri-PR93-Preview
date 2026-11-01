// =====================================
// Tahouri Edu Platform
// Dictation Provider
// Version 2.1
// =====================================

(function (window) {
    "use strict";

    const DictationProvider = {
        orderByPerformance: function (questions) {
            // Keep the provider's order intact.
            // Explicit randomization is handled by DictationEngine settings,
            // while generated spelling content may already be ordered by
            // SpellingSmartQuestionSelector.
            return Array.isArray(questions) ? questions.slice() : [];
        },

        getContent: function (activityData) {
            const source = activityData && activityData.dictation
                ? activityData.dictation
                : activityData && activityData.content
                    ? activityData.content
                    : activityData || {};

            const settings = {
                keyboardMode: "guided",
                allowRetry: true,
                scorePerCorrect: 10,
                ...(source.settings || {}),
                ...((activityData && activityData.settings) || {})
            };

            const generatedQuestions =
                source.generator && window.SpellingQuestionGenerator &&
                typeof window.SpellingQuestionGenerator.generate === "function"
                    ? window.SpellingQuestionGenerator.generate({
                        ...source.generator,
                        instruction: source.instruction || "املای کلمات را کامل کنید.",
                        lesson: source.lesson || null,
                        performance: window.SpellingPerformanceStore && typeof window.SpellingPerformanceStore.getPerformance === "function"
                            ? window.SpellingPerformanceStore.getPerformance()
                            : source.generator.performance || null
                    })
                    : [];

            const rawQuestions = generatedQuestions.length
                ? generatedQuestions
                : Array.isArray(source.questions)
                    ? source.questions
                    : Array.isArray(source.words)
                        ? source.words.map(function (item) {
                            return { ...item, mode: item.mode || "guided-word" };
                        })
                        : [];

            const orderedQuestions = this.orderByPerformance(rawQuestions);

            const questions = orderedQuestions
                .filter(function (item) {
                    return item && ((typeof item.answer === "string" && item.answer.trim() !== "") ||
                        (item.mode === "context" && Array.isArray(item.targets) && item.targets.length > 0) ||
                        ((item.mode === "error-hunt" || source.mode === "error-hunt") && ((Array.isArray(item.errors) && item.errors.length > 0) || (Array.isArray(item.dynamicErrorPool) && item.dynamicErrorPool.length > 0))));
                })
                .map(function (item, index) {
                    const missing = Array.isArray(item.missing)
                        ? item.missing.map(function (slot) {
                            return {
                                start: Math.max(0, Number(slot.start) || 0),
                                length: Math.max(1, Number(slot.length) || 1),
                                answer: slot.answer || null
                            };
                        })
                        : [];

                    let mode = item.mode || source.mode || "guided-word";
                    if (!["missing-letter", "guided-word", "context", "error-hunt"].includes(mode)) mode = "guided-word";

                    if (mode === "missing-letter" && missing.length === 0) {
                        mode = "guided-word";
                    }
                    // Context mode is full phrase dictation. It may intentionally
                    // have no targets/missing slots because the learner writes the
                    // complete hidden phrase from listening.

                    return {
                        id: item.id || "spelling-question-" + (index + 1),
                        mode: mode,
                        answer: typeof item.answer === "string"
                            ? item.answer.trim()
                            : (Array.isArray(item.targets) && item.targets[0] && typeof item.targets[0].answer === "string"
                                ? item.targets[0].answer.trim() : ""),
                        prompt: item.prompt || source.instruction || "املای کلمه را کامل کن.",
                        context: item.context || null,
                        verseText: item.verseText || null,
                        wrongWord: item.wrongWord || null,
                        dynamicErrorPool: Array.isArray(item.dynamicErrorPool) ? item.dynamicErrorPool.map(function (candidate) {
                            return {
                                wordIndex: Number(candidate.wordIndex),
                                correctWord: String(candidate.correctWord || "").trim(),
                                wrongVariants: Array.isArray(candidate.wrongVariants) ? candidate.wrongVariants.map(function (value) { return String(value || "").trim(); }).filter(Boolean) : [],
                                spellingRule: candidate.spellingRule || ""
                            };
                        }).filter(function (candidate) {
                            return Number.isInteger(candidate.wordIndex) && candidate.wordIndex >= 0 && candidate.correctWord && candidate.wrongVariants.length > 0;
                        }) : [],
                        errors: Array.isArray(item.errors) ? item.errors.map(function (error) {
                            return {
                                wrongWord: String(error.wrongWord || ""),
                                answer: String(error.answer || "").trim(),
                                spellingRule: error.spellingRule || item.spellingRule || null
                            };
                        }).filter(function (error) {
                            return error.wrongWord && error.answer && error.wrongWord !== error.answer;
                        }) : [],
                        explanation: item.explanation || null,
                        contextTemplate: item.contextTemplate || item.context || null,
                        masked: item.masked || null,
                        missing: missing,
                        allowedLetters: Array.isArray(item.allowedLetters) ? item.allowedLetters : [],
                        spellingRule: item.spellingRule || null,
                        targets: Array.isArray(item.targets) ? item.targets.map(function (target, targetIndex) {
                            return {
                                id: target.id || ((item.id || "spelling-question-" + (index + 1)) + "-target-" + (targetIndex + 1)),
                                answer: typeof target.answer === "string" ? target.answer.trim() : "",
                                missing: Array.isArray(target.missing) ? target.missing.map(function (slot) {
                                    return {
                                        start: Math.max(0, Number(slot.start) || 0),
                                        length: Math.max(1, Number(slot.length) || 1),
                                        answer: slot.answer || null
                                    };
                                }) : [],
                                allowedLetters: Array.isArray(target.allowedLetters) ? target.allowedLetters : [],
                                spellingRule: target.spellingRule || item.spellingRule || null,
                                masked: target.masked || null
                            };
                        }).filter(function (target) {
                            return target.answer && target.missing.length > 0;
                        }) : [],
                        lesson: item.lesson || source.lesson || null,
                        media: window.SpellingMediaProvider && typeof window.SpellingMediaProvider.getForQuestion === "function"
                            ? window.SpellingMediaProvider.getForQuestion(item)
                            : item.media || null,
                        audio: item.audio || null
                    };
                });

            return {
                version: "2.0",
                mode: source.mode || "guided-word",
                instruction: source.instruction || "املای کلمات را کامل کنید.",
                settings: settings,
                questions: questions
            };
        }
    };

    window.DictationProvider = DictationProvider;
})(window);

console.log("Dictation Provider v2.0 Ready");
