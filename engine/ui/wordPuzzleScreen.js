const WordPuzzleScreen={
init(){
if(typeof EventManager==="undefined")return;
EventManager.on("activityReady",p=>{
if(p?.engineName==="WordPuzzleEngine")this.render(p.result);
});
},

render(s){
const root=document.getElementById("app");
if(!root)return;
const isModeSelect=s.data?.type==="modeSelect";
document.body.classList.toggle("word-puzzle-mode-select",isModeSelect);
root.innerHTML="";
const box=document.createElement("main");
box.className=isModeSelect?"screen wp-shell":"wp-shell";
box.dir="rtl";
if(s.data?.type==="modeSelect"){
box.innerHTML=`<h1>واژه‌خانه 🧩</h1><p class="wp-instruction">نوع بازی را انتخاب کن. هر بار فقط همین بازی اجرا می‌شود.</p><div id="wp"></div>`;
root.appendChild(box);
this.modeSelect(box.querySelector("#wp"),s.data);
return;
}
box.innerHTML=`
${(s.data?.type==="wordSearch"||s.data?.type==="wordBuilder"||s.data?.type==="treeFamily")?"":`<section class="wp-header">
<div class="wp-progress">بازی مستقل</div>
<div class="wp-score">⭐ <strong>${s.score}</strong></div>
</section>`}
${s.data?.type==="treeFamily"?`<div class="wp-tree-heading"><h1>${s.data?.title||"درخت خانوادهٔ واژه‌ها"}</h1><span class="wp-tree-heading-stage">مرحله ${s.data?.stage} از ${s.data?.totalStages}</span></div>`:`<h1>${s.data?.title||"واژه‌خانه"}</h1>`}
${s.data?.type==="wordBuilder"?"":s.data?.type==="wordSearch"?`<div class="wp-instruction wp-instruction-with-hint"><span>واژه‌های پنهان را با کشیدن انگشت یا موس پیدا کن؛ مسیر می‌تواند مستقیم، مورب یا دارای یک پیچ L باشد.</span><button type="button" class="wp-btn wp-hint-btn wp-search-hint" aria-label="راهنما" title="راهنما">💡</button></div>`:s.data?.type==="treeFamily"?`<div class="wp-tree-top-instruction-row"><p class="wp-instruction wp-tree-top-instruction">برگ‌های هم‌خانواده را سبز کن و برگ‌های نامرتبط را زرد کن؛ بعد بررسی را بزن.</p><button type="button" class="wp-btn" data-tree-check>بررسی</button></div>`:`<p class="wp-instruction">${s.data?.instruction||""}</p>`}
${s.data?.type==="treeFamily"?"":'<div class="wp-status" aria-live="polite"></div>'}
<div id="wp"></div>`;
root.appendChild(box);
const x=box.querySelector("#wp");
if(s.data?.type==="wordBuilder")this.builder(x,s.data);
else if(s.data?.type==="wordSearch")this.search(x,s.data,s.foundWords||[]);
else if(s.data?.type==="treeFamily")this.treeFamily(x,s.data);
else if(s.data?.type==="wordFamily")this.family(x,s.data);
else this.search(x,s.data,s.foundWords||[]);
},

modeSelect(x,d){
const labels={wordBuilder:["🔤","کلمه‌ساز","حروف را با کشیدن مسیر به هم وصل کن."],wordSearch:["🔎","واژه‌یاب","همه واژه‌های پنهان جدول را پیدا کن."],wordFamily:["🌱","خانواده واژه‌ها","واژه‌های هم‌خانواده را انتخاب کن."],lPath:["↪️","مسیر L","واژه را در مسیر L شکل پیدا کن."]};
x.innerHTML='<div class="wp-mode-list"></div>';
const list=x.querySelector(".wp-mode-list");
(d.modes||Object.keys(labels)).filter(mode=>mode!=="lPath").forEach(mode=>{
const item=labels[mode];if(!item)return;
const b=document.createElement("button");b.type="button";b.className="wp-mode-card";
b.innerHTML='<span class="wp-mode-icon">'+item[0]+'</span><strong>'+item[1]+'</strong><span>'+item[2]+'</span>';
b.onclick=()=>WordPuzzleEngine.selectMode(mode);
list.appendChild(b);
});
},

showToast(message,good=false){
const previous=document.getElementById("wp-feedback-toast");
if(previous)previous.remove();
const toast=document.createElement("div");
toast.id="wp-feedback-toast";
toast.className="wp-feedback-toast "+(good?"good":"bad");
toast.setAttribute("role","status");
toast.setAttribute("aria-live","polite");
toast.dir="rtl";
toast.textContent=message;
document.body.appendChild(toast);
toast.addEventListener("animationend",()=>toast.remove(),{once:true});
},
feedback(x,message,good){
this.showToast(message,good);
},

afterSubmit(x,result){
const good=!!result?.correct;
this.feedback(x,good?"آفرین! پاسخ درست بود.":"این پاسخ درست نبود؛ مرحله بعد را با دقت بیشتری حل کن.",good);
if(result?.finished){
    // The engine has already emitted activityFinished. ActivityLifecycle
    // owns result presentation and progress recording; do not replace the
    // platform result screen with a second, engine-specific finish screen.
    return;
}
setTimeout(()=>this.render(result.state),900);
},

hint(x,renderHint){
const result=WordPuzzleEngine.hint();
if(!result){
this.feedback(x,"راهنمای بیشتری در دسترس نیست.",false);
return;
}
if(result.type==="letter"){
renderHint(result.value,result.type);
this.feedback(x,"یک راهنما نمایش داده شد؛ امتیاز این مرحله کمی کاهش می‌یابد.",false);
}else if(result.type==="cell"){
renderHint(result.value,result.type);
this.feedback(x,"خانه‌ای از مسیر راهنما مشخص شد؛ حالا واژه را پیدا کن.",false);
}
},

finish(result){
const root=document.getElementById("app");
if(!root)return;
document.body.classList.remove("word-puzzle-mode-select");
const percentage=result.percentage??Math.round((result.correctAnswers/result.totalQuestions)*100);
const stars=WordPuzzleScore.stars(percentage);
const box=document.createElement("main");
box.className="wp-shell wp-finish";
box.dir="rtl";
box.innerHTML=`
<div class="wp-finish-card">
<div class="wp-finish-icon">🎉</div>
<h1>واژه‌خانه را کامل کردی!</h1>
<p class="wp-finish-message">${result.message||"خسته نباشی!"}</p>
<div class="wp-stars" aria-label="${stars} ستاره از ۵">${"★".repeat(stars)}${"☆".repeat(5-stars)}</div>
<div class="wp-summary">
<div><span>امتیاز</span><strong>${result.score}</strong></div>
<div><span>پاسخ درست</span><strong>${result.correctAnswers} از ${result.totalQuestions}</strong></div>
<div><span>درصد موفقیت</span><strong>${percentage}٪</strong></div>
</div>
<button type="button" class="wp-btn" data-finish>بازگشت</button>
</div>`;
root.innerHTML="";
root.appendChild(box);
box.querySelector("[data-finish]").onclick=()=>{if(typeof NavigationHistory!=="undefined")NavigationHistory.back();if(typeof Screen!=="undefined"&&typeof Screen.showActivities==="function"&&typeof AppState!=="undefined"){Screen.showActivities(AppState.grade,AppState.subject,AppState.chapter);return;}if(typeof Screen!=="undefined"&&typeof Screen.showHome==="function")Screen.showHome();};
},

createGrid(gridElement,gridData){
gridElement.innerHTML="";
gridElement.style.gridTemplateColumns="repeat("+gridData[0].length+",minmax(0,1fr))";
gridData.forEach((row,r)=>row.forEach((letter,c)=>{
const isBuilder=gridElement.classList.contains("wp-builder-grid");
const b=document.createElement(isBuilder?"span":"button");
if(isBuilder){b.setAttribute("role","button");b.tabIndex=0;}else b.type="button";
b.className="wp-cell";
b.textContent=letter;
b.setAttribute("aria-label",`ردیف ${r+1} ستون ${c+1}، حرف ${letter}`);
b.dataset.r=r;b.dataset.c=c;
gridElement.appendChild(b);
}));
},

bindDragPath(gridElement,onUpdate,options={}){
let path=[];
let dragging=false;
let livePoint=null;
let freehandTrace=[];
let previousPointer=null;
const straightOnly=!!options.straightOnly;
const freePath=!!options.freePath;
const cells=()=>Array.from(gridElement.querySelectorAll(".wp-cell"));
gridElement.style.position="relative";
const svgNS="http://www.w3.org/2000/svg";
let overlay=gridElement.querySelector(".wp-path-overlay");
if(!overlay){
overlay=document.createElementNS(svgNS,"svg");
overlay.setAttribute("viewBox","0 0 1000 1000");
overlay.setAttribute("preserveAspectRatio","none");
overlay.setAttribute("aria-hidden","true");
overlay.classList.add("wp-path-overlay");
gridElement.appendChild(overlay);
}
const foundPaths=gridElement.__wpFoundPaths||(Array.isArray(options.foundPaths)?options.foundPaths.map(points=>points.map(p=>[p[0],p[1]])):[]);
gridElement.__wpFoundPaths=foundPaths;
const pointsFor=points=>points.map(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
return cell?((cell.offsetLeft+cell.offsetWidth/2)/Math.max(1,gridElement.clientWidth)*1000)+","+((cell.offsetTop+cell.offsetHeight/2)/Math.max(1,gridElement.clientHeight)*1000):null;
}).filter(Boolean).join(" ");
const drawOverlay=()=>{
overlay.innerHTML="";
foundPaths.forEach(points=>{
const coordinates=pointsFor(points);
if(!coordinates)return;
const line=document.createElementNS(svgNS,"polyline");
line.setAttribute("points",coordinates);line.setAttribute("class","wp-path-line wp-path-found");
overlay.appendChild(line);
});
if(freePath&&dragging&&freehandTrace.length>1){
const coordinates=freehandTrace.map(point=>(point.x/Math.max(1,gridElement.clientWidth)*1000)+","+(point.y/Math.max(1,gridElement.clientHeight)*1000)).join(" ");
const line=document.createElementNS(svgNS,"polyline");
line.setAttribute("points",coordinates);line.setAttribute("class","wp-path-line wp-path-active");
overlay.appendChild(line);
}else if(path.length>1){
const coordinates=pointsFor(path);
if(coordinates){
const line=document.createElementNS(svgNS,"polyline");
line.setAttribute("points",coordinates);line.setAttribute("class","wp-path-line wp-path-active");
overlay.appendChild(line);
}
}
if(!freePath&&dragging&&path.length&&livePoint){
const last=pointsFor([path[path.length-1]]);
if(last){
const center=last.split(",");
const line=document.createElementNS(svgNS,"line");
line.setAttribute("x1",center[0]);line.setAttribute("y1",center[1]);
line.setAttribute("x2",Math.max(0,Math.min(1000,livePoint.x/Math.max(1,gridElement.clientWidth)*1000)));
line.setAttribute("y2",Math.max(0,Math.min(1000,livePoint.y/Math.max(1,gridElement.clientHeight)*1000)));
line.setAttribute("class","wp-path-line wp-path-follow");
overlay.appendChild(line);
}
}
};
// Restore paths after the grid receives its final layout dimensions.
const redrawAfterLayout=()=>window.requestAnimationFrame(drawOverlay);
redrawAfterLayout();
if(typeof ResizeObserver!=="undefined"){
const observer=new ResizeObserver(redrawAfterLayout);
observer.observe(gridElement);
gridElement.__wpPathResizeObserver=observer;
}
window.addEventListener("resize",redrawAfterLayout,{passive:true});
const sync=()=>{
const selected=new Set(path.map(([r,c])=>r+","+c));
cells().forEach(cell=>cell.classList.toggle("sel",selected.has(cell.dataset.r+","+cell.dataset.c)));
drawOverlay();
onUpdate(path.map(p=>[p[0],p[1]]));
};
const visit=cell=>{
if(!cell||!gridElement.contains(cell))return;
const point=[Number(cell.dataset.r),Number(cell.dataset.c)];
const existing=path.findIndex(p=>p[0]===point[0]&&p[1]===point[1]);
if(existing>=0){
if(existing===path.length-1)return;
path=path.slice(0,existing+1);
if(freePath&&options.clearTraceOnBacktrack){
const rect=gridElement.getBoundingClientRect();
freehandTrace=path.map(([r,c])=>{
const selectedCell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
if(!selectedCell)return null;
const bounds=selectedCell.getBoundingClientRect();
return {x:bounds.left+bounds.width/2-rect.left,y:bounds.top+bounds.height/2-rect.top};
}).filter(Boolean);
}
sync();return;
}
if(path.length&&!freePath){
const last=path[path.length-1],dr=point[0]-last[0],dc=point[1]-last[1];
if(Math.max(Math.abs(dr),Math.abs(dc))!==1)return;
if(straightOnly&&path.length>=2){
const baseR=path[1][0]-path[0][0],baseC=path[1][1]-path[0][1];
if(dr!==baseR||dc!==baseC)return;
}
}
path.push(point);sync();
};
const stop=event=>{
if(!dragging)return;
dragging=false;
livePoint=null;
previousPointer=null;
freehandTrace=[];
gridElement.classList.remove("wp-tracing");
drawOverlay();
try{if(gridElement.hasPointerCapture(event.pointerId))gridElement.releasePointerCapture(event.pointerId);}catch(_){}
if(typeof options.onRelease==="function")options.onRelease(path.map(p=>[p[0],p[1]]));
};
gridElement.addEventListener("pointerdown",event=>{
const cell=event.target.closest?.(".wp-cell");
if(!cell)return;
if(freePath){
const r=cell.getBoundingClientRect();
if(Math.hypot(event.clientX-(r.left+r.width/2),event.clientY-(r.top+r.height/2))>Math.min(r.width,r.height)*0.43)return;
}
event.preventDefault();
if(typeof options.onStart==="function")options.onStart();
dragging=true;
if(freePath)gridElement.classList.add("wp-tracing");
const rect=gridElement.getBoundingClientRect();
livePoint={x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top))};
previousPointer={x:event.clientX,y:event.clientY};
freehandTrace=freePath?[{x:(cell.getBoundingClientRect().left+cell.getBoundingClientRect().width/2)-rect.left,y:(cell.getBoundingClientRect().top+cell.getBoundingClientRect().height/2)-rect.top}]:[];
try{gridElement.setPointerCapture(event.pointerId);}catch(_){}
visit(cell);
if(freePath)drawOverlay();
});
gridElement.addEventListener("pointermove",event=>{
if(!dragging)return;
let cell;
if(freePath){
const rect=gridElement.getBoundingClientRect();
const x=Math.max(0,Math.min(rect.width,event.clientX-rect.left));
const y=Math.max(0,Math.min(rect.height,event.clientY-rect.top));
livePoint={x,y};
if(!freehandTrace.length&&path.length){
const lastCell=gridElement.querySelector('[data-r="'+path[path.length-1][0]+'"][data-c="'+path[path.length-1][1]+'"]');
if(lastCell){const cr=lastCell.getBoundingClientRect();freehandTrace.push({x:cr.left+cr.width/2-rect.left,y:cr.top+cr.height/2-rect.top});}
}
freehandTrace.push({x,y});
let nearest=null,nearestDistance=Infinity;
cells().forEach(candidate=>{
const r=candidate.getBoundingClientRect();
const cx=r.left+r.width/2,cy=r.top+r.height/2;
const distance=Math.hypot(event.clientX-cx,event.clientY-cy);
const snapRadius=Math.min(r.width,r.height)*0.43;
if(distance<=snapRadius&&distance<nearestDistance){nearest=candidate;nearestDistance=distance;}
});
if(nearest){
const before=path.length;
visit(nearest);
if(path.length!==before){
const r=nearest.getBoundingClientRect();
freehandTrace.push({x:r.left+r.width/2-rect.left,y:r.top+r.height/2-rect.top});
}
}
drawOverlay();
return;
}
const rect=gridElement.getBoundingClientRect();
livePoint={x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top))};
drawOverlay();
// Follow the pointer's swept segment, rather than switching cells from
// endpoint proximity alone. This reduces diagonal gaps and accidental turns
// on both touchscreens and desktop, while keeping intentional L-shaped paths.
const pointerNow={x:event.clientX,y:event.clientY};
const pointerFrom=previousPointer||pointerNow;
previousPointer=pointerNow;
const vx=pointerNow.x-pointerFrom.x,vy=pointerNow.y-pointerFrom.y;
const lengthSquared=vx*vx+vy*vy;
const crossed=[];
cells().forEach(candidate=>{
const bounds=candidate.getBoundingClientRect();
const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
const t=lengthSquared?Math.max(0,Math.min(1,((cx-pointerFrom.x)*vx+(cy-pointerFrom.y)*vy)/lengthSquared)):1;
const px=pointerFrom.x+t*vx,py=pointerFrom.y+t*vy;
const distance=Math.hypot(cx-px,cy-py);
const corridor=Math.min(bounds.width,bounds.height)*0.34;
if(distance<=corridor&&t>0.015)crossed.push({cell:candidate,t,distance});
});
crossed.sort((a,b)=>a.t-b.t||a.distance-b.distance);
if(crossed.length){
crossed.forEach(item=>visit(item.cell));
}else{
let nearestCell=null,nearestDistance=Infinity;
cells().forEach(candidate=>{
const bounds=candidate.getBoundingClientRect();
const distance=Math.hypot(event.clientX-(bounds.left+bounds.width/2),event.clientY-(bounds.top+bounds.height/2));
const snapRadius=Math.min(bounds.width,bounds.height)*0.52;
if(distance<=snapRadius&&distance<nearestDistance){nearestCell=candidate;nearestDistance=distance;}
});
if(nearestCell)visit(nearestCell);
}
return;
});
gridElement.addEventListener("pointerup",stop);
gridElement.addEventListener("pointercancel",stop);
gridElement.addEventListener("click",event=>{
if(event.detail!==0)return;
const cell=event.target.closest?.(".wp-cell");
if(cell)visit(cell);
});
return{
getPath:()=>path.map(p=>[p[0],p[1]]),
clear:()=>{path=[];cells().forEach(cell=>cell.classList.remove("hint-cell","sel","wp-error-cell"));drawOverlay();onUpdate([]);},
highlight:points=>{
cells().forEach(cell=>cell.classList.remove("hint-cell"));
const list=Array.isArray(points?.[0])?points:[points];
list.forEach(point=>{
if(!Array.isArray(point)||point.length!==2)return;
const cell=gridElement.querySelector('[data-r="'+point[0]+'"][data-c="'+point[1]+'"]');
if(cell)cell.classList.add("hint-cell");
});
},
markFound:()=>{
if(path.length>1)foundPaths.push(path.map(p=>[p[0],p[1]]));
path.forEach(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
if(cell){cell.classList.remove("sel","hint-cell");cell.classList.add("wp-found-cell");}
});
path=[];drawOverlay();onUpdate([]);
},
showError:()=>{
path.forEach(([r,c])=>{
const cell=gridElement.querySelector('[data-r="'+r+'"][data-c="'+c+'"]');
if(cell)cell.classList.add("wp-error-cell");
});
}
};
},

