// Tahouri Edu Platform - Classification Provider v1.0
(function (window) {
    'use strict';
    const ClassificationProvider = {
        lastContent: null,
        getContent(activityData) {
            const data = this.extractClassificationData(activityData);
            const content = this.normalize(data);
            this.lastContent = content;
            return content;
        },
        extractClassificationData(activityData) {
            if (activityData && activityData.classification) return activityData.classification;
            if (activityData && activityData.content && activityData.content.classification) return activityData.content.classification;
            throw new Error('Classification data not found');
        },
        normalize(data) {
            if (!data) throw new Error('Invalid classification structure');

            const normalizeStage = (stage, stageIndex) => {
                if (!stage || !Array.isArray(stage.categories) || !Array.isArray(stage.items)) {
                    throw new Error(`Invalid classification stage: ${stageIndex + 1}`);
                }

                if (stage.categories.length === 0 || stage.items.length === 0) {
                    throw new Error(`Classification stage ${stageIndex + 1} must contain categories and items`);
                }

                const categories = stage.categories.map((c, i) => ({
                    id: String(c.id ?? i),
                    title: String(c.title ?? c.name ?? c.id ?? i)
                }));

                const categoryIds = new Set();
                categories.forEach(category => {
                    if (categoryIds.has(category.id)) {
                        throw new Error(`Duplicate category id in stage ${stageIndex + 1}: ${category.id}`);
                    }
                    categoryIds.add(category.id);
                });

                const items = stage.items.map((item, i) => {
                    const normalized = {
                        id: String(item.id ?? i),
                        content: item.content ?? item.text ?? '',
                        type: item.type || 'text',
                        categoryId: String(item.categoryId ?? '')
                    };
                    if (!categoryIds.has(normalized.categoryId)) {
                        throw new Error(`Invalid categoryId for item: ${normalized.id}`);
                    }
                    return normalized;
                });

                const mode = String(stage.mode || data.stageMode || 'choice');
                if (mode !== 'choice' && mode !== 'dragDrop') {
                    throw new Error(`Unsupported interaction mode in stage ${stageIndex + 1}: ${mode}`);
                }

                return {
                    id: String(stage.id ?? `stage-${stageIndex + 1}`),
                    title: stage.title || '',
                    instruction: stage.instruction || '',
                    mode,
                    categories,
                    items
                };
            };

            if (data.mode === 'multiStage') {
                if (!Array.isArray(data.stages) || data.stages.length === 0) {
                    throw new Error('Multi-stage classification requires at least one stage');
                }

                const stages = data.stages.map(normalizeStage);
                const seenItemIds = new Set();

                stages.forEach(stage => {
                    stage.items.forEach(item => {
                        if (seenItemIds.has(item.id)) {
                            throw new Error(`Duplicate item id across stages: ${item.id}`);
                        }
                        seenItemIds.add(item.id);
                    });
                });

                return {
                    type: 'classification',
                    mode: 'multiStage',
                    instruction: data.instruction || '',
                    stages,
                    categories: stages[0].categories,
                    items: stages[0].items
                };
            }

            if (!Array.isArray(data.categories) || !Array.isArray(data.items)) {
                throw new Error('Invalid classification structure');
            }

            const categories = data.categories.map((c, i) => ({
                id: String(c.id ?? i),
                title: String(c.title ?? c.name ?? c.id ?? i)
            }));
            const categoryIds = new Set(categories.map(c => c.id));
            const items = data.items.map((item, i) => {
                const normalized = {
                    id: String(item.id ?? i),
                    content: item.content ?? item.text ?? '',
                    type: item.type || 'text',
                    categoryId: String(item.categoryId ?? '')
                };
                if (!categoryIds.has(normalized.categoryId)) {
                    throw new Error(`Invalid categoryId for item: ${normalized.id}`);
                }
                return normalized;
            });
            return {
                type: 'classification',
                mode: data.mode || 'choice',
                instruction: data.instruction || '',
                categories,
                items
            };
        },
        validate(data) { this.normalize(data); return true; },
        getLastContent() { return this.lastContent; },
        reset() { this.lastContent = null; }
    };
    window.ClassificationProvider = ClassificationProvider;
})(window);
