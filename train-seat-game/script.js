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
  {kind:'downtown'},
  {kind:'river'},
  {kind:'road'},
  {kind:'shops'},
  {kind:'school'},
  {kind:'open'},
  {kind:'campus'},
  {kind:'race'},
  {kind:'housing'},
  {kind:'housingHills'},
  {kind:'riverHills'},
  {kind:'base'}
];

function landscapeSvg(index){
  const kind=landscapeThemes[2].kind;
  const sceneColors=getComputedStyle(document.documentElement);
  const sky=sceneColors.getPropertyValue('--scene-sky').trim()||'#bce6ef';
  const ground=sceneColors.getPropertyValue('--scene-ground').trim()||'#c5d99d';
  const parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">'];
  const add=(s)=>parts.push(s);
  const tree=(x,base=62,scale=1,color='#63936f')=>{
    const trunkW=4*scale, trunkH=10*scale, crownW=20*scale, crownH=18*scale;
    add('<rect x="'+(x-trunkW/2)+'" y="'+(base-trunkH)+'" width="'+trunkW+'" height="'+trunkH+'" fill="#806e55"/>');
    add('<rect x="'+(x-crownW/2)+'" y="'+(base-trunkH-crownH)+'" width="'+crownW+'" height="'+crownH+'" fill="'+color+'"/>');
    add('<rect x="'+(x-crownW/2+4*scale)+'" y="'+(base-trunkH-crownH-5*scale)+'" width="'+(crownW-8*scale)+'" height="'+(crownH*.45)+'" fill="#78a57b"/>');
  };
  const building=(x,w,top,color,base=62,apartment=false)=>{
    add('<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+(base-top)+'" fill="'+color+'" stroke="#637d77" stroke-width="1"/>');
    add('<rect x="'+(x+3)+'" y="'+(base-3)+'" width="'+(w-6)+'" height="3" fill="#7e8e79"/>');
    for(let y=top+6;y<base-6;y+=8)for(let col=x+6;col<x+w-4;col+=apartment?11:13){
      add('<rect x="'+col+'" y="'+y+'" width="'+(apartment?6:5)+'" height="4" fill="#e8f0d9"/>');
    }
  };

  add('<rect width="600" height="90" fill="'+sky+'"/>');
  add('<rect y="62" width="600" height="28" fill="'+ground+'"/>');

  if(['housingHills','riverHills','base'].includes(kind)){
    add('<path d="M0 62L58 42L115 60L180 34L245 62L315 38L382 62L455 33L520 60L600 62V90H0Z" fill="#789d72"/>');
    add('<path d="M0 62L83 49L145 62L238 44L308 62L390 47L470 62L550 46L600 62V90H0Z" fill="#9cba80"/>');
  }

  if(kind==='downtown'){
    building(24,52,23,'#829baa');
    building(92,62,13,'#a9b9bb');
    building(170,52,31,'#8ea5ad');
    building(238,60,9,'#d3c7a7');
    building(314,56,18,'#9daeb0');
    building(386,60,5,'#d0ad83');
    building(462,58,22,'#91a5ad');
    building(536,40,32,'#a6b4b1');
    add('<path d="M18 49H168M181 49H293M308 49H434M450 49H582" stroke="#d88e69" stroke-width="4"/>');
    add('<path d="M0 62H600" stroke="#8c806b" stroke-width="3"/>');
  }

  if(kind==='river'){
    add('<path d="M0 62L90 49L155 56L245 44L330 55L420 48L505 57L600 62V90H0Z" fill="#9fbd7a"/>');
    add('<rect x="0" y="62" width="600" height="20" fill="#70b9c7"/>');
    add('<path d="M0 68H600M0 76H600" stroke="#a9dfe0" stroke-width="2" stroke-dasharray="15 9"/>');
    for(let x=24;x<570;x+=72)tree(x,62,.8,x%144?'#60936d':'#77a477');
    add('<path d="M0 58H600" stroke="#7b7969" stroke-width="4"/>');
    add('<path d="M0 61Q150 36 300 61T600 61" fill="none" stroke="#8e8774" stroke-width="5"/>');
    add('<path d="M0 53H600" stroke="#e6dfc6" stroke-width="2"/>');
    for(let x=50;x<600;x+=125)add('<rect x="'+x+'" y="57" width="8" height="18" fill="#8e8774"/>');
  }

  if(kind==='road'){
    building(18,54,23,'#9faeac',66);
    building(86,62,13,'#b9c4bf',66,true);
    building(164,58,29,'#879da5',66);
    building(236,66,19,'#d0c8ae',66);
    building(316,56,10,'#aebcb7',66,true);
    building(386,64,25,'#91a5a7',66);
    building(464,54,17,'#c4bca3',66);
    building(530,52,30,'#8fa3a7',66);
    add('<rect y="64" width="600" height="26" fill="#71786f"/>');
    add('<rect y="64" width="600" height="4" fill="#d7d0b8"/>');
    add('<path d="M0 80H600" stroke="#f5e8b5" stroke-width="2" stroke-dasharray="20 14"/>');
    add('<path d="M0 88H600" stroke="#59635e" stroke-width="2"/>');
  }

  if(kind==='shops'){
    building(20,75,30,'#c7aa89');
    building(111,82,25,'#aeb9a5');
    building(209,72,33,'#d0bea0');
    building(297,82,21,'#b2b7a4');
    building(395,72,29,'#c3a785');
    building(481,95,24,'#aab8ae');
    for(let x=20;x<580;x+=95){
      add('<rect x="'+x+'" y="54" width="76" height="8" fill="'+(x%2?'#d1836c':'#e0bb70')+'"/>');
      add('<rect x="'+(x+7)+'" y="44" width="4" height="10" fill="#fff0ce"/>');
    }
    add('<path d="M0 62H600" stroke="#9c896e" stroke-width="3"/>');
  }

  if(kind==='school'||kind==='campus'){
    const x=kind==='school'?195:155, w=kind==='school'?220:290, top=kind==='school'?31:25;
    add('<rect x="'+(x-7)+'" y="'+(top+7)+'" width="'+(w+14)+'" height="'+(62-top-7)+'" fill="#dfd5b8" stroke="#71877d" stroke-width="2"/>');
    add('<path d="M'+(x-18)+' '+(top+8)+'L'+(x+w/2)+' '+top+'L'+(x+w+18)+' '+(top+8)+'Z" fill="#a56859"/>');
    const bodyTop=top+7;
    for(let bx=x+12;bx<x+w-6;bx+=26){
      for(let row=0;row<2;row++){
        const wy=bodyTop+5+row*10;
        if(wy+6<62)add('<rect x="'+bx+'" y="'+wy+'" width="13" height="6" fill="#9bc6ca"/>');
      }
    }
    add('<rect x="'+(x+w/2-10)+'" y="52" width="20" height="10" fill="#89785d"/>');
    for(let tx=55;tx<600;tx+=125)tree(tx,62,.9);
  }

  if(kind==='open'){
    for(let i=0;i<6;i++){
      const x=24+i*94, h=18+(i%3)*5, w=54;
      add('<rect x="'+x+'" y="'+(62-h)+'" width="'+w+'" height="'+h+'" fill="'+(i%2?'#d7c69e':'#c8b78e')+'" stroke="#7d8872"/>');
      add('<path d="M'+(x-4)+' '+(62-h)+'L'+(x+w/2)+' '+(56-h)+'L'+(x+w+4)+' '+(62-h)+'Z" fill="#a8735e"/>');
      add('<rect x="'+(x+10)+'" y="'+(62-h+7)+'" width="10" height="8" fill="#a5cbd0"/>');
      add('<rect x="'+(x+34)+'" y="'+(62-h+7)+'" width="10" height="8" fill="#a5cbd0"/>');
    }
    for(let tx=75;tx<600;tx+=145)tree(tx,62,1);
  }

  if(kind==='race'){
    add('<rect y="62" width="600" height="28" fill="#8fbd72"/>');
    add('<rect x="100" y="31" width="400" height="31" fill="#d8d8c9" stroke="#677d76" stroke-width="2"/>');
    add('<path d="M72 33L105 15H495L528 33Z" fill="#f4f0dc" stroke="#71827a" stroke-width="2"/>');
    add('<path d="M87 35H513" stroke="#fffdf0" stroke-width="4"/>');
    for(let x=118;x<490;x+=27){
      add('<rect x="'+x+'" y="39" width="16" height="14" fill="#9fc6c7" stroke="#73857c"/>');
      add('<rect x="'+(x+4)+'" y="42" width="8" height="7" fill="#e7f0dc"/>');
    }
    add('<rect x="92" y="57" width="416" height="5" fill="#82948a"/>');
    add('<path d="M0 70H600M0 78H600" stroke="#fff9e8" stroke-width="2"/>');
    for(let x=12;x<600;x+=35)add('<rect x="'+x+'" y="67" width="3" height="14" fill="#fff9e8"/>');
  }

  if(kind==='housing'||kind==='housingHills'){
    const base=63;
    for(let i=0;i<8;i++){
      const x=16+i*73,w=54+(i%2)*7,h=28+(i*5)%14,top=base-h;
      building(x,w,top,i%3===0?'#e6e4d7':i%3===1?'#d5ddd1':'#c9d2c7',base,true);
      add('<rect x="'+(x-2)+'" y="'+base+'" width="'+(w+4)+'" height="3" fill="#71866b" opacity=".7"/>');
      add('<rect x="'+(x-5)+'" y="'+(base+3)+'" width="'+(w+10)+'" height="5" fill="#7fa16e"/>');
    }
  }

  if(kind==='riverHills'){
    add('<rect y="58" width="600" height="10" fill="#9fbd7a"/>');
    add('<rect y="68" width="600" height="14" fill="#70b9c7"/>');
    add('<path d="M0 73H600M0 79H600" stroke="#a9dfe0" stroke-width="2" stroke-dasharray="16 9"/>');
    for(let i=0;i<5;i++){
      const x=24+i*112,w=54,h=18+(i%2)*5;
      building(x,w,68-h,i%2?'#c8bea0':'#c0cbb2',68);
    }
    for(let x=80;x<600;x+=145)tree(x,68,.8);
    add('<path d="M0 64H600" stroke="#8b897a" stroke-width="5"/>');
    add('<path d="M0 68Q150 45 300 68T600 68" fill="none" stroke="#8b897a" stroke-width="4"/>');
    for(let x=60;x<600;x+=150)add('<rect x="'+x+'" y="62" width="9" height="19" fill="#8b897a"/>');
  }

  if(kind==='base'){
    add('<rect y="62" width="600" height="28" fill="#a8c77e"/>');
    add('<rect x="115" y="27" width="370" height="39" fill="#c8c9b8" stroke="#667a72" stroke-width="2"/>');
    add('<path d="M102 28L135 13H465L498 28Z" fill="#dddcc9" stroke="#667a72" stroke-width="2"/>');
    add('<rect x="130" y="42" width="72" height="24" fill="#77877c" stroke="#5c7069"/>');
    add('<rect x="215" y="42" width="72" height="24" fill="#77877c" stroke="#5c7069"/>');
    add('<rect x="300" y="42" width="72" height="24" fill="#77877c" stroke="#5c7069"/>');
    add('<rect x="385" y="42" width="72" height="24" fill="#77877c" stroke="#5c7069"/>');
    for(let y=47;y<62;y+=5)for(let x=135;x<457;x+=85)add('<path d="M'+x+' '+y+'H'+(x+62)+'" stroke="#bdc9bf" stroke-width="1"/>');
    add('<rect y="68" width="600" height="22" fill="#858b7b"/>');
    for(let x=0;x<600;x+=24)add('<rect x="'+x+'" y="68" width="5" height="22" fill="#665f50"/>');
    add('<path d="M0 73H600M0 81H600M0 89H600" stroke="#4e5c56" stroke-width="3"/>');
    add('<path d="M0 71H600M0 79H600M0 87H600" stroke="#c7b892" stroke-width="2"/>');
  }

  parts.push('</svg>');
  return parts.join('');
}

function drawStationView(){
  const fromIndex=stage===0?0:Math.min(11,stage-1);
  const track=document.getElementById('landscapeTrack');
  track.classList.remove('moving');
  track.innerHTML=landscapeSvg(fromIndex)+landscapeSvg(fromIndex);
  document.getElementById('outsideStation').textContent=stages[stage][0];
  document.getElementById('platformScene').hidden=false;
  document.getElementById('routeStatus').hidden=true;
}


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
  const fromIndex=stage===0?0:Math.min(11,stage-1);
  const toIndex=Math.max(0,Math.min(11,stage));
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
  track.innerHTML=landscapeSvg(fromIndex)+landscapeSvg(toIndex);
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
