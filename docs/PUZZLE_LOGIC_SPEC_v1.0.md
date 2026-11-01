# Tahouri Edu Platform — Puzzle Logic Specification v1.0

## Purpose

This document fixes the gameplay logic of the eight Puzzle families before further UX/animation work.

The rule is simple: **the player must understand what the puzzle asks them to discover or construct from the screen itself.** A puzzle must not become only an input form.

This specification does not change the engine architecture. Existing `PuzzleEngine`, puzzle type modules, `PuzzleScreen`, and shared `PuzzleUX` remain the implementation layers.

---

## 1. Ordering Puzzle

### Goal
Arrange a set of items into a required order.

### Player action
The player directly reorders the visible items.

### Examples
- smallest → largest
- earliest → latest
- first step → last step
- simple → complex

### Win condition
The current order exactly matches `correctOrder`.

### Core interaction
**Drag / reorder.**

### Must not become
A list of text inputs asking the player to type positions.

### Status
**Logic approved.**

---

## 2. Sequence Puzzle

### Goal
Discover the rule of a visible numerical or symbolic sequence and determine the missing member.

### Player action
The player studies the visible sequence, identifies the pattern, and supplies the missing member.

### Example
`2, 4, 6, ?, 10`

The intended reasoning is `+2`, not simply guessing the stored answer.

### Win condition
The missing value is correct according to the puzzle's intended sequence rule.

### Data meaning
- `pattern` describes the intended pattern when available.
- `step` describes a constant additive step when applicable.
- `multiplier` describes a multiplicative rule when applicable.
- `answer` is the expected missing value.

### Core interaction
**Pattern discovery + answer placement.**

### Important rule
The stored rule metadata must remain meaningful. The puzzle should not present rule metadata that has no relationship to validation.

### Status
**Logic approved; validation must respect the declared pattern metadata where it is supplied.**

---

## 3. Visual Math Puzzle

### Goal
Solve a mathematical problem represented visually.

### Supported modes
- `addition`
- `subtraction`
- `counting`
- `comparison`

### Player action
The player reasons from the visual groups and selects or supplies the result.

### Examples
- Count objects.
- Combine two groups.
- Remove one group from another.
- Decide which group is greater, smaller, or equal.

### Win condition
The selected/supplied mathematical result is correct.

### Core interaction
**Visual manipulation or direct choice**, depending on mode.

### Must not become
A plain arithmetic input with the images acting only as decoration.

### Status
**Logic approved.**

---

## 4. Input / Output Puzzle

### Goal
Discover the rule that transforms an input into an output, then apply that rule to the missing case.

### Example
`2 → 5`
`4 → 9`
`7 → 15`
`9 → ?`

The intended reasoning is to discover `output = input × 2 + 1`, then calculate `9 → 19`.

### Player action
1. Inspect the completed input/output examples.
2. Infer the transformation rule.
3. Apply it to the incomplete pair.

### Win condition
The missing output is correct **and the puzzle's declared rule, when supplied, is consistent with the examples**.

### Data meaning
- `examples` are evidence for discovering the rule.
- `rule` describes the intended transformation when supplied.
- `answer` is the missing output.

### Core interaction
**Rule discovery + application.**

### Must not become
A single disconnected input box with no visible rule-discovery context.

### Status
**Logic approved; the current implementation must make rule discovery part of the actual puzzle state rather than decorative metadata.**

---

## 5. Sentence Puzzle

Sentence Puzzle has two distinct gameplay modes.

### 5A. Sentence Order

#### Goal
Construct a grammatically correct sentence from shuffled words.

#### Player action
Reorder the words.

#### Win condition
The resulting sequence matches the accepted correct order.

#### Core interaction
**Drag / reorder.**

#### Status
**Logic approved.**

### 5B. Sentence Grammar

#### Goal
Identify the grammatical role of each target word.

#### Player action
Select the grammatical role for each word.

#### Win condition
Every required word has the correct grammatical role.

#### Core interaction
**Direct selection**, not text entry.

#### Status
**Logic approved.**

---

## 6. Grid Puzzle

### Goal
Discover the numerical rule represented by a grid and use it to fill missing cells.

