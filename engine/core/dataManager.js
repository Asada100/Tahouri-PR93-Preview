// =====================================
// Tahouri Edu Platform
// Version 3.2
// Data Manager
// =====================================

const DataManager = {

    cache:{},

    loadJSON:async function(path){

        if(this.cache[path]){

            return this.cache[path];

        }

        const response = await fetch(path, { cache: "no-store" });

        if (!response.ok) {

            throw new Error(
                `Failed to load ${path}: HTTP ${response.status}`
            );

        }

        const data = await response.json();

        this.cache[path] = data;

        return data;

    },

    invalidateCache:function(path){

        if (!path) return false;

        if (Object.prototype.hasOwnProperty.call(this.cache, path)) {

            delete this.cache[path];

            console.log("Data Manager: Cache Invalidated:", path);

            return true;

        }

        return false;

    },

    getActivityFolder:function(activity){

        return activity.path;

    },

    getQuestions:async function(activity){

        return await this.loadJSON(

            this.getActivityFolder(activity) +

            "/questions.json"

        );

    },

    getCards:async function(activity){

        return await this.loadJSON(

            this.getActivityFolder(activity) +

            "/cards.json"

        );

    },

    clearCache:function(){

        this.cache = {};

    }

};

console.log(
    "Data Manager v3.2 Ready"
);