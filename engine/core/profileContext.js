// =====================================
// Tahouri Edu Platform
// Profile Context v1.0
// Central Profile Identity Helper
//
// Responsibilities:
// - Resolve the active Student Profile
// - Provide the active studentId
// - Build profile-scoped storage keys
// - Keep data systems isolated per profile
//
// Architecture:
// ProfileManager
//      ↓
// ProfileContext
//      ↓
// Progress / Locks / Statistics / ...
// =====================================


const ProfileContext = {

    VERSION: "1.0",

    // =====================================
    // GET ACTIVE PROFILE
    // =====================================

    getProfile: function () {

        try {

            if (
                typeof ProfileManager !== "undefined" &&
                typeof ProfileManager.get === "function"
            ) {

                const profile = ProfileManager.get();

                if (
                    profile &&
                    profile.studentId
                ) {

                    return profile;

                }

            }

        }
        catch (error) {

            console.error(
                "ProfileContext: Profile read failed",
                error
            );

        }

        return null;

    },


    // =====================================
    // GET ACTIVE STUDENT ID
    // =====================================

    getStudentId: function () {

        const profile = this.getProfile();

        return profile
            ? profile.studentId
            : null;

    },


    // =====================================
    // HAS ACTIVE PROFILE
    // =====================================

    hasProfile: function () {

        return !!this.getStudentId();

    },


    // =====================================
    // GET ACTIVE GRADE
    // =====================================

    getGrade: function () {

        const profile = this.getProfile();

        return profile
            ? profile.grade || null
            : null;

    },


    // =====================================
    // PROFILE-SCOPED STORAGE KEY
    // =====================================
    //
    // Example:
    // Tahouri_Progress
    //      ↓
    // Tahouri_Progress:<studentId>
    // =====================================

    key: function (baseKey) {

        if (!baseKey) {

            return null;

        }

        const studentId =
            this.getStudentId();

        if (!studentId) {

            return null;

        }

        return (
            String(baseKey) +
            ":" +
            String(studentId)
        );

    },


    // =====================================
    // GET CONTEXT SNAPSHOT
    // =====================================

    get: function () {

        const profile =
            this.getProfile();

        if (!profile) {

            return {
                studentId: null,
                name: "",
                grade: null
            };

        }

        return {

            studentId:
                profile.studentId,

            name:
                profile.name || "",

            grade:
                profile.grade || null

        };

    }

};


window.ProfileContext =
    ProfileContext;


console.log(
    "Profile Context v1.0 Ready"
);