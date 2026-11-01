// Tahouri Edu Platform - Composite Activity Screen v1.2
(function (window) {
    'use strict';

    const CompositeActivityScreen = {
        connected: false,
        activity: null,
        state: null,
        activeMatchingStageId: null,
        selectedOptionId: null,

        init() {
            if (this.connected || typeof EventManager === 'undefined') return;
            EventManager.on('activityReady', payload => {
                if (!payload || payload.engineName !== 'composite' || !payload.result) return;
                this.activity = payload.activity || {};
                this.state = payload.result;
                this.activeMatchingStageId = null;
                this.selectedOptionId = null;
                this.render();
            });
            EventManager.on('compositeMatchingFinished', payload => {
                // MatchingScreen also redraws its finished state in the same event turn.
                // Defer parent rendering until that redraw is complete.
                window.setTimeout(() => this.handleMatchingFinished(payload), 0);
            });
            this.connected = true;
            console.log('Composite Activity Screen v1.2 Ready');
        },

        escape(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[char]));
        },

        renderMedia(media, isPrompt) {
            if (!media) return '';
            if (media.type === 'text') return '<span>' + this.escape(media.value) + '</span>';
            if (media.type === 'image') return '<img class="compositeMediaImage" src="' +
                this.escape(media.src) + '" alt="' + this.escape(media.alt || '') + '">';
            if (media.type === 'audio' && isPrompt) return '<audio class="compositePromptAudio" controls preload="none" aria-label="پخش صدای پرسش" src="' +
                this.escape(media.src) + '">مرورگر شما پخش صدا را پشتیبانی نمی‌کند.</audio><span class="compositeAudioFallback" hidden>پخش این صدا ممکن نیست؛ فایل صوتی را بررسی کنید.</span>';
            return '';
        },

        startMatchingStage(stage) {
            if (this.activeMatchingStageId === stage.id) return;
            if (!window.MatchingEngine || !window.MatchingScreen) {
                throw new Error('Composite matching stage requires MatchingEngine and MatchingScreen');
            }
            this.activeMatchingStageId = stage.id;
            const matching = {
                ...stage.matching,
                instruction: stage.instruction || stage.matching.instruction || 'موارد مرتبط را با کشیدن خط به هم وصل کن.'
            };
            const stageActivity = {
                id: String(this.activity && this.activity.id || 'composite') + '::' + stage.id,
                title: stage.title,
                type: 'matching',
                engine: 'matching',
                settings: { compositeStage: true },
                matching
            };
            const matchingState = window.MatchingEngine.start(stageActivity);
            if (!matchingState) {
                this.activeMatchingStageId = null;
                throw new Error('Could not start composite matching stage: ' + stage.id);
            }
            window.MatchingScreen.show(matchingState);
        },

        handleMatchingFinished(payload) {
            if (!payload || !payload.result || !this.state || this.state.finished) return;
            const stage = window.CompositeActivityEngine.getCurrentStage();
            if (!stage || stage.interaction !== 'matching' || this.activeMatchingStageId !== stage.id) return;

            const completed = window.CompositeActivityEngine.completeMatchingStage(payload.result);
            if (!completed) return;
            this.activeMatchingStageId = null;
            this.selectedOptionId = null;
            const next = window.CompositeActivityEngine.next();
            if (next && !next.activityId) {
                this.state = next;
                this.render();
            }
        },

        render() {
            const app = document.getElementById('app');
            const state = this.state;
            const stage = state && state.stage;
            if (!app || !state || !stage) return;
            if (stage.interaction === 'matching') {
                this.startMatchingStage(stage);
                return;
            }
            const answer = state.answers[state.currentStage];
            const options = stage.options.map(option => {
                const answeredOption = answer && answer.optionId === option.id;
                const pendingSelection = !answer && this.selectedOptionId === option.id;
                const status = answeredOption
                    ? (answer.correct ? ' is-correct' : ' is-wrong')
                    : (pendingSelection ? ' is-selected' : '');
                return '<button type="button" class="compositeOption' + status + '" data-composite-option="' +
                    this.escape(option.id) + '"' + (answer ? ' disabled' : '') + '>' +
                    this.renderMedia(option.media, false) + '</button>';
            }).join('');
            const progress = 'مرحله ' + (state.currentStage + 1) + ' از ' + state.totalStages;
            const feedback = !answer ? '' : '<p class="compositeFeedback ' +
                (answer.correct ? 'correct' : 'wrong') + '" role="status">' +
                (answer.correct ? 'آفرین! پاسخ درست است.' : 'اشکالی ندارد؛ پاسخ درست را در مرحلهٔ بعد به خاطر بسپار.') +
                '</p>';
            const nextLabel = state.currentStage + 1 < state.totalStages ? 'مرحلهٔ بعد' : 'پایان فعالیت';
            app.innerHTML = '<section class="screen compositeActivityScreen" dir="rtl">' +
                '<h1>' + this.escape(this.activity.title || 'فعالیت ترکیبی') + '</h1>' +
                '<div class="compositeProgress">' + progress + '</div>' +
                (stage.title ? '<h2>' + this.escape(stage.title) + '</h2>' : '') +
                '<p class="compositeInstruction">' + this.escape(stage.instruction) + '</p>' +
                '<div class="compositePrompt">' + this.renderMedia(stage.prompt, true) + '</div>' +
                '<div class="compositeOptions">' + options + '</div>' +
                (!answer && this.selectedOptionId ? '<button type="button" id="compositeConfirmBtn" class="compositeNextBtn">ثبت پاسخ</button>' : '') +
                feedback +
                (answer ? '<button type="button" id="compositeNextBtn" class="compositeNextBtn">' + nextLabel + '</button>' : '') +
                '<button type="button" id="compositeBackBtn" class="compositeBackBtn">بازگشت به فعالیت‌ها</button>' +
                '</section>';
            const audio = app.querySelector('.compositePromptAudio');
            if (audio) audio.addEventListener('error', function () {
                const fallback = app.querySelector('.compositeAudioFallback');
                if (fallback) fallback.hidden = false;
            });
            app.querySelectorAll('[data-composite-option]').forEach(button => {
                button.addEventListener('click', () => {
                    if (this.state.answers[this.state.currentStage]) return;
                    this.selectedOptionId = button.getAttribute('data-composite-option');
                    this.render();
                });
            });
            const confirm = document.getElementById('compositeConfirmBtn');
            if (confirm) confirm.addEventListener('click', () => {
                if (!this.selectedOptionId || this.state.answers[this.state.currentStage]) return;
                const result = window.CompositeActivityEngine.answer(this.selectedOptionId);
                if (!result) return;
                this.state = result.state;
                this.selectedOptionId = null;
                this.render();
            });
            const next = document.getElementById('compositeNextBtn');
            if (next) next.addEventListener('click', () => {
                const result = window.CompositeActivityEngine.next();
                if (result && !result.activityId) {
                    this.state = result;
                    this.selectedOptionId = null;
                    this.render();
                }
            });
            const back = document.getElementById('compositeBackBtn');
            if (back) back.addEventListener('click', () => {
                if (window.Screen && typeof window.Screen.showActivities === 'function' && this.activity) {
                    window.Screen.showActivities(this.activity.grade, this.activity.subject, this.activity.chapter);
                }
            });
        }
    };

    window.CompositeActivityScreen = CompositeActivityScreen;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CompositeActivityScreen.init(), { once: true });
    } else {
        CompositeActivityScreen.init();
    }
})(window);
