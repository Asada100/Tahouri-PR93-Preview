// =====================================
// Tahouri Edu Platform
// Version 5.0
// Profile Screen
// Multi Profile + Personal Settings
// =====================================

const ProfileScreen = {

    // =====================================
    // Show Profile
    // =====================================

    show: function () {

        const app = document.getElementById("app");

        if (!app) {
            console.error("App Container Missing");
            return;
        }

        const profile = ProfileManager.get();

        if (!profile) {
            app.innerHTML = `
<div class="screen profile-screen">
    <h1>👤 پروفایل</h1>
    <p>هنوز پروفایلی ایجاد نشده است.</p>
    <button id="createFirstProfileBtn" type="button">
        ➕ ایجاد پروفایل
    </button>
</div>
            `;

            document.getElementById("createFirstProfileBtn").onclick = function () {
                ProfileScreen.showCreate();
            };
            return;
        }

        const settings = ProfileManager.getSettings();

        app.innerHTML = `
<div class="screen profile-screen">
    <h1>👤 پروفایل من</h1>
    <p>محیط شخصی دانش‌آموز</p>
    <hr>

    <div class="profile-card">
        <div class="profile-item">
            <h3>👤 نام دانش‌آموز</h3>
            <p id="profileName">${profile.name || "هنوز ثبت نشده"}</p>
        </div>
        <div class="profile-item">
            <h3>🎓 پایه</h3>
            <p id="profileGrade">${this.getGradeTitle(profile.grade)}</p>
        </div>
        <div class="profile-item">
            <h3>📅 تاریخ ایجاد پروفایل</h3>
            <p>${this.formatDate(profile.createdAt)}</p>
        </div>
        <div class="profile-item">
            <h3>🔐 شناسهٔ اختصاصی پروفایل</h3>
            <p id="profileStudentId" dir="ltr"></p>
            <button id="copyStudentIdBtn" type="button">کپی شناسه برای ثبت فعال‌سازی</button>
            <p id="copyStudentIdMessage" aria-live="polite"></p>
        </div>
    </div>

    <hr>

    <button id="editProfileBtn" type="button">✏ ویرایش پروفایل</button>
    <button id="switchProfileBtn" type="button">👥 تغییر پروفایل</button>
    <button id="createProfileBtn" type="button">➕ افزودن دانش‌آموز</button>

    <hr>

    <div class="profile-settings">
        <h2>⚙ تنظیمات شخصی</h2>
        <p>این تنظیمات فقط برای این پروفایل ذخیره می‌شوند.</p>

        <div class="profile-setting-item">
            <label for="profileThemeSelect">🌓 محیط برنامه</label>
            <select id="profileThemeSelect">
                <option value="light" ${settings.theme === "light" ? "selected" : ""}>☀ روشن</option>
                <option value="dark" ${settings.theme === "dark" ? "selected" : ""}>🌙 تاریک</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileMusicSelect">🎵 موسیقی</label>
            <select id="profileMusicSelect">
                <option value="true" ${settings.music ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.music ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileProgramSoundSelect">🔊 صدای برنامه</label>
            <select id="profileProgramSoundSelect">
                <option value="true" ${settings.programSound ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.programSound ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileNotificationsSelect">🔔 اعلان‌ها</label>
            <select id="profileNotificationsSelect">
                <option value="true" ${settings.notifications ? "selected" : ""}>🔔 روشن</option>
                <option value="false" ${!settings.notifications ? "selected" : ""}>🔕 خاموش</option>
            </select>
        </div>

        <div class="profile-setting-item">
            <label for="profileSoundFeedbackSelect">🎯 بازخورد صوتی</label>
            <select id="profileSoundFeedbackSelect">
                <option value="true" ${settings.soundFeedback ? "selected" : ""}>🔊 روشن</option>
                <option value="false" ${!settings.soundFeedback ? "selected" : ""}>🔇 خاموش</option>
            </select>
        </div>

        <div id="settingsMessage"></div>
    </div>
</div>
        `;

        const studentIdElement = document.getElementById("profileStudentId");
        const copyStudentIdButton = document.getElementById("copyStudentIdBtn");
        const copyStudentIdMessage = document.getElementById("copyStudentIdMessage");
        if (studentIdElement) studentIdElement.textContent = profile.studentId || "";
        if (copyStudentIdButton) {
            copyStudentIdButton.onclick = async function () {
                try {
                    if (!profile.studentId) throw new Error("شناسهٔ پروفایل موجود نیست.");
                    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
                        throw new Error("کپی خودکار در این مرورگر در دسترس نیست؛ شناسه را انتخاب و کپی کنید.");
                    }
                    await navigator.clipboard.writeText(profile.studentId);
                    copyStudentIdMessage.textContent = "شناسه کپی شد؛ آن را فقط برای صدور کد اختصاصی به مدیر بدهید.";
                } catch (error) {
                    copyStudentIdMessage.textContent = error.message || "کپی شناسه انجام نشد.";
                }
            };
        }

        document.getElementById("editProfileBtn").onclick = function () {
            ProfileScreen.showEdit();
        };

        document.getElementById("switchProfileBtn").onclick = function () {
            ProfileScreen.showProfiles();
        };

        document.getElementById("createProfileBtn").onclick = function () {
            ProfileScreen.showCreate();
        };

        this.bindSettings();

        console.log("Profile Screen v5.0 Displayed:", profile);
    },

    // =====================================
    // Bind Settings
    // =====================================

    bindSettings: function () {

        const theme = document.getElementById("profileThemeSelect");
        const music = document.getElementById("profileMusicSelect");
        const programSound = document.getElementById("profileProgramSoundSelect");
        const notifications = document.getElementById("profileNotificationsSelect");
        const soundFeedback = document.getElementById("profileSoundFeedbackSelect");

        if (theme) {
            theme.onchange = function () {
                ProfileManager.updateSettings({ theme: theme.value });
                ProfileScreen.showSettingsMessage("تنظیمات محیط ذخیره شد.");
            };
        }

        if (music) {
            music.onchange = function () {
                ProfileManager.updateSettings({ music: music.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات موسیقی ذخیره شد.");
            };
        }

        if (programSound) {
            programSound.onchange = function () {
                ProfileManager.updateSettings({ programSound: programSound.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات صدای برنامه ذخیره شد.");
            };
        }

        if (notifications) {
            notifications.onchange = function () {
                ProfileManager.updateSettings({ notifications: notifications.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات اعلان‌ها ذخیره شد.");
            };
        }

        if (soundFeedback) {
            soundFeedback.onchange = function () {
                ProfileManager.updateSettings({ soundFeedback: soundFeedback.value === "true" });
                ProfileScreen.showSettingsMessage("تنظیمات بازخورد صوتی ذخیره شد.");
            };
        }
    },

    // =====================================
    // Settings Message
    // =====================================

    showSettingsMessage: function (message) {
        const box = document.getElementById("settingsMessage");

        if (!box) {
            return;
        }

        box.innerHTML = message;

        setTimeout(function () {
            if (box) {
                box.innerHTML = "";
            }
        }, 1500);
    },

    // =====================================
    // Show Profiles
    // =====================================

    showProfiles: function () {

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        const profiles = ProfileManager.getAll();
        const activeProfile = ProfileManager.get();

        app.innerHTML = `
<div class="screen profiles-screen">

    <h1>👥 پروفایل‌های دانش‌آموزان</h1>

    <p>پروفایل دانش‌آموز موردنظر را انتخاب کنید.</p>

    <hr>

    <div class="profiles-list">
        ${
            profiles.map(function (profile) {
                const active = activeProfile && activeProfile.studentId === profile.studentId;

                return `
<div class="profile-select-card">
    <h2>${active ? "⭐ " : ""}${profile.name}</h2>
    <p>🎓 ${ProfileScreen.getGradeTitle(profile.grade)}</p>
    <p>📅 ${ProfileScreen.formatDate(profile.createdAt)}</p>

    ${
        active
        ? `
        <button type="button" disabled>
            ✓ پروفایل فعال
        </button>
        `
        : `
        <button type="button" data-profile-id="${profile.studentId}">
            ورود به این پروفایل
        </button>
        `
    }
</div>
                `;
            }).join("")
        }
    </div>
</div>
        `;

        const buttons = document.querySelectorAll("[data-profile-id]");

        buttons.forEach(function (button) {
            button.onclick = function () {
                const studentId = button.getAttribute("data-profile-id");
                ProfileManager.switchProfile(studentId);
                ProfileScreen.show();
            };
        });

        console.log("Profile List Displayed:", profiles);
    },

    // =====================================
    // Create Profile
    // =====================================

    showCreate: function () {

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        app.innerHTML = `
<div class="screen profile-create-screen">
    <h1>➕ ایجاد پروفایل دانش‌آموز</h1>
    <p>برای هر دانش‌آموز یک پروفایل جداگانه بسازید.</p>
    <hr>

    <label for="newProfileName">نام دانش‌آموز</label>
    <br>
    <input id="newProfileName" type="text" placeholder="مثلاً محمد">
    <br><br>

    <label for="newProfileStudentId">شناسهٔ حساب ثبت‌شده (در صورت صدور از پنل مدیریت)</label>
    <br>
    <input id="newProfileStudentId" type="text" maxlength="128" autocomplete="off" placeholder="شناسهٔ دریافتی از مدیر؛ برای حساب محلی خالی بماند" dir="ltr">
    <br><br>

    <label for="newProfileGrade">پایه</label>
    <br>
    <select id="newProfileGrade">
        <option value="">انتخاب پایه</option>
        ${this.buildGradeOptions(null)}
    </select>
    <br><br>

    <button id="saveNewProfileBtn" type="button">💾 ایجاد پروفایل</button>
    <button id="cancelNewProfileBtn" type="button">✖ انصراف</button>

    <div id="createProfileMessage"></div>
</div>
        `;

        document.getElementById("saveNewProfileBtn").onclick = function () {
            const nameInput = document.getElementById("newProfileName");
            const gradeInput = document.getElementById("newProfileGrade");
            const studentIdInput = document.getElementById("newProfileStudentId");
            const message = document.getElementById("createProfileMessage");

            const name = nameInput.value.trim();
            const grade = gradeInput.value;
            const studentId = studentIdInput.value.trim();

            if (!name) {
                message.innerHTML = "⚠ لطفاً نام دانش‌آموز را وارد کنید.";
                nameInput.focus();
                return;
            }

            if (!grade) {
                message.innerHTML = "⚠ لطفاً پایه را انتخاب کنید.";
                gradeInput.focus();
                return;
            }

            try {
                if (studentId && !/^[A-Za-z0-9._:-]{1,128}$/.test(studentId)) {
                    message.textContent = "⚠ شناسهٔ حساب معتبر نیست.";
                    studentIdInput.focus();
                    return;
                }

                const profile = ProfileManager.createProfile({ name: name, grade: grade, studentId: studentId || null });

                if (!profile) {
                    message.innerHTML = "⚠ ایجاد پروفایل انجام نشد.";
                    return;
                }

                message.innerHTML = "✓ پروفایل با موفقیت ایجاد شد.";

                setTimeout(function () {
                    if (typeof ActivationGate !== "undefined" && typeof ActivationGate.open === "function") {
                        ActivationGate.open();
                    } else {
                        ProfileScreen.show();
                    }
                }, 500);
            } catch (error) {
                console.error("Profile Create Error:", error);
                message.innerHTML = "⚠ خطا در ایجاد پروفایل.";
            }
        };

        document.getElementById("cancelNewProfileBtn").onclick = function () {
            ProfileScreen.show();
        };
    },

    // =====================================
    // Edit Profile
    // =====================================

    showEdit: function () {

        const app = document.getElementById("app");

        if (!app) {
            return;
        }

        const profile = ProfileManager.get();

        if (!profile) {
            ProfileScreen.show();
            return;
        }

        app.innerHTML = `
<div class="screen profile-edit-screen">
    <h1>✏ ویرایش پروفایل</h1>
    <p>اطلاعات این پروفایل را ویرایش کنید.</p>
    <hr>

    <label for="editProfileName">نام دانش‌آموز</label>
    <br>
    <input id="editProfileName" type="text" value="${profile.name || ""}">
    <br><br>

    <label for="editProfileGrade">پایه</label>
    <br>
    <select id="editProfileGrade">
        ${this.buildGradeOptions(profile.grade)}
    </select>
    <br><br>

    <p class="profile-grade-warning">
        ⚠ تغییر پایه، پایه آموزشی همین پروفایل را تغییر می‌دهد. پس از ذخیره، مجوز پایه جدید بررسی خواهد شد.
    </p>

    <button id="saveProfileBtn" type="button">💾 ذخیره تغییرات</button>
    <button id="cancelProfileBtn" type="button">✖ انصراف</button>

    <div id="editProfileMessage"></div>
</div>
        `;

        document.getElementById("saveProfileBtn").onclick = function () {
            const nameInput = document.getElementById("editProfileName");
            const gradeInput = document.getElementById("editProfileGrade");
            const message = document.getElementById("editProfileMessage");

            const name = nameInput.value.trim();
            const grade = gradeInput.value;

            if (!name) {
                message.innerHTML = "⚠ لطفاً نام دانش‌آموز را وارد کنید.";
                nameInput.focus();
                return;
            }

            if (!grade) {
                message.innerHTML = "⚠ لطفاً پایه را انتخاب کنید.";
                gradeInput.focus();
                return;
            }

            const oldGrade = profile.grade;

            ProfileManager.update({ name: name, grade: grade });

            if (oldGrade !== grade) {
                message.innerHTML = "✓ تغییرات ذخیره شد.";

                setTimeout(function () {
                    if (typeof ActivationGate !== "undefined" && typeof ActivationGate.open === "function") {
                        ActivationGate.open();
                    } else {
                        ProfileScreen.show();
                    }
                }, 500);
            } else {
                message.innerHTML = "✓ تغییرات ذخیره شد.";

                setTimeout(function () {
                    ProfileScreen.show();
                }, 500);
            }
        };

        document.getElementById("cancelProfileBtn").onclick = function () {
            ProfileScreen.show();
        };
    },

    // =====================================
    // Helpers
    // =====================================

    getGradeTitle: function (grade) {
        const titles = {
            grade1: "پایه اول",
            grade2: "پایه دوم",
            grade3: "پایه سوم",
            grade4: "پایه چهارم",
            grade5: "پایه پنجم",
            grade6: "پایه ششم"
        };

        return titles[grade] || grade || "نامشخص";
    },

    buildGradeOptions: function (selectedGrade) {
        const grades = [
            ["grade1", "پایه اول"],
            ["grade2", "پایه دوم"],
            ["grade3", "پایه سوم"],
            ["grade4", "پایه چهارم"],
            ["grade5", "پایه پنجم"],
            ["grade6", "پایه ششم"]
        ];

        return grades.map(function (item) {
            return `<option value="${item[0]}" ${selectedGrade === item[0] ? "selected" : ""}>${item[1]}</option>`;
        }).join("");
    },

    formatDate: function (date) {
        if (!date) {
            return "ثبت نشده";
        }

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        return new Intl.DateTimeFormat("fa-IR", {
            year: "numeric",
            month: "numeric",
            day: "numeric"
        }).format(d);
    }
};

console.log("Profile Screen v5.0 Ready");
