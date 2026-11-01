// =====================================
// Tahouri Edu Platform
// Version 3.4
// Activity State Manager
// =====================================


const ActivityState = {


    states: {


        LOCKED:
        "locked",


        AVAILABLE:
        "available",


        STARTED:
        "started",


        PLAYING:
        "playing",


        FINISHED:
        "finished",


        COMPLETED:
        "completed"


    },



    current:null,



    set:function(state){


        this.current = state;


        console.log(
            "Activity State:",
            state
        );


    },



    get:function(){


        return this.current;


    },



    reset:function(){


        this.current = null;


    }



};



console.log(
    "Activity State Manager Ready"
);