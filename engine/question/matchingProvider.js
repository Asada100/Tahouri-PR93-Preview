// =====================================
// Tahouri Edu Platform
// Matching Provider
// Version 2.0
//
// Responsibilities:
// - Prepare Matching activity content
// - Load static Matching content
// - Generate dynamic Matching content
// - Normalize generic relations
// - Validate matching structure
// - Preserve subject-agnostic content
//
// Design:
// - One shared provider for all Matching activities
// - Generator rules are selected by mode / generator
// - One left item has one correct right target
// - A right item MAY be the correct target for many left items
// - Supports one-to-one and many-to-one Matching
// - No rendering
// - No game-state management
// - No subject-specific logic inside the Matching Engine
// =====================================

const MatchingProvider = {

    lastSource: null,
    lastContent: null,

    getContent: function(activityData) {
        this.lastSource = null;
        this.lastContent = null;

        if (!activityData) {
            console.error("MatchingProvider: Activity Data Missing");
            return null;
        }

        const matching = this.extractMatchingData(activityData);

        if (!matching) {
            console.error("MatchingProvider: Matching Data Missing");
            return null;
        }

        const source = this.getSource(activityData, matching);
        let normalized = null;

        if (source === "generated") {
            const generated = this.generateQuestions(activityData, matching);
            normalized = this.normalize(generated);
        } else {
            normalized = this.normalize(matching);
        }

        if (!normalized) {
            console.error("MatchingProvider: Invalid Matching Data");
            return null;
        }

        this.lastSource = source;
        this.lastContent = normalized;

        console.log("MatchingProvider: Content Ready", {
            relations: normalized.pairs.length,
            leftItems: normalized.leftItems.length,
            rightItems: normalized.rightItems.length,
            source: this.lastSource
        });

        return normalized;
    },

    getSource: function(activityData, matching) {
        if (matching && matching.source) {
            return String(matching.source).toLowerCase();
        }

        const settings = activityData.settings || {};
        if (settings.questionSource) {
            return String(settings.questionSource).toLowerCase();
        }

        return "file";
    },

    extractMatchingData: function(activityData) {
        if (activityData.matching) return activityData.matching;
        if (Array.isArray(activityData.pairs)) return activityData;
        if (activityData.content && Array.isArray(activityData.content.pairs)) {
            return activityData.content;
        }
        return null;
    },

    generateQuestions: function(activityData, matching) {
        const settings = activityData.settings || {};
        const config = matching || {};

        const generator =
            config.generator ||
            settings.generator ||
            "numberClassification";

        const mode =
            config.mode ||
            settings.mode ||
            "evenOdd";

        const count = this.getCount(
            config.count !== undefined
                ? config.count
                : settings.questions,
            10
        );

        if (count === 0) return { ...config, pairs: [] };

        if (generator === "numberClassification" && mode === "evenOdd") {
            return this.generateNumberClassification(activityData, config, count);
        }

        console.warn("MatchingProvider: Unknown Generator/Mode", {
            generator: generator,
            mode: mode
        });

        return null;
    },

    generateNumberClassification: function(activityData, config, count) {
        const settings = activityData.settings || {};

        const min = this.getNumber(
            config.min !== undefined ? config.min : settings.minNumber,
            1
        );

        const max = this.getNumber(
            config.max !== undefined ? config.max : settings.maxNumber,
            100
        );

        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        const available = upper - lower + 1;
        const targetCount = Math.min(count, Math.max(0, available));

        if (targetCount === 0) {
            console.error("MatchingProvider: Invalid Number Range");
            return null;
        }

        const usedNumbers = new Set();
        const pairs = [];
        let attempts = 0;
        const maxAttempts = Math.max(targetCount * 100, 100);

        while (pairs.length < targetCount && attempts < maxAttempts) {
            attempts += 1;

            const number = this.randomInteger(lower, upper);
            if (usedNumbers.has(number)) continue;
            usedNumbers.add(number);

            const isEven = number % 2 === 0;

            pairs.push({
                id: "matching-" + (pairs.length + 1),
                left: {
                    id: "left-" + (pairs.length + 1),
                    value: number,
                    text: String(number)
                },
                right: {
                    id: isEven ? "right-even" : "right-odd",
                    value: isEven ? "زوج" : "فرد",
                    text: isEven ? "زوج" : "فرد"
                }
            });
        }

        if (pairs.length < targetCount) {
            console.error("MatchingProvider: Could Not Generate Enough Unique Numbers");
            return null;
        }

        this.shuffle(pairs);

        return {
            type: "matching",
            matchingType: config.matchingType || config.type || "basic",
            instruction: config.instruction || "",
            pairs: pairs
        };
    },

    normalize: function(data) {
        if (!data || !Array.isArray(data.pairs)) return null;

        const pairs = [];
        const leftItems = [];
        const rightItems = [];
        const pairIds = Object.create(null);
        const leftIds = Object.create(null);
        const rightIds = Object.create(null);

        for (let index = 0; index < data.pairs.length; index += 1) {
            const pair = data.pairs[index];
            if (!pair || !pair.left || !pair.right) continue;

            const pairId = String(pair.id || "pair-" + (index + 1));
            const left = this.normalizeItem(pair.left, "left-" + (index + 1));
            const right = this.normalizeItem(pair.right, "right-" + (index + 1));

            if (!left || !right) continue;

            if (pairIds[pairId]) {
                console.warn("MatchingProvider: Duplicate Pair ID Skipped:", pairId);
                continue;
            }

            if (leftIds[left.id]) {
                console.warn("MatchingProvider: Duplicate Left ID Skipped:", left.id);
                continue;
            }

            pairIds[pairId] = true;
            leftIds[left.id] = true;

            if (!rightIds[right.id]) {
                rightIds[right.id] = true;
                rightItems.push(right);
            }

            leftItems.push(left);
            pairs.push({
                id: pairId,
                left: left,
                right: right
            });
        }

        if (pairs.length === 0) return null;

        return {
            type: "matching",
            matchingType: data.matchingType || data.type || "basic",
            instruction: data.instruction || "",
            pairs: pairs,
            leftItems: leftItems,
            rightItems: rightItems
        };
    },

    normalizeItem: function(item, fallbackId) {
        if (item === null || typeof item === "undefined") return null;

        if (typeof item !== "object" || Array.isArray(item)) {
            return { id: fallbackId, value: item };
        }

        const id = String(item.id || fallbackId);
        const normalized = {};

        Object.keys(item).forEach(function(key) {
            normalized[key] = item[key];
        });

        normalized.id = id;

        // Preserve the visible text when static content uses text instead of value.
        if (!Object.prototype.hasOwnProperty.call(normalized, "value")) {
            if (Object.prototype.hasOwnProperty.call(normalized, "text")) {
                normalized.value = normalized.text;
            } else if (Object.prototype.hasOwnProperty.call(normalized, "label")) {
                normalized.value = normalized.label;
            } else if (Object.prototype.hasOwnProperty.call(normalized, "name")) {
                normalized.value = normalized.name;
            } else {
                normalized.value = "";
            }
        }

        return normalized;
    },

    validate: function(activityData) {
        const content = this.getContent(activityData);

        if (!content) {
            return {
                valid: false,
                pairs: 0,
                leftItems: 0,
                rightItems: 0,
                errors: ["Matching content is invalid."]
            };
        }

        return {
            valid: true,
            pairs: content.pairs.length,
            leftItems: content.leftItems.length,
            rightItems: content.rightItems.length,
            errors: []
        };
    },

    detectSource: function(activityData) {
        const matching = this.extractMatchingData(activityData);
        return matching ? this.getSource(activityData, matching) : null;
    },

    getLastContent: function() {
        return this.lastContent;
    },

    getLastSource: function() {
        return this.lastSource;
    },

    reset: function() {
        this.lastSource = null;
        this.lastContent = null;
        console.log("MatchingProvider Reset");
    },

    getCount: function(value, fallback) {
        const count = Number(value);
        if (!Number.isFinite(count)) return fallback;
        return Math.max(0, Math.floor(count));
    },

    getNumber: function(value, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.floor(number);
    },

    randomInteger: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    shuffle: function(items) {
        for (let i = items.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = items[i];
            items[i] = items[j];
            items[j] = temp;
        }
        return items;
    }
};

window.MatchingProvider = MatchingProvider;

console.log("Matching Provider v2.0 Ready");