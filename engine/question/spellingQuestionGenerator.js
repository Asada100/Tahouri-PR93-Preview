// =====================================
// Tahouri Edu Platform
// Spelling Question Generator
// Version 1.3
// =====================================
(function (window) {
    "use strict";
    const DEFAULT_DIFFICULTY="level-2";
    function normalize(value){return String(value==null?"":value).replace(/ي/g,"ی").replace(/ى/g,"ی").replace(/ك/g,"ک").replace(/ۀ/g,"ه").replace(/ة/g,"ه").replace(/[\u064B-\u065F\u0670]/g,"").trim();}
    function ruleLetters(ruleId){if(!ruleId||!window.SpellingRules||typeof window.SpellingRules.getLetters!=="function")return[];return window.SpellingRules.getLetters(ruleId);}
    function findTargetIndex(answer,ruleId,explicitIndex){const chars=Array.from(answer);if(Number.isInteger(explicitIndex)&&explicitIndex>=0&&explicitIndex<chars.length)return explicitIndex;const letters=ruleLetters(ruleId);if(!letters.length)return-1;return chars.findIndex(function(c){return letters.indexOf(c)!==-1;});}
    function makeMasked(answer,index,length){const chars=Array.from(answer);return chars.slice(0,index).join("")+"...."+chars.slice(index+length).join("");}
    function buildTarget(item,difficulty){const answer=normalize(item.answer);if(!answer)return null;const rule=item.spellingRule||null,index=findTargetIndex(answer,rule,Number.isInteger(item.targetIndex)?item.targetIndex:null);if(index<0)return null;const length=Math.max(1,Number(item.targetLength)||1),chars=Array.from(answer);if(index+length>chars.length)return null;return{id:item.id||null,answer:answer,masked:item.masked||makeMasked(answer,index,length),missing:[{start:index,length:length,answer:chars.slice(index,index+length).join("")}],allowedLetters:Array.isArray(item.allowedLetters)&&item.allowedLetters.length?item.allowedLetters.slice():ruleLetters(rule),spellingRule:rule,lesson:item.lesson||null,difficulty:item.difficulty||difficulty};}
    function getPerformanceRecords(performance){if(!performance)return[];if(Array.isArray(performance))return performance;if(Array.isArray(performance.targetAnswers)&&performance.targetAnswers.length)return performance.targetAnswers;if(Array.isArray(performance.records))return performance.records;if(Array.isArray(performance.answers))return performance.answers;return[];}
    const SpellingQuestionGenerator={version:"1.3",
        rankByPerformance:function(items,performance){
            if (window.SpellingSmartQuestionSelector &&
                typeof window.SpellingSmartQuestionSelector.select === "function") {
                return window.SpellingSmartQuestionSelector.select(items, performance);
            }
            return items.slice();
        },
        generate:function(config){const source=config||{},difficulty=source.difficulty||DEFAULT_DIFFICULTY,bank=Array.isArray(source.wordBank)?source.wordBank:[],rules=Array.isArray(source.rules)&&source.rules.length?source.rules:null,limit=Math.max(0,Number(source.limit)||bank.length);
            const candidates=bank.filter(function(item){return item&&typeof item.answer==="string"&&(!rules||rules.indexOf(item.spellingRule)!==-1);}).map(function(item){return buildTarget(item,difficulty);}).filter(Boolean);
            const targets=this.rankByPerformance(candidates,source.performance).slice(0,limit);if(!targets.length)return[];const grouped=[];
            targets.forEach(function(target){const item=bank.find(function(x){return x&&x.answer&&normalize(x.answer)===target.answer;})||{};if(item.contextTemplate){let q=grouped.find(function(x){return x.contextTemplate===item.contextTemplate;});if(!q){q={id:item.questionId||"generated-context-"+(grouped.length+1),mode:"context",contextTemplate:item.contextTemplate,targets:[],lesson:item.lesson||source.lesson||null,prompt:source.prompt||source.instruction||"املای کلمات را با توجه به جمله کامل کن."};grouped.push(q);}q.targets.push(target);}else grouped.push({id:target.id||"generated-spelling-"+(grouped.length+1),mode:"missing-letter",prompt:source.instruction||"املای کلمه را کامل کن.",answer:target.answer,masked:target.masked,missing:target.missing,allowedLetters:target.allowedLetters,spellingRule:target.spellingRule,lesson:target.lesson});});
            return grouped;
        }
    };
    window.SpellingQuestionGenerator=SpellingQuestionGenerator;
})(window);
console.log("Spelling Question Generator v1.3 Ready");
