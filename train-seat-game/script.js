const faces=['character_gakusei_man_blazer_01_black','character_gakusei_woman_blazer_01_black','character_gakusei_man_blazer_02_brown','character_gakusei_woman_blazer_02_brown','character_gakusei_woman_sailor_01_white','character_gakusei_man_gakuran_02_gray','character_shakaijin_man_01_black_black','character_shakaijin_woman_01_black','character_shakaijin_man_02_gray_black','character_shakaijin_woman_02_gray','character_shakaijin_man_03_black_black','character_shakaijin_woman_03_black','character_shakaijin_man_silver_black','character_shakaijin_woman_04_gray','character_shakaijin_woman_05_black'];
const names=['はると','さくら','りく','みどり','けんじ','あおい','ゆう','ふみ','こはる','たくみ','もも','そうた','なぎ','ゆき','れん'];
function portrait(id){return `<img src="assets/dot-illust/${faces[id]}.png" alt="${names[id]}のドット絵" draggable="false">`}

const stagePassengers=[
  [0, 1],
  [2, 3, 4],
  [6, 7, 5],
  [8, 9, 12],
  [10, 11, 13],
  [14, 0, 1],
  [2, 3, 4, 5],
  [6, 7, 8, 9],
  [12, 13, 14],
  [10, 11, 0, 1],
  [4, 5, 8, 9],
  [6, 7, 12, 13],
  [10, 11, 1, 9]
];

const basePreferenceTypes=['coupler','door_end','middle','quiet','door_end','middle','friend','friend','coupler','door_end','friend','friend','coupler','middle','quiet'];
const preferenceCopy={
  stand_strap:['もうすぐ降りるから立っていたい','吊り革につかまりたい'],
  near_driver:['運転席の近くがいい','前の景色を見たい！'],
  side_north:['景色が見やすい上側の席がいい','上側の席に座りたい'],
  side_south:['日差しを避けたいから下側の席がいい','下側の席が落ち着く']
};

const stagePreferenceOverrides={
  0:{1:'stand_strap'},
  3:{12:'near_driver'},
  4:{13:'stand_strap'},
  5:{14:'side_south',0:'side_north'},
  6:{2:'near_driver'},
  7:{8:'stand_strap'},
  8:{12:['near_driver','side_south']},
  9:{1:['near_driver','side_north']},
  10:{4:['near_driver','stand_strap'],5:['side_north','middle'],8:'stand_strap'},
  11:{12:'near_driver',13:'stand_strap'},
  12:{1:['near_driver','side_north'],9:['side_south','door_end']}
};

const stages=[
  ['小倉駅','連結部付近か吊り革の立ち位置を探そう。','希望をすべてかなえる',2,2],
  ['平和通駅','前の駅のお客さんが乗っているよ。空き席を見極めよう。','希望をすべてかなえる',3,3],
  ['旦過駅','ゆうとふみは、お互いに相手の隣が希望だよ。','友だちの希望をかなえる',3,3],
  ['香春口三萩野駅','運転席近くや連結部の座席位置を見きわめよう。','座席位置の希望をかなえる',3,3],
  ['片野駅','ももとそうたが乗車！隣同士になれるベンチを探そう。','友だちの希望をかなえる',3,3],
  ['城野駅','上側・下側の希望に合わせて席を決めよう。','希望をすべてかなえる',3,3],
  ['北方駅','静かに一人で座りたい人のために隣を空けよう。','ひとり席を確保',4,4],
  ['競馬場前駅','ゆうとふみが再び乗車！立っていたい人は吊り革へ。','希望をすべてかなえる',4,4],
  ['守恒駅','複合条件が登場！「運転席近く＋下側」の席を探そう。','複合条件をクリア',3,3],
  ['徳力公団前駅','もも・そうたペアと、運転席近く＋上側の席を確保しよう。','希望をすべてかなえる',4,4],
  ['徳力嵐山口駅','運転席近くの吊り革や上側真ん中などピンポイント指定！','希望をすべてかなえる',4,4],
  ['志井駅','前の駅のお客さんの位置を避けつつ、ペア席を確保しよう。','友だち同士で隣席に',4,4],
  ['企救丘駅','終点まであと少し！全員の希望を100%かなえよう。','満足度 100%達成',4,4]
];