### Example
```text
2   4   6
8   ?   12
14  16  18
```

The player should infer the relationship represented by the grid rather than merely retrieve a stored answer.

### Player action
1. Inspect the complete cells.
2. Discover the row/column/grid relationship.
3. Fill the missing cells.

### Win condition
All missing cells satisfy the declared grid rule.

### Data meaning
- `rules` describes the intended relationship.
- `answers` remains useful as an explicit expected result/fallback.
- Rule validation is authoritative when a rule is supplied.

### Core interaction
**Cell placement / direct manipulation.**

### Must not become
A table containing empty numeric text boxes with no discoverable relationship.

### Status
**Logic approved; rule metadata must become part of validation when supplied.**

---

## 7. Word Grid Puzzle

### Goal
Discover and apply the specified relationship between words.

### Supported relation families
- `semantic`
- `synonym`
- `antonym`
- `category`
- `grammar`

### Player action
The player identifies the relationship and places/selects the appropriate word.

### Examples
- `شاد → خوشحال` for synonym.
- `گرم → سرد` for antonym.
- `گربه → جانور` for category.
- a word → its required grammatical role for grammar mode.

### Win condition
The placed answer satisfies the declared relation, not merely a blind string match when relation information is available.

### Core interaction
**Word selection / placement.**

### Must not become
A blank text box that asks for an arbitrary word while hiding why that word is correct.

### Status
**Logic approved; relation metadata must become authoritative when supplied.**

---

## 8. Cross Grid Puzzle

### Goal
Solve intersecting horizontal and/or vertical calculation paths.

### Player action
The player fills missing cells so that every declared path satisfies its operations and target.

### Example concept
A path may represent:
`5 → + → 3 → × → 2`

The engine evaluates the path from its starting value through its operations.

### Win condition
1. Every missing cell is filled.
2. Expected missing-cell answers are correct.
3. Every declared path is valid.

### Core interaction
**Direct cell placement with visible path relationships.**

### Critical rule
A CrossGrid puzzle with zero paths is not a meaningful CrossGrid gameplay test. At least one horizontal or vertical path must exist in real content.

### Must not become
A normal numeric grid with a different title.

### Status
**Logic approved; path data is mandatory for meaningful CrossGrid content.**

---

# Shared Puzzle Rules

## A. Every Puzzle needs a visible objective

The instruction must answer:

> «دقیقاً چه چیزی را باید پیدا، مرتب، کشف یا کامل کنم؟»

## B. The interaction must match the learning objective

| Objective | Preferred interaction |
|---|---|
| Arrange | Drag / reorder |
| Discover a pattern | Observe → place answer |
| Solve visual math | Select / manipulate |
| Discover a rule | Inspect examples → apply rule |
| Grammar classification | Select |
| Fill a rule-based grid | Cell placement |
| Word relationship | Select / place |
| Intersecting calculations | Cell placement + path feedback |

## C. Stored answers are not automatically the gameplay logic

`answers` may provide the expected result, but when the puzzle declares a rule/relation/path, that structure must participate in validation.

## D. No UX-only fix for a logic problem

Animation, snap, highlight, feedback, and movement are secondary. The gameplay rule must be correct first.

## E. Test data must represent the real puzzle

A test must contain the information required by that Puzzle family. In particular:

- Input/Output needs multiple examples.
- Grid needs a meaningful rule.
- WordGrid needs a meaningful relation.
- CrossGrid needs at least one real path.

## F. Architecture remains unchanged

This specification does not introduce new engines, duplicate Puzzle implementations, or a second Puzzle architecture. It defines behavior for the existing eight Puzzle types.

---

# Implementation Order

The logic should be implemented and tested in this order:

1. Input / Output — make rule discovery real.
2. Grid — make declared rules meaningful during validation.
3. Word Grid — make relation metadata meaningful during validation.
4. Cross Grid — create and test real path-based content.
5. Sequence — connect declared pattern metadata to validation where supplied.
6. Sentence Grammar — make role selection the primary interaction.
7. Ordering / Sentence Order / Visual Math — preserve current logic and improve interaction only where needed.

After each family: **one goal → implement → runtime test → commit**.
