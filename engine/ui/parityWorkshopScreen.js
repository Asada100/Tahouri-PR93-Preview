// Dedicated interaction layer for the Parity Discovery Workshop.
(function () {
    if (typeof QuizScreen === "undefined") return;
    const originalShow = QuizScreen.show.bind(QuizScreen);
    QuizScreen.show = function (data) {
        if (!data || data.activityId !== "parityDiscoveryWorkshop") return originalShow(data);
        const app = document.getElementById("app");
        const q = data.question || {};
        const pool = Array.isArray(q.numberPool) ? q.numberPool : [];
        const count = Number(q.pickCount) || 2;
        this.workshopSelection = [];
        this.workshopLocked = false;
        app.innerHTML = `
          <div class="quizScreen quizGameBoard parityWorkshop" dir="rtl">
            <div class="gameMasthead"><div class="gameBrand"><div class="gameBadge">🧩</div><div><h1>کارگاه کشف قانون</h1><p>انتخاب کن، پیش‌بینی کن، آزمایش کن ✨</p></div></div><div class="gameScore">⭐ ${data.score || 0} امتیاز</div></div>
            <h2 class="gameTitle">قانون جمع زوج و فرد</h2>
            <div class="gameProgress"><div class="gameProgressLabels"><span>مرحلهٔ ${data.currentQuestion || 1} از ${data.totalQuestions || 10}</span><span>انتخاب ${count} عدد</span></div><div class="gameProgressTrack"><div class="gameProgressFill" style="width:${Math.round(((data.currentQuestion || 1)/(data.totalQuestions || 10))*100)}%"></div></div></div>
            <div class="questionBox">🔎 آزمایش شمارهٔ ${data.currentQuestion || 1}</div>
            <h2 class="quizQuestion">از کارت‌های زیر ${count} عدد انتخاب کن؛ بعد پیش‌بینی کن حاصل جمع زوج است یا فرد.</h2>
            <div class="workshopNumberGrid" id="workshopNumberGrid">${pool.map((n,i)=>`<button type="button" class="workshopNumber" data-number="${n}" data-index="${i}" aria-pressed="false">${n}</button>`).join("")}</div>
            <p class="workshopSelectionStatus" id="workshopSelectionStatus">هنوز عددی انتخاب نشده است.</p>
            <div class="workshopPrediction" id="workshopPrediction" hidden><p>پیش‌بینی تو چیست؟</p><div class="quizOptions"><button type="button" class="quizOptionBtn" data-prediction="زوج">زوج</button><button type="button" class="quizOptionBtn" data-prediction="فرد">فرد</button></div></div>
            <div class="quizMessage" id="workshopMessage" aria-live="polite"></div>
            <button type="button" class="quizOptionBtn workshopNext" id="workshopNext" hidden>آزمایش بعدی ←</button>
          </div>`;
        const selected = this.workshopSelection;
        const status = document.getElementById("workshopSelectionStatus");
        const prediction = document.getElementById("workshopPrediction");
        document.querySelectorAll(".workshopNumber").forEach(button => {
          button.addEventListener("click", () => {
            if (this.workshopLocked) return;
            const index = Number(button.dataset.index);
            const at = selected.indexOf(index);
            if (at >= 0) selected.splice(at,1);
            else if (selected.length < count) selected.push(index);
            button.classList.toggle("selected", selected.includes(index));
            button.setAttribute("aria-pressed", String(selected.includes(index)));
            status.textContent = selected.length ? "عددهای انتخاب‌شده: " + selected.map(i=>pool[i]).join(" + ") + " (" + selected.length + " از " + count + ")" : "هنوز عددی انتخاب نشده است.";
            prediction.hidden = selected.length !== count;
          });
        });
        document.querySelectorAll("[data-prediction]").forEach(button => {
          button.addEventListener("click", () => {
            if (this.workshopLocked || selected.length !== count) return;
            const sum = selected.reduce((total,i)=>total+pool[i],0);
            const correct = sum % 2 === 0 ? "زوج" : "فرد";
            const message = document.getElementById("workshopMessage");
            this.workshopLocked = true;
            if (button.dataset.prediction === correct) {
              ScoreManager.addCorrect();
              message.className = "quizMessage correct";
              message.textContent = "آفرین! پیش‌بینی‌ات درست بود. " + selected.map(i=>pool[i]).join(" + ") + " = " + sum + "؛ حاصل " + correct + " است.";
              EventManager.emit("answer:correct", q);
            } else {
              message.className = "quizMessage learning";
              message.textContent = "این بار " + selected.map(i=>pool[i]).join(" + ") + " = " + sum + "؛ حاصل " + correct + " است. " + (q.explanation || "");
              EventManager.emit("answer:wrong", q);
            }
            document.querySelectorAll(".workshopNumber,[data-prediction]").forEach(b=>b.disabled=true);
            document.getElementById("workshopNext").hidden = false;
          });
        });
        document.getElementById("workshopNext").addEventListener("click", () => {
          const next = QuizEngine.next();
          if (next) {
            this.show({title: QuizEngine.activity.title, activityId:"parityDiscoveryWorkshop",activityGroup:"evenOdd",score:ScoreManager.score,currentQuestion:QuizEngine.currentQuestion+1,totalQuestions:QuizEngine.questions.length,question:next});
          }
        });
    };
    console.log("Parity Discovery Workshop screen ready");
})();