let stage=0,total=0,assigned={},lockedAssigned={},selected=null,tutorialDismissed=false,tutorialCurrentStep=null,tutorialCurrentTarget=null,isTraveling=false;
function passengerIds(){return stagePassengers[stage]}
const friendOf={6:7,7:6,10:11,11:10};
const slotData=[...Array.from({length:14},(_,id)=>({id,type:'seat',side:id<7?'north':'south',isNearDriver:[5,6].includes(id%7)})),...Array.from({length:4},(_,i)=>({id:14+i,type:'strap',side:'center',isNearDriver:i===3}))];
const slotById=Object.fromEntries(slotData.map(slot=>[slot.id,slot]));

function singlePrefText(type,id){
  if(type==='friend')return `友だちの${names[friendOf[id]]}さんのとなりがいい`;
  if(preferenceCopy[type])return preferenceCopy[type][id%preferenceCopy[type].length];
  return {coupler:'連結部に近い席がいい',door_end:'ドア横の端席がいい',middle:'真ん中の席がいい',quiet:'静かに一人で座りたい'}[type];
}

function preferenceFor(id){
  const raw=stagePreferenceOverrides[stage]?.[id]||basePreferenceTypes[id];
  const types=Array.isArray(raw)?raw:[raw];
  const text=types.map((t,idx)=>{
    const str=singlePrefText(t,id);
    return idx===0?str:str.replace(/がいい$|たい$\vert{}落ち着く$/,'');
  }).join(' ＋ ');
  return {types,text};
}

function areNeighbors(a,b){
  if(a===undefined||b===undefined||a>=14||b>=14)return false;
  let bankA=Math.floor(a/7),bankB=Math.floor(b/7),posA=a%7,posB=b%7;
  let groupA=posA<=1?0:posA<=4?1:2,groupB=posB<=1?0:posB<=4?1:2;
  return bankA===bankB&&groupA===groupB&&Math.abs(posA-posB)===1;
}

function positionTutorialBubble(){
  const bubble=document.getElementById('tutorialBubble');
  const target=document.querySelector('.tutorial-spotlight');
  if(!target)return;
  const rect=target.getBoundingClientRect();
  if(!bubble||bubble.hidden)return;
  const width=Math.min(420,window.innerWidth-28);
  const bubbleHeight=bubble.offsetHeight||106;
  const left=Math.max(14,Math.min(window.innerWidth-width-14,rect.left+(rect.width-width)/2));
  const top=Math.max(10,Math.min(window.innerHeight-bubbleHeight-10,rect.top-bubbleHeight-12));
  bubble.style.left=left+'px';
  bubble.style.top=top+'px';
}
window.addEventListener('scroll',positionTutorialBubble,{passive:true});
window.addEventListener('resize',positionTutorialBubble);

function updateTutorial(){
  const layer=document.getElementById('tutorialLayer');
  const bubble=document.getElementById('tutorialBubble');
  const stepLabel=document.getElementById('tutorialStep');
  const message=document.getElementById('tutorialMessage');
  document.querySelectorAll('.tutorial-spotlight').forEach(el=>el.classList.remove('tutorial-spotlight'));
  if(stage!==0||tutorialDismissed){
    layer.hidden=true;
    bubble.hidden=true;
    tutorialCurrentStep=null;
    tutorialCurrentTarget=null;
    return;
  }
  const ids=passengerIds();
  const assignedCount=Object.keys(assigned).length;
  let step,target,instruction;
  if(assignedCount>=ids.length){
    step=4;
    target=document.getElementById('next');
    instruction='全員そろったよ！『採点する』を押そう！';
  }else if(assignedCount===0&&selected===null){
    step=1;
    target=document.getElementById('passengers');
    instruction='まずは1人目の乗客をタップして選ぼう！';
  }else if(assignedCount===0){
    step=2;
    target=document.querySelector('.car-shell');
    instruction='希望を見て、車内の席か吊り革をタップしよう！';
  }else if(selected===null){
    step=3;
    target=document.getElementById('passengers');
    instruction='いい調子！もう1人の乗客も同じように配置しよう！';
  }else{
    step=3;
    target=document.querySelector('.car-shell');
    instruction='もう1人の希望に合わせて席か吊り革をタップしよう！';
  }
  stepLabel.textContent='STEP '+step+'/4：';
  message.textContent=instruction;
  layer.hidden=false;
  bubble.hidden=false;
  target.classList.add('tutorial-spotlight');
  if(tutorialCurrentStep!==step||tutorialCurrentTarget!==target){
    target.scrollIntoView({block:'center',behavior:'smooth'});
    tutorialCurrentStep=step;
    tutorialCurrentTarget=target;
  }
  positionTutorialBubble();
}

