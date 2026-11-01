// =====================================
// Tahouri Edu Platform
// Version 2.0
// Score Manager
// =====================================


const ScoreManager = {


    score:0,

    correct:0,

    wrong:0,



    reset:function(){


        this.score = 0;

        this.correct = 0;

        this.wrong = 0;


    },



    addCorrect:function(){


        this.score += 10;

        this.correct++;


    },



    addWrong:function(){


        this.wrong++;


    },



    getResult:function(total){


        return {


            score:this.score,


            correct:this.correct,


            wrong:this.wrong,


            percentage:

            Math.round(
                (this.correct / total) * 100
            )


        };


    }


};



console.log(
    "Score Manager Ready"
);