builder(x,d){
const clues=(d.targetWords||[]).map((item,index)=>{
const letters=Array.from(item.word||"");
const slots=letters.map((letter,letterIndex)=>`<span class="wp-builder-answer-slot">${item.solved?letter:""}</span>`).join("");
return `
<div class="wp-builder-clue ${item.solved?"is-solved":""}">
<span class="wp-builder-clue-meaning">${item.meaning}</span>
<div class="wp-builder-answer-slots" dir="rtl" aria-label="${letters.length} حرف">${slots}</div>
</div>`;
}).join("");
x.innerHTML=`
<div class="wp-card wp-builder-card">
<div class="wp-builder-meta"><span class="wp-builder-step">${d.builderProgress?d.builderProgress.stageSolved+" از "+d.builderProgress.stageTarget+" واژه":""}</span></div>
<div class="wp-builder-clues">${clues}</div>
<div class="wp-answer" aria-live="polite" aria-label="واژه در حال ساخت"></div>
<div class="wp-grid wp-builder-grid" aria-label="حروف قابل اتصال"></div>
<div class="wp-actions wp-builder-actions">
<button type="button" class="wp-btn wp-secondary" data-shuffle aria-label="جابجایی حروف" title="جابجایی حروف">🔀 جابه‌جایی حروف</button>
</div>
</div>`;
const answer=x.querySelector(".wp-answer"),grid=x.querySelector(".wp-builder-grid");
const visualGrid=d.grid.map(row=>row.slice());
this.createGrid(grid,visualGrid);
const cells=Array.from(grid.querySelectorAll(".wp-cell"));
const placeLetters=()=>{
cells.forEach((cell,index)=>{
const angle=(-Math.PI/2)+(2*Math.PI*index/Math.max(1,cells.length));
cell.style.left=(50+Math.cos(angle)*37)+"%";
cell.style.top=(50+Math.sin(angle)*37)+"%";
cell.dataset.r="0";cell.dataset.c=String(index);
cell.textContent=visualGrid[0][index];
});
};
placeLetters();
let submitting=false;
const path=this.bindDragPath(grid,selected=>{
const value=WordPuzzlePathEngine.read(visualGrid,selected);
answer.textContent=value||"";
answer.classList.toggle("has-value",selected.length>0);
},{freePath:true,clearTraceOnBacktrack:true,onRelease:selected=>{
if(submitting||selected.length<2)return;
const value=WordPuzzlePathEngine.read(visualGrid,selected);
if(!value)return;
submitting=true;
this.afterSubmit(x,WordPuzzleEngine.submitBuilder(value));
setTimeout(()=>{submitting=false;},1000);
}});
x.querySelector("[data-shuffle]").onclick=()=>{
if(submitting)return;
const letters=visualGrid[0].slice();
for(let i=letters.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[letters[i],letters[j]]=[letters[j],letters[i]];}
if(letters.every((letter,index)=>letter===visualGrid[0][index])&&letters.length>1){[letters[0],letters[1]]=[letters[1],letters[0]];}
visualGrid[0]=letters;
path.clear();
placeLetters();
answer.textContent="";answer.classList.remove("has-value");
};
},