document.getElementById('tutorialClose').onclick=()=>{
  tutorialDismissed=true;
  updateTutorial();
};

const landscapeThemes=[
  {kind:'downtown',sky:'#bce6f0',ground:'#d8e5b0',palette:['#879eb2','#b9c4c7','#cf8f72']},
  {kind:'river',sky:'#c5e9ed',ground:'#cfdfab',palette:['#9cadb0','#c5aa7c','#d2c19a']},
  {kind:'road',sky:'#bde5ef',ground:'#c8d7a2',palette:['#a5b4b4','#d0cbbb','#8c9ca5']},
  {kind:'shops',sky:'#c5e9ec',ground:'#d6dfa9',palette:['#c49a7a','#9eafa6','#b6a57e']},
  {kind:'school',sky:'#c6e9ef',ground:'#bdd397',palette:['#d4c8a9','#8da3a3','#b89d78']},
  {kind:'open',sky:'#b8e4ef',ground:'#b6d391',palette:['#c8bd9b','#a8b7aa','#cfb27c']},
  {kind:'campus',sky:'#b8e4f0',ground:'#b5d394',palette:['#d1c7a5','#b9b29a','#849d8d']},
  {kind:'race',sky:'#bce7ef',ground:'#c0d49a',palette:['#c4c5b2','#b59d83','#a1b6ae']},
  {kind:'housing',sky:'#c3e8ed',ground:'#b9d294',palette:['#e6e4d7','#c9d0c7','#dad8ca']},
  {kind:'housingHills',sky:'#b8e3ef',ground:'#b5d18f',palette:['#e0ded2','#c7d0c4','#c6bca1']},
  {kind:'riverHills',sky:'#b7e1eb',ground:'#aeca86',palette:['#c8c7b7','#b8aa91','#95a99c']},
  {kind:'base',sky:'#b9e2eb',ground:'#9dbc78',palette:['#c8c6b3','#aab4a5','#969d8b']}
];
function landscapeSvg(index){
  const theme=landscapeThemes[Math.max(0,Math.min(11,index))];
  const parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">'];
  parts.push('<rect width="600" height="90" fill="'+theme.sky+'"/><rect y="62" width="600" height="28" fill="'+theme.ground+'"/>');
  if(['housingHills','riverHills','base'].includes(theme.kind)){
    parts.push('<path d="M0 58L60 38L108 54L174 29L242 56L318 33L386 57L454 30L524 55L600 34V70H0Z" fill="#779b71"/><path d="M0 62L80 45L145 64L238 41L304 64L390 43L470 62L550 42L600 53V72H0Z" fill="#9cba81"/>');
  }
  if(['river','riverHills'].includes(theme.kind))parts.push('<rect y="65" width="600" height="16" fill="#71bdca"/><path d="M0 70H600M0 77H600" stroke="#b7e4dd" stroke-width="2"/><path d="M90 65V54H500V65M120 54Q295 31 470 54" fill="none" stroke="#8e8775" stroke-width="5"/>');
  if(theme.kind==='road')parts.push('<rect y="68" width="600" height="20" fill="#747b72"/><path d="M0 78H600" stroke="#f5e8b5" stroke-width="2" stroke-dasharray="18 14"/>');
  const count=theme.kind==='open'?5:theme.kind.startsWith('housing')?9:7;
  for(let i=0;i<count;i++){
    const x=8+i*(580/count),h=theme.kind==='downtown'?(36+(i*17)%42):theme.kind.startsWith('housing')?34+(i*7)%17:24+(i*13)%30,w=theme.kind.startsWith('housing')?46:50+(i%2)*10;
    const y=(theme.kind==='road'?68:theme.kind==='river'||theme.kind==='riverHills'?64:66)-h,fill=theme.palette[i%theme.palette.length];
    parts.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="#657e79" stroke-width="1"/>');
    if(theme.kind==='downtown'&&i%3===0)parts.push('<rect x="'+(x+w/2-5)+'" y="'+(y-5)+'" width="10" height="5" fill="#778d98"/>');
    for(let row=0;row<Math.floor(h/10);row++)for(let col=0;col<3;col++)parts.push('<rect x="'+(x+7+col*12)+'" y="'+(y+6+row*9)+'" width="5" height="4" fill="#eaf1d7"/>');
    if(['shops','downtown','river'].includes(theme.kind))parts.push('<rect x="'+x+'" y="66" width="'+w+'" height="5" fill="'+(i%2?'#cf856e':'#e5bb70')+'"/>');
  }
  if(theme.kind==='downtown')parts.push('<path d="M0 65H600" stroke="#7a7163" stroke-width="4"/><path d="M24 48H180M185 48H280" stroke="#d86654" stroke-width="3"/>');
  if(['school','campus'].includes(theme.kind)){
    const x=theme.kind==='school'?250:235;
    parts.push('<rect x="'+x+'" y="33" width="124" height="34" fill="#e2d7ba" stroke="#71877c" stroke-width="2"/><path d="M'+(x-8)+' 34L'+(x+62)+' 18L'+(x+132)+' 34Z" fill="#a96859"/>');
    for(let w=x+10;w<x+115;w+=18)parts.push('<rect x="'+w+'" y="42" width="9" height="11" fill="#9bc6ca"/>');
    parts.push('<rect x="'+(x+54)+'" y="52" width="16" height="15" fill="#8a795e"/>');
  }
  if(theme.kind==='race'){
    parts.push('<path d="M175 62L195 35H474L506 62Z" fill="#9b9990" stroke="#657570" stroke-width="2"/><path d="M195 35L230 25H450L474 35" fill="none" stroke="#667b79" stroke-width="5"/>');
    for(let x=210;x<480;x+=24)parts.push('<rect x="'+x+'" y="42" width="12" height="13" fill="#e7e2c9"/>');
  }
  if(['open','school','campus','riverHills'].includes(theme.kind)){
    for(let x=35;x<600;x+=105)parts.push('<rect x="'+x+'" y="51" width="5" height="17" fill="#7c705d"/><rect x="'+(x-8)+'" y="42" width="21" height="12" fill="#63936f"/><rect x="'+(x-4)+'" y="35" width="13" height="9" fill="#76a17a"/>');
  }
  if(theme.kind==='base')parts.push('<rect y="73" width="600" height="17" fill="#8e927f"/><path d="M0 76H600M0 86H600M90 72L130 90M270 72L310 90M450 72L490 90" stroke="#555e57" stroke-width="3"/><path d="M40 72L95 62M140 72L195 62M260 72L315 62M380 72L435 62" stroke="#72796c" stroke-width="2"/>');
  parts.push('</svg>');
  return parts.join('');
}
function drawStationView(){
  const routeIndex=stage===0?0:Math.min(11,stage-1);
  const track=document.getElementById('landscapeTrack');
  track.classList.remove('moving');
  track.innerHTML=landscapeSvg(routeIndex)+landscapeSvg(routeIndex);
  document.getElementById('outsideStation').textContent=stages[stage][0];
  document.getElementById('platformScene').hidden=false;
  document.getElementById('routeStatus').hidden=true;
}

