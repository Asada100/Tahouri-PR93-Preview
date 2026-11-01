// =====================================
// Tahouri Edu Platform
// Version 2.1
// Result Manager
// =====================================

const ResultManager = {

    create:function(scoreData){

        return {

            score:
            scoreData.score,

            totalQuestions:
            scoreData.totalQuestions,

            correctAnswers:
            scoreData.correctAnswers,

            wrongAnswers:
            scoreData.wrongAnswers,

            percentage:
            scoreData.percentage,

            stars:
            this.calculateStars(
                scoreData.percentage
            ),

            message:
            this.getMessage(
                scoreData.percentage
            )

        };

    },



    calculateStars:function(percentage){

        if(percentage <= 20){

            return 1;

        }

        if(percentage <= 40){

            return 2;

        }

        if(percentage <= 60){

            return 3;

        }

        if(percentage <= 80){

            return 4;

        }

        return 5;

    },



    getMessage:function(percentage){

        if(percentage <= 20){

            return "🌱 شروع خوبی بود، ادامه بده!";

        }

        if(percentage <= 40){

            return "👏 آفرین، داری پیشرفت می‌کنی.";

        }

        if(percentage <= 60){

            return "💪 خیلی خوب، ادامه بده!";

        }

        if(percentage <= 80){

            return "🌟 عالی بود!";

        }

        return "🏆 فوق‌العاده! استاد شدی!";

    }

};



console.log(

"Result Manager Ready"

);