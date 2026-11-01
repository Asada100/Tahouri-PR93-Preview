const WordPuzzleEngine={
version:"2.0",
activity:null,state:null,round:null,

start(a){
this.activity=a||{};
this.state={started:true,finished:false,round:0,total:1,correct:0,wrong:0,score:0,hints:0,hintPenalty:0,foundWords:[]};
this.round={type:"modeSelect",title:"واژه‌خانه",instruction:"یک نوع بازی را انتخاب کن؛ حالت‌ها پشت سر هم اجرا نمی‌شوند.",modes:this.activity?.settings?.modes||["wordBuilder","wordSearch","wordFamily","lPath"]};
this.state.mode=null;
this.emitReady(); return this.getState();
},

selectMode(mode){
const allowed=this.activity?.settings?.modes||["wordBuilder","wordSearch","wordFamily","lPath"];
if(mode==="lPath")mode="wordSearch";
if(!allowed.includes(mode)||this.state?.finished)return this.getState();
this.state.mode=mode;this.state.round=0;this.state.correct=0;this.state.wrong=0;this.state.score=0;this.state.hints=0;this.state.hintPenalty=0;this.state.foundWords=[];this.state.searchHintCounts={};
if(mode==="wordFamily"){
const families=this.shuffle((this.activity?.puzzle?.families||[]).slice());
this.state.familyOrder=families.slice(0,Math.min(4,families.length)).map(f=>f.id);
}
if(mode==="wordBuilder"){
const stages=this.activity?.puzzle?.builderStages||[];
this.state.builderStages=stages.map(stage=>{
const eligible=(stage.words||[]).filter(item=>item&&item.word&&item.meaning&&[...String(item.word)].length<=Number(this.activity?.settings?.builderMaxWordLength||8));
return{...stage,words:this.shuffle(eligible.slice()).slice(0,Math.max(1,Number(stage.targetCount||3)))};
}).filter(stage=>stage.words.length>0);
this.state.builderStageIndex=0;
this.state.builderSolvedWords=[];
this.state.builderStageBoard=null;
}

this.round=this.build(mode);
this.state.total=mode==="wordSearch"?this.round.words.length:mode==="wordBuilder"?(this.state.builderStages||[]).reduce((sum,stage)=>sum+stage.words.length,0):mode==="wordFamily"?(this.state.familyOrder||[]).length:1;
this.state.started=true;
this.emitReady();
return this.getState();
},

next(){
return this.getState();
},

build(mode){
if(mode==="wordBuilder")return this.builder();
if(mode==="wordSearch")return this.search();
if(mode==="wordFamily")return this.family();
return this.lpath();
},

builder(){
const stages=this.state?.builderStages||[];
const stageIndex=Number(this.state?.builderStageIndex||0);
const stage=stages[stageIndex];
if(!stage)return{type:"wordBuilder",title:"کلمه‌ساز",instruction:"همهٔ واژه‌ها ساخته شدند.",grid:[[]],targetWords:[],solvedWords:[],builderProgress:{current:this.state?.correct||0,total:this.state?.total||0}};
if(!this.state.builderStageBoard||this.state.builderStageBoard.stageId!==stage.id){
this.state.builderStageBoard={stageId:stage.id,grid:this.makeBuilderCircle(stage.words.map(item=>item.word))};
this.state.builderSolvedWords=[];
}
const solved=this.state.builderSolvedWords||[];
const letters=(stage.letters||[]).join("، ");
const clues=stage.words.map((item,index)=>({word:item.word,meaning:item.meaning,solved:solved.includes(WordPuzzleRepository.normalize(item.word)),number:index+1}));
return{type:"wordBuilder",title:"کلمه‌ساز — مرحله "+(stageIndex+1)+" از "+stages.length,
instruction:"حروف را آزادانه روی دایره به هم وصل کن و هر سه واژهٔ معنادار را بساز.",
stageTitle:stage.title,stageId:stage.id,stageLetters:stage.letters||[],stageLesson:stage.lesson||"",
targetWords:clues,solvedWords:solved,grid:this.state.builderStageBoard.grid,
builderProgress:{current:this.state.correct||0,total:this.state.total||0,stage:stage.title,stageIndex:stageIndex+1,stageCount:stages.length,stageSolved:solved.length,stageTarget:stage.words.length,baseLetters:letters}};
},

makeBuilderCircle(words){
const normalized=(words||[]).map(word=>[...String(word||"")].filter(ch=>!/[\\s\\u200c\\u200d]/.test(ch)));
const maxCounts=new Map();
for(const chars of normalized){
const counts=new Map();
chars.forEach(ch=>counts.set(ch,(counts.get(ch)||0)+1));
counts.forEach((count,ch)=>maxCounts.set(ch,Math.max(maxCounts.get(ch)||0,count)));
}
let pool=[];
maxCounts.forEach((count,ch)=>{for(let i=0;i<count;i++)pool.push(ch);});
if(!pool.length)pool=[..."دانش"];
this.shuffle(pool);
return[pool];
},

search(){
const difficulty=WordPuzzleDifficulty.settings(this.activity?.settings?.difficulty||2);
const source=this.shuffle(WordPuzzleRepository.getWords(this.activity).slice()).sort((a,b)=>[...String(b.word||"")].length-[...String(a.word||"")].length);
const targetCount=Math.min(10,source.length);
const gridSize=8;
let best={words:[],grid:[],placements:[]};
for(let retry=0;retry<80;retry++){
const grid=Array.from({length:gridSize},()=>Array(gridSize).fill(""));
const placements=[];
for(const candidate of source){
if(placements.length>=targetCount)break;
const path=this.placeWord(grid,candidate.word);
if(path)placements.push({word:candidate.word,path,pathType:WordPuzzlePathEngine.isL(path)?"L":"straight"});
}
if(placements.length>best.words.length)best={words:placements.map(x=>x.word),grid,placements};
if(placements.length===targetCount)break;
}
this.fill(best.grid);
return{type:"wordSearch",title:"واژه‌یاب",instruction:"واژه‌های پنهان را با کشیدن انگشت یا موس پیدا کن؛ مسیر می‌تواند مستقیم، مورب یا دارای یک پیچ L باشد.",grid:best.grid,words:best.words,placements:best.placements};
},

placeWord(grid,word){
const dirs=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]],n=grid.length,chars=[...WordPuzzleRepository.normalize(word||"")];
if(!chars.length||chars.length>2*n-1)return false;
for(let attempt=0;attempt<1600;attempt++){
const useTurn=chars.length>n||Math.random()<0.55;
let path=[];
if(useTurn){
const firstEdges=1+Math.floor(Math.random()*(chars.length-2));
const d1=dirs[Math.floor(Math.random()*dirs.length)];
const turns=[1,2,3,5,6,7];
const delta=turns[Math.floor(Math.random()*turns.length)];
const d2=dirs[(dirs.findIndex(d=>d[0]===d1[0]&&d[1]===d1[1])+delta)%dirs.length];
const r=Math.floor(Math.random()*n),c=Math.floor(Math.random()*n);
for(let i=0;i<chars.length;i++){
const step=i<=firstEdges?i:firstEdges,extra=i<=firstEdges?0:i-firstEdges;
path.push([r+d1[0]*step+d2[0]*extra,c+d1[1]*step+d2[1]*extra]);
}
}else{
const d=dirs[Math.floor(Math.random()*dirs.length)],r=Math.floor(Math.random()*n),c=Math.floor(Math.random()*n);
path=chars.map((_,i)=>[r+d[0]*i,c+d[1]*i]);
}
if(path.some(([r,c])=>r<0||r>=n||c<0||c>=n))continue;
let ok=true;
for(let i=0;i<path.length;i++){const [r,c]=path[i],cell=grid[r][c];if(cell&&cell!==chars[i]){ok=false;break;}}
if(!ok)continue;
path.forEach(([r,c],i)=>{grid[r][c]=chars[i];});
return path;
}
return false;
},