function syncLandscapeFrame(){
  const viewport=document.querySelector('.outside');
  const landscapeWindow=document.querySelector('.landscape-window');
  const vehicle=document.querySelector('.car');
  if(!viewport||!landscapeWindow||!vehicle)return;
  const viewportRect=viewport.getBoundingClientRect();
  const vehicleRect=vehicle.getBoundingClientRect();
  landscapeWindow.style.left=(vehicleRect.left-viewportRect.left)+'px';
  landscapeWindow.style.right='auto';
  landscapeWindow.style.width=vehicleRect.width+'px';
}
window.addEventListener('resize',syncLandscapeFrame);


function render(){
  const [title,desc,goal]=stages[stage];
  const ids=passengerIds();
  const count=ids.length;
  document.getElementById('stageLabel').textContent=`STAGE ${stage+1} / 13`;
  document.getElementById('stageTitle').textContent=title;
  document.getElementById('stageDesc').textContent=desc;
  const nextStage=stages[stage+1];
  document.getElementById('nextStation').textContent=nextStage?`次は：${nextStage[0]}`:'終点です（企救丘駅）';
  drawStationView();
  syncLandscapeFrame();
  document.getElementById('goal').textContent='目標：'+goal;
  document.getElementById('totalScore').textContent=total;
  document.getElementById('progress').innerHTML=stages.map((_,i)=>`<i class="pip ${i<stage?'done':''}"></i>`).join('');

  const grid=document.getElementById('seatGrid');
  grid.innerHTML='<div class="window-strip" style="grid-column:2/4;grid-row:1" aria-label="窓"></div><div class="window-strip" style="grid-column:5/8;grid-row:1" aria-label="窓"></div><div class="window-strip" style="grid-column:9/11;grid-row:1" aria-label="窓"></div><div class="window-strip" style="grid-column:2/4;grid-row:5" aria-label="窓"></div><div class="window-strip" style="grid-column:5/8;grid-row:5" aria-label="窓"></div><div class="window-strip" style="grid-column:9/11;grid-row:5" aria-label="窓"></div><div class="aisle-row" style="grid-column:1/12;grid-row:3"><span class="aisle-label">中央通路</span><div class="strap-spots" id="strapSpots"></div></div><div class="coupler-gap" style="grid-column:1;grid-row:1/6" title="連結部">連結部</div><div class="cab-wall" style="grid-column:11;grid-row:1/6">運転室壁</div>';
  const seatColumns=[2,3,5,6,7,9,10];

  for(const slot of slotData.filter(s=>s.type==='seat')){
    let i=slot.id,el=document.createElement('div');
    let lockedWho=Object.keys(lockedAssigned).find(k=>lockedAssigned[k]===i);
    let currentWho=Object.keys(assigned).find(k=>assigned[k]===i);
    let who=lockedWho!==undefined?lockedWho:currentWho;
    let isLocked=lockedWho!==undefined;
    let bank=Math.floor(i/7),pos=i%7,zone=pos===0?'連結':pos===6?'壁':pos===3?'中':'端';
    el.className='seat '+(bank===0?'top-bank':'bottom-bank')+(pos===0?' coupler-seat':pos===6?' wall-seat':pos===3?' middle-seat':' door-end-seat')+([0,2,5].includes(pos)?' group-start':'')+([1,4,6].includes(pos)?' group-end':'')+(who!==undefined?' occupied':'')+(isLocked?' locked':'')+(selected!==null&&assigned[selected]===i?' selected':'');
    el.style.gridColumn=String(seatColumns[pos]);
    el.style.gridRow=String(bank===0?2:4);
    el.innerHTML=`${who!==undefined?`<span class="avatar">${portrait(Number(who))}</span>`:''}<span class="zone-tag">${isLocked?'乗車中':zone}</span><span class="num">${i+1}</span>`;
    el.onclick=()=>seatClick(i);
    grid.appendChild(el);
  }

  for(let bank=0;bank<2;bank++){
    for(const col of [4,8]){
      let door=document.createElement('div');
      door.className='car-door';
      door.style.gridColumn=String(col);
      door.style.gridRow=String(bank===0?2:4);
      door.innerHTML='<span>ドア</span>';
      grid.appendChild(door);
    }
  }

  let strapSpots=document.getElementById('strapSpots');
  for(const slot of slotData.filter(s=>s.type==='strap')){
    let spotId=slot.id;
    let lockedWho=Object.keys(lockedAssigned).find(k=>lockedAssigned[k]===spotId);
    let currentWho=Object.keys(assigned).find(k=>assigned[k]===spotId);
    let who=lockedWho!==undefined?lockedWho:currentWho;
    let isLocked=lockedWho!==undefined;
    let spot=document.createElement('div');
    spot.className='strap-spot'+(who!==undefined?' occupied':'')+(isLocked?' locked':'');
    spot.innerHTML=`<i class="strap-cord"></i><i class="strap-handle"></i>${who!==undefined?`<span class="standing-avatar">${portrait(Number(who))}</span>`:'<span class="standing-label">立</span>'}`;
    spot.title=isLocked?'前の駅から乗車中':'吊り革につかまって立つ';
    spot.onclick=()=>seatClick(spotId);
    strapSpots.appendChild(spot);
  }

  document.getElementById('passengers').innerHTML=ids.map(id=>`<div class="person ${selected===id?'active':''} ${assigned[id]!==undefined?'done':''}" data-id="${id}"><div class="person-head"><span class="face">${portrait(id)}</span><span class="pname">${names[id]}</span></div><div class="wish">${preferenceFor(id).text}</div></div>`).join('');
  document.querySelectorAll('.person').forEach(p=>p.onclick=()=>{let id=Number(p.dataset.id);selected=selected===id?null:id;render()});
  document.getElementById('next').disabled=Object.keys(assigned).length<count;
  const lockedCount=Object.keys(lockedAssigned).length;
  document.getElementById('toast').textContent=Object.keys(assigned).length===count?'全員そろったよ！「採点する」を押してね。':(lockedCount>0?`前の駅から ${lockedCount}人 が乗車中だよ（次の駅で降ります）`:'');
  updateTutorial();
}

