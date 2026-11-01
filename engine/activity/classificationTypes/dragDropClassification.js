// =====================================
// Tahouri Edu Platform
// DragDrop Classification
// Version 1.0
// =====================================

(function (window) {
    'use strict';

    const DragDropClassification = {
        prepare(content) {
            return content;
        },

        classify(item, categoryId) {
            return item && item.categoryId === String(categoryId);
        }
    };

    window.DragDropClassification = DragDropClassification;

    if (window.ClassificationTypeRegistry) {
        window.ClassificationTypeRegistry.register('dragDrop', DragDropClassification);
    }
})(window);
