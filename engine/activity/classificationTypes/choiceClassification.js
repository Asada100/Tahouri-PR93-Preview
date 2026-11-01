// Tahouri Edu Platform - Choice Classification v1.0
(function (window) {
    'use strict';
    const ChoiceClassification = {
        prepare(content) { return content; },
        classify(item, categoryId) { return item.categoryId === String(categoryId); },
        selectCategory(categoryId) { return categoryId; }
    };
    window.ChoiceClassification = ChoiceClassification;
    if (window.ClassificationTypeRegistry) window.ClassificationTypeRegistry.register('choice', ChoiceClassification);
})(window);