function seatClick(i){
  let isLocked=Object.values(lockedAssigned).includes(i);
  if(isLocked){
    document.getElementById('toast').textContent='前の駅から乗っているお客さんがいるよ（次の駅で降ります）。';
    return;
  }
  if(selected===null){
    document.getElementById('toast').textContent='先に乗客さんを選んでね。';
    return;
  }
  let occupant=Object.keys(assigned).find(k=>assigned[k]===i);
  if(occupant!==undefined&&Number(occupant)!==selected){
    document.getElementById('toast').textContent='その席にはもう乗客さんがいるよ。';
    return;
  }
  if(assigned[selected]===i){delete assigned[selected]}else{assigned[selected]=i}
  selected=null;
  render();
}

function singleConditionMet(type,slot,id){
  if(!slot)return false;
  const allOccupied={...lockedAssigned,...assigned};
  switch(type){
    case 'stand_strap':return slot.type==='strap';
    case 'near_driver':return slot.isNearDriver;
    case 'side_north':return slot.type==='seat'&&slot.side==='north';
    case 'side_south':return slot.type==='seat'&&slot.side==='south';
    case 'coupler':return slot.type==='seat'&&slot.id%7===0;
    case 'door_end':return slot.type==='seat'&&[1,2,4,5].includes(slot.id%7);
    case 'middle':return slot.type==='seat'&&slot.id%7===3;
    case 'quiet':return slot.type==='seat'&&!Object.entries(allOccupied).some(([otherId,otherSlot])=>Number(otherId)!==id&&areNeighbors(slot.id,otherSlot));
    case 'friend':return areNeighbors(slot.id,assigned[friendOf[id]]);
  }
  return false;
}

