// =====================================
// Tahouri Edu Platform
// MultiStage Classification
// Version 1.0
//
// Purpose:
// - Defines the multi-stage classification interaction contract
// - Keeps stage progression logic in ClassificationEngine
// - No rendering
// =====================================

(function (window) {
    'use strict';

    const MultiStageClassification = {
        prepare(content) {
            if (!content || !Array.isArray(content.stages) || content.stages.length === 0) {
                throw new Error('MultiStage Classification: Invalid stages');
            }
            return content;
        },

        classify(item, categoryId) {
            return !!item && String(item.categoryId) === String(categoryId);
        },

        selectCategory(categoryId) {
            return categoryId;
        }
    };

    window.MultiStageClassification = MultiStageClassification;

    if (window.ClassificationTypeRegistry) {
        window.ClassificationTypeRegistry.register('multiStage', MultiStageClassification);
    }
})(window);

console.log('MultiStage Classification v1.0 Ready');
