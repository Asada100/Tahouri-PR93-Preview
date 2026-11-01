// =====================================
// Tahouri Edu Platform
// Version 5.0
// Profile Manager
// Student Profile Core System
//
// Responsibilities:
// - Multiple Student Profiles
// - Active Student Profile
// - Unique Student ID
// - Grade per Student
// - Personal Settings per Student
// - Legacy Profile Compatibility
//
// Important:
// Profile identity is independent from
// License, Navigation and Session.
//
// Architecture:
// Student Profile
//      ↓
// studentId
//      ↓
// Grade
//      ↓
// License
//      ↓
// Progress / Reports / Settings
// =====================================


const ProfileManager = {


// =====================================
// STORAGE KEYS
// =====================================

PROFILES_KEY:
    "Tahouri_Profiles",

ACTIVE_PROFILE_KEY:
    "Tahouri_Active_Profile",

LEGACY_PROFILE_KEY:
    "Tahouri_Profile",


// =====================================
// PROFILE COLLECTION
// =====================================

profiles: [],

activeProfileId: null,


// =====================================
// DEFAULT SETTINGS
// =====================================

getDefaultSettings: function () {

    return {

        theme: "light",

        music: true,

        programSound: true,

        notifications: true,

        soundFeedback: true

    };

},


// =====================================
// CREATE UNIQUE STUDENT ID
// =====================================

generateStudentId: function () {

    if (
        typeof crypto !== "undefined"
        &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();

    }


    return (
        "student_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

},


// =====================================
// INITIALIZE
// =====================================

init: function () {

    console.log(
        "Profile Manager v5.0 Starting"
    );


    const savedProfiles =
        localStorage.getItem(
            this.PROFILES_KEY
        );


    if (savedProfiles) {

        try {

            this.profiles =
                JSON.parse(
                    savedProfiles
                );


            if (
                !Array.isArray(
                    this.profiles
                )
            ) {

                this.profiles = [];

            }

        }

        catch (error) {

            console.error(
                "Profiles Load Error",
                error
            );


            this.profiles = [];

        }

    }


    // =================================
    // LEGACY MIGRATION
    // =================================

    if (
        this.profiles.length === 0
    ) {

        this.migrateLegacyProfile();

    }


    // =================================
    // ACTIVE PROFILE
    // =================================

    const savedActiveId =
        localStorage.getItem(
            this.ACTIVE_PROFILE_KEY
        );


    if (
        savedActiveId
        &&
        this.profiles.some(
            function (profile) {

                return (
                    profile.studentId ===
                    savedActiveId
                );

            }
        )
    ) {

        this.activeProfileId =
            savedActiveId;

    }

    else if (
        this.profiles.length > 0
    ) {

        this.activeProfileId =
            this.profiles[0].studentId;

    }

    else {

        this.activeProfileId =
            null;

    }


    this.normalizeProfiles();

    this.save();


    console.log(
        "Profiles Loaded:",
        this.profiles
    );


    console.log(
        "Active Profile:",
        this.get()
    );

},


// =====================================
// LEGACY PROFILE MIGRATION
// =====================================
//
// Converts the old:
//
// Tahouri_Profile
//
// into the new multi-profile system.
// =====================================

migrateLegacyProfile: function () {

    const legacyData =
        localStorage.getItem(
            this.LEGACY_PROFILE_KEY
        );


    if (!legacyData) {

        return;

    }


    try {

        const oldProfile =
            JSON.parse(
                legacyData
            );


        if (
            !oldProfile
            ||
            (
                !oldProfile.name
                &&
                !oldProfile.grade
            )
        ) {

            return;

        }


        const profile =
            this.buildProfile({

                name:
                    oldProfile.name || "",

                grade:
                    oldProfile.grade || null,

                createdAt:
                    oldProfile.createdAt || null

            });


        this.profiles = [
            profile
        ];


        this.activeProfileId =
            profile.studentId;


        localStorage.setItem(

            this.ACTIVE_PROFILE_KEY,

            profile.studentId

        );


        console.log(
            "Legacy Profile Migrated:",
            profile
        );

    }

    catch (error) {

        console.error(
            "Legacy Profile Migration Error",
            error
        );

    }

},


// =====================================
// BUILD PROFILE
// =====================================

buildProfile: function (data) {

    data =
        data || {};


    const settings = {

        ...this.getDefaultSettings(),

        ...(
            data.settings || {}
        )

    };


    return {

        studentId:
            data.studentId ||
            this.generateStudentId(),

        name:
            typeof data.name === "string"
                ? data.name.trim()
                : "",

        grade:
            data.grade ||
            null,

        createdAt:
            data.createdAt ||
            new Date().toISOString(),

        settings:
            settings

    };

},


// =====================================
// NORMALIZE PROFILES
// =====================================

normalizeProfiles: function () {

    this.profiles =
        this.profiles.map(
            function (profile) {

                return {

                    studentId:
                        profile.studentId ||
                        this.generateStudentId(),

                    name:
                        typeof profile.name ===
                        "string"
                            ? profile.name
                            : "",

                    grade:
                        profile.grade ||
                        null,

                    createdAt:
                        profile.createdAt ||
                        new Date().toISOString(),

                    settings: {

                        ...this.getDefaultSettings(),

                        ...(
                            profile.settings ||
                            {}
                        )

                    }

                };

            }.bind(this)
        );


    if (
        this.profiles.length === 0
    ) {

        this.activeProfileId =
            null;

        return;

    }


    const activeExists =
        this.profiles.some(
            function (profile) {

                return (
                    profile.studentId ===
                    this.activeProfileId
                );

            }
        );


    if (!activeExists) {

        this.activeProfileId =
            this.profiles[0].studentId;

    }

},


// =====================================
// GET ALL PROFILES
// =====================================

getAll: function () {

    return this.profiles.map(
        function (profile) {

            return {
                ...profile,
                settings: {
                    ...profile.settings
                }
            };

        }
    );

},


// =====================================
// GET ACTIVE PROFILE
// =====================================

get: function () {

    const profile =
        this.profiles.find(
            function (item) {

                return (
                    item.studentId ===
                    this.activeProfileId
                );

            }.bind(this)
        );


    if (!profile) {

        return {

            studentId: null,

            name: "",

            grade: null,

            createdAt: null,

            settings:
                this.getDefaultSettings()

        };

    }


    return {

        studentId:
            profile.studentId,

        name:
            profile.name,

        grade:
            profile.grade,

        createdAt:
            profile.createdAt,

        settings: {

            ...this.getDefaultSettings(),

            ...profile.settings

        }

    };

},


// =====================================
// GET ACTIVE STUDENT ID
// =====================================

getStudentId: function () {

    return (
        this.activeProfileId ||
        null
    );

},


// =====================================
// GET NAME
// =====================================

getName: function () {

    const profile =
        this.get();

    return (
        profile.name ||
        ""
    );

},


// =====================================
// GET GRADE
// =====================================

getGrade: function () {

    const profile =
        this.get();

    return (
        profile.grade ||
        null
    );

},


// =====================================
// HAS ACTIVE PROFILE
// =====================================

hasProfile: function () {

    const profile =
        this.get();


    return (

        !!profile.studentId

        &&

        typeof profile.name ===
        "string"

        &&

        profile.name.trim()
            .length > 0

    );

},


// =====================================
// HAS ANY PROFILE
// =====================================

hasProfiles: function () {

    return (
        this.profiles.length > 0
    );

},


// =====================================
// CREATE PROFILE
// =====================================

createProfile: function (data) {

    if (
        !data
        ||
        typeof data !== "object"
    ) {

        console.error(
            "Invalid Profile Data"
        );

        return null;

    }


    const name =
        typeof data.name === "string"
            ? data.name.trim()
            : "";


    if (!name) {

        console.error(
            "Profile Name Empty"
        );

        return null;

    }


    const requestedStudentId = typeof data.studentId === "string" ? data.studentId.trim() : "";

    if (requestedStudentId && this.profiles.some(function (item) { return item.studentId === requestedStudentId; })) {
        console.error("Student ID Already Exists:", requestedStudentId);
        return null;
    }

    const profile =
        this.buildProfile({

            studentId:
                requestedStudentId || null,

            name:
                name,

            grade:
                data.grade || null,

            settings:
                data.settings || {},

            createdAt:
                data.createdAt || null

        });


    this.profiles.push(
        profile
    );


    this.activeProfileId =
        profile.studentId;


    this.save();


    console.log(
        "Student Profile Created:",
        profile
    );


    return {
        ...profile
    };

},


// =====================================
// SWITCH PROFILE
// =====================================

switchProfile: function (
    studentId
) {

    if (!studentId) {

        console.error(
            "Student ID Missing"
        );

        return false;

    }


    const profile =
        this.profiles.find(
            function (item) {

                return (
                    item.studentId ===
                    studentId
                );

            }
        );


    if (!profile) {

        console.error(
            "Profile Not Found:",
            studentId
        );

        return false;

    }


    this.activeProfileId =
        studentId;


    localStorage.setItem(

        this.ACTIVE_PROFILE_KEY,

        studentId

    );


    console.log(
        "Active Profile Changed:",
        profile
    );


    return true;

},


// =====================================
// SET NAME
// =====================================

setName: function (name) {

    const profile =
        this.getActiveProfileObject();


    if (!profile) {

        return false;

    }


    if (
        typeof name !==
        "string"
    ) {

        console.error(
            "Invalid Profile Name"
        );

        return false;

    }


    const cleanName =
        name.trim();


    if (
        cleanName.length === 0
    ) {

        console.error(
            "Profile Name Empty"
        );

        return false;

    }


    profile.name =
        cleanName;


    this.save();


    console.log(
        "Profile Name Updated:",
        cleanName
    );


    return true;

},


// =====================================
// SET GRADE
// =====================================

setGrade: function (gradeId) {

    const profile =
        this.getActiveProfileObject();


    if (!profile) {

        return false;

    }


    profile.grade =
        gradeId || null;


    this.save();


    console.log(
        "Profile Grade Updated:",
        profile.grade
    );


    return true;

},


// =====================================
// UPDATE PROFILE
// =====================================

update: function (data) {

    if (
        !data
        ||
        typeof data !== "object"
    ) {

        console.error(
            "Invalid Profile Data"
        );

        return false;

    }


    const profile =
        this.getActiveProfileObject();


    if (!profile) {

        console.error(
            "No Active Profile"
        );

        return false;

    }


    if (
        typeof data.name ===
        "string"
    ) {

        const cleanName =
            data.name.trim();


        if (
            cleanName.length > 0
        ) {

            profile.name =
                cleanName;

        }

    }


    if (
        Object.prototype
            .hasOwnProperty
            .call(
                data,
                "grade"
            )
    ) {

        profile.grade =
            data.grade || null;

    }


    if (
        data.settings
        &&
        typeof data.settings ===
        "object"
    ) {

        profile.settings = {

            ...this.getDefaultSettings(),

            ...profile.settings,

            ...data.settings

        };

    }


    this.save();


    console.log(
        "Active Profile Updated:",
        profile
    );


    return true;

},


// =====================================
// UPDATE SETTINGS
// =====================================

updateSettings: function (
    settings
) {

    if (
        !settings
        ||
        typeof settings !==
        "object"
    ) {

        console.error(
            "Invalid Settings"
        );

        return false;

    }


    const profile =
        this.getActiveProfileObject();


    if (!profile) {

        console.error(
            "No Active Profile"
        );

        return false;

    }


    profile.settings = {

        ...this.getDefaultSettings(),

        ...profile.settings,

        ...settings

    };


    this.save();


    console.log(
        "Profile Settings Updated:",
        profile.settings
    );


    return true;

},


// =====================================
// GET SETTINGS
// =====================================

getSettings: function () {

    const profile =
        this.get();


    return {

        ...this.getDefaultSettings(),

        ...profile.settings

    };

},


// =====================================
// GET ACTIVE PROFILE OBJECT
// =====================================
//
// Internal helper.
// Returns actual stored object.
// =====================================

getActiveProfileObject: function () {

    return this.profiles.find(
        function (profile) {

            return (
                profile.studentId ===
                this.activeProfileId
            );

        }.bind(this)
    ) || null;

},


// =====================================
// DELETE PROFILE
// =====================================

deleteProfile: function (
    studentId
) {

    if (!studentId) {

        return false;

    }


    if (
        this.profiles.length <= 1
    ) {

        console.error(
            "Cannot Delete Last Profile"
        );

        return false;

    }


    const index =
        this.profiles.findIndex(
            function (profile) {

                return (
                    profile.studentId ===
                    studentId
                );

            }
        );


    if (index === -1) {

        return false;

    }


    const wasActive =
        this.activeProfileId ===
        studentId;


    this.profiles.splice(
        index,
        1
    );


    if (wasActive) {

        this.activeProfileId =
            this.profiles[0].studentId;

    }


    this.save();


    console.log(
        "Profile Deleted:",
        studentId
    );


    return true;

},


// =====================================
// SAVE PROFILES
// =====================================

save: function () {

    try {

        localStorage.setItem(

            this.PROFILES_KEY,

            JSON.stringify(
                this.profiles
            )

        );


        if (
            this.activeProfileId
        ) {

            localStorage.setItem(

                this.ACTIVE_PROFILE_KEY,

                this.activeProfileId

            );

        }


        console.log(
            "Profiles Saved"
        );


        return true;

    }

    catch (error) {

        console.error(
            "Profiles Save Error",
            error
        );


        return false;

    }

},


// =====================================
// CLEAR ALL PROFILES
// =====================================

clear: function () {

    this.profiles = [];

    this.activeProfileId =
        null;


    localStorage.removeItem(
        this.PROFILES_KEY
    );


    localStorage.removeItem(
        this.ACTIVE_PROFILE_KEY
    );


    console.log(
        "All Profiles Cleared"
    );

},


// =====================================
// RESET ACTIVE PROFILE SETTINGS
// =====================================

resetSettings: function () {

    const profile =
        this.getActiveProfileObject();


    if (!profile) {

        return false;

    }


    profile.settings =
        this.getDefaultSettings();


    this.save();


    console.log(
        "Active Profile Settings Reset"
    );


    return true;

}

};


// =====================================
// INITIALIZE
// =====================================

ProfileManager.init();


// =====================================
// GLOBAL ACCESS
// =====================================

window.ProfileManager =
    ProfileManager;


// =====================================
// READY
// =====================================

console.log(
    "Profile Manager v5.0 Ready"
);