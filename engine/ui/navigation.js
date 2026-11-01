// =====================================
// Tahouri Edu Platform
// Version 4.1
// Navigation Manager
// State + History + Dashboard Control
// =====================================


const Navigation = {



selectGrade:function(grade){


    AppState.grade = grade;


    AppState.subject = null;

    AppState.chapter = null;

    AppState.activity = null;



    NavigationHistory.clear();



    NavigationHistory.push(

        "grade",

        grade

    );



    console.log(

        "Selected Grade:",

        grade

    );


},







selectSubject:function(subject){


    AppState.subject = subject;


    AppState.chapter = null;

    AppState.activity = null;



    NavigationHistory.push(

        "subject",

        subject

    );



    console.log(

        "Selected Subject:",

        subject

    );


},







selectChapter:function(chapter){


    AppState.chapter = chapter;


    AppState.activity = null;



    NavigationHistory.push(

        "chapter",

        chapter

    );



    console.log(

        "Selected Chapter:",

        chapter

    );


},







selectActivity:function(activity){


    AppState.activity = activity;



    NavigationHistory.push(

        "activity",

        activity

    );



    console.log(

        "Selected Activity:",

        activity

    );


},







// =====================================
// Dashboard Navigation
// =====================================


openDashboard:function(){


    NavigationHistory.push(

        "dashboard",

        null

    );



    console.log(

        "Opening Dashboard"

    );



    DashboardController.open();


}



};







window.Navigation = Navigation;



console.log(

    "Navigation System Ready"

);