// Tahouri Edu Platform - Basic Classification v1.0
// Supports the generic dragDrop classification mode.
// The engine owns scoring/state; this handler only defines the interaction rules.
(function (window) {
    'use strict';

    const BasicClassification = {
        prepare(content) {
            return content;
        },

        classify(item, categoryId) {
            if (!item) return false;
            return String(item.categoryId) === String(categoryId);
        },

        selectCategory(categoryId) {
            return categoryId;
        }
    };

    window.BasicClassification = BasicClassification;

    if (window.ClassificationTypeRegistry) {
        window.ClassificationTypeRegistry.register('dragDrop', BasicClassification);
    }
})(window);