treeFamily(x,d){
const classifications=new Map();
x.innerHTML=`
<div class="wp-card wp-tree-card">
<div class="wp-tree-stage">
<div class="wp-tree-illustration">
<img class="wp-tree-art" src="assets/images/tree1.png" alt="" aria-hidden="true">
<div class="wp-tree-leaves" aria-label="برگ‌های واژه"></div>
<div class="wp-tree-root-word">ریشهٔ واژه: <strong>${d.base}</strong></div>
</div>
<div class="wp-tree-legend"><span><i class="wp-legend-green"></i> هم‌خانواده</span><span><i class="wp-legend-yellow"></i> نامرتبط</span></div>
</div>
<div class="wp-tree-box-wrap"><div class="wp-tree-box-title">📦 جعبهٔ برگ‌های جداشده</div><div class="wp-tree-box" aria-live="polite"><span class="wp-tree-box-empty">برگ‌های زرد اینجا می‌افتند!</span></div></div>
<p class="wp-tree-instruction">روی هر برگ بزن تا رنگش عوض شود: بی‌رنگ ← سبز ← زرد. همهٔ برگ‌ها را دسته‌بندی کن.</p>
<div class="wp-tree-feedback" aria-live="polite"></div>

</div>`;
const leaves=x.querySelector(".wp-tree-leaves"),box=x.querySelector(".wp-tree-box"),feedback=x.querySelector(".wp-tree-feedback");
const positions=[[25,20],[43,15],[61,18],[76,26],[20,40],[37,36],[54,34],[70,41],[27,55],[44,53],[61,56],[76,54]];
d.options.forEach((word,i)=>{
const b=document.createElement("button");
b.type="button";b.className="wp-tree-leaf";b.textContent=word;b.style.left=positions[i%positions.length][0]+"%";b.style.top=positions[i%positions.length][1]+"%";
b.setAttribute("aria-label",word+"؛ برای تغییر رنگ برگ بزن");
b.onclick=()=>{
if(classifications.has(word)){
const next=(classifications.get(word)+1)%3;
if(next===0){classifications.delete(word);b.classList.remove("is-green","is-yellow");b.removeAttribute("data-classification");}
else{classifications.set(word,next);b.classList.toggle("is-green",next===1);b.classList.toggle("is-yellow",next===2);b.dataset.classification=next===1?"green":"yellow";}
}else{classifications.set(word,1);b.classList.add("is-green");b.dataset.classification="green";}
};
leaves.appendChild(b);
});
x.closest(".wp-shell").querySelector("[data-tree-check]").onclick=()=>{
const green=d.options.filter(w=>classifications.get(w)===1);
const yellow=d.options.filter(w=>classifications.get(w)===2);
const result=WordPuzzleEngine.submitTreeFamily(green,yellow);
if(!result.correct){feedback.textContent="هنوز چند برگ اشتباه رنگ شده یا دسته‌بندی نشده‌اند. دوباره بررسی کن 🌱";feedback.className="wp-tree-feedback bad";return;}
feedback.textContent="آفرین! دسته‌بندی درخت درست بود. 🍃";feedback.className="wp-tree-feedback good";
x.closest(".wp-shell").querySelector("[data-tree-check]").disabled=true;
const yellowLeaves=Array.from(leaves.querySelectorAll(".is-yellow"));
const empty=box.querySelector(".wp-tree-box-empty");if(empty)empty.remove();
yellowLeaves.forEach((leaf,index)=>{
leaf.classList.add("is-falling");
setTimeout(()=>{const fallen=document.createElement("span");fallen.className="wp-tree-fallen-leaf";fallen.textContent=leaf.textContent;box.appendChild(fallen);leaf.remove();},180+index*70);
});
if(result.finalStage)setTimeout(()=>WordPuzzleEngine.finish(),1050);
else setTimeout(()=>this.render(result.state),1050);
};
},

