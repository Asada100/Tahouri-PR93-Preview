// Tahouri Edu Platform - Classification Type Registry v1.0
(function (window) {
    'use strict';
    const types = {};
    const ClassificationTypeRegistry = {
        register(name, handler) { if (!name || !handler) throw new Error('Invalid classification type'); types[name] = handler; },
        get(name) { return types[name] || null; },
        has(name) { return !!types[name]; },
        list() { return Object.keys(types); }
    };
    window.ClassificationTypeRegistry = ClassificationTypeRegistry;
})(window);
