// =====================================
// Tahouri Edu Platform
// Dictation Screen
// Version 2.0
// =====================================

(function (window) {
    "use strict";

    const DictationScreen = {
        lastPointerDownAt: null,
        lastCorrectFeedbackIndex: -1,

        init: function () {
            // Keep the timestamp of the most recent real pointerdown globally.
            // This lets the Next button reject a click whose pointer interaction
            // actually began before the button existed.
            if (!this._pointerTrackingInstalled) {
                const self = this;
                document.addEventListener("pointerdown", function () {
                    self.lastPointerDownAt = typeof performance !== "undefined" && typeof performance.now === "function"
                        ? performance.now()
                        : Date.now();
                }, true);
                this._pointerTrackingInstalled = true;
            }
            if (typeof EventManager === "undefined") return;
            EventManager.on("activityReady", function (payload) {
                if (!payload || payload.engineName !== "dictation") return;
                setTimeout(function () {
                    DictationScreen.render(payload.result);
                }, 0);
            });

            EventManager.on("dictationQuestionChanged", function (state) {
                if (!state) return;
                DictationScreen.render(state);
            });
        },

        render: function (state) {
            const app = document.getElementById("app");
            if (!app || !state) return;
            const q = state.currentQuestion || {};
            const mode = state.mode || q.mode || "guided-word";
            const isGuided = mode === "guided-word";
            const isDictation = mode === "dictation";
            const isContext = mode === "context";
            const isErrorHunt = mode === "error-hunt";
            const activityTitle = isErrorHunt ? "شکار اشتباه املایی" : isDictation ? "املای شنیداری" : isGuided ? "املای هدایت‌شده" : isContext ? "املای عبارت" : "کشف املای درست";
            const engineRows = (isDictation || isContext)
                && window.DictationEngine
                && typeof window.DictationEngine.getKeyboardRows === "function"
                ? window.DictationEngine.getKeyboardRows()
                : null;
            const sourceRows = engineRows || state.keyboardRows;
            const rows = Array.isArray(sourceRows)
                ? sourceRows.map(row => row.map(key => ({
                    ...key,
                    active: (isDictation || isContext) && !state.questionCompleted ? true : key.active
                })))
                : [];
            const rule = this.getRuleGuide(q, mode);

            app.innerHTML = `
                <div class="screen dictationScreen" dir="rtl">
                    <div class="dictationCard">
                        <div class="dictationHeader">
                            <span class="dictationIcon" aria-hidden="true">✍️</span>
                            <h1>املا</h1>
                        </div>
                        <div class="dictationQuestionTitle">${activityTitle}</div>
                        <p class="dictationInstruction">${this.escape(rule.title)}</p>
                        <div class="dictationRuleGuide">${this.escape(rule.guide)}</div>
                        ${isErrorHunt ? `<div class="spellingErrorVerse" id="spellingErrorVerse">${this.renderErrorHuntVerse(q, state)}</div>` : q.context ? `<div class="dictationContext">${this.escape(q.context)}</div>` : ""}
                        ${this.renderMedia(q)}
                        ${(isDictation || isGuided || isContext) ? this.renderAudio(q, isContext) : ""}

                        <div class="dictationAnswer${state.questionCompleted ? " is-complete" : ""}" id="dictationAnswer" aria-live="polite">
                            ${isErrorHunt ? this.renderErrorHuntAnswer(state) : this.renderAnswer(state, isGuided, isDictation, isContext)}
                        </div>

                        ${isErrorHunt && state.questionCompleted ? `<div class="spellingErrorExplanation">${this.escape(q.explanation || "آفرین! واژه را درست کردی.")}</div>` : ""}
                        <div class="dictationFeedback${isErrorHunt && state.errorFeedback ? " " + (state.errorWordSelected ? "correct" : "wrong") : ""}" id="dictationFeedback" aria-live="polite">${isErrorHunt ? this.escape(state.errorFeedback || "") : ""}</div>

                        <div class="dictationKeyboard" id="dictationKeyboard">
                            ${rows.map(row => `<div class="dictationKeyboardRow">${row.map(key => {
                                const keyIsActive = (isDictation || isContext) && !state.questionCompleted ? true : !!key.active;
                                const cls = ["dictationKey", keyIsActive ? "is-active" : "is-disabled", key.expected ? "is-expected" : ""].filter(Boolean).join(" ");
                                const disabledAttr = keyIsActive ? "" : "disabled";
                                const activeStyle = keyIsActive ? ' style="opacity:1!important;pointer-events:auto!important;cursor:pointer!important;filter:none!important;"' : "";
                                return `<button type="button" class="${cls}" data-key="${this.escape(key.key)}" data-variants="${this.escape((key.variants || []).join("|"))}" ${disabledAttr}${activeStyle}>${this.escape(key.key)}</button>`;
                            }).join("")}</div>`).join("")}
                            <div class="dictationUtilityRow">
                                ${isErrorHunt ? `<button type="button" class="dictationUtility spellingErrorHintButton" id="spellingErrorHint">💡 راهنما</button>` : `<button type="button" class="dictationUtility dictationSpace" id="dictationSpace" aria-label="کلید فاصله"></button>`}
                                ${isContext ? `<button type="button" class="dictationUtility dictationPunctuation" id="dictationPeriod" aria-label="نقطه">.</button>` : ""}
                                <button type="button" class="dictationUtility" id="dictationBackspace" aria-label="حذف">⌫</button>
                            </div>
                        </div>

                        <div class="dictationProgress">
                            ${isErrorHunt ? `بیت ${Number(state.currentIndex) + 1} از ${Number(state.totalQuestions) || 0} · اصلاح‌شده: ${(state.correctedErrorIndexes || []).length} از ${(q.errors || (q.wrongWord ? [q] : [])).length}` : `سؤال ${Number(state.currentIndex) + 1} از ${Number(state.totalQuestions) || 0}`}
                        </div>
                        <div class="dictationNextSlot${state.questionCompleted ? " is-visible" : ""}" aria-live="polite">
                            <button type="button" class="dictationNextButton" id="dictationNextButton" ${state.questionCompleted ? "" : "disabled"} ${state.questionCompleted ? "" : "aria-hidden=\"true\""}>
                                ${isErrorHunt ? (Number(state.currentIndex) + 1 >= Number(state.totalQuestions) ? "پایان" : "بیت بعدی") : (Number(state.currentIndex) + 1 >= Number(state.totalQuestions) ? "پایان" : "کلمه بعدی")}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            this.bind();
            this.positionGuidedGuide();
        },

        positionGuidedGuide: function () {
            const word = document.querySelector(".dictationGuidedWord");
            const guide = word && word.querySelector(".dictationGuidedGhost");
            const typed = word && word.querySelector(".dictationGuidedTyped");
            if (!word || !guide || !typed) return;
            const wordRect = word.getBoundingClientRect();
            const guideRect = guide.getBoundingClientRect();
            let anchorX = wordRect.right;
            if (typed.textContent) {
                const range = document.createRange();
                range.selectNodeContents(typed);
                const rangeRect = range.getBoundingClientRect();
                if (rangeRect && Number.isFinite(rangeRect.left)) anchorX = rangeRect.left;
                range.detach();
            }
            const left = anchorX - wordRect.left - guideRect.width;
            guide.style.left = left + "px";
            guide.style.right = "auto";
            guide.style.top = "50%";
            guide.style.transform = "translateY(-50%)";
        },
        renderAudio: function (question, isPhrase) {
            if (!window.DictationAudioProvider || typeof window.DictationAudioProvider.getForQuestion !== "function") return "";
            const media = window.DictationAudioProvider.getForQuestion(question);
            if (!media || (!media.src && !media.speech)) return "";
            return `<button type="button" class="dictationAudioButton" id="dictationAudioButton" aria-label="${isPhrase ? "پخش عبارت" : "پخش واژه"}">🔊 ${isPhrase ? "پخش عبارت" : "پخش واژه"}</button>`;
        },

        renderMedia: function (question) {
            const media = window.SpellingMediaProvider && typeof window.SpellingMediaProvider.getForQuestion === "function"
                ? window.SpellingMediaProvider.getForQuestion(question)
                : question && question.media;
            if (!media || media.type !== "image" || !media.src) return "";
            return `
                <figure class="dictationMedia">
                    <img src="${this.escape(media.src)}" alt="${this.escape(media.alt || "تصویر آموزشی")}" loading="lazy">
                    ${media.title ? `<figcaption>${this.escape(media.title)}</figcaption>` : ""}
                </figure>
            `;
        },

        renderContext: function (state) {
            const q = state.currentQuestion || {};
            const targets = Array.isArray(q.targets) && q.targets.length ? q.targets : [q];
            const template = q.contextTemplate || q.context || "";
            if (!template) return "";
            const currentIndex = Number(state.currentTargetIndex) || 0;
            const slots = new Set((state.missingSlots || []).slice(Number(state.currentSlotIndex) || 0));
            return this.escape(template).replace(/\{\{(\d+)\}\}/g, function (match, rawIndex) {
                const index = Number(rawIndex);
                const target = targets[index];
                if (!target) return match;
                const answer = String(target.answer || "");
                const chars = Array.from(answer);
                if (index < currentIndex) return '<span class="dictationContextTarget is-complete">' + DictationScreen.escape(answer) + '</span>';
                if (index > currentIndex) {
                    const future = DictationScreen.buildMaskedWord(target);
                    return '<span class="dictationContextTarget is-pending">' + DictationScreen.escape(future) + '</span>';
                }
                const visible = chars.map(function (char, charIndex) {
                    return slots.has(charIndex) ? "ـ...ـ" : char;
                }).join("");
                return '<span class="dictationContextTarget is-current">' + DictationScreen.escape(visible) + '</span>';
            });
        },

        renderErrorHuntVerse: function (question, state) {
            const verse = String(question && question.verseText || "");
            const errors = Array.isArray(question && question.errors) && question.errors.length ? question.errors : (question && question.wrongWord ? [question] : []);
            const corrected = new Set(state.correctedErrorIndexes || []);
            return verse.split(/(\s+)/).map(function (part) {
                if (!part) return "";
                if (/^\s+$/.test(part)) return DictationScreen.escape(part);
                const word = part;
                const cleanWord = word.replace(/[،؛.!؟,:]+$/g, "");
                const punctuation = word.slice(cleanWord.length);
                const errorIndex = errors.findIndex(function (item, index) {
                    return !corrected.has(index) && String(item.wrongWord || "").replace(/[،؛.!؟,:]+$/g, "") === cleanWord;
                });
                const correctedIndex = errors.findIndex(function (item, index) {
                    return corrected.has(index) && String(item.wrongWord || "").replace(/[،؛.!؟,:]+$/g, "") === cleanWord;
                });
                if (correctedIndex >= 0) return '<span class="spellingErrorWord is-corrected">' + DictationScreen.escape(errors[correctedIndex].answer + punctuation) + '</span>';
                const selected = state.errorWordSelected && Number(state.currentErrorIndex) === errorIndex;
                const hinted = Number(state.hintErrorIndex) === errorIndex && errorIndex >= 0;
                const disabled = state.questionCompleted || (state.errorWordSelected && !selected) ? "disabled" : "";
                return '<button type="button" class="spellingErrorWord' + (selected ? " is-selected" : "") + (hinted ? " is-hint" : "") + '" data-error-index="' + errorIndex + '" data-error-word="' + DictationScreen.escape(cleanWord) + '" ' + disabled + '>' + DictationScreen.escape(word) + '</button>';
            }).join("");
        },

        renderErrorHuntAnswer: function (state) {
            const target = state.currentTarget || {};
            if (!state.errorWordSelected) return '<span class="spellingErrorAnswerHint">روی یکی از واژه‌های نادرست بزن؛ سپس شکل درست آن را بنویس.</span>';
            const typed = String(state.currentInput || "");
            const remaining = Math.max(0, Array.from(target.answer || "").length - Array.from(typed).length);
            return '<span class="dictationTyped">' + this.escape(typed) + '</span><span class="spellingErrorPlaceholders">' + "ـ ".repeat(remaining) + '</span>' + (state.currentWrongChar ? '<span class="dictationGuidedWrong">' + this.escape(state.currentWrongChar) + '</span>' : "");
        },

        renderAnswer: function (state, isGuided, isDictation, isContext) {
            if (isDictation) return `<span class="dictationTyped">${this.escape(state.currentInput || "")}</span>`;
            if (isContext) return `<span class="dictationTyped">${this.escape(state.currentInput || "")}</span>${state.currentWrongChar ? `<span class="dictationGuidedWrong">${this.escape(state.currentWrongChar)}</span>` : ""}`;
            if (isGuided) {
                const q = state.currentQuestion || {};
                const answer = Array.from(q.answer || "");
                const actual = state.displayText || "";
                const typedCount = Array.from(actual).length;
                const remaining = answer.slice(typedCount);
                const wrongChar = state.currentWrongChar || "";
                let placeholders = "";
                remaining.forEach(function (char) { placeholders += /\s/.test(char) ? "  " : "ـ "; });
                // Guided-word never reveals the target letter as a faint preview.
                // The learner's only clue is the spoken word.
                return `<span class="dictationGuidedWord" dir="rtl"><span class="dictationGuidedTyped">${this.escape(actual)}</span>${wrongChar ? `<span class="dictationGuidedWrong">${this.escape(wrongChar)}</span>` : ""}<span class="dictationGuidedPlaceholders">${this.escape(placeholders)}</span></span>`;
            }
            const q = state.currentQuestion || {};
            const missingSlots = Array.isArray(state.missingSlots) ? state.missingSlots : [];
            const currentSlot = Math.max(0, Number(state.currentSlotIndex) || 0);
            const answerChars = Array.from(q.answer || "");
            const pendingSlots = new Set(missingSlots.slice(currentSlot));
            if (!missingSlots.length || currentSlot >= missingSlots.length) return DictationScreen.escape(q.answer || "");
            let rendered = "";
            let chunk = "";
            answerChars.forEach(function (char, index) {
                if (pendingSlots.has(index)) {
                    if (chunk) { rendered += chunk; chunk = ""; }
                    rendered += "ـ...ـ";
                } else chunk += char;
            });
            if (chunk) rendered += chunk;
            return DictationScreen.escape(rendered);
        },

        buildMaskedWord: function (question) {
            const answer = String(question && question.answer || "");
            const missing = Array.isArray(question && question.missing) ? question.missing : [];
            const slots = new Set();
            missing.forEach(function (slot) {
                const start = Math.max(0, Number(slot.start) || 0);
                const length = Math.max(1, Number(slot.length) || 1);
                for (let i = 0; i < length; i += 1) slots.add(start + i);
            });
            return Array.from(answer).map(function (char, index) { return slots.has(index) ? "ـ...ـ" : char; }).join("");
        },

        bind: function () {
            const self = this;

            // Bind every rendered letter key. In full dictation all letter keys
            // are intentionally enabled; selecting only .is-active made the
            // handler depend on a visual state instead of the actual keyboard.
            const isDictationMode = window.DictationEngine
                && typeof window.DictationEngine.getMode === "function"
                && window.DictationEngine.getMode() === "dictation";

            document.querySelectorAll(".dictationKey").forEach(function (button) {
                // In full dictation every Persian letter is intentionally clickable.
                // Force the DOM state here as the final UI authority.
                if (isDictationMode) {
                    button.disabled = false;
                    button.removeAttribute("disabled");
                    button.classList.add("is-active");
                    button.classList.remove("is-disabled");
                }

                let holdTimer = null;
                let holdTriggered = false;
                const variants = String(button.dataset.variants || "")
                    .split("|")
                    .map(function (value) { return value.trim(); })
                    .filter(Boolean);

                button.addEventListener("click", function (event) {
                    if (button.disabled) return;
                    if (holdTriggered) {
                        holdTriggered = false;
                        event.preventDefault();
                        return;
                    }
                    event.preventDefault();
                    self.handleInput(button.dataset.key || "");
                });

                if (variants.length) {
                    button.addEventListener("pointerdown", function () {
                        holdTriggered = false;
                        holdTimer = setTimeout(function () {
                            holdTimer = null;
                            holdTriggered = true;
                            self.showKeyVariants(button, variants);
                        }, 450);
                    });
                    const cancelHold = function () {
                        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
                    };
                    button.addEventListener("pointerup", cancelHold);
                    button.addEventListener("pointercancel", cancelHold);
                    button.addEventListener("pointerleave", cancelHold);
                    button.addEventListener("contextmenu", function (event) { event.preventDefault(); });
                }
            });

            document.querySelectorAll("[data-error-word]").forEach(function (errorWord) {
                errorWord.onclick = function () {
                    if (!window.DictationEngine) return;
                    const result = window.DictationEngine.selectErrorWord(errorWord.dataset.errorWord || "", Number(errorWord.dataset.errorIndex));
                    if (!result) return;
                    DictationScreen.render(window.DictationEngine.getState());
                    if (!result.correct) DictationScreen.flash("wrong");
                };
            });
            const hintButton = document.getElementById("spellingErrorHint");
            if (hintButton) hintButton.onclick = function () {
                if (window.DictationEngine && window.DictationEngine.showErrorHuntHint()) {
                    DictationScreen.render(window.DictationEngine.getState());
                }
            };
            const space = document.getElementById("dictationSpace");
            if (space) space.onclick = function () { self.handleInput(" "); };
            const period = document.getElementById("dictationPeriod");
            if (period) period.onclick = function () { self.handleInput("."); };
            const nextButton = document.getElementById("dictationNextButton");
            if (nextButton) {
                const interactionDelay = 700;
                const createdAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
                let armed = false;
                nextButton.addEventListener("pointerdown", function () {
                    const now = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
                    const lastPointerDown = DictationScreen.lastPointerDownAt;
                    if (lastPointerDown != null && lastPointerDown <= createdAt) return;
                    if (now - createdAt >= interactionDelay) armed = true;
                });
                nextButton.addEventListener("keydown", function (event) {
                    if (event.key === "Enter" || event.key === " ") armed = true;
                });
                setTimeout(function () {
                    if (!document.body.contains(nextButton)) return;
                    nextButton.disabled = false;
                }, interactionDelay);
                nextButton.onclick = function (event) {
                    if (nextButton.disabled || !armed) return;
                    armed = false;
                    if (event && event.isTrusted === false) return;
                    if (window.DictationEngine && typeof window.DictationEngine.nextQuestion === "function") window.DictationEngine.nextQuestion();
                };
            }
            const audioButton = document.getElementById("dictationAudioButton");
            if (audioButton) audioButton.onclick = function () {
                if (!window.DictationAudioProvider) return;
                window.DictationAudioProvider.play(window.DictationEngine.getCurrentQuestion()).catch(function () {
                    self.showFeedback("پخش صدا ممکن نشد؛ دوباره تلاش کن.", "wrong");
                });
            };
            const backspace = document.getElementById("dictationBackspace");
            if (backspace) backspace.onclick = function () {
                const changed = window.DictationEngine.backspace();
                if (changed) self.render(window.DictationEngine.getState());
            };
            document.onkeydown = function (event) {
                if (!window.DictationEngine || !window.DictationEngine.state || window.DictationEngine.state.isFinished) return;
                if (event.key === "Backspace") {
                    event.preventDefault();
                    const changed = window.DictationEngine.backspace();
                    if (changed) self.render(window.DictationEngine.getState());
                    return;
                }
                if (event.key === " ") {
                    event.preventDefault();
                    self.handleInput(" ");
                    return;
                }
                if (event.key && event.key.length === 1) self.handleInput(event.key);
            };
        },

        showKeyVariants: function (button, variants) {
            const self = this;
            const old = document.getElementById("dictationVariantPopup");
            if (old) old.remove();
            const popup = document.createElement("div");
            popup.id = "dictationVariantPopup";
            popup.className = "dictationVariantPopup";
            popup.setAttribute("role", "menu");
            const base = button.dataset.key || "";
            [base].concat(variants).forEach(function (char, index) {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "dictationVariantOption" + (index === 0 ? " is-base" : "");
                option.textContent = char;
                option.setAttribute("role", "menuitem");
                option.addEventListener("pointerdown", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    popup.remove();
                    self.handleInput(char);
                });
                popup.appendChild(option);
            });
            document.body.appendChild(popup);
            const rect = button.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            let left = rect.left + (rect.width / 2) - (popupRect.width / 2);
            let top = rect.top - popupRect.height - 8;
            left = Math.max(6, Math.min(left, window.innerWidth - popupRect.width - 6));
            if (top < 6) top = rect.bottom + 8;
            popup.style.left = left + "px";
            popup.style.top = top + "px";
            const close = function (event) {
                if (!popup.contains(event.target) && event.target !== button) {
                    popup.remove();
                    document.removeEventListener("pointerdown", close, true);
                }
            };
            setTimeout(function () { document.addEventListener("pointerdown", close, true); }, 0);
        },

        getRuleGuide: function (question, mode) {
            if (mode === "error-hunt") return { title: "همهٔ اشتباه‌های این بیت را پیدا کن.", guide: "حروف اول، وسط و آخر واژه‌ها را با دقت بخوان؛ هر واژه را اصلاح کن تا به بیت بعدی بروی." };
            if (mode === "guided-word") return { title: "کلمه را کامل و با دقت بنویس.", guide: "حرف‌ها را به ترتیب انتخاب کن." };
            const rule = question && question.spellingRule ? question.spellingRule : "";
            const guides = {
                h: { title: "کدام حرف درست است؟ «ه» یا «ح»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                "s-sad-se": { title: "کدام حرف درست است؟ «س»، «ص» یا «ث»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                gh: { title: "کدام حرف درست است؟ «ق» یا «غ»", guide: "حرف درست را برای جای خالی انتخاب کن." },
                z: { title: "کدام حرف درست است؟ «ز»، «ذ»، «ض» یا «ظ»", guide: "حرف درست را برای جای خالی انتخاب کن." }
            };
            return guides[rule] || { title: "حرف درست را برای جای خالی انتخاب کن.", guide: "به کلمه و متن درس دقت کن." };
        },

        handleInput: function (char) {
            const result = window.DictationEngine.inputChar(char);
            if (!result) return;
            if (!result.correct) {
                this.flash("wrong");
                this.render(window.DictationEngine.getState());
                this.showFeedback("اشتباه است؛ دوباره تلاش کن.", "wrong");
                return;
            }
            if (result.complete || result.completed) {
                const state = window.DictationEngine.getState();
                this.render(state);
                this.showFeedback(this.getRandomCorrectFeedback(), "correct");
                if (window.DictationEngine.getMode() === "dictation" || window.DictationEngine.getMode() === "context") {
                    const questionIndex = state.currentIndex;
                    window.setTimeout(function () {
                        const engine = window.DictationEngine;
                        if (!engine || !engine.state || engine.state.isFinished) return;
                        if (!engine.state.questionCompleted || engine.state.currentIndex !== questionIndex) return;
                        engine.nextQuestion();
                    }, 650);
                }
                return;
            }
            this.render(window.DictationEngine.getState());
        },

        flash: function (type) {
            const answer = document.getElementById("dictationAnswer");
            if (!answer) return;
            answer.classList.remove("is-wrong");
            void answer.offsetWidth;
            if (type === "wrong") answer.classList.add("is-wrong");
        },

        getRandomCorrectFeedback: function () {
            const messages = [
                "درست است؛ آفرین! 🌟", "عالی بود! 👏", "آفرین! خیلی خوب دقت کردی. ⭐", "درست نوشتی؛ ادامه بده! 🌱",
                "چه خوب! یک قدم دیگر جلو رفتی. 🚀", "آفرین به دقتت! 👌", "کارت عالی بود! 🌟", "درست و دقیق! آفرین 👏",
                "خیلی خوب! همین‌طور ادامه بده. 💪", "آفرین! با دقت جواب دادی. ✨"
            ];
            let index = Math.floor(Math.random() * messages.length);
            if (messages.length > 1 && index === this.lastCorrectFeedbackIndex) index = (index + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
            this.lastCorrectFeedbackIndex = index;
            return messages[index];
        },

        showFeedback: function (message, type) {
            const box = document.getElementById("dictationFeedback");
            if (!box) return;
            box.textContent = message || "";
            box.className = "dictationFeedback" + (type ? " " + type : "");
        },

        escape: function (value) {
            return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }
    };

    window.DictationScreen = DictationScreen;
    DictationScreen.init();
})(window);

console.log("Dictation Screen v2.9 Ready");
