// =====================================
// Tahouri Edu Platform
// Version 1.0
// Activity Result Standard
// =====================================


const ActivityResult = {


    create:function(data){


        return {


            activityId:

            data.activityId || null,



            score:

            data.score || 0,



            percentage:

            data.percentage || 0,



            stars:

            Math.round(

                (data.percentage || 0) / 20

            ),



            completed:

            true,



           stats:
{
    correctAnswers:
    data.correctAnswers || 0,

    wrongAnswers:
    data.wrongAnswers || 0,

    totalQuestions:
    data.totalQuestions || 0,

    pairs:
    data.pairs || 0,

    totalPairs:
    data.totalPairs || 0,

    moves:
    data.moves || 0
},


moves:
data.moves || 0,


correctAnswers:
data.correctAnswers || 0,


wrongAnswers:
data.wrongAnswers || 0,


correct:
data.correctAnswers || 0,


wrong:
data.wrongAnswers || 0,



            message:

            data.message || ""



        };


    }


};



window.ActivityResult =
ActivityResult;



console.log(
"Activity Result System Ready"
);