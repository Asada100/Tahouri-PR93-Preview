// Tahouri Edu Platform - Composite Activity Engine v1.2
// Ordered choice and matching stages coordinated under one final activity result.
(function (window) {
    'use strict';

    const CompositeActivityEngine = {
        activity: null,
        content: null,
        state: null,

        start(activityData) {
            if (!window.CompositeActivityProvider) throw new Error('CompositeActivityProvider is not available');
            this.activity = activityData || null;
            this.content = window.CompositeActivityProvider.getContent(this.activity);
            this.state = {
                started: true, finished: false, currentStage: 0,
                correctAnswers: 0, wrongAnswers: 0, moves: 0, score: 0,
                answers: [], totalStages: this.content.stages.length, result: null
            };
            console.log('CompositeActivityEngine: Started', {
                activityId: this.activity && this.activity.id, totalStages: this.state.totalStages
            });
            return this.getState();
        },

        getCurrentStage() {
            if (!this.state || !this.content) return null;
            return this.content.stages[this.state.currentStage] || null;
        },

        answer(optionId) {
            if (!this.state || this.state.finished) return null;
            const stage = this.getCurrentStage();
            if (!stage || this.state.answers[this.state.currentStage]) return null;
            const selectedId = String(optionId);
            if (!stage.options.some(option => option.id === selectedId)) return null;
            const correct = selectedId === stage.answerId;
            const settings = this.activity && this.activity.settings || {};
            const points = Number(settings.scorePerCorrect) > 0 ? Number(settings.scorePerCorrect) : 10;
            this.state.moves += 1;
            if (correct) {
                this.state.correctAnswers += 1;
                this.state.score += points;
            } else {
                this.state.wrongAnswers += 1;
            }
            this.state.answers[this.state.currentStage] = { optionId: selectedId, correct };
            return { correct, state: this.getState() };
        },

        completeMatchingStage(matchingResult) {
            if (!this.state || this.state.finished) return null;
            const stage = this.getCurrentStage();
            if (!stage || stage.interaction !== 'matching' || this.state.answers[this.state.currentStage]) return null;

            const result = matchingResult && matchingResult.result ? matchingResult.result : matchingResult;
            if (!result || Number(result.percentage) < 100) return null;

            const pairs = Array.isArray(stage.matching && stage.matching.pairs) ? stage.matching.pairs.length : 0;
            const correctPairs = Number(result.correctAnswers ?? result.pairs ?? result.totalPairs) || pairs;
            const totalPairs = Number(result.totalPairs) || pairs;
            if (!totalPairs || correctPairs < totalPairs) return null;

            this.state.moves += Number(result.moves) || 0;
            this.state.wrongAnswers += Number(result.wrongAnswers) || 0;
            this.state.correctAnswers += correctPairs;
            const settings = this.activity && this.activity.settings || {};
            const points = Number(settings.scorePerCorrect) > 0 ? Number(settings.scorePerCorrect) : 10;
            this.state.score += correctPairs * points;
            this.state.answers[this.state.currentStage] = {
                correct: true,
                interaction: 'matching',
                percentage: Number(result.percentage),
                correctAnswers: correctPairs,
                totalQuestions: totalPairs,
                moves: Number(result.moves) || 0
            };
            return this.getState();
        },

        next() {
            if (!this.state || this.state.finished || !this.state.answers[this.state.currentStage]) return null;
            if (this.state.currentStage + 1 < this.state.totalStages) {
                this.state.currentStage += 1;
                return this.getState();
            }
            return this.finish();
        },

        finish() {
            if (!this.state || this.state.finished) return this.state && this.state.result;
            this.state.finished = true;
            const totalQuestions = this.content.stages.reduce((total, stage) => {
                if (stage && stage.interaction === 'matching') {
                    return total + (Array.isArray(stage.matching && stage.matching.pairs) ? stage.matching.pairs.length : 0);
                }
                return total + 1;
            }, 0);
            const correctAnswers = Math.min(this.state.correctAnswers, totalQuestions);
            const percentage = totalQuestions
                ? Math.round(correctAnswers / totalQuestions * 100) : 0;
            const payload = {
                activityId: this.activity && this.activity.id,
                score: this.state.score, percentage,
                correctAnswers,
                wrongAnswers: this.state.wrongAnswers,
                totalQuestions, moves: this.state.moves,
                completed: true,
                successful: percentage >= 80
            };
            const result = window.ActivityResult && typeof window.ActivityResult.create === 'function'
                ? window.ActivityResult.create(payload) : payload;
            this.state.result = result;
            if (window.ActivityManager && typeof window.ActivityManager.finish === 'function') {
                window.ActivityManager.finish(result);
            } else if (window.EventManager && typeof window.EventManager.emit === 'function') {
                window.EventManager.emit('activityFinished', result);
            }
            return result;
        },

        getState() {
            if (!this.state) return null;
            return JSON.parse(JSON.stringify({
                ...this.state,
                stage: this.getCurrentStage()
            }));
        },

        reset() { this.activity = null; this.content = null; this.state = null; }
    };

    window.CompositeActivityEngine = CompositeActivityEngine;
    console.log('Composite Activity Engine v1.2 Ready');
})(window);
