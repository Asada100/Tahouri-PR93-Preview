// =====================================
// Tahouri Edu Platform
// Matching Engine
// Version 1.3
// =====================================

const MatchingEngine = {
    state: { started: false, isFinished: false, locked: false },
    activity: null,
    matching: null,
    handler: null,
    leftItems: [],
    rightItems: [],
    selected: { left: null, right: null },
    matchedPairs: [],
    matchedLeftIds: [],
    moves: 0,

    start: function(activityData) {
        if (!activityData) return null;
        this.reset();
        this.activity = activityData;

        if (typeof MatchingProvider === "undefined" || typeof MatchingProvider.getContent !== "function") {
            console.error("Matching Engine: MatchingProvider is not available");
            return null;
        }

        const normalized = MatchingProvider.getContent(activityData);
        if (!normalized || !Array.isArray(normalized.pairs) || normalized.pairs.length === 0) return null;

        const matching = normalized;
        const requestedType = matching.matchingType;
        const registeredType = matching.type && MatchingTypeRegistry.has(matching.type) ? matching.type : null;
        const handlerType = requestedType || registeredType || "basic";
        const handler = MatchingTypeRegistry.get(handlerType);
        if (!handler || typeof handler.prepare !== "function") return null;

        const prepared = handler.prepare(normalized);
        if (!prepared || !Array.isArray(prepared.pairs) || prepared.pairs.length === 0) return null;

        this.handler = handler;
        this.matching = prepared;
        this.leftItems = prepared.leftItems
            ? prepared.leftItems.map(function(item) { return { ...item }; })
            : prepared.pairs.map(function(pair) { return { ...pair.left }; });
        this.rightItems = prepared.rightItems
            ? prepared.rightItems.map(function(item) { return { ...item }; })
            : this.uniqueRightItems(prepared.pairs);
        this.shuffle(this.rightItems);

        this.state.started = true;
        this.state.isFinished = false;
        this.state.locked = false;

        console.log("Matching Engine Started", {
            relations: prepared.pairs.length,
            leftItems: this.leftItems.length,
            rightItems: this.rightItems.length,
            type: handlerType
        });
        return this.getState();
    },

    extractMatchingData: function(activityData) {
        if (activityData.matching) return activityData.matching;
        if (activityData.pairs) return activityData;
        if (activityData.content && activityData.content.pairs) return activityData.content;
        return null;
    },

    normalizeMatchingData: function(data) {
        if (!data || !Array.isArray(data.pairs)) return null;
        const pairs = [], leftItems = [], rightItems = [];
        const pairIds = Object.create(null), leftIds = Object.create(null), rightIds = Object.create(null);

        data.pairs.forEach(function(pair, index) {
            if (!pair) return;
            const pairId = pair.id !== undefined ? String(pair.id) : "pair-" + (index + 1);
            const left = MatchingEngine.normalizeItem(pair.left, "left-" + (index + 1));
            const right = MatchingEngine.normalizeItem(pair.right, "right-" + (index + 1));
            if (!left || !right) return;
            if (pairIds[pairId] || leftIds[left.id]) return;
            pairIds[pairId] = true;
            leftIds[left.id] = true;
            if (!rightIds[right.id]) {
                rightIds[right.id] = true;
                rightItems.push(right);
            }
            leftItems.push(left);
            pairs.push({ id: pairId, left: left, right: right });
        });

        return {
            type: data.type || "matching",
            matchingType: data.matchingType || "basic",
            instruction: data.instruction || "",
            pairs: pairs,
            leftItems: leftItems,
            rightItems: rightItems
        };
    },

    normalizeItem: function(item, fallbackId) {
        if (item === null || item === undefined) return null;
        if (typeof item === "object" && !Array.isArray(item)) {
            if (item.id === undefined || item.id === null) return { ...item, id: fallbackId };
            return { ...item, id: String(item.id) };
        }
        return { id: fallbackId, value: item };
    },

    uniqueRightItems: function(pairs) {
        const seen = Object.create(null), result = [];
        pairs.forEach(function(pair) {
            const id = String(pair.right.id);
            if (seen[id]) return;
            seen[id] = true;
            result.push({ ...pair.right });
        });
        return result;
    },

    select: function(side, itemId) {
        if (!this.state.started || this.state.isFinished || this.state.locked) return this.getState();
        if (side !== "left" && side !== "right") return this.getState();
        const item = this.findItem(side, itemId);
        if (!item) return this.getState();
        if (side === "left" && this.isMatched("left", item.id)) return this.getState();

        this.selected[side] = item;
        if (this.selected.left && this.selected.right) return this.checkMatch();
        return this.getState();
    },

    findItem: function(side, itemId) {
        const list = side === "left" ? this.leftItems : this.rightItems;
        const normalizedId = String(itemId);
        return list.find(function(item) { return String(item.id) === normalizedId; }) || null;
    },

    checkMatch: function() {
        const left = this.selected.left, right = this.selected.right;
        if (!left || !right) return this.getState();
        this.moves += 1;
        const pair = this.findPairForLeft(left.id);
        const isCorrect = !!pair && String(pair.right.id) === String(right.id);
        const result = { correct: isCorrect, left: left, right: right, pairId: pair ? pair.id : null, moves: this.moves };

        if (isCorrect && !this.matchedPairs.includes(pair.id)) {
            this.matchedPairs.push(pair.id);
            this.matchedLeftIds.push(String(left.id));
        }
        this.selected.left = null;
        this.selected.right = null;

        if (this.matchedLeftIds.length >= this.leftItems.length) this.finish();
        return result;
    },

    findPairForLeft: function(leftId) {
        return this.matching.pairs.find(function(pair) { return String(pair.left.id) === String(leftId); }) || null;
    },

    isMatched: function(side, itemId) {
        const normalizedId = String(itemId);
        if (side === "left") return this.matchedLeftIds.includes(normalizedId);
        return false;
    },

    finish: function() {
        if (this.state.isFinished) return this.getState();

        this.state.isFinished = true;
        this.state.locked = true;

        const totalPairs = this.leftItems.length;
        const percentage = totalPairs > 0
            ? Math.round((this.matchedLeftIds.length / totalPairs) * 100)
            : 0;

        const result = typeof ActivityResult !== "undefined" && typeof ActivityResult.create === "function"
            ? ActivityResult.create({
                activityId: this.activity ? this.activity.id : null,
                score: percentage,
                percentage: percentage,
                correctAnswers: this.matchedLeftIds.length,
                wrongAnswers: Math.max(0, this.moves - this.matchedLeftIds.length),
                pairs: this.matchedLeftIds.length,
                totalPairs: totalPairs,
                moves: this.moves,
                message: "🎉 فعالیت تطبیق با موفقیت تمام شد"
            })
            : {
                activityId: this.activity ? this.activity.id : null,
                score: percentage,
                percentage: percentage,
                correctAnswers: this.matchedLeftIds.length,
                wrongAnswers: Math.max(0, this.moves - this.matchedLeftIds.length),
                pairs: this.matchedLeftIds.length,
                totalPairs: totalPairs,
                moves: this.moves,
                completed: true,
                message: "🎉 فعالیت تطبیق با موفقیت تمام شد"
            };

        console.log("Matching Engine Finished", {
            moves: this.moves,
            matchedPairs: this.matchedPairs.length,
            matchedLeftItems: this.matchedLeftIds.length,
            totalLeftItems: totalPairs
        });

        if (typeof EventManager !== "undefined" && typeof EventManager.emit === "function") {
            const isCompositeStage = !!(
                this.activity &&
                this.activity.settings &&
                this.activity.settings.compositeStage === true
            );
            if (isCompositeStage) {
                // A matching stage belongs to the parent composite activity;
                // never let it finish the platform activity on its own.
                EventManager.emit("compositeMatchingFinished", {
                    activityId: this.activity.id,
                    result: result
                });
            } else {
                // Preserve the existing lifecycle for standalone matching activities.
                EventManager.emit("activityFinished", result);
            }
        }

        return this.getState();
    },

    reset: function() {
        this.state.started = false;
        this.state.isFinished = false;
        this.state.locked = false;
        this.activity = null;
        this.matching = null;
        this.handler = null;
        this.leftItems = [];
        this.rightItems = [];
        this.selected = { left: null, right: null };
        this.matchedPairs = [];
        this.matchedLeftIds = [];
        this.moves = 0;
    },

    getState: function() {
        return {
            started: this.state.started,
            finished: this.state.isFinished,
            locked: this.state.locked,
            instruction: this.matching ? this.matching.instruction : "",
            type: this.matching ? this.matching.type : null,
            leftItems: this.leftItems.map(function(item) { return { ...item }; }),
            rightItems: this.rightItems.map(function(item) { return { ...item }; }),
            selected: {
                left: this.selected.left ? { ...this.selected.left } : null,
                right: this.selected.right ? { ...this.selected.right } : null
            },
            matchedPairs: [...this.matchedPairs],
            matchedLeftIds: [...this.matchedLeftIds],
            totalPairs: this.leftItems.length,
            totalRelations: this.matching ? this.matching.pairs.length : 0,
            moves: this.moves
        };
    },

    getSessionState: function() {
        return {
            type: "matching",
            activity: this.activity,
            matching: this.matching ? JSON.parse(JSON.stringify(this.matching)) : null,
            leftItems: JSON.parse(JSON.stringify(this.leftItems)),
            rightItems: JSON.parse(JSON.stringify(this.rightItems)),
            selected: {
                left: this.selected.left ? { ...this.selected.left } : null,
                right: this.selected.right ? { ...this.selected.right } : null
            },
            matchedPairs: [...this.matchedPairs],
            matchedLeftIds: [...this.matchedLeftIds],
            moves: this.moves,
            state: {
                started: this.state.started,
                isFinished: this.state.isFinished,
                locked: this.state.locked
            }
        };
    },

    restoreSession: function(snapshot) {
        if (!snapshot || snapshot.type !== "matching") return null;
        this.activity = snapshot.activity || null;
        this.matching = snapshot.matching ? JSON.parse(JSON.stringify(snapshot.matching)) : null;
        this.leftItems = Array.isArray(snapshot.leftItems) ? JSON.parse(JSON.stringify(snapshot.leftItems)) : [];
        this.rightItems = Array.isArray(snapshot.rightItems) ? JSON.parse(JSON.stringify(snapshot.rightItems)) : [];
        this.selected = {
            left: snapshot.selected && snapshot.selected.left ? { ...snapshot.selected.left } : null,
            right: snapshot.selected && snapshot.selected.right ? { ...snapshot.selected.right } : null
        };
        this.matchedPairs = Array.isArray(snapshot.matchedPairs) ? [...snapshot.matchedPairs] : [];
        this.matchedLeftIds = Array.isArray(snapshot.matchedLeftIds) ? [...snapshot.matchedLeftIds] : this.deriveMatchedLeftIds();
        this.moves = Number.isFinite(snapshot.moves) ? snapshot.moves : 0;
        this.state.started = !!(snapshot.state && snapshot.state.started);
        this.state.isFinished = !!(snapshot.state && snapshot.state.isFinished);
        this.state.locked = !!(snapshot.state && snapshot.state.locked);
        const handlerType = this.matching && (this.matching.matchingType || this.matching.type);
        this.handler = handlerType && typeof MatchingTypeRegistry !== "undefined" ? MatchingTypeRegistry.get(handlerType) : null;
        return this.getState();
    },

    deriveMatchedLeftIds: function() {
        if (!this.matching || !Array.isArray(this.matching.pairs)) return [];
        const result = [], matched = this.matchedPairs || [];
        this.matching.pairs.forEach(function(pair) {
            if (matched.includes(pair.id)) result.push(String(pair.left.id));
        });
        return result;
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

window.MatchingEngine = MatchingEngine;
console.log("Matching Engine Ready v1.3");