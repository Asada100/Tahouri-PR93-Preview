// =====================================
// Tahouri Edu Platform
// Learning Cards Background Adapter v2.4
//
// Responsibilities:
// - Apply prepared subject/chapter images to existing buttons as backgrounds
// - Derive image names from grade + subject + chapter
// - Preserve existing icons, labels and navigation behavior
// - Do not create image elements or alter button contents
//
// No navigation logic
// No data mutation
// =====================================

const LearningCards = {

    getGradeNumber: function (gradeId) {
        const match = String(gradeId || "").match(/(\d+)$/);
        return match ? match[1] : null;
    },

    getSubjectPrefix: function (subjectId) {
        const prefixes = {
            math: "math",
            persian: "farsi",
            science: "Sciences"
        };

        return prefixes[subjectId] || null;
    },

    getImageKey: function (button, type) {
        const gradeId =
            typeof Screen !== "undefined" &&
            typeof Screen.getProfileGrade === "function"
                ? Screen.getProfileGrade()
                : null;

        const gradeNumber = this.getGradeNumber(gradeId);

        if (!gradeNumber) {
            return null;
        }

        if (type === "subject") {
            const subjectPrefix = this.getSubjectPrefix(button.dataset.id);
            return subjectPrefix
                ? `${subjectPrefix}${gradeNumber}`
                : null;
        }

        if (type === "chapter") {
            const subjectId =
                typeof AppState !== "undefined"
                    ? AppState.subject
                    : null;

            const subjectPrefix = this.getSubjectPrefix(subjectId);
            const chapterMatch =
                String(button.dataset.id || "").match(/(\d+)$/);

            if (!subjectPrefix || !chapterMatch) {
                return null;
            }

            return `${subjectPrefix}${gradeNumber}s${chapterMatch[1]}`;
        }

        return null;
    },

    applyBackground: function (button, type) {
        if (!button) {
            return;
        }

        const imageKey = this.getImageKey(button, type);

        if (!imageKey) {
            return;
        }

        if (button.dataset.learningCardKey === imageKey) {
            return;
        }

        button.dataset.imageKey = imageKey;
        button.dataset.learningCardKey = imageKey;
        button.classList.add("learning-image-card");

        // Repository image assets use the exact .JPG extension.
        // GitHub Pages is case-sensitive, so .jpg and .JPG are different paths.
        button.style.backgroundImage =
            `url("assets/images/${imageKey}.JPG")`;
        button.style.backgroundSize = "cover";
        button.style.backgroundPosition = "center";
        button.style.backgroundRepeat = "no-repeat";
    },

    enhance: function () {
        document
            .querySelectorAll("#subjectsContainer .subjectBtn")
            .forEach((button) => this.applyBackground(button, "subject"));

        document
            .querySelectorAll("#chaptersContainer .chapterBtn")
            .forEach((button) => this.applyBackground(button, "chapter"));
    },

    start: function () {
        this.enhance();

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        const observer = new MutationObserver(() => {
            this.enhance();
        });

        observer.observe(app, {
            childList: true,
            subtree: true
        });

        console.log("Learning Cards Background Adapter v2.4 Ready");
    }
};

window.LearningCards = LearningCards;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        LearningCards.start();
    }, { once: true });
} else {
    LearningCards.start();
}