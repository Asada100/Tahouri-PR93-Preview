window.WordPuzzleRepository={
formatDisplay(w){
return String(w||"")
.replace(/\s+/g," ")
.replace(/(^|\s)(می|نمی)\s+/g,"$1$2‌")
.replace(/\s+(ها|های|هایی)(?=$|[،.!؟])/g,"‌$1")
.replace(/\s+(ام|ای|ایم|اید|اند)(?=$|[،.!؟])/g,"‌$1")
.replace(/داده[\u200c\u200d\s]*اند/g,"داده‌اند")
.trim();
},
normalize(w){
return String(w||"")
.replace(/[يى]/g,"ی")
.replace(/[ك]/g,"ک")
.replace(/[اآأإٱ]/g,"ا")
.replace(/[ۀة]/g,"ه")
.replace(/[\u200c\u200d\s]/g,"");
},
getWords(a){
const seen=new Set();
return (a?.puzzle?.words||[]).filter(x=>x&&x.word).map(x=>({
...x,
normalized:this.normalize(x.word)
})).filter(x=>{
if(seen.has(x.normalized))return false;
seen.add(x.normalized);
return true;
});
},
getFamilies(a){
return (a?.puzzle?.families||[]).filter(f=>f&&f.base&&Array.isArray(f.members)&&f.members.length);
},
getAllFamilyMembers(a){
return this.getFamilies(a).flatMap(f=>f.members||[]);
}
};