family(x,d){
let selected=new Set();
x.innerHTML=`
<div class="wp-card">
<div class="wp-family-base">واژه پایه <strong>${d.base}</strong></div>
<div class="wp-family-help">${d.instruction}</div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-options"></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی</button>
</div>
</div>`;
const options=x.querySelector(".wp-options"),hintBox=x.querySelector(".wp-hint");
d.options.forEach((word,i)=>{
const b=document.createElement("button");
b.type="button";b.className="wp-option";b.textContent=word;
b.onclick=()=>{if(selected.has(i)){selected.delete(i);b.classList.remove("sel");}else{selected.add(i);b.classList.add("sel");}};
options.appendChild(b);
});
x.querySelector("[data-hint]").onclick=()=>this.hint(x,v=>{this.showToast("یکی از واژه‌های هم‌خانواده با «"+d.base+"» با این حرف آغاز می‌شود: "+v,false);});
x.querySelector("[data-check]").onclick=()=>this.afterSubmit(x,WordPuzzleEngine.submitFamily([...selected].map(i=>d.options[i])));
},

search(x,d,foundWords=[]){
const normalize=w=>WordPuzzleRepository.normalize(w);
let feedbackTimer=null,hintTimer=null,resultShowing=false;
x.innerHTML=`
<div class="wp-card wp-search-card">
<div class="wp-target-list"></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-selection wp-live-word" aria-live="polite" role="status"><strong>—</strong></div>
<div class="wp-grid wp-search-grid"></div>
</div>`;
const list=x.querySelector(".wp-target-list"),grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
const selection=x.querySelector(".wp-selection strong");
const liveWord=selection.parentElement;
const clearFeedback=()=>{
if(feedbackTimer){clearTimeout(feedbackTimer);feedbackTimer=null;}
if(hintTimer){clearTimeout(hintTimer);hintTimer=null;}
resultShowing=false;
selection.textContent="—";
liveWord.classList.remove("good","bad","visible");
hintBox.classList.remove("show");list.querySelectorAll(".wp-hint-target").forEach(span=>span.classList.remove("wp-hint-target"));
};
const paintWords=()=>{
list.innerHTML="";
d.words.forEach(w=>{
const span=document.createElement("span");
span.textContent=foundWords.includes(normalize(w))?"✓ "+WordPuzzleRepository.formatDisplay(w):WordPuzzleRepository.formatDisplay(w);
span.classList.toggle("wp-found",foundWords.includes(normalize(w)));
list.appendChild(span);
});
};
const updateProgress=()=>{
const progress=x.closest(".wp-shell")?.querySelector(".wp-progress strong");
if(progress)progress.textContent=foundWords.length+" از "+WordPuzzleEngine.state.total;
const score=x.closest(".wp-shell")?.querySelector(".wp-score strong");
if(score)score.textContent=Math.max(0,WordPuzzleEngine.state.score-(WordPuzzleEngine.state.hintPenalty||0));
};
paintWords();
this.createGrid(grid,d.grid);
// createGrid clears the grid contents, so attach the hint overlay after it renders.
grid.after(hintBox);
const path=this.bindDragPath(grid,selected=>{
if(selected.length){
const raw=WordPuzzlePathEngine.read(d.grid,selected)||"—";
// Show only the letters the learner selected; do not reveal a target word mid-drag.
selection.textContent=WordPuzzleRepository.formatDisplay(raw);
liveWord.classList.add("visible");
if(!resultShowing)liveWord.classList.remove("good","bad");
}else if(!resultShowing){selection.textContent="—";liveWord.classList.remove("visible");}
},{straightOnly:false,
foundPaths:(d.placements||[]).filter(item=>foundWords.includes(normalize(item.word))).map(item=>item.path).filter(Array.isArray),
onStart:()=>{clearFeedback();if(path)path.clear();},
onRelease:selected=>{
if(selected.length<2){if(path)path.clear();return;}
const result=WordPuzzleEngine.submitSearch(selected);
if(result.correct&&result.foundWord){
foundWords=WordPuzzleEngine.state.foundWords.slice();
path.markFound();
resultShowing=true;
selection.textContent="آفرین! «"+WordPuzzleRepository.formatDisplay(result.foundWord)+"» پیدا شد.";
liveWord.classList.add("visible","good");
liveWord.classList.remove("bad");
paintWords();updateProgress();
feedbackTimer=setTimeout(()=>{resultShowing=false;selection.textContent="—";liveWord.classList.remove("visible","good","bad");feedbackTimer=null;},1800);
return;
}
resultShowing=true;
selection.textContent=result.duplicate?"این واژه قبلاً پیدا شده است.":"این واژه در فهرست نیست.";
liveWord.classList.add("visible","bad");
liveWord.classList.remove("good");
path.showError();
feedbackTimer=setTimeout(()=>{resultShowing=false;path.clear();selection.textContent="—";liveWord.classList.remove("visible","good","bad");feedbackTimer=null;},1800);
}
});
const hintButton=x.closest(".wp-shell")?.querySelector(".wp-search-hint");
hintButton.onclick=()=>{
clearFeedback();
const result=WordPuzzleEngine.hint();
if(!result){this.showToast("همه واژه‌ها پیدا شده‌اند.",true);return;}
if(result.type==="limit"){
this.showToast("برای این واژه، دو بخش از مسیر راهنما نمایش داده شده‌اند. واژه بعدی را پیدا کن.",false);
return;
}
if(result.type==="path"){
path.highlight(result.value);
// Keep the hint neutral: highlight path cells only, never the matching target label.
this.showToast("راهنما: خانه‌های روشن‌شده بخشی از مسیر یک واژه را نشان می‌دهند. ۲ امتیاز کسر شد.",false);
updateProgress();
}else if(result.type==="cell"){
path.highlight(result.value);
this.showToast("از خانه مشخص‌شده شروع کن.",false);
}
};
},

