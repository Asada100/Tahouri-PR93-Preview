# Tahouri Edu Platform — Puzzle Architecture v1.0

## 1. هدف

Puzzle در طهوری باید یک «چالش قابل حل» باشد، نه یک فرم ورود پاسخ.

بازیکن باید یکی از این کارها را انجام دهد:
- کشف کند
- جابه‌جا کند
- بسازد
- مقایسه کند
- مسیر پیدا کند
- استدلال کند
- مسئله را مرحله‌به‌مرحله حل کند

تعامل، منطق و بازخورد باید از ماهیت خود Puzzle بیاید.

## 2. اصل اصلی

```text
Puzzle Experience
        ↓
Puzzle Definition
        ↓
Puzzle Logic
        ↓
Puzzle Interaction
        ↓
Puzzle Feedback
        ↓
Puzzle Progress
```

UI نباید منطق Puzzle را تعریف کند و پاسخ ذخیره‌شده نباید به‌تنهایی ماهیت Puzzle باشد.

## 3. خانواده‌های نسل جدید

### A — ساختن و جابه‌جایی
- Jigsaw / تصویر به‌هم‌ریخته
- Pattern / چیدن قطعات و شکل‌ها

### B — منطق و استدلال
- Sudoku
- Logic Puzzle
- Nonogram

### C — کشف و مشاهده
- Spot the Difference
- Hidden Pattern
- Visual Reasoning

### D — مسیر و فضا
- Maze
- Path Puzzle

### E — زبان
- Sentence Builder
- Word Relation / دسته‌بندی رابطه‌ای

### F — ریاضی تعاملی
- Visual Math
- Interactive Problem Solving

## 4. تعریف Puzzle

هر Puzzle جدید باید حداقل این اطلاعات را داشته باشد:

```js
{
    id,
    type,
    title,
    objective,
    instruction,
    difficulty,
    content,
    rules,
    interaction,
    feedback,
    hints,
    scoring,
    progression
}
```

### objective
بازیکن باید بداند چه چیزی را باید حل یا کشف کند.

### rules
قانون واقعی Puzzle؛ نه صرفاً داده‌ای برای نمایش یا مقایسه با answer.

### interaction
نحوه انجام کار توسط بازیکن باید با ماهیت Puzzle هماهنگ باشد.

### feedback
بازخورد باید به اقدام بازیکن مربوط باشد و در صورت امکان دلیل خطا یا سرنخ بعدی را نشان دهد.

## 5. سختی

Difficulty فقط بر اساس بزرگ‌تر شدن اعداد نیست.

سختی می‌تواند از این موارد افزایش پیدا کند:
- فضای جست‌وجوی بزرگ‌تر
- سرنخ کمتر
- گزینه‌های مشابه‌تر
- مراحل بیشتر
- روابط پنهان‌تر
- نیاز به چند استدلال پشت سر هم
- کاهش تدریجی کمک

سطوح پیشنهادی:

```text
1  آشنایی
2  آسان
3  متوسط
4  چالشی
5  پیشرفته
```

در هر خانواده، معنای واقعی این پنج سطح باید جداگانه تعریف شود.

## 6. بازخورد و ارزش‌گذاری

امتیاز نباید فقط به «درست/غلط» وابسته باشد.

داده‌های قابل ثبت:
- completion
- score
- attempts
- mistakes
- hintsUsed
- moves
- difficulty
- mastery

زمان فقط زمانی استفاده شود که سرعت بخشی از هدف Puzzle باشد.

## 7. راهنمایی

Hint باید پله‌ای باشد:

```text
Hint 1 → توجه به یک نشانه
Hint 2 → محدود کردن گزینه‌ها
Hint 3 → نشان دادن روش فکر کردن
```

راهنمایی نباید فوراً جواب را آشکار کند، مگر در حالت آموزشی تعریف‌شده.

## 8. معماری فنی

زیرساخت جدید در کنار معماری فعلی قرار می‌گیرد و جایگزین آن نمی‌شود:

```text
ActivityManager
      ↓
PuzzleEngine (موجود)
      ↓
PuzzleTypeRegistry (موجود)
      ↓
Puzzle Handler (موجود یا جدید)
      ↓
Puzzle Definition / Logic Contract (جدید)
      ↓
Puzzle Interaction / Feedback / Difficulty (جدید)
      ↓
PuzzleScreen / Shared UI
```

موتورهای قدیمی حذف یا جابه‌جا نمی‌شوند.

## 9. دسته‌بندی موتورهای فعلی

موتورهای فعلی همچنان قابل نگهداری‌اند و فعلاً حذف نمی‌شوند:

- ordering
- sequence
- visualMath
- inputOutput
- sentence
- grid
- wordGrid
- crossGrid

این‌ها منبع اجباری Puzzleهای نسل جدید نیستند. هر کدام فقط در صورتی استفاده می‌شوند که تجربه واقعی Puzzle ایجاد کنند.

## 10. نسل اول پیشنهادی

برای ساخت و آزمایش تجربه واقعی، اولویت:

1. Jigsaw
2. Sudoku
3. Visual Math / Problem Puzzle
4. Maze
5. Logic Puzzle
6. Nonogram
7. Sentence Builder
8. Spot the Difference

## 11. قانون توسعه

هر Puzzle جدید باید قبل از کدنویسی این پنج سؤال را پاسخ دهد:

1. معمای بازیکن چیست؟
2. بازیکن دقیقاً چه چیزی را کشف یا حل می‌کند؟
3. چرا این تعامل Puzzle است و فرم نیست؟
4. چگونه سخت‌تر می‌شود؟
5. بازخورد چه چیزی به بازیکن یاد می‌دهد؟

اگر پاسخ روشن نباشد، ابتدا طراحی اصلاح می‌شود؛ سپس موتور نوشته می‌شود.

## 12. محدودیت‌های پروژه

- معماری فعلی Tahouri حفظ می‌شود.
- موتورهای موجود حذف نمی‌شوند.
- Puzzle جدید به‌صورت بازی مستقل خارج از Activity Platform ساخته نمی‌شود.
- تست‌ها از مسیر واقعی ActivityManager انجام می‌شوند.
- هر تغییر فنی یک هدف مشخص دارد.
- بعد از هر تغییر، تست واقعی انجام می‌شود.
