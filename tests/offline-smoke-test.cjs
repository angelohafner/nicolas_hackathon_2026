// Node-based functional checks without a browser or external dependencies.
const fs=require('fs');const vm=require('vm');const path=require('path');const src=fs.readFileSync(path.join(__dirname,'..','offline-app.js'),'utf8');
let root={innerHTML:''};let shell={className:''};
const document={
 getElementById:(id)=>id==='app-root'?root:id==='app-shell'?shell:id==='offline-stars'?{getContext:()=>null}:null,
 addEventListener:()=>{},createElement:()=>({click(){},remove(){}}),body:{appendChild:()=>{}}
};
const window={scrollTo(){},addEventListener(){},devicePixelRatio:1,innerWidth:1440,innerHeight:900};
const sandbox=vm.createContext({document,window,console,Math,Intl,Number,String,Array,Object,JSON,Date,Set,Map,Boolean});
vm.runInContext(src,sandbox,{filename:'offline-app.js'});
function evaluate(s){return vm.runInContext(s,sandbox);}
function assert(ok,msg){if(!ok)throw Error(msg);console.log('PASS',msg);}
assert(root.innerHTML.includes('LUNAR ODYSSEY'),'intro shows game title');
assert(evaluate('checklist().approved')===true,'healthy ship can launch');
assert(evaluate('checklist({...IDEAL_SHIP,totalMassKg:28000}).approved')===false,'overweight blocks launch');
assert(evaluate('checklist({...IDEAL_SHIP,batteryChargePercent:0}).approved')===false,'empty battery blocks launch');
assert(evaluate('checklist({...IDEAL_SHIP,heatShieldInstalled:false}).approved')===false,'missing heat shield blocks launch');
assert(evaluate('checklist({...IDEAL_SHIP,totalMassKg:23500}).approved')===true,'four green + one amber authorizes launch');
assert(evaluate('checklist({...IDEAL_SHIP,antennaActive:false}).approved')===true,'noncritical antenna red does not veto when four are green');
for(const [s,t] of [['hangar','Condições da nave'],['checklist','CHECKLIST / CML 4'],['flight','SIMULAÇÃO DIDÁTICA'],['debrief','Relatório']]){
 evaluate(`state.screen='${s}';`);if(s==='flight'||s==='debrief'){evaluate('state.flight=startFlight();advance();advance();advance();');}
 evaluate('render()');assert(root.innerHTML.includes(t),`${s} view renders`);
}
let r=evaluate('report()');assert(r.crewSafe,'default mission returns crew safely');assert(r.scienceTransmittedMb>250,'scientific data transmitted');assert(r.score===1000,'ideal mission score is 1000');
assert(r.medals.every(m=>m.earned),'ideal mission earns 4 medals');
assert(r.history.length===3,'history includes 3 phases');
assert(r.scienceBufferedMb===0,'radio transfers all science after return');
evaluate('state.flight=startFlight();state.flight.ship.reentryAngleDeg=8;advance();advance();advance();');
r=evaluate('report()');assert(!r.crewSafe,'unsafe reentry fails');assert(!r.medals[0].earned,'no safe-return medal if reentry fails');
evaluate('state.ship={...IDEAL_SHIP,antennaActive:false};state.flight=startFlight();advance();advance();advance();');r=evaluate('report()');assert(r.scienceTransmittedMb===0&&r.scienceBufferedMb===r.scienceCollectedMb,'antenna outage retains science in buffer');
console.log('ALL OFFLINE FUNCTIONAL CHECKS PASSED');
