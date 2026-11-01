// =====================================
// Tahouri Edu Platform
// Classification Engine
// Version 1.5
// =====================================

(function (window) {
    'use strict';

    const ClassificationEngine = {
        state: null,
        activityData: null,
        content: null,
        handler: null,

        start(activityData) {
            this.reset();
            this.activityData = activityData || {};

            // The parity train uses fresh, non-zero integers on every launch.
            // Keep this generation scoped to this activity so other classification
            // activities retain their authored content unchanged.
            if (this.activityData.id === 'parityTrain' &&
                this.activityData.classification &&
                Array.isArray(this.activityData.classification.items)) {
                const randomIntegers = [];
                for (let value = 2; value <= 998; value += 2) randomIntegers.push(value);
                const evenNumbers = [];
                while (evenNumbers.length < 5) {
                    const index = Math.floor(Math.random() * randomIntegers.length);
                    evenNumbers.push(randomIntegers.splice(index, 1)[0]);
                }

                const oddPool = [];
                for (let value = 1; value <= 997; value += 2) oddPool.push(value);
                const oddNumbers = [];
                while (oddNumbers.length < 5) {
                    const index = Math.floor(Math.random() * oddPool.length);
                    oddNumbers.push(oddPool.splice(index, 1)[0]);
                }

                const toPersianDigits = value => String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
                const generatedItems = [
                    ...evenNumbers.map(value => ({
                        id: `n${value}`,
                        content: toPersianDigits(value),
                        type: 'text',
                        categoryId: 'even'
                    })),
                    ...oddNumbers.map(value => ({
                        id: `n${value}`,
                        content: toPersianDigits(value),
                        type: 'text',
                        categoryId: 'odd'
                    }))
                ];

                for (let index = generatedItems.length - 1; index > 0; index--) {
                    const swapIndex = Math.floor(Math.random() * (index + 1));
                    [generatedItems[index], generatedItems[swapIndex]] =
                        [generatedItems[swapIndex], generatedItems[index]];
                }
                this.activityData.classification.items = generatedItems;
            }

            if (!window.ClassificationProvider) {
                throw new Error('ClassificationProvider is not available');
            }

            this.content = window.ClassificationProvider.getContent(this.activityData);
            const mode = this.content.mode || 'choice';

            if (!window.ClassificationTypeRegistry || !window.ClassificationTypeRegistry.has(mode)) {
                throw new Error(`Unsupported classification mode: ${mode}`);
            }

            this.handler = window.ClassificationTypeRegistry.get(mode);
            if (this.handler && typeof this.handler.prepare === 'function') {
                this.handler.prepare(this.content);
            }

            const isMultiStage = mode === 'multiStage';
            const stages = isMultiStage ? this.content.stages : null;
            const firstStage = isMultiStage ? stages[0] : null;
            const items = isMultiStage ? firstStage.items : this.content.items;
            const categories = isMultiStage ? firstStage.categories : this.content.categories;
            const totalItems = isMultiStage
                ? stages.reduce((sum, stage) => sum + stage.items.length, 0)
                : items.length;

            this.state = {
                started: true,
                finished: false,
                locked: false,
                mode,
                totalItems,
                classifiedItems: 0,
                totalClassifiedItems: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                moves: 0,
                score: 0,
                items: items.slice(),
                categories: categories.slice(),
                instruction: isMultiStage
                    ? (firstStage.instruction || this.content.instruction || '')
                    : (this.content.instruction || ''),
                currentStage: isMultiStage ? 0 : null,
                totalStages: isMultiStage ? stages.length : null,
                stageCompleted: 0,
                classifications: {}
            };

            console.log('ClassificationEngine: Started', {
                activityId: this.activityData.id,
                mode,
                totalItems: this.state.totalItems,
                totalStages: this.state.totalStages,
                classifiedItems: this.state.classifiedItems,
                moves: this.state.moves
            });

            return this.getState();
        },

        isMultiStage() {
            return !!this.state && this.state.mode === 'multiStage';
        },

        getCurrentStage() {
            if (!this.isMultiStage() || !this.content || !Array.isArray(this.content.stages)) return null;
            const index = Number(this.state.currentStage);
            return this.content.stages[index] || null;
        },

        selectCategory(categoryId) {
            if (!this.handler || typeof this.handler.selectCategory !== 'function') {
                return categoryId;
            }
            return this.handler.selectCategory(categoryId);
        },

        classifyItem(itemId, categoryId) {
            if (!this.state || this.state.finished) return null;

            const item = this.state.items.find(i => String(i.id) === String(itemId));
            if (!item) return null;

            const alreadyClassified = Object.prototype.hasOwnProperty.call(
                this.state.classifications,
                item.id
            );
            if (alreadyClassified) return null;

            const category = this.state.categories.find(c => String(c.id) === String(categoryId));
            if (!category) return null;

            this.state.moves += 1;

            const correct = this.handler && typeof this.handler.classify === 'function'
                ? !!this.handler.classify(item, categoryId)
                : String(item.categoryId) === String(categoryId);

            if (correct) {
                this.state.classifications[item.id] = {
                    categoryId: String(categoryId),
                    correct: true,
                    stage: this.state.currentStage
                };
                this.state.classifiedItems += 1;
                this.state.totalClassifiedItems += 1;
                this.state.correctAnswers += 1;
                this.state.score += this.getScorePerCorrect();
            } else {
                this.state.wrongAnswers += 1;

                if (!this.isRetryAllowed()) {
                    this.state.classifications[item.id] = {
                        categoryId: String(categoryId),
                        correct: false,
                        stage: this.state.currentStage
                    };
                    this.state.classifiedItems += 1;
                    this.state.totalClassifiedItems += 1;
                }
            }

            if (this.isMultiStage()) {
                if (this.state.classifiedItems >= this.state.items.length) {
                    if (this.state.currentStage < this.state.totalStages - 1) {
                        const completedStage = this.state.currentStage;
                        this.advanceStage();
                        return {
                            itemId,
                            categoryId,
                            correct,
                            retryAllowed: false,
                            stageCompleted: true,
                            completedStage,
                            currentStage: this.state.currentStage,
                            state: this.getState()
                        };
                    }
                    return this.finish();
                }
            } else if (this.state.classifiedItems >= this.state.totalItems) {
                return this.finish();
            }

            return {
                itemId,
                categoryId,
                correct,
                retryAllowed: !correct && this.isRetryAllowed(),
                state: this.getState()
            };
        },

        advanceStage() {
            if (!this.isMultiStage()) return false;

            const nextIndex = this.state.currentStage + 1;
            const nextStage = this.content.stages[nextIndex];
            if (!nextStage) return false;

            this.state.stageCompleted += 1;
            this.state.currentStage = nextIndex;
            this.state.classifiedItems = 0;
            this.state.items = nextStage.items.slice();
            this.state.categories = nextStage.categories.slice();
            this.state.instruction = nextStage.instruction || this.content.instruction || '';

            console.log('ClassificationEngine: Stage Advanced', {
                stage: nextIndex + 1,
                totalStages: this.state.totalStages
            });

            return true;
        },

        isRetryAllowed() {
            const settings = this.activityData && this.activityData.settings;
            return settings && settings.allowRetry === false ? false : true;
        },

        finish() {
            if (!this.state || this.state.finished) return this.getResult();

            this.state.finished = true;
            this.state.locked = true;
            const percentage = this.state.totalItems
                ? Math.round((this.state.correctAnswers / this.state.totalItems) * 100)
                : 0;

            let result = {
                activityId: this.activityData && this.activityData.id,
                score: this.state.score,
                percentage,
                correctAnswers: this.state.correctAnswers,
                wrongAnswers: this.state.wrongAnswers,
                totalQuestions: this.state.totalItems,
                moves: this.state.moves,
                completed: true
            };

            if (window.ActivityResult && typeof window.ActivityResult.create === 'function') {
                result = window.ActivityResult.create({
                    activityId: this.activityData && this.activityData.id,
                    score: this.state.score,
                    percentage,
                    correctAnswers: this.state.correctAnswers,
                    wrongAnswers: this.state.wrongAnswers,
                    totalQuestions: this.state.totalItems,
                    moves: this.state.moves,
                    pairs: this.state.totalItems,
                    totalPairs: this.state.totalItems
                });
            }

            this.state.result = result;

            // Use the shared lifecycle finish path so pending activity loads are
            // invalidated before listeners display the result or navigate.
            if (typeof ActivityManager !== 'undefined' && typeof ActivityManager.finish === 'function') {
                ActivityManager.finish(result);
            } else if (typeof EventManager !== 'undefined' && typeof EventManager.emit === 'function') {
                EventManager.emit('activityFinished', result);
            }

            return result;
        },

        getScorePerCorrect() {
            const settings = this.activityData && this.activityData.settings;
            return Number(settings && settings.scorePerCorrect) || 10;
        },

        getState() {
            return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
        },

        getSessionState() {
            return this.getState();
        },

        restoreSession(state) {
            if (!state || !this.activityData) return false;
            if (!window.ClassificationProvider || !window.ClassificationTypeRegistry) return false;

            try {
                this.content = window.ClassificationProvider.getContent(this.activityData);
                const mode = this.content.mode || 'choice';

                if (!window.ClassificationTypeRegistry.has(mode)) {
                    return false;
                }

                this.handler = window.ClassificationTypeRegistry.get(mode);
                if (this.handler && typeof this.handler.prepare === 'function') {
                    this.handler.prepare(this.content);
                }

                if (!Array.isArray(state.items) || !Array.isArray(state.categories)) {
                    return false;
                }

                if (mode === 'multiStage') {
                    const stages = this.content.stages || [];
                    if (!Number.isInteger(state.currentStage) ||
                        state.currentStage < 0 ||
                        state.currentStage >= stages.length) {
                        return false;
                    }

                    const stageIndex = state.currentStage;
                    const stage = stages[stageIndex];
                    const sameIds = (saved, current) =>
                        saved.length === current.length &&
                        saved.every((entry, index) => String(entry.id) === String(current[index].id));

                    if (!sameIds(state.items, stage.items) ||
                        !sameIds(state.categories, stage.categories)) {
                        return false;
                    }

                    const totalItems = stages.reduce((sum, s) => sum + s.items.length, 0);
                    const numericFields = [
                        'classifiedItems', 'totalClassifiedItems', 'correctAnswers',
                        'wrongAnswers', 'moves', 'score', 'stageCompleted'
                    ];
                    for (const field of numericFields) {
                        if (state[field] !== undefined &&
                            (!Number.isFinite(Number(state[field])) || Number(state[field]) < 0)) {
                            return false;
                        }
                    }

                    const classifiedItems = Number(state.classifiedItems) || 0;
                    const totalClassifiedItems = Number(state.totalClassifiedItems) || 0;
                    const stageCompleted = Number(state.stageCompleted) || 0;
                    const completedBeforeCurrent = stages
                        .slice(0, stageIndex)
                        .reduce((sum, previousStage) => sum + previousStage.items.length, 0);
                    if (classifiedItems > stage.items.length ||
                        totalClassifiedItems > totalItems ||
                        stageCompleted !== stageIndex ||
                        totalClassifiedItems !== completedBeforeCurrent + classifiedItems) {
                        return false;
                    }

                    const savedClassifications = state.classifications || {};
                    if (typeof savedClassifications !== 'object' || Array.isArray(savedClassifications)) {
                        return false;
                    }
                    const allItemIds = new Set(stages.flatMap(s => s.items.map(item => String(item.id))));
                    for (const [itemId, answer] of Object.entries(savedClassifications)) {
                        if (!allItemIds.has(String(itemId)) || !answer ||
                            typeof answer.correct !== 'boolean' ||
                            !Number.isInteger(Number(answer.stage)) ||
                            Number(answer.stage) < 0 || Number(answer.stage) >= stages.length) {
                            return false;
                        }
                    }

                    this.state = JSON.parse(JSON.stringify(state));
                    this.state.mode = 'multiStage';
                    this.state.totalItems = totalItems;
                    this.state.totalStages = stages.length;
                    this.state.items = stage.items.slice();
                    this.state.categories = stage.categories.slice();
                    this.state.instruction = stage.instruction || this.content.instruction || '';
                    this.state.classifications = savedClassifications;
                    this.state.classifiedItems = classifiedItems;
                    this.state.totalClassifiedItems = totalClassifiedItems;
                    this.state.correctAnswers = Number(this.state.correctAnswers) || 0;
                    this.state.wrongAnswers = Number(this.state.wrongAnswers) || 0;
                    this.state.moves = Number(this.state.moves) || 0;
                    this.state.score = Number(this.state.score) || 0;
                    this.state.stageCompleted = stageCompleted;
                    return true;
                }

                if (state.items.length !== this.content.items.length ||
                    state.categories.length !== this.content.categories.length) {
                    return false;
                }

                this.state = JSON.parse(JSON.stringify(state));
                this.state.mode = mode;
                this.state.totalItems = this.content.items.length;
                this.state.items = this.content.items.slice();
                this.state.categories = this.content.categories.slice();
                this.state.classifications = this.state.classifications || {};
                this.state.classifiedItems = Number(this.state.classifiedItems) || 0;
                this.state.totalClassifiedItems = Number(this.state.totalClassifiedItems) || this.state.classifiedItems;
                this.state.correctAnswers = Number(this.state.correctAnswers) || 0;
                this.state.wrongAnswers = Number(this.state.wrongAnswers) || 0;
                this.state.moves = Number(this.state.moves) || 0;
                this.state.score = Number(this.state.score) || 0;

                return true;
            } catch (error) {
                console.error('ClassificationEngine: Failed to restore session', error);
                this.reset();
                return false;
            }
        },

        getResult() {
            return this.state && this.state.result ? this.state.result : null;
        },

        reset() {
            this.state = null;
            this.activityData = null;
            this.content = null;
            this.handler = null;
        }
    };

    window.ClassificationEngine = ClassificationEngine;
})(window);

console.log('Classification Engine Ready v1.5');
