// Parity Discovery Workshop — isolated question mode extension.
(function () {
    if (typeof QuizProvider === "undefined") return;
    const originalGenerateQuestions = QuizProvider.generateQuestions;
    QuizProvider.generateQuestions = function (activityData) {
        const settings = activityData && activityData.settings || {};
        if (settings.mode !== "parityWorkshop") return originalGenerateQuestions.call(this, activityData);
        const count = Math.max(1, Math.min(10, Number(settings.questions) || 10));
        return Array.from({ length: count }, function (_, index) {
            const pickCount = index % 3 === 2 ? 3 : 2;
            const pool = Array.from({ length: 12 }, function () {
                return Math.floor(Math.random() * 20) + 1;
            });
            return {
                type: "quiz",
                mode: "parityWorkshop",
                text: "عددها را انتخاب کن و قانون را کشف کن.",
                answer: "",
                options: ["زوج", "فرد"],
                numberPool: pool,
                pickCount: pickCount,
                explanation: "دو عدد زوج یا دو عدد فرد، حاصل زوج می‌دهند؛ جمع یک زوج و یک فرد، فرد است. برای سه عدد، زوج یا فرد بودن حاصل به تعداد عددهای فرد بستگی دارد."
            };
        });
    };
    console.log("Parity Discovery Workshop question mode ready");
})();