family(){
const families=WordPuzzleRepository.getFamilies(this.activity);
const order=this.state.familyOrder||families.map(f=>f.id);
const family=families.find(f=>f.id===order[this.state.round])||{base:"",members:[]};
const correct=[...family.members];
const allMembers=WordPuzzleRepository.getAllFamilyMembers(this.activity);
const decoys=this.shuffle(allMembers.filter(w=>!correct.some(c=>WordPuzzleRepository.normalize(c)===WordPuzzleRepository.normalize(w)))).slice(0,4);
return{type:"treeFamily",title:"درخت خانوادهٔ واژه‌ها",instruction:"برگ‌های هم‌خانواده را سبز کن و برگ‌های نامرتبط را زرد کن؛ بعد بررسی را بزن.",base:family.base,options:this.shuffle([...correct,...decoys]),answers:correct,stage:this.state.round+1,totalStages:order.length};
},

lpath(){
const words=WordPuzzleRepository.getWords(this.activity).filter(x=>x.word.length>=4);
const w=words[this.state.round%Math.max(1,words.length)]||{word:"دانش",clue:"واژه را در مسیر L شکل پیدا کن."};
const n=7,grid=Array.from({length:n},()=>Array(n).fill("")),path=[];
const horizontal=Math.max(1,Math.min(3,[...w.word].length-2));
let r=1,c=1;
for(let i=0;i<w.word.length;i++){
path.push([r,c]);grid[r][c]=w.word[i];
if(i<horizontal)c++;else r++;
if(r>=n&&i<w.word.length-1)break;
}
this.fill(grid);
return{type:"lPath",title:"مسیر واژه",instruction:"حروف واژه را با کشیدن انگشت یا موس در مسیر L شکل وصل کن.",grid,word:w.word,clue:w.clue||"واژه را در مسیر L شکل پیدا کن.",path};
},