function preferenceMet(pref,slot,id){
  if(!slot)return false;
  return pref.types.every(type=>singleConditionMet(type,slot,id));
}

function score(){
  let ids=passengerIds(),outcomes=ids.map(id=>{const pref=preferenceFor(id),slot=slotById[assigned[id]],met=preferenceMet(pref,slot,id);return {id,pref,met}}),satisfied=outcomes.filter(x=>x.met).length;
  let points=Math.round(100*satisfied/ids.length);total+=points;let isFinal=stage===stages.length-1;
  document.getElementById('resultStars').textContent=points===100?'★★★':points>=60?'★★☆':'★☆☆';
  document.getElementById('resultTitle').textContent=isFinal?'13駅を完走！':points===100?'100%達成！完璧な案内！':points>=60?'いい感じの旅！':'次はもっといい旅に';
  document.getElementById('resultText').innerHTML=isFinal?`全13ステージおつかれさま！<br>最終ステージの満足度は <b>${points}%</b>。<br>合計ポイント<br><strong class="final-score">${total} / ${stages.length*100} pt</strong><br>モノレールの旅を楽しんでくれてありがとう。`:`今回の満足度は <b>${points}%</b>！<br>乗客さんの希望を ${satisfied} / ${ids.length} 人かなえたよ。<br>（今回乗ったお客さんは次の駅まで乗っています）`;
  if(stage===0){document.getElementById('resultText').innerHTML+='<span class="carryover-note">※配置した乗客は次の駅までそのまま乗り続けます</span>';}
  document.getElementById('resultFeedback').innerHTML=outcomes.map(({id,pref,met})=>`<div class="feedback-row ${met?'feedback-ok':'feedback-miss'}"><b>${met?'✓ 達成':'・未達'} ${names[id]}</b>：${pref.text}</div>`).join('');
  document.getElementById('resultIcon').textContent=isFinal?'🎉🚝':points===100?'🌟🚝':'🚝';
  document.getElementById('resultNext').textContent=isFinal?'もう一度遊ぶ ↺':'つぎの駅へ →';
  document.getElementById('result').classList.add('show');
}

