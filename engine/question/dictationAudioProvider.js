// Tahouri Edu Platform - Dictation Audio Provider v1.1
(function (window) {
    "use strict";

    const DictationAudioProvider = {
        version: "1.1",
        current: null,

        getForQuestion: function (question) {
            if (!question) return null;

            if (question.audio) {
                const audio = question.audio;
                if (typeof audio === "string") return { src: audio, type: "audio/mpeg" };
                if (audio.src) {
                    return {
                        src: String(audio.src),
                        type: audio.type || "audio/mpeg",
                        label: audio.label || "پخش واژه"
                    };
                }
            }

            // Full dictation can run without packaged sound files.
            // The browser's Persian speech synthesis provides the spoken word.
            if (question.answer && typeof window.speechSynthesis !== "undefined") {
                return {
                    speech: String(question.answer),
                    lang: "fa-IR",
                    label: "پخش واژه"
                };
            }

            return null;
        },

        stop: function () {
            if (this.current && typeof this.current.pause === "function") {
                try {
                    this.current.pause();
                    this.current.currentTime = 0;
                } catch (error) {
                    console.warn("DictationAudioProvider: stop failed", error);
                }
            }

            if (typeof window.speechSynthesis !== "undefined") {
                try {
                    window.speechSynthesis.cancel();
                } catch (error) {
                    console.warn("DictationAudioProvider: speech stop failed", error);
                }
            }

            this.current = null;
        },

        play: function (question) {
            const source = this.getForQuestion(question);
            if (!source) return Promise.reject(new Error("Dictation audio is not configured"));

            this.stop();

            if (source.speech) {
                return new Promise(function (resolve, reject) {
                    try {
                        const utterance = new SpeechSynthesisUtterance(source.speech);
                        utterance.lang = source.lang || "fa-IR";
                        utterance.rate = 0.82;
                        utterance.pitch = 1;
                        utterance.onend = function () { resolve(); };
                        utterance.onerror = function (event) {
                            reject(event.error || new Error("Speech synthesis failed"));
                        };
                        DictationAudioProvider.current = utterance;
                        window.speechSynthesis.speak(utterance);
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            const audio = new Audio();
            audio.preload = "metadata";
            audio.src = source.src;
            this.current = audio;

            return audio.play().catch(function (error) {
                return Promise.reject(error);
            });
        }
    };

    window.DictationAudioProvider = DictationAudioProvider;
    console.log("Dictation Audio Provider v1.1 Ready");
})(window);
