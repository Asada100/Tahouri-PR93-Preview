window.WordPuzzlePathEngine={
directions:[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]],
valid(grid,path){
if(!Array.isArray(path)||!path.length)return false;
const used=new Set();
for(let i=0;i<path.length;i++){
const p=path[i];
if(!Array.isArray(p)||p.length!==2)return false;
const r=Number(p[0]),c=Number(p[1]);
if(!Number.isInteger(r)||!Number.isInteger(c)||!grid?.[r]||grid[r][c]===undefined)return false;
const key=r+","+c;
if(used.has(key))return false;
used.add(key);
if(i){
const dr=r-path[i-1][0],dc=c-path[i-1][1];
if(Math.max(Math.abs(dr),Math.abs(dc))!==1)return false;
if(dr===0&&dc===0)return false;
}
}
return true;
},
read(grid,path){return path.map(p=>grid?.[p[0]]?.[p[1]]||"").join("");},
straight(path){
if(!Array.isArray(path)||path.length<2)return false;
const dr=path[1][0]-path[0][0],dc=path[1][1]-path[0][1];
for(let i=2;i<path.length;i++){
if(path[i][0]-path[i-1][0]!==dr||path[i][1]-path[i-1][1]!==dc)return false;
}
return dr!==0||dc!==0;
},
isL(path){
if(!Array.isArray(path)||path.length<3)return false;
let turns=0,last=null;
for(let i=1;i<path.length;i++){
const dr=path[i][0]-path[i-1][0],dc=path[i][1]-path[i-1][1];
const axis=(dr===0&&dc!==0)?"h":(dc===0&&dr!==0?"v":null);
if(!axis)return false;
if(last&&axis!==last)turns++;
last=axis;
}
return turns===1;
}
};