lpath(x,d){
x.innerHTML=`
<div class="wp-card wp-lpath-card">
<div class="wp-lpath-word">راهنما: <strong>${d.clue||"واژه را در مسیر L شکل پیدا کن."}</strong></div>
<div class="wp-grid wp-l-grid"></div>
<div class="wp-hint" aria-live="polite"></div>
<div class="wp-selection wp-live-word" aria-live="polite" role="status">مسیر انتخاب‌شده: <strong>—</strong></div>
<div class="wp-actions">
<button type="button" class="wp-btn wp-secondary" data-clear>پاک کردن مسیر</button>
<button type="button" class="wp-btn wp-hint-btn" data-hint>راهنما 💡</button>
<button type="button" class="wp-btn" data-check>بررسی مسیر</button>
</div>
</div>`;
const grid=x.querySelector(".wp-grid"),hintBox=x.querySelector(".wp-hint");
const liveWord=x.querySelector(".wp-selection"),selection=liveWord.querySelector("strong");
this.createGrid(grid,d.grid);
grid.after(hintBox);
const path=this.bindDragPath(grid,selected=>{
selection.textContent=WordPuzzlePathEngine.read(d.grid,selected)||"—";
liveWord.classList.remove("good","bad");
},{onStart:()=>{
path.clear();
selection.textContent="—";
hintBox.classList.remove("show");
liveWord.classList.remove("good","bad");
},onRelease:selected=>{
if(selected.length<3){if(selected.length) this.feedback(x,"مسیر را با کشیدن انگشت یا موس کامل کن.",false);return;}
if(!WordPuzzlePathEngine.isL(selected)){
liveWord.classList.add("bad");
this.feedback(x,"این مسیر هنوز شکل L ندارد؛ فقط یک بار جهت حرکت را عوض کن.",false);
path.showError();
return;
}
const value=WordPuzzlePathEngine.read(d.grid,selected);
const normalize=w=>WordPuzzleRepository.normalize(w);
if(normalize(value)!==normalize(d.word)&&normalize([...value].reverse().join(""))!==normalize(d.word)){
liveWord.classList.add("bad");
this.feedback(x,"این مسیر L شکل است، اما واژهٔ هدف را نمی‌سازد. دوباره تلاش کن.",false);
path.showError();
return;
}
liveWord.classList.add("good");
this.afterSubmit(x,WordPuzzleEngine.submitL(selected));
}});
x.querySelector("[data-clear]").onclick=()=>{
path.clear();selection.textContent="—";liveWord.classList.remove("good","bad");hintBox.classList.remove("show");
};
x.querySelector("[data-hint]").onclick=()=>this.hint(x,(value,type)=>{
if(type==="cell"){path.highlight(value);this.showToast("راهنما: از خانهٔ روشن‌شده شروع کن و واژه را با یک پیچ ۹۰ درجه‌ای به شکل L کامل کن.",false);}
else this.showToast("حرف راهنما: "+value,false);
});
x.querySelector("[data-check]").onclick=()=>{
const selected=path.getPath();
if(selected.length<3){this.feedback(x,"مسیر L شکل را با کشیدن انگشت یا موس کامل کن.",false);return;}
if(!WordPuzzlePathEngine.isL(selected)){this.feedback(x,"مسیر باید دقیقاً یک پیچ داشته باشد و شکل L بسازد.",false);path.showError();return;}
const value=WordPuzzlePathEngine.read(d.grid,selected),normalize=w=>WordPuzzleRepository.normalize(w);
if(normalize(value)!==normalize(d.word)&&normalize([...value].reverse().join(""))!==normalize(d.word)){
this.feedback(x,"واژه درست نیست؛ مسیر را پاک کن و دوباره تلاش کن.",false);path.showError();return;
}
this.afterSubmit(x,WordPuzzleEngine.submitL(selected));
};
}
};
WordPuzzleScreen.init();