submit(ok){
if(!this.state?.started||this.state.finished)return{correct:false,finished:true};
const correct=!!ok;
if(!correct){this.state.wrong++;return{correct:false,finished:false,state:this.getState()};}
this.state.correct=1;this.state.score+=WordPuzzleScore.correct(10,this.state.hints);
const result=this.finish();
return{correct:true,finished:true,...result};
},

submitBuilder(value){
if(!this.state?.started||this.state.finished)return{correct:false,finished:true};
const stages=this.state.builderStages||[],stage=stages[this.state.builderStageIndex||0];
const answer=WordPuzzleRepository.normalize(value);
if(!stage||!answer){this.state.wrong++;return{correct:false,finished:false,state:this.getState()};}
const target=stage.words.find(item=>WordPuzzleRepository.normalize(item.word)===answer);
if(!target){this.state.wrong++;return{correct:false,finished:false,state:this.getState()};}
const normalized=WordPuzzleRepository.normalize(target.word);
if((this.state.builderSolvedWords||[]).includes(normalized))return{correct:false,duplicate:true,finished:false,state:this.getState()};
this.state.builderSolvedWords=this.state.builderSolvedWords||[];
this.state.builderSolvedWords.push(normalized);
this.state.foundWords=this.state.foundWords||[];
this.state.foundWords.push(normalized);
this.state.correct++;
this.state.score+=WordPuzzleScore.correct(10,this.state.hints);
const stageComplete=this.state.builderSolvedWords.length>=stage.words.length;
if(stageComplete){
this.state.builderStageIndex++;
this.state.builderStageBoard=null;
this.state.builderSolvedWords=[];
if(this.state.correct>=this.state.total){
const result=this.finish();
return{correct:true,foundWord:target.word,stageComplete:true,finished:true,...result};
}
}
this.state.round=this.state.builderStageIndex;
this.round=this.builder();
const result={correct:true,foundWord:target.word,stageComplete,finished:false,state:this.getState()};
this.emitReady();
return result;
},

submitTreeFamily(greenWords,yellowWords){
if(!this.state?.started||this.state.finished)return{correct:false,finished:true};
const normalize=WordPuzzleRepository.normalize;
const green=(greenWords||[]).map(normalize).sort();
const yellow=(yellowWords||[]).map(normalize).sort();
const answers=(this.round?.answers||[]).map(normalize).sort();
const options=(this.round?.options||[]).map(normalize);
const expectedYellow=options.filter(word=>!answers.includes(word)).sort();
const ok=green.length===answers.length&&green.every((word,i)=>word===answers[i])&&yellow.length===expectedYellow.length&&yellow.every((word,i)=>word===expectedYellow[i]);
if(!ok){this.state.wrong++;return{correct:false,finished:false,state:this.getState()};}
this.state.correct++;
this.state.score+=WordPuzzleScore.correct(10,this.state.hints);
if(this.state.correct>=this.state.total)return{correct:true,finished:false,finalStage:true,state:this.getState()};
this.state.round++;
this.round=this.family();
return{correct:true,finished:false,finalStage:false,state:this.getState()};
},

submitFamily(values){
if(!this.state?.started||this.state.finished)return{correct:false,finished:true};
const ok=WordPuzzleValidator.familySelection(values,this.round);
if(!ok){this.state.wrong++;return{correct:false,finished:false,state:this.getState()};}
this.state.correct++;
this.state.score+=WordPuzzleScore.correct(10,this.state.hints);
if(this.state.correct>=this.state.total){const result=this.finish();return{correct:true,finished:true,...result};}
this.state.round++;
this.round=this.family();
return{correct:true,finished:false,state:this.getState()};
},

submitSearch(path){
if(!this.state||this.state.finished)return{correct:false,finished:this.state?.finished};
if(!WordPuzzlePathEngine.valid(this.round.grid,path)){
this.state.wrong++;return{correct:false,finished:false,keepBoard:true,state:this.getState()};
}
const value=WordPuzzlePathEngine.read(this.round.grid,path),reverse=[...value].reverse().join("");
const normalize=WordPuzzleRepository.normalize;
const matched=this.round.words.find(w=>normalize(w)===normalize(value)||normalize(w)===normalize(reverse));
if(!matched){this.state.wrong++;return{correct:false,finished:false,keepBoard:true,state:this.getState()};}
const key=normalize(matched);
if(this.state.foundWords.includes(key))return{correct:false,duplicate:true,finished:false,keepBoard:true,state:this.getState()};
this.state.foundWords.push(key);
this.state.correct=this.state.foundWords.length;
this.state.score+=WordPuzzleScore.correct(10,this.state.mode==="wordSearch"?0:this.state.hints);
if(this.state.foundWords.length>=this.state.total){
const result=this.finish();
return{correct:true,foundWord:matched,finished:true,...result};
}
return{correct:true,foundWord:matched,finished:false,keepBoard:true,state:this.getState()};
},