document.getElementById('next').onclick=score;
document.getElementById('reset').onclick=()=>{assigned={};selected=null;render()};
function startJourney(){
  if(isTraveling||stage>=stages.length-1)return;
  const routeIndex=stage;
  const from=stages[stage][0].replace(/駅$/,'');
  const to=stages[stage+1][0].replace(/駅$/,'');
  isTraveling=true;
  tutorialDismissed=true;
  updateTutorial();
  document.getElementById('result').classList.remove('show');
  document.body.classList.add('is-traveling');
  document.querySelector('.scene').classList.add('is-running');
  document.querySelector('.car-shell').classList.add('is-running');
  document.querySelector('.car').classList.add('is-running');
  document.getElementById('routeStatus').textContent=from+' ➔ '+to+' 走行中…';
  document.getElementById('routeStatus').hidden=false;
  document.getElementById('platformScene').hidden=true;
  const track=document.getElementById('landscapeTrack');
  track.innerHTML=landscapeSvg(routeIndex)+landscapeSvg(routeIndex);
  track.classList.remove('moving');
  void track.offsetWidth;
  track.classList.add('moving');
  window.setTimeout(()=>{
    lockedAssigned={...assigned};
    stage++;
    assigned={};
    selected=null;
    isTraveling=false;
    document.body.classList.remove('is-traveling');
    document.querySelector('.scene').classList.remove('is-running');
    document.querySelector('.car-shell').classList.remove('is-running');
    document.querySelector('.car').classList.remove('is-running');
    render();
  },3000);
}

document.getElementById('resultNext').onclick=()=>{
  if(isTraveling)return;
  if(stage===stages.length-1){
    document.getElementById('result').classList.remove('show');
    stage=0;total=0;lockedAssigned={};tutorialDismissed=false;tutorialCurrentStep=null;tutorialCurrentTarget=null;
    assigned={};selected=null;render();
    return;
  }
  startJourney();
};

document.getElementById('sound').onclick=e=>{e.currentTarget.textContent=e.currentTarget.textContent.includes('運行中')?'♪ しずかな車内':'♪ モノレール運行中'};
render();
