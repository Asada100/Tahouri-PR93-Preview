// =====================================
// Tahouri Edu Platform
// Version 2.0
// Engine Template
// =====================================


const EngineTemplate = {


    state:{


        isFinished:false,


        score:0,


        currentQuestion:0


    },



    init:function(){



        console.log(
            "Engine Initialized"
        );


    },



    load:function(data){



        console.log(
            "Engine Data Loaded",
            data
        );


    },



    start:function(){



        console.log(
            "Engine Started"
        );


    },



    checkAnswer:function(answer){



        return false;


    },



    next:function(){



        console.log(
            "Next Item"
        );


    },



    finish:function(){



        this.state.isFinished=true;



        console.log(
            "Engine Finished"
        );


    },



    reset:function(){



        this.state.score=0;


        this.state.currentQuestion=0;


        this.state.isFinished=false;


    },



    getResult:function(){



        return this.state;


    }


};



console.log(
    "Engine Template Ready"
);