submitL(path){
if(!WordPuzzlePathEngine.valid(this.round.grid,path)||!WordPuzzlePathEngine.isL(path))return this.submit(false);
const value=WordPuzzlePathEngine.read(this.round.grid,path),reverse=[...value].reverse().join("");
const target=WordPuzzleRepository.normalize(this.round.word);
return this.submit(WordPuzzleRepository.normalize(value)===target||WordPuzzleRepository.normalize(reverse)===target);
},

hint(){
if(this.state.finished)return null;
if(this.round?.type==="wordSearch"){
const normalize=WordPuzzleRepository.normalize;
const placement=(this.round.placements||[]).find(item=>!this.state.foundWords.includes(normalize(item.word)));
if(!placement)return null;
this.state.searchHintCounts=this.state.searchHintCounts||{};
const key=normalize(placement.word);
const shown=this.state.searchHintCounts[key]||0;
if(shown>=2)return{type:"limit",word:placement.word};
this.state.searchHintCounts[key]=shown+1;
this.state.hints++;
this.state.hintPenalty=(this.state.hintPenalty||0)+2;
const cells=(placement.path||[]).slice(0,shown+1);
return cells.length?{type:"path",value:cells,word:placement.word}:null;
}
this.state.hints++;
const index=this.state.hints-1;
if(this.round?.type==="wordBuilder")return{type:"cell",value:this.round.path?.[0]||null};
if(this.round?.type==="lPath"){
const cell=this.round.path?.[0];
return cell?{type:"cell",value:cell}:null;
}
if(this.round?.type==="wordFamily"){
const answer=this.round.answers?.[index%Math.max(1,this.round.answers.length)];
return{type:"letter",value:answer?.[0]||null};
}
return null;
},
finish(){
this.state.finished=true;
const percentage=Math.round(this.state.correct/Math.max(1,this.state.total)*100);
const result=typeof ActivityResult!=="undefined"&&ActivityResult.create
?ActivityResult.create({activityId:this.activity?.id||"persianWordPuzzle",score:Math.max(0,this.state.score-(this.state.hintPenalty||0)),percentage,totalQuestions:this.state.total,correctAnswers:this.state.correct,wrongAnswers:this.state.wrong,message:"برگ درختان سبز در نظر هوشیار\nهر ورقش دفتریست معرفت کردگار"})
 :{activityId:this.activity?.id||"persianWordPuzzle",score:Math.max(0,this.state.score-(this.state.hintPenalty||0)),percentage,totalQuestions:this.state.total,correctAnswers:this.state.correct,wrongAnswers:this.state.wrong,message:"برگ درختان سبز در نظر هوشیار\nهر ورقش دفتریست معرفت کردگار"};
if(typeof EventManager!=="undefined")EventManager.emit("activityFinished",result);
return result;
},

getSessionState(){
if(!this.activity||!this.state||!this.round)return null;
return {kind:"wordPuzzle",activity:JSON.parse(JSON.stringify(this.activity)),state:JSON.parse(JSON.stringify(this.state)),round:JSON.parse(JSON.stringify(this.round))};
},
restoreSession(saved){
if(!saved||saved.kind!=="wordPuzzle"||!saved.state||!saved.round)return false;
this.activity=saved.activity||this.activity;
this.state=JSON.parse(JSON.stringify(saved.state));
this.round=JSON.parse(JSON.stringify(saved.round));
this.emitReady();
return true;
},
emitReady(){if(typeof EventManager!=="undefined")EventManager.emit("activityReady",{engineName:"WordPuzzleEngine",engine:this,activity:this.activity,result:this.getState()});},
getState(){return{...this.state,data:this.round};},
fill(grid){const letters="ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";if(!Array.isArray(grid))return grid;for(let r=0;r<grid.length;r++){if(!Array.isArray(grid[r]))grid[r]=[];for(let c=0;c<grid[r].length;c++)if(typeof grid[r][c]!=="string"||!grid[r][c].trim())grid[r][c]=letters[Math.floor(Math.random()*letters.length)];}return grid;},
shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
};
window.WordPuzzleEngine=WordPuzzleEngine;
console.log("Word Puzzle Engine v2.0 Ready");