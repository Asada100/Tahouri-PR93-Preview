// =====================================
// Tahouri Edu Platform
// Spelling Media Provider
// Version 1.0
// =====================================

(function (window) {
    "use strict";

    const SpellingMediaProvider = {
        version: "1.0",

        normalize: function (media) {
            if (!media) return null;

            if (typeof media === "string") {
                return { type: "image", src: media, alt: "" };
            }

            if (typeof media !== "object") return null;

            const type = media.type || (media.image || media.src ? "image" : null);
            const src = media.src || media.image || "";
            if (!type || !src) return null;

            if (type !== "image") return null;

            return {
                type: "image",
                src: String(src),
                alt: String(media.alt || media.description || ""),
                title: String(media.title || ""),
                loading: "lazy"
            };
        },

        getForQuestion: function (question) {
            return this.normalize(question && question.media);
        }
    };

    window.SpellingMediaProvider = SpellingMediaProvider;
})(window);

console.log("Spelling Media Provider v1.0 Ready");
