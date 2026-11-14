/*
 * Artemis II: Lunar Odyssey / Nicolas / Phase 1 mission-director v3.
 * Child 2 owns engineering rules and canonical state in the integrated game.
 * A clearly labeled local demo adapter is used only while the team engine is absent.
 * All comments are in English. NASA terminology is educational, not operational.
 */
  const clone = value => JSON.parse(JSON.stringify(value));
  const usd = value => '$' + fmt(value);
  const mandatorySlots = ['tank','solar','shield','antenna','camera'];
  const parts = {
    tank: [
      { id:'standard',name:'Standard tank',mass:2200,cost:2400000,deltaV:3200 },
      { id:'extended',name:'Extended tank',mass:3350,cost:3450000,deltaV:4100 }
    ],
    solar: [
      { id:'standard',name:'Standard solar arrays',mass:650,cost:700000,watts:120 },
      { id:'efficient',name:'High-efficiency arrays',mass:780,cost:1500000,watts:180 }
    ],
    shield: [
      { id:'basic',name:'Basic thermal shield',mass:940,cost:820000 },
      { id:'avcoat',name:'Reinforced AVCOAT shield',mass:1130,cost:1450000 },
      { id:'none',name:'NO HEAT SHIELD (fault test)',mass:0,cost:0 }
    ],
    antenna: [
      { id:'sband',name:'S-band radio',mass:180,cost:300000 },
      { id:'kalaser',name:'High-throughput Ka/laser (game)',mass:240,cost:920000 },
      { id:'none',name:'NO ANTENNA (fault test)',mass:0,cost:0 }
    ],
    camera: [
      { id:'lunar',name:'Lunar science camera',mass:110,cost:360000 },
      { id:'none',name:'NO SCIENCE CAMERA (fault test)',mass:0,cost:0 }
    ]
  };
  const program = Object.freeze({
    maxMassKg:26500,budgetUsd:12000000,baseMassKg:17800,baseCostUsd:3700000,
    batteryCapacityWh:1600,bufferCapacityMb:800,powerLoadWatts:90,
    eclipseDurationHours:6,eclipseLoadWatts:105,postEclipseReserveWh:240,
    departureBurnTargetMps:480,departureToleranceMps:20,
    minimumNextPhaseDeltaVMps:1700
  });
  function findPart(slot,id) { return parts[slot]?.find(item=>item.id===id); }
  // Record the exact engineering state authorized by the Flight Director.
  // An assembly/resource change cannot reuse that authorization for a new burn.
  function approvalFingerprint(m) {
    return JSON.stringify([m.configuration.parts,m.engineering,m.resources,m.safety]);
  }
  function authoritativeDemoChecklist(m) {
    const e=m.engineering,r=m.resources,s=m.safety;
    const eclipseRequired=e.eclipseDurationHours*e.eclipseLoadWatts+e.postEclipseReserveWh;
    const after=r.maneuverReserveMps-e.departureBurnTargetMps;
    const items=[
      {id:'mass',critical:true,status:e.totalMassKg>e.maxMassKg?'red':'green'},
      {id:'energy',critical:true,status:r.batteryCurrentWh<eclipseRequired||e.netPowerWatts<=0?'red':r.batteryCurrentWh<eclipseRequired*1.15?'yellow':'green'},
      {id:'shield',critical:true,status:!s.heatShieldInstalled||r.shieldHealthPercent<=0?'red':r.shieldHealthPercent<60?'yellow':'green'},
      {id:'antenna',critical:false,status:s.antennaActive?'green':'red'},
      {id:'fuel',critical:true,status:after<e.minimumNextPhaseDeltaVMps?'red':after<e.minimumNextPhaseDeltaVMps+200?'yellow':'green'}
    ];
    const greens=items.filter(item=>item.status==='green').length;
    const criticalReds=items.filter(item=>item.critical&&item.status==='red').length;
    return {items,greens,criticalReds,approved:greens>=4&&criticalReds===0&&evaluateV3(m).eligible};
  }
  function revokeDemoApproval(m,why) {
    if(m.launchApproval){
      m.history.push({id:`revoke-${m.history.length+1}`,phase:1,type:'approval-revoked',description:why});
      m.launchApproval=null;
      m.liftoffConfirmed=false;
    }
  }
  class DemoPhase1Engine {
    constructor() {
      this.state = {
        schemaVersion:'artemis-mission-state/1',phase:1,step:'assembly',mode:'SIMULATED',
        learningMode:state.tips,
        configuration:{parts:{tank:'standard',solar:'standard',shield:'basic',antenna:'sband',camera:'lunar'}},
        engineering:{...program},
        resources:{maneuverReserveMps:3200,batteryCurrentWh:1376,batteryCapacityWh:1600,
          shieldHealthPercent:100,bufferCurrentMb:0,bufferCapacityMb:800,
          scienceCollectedMb:0,scienceTransmittedMb:0,scienceLostMb:0},
        safety:{crewSafe:true,essentialSystemsWorking:true},
        environment:{sunlit:true,communicationAvailable:true},
        history:[],completedPhases:[],departureReceipt:null,launchApproval:null,liftoffConfirmed:false
      };
      this.calculate();
    }
    calculate() {
      const m=this.state, ids=m.configuration.parts;
      let mass=program.baseMassKg,cost=program.baseCostUsd;
      for(const slot of mandatorySlots){const p=findPart(slot,ids[slot]);if(p){mass+=p.mass;cost+=p.cost;}}
      const solar=findPart('solar',ids.solar),tank=findPart('tank',ids.tank);
      m.engineering.totalMassKg=mass;
      m.engineering.budgetSpentUsd=cost;
      m.engineering.budgetRemainingUsd=m.engineering.budgetUsd-cost;
      m.engineering.generationWatts=solar?.watts||0;
      m.engineering.consumptionWatts=program.powerLoadWatts;
      m.engineering.netPowerWatts=m.engineering.generationWatts-m.engineering.consumptionWatts;
      m.engineering.deltaVCapacityMps=tank?.deltaV||0;
      if(!m.departureReceipt)m.resources.maneuverReserveMps=tank?.deltaV||0;
      m.safety.heatShieldInstalled=ids.shield!=='none';
      m.safety.antennaActive=ids.antenna!=='none';
      return clone(m);
    }
    getState(){return clone(this.state);}
    selectComponent(slot,id){
      if(this.state.departureReceipt)throw new Error('Spacecraft components cannot be changed after departure.');
      if(!mandatorySlots.includes(slot)||!findPart(slot,id))throw new TypeError('Unknown spacecraft component.');
      const previous=this.state.configuration.parts[slot];
      if(previous!==id)revokeDemoApproval(this.state,'Approved configuration was changed; a fresh checklist is required.');
      this.state.configuration.parts[slot]=id;
      if(previous!==id)this.state.history.push({id:`component-${this.state.history.length+1}`,phase:1,type:'configuration-choice',slot,from:previous,to:id,description:`Changed ${slot} from ${previous} to ${id}.`});
      this.state.step='assembly';
      return this.calculate();
    }
    simulateFault(kind){
      if(this.state.departureReceipt)throw new Error('Cannot inject a fault after departure.');
      if(kind!=='reset')revokeDemoApproval(this.state,'Engineering data changed after the previous approval.');
      if(kind==='energy')this.state.resources.batteryCurrentWh=160;
      if(kind==='caution')this.state.resources.batteryCurrentWh=950;
      if(kind==='budget')this.state.engineering.budgetUsd=6800000;
      if(kind==='reset')return this.reset();
      return this.calculate();
    }
    evaluateConfiguration(){return evaluateV3(this.state);}
    recordChecklistApproval({id,checklist,acknowledged}){
      if(this.state.phase!==1||this.state.departureReceipt)throw new Error('Phase 1 authorization is no longer available.');
      const current=authoritativeDemoChecklist(this.state);
      if(!current.approved||!checklist?.approved||!Array.isArray(checklist.items)||checklist.items.length!==5)
        throw new Error('Checklist approval does not meet current Phase 1 requirements.');
      const matched=current.items.every((item,index)=>checklist.items[index]?.id===item.id&&
        checklist.items[index]?.status===item.status&&checklist.items[index]?.critical===item.critical);
      if(!matched||current.greens!==checklist.greens||current.criticalReds!==checklist.criticalReds)
        throw new Error('Checklist results changed; run a new diagnostic scan.');
      const cautions=current.items.filter(item=>item.status==='yellow'||(item.status==='red'&&!item.critical));
      if(cautions.some(item=>acknowledged?.[item.id]!==true))
        throw new Error('Every yellow or noncritical-red finding must be acknowledged.');
      const fingerprint=approvalFingerprint(this.state);
      if(this.state.launchApproval?.fingerprint===fingerprint)return this.getState();
      this.state.launchApproval={id,fingerprint,acknowledged:clone(acknowledged||{}),greenCount:current.greens};
      this.state.history.push({id:`${id}-${this.state.history.length+1}`,phase:1,type:'checklist-approved',description:'Five-system readiness approved by Flight Director.',
        greenCount:current.greens,criticalRedCount:current.criticalReds,acknowledged:clone(acknowledged||{})});
      this.state.step='authorized';return this.getState();
    }
    confirmLiftoff(){
      if(this.state.liftoffConfirmed)return this.getState();
      if(this.state.phase!==1||!this.state.launchApproval||
          this.state.launchApproval.fingerprint!==approvalFingerprint(this.state)||this.state.step!=='authorized')
        throw new Error('Liftoff requires a current Flight Director approval.');
      this.state.liftoffConfirmed=true;
      this.state.step='departure-ready';
      this.state.history.push({id:`liftoff-${this.state.history.length+1}`,phase:1,type:'liftoff',description:'Terminal countdown completed and liftoff confirmed.'});
      return this.getState();
    }
    previewDepartureBurn(action){return previewBurn(this.state,action);}
    commitDepartureBurn(action){
      if(this.state.departureReceipt){
        if(this.state.departureReceipt.actionId===action.actionId)return this.getState();
        throw new Error('The departure burn has already been applied.');
      }
      if(this.state.phase!==1||!this.state.liftoffConfirmed||this.state.step!=='departure-ready'||
         !this.state.launchApproval||this.state.launchApproval.fingerprint!==approvalFingerprint(this.state))
        throw new Error('Departure burn requires liftoff and a current approved checklist.');
      const check=previewBurn(this.state,action);
      if(!check.allowed)throw new Error(check.reason);
      const before=this.state.resources.maneuverReserveMps;
      this.state.resources.maneuverReserveMps=check.afterDeltaVMps;
      this.state.departureReceipt={actionId:action.actionId,usedDeltaVMps:check.requestedDeltaVMps,
        beforeDeltaVMps:before,afterDeltaVMps:check.afterDeltaVMps,
        time:new Date().toISOString()};
      this.state.history.push({id:action.actionId,phase:1,type:'departure-burn',
        description:'Guided translunar departure burn committed exactly once.',
        deltaVBeforeMps:before,deltaVSpentMps:check.requestedDeltaVMps,
        deltaVAfterMps:check.afterDeltaVMps});
      this.state.step='burn-complete';
      return this.getState();
    }
    completePhase1(action){
      if(this.state.phase===2&&this.state.completedPhases.includes(1))return this.getState();
      if(this.state.phase!==1||!this.state.departureReceipt||this.state.step!=='burn-complete')
        throw new Error('The guided departure burn must finish before Phase 1 completion.');
      if(!this.state.liftoffConfirmed||!this.state.launchApproval||
         !this.state.history.some(event=>event.type==='checklist-approved'))
        throw new Error('A complete Flight Director clearance and liftoff record are required.');
      if(!evaluateV3(this.state).eligible||
         this.state.resources.maneuverReserveMps<this.state.engineering.minimumNextPhaseDeltaVMps)
        throw new Error('Mission resource gates must remain valid after the departure burn.');
      if(!this.state.completedPhases.includes(1)){
        this.state.completedPhases.push(1);
        this.state.history.push({id:action.actionId,phase:1,type:'phase-complete',
          description:'Checklist approved, risks acknowledged, departure complete.',
          maneuverReserveMps:this.state.resources.maneuverReserveMps});
      }
      this.state.phase=2;
      this.state.step='lunar-handoff';
      return this.getState();
    }
  }
  // Replace the unsupported reset helper with a deterministic constructor refresh.
  DemoPhase1Engine.prototype.reset = function(){const next=new DemoPhase1Engine();this.state=next.state;return this.getState();};

  function evaluateV3(m){
    const e=m.engineering,r=m.resources,p=m.configuration.parts;
    const missing=mandatorySlots.filter(slot=>!p?.[slot] || p[slot]==='none');
    const eclipseRequiredWh=e.eclipseDurationHours*e.eclipseLoadWatts+e.postEclipseReserveWh;
    const remainingAfterBurn=m.departureReceipt?r.maneuverReserveMps:r.maneuverReserveMps-e.departureBurnTargetMps;
    const gates=[
      {id:'components',ok:missing.length===0,label:'Mandatory components',detail:missing.length?'Missing: '+missing.join(', '):'All five component categories selected'},
      {id:'budget',ok:e.budgetRemainingUsd>=0,label:'Mission budget',detail:`${usd(e.budgetRemainingUsd)} remaining`},
      {id:'mass',ok:e.totalMassKg<=e.maxMassKg,label:'Game mass ceiling',detail:`${fmt(e.totalMassKg)} / ${fmt(e.maxMassKg)} kg (single hard ceiling)`},
      {id:'eclipse',ok:r.batteryCurrentWh>=eclipseRequiredWh && e.netPowerWatts>0,label:'Eclipse energy survival',detail:`${fmt(r.batteryCurrentWh)} Wh available · ${fmt(eclipseRequiredWh)} Wh required, including reserve`},
      {id:'maneuver',ok:remainingAfterBurn>=e.minimumNextPhaseDeltaVMps,label:'Reserve after departure burn',detail:`${fmt(remainingAfterBurn)} m/s forecast · minimum ${fmt(e.minimumNextPhaseDeltaVMps)} m/s`}
    ];
    return {eligible:gates.every(g=>g.ok),gates,eclipseRequiredWh,afterBurnDeltaVMps:remainingAfterBurn};
  }
  function previewBurn(m,action){
    const burn=Number(action?.requestedDeltaVMps);
    const e=m.engineering,r=m.resources;
    if(!Number.isFinite(burn)||burn<=0)return {allowed:false,reason:'Burn must be a positive finite delta-v.'};
    const remaining=r.maneuverReserveMps-burn;
    const onTarget=Math.abs(burn-e.departureBurnTargetMps)<=e.departureToleranceMps;
    const eligible=onTarget&&remaining>=e.minimumNextPhaseDeltaVMps&&evaluateV3(m).eligible&&
      m.phase===1&&!m.departureReceipt&&m.liftoffConfirmed&&m.step==='departure-ready'&&
      m.launchApproval?.fingerprint===approvalFingerprint(m);
    return {allowed:eligible,requestedDeltaVMps:burn,afterDeltaVMps:remaining,
      reason:!onTarget?'Align the guided burn with the target corridor.':
        remaining<e.minimumNextPhaseDeltaVMps?'Insufficient reserve for the lunar mission.':
        !evaluateV3(m).eligible?'Phase 1 safety gates are not satisfied.':
        !m.liftoffConfirmed||m.step!=='departure-ready'?'Flight Director clearance and liftoff are required before the burn.':
        m.launchApproval?.fingerprint!==approvalFingerprint(m)?'Spacecraft data changed after authorization.':'Burn is within the educational target corridor.'};
  }

  const demoEngine=new DemoPhase1Engine();
  const v3={engine:demoEngine,connected:false,
    acknowledged:{},checkpoint:null,previewBurnMps:program.departureBurnTargetMps,
    burnStatus:'idle',burnProgress:0,burnConfirmed:false,actionCounter:0,
    departureActionId:null,phaseCompleteActionId:null,completion:null,configFingerprint:'',
    error:null, official:null};
  state.v3=v3;
  function engineSnapshot(){
    const snapshot=v3.engine.getState();
    if(!snapshot || !snapshot.configuration?.parts || !snapshot.resources || !snapshot.engineering ||
       !snapshot.safety || !Array.isArray(snapshot.history)||!Array.isArray(snapshot.completedPhases))
      throw new TypeError('Team engine must return a complete canonical mission state.');
    const e=snapshot.engineering,r=snapshot.resources,s=snapshot.safety;
    const bounded=(value,label,min=0,max=1e12)=>{
      if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
        throw new RangeError(`Invalid canonical mission value: ${label}`);
    };
    for(const slot of mandatorySlots){
      if(typeof snapshot.configuration.parts[slot]!=='string'||!snapshot.configuration.parts[slot].trim())
        throw new TypeError(`Missing canonical component identifier: ${slot}`);
    }
    if(e.maxMassKg!==26500)throw new RangeError('The game uses one fixed mass ceiling of 26,500 kg.');
    bounded(e.totalMassKg,'total mass',1);
    bounded(e.budgetUsd,'original budget');bounded(e.budgetSpentUsd,'spent budget');
    bounded(e.budgetRemainingUsd,'remaining budget',-1e12);
    if(Math.abs(e.budgetRemainingUsd-(e.budgetUsd-e.budgetSpentUsd))>0.01)
      throw new RangeError('Canonical budget totals are inconsistent.');
    bounded(e.generationWatts,'solar generation');bounded(e.consumptionWatts,'power consumption');
    bounded(e.netPowerWatts,'net power',-1e12);
    bounded(e.eclipseDurationHours,'eclipse duration');bounded(e.eclipseLoadWatts,'eclipse load');
    bounded(e.postEclipseReserveWh,'post-eclipse reserve');
    bounded(e.departureBurnTargetMps,'departure target',0.001);
    bounded(e.departureToleranceMps,'departure tolerance');
    bounded(e.minimumNextPhaseDeltaVMps,'next-phase maneuver reserve');
    bounded(r.maneuverReserveMps,'current maneuver reserve');
    bounded(r.batteryCapacityWh,'battery capacity',0.001);
    bounded(r.batteryCurrentWh,'battery current',0,r.batteryCapacityWh);
    bounded(r.bufferCapacityMb,'buffer capacity',0.001);
    bounded(r.bufferCurrentMb,'buffer current',0,r.bufferCapacityMb);
    bounded(r.scienceCollectedMb,'science collected');bounded(r.scienceTransmittedMb,'science transmitted');
    bounded(r.scienceLostMb,'science lost');bounded(r.shieldHealthPercent,'shield health',0,100);
    if(Math.abs(r.scienceCollectedMb-r.scienceTransmittedMb-r.bufferCurrentMb-r.scienceLostMb)>0.01)
      throw new RangeError('Science data must remain buffered, transmitted, or lost.');
    for(const key of ['crewSafe','essentialSystemsWorking','heatShieldInstalled','antennaActive']){
      if(typeof s[key]!=='boolean')throw new TypeError(`Invalid canonical safety flag: ${key}`);
    }
    if(![1,2,3].includes(snapshot.phase)||!snapshot.completedPhases.every(x=>[1,2,3].includes(x))||
       new Set(snapshot.completedPhases).size!==snapshot.completedPhases.length)
      throw new RangeError('Invalid canonical campaign phase.');
    if(snapshot.phase>=2&&!snapshot.completedPhases.includes(1)||
       snapshot.phase>=3&&!snapshot.completedPhases.includes(2))
      throw new RangeError('The preceding campaign phase must be recorded before advancing.');
    if(snapshot.history.filter(event=>event.type==='departure-burn').length>1)
      throw new RangeError('A departure maneuver must be applied only once.');
    if(snapshot.phase===1&&snapshot.departureReceipt){
      const t=snapshot.departureReceipt;
      bounded(t.beforeDeltaVMps,'departure reserve before burn');
      bounded(t.usedDeltaVMps,'departure burn debit',0.001);
      bounded(t.afterDeltaVMps,'departure reserve after burn');
      if(Math.abs(t.beforeDeltaVMps-t.usedDeltaVMps-t.afterDeltaVMps)>0.01||
         Math.abs(t.afterDeltaVMps-r.maneuverReserveMps)>0.01)
        throw new RangeError('Departure burn receipt does not match current maneuver reserve.');
    }
    return snapshot;
  }
  function syncFromEngine(){
    const m=engineSnapshot(),e=m.engineering,r=m.resources,s=m.safety||{};
    if(!Number.isFinite(e.totalMassKg)||!Number.isFinite(e.budgetSpentUsd)||!Number.isFinite(r.maneuverReserveMps))
      throw new TypeError('Team engine returned invalid engineering values.');
    v3.official=clone(m);
    state.ship={...state.ship,
      totalMassKg:e.totalMassKg,
      powerBalanceWatts:e.netPowerWatts,
      batteryChargePercent:r.batteryCapacityWh>0?100*r.batteryCurrentWh/r.batteryCapacityWh:0,
      heatShieldInstalled:s.heatShieldInstalled===true,
      antennaActive:s.antennaActive===true,
      heatShieldHealthPercent:r.shieldHealthPercent,
      fuelRemainingDeltaV:r.maneuverReserveMps,
      scienceDataCollectedMb:r.scienceCollectedMb,
      scienceDataTransmittedMb:r.scienceTransmittedMb};
    v3.configFingerprint=JSON.stringify([m.configuration,e.totalMassKg,e.budgetRemainingUsd,
      e.eclipseDurationHours,e.eclipseLoadWatts,e.postEclipseReserveWh,e.departureBurnTargetMps,
      e.minimumNextPhaseDeltaVMps,r.maneuverReserveMps,r.batteryCurrentWh,r.batteryCapacityWh,
      r.shieldHealthPercent,s.heatShieldInstalled,s.antennaActive]);
    return m;
  }
  function phase1Gates(){
    if(v3.connected){
      const result=v3.engine.evaluatePhase1();
      if(!result||typeof result.eligible!=='boolean'||!Array.isArray(result.gates))throw new TypeError('Invalid team readiness evaluation.');
      return result;
    }
    return evaluateV3(v3.official || syncFromEngine());
  }
  function v3RecordChecklistApproved(){
    const d=diagnostics();
    if(!d.result?.approved||!phase1Gates().eligible||!phase1WarningsAcknowledged())throw new Error('Checklist cannot be approved until risks and gates are satisfied.');
    v3.engine.recordChecklistApproval({id:'phase1-checklist-approved',checklist:clone(d.result),acknowledged:clone(v3.acknowledged)});
    syncFromEngine();
  }
  function v3Warnings(){
    const scan=diagnostics();
    if(scan.status!=='complete' || !scan.result)return [];
    return scan.result.items.filter(item=>item.status==='yellow'||(item.status==='red'&&!item.critical));
  }
  function phase1WarningsAcknowledged(){
    return v3Warnings().every(item=>v3.acknowledged[item.id]===true);
  }
  const oldChecklist=checklist;
  checklist=function(ship=state.ship){
    const original=oldChecklist(ship), e=v3.official?.engineering, r=v3.official?.resources;
    if(!e||!r)return original;
    if(v3.connected){
      const authoritative=v3.engine.evaluatePhase1();
      if(!authoritative?.checklist||authoritative.checklist.items?.length!==5)throw new TypeError('Team engine must provide five official checklist results.');
      const items=authoritative.checklist.items.map((x,index)=>({
        ...original.items[index],id:x.id||original.items[index].id,
        status:x.status,critical:!!x.critical,
        label:x.label||original.items[index].label,
        value:x.value||original.items[index].value,
        detail:x.detail||original.items[index].detail
      }));
      if(items.some(i=>!['green','yellow','red'].includes(i.status)))throw new TypeError('Invalid team checklist light.');
      const greens=items.filter(i=>i.status==='green').length;
      const criticalReds=items.filter(i=>i.critical&&i.status==='red').length;
      return {items,greens,criticalReds,gates:phase1Gates().gates,approved:greens>=4&&criticalReds===0&&phase1Gates().eligible};
    }
    const mass=original.items[0];
    mass.status=ship.totalMassKg>e.maxMassKg?'red':'green';
    mass.critical=true;
    mass.detail=mass.status==='red'?'Above the fixed 26,500 kg game ceiling.':'Within the single 26,500 kg game ceiling; do not subtract another 15%.';
    mass.tip='The 26,500 kg value is already the game ceiling. It is not a NASA vehicle qualification limit.';
    const electricity=original.items[1];
    const eclipse=e.eclipseDurationHours*e.eclipseLoadWatts+e.postEclipseReserveWh;
    electricity.status=r.batteryCurrentWh<eclipse||e.netPowerWatts<=0?'red':r.batteryCurrentWh<eclipse*1.15?'yellow':'green';
    electricity.critical=true;
    electricity.value=`${fmt(r.batteryCurrentWh)} Wh / ${fmt(eclipse)} Wh required`;
    electricity.detail=electricity.status==='red'?'Insufficient battery energy for the planned eclipse plus reserve, or no positive net power.':
      electricity.status==='yellow'?'Eclipse survival is possible with limited battery margin.':'Battery can support the planned eclipse and post-eclipse reserve.';
    electricity.tip='Positive sunlight generation alone is not enough. Check current energy (Wh), eclipse consumption and required reserve.';
    const maneuver=original.items[4];
    const after=r.maneuverReserveMps-e.departureBurnTargetMps;
    maneuver.status=after<e.minimumNextPhaseDeltaVMps?'red':after<e.minimumNextPhaseDeltaVMps+200?'yellow':'green';
    maneuver.value=`${fmt(r.maneuverReserveMps)} m/s → ${fmt(after)} m/s after burn`;
    maneuver.detail=maneuver.status==='red'?'Not enough delta-v after the initial burn to continue.':
      maneuver.status==='yellow'?'Remaining delta-v reaches the minimum with little margin.':'Post-burn maneuver reserve is adequate for Phase 2.';
    maneuver.tip='Delta-v (m/s) is remaining maneuvering capability; do not present it as physical propellant mass.';
    original.greens=original.items.filter(x=>x.status==='green').length;
    original.criticalReds=original.items.filter(x=>x.critical&&x.status==='red').length;
    original.gates=phase1Gates().gates;
    original.approved=original.greens>=4&&original.criticalReds===0&&phase1Gates().eligible;
    return original;
  };
  const oldBrief=brief;
  brief=function(){
    const html=oldBrief();
    return html.replace('START MISSION','START PHASE 1')
      .replace('Checkout and departure','Assembly, readiness and departure')
      .replace('Flight Director Insight','Flight Director Insight');
  };
  const v3Selector=(slot,label)=>{
    const id=v3.official.configuration.parts[slot];
    return `<label class="v3-part-control"><span>${escape(label)}</span>
      <select data-v3-slot="${slot}" aria-label="${escape(label)}" ${v3.connected?'disabled':''}>${parts[slot].map(p=>
        `<option value="${p.id}" ${p.id===id?'selected':''}>${escape(p.name)}</option>`).join('')}</select></label>`;
  };
  function phase1Telemetry(){
    const m=v3.official,e=m.engineering,r=m.resources,assessment=phase1Gates();
    return `<div class="v3-metrics-grid">
      ${metric('TOTAL MASS',`${fmt(e.totalMassKg)} kg`,`Fixed limit: ${fmt(e.maxMassKg)} kg`)}
      ${metric('BUDGET LEFT',usd(e.budgetRemainingUsd),`Spent: ${usd(e.budgetSpentUsd)}`,'mint')}
      ${metric('SOLAR / NET POWER',`${fmt(e.generationWatts)} / ${fmt(e.netPowerWatts)} W`,'Generation / net available','amber')}
      ${metric('BATTERY CURRENT',`${fmt(r.batteryCurrentWh)} Wh`,`Capacity: ${fmt(r.batteryCapacityWh)} Wh`)}
      ${metric('DATA BUFFER',`${fmt(r.bufferCurrentMb)} MB`,`Capacity: ${fmt(r.bufferCapacityMb)} MB`,'violet')}
      ${metric('MANEUVER Δv',`${fmt(r.maneuverReserveMps)} m/s`,`Post-burn: ${fmt(assessment.afterBurnDeltaVMps)} m/s`,'amber')}
    </div>`;
  }
  hangar=function(){
    const m=v3.official,g=phase1Gates();
    return `<main class="page flow-page hangar-page v3-page" data-phase1-stage="assembly">
      <div class="flow-heading"><div>${eyebrow('PHASE 1 / MISSION DIRECTOR')}<h1>Prepare <span>Orion.</span></h1>
        <p>Choose a viable configuration, review the resources, then request the Flight Director's readiness scan.</p></div>
        <span class="label-demo">${v3.connected?'TEAM ENGINE CONNECTED':'DEMO COMPONENT ADAPTER'}</span></div>
      <div class="v3-stepper"><b>01 BRIEFING</b><b class="v3-current">02 ASSEMBLY</b><b>03 DIAGNOSTICS</b><b>04 DEPARTURE BURN</b><b>05 HANDOFF</b></div>
      ${v3.error?`<div class="integration-error" role="alert">${escape(v3.error)}</div>`:''}
      <div class="flow-grid hangar-grid"><section class="glass-panel config-panel">
        <div class="panel-heading"><span class="panel-heading-icon">${icon('sliders',20)}</span><div>
          <h2>Spacecraft components</h2><p>${v3.connected?'Read-only view. Teammates provide configuration updates through their own controls.':'Demo controls represent the future component selectors owned by the 3D spacecraft designer.'}</p></div></div>
        <div class="v3-part-list">${v3Selector('tank','Propellant tank')}${v3Selector('solar','Solar arrays')}${v3Selector('shield','Thermal shield')}${v3Selector('antenna','Communications antenna')}${v3Selector('camera','Science camera')}</div>
        <div class="v3-assembly-graphic" aria-label="Stylized two-dimensional spacecraft preview, not the team 3D model" role="img">
          <span class="v3-capsule">ORION</span><span class="v3-solar-wing v3-wing-a"></span><span class="v3-solar-wing v3-wing-b"></span><span class="v3-solar-wing v3-wing-c"></span><span class="v3-solar-wing v3-wing-d"></span>
          <span class="v3-assembly-label">${escape(m.configuration.parts.solar==='efficient'?'HIGH EFFICIENCY':'STANDARD ARRAYS')} · ${escape(m.configuration.parts.shield==='avcoat'?'REINFORCED SHIELD':'BASIC SHIELD')}</span></div>
        <div class="v3-config-actions"><button class="button button--subtle" data-action="v3-reset-demo" ${v3.connected?'disabled':''}>${icon('reset',16)} RESTORE SAFE DEMO</button>
          <button class="button button--subtle" data-action="v3-energy-caution" ${v3.connected?'disabled':''}>${icon('warning',16)} TEST YELLOW CAUTION</button>
          <button class="button button--subtle" data-action="v3-low-energy" ${v3.connected?'disabled':''}>${icon('warning',16)} TEST ECLIPSE FAILURE</button>
          <button class="button button--subtle" data-action="v3-budget-fault" ${v3.connected?'disabled':''}>${icon('warning',16)} TEST BUDGET FAILURE</button></div>
        <div class="flow-note">${v3.connected?'The shared team engine owns calculations and state.':'Offline demonstration: catalog prices and engineering values are illustrative, not certified NASA data or the final Child 2 catalog.'}</div>
      </section><aside class="glass-panel hangar-aside"><div class="panel-heading"><span class="panel-heading-icon">${icon('activity',19)}</span>
        <div><h2>Live mission resources</h2><p>Capacity and current quantity are different values.</p></div></div>
        ${phase1Telemetry()}
        <div class="v3-gates"><h3>Configuration gates</h3>${g.gates.map(row=>`<div class="v3-gate ${row.ok?'v3-gate--ok':'v3-gate--fail'}"><span>${icon(row.ok?'check':'warning',17)} ${escape(row.label)}</span><small>${escape(row.detail)}</small></div>`).join('')}</div>
      </aside></div>
      <div class="flow-actions"><button class="button button--text" data-action="to-briefing">${icon('back',17)} BACK TO BRIEFING</button>
        <button class="button button--primary" data-action="to-checklist">OPEN FLIGHT READINESS CHECKLIST ${icon('arrow',17)}</button></div>
    </main>`;
  };
  const oldLaunchChecklist=launchChecklist;
  launchChecklist=function(){
    let html=oldLaunchChecklist();
    const check=phase1Gates();
    const d=diagnostics();
    const cautions=v3Warnings();
    const ackNeeded=cautions.filter(item=>!v3.acknowledged[item.id]);
    const isPassed=check.eligible;
    const gateMarkup=`<section class="glass-panel v3-checklist-extension" aria-label="Additional Phase 1 safety gates">
      <div class="panel-heading"><span class="panel-heading-icon">${icon('shield',18)}</span><div><h2>Additional Phase 1 authorization gates</h2><p>Budget, mandatory parts, eclipse survival and post-burn reserve must also be valid.</p></div></div>
      <div class="v3-gate-grid">${check.gates.map(x=>`<div class="v3-gate ${x.ok?'v3-gate--ok':'v3-gate--fail'}" data-gate="${x.id}"><span>${icon(x.ok?'check':'warning',16)} ${escape(x.label)} <strong>${x.ok?'PASS':'BLOCKED'}</strong></span><small>${escape(x.detail)}</small></div>`).join('')}</div>
      ${cautions.length?`<div class="v3-risk-ack"><h3>${icon('warning',17)} Flight Director risk review</h3><p>Yellow findings and noncritical red findings require explicit acknowledgment. This does not override a critical red or any other safety gate.</p>
        ${cautions.map(x=>`<label class="v3-ack-row"><input type="checkbox" data-v3-ack="${escape(x.id)}" ${v3.acknowledged[x.id]?'checked':''} ${d.status==='countdown'?'disabled':''}/>
          <span><strong>ACKNOWLEDGE ${x.status.toUpperCase()} · ${escape(x.label)}</strong><small>${escape(x.detail)}</small></span></label>`).join('')}
        ${ackNeeded.length?`<p class="v3-ack-warning">${ackNeeded.length} unacknowledged risk(s) · authorization remains locked.</p>`:'<p class="v3-ack-success">Risk review complete. You may authorize if all other requirements pass.</p>'}</div>`:''}
      ${!isPassed?'<p class="v3-ack-warning">Required engineering gates are not satisfied. Change the configuration before authorization.</p>':''}
      <p class="v3-disclaimer">Mass limit: exactly 26,500 kg as the single game ceiling. No second 15% deduction. “CML 4” is an educational label, not NASA launch authorization.</p>
    </section>`;
    html=html.replace('<div class="checklist-footnote">',gateMarkup+'<div class="checklist-footnote">');
    html=html.replace('GREEN / PASS','GREEN / PASS');
    html=html.replace('The terminal countdown will begin at T−10 seconds.','After countdown, the guided departure burn must still be completed.');
    html=html.replace(/recommended 15% margin/g,'game ceiling');
    if(!isPassed||!phase1WarningsAcknowledged()){
      html=html.replace(/<button class="button button--primary button--launch" data-action="start-countdown"(.*?)>/,
        (whole,attrs)=>`<button class="button button--primary button--launch" data-action="start-countdown"${attrs.includes('disabled')?attrs:attrs+' disabled'}>`);
      html=html.replace('GO FOR LAUNCH','REVIEW REQUIRED');
    }
    return html;
  };
  const oldGoto=goto;
  const oldRender=render;
  steps.splice(0,steps.length,['briefing','BRIEF'],['hangar','BUILD'],['checklist','CHECK'],['departure','BURN'],['handoff','HANDOFF'],['flight','DEMO'],['debrief','REPORT']);
  footer=function(){return `<footer class="app-footer"><div>MISSION CONTROL / NICOLAS</div><div>PHASE 1 · VERSION 3.1 · EN-US</div><div>EDUCATIONAL GAME · NOT NASA SOFTWARE</div></footer>`;};
  function burnDisplay(){
    const m=v3.official,e=m.engineering,r=m.resources;
    const committed=v3.burnStatus==='complete'||v3.burnStatus==='running';
    const preview=committed?{allowed:true,afterDeltaVMps:m.departureReceipt.afterDeltaVMps,reason:'Previously committed'}:
      v3.engine.previewDepartureBurn({requestedDeltaVMps:v3.previewBurnMps});
    const caption=committed?'BURN COMMAND COMMITTED':v3.burnConfirmed?'GUIDANCE CONFIRMED':'REVIEW GUIDANCE';
    return `<main class="page flow-page v3-page v3-burn-page" data-phase1-stage="departure">
      <div class="flow-heading"><div>${eyebrow('PHASE 1 / GUIDED DEPARTURE MANEUVER')}<h1>Translunar <span>departure burn.</span></h1><p>Mission Control has authorized liftoff. Now execute the guided departure maneuver and preserve reserve for the lunar journey.</p></div>
      <span class="top-status top-status--${v3.burnStatus==='complete'?'go':'no-go'}"><span class="top-status-dot"></span>${caption}</span></div>
      <div class="v3-stepper"><b>01 BRIEFING</b><b>02 ASSEMBLY</b><b>03 DIAGNOSTICS</b><b class="v3-current">04 DEPARTURE BURN</b><b>05 HANDOFF</b></div>
      <div class="flow-grid hangar-grid"><section class="glass-panel v3-burn-primary"><div class="panel-heading"><span class="panel-heading-icon">${icon('rocket',19)}</span><div><h2>Flight Director burn guidance</h2><p>Engineering approval comes from the shared rules engine. The command can be applied only once.</p></div></div>
        <div class="v3-burn-visual" role="img" aria-label="Departure burn progress visualization at ${v3.burnProgress} percent"><div class="v3-ship-icon">${icon('rocket',65)}</div>
          <span class="v3-burn-trail" style="width:${v3.burnProgress}%"></span><span class="v3-burn-progress">${v3.burnProgress}% · ${escape(v3.burnStatus.toUpperCase())}</span></div>
        <div class="v3-burn-guidance"><div><span>Target Δv</span><strong>${fmt(e.departureBurnTargetMps)} m/s</strong></div><div><span>Permitted demo tolerance</span><strong>±${fmt(e.departureToleranceMps)} m/s</strong></div><div><span>Available before command</span><strong>${fmt(committed?m.departureReceipt.beforeDeltaVMps:r.maneuverReserveMps)} m/s</strong></div></div>
        <label class="v3-burn-slider">Choose the guided Δv command <strong id="v3-burn-value">${fmt(v3.previewBurnMps)} m/s</strong>
          <input data-v3-burn-range type="range" min="380" max="600" step="10" value="${v3.previewBurnMps}" ${committed?'disabled':''}/></label>
        <div class="v3-burn-preview ${preview.allowed||committed?'v3-burn-preview--pass':'v3-burn-preview--fail'}" id="v3-burn-preview">
          ${icon(preview.allowed||committed?'check':'warning',18)} ${escape(committed?'Burn applied exactly once.':preview.reason)}
          <strong>Forecast after burn: ${fmt(committed?m.departureReceipt.afterDeltaVMps:preview.afterDeltaVMps)} m/s</strong></div>
        ${!committed?`<label class="v3-ack-row"><input type="checkbox" data-v3-burn-confirm ${v3.burnConfirmed?'checked':''}/><span>
          <strong>I CONFIRM THE GUIDED DEPARTURE MANEUVER</strong><small>Executing the burn will permanently consume the requested maneuvering reserve for this campaign.</small></span></label>
          <button class="button button--primary v3-burn-button" data-action="v3-execute-burn" ${v3.burnConfirmed&&preview.allowed?'':'disabled'}>${icon('rocket',20)} EXECUTE GUIDED DEPARTURE BURN</button>`:
          v3.burnStatus==='running'?`<button class="button button--primary" disabled>MANEUVER IN PROGRESS · DO NOT INTERRUPT</button>`:
          `<div class="v3-burn-complete">${icon('check',21)} BURN COMPLETE · ${fmt(m.departureReceipt.usedDeltaVMps)} m/s consumed</div>
          <button class="button button--primary v3-burn-button" data-action="v3-complete-phase1">CONFIRM PHASE 1 COMPLETION ${icon('arrow',18)}</button>`}
      </section><aside class="glass-panel v3-burn-aside"><div class="panel-heading"><span class="panel-heading-icon">${icon('activity',18)}</span><div><h2>Live maneuver resources</h2><p>Never reset values at a phase boundary.</p></div></div>
        ${metric('CURRENT MANEUVER RESERVE',`${fmt(r.maneuverReserveMps)} m/s`,'Δv remaining','amber')}
        ${metric('REQUIRED FOR PHASE 2',`${fmt(e.minimumNextPhaseDeltaVMps)} m/s`,'Minimum game reserve')}
        ${metric('CURRENT BATTERY',`${fmt(r.batteryCurrentWh)} Wh`,'Not automatically recharged')}
        ${metric('BUFFER OCCUPIED',`${fmt(r.bufferCurrentMb)} MB`,'Data is not cleared at phase boundaries','violet')}
        ${tip('Mission Director note','The burn is committed by the Child 2 engineering engine. This user interface never calculates or subtracts propellant independently when the real team engine is connected.')}
      </aside></div><p class="flow-note">Physics and flight values in DEMO mode are educational. No solar storm, lunar exploration or reentry mini-game is implemented here.</p>
    </main>`;
  }
  function handoffDisplay(){
    const m=v3.completion||v3.official,r=m.resources,e=m.engineering,receipt=m.departureReceipt;
    return `<main class="page flow-page v3-page v3-handoff-page" data-phase1-stage="complete"><div class="flow-heading">
      <div>${eyebrow('PHASE 1 / COMPLETION VERIFIED')}<h1>Orion is <span>Moon-bound.</span></h1><p>The launch checklist was approved, departure burn completed and the official campaign state was handed off without resetting resources.</p></div>
      <span class="top-status top-status--go"><span class="top-status-dot"></span>PHASE 1 COMPLETE</span></div>
      <div class="v3-stepper"><b>01 BRIEFING</b><b>02 ASSEMBLY</b><b>03 DIAGNOSTICS</b><b>04 DEPARTURE BURN</b><b class="v3-current">05 HANDOFF</b></div>
      <div class="glass-panel v3-handoff-hero"><div>${icon('check',44)}</div><h2>Departure command confirmed</h2>
        <p>${fmt(receipt.usedDeltaVMps)} m/s of maneuvering Δv was consumed exactly once.</p>
        <p>Phase 2 receives the same spacecraft configuration, budget, current battery, shield health, buffer data, history, and remaining maneuver reserve.</p></div>
      <div class="v3-metrics-grid v3-handoff-metrics">
        ${metric('Δv REMAINING',`${fmt(r.maneuverReserveMps)} m/s`,'Official post-burn value','amber')}
        ${metric('BATTERY',`${fmt(r.batteryCurrentWh)} Wh`,`Capacity: ${fmt(r.batteryCapacityWh)} Wh`)}
        ${metric('MASS',`${fmt(e.totalMassKg)} kg`,'Configuration preserved')}
        ${metric('BUDGET REMAINING',usd(e.budgetRemainingUsd),'Mission funds','mint')}
        ${metric('BUFFER',`${fmt(r.bufferCurrentMb)} MB`,'Science data remains onboard','violet')}
        ${metric('SHIELD HEALTH',`${fmt(r.shieldHealthPercent)}%`,'Carried into Phase 2')}
      </div>
      <div class="v3-handoff-actions"><button class="button button--outline" data-action="v3-export-handoff">${icon('download',18)} EXPORT PHASE 2 HANDOFF JSON</button>
        ${v3.connected?`<span class="v3-team-handoff">TEAM ENGINE CONNECTED · Await the Child 3 Phase 2 scene.</span>`:
          `<button class="button button--primary" data-action="v3-continue-demo">CONTINUE EDUCATIONAL DEMO ${icon('arrow',18)}</button>`}
      </div><p class="flow-note">The Phase 2 / 3 demo is a placeholder only; it is not the other teammates' implementation. A new campaign restarts all resource values together.</p>
    </main>`;
  }
  render=function(){
    if(state.screen==='departure'||state.screen==='handoff'){
      document.getElementById('app-root').innerHTML=header()+`<div class="page-wrapper">${state.screen==='departure'?burnDisplay():handoffDisplay()}</div>`+footer();
      const shell=document.getElementById('app-shell');
      shell.className='app-shell app-shell--'+state.screen;
      shell.dataset.visualScene=state.screen==='departure'?'earth':'moon';
      shell.dataset.activeMissionScene=state.screen==='departure'?'departure-maneuver':'handoff-to-lunar';
      ensureCaptions();
      return;
    }
    oldRender();
  };
  goto=function(screen){
    if(screen==='departure'||screen==='handoff'){
      if(screen==='departure'){
        try{
          if(!v3.connected)v3.engine.confirmLiftoff();
          else if(typeof v3.engine.recordLiftoff==='function')v3.engine.recordLiftoff({actionId:'phase1-liftoff'});
          syncFromEngine();
        }catch(error){v3.error=error.message;render();return;}
      }
      speech.stop();state.screen=screen;state.expanded=null;render();window.scrollTo({top:0,behavior:'instant'});
      speech.say(screen==='departure'? 'Flight Director, liftoff confirmed. The guided translunar departure burn is now ready for review.':
        'Flight Director, Phase One complete. The departure maneuver is verified. Mission state is ready for the lunar flight team.',
        {scene:screen==='departure'?'departure-maneuver':'handoff-to-lunar'});
    }else oldGoto(screen);
  };
  // Protect the new flow against a stale launch approval or a repeated burn.
  const oldSpeechCountdown=clearanceAnnouncement;
  clearanceAnnouncement=function(result,forCountdown=false){
    const caution=result.items.filter(x=>x.status==='yellow'||(x.status==='red'&&!x.critical));
    if(caution.length)return forCountdown
      ? 'Flight Director, four green stations meet the educational launch requirements. All listed cautions have been acknowledged. We are go with caution. Beginning terminal countdown.'
      : 'Flight Director, diagnostics finished. Review the highlighted cautions and acknowledge each risk before launch authorization.';
    return oldSpeechCountdown(result,forCountdown);
  };
  // Replace original countdown completion with the Phase 1 departure stage.
  // The original countdown uses this lexical callable; its decision is enhanced by the checklist override and the scan's signature.

  function resetV3(){
    if(v3.connected){v3.error='An integrated campaign must be restarted through the team engine.';render();return;}
    v3.engine=demoEngine;demoEngine.reset();v3.completion=null;v3.acknowledged={};
    v3.burnStatus='idle';v3.burnProgress=0;v3.burnConfirmed=false;v3.departureActionId=null;v3.phaseCompleteActionId=null;
    v3.error=null;v3.previewBurnMps=program.departureBurnTargetMps;v3.actionCounter=0;
    syncFromEngine();invalidateDiagnostics();state.flight=null;state.ui.validationError=null;
    state.ui.resultsExpanded=false;state.ui.scoreAnimated=false;
  }
  // Never allow a legacy UI-only reset to partially reset a connected team's canonical state.
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset?.action;
    if(action==='reset'&&v3.connected){
      event.stopImmediatePropagation();event.preventDefault();
      v3.error='Use the team engine resetCampaign() to restart the complete campaign; local-only reset is disabled.';
      render();
    }
  },true);
  // Existing demo reset buttons run their legacy handler first; then refresh the canonical demo engine.
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
    const action=el.dataset.action;
    if(action==='reset'){resetV3();goto('briefing');return;}
    if(action==='v3-reset-demo'){resetV3();render();speech.say('Nominal demo spacecraft configuration restored.');}
    if(action==='v3-low-energy'||action==='v3-energy-caution'||action==='v3-budget-fault'){
      try{v3.engine.simulateFault(action==='v3-low-energy'?'energy':action==='v3-energy-caution'?'caution':'budget');syncFromEngine();v3.acknowledged={};invalidateDiagnostics();render();
        speech.say('Warning. Engineering safety constraints are no longer satisfied.');}
      catch(e){v3.error=e.message;render();}
    }
    if(action==='v3-execute-burn'){
      if(v3.burnStatus!=='idle'||!v3.burnConfirmed||v3.completion||state.screen!=='departure')return;
      const m=v3.official;const preview=v3.engine.previewDepartureBurn({requestedDeltaVMps:v3.previewBurnMps});
      if(!preview.allowed){v3.error=preview.reason;render();return;}
      const id=v3.departureActionId||`phase1-departure-${++v3.actionCounter}`;
      try{
        v3.engine.commitDepartureBurn({actionId:id,requestedDeltaVMps:v3.previewBurnMps});
        v3.departureActionId=id;const updated=syncFromEngine();v3.burnStatus='running';v3.burnProgress=0;
        state.ui.validationError=null;render();
        // Start the visible engine-burn progress while Mission Control describes the active burn.
        // The completion announcement waits for BOTH the visual maneuver and its narration.
        let visualDone=false,voiceDone=false;
        const finish=()=>{
          if(!visualDone||!voiceDone||v3.burnStatus!=='running'||state.screen!=='departure')return;
          v3.burnStatus='complete';render();
          speech.say(`Departure burn complete. ${fmt(updated.departureReceipt.usedDeltaVMps)} meters per second consumed. Remaining maneuver reserve: ${fmt(updated.resources.maneuverReserveMps)} meters per second.`,{scene:'departure-maneuver'});
        };
        speech.say('Departure burn command accepted. Maneuver underway. Monitor the remaining delta-v reserve.',{
          scene:'departure-maneuver',onDone:()=>{voiceDone=true;finish();}
        });
        const step=()=>{
          if(v3.burnStatus!=='running'||state.screen!=='departure')return;
          v3.burnProgress=Math.min(100,v3.burnProgress+20);render();
          if(v3.burnProgress<100)queue(step,300);
          else {visualDone=true;finish();}
        };
        queue(step,160);
      }catch(e){v3.error=e.message;render();speech.say('Burn rejected. '+e.message);}
    }
    if(action==='v3-complete-phase1'){
      if(v3.burnStatus!=='complete'||v3.completion)return;
      try{
        const id=v3.phaseCompleteActionId||`phase1-completion-${++v3.actionCounter}`;
        v3.phaseCompleteActionId=id;
        const complete=v3.engine.completePhase1({actionId:id});
        v3.completion=clone(complete);syncFromEngine();
        state.flight={phaseIndex:1,ship:clone(state.ship),history:[{
          phase:1,title:'Launch and guided departure complete',
          description:'Checklist passed; caution was acknowledged; departure burn committed exactly once.',
          collectedMb:state.ship.scienceDataCollectedMb,
          transmittedMb:state.ship.scienceDataTransmittedMb,
          fuelSpentDeltaV:complete.departureReceipt.usedDeltaVMps,batterySpentPercent:0}]};
        if(v3.connected&&typeof v3.engine.onPhase1Complete==='function')v3.engine.onPhase1Complete(clone(complete));
        goto('handoff');
      }catch(e){v3.error=e.message;render();}
    }
    if(action==='v3-continue-demo'){
      if(v3.connected||!v3.completion)return;
      goto('flight');
    }
    if(action==='v3-export-handoff'){
      if(!v3.completion)return;
      const blob=new Blob([JSON.stringify(v3.completion,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='artemis-ii-phase1-handoff-en-us.json';
      document.body.appendChild(a);a.click();a.remove();queue(()=>URL.revokeObjectURL(url),500);
    }
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.dataset?.key==='tips'){
      if(!v3.connected)demoEngine.state.learningMode=el.checked;
      else if(typeof v3.engine.setLearningMode==='function')v3.engine.setLearningMode(el.checked);
      syncFromEngine();
    }
    if(el.matches('[data-v3-slot]')){
      if(v3.connected||v3.completion)return;
      try{
        v3.engine.selectComponent(el.dataset.v3Slot,el.value);syncFromEngine();
        v3.error=null;v3.acknowledged={};invalidateDiagnostics();render();
        speech.say(`Spacecraft ${el.dataset.v3Slot} updated. Mission mass, budget, and resources recalculated by the demo engineering adapter.`);
      }catch(e){v3.error=e.message;render();}
    }
    if(el.matches('[data-v3-ack]')){
      if(diagnostics().status!=='complete')return;
      v3.acknowledged[el.dataset.v3Ack]=el.checked;
      render();
      speech.say(el.checked?'Risk acknowledged by Flight Director.':'Risk acknowledgement withdrawn. Launch clearance is locked.');
    }
    if(el.matches('[data-v3-burn-confirm]')){
      v3.burnConfirmed=el.checked;render();
      speech.say(el.checked?'Guided burn parameters acknowledged. Awaiting execute command.':'Burn confirmation withdrawn.');
    }
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.matches('[data-v3-burn-range]')&&v3.burnStatus==='idle'){
      v3.previewBurnMps=Number(el.value);v3.burnConfirmed=false;render();
    }
  });
  // Extend the existing API without changing its previous method names.
  const priorAPI=window.ArtemisNicolas;
  window.ArtemisNicolas=Object.freeze({
    ...priorAPI,
    getReadiness(){const r=priorAPI.getReadiness();return {...r,additionalGates:clone(phase1Gates()),
      risksAcknowledged:phase1WarningsAcknowledged(),
      authorized:r.approved&&phase1WarningsAcknowledged()&&diagnostics().status==='complete'&&diagnostics().signature===shipSignature(state.ship)};},
    setShipSnapshot(partial){
      if(v3.connected)throw new Error('Team engine owns spacecraft state; use refreshFromEngine().');
      if(demoEngine.state.departureReceipt||v3.completion)
        throw new Error('The spacecraft is already in flight. Resource changes must come from the single campaign engine.');
      const result=priorAPI.setShipSnapshot(partial);
      const e=demoEngine.state.engineering,r=demoEngine.state.resources;
      if(partial.totalMassKg!==undefined)e.totalMassKg=partial.totalMassKg;
      if(partial.powerBalanceWatts!==undefined)e.netPowerWatts=partial.powerBalanceWatts;
      if(partial.batteryChargePercent!==undefined)r.batteryCurrentWh=partial.batteryChargePercent*r.batteryCapacityWh/100;
      if(partial.fuelRemainingDeltaV!==undefined)r.maneuverReserveMps=partial.fuelRemainingDeltaV;
      if(partial.heatShieldInstalled!==undefined)demoEngine.state.safety.heatShieldInstalled=partial.heatShieldInstalled;
      if(partial.antennaActive!==undefined)demoEngine.state.safety.antennaActive=partial.antennaActive;
      revokeDemoApproval(demoEngine.state,'Engineering snapshot updated; previous clearance is invalid.');
      syncFromEngine();v3.acknowledged={};invalidateDiagnostics();render();return result;
    },
    setMissionResult(payload){
      if(!v3.completion)throw new Error('Phase 1 must be completed before a final mission result can be accepted.');
      if(!Array.isArray(payload?.history)||payload.history[0]?.phase!==1||payload.history[1]?.phase!==2||payload.history[2]?.phase!==3)
        throw new TypeError('Final result must contain sequential phases 1, 2, and 3.');
      if(payload.history[0]?.fuelSpentDeltaV!==v3.completion.departureReceipt.usedDeltaVMps)
        throw new Error('Final history does not match the committed Phase 1 departure burn.');
      if(v3.connected){
        const official=engineSnapshot();
        const r=official.resources;
        if(!official.completedPhases?.includes(3))
          throw new Error('The official campaign must complete Phase 3 before the debriefing can open.');
        for(const [label,reported,current] of [
          ['maneuver reserve',payload.ship?.fuelRemainingDeltaV,r.maneuverReserveMps],
          ['science collected',payload.ship?.scienceDataCollectedMb,r.scienceCollectedMb],
          ['science transmitted',payload.ship?.scienceDataTransmittedMb,r.scienceTransmittedMb],
          ['shield integrity',payload.ship?.heatShieldHealthPercent,r.shieldHealthPercent]
        ]){
          if(typeof reported!=='number'||!Number.isFinite(reported)||Math.abs(reported-current)>0.01)
            throw new Error(`Final ${label} must match the single official campaign state.`);
        }
        if(payload.ship?.crewSafe!==official.safety?.crewSafe)
          throw new Error('Final crew safety must match the official campaign result.');
      }
      priorAPI.setMissionResult(payload);
    }
  });
  window.ArtemisNicolasPhase1=Object.freeze({
    connectEngine(engine){
      if(v3.completion||v3.departureActionId||v3.burnStatus!=='idle'||
         demoEngine.state.launchApproval||demoEngine.state.departureReceipt)
        throw new Error('Connect the official mission engine before launch authorization, not during a live mission.');
      for(const method of ['getState','evaluatePhase1','previewDepartureBurn','recordChecklistApproval','commitDepartureBurn','completePhase1'])
        if(typeof engine?.[method]!=='function')throw new TypeError(`Team engine is missing ${method}().`);
      const prev=v3.engine;v3.engine=engine;v3.connected=true;
      try{syncFromEngine();}catch(e){v3.engine=prev;v3.connected=false;syncFromEngine();throw e;}
      v3.acknowledged={};v3.error=null;invalidateDiagnostics();render();
      return this.getMissionState();
    },
    refreshFromEngine(){syncFromEngine();v3.acknowledged={};invalidateDiagnostics('Team engineering state updated; a fresh diagnostic scan is required.');render();return this.getMissionState();},
    getMissionState(){return clone(v3.official);},
    getPhase1Handoff(){return v3.completion?clone(v3.completion):null;},
    getGuidedBurnPreview(deltaV=v3.previewBurnMps){if(v3.departureActionId)throw new Error('Departure burn already committed.');return clone(v3.engine.previewDepartureBurn({requestedDeltaVMps:deltaV}));},
    openPhase1(){goto('briefing');},
    getStatus(){return {connected:v3.connected,step:state.screen,phase1Complete:!!v3.completion,
      diagnosticStatus:diagnostics().status,burnStatus:v3.burnStatus,
      risksAcknowledged:phase1WarningsAcknowledged(),gates:clone(phase1Gates())};}
  });
  syncFromEngine();
  render();
