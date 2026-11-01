// =====================================
// Tahouri Edu Platform
// Version 3.8
// Result Modal
// Quiz + Memory Compatible
// Navigation Buttons
// Reports + Activity List Targets
// Return Home After Report Close
// CSS owned by activityRuntime.css
// =====================================

const ResultModal = {

    show: function(result){

        const oldModal = document.getElementById("resultModal");
        if(oldModal) oldModal.remove();

        document.body.classList.remove("activity-playing");
        document.body.classList.add("activity-result-open");

        const percentage = result && result.percentage !== undefined
            ? result.percentage
            : 0;

        const stars = Math.round(percentage / 20);
        let starText = "";

        for(let i = 0; i < 5; i++){
            starText += i < stars ? "⭐" : "☆";
        }

        const modal = document.createElement("div");
        modal.id = "resultModal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.dir = "rtl";

        modal.innerHTML = `
            <div class="resultModalWindow">
                <h1>🎉 نتیجه فعالیت</h1>
                <hr>
                <h2>${result.title || "فعالیت آموزشی"}</h2>

                <p>امتیاز: <strong>${result.score || 0}</strong></p>
                <p>درصد موفقیت: <strong>${percentage}%</strong></p>

                <div class="resultModalStars" aria-label="${stars} ستاره از 5">
                    ${starText}
                </div>

                ${result.correctAnswers !== undefined
                    ? `<p>پاسخ صحیح: ${result.correctAnswers}</p>`
                    : ""}

                ${result.wrongAnswers !== undefined
                    ? `<p>پاسخ اشتباه: ${result.wrongAnswers}</p>`
                    : ""}

                ${result.pairs !== undefined
                    ? `<p>جفت پیدا شده: ${result.pairs}</p>`
                    : ""}

                ${result.moves !== undefined
                    ? `<p>تعداد حرکت: ${result.moves}</p>`
                    : ""}

                <p>${result.message || ""}</p>

                <div class="resultModalActions">
                    <button id="retryActivityBtn" type="button">🔄 دوباره بازی کن</button>
                    <button id="backActivitiesBtn" type="button">📚 بازگشت به فعالیت‌ها</button>
                    <button id="dashboardBtn" type="button">📊 گزارش عملکرد من</button>
                    <button id="resultModalHomeBtn" type="button">🏠 صفحه اصلی</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const retryButton = document.getElementById("retryActivityBtn");
        const backButton = document.getElementById("backActivitiesBtn");
        const dashboardButton = document.getElementById("dashboardBtn");
        const homeButton = document.getElementById("resultModalHomeBtn");

        if(retryButton){
            retryButton.onclick = async function(){
                ResultModal.close();
                if(typeof ActivityManager !== "undefined" && typeof ActivityManager.restart === "function"){
                    await ActivityManager.restart();
                }
            };
        }

        if(backButton){
            backButton.onclick = function(){
                const activity =
                    typeof ActivityManager !== "undefined" &&
                    typeof ActivityManager.getCurrent === "function"
                        ? ActivityManager.getCurrent()
                        : (
                            typeof ActivityHistory !== "undefined" &&
                            typeof ActivityHistory.get === "function"
                                ? ActivityHistory.get()
                                : null
                        );

                const profile =
                    typeof ProfileManager !== "undefined" &&
                    typeof ProfileManager.get === "function"
                        ? ProfileManager.get()
                        : null;

                const gradeId =
                    activity && (activity.grade || activity.gradeId)
                        ? (activity.grade || activity.gradeId)
                        : (profile && profile.grade ? profile.grade : null);

                const subjectId =
                    activity && (activity.subject || activity.subjectId)
                        ? (activity.subject || activity.subjectId)
                        : null;

                const chapterId =
                    activity && (activity.chapter || activity.chapterId)
                        ? (activity.chapter || activity.chapterId)
                        : null;

                // Returning to the activity list is an explicit navigation action.
                // Clear the post-finish load guard so the user can start an activity again.
                if(
                    typeof ActivityManager !== "undefined" &&
                    typeof ActivityManager.allowNewActivityStart === "function"
                ){
                    ActivityManager.allowNewActivityStart();
                }

                ResultModal.close();

                if(
                    gradeId &&
                    subjectId &&
                    chapterId &&
                    typeof Screen !== "undefined" &&
                    typeof Screen.showActivities === "function"
                ){
                    Screen.showActivities(
                        gradeId,
                        subjectId,
                        chapterId
                    );
                    return;
                }

                console.error(
                    "ResultModal: Activity navigation context is unavailable."
                );
            };
        }

        if(dashboardButton){
            dashboardButton.onclick = function(){
                ResultModal.close();

                const openReport = function(){
                    if(
                        typeof ReportsController !== "undefined" &&
                        typeof ReportsController.open === "function"
                    ){
                        ReportsController.open();
                        return true;
                    }

                    if(
                        typeof Screen !== "undefined" &&
                        typeof Screen.showReports === "function"
                    ){
                        Screen.showReports();
                        return true;
                    }

                    console.error("ReportsController Not Available");
                    return false;
                };

                if(!openReport()) return;

                const reportsModal = document.getElementById("reportsModal");

                if(
                    reportsModal &&
                    typeof MutationObserver !== "undefined"
                ){
                    const observer = new MutationObserver(function(){
                        if(!document.body.contains(reportsModal)){
                            observer.disconnect();

                            if(
                                typeof App !== "undefined" &&
                                typeof App.goHome === "function"
                            ){
                                App.goHome();
                            }
                        }
                    });

                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            };
        }

        if(homeButton){
            homeButton.onclick = function(){
                // Home must be a clean navigation target. If a report modal
                // is still mounted behind the result modal, remove it first;
                // otherwise Screen.showHome() only replaces #app and the
                // fixed report overlay remains visible above the home screen.
                const reportsModal = document.getElementById("reportsModal");
                if(reportsModal) reportsModal.remove();

                ResultModal.close();

                if(typeof App !== "undefined" && typeof App.showHome === "function"){
                    App.showHome();
                }
            };
        }
    },

    close: function(){
        const modal = document.getElementById("resultModal");
        if(modal) modal.remove();
        document.body.classList.remove("activity-result-open");
    },

    hide: function(){
        this.close();
    }
};

window.ResultModal = ResultModal;
console.log("Result Modal Ready");