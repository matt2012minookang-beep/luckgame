/* =========================
   운빨겜 - HTML(너가 준 구조) 전용
   - 화면 전환: main/shop/box/upgrade/equip/battle
   - 상점 무료쿨 90초, 서버럭 60초(5% 확률 보정)
   - 상자 업그레이드: 점 1개씩만 감소(버그 방지), 보상 후 자동으로 box로 복귀
   - 장비: 캐릭터/주무기(나무몽둥이/목검) 스탯 표시, 목검 미구매여도 스탯은 보임
   - 전투: 캔버스, 그리드, WASD 이동, 클릭 공격(0.2초 잔상), 무기별 쿨다운
========================= */

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------- Elements ---------- */
const screens = {
  main: $("#screen-main"),
  shop: $("#screen-shop"),
  box: $("#screen-box"),
  upgrade: $("#screen-upgrade"),
  equip: $("#screen-equip"),
  battle: $("#screen-battle"),
};

const gemsText = $("#gemsText");
const serverLuckLine = $("#serverLuckLine");
const serverLuckText = $("#serverLuckText");

const needSelectText = $("#needSelectText");
const mainNotice = $("#mainNotice");

const shopNotice = $("#shopNotice");
const shopFreeCard = $("#shopFreeCard");
const shopFreeStatus = $("#shopFreeStatus");
const shopFreeTimer = $("#shopFreeTimer");
const shopLuckCard = $("#shopLuckCard");
const shopLuckTimer = $("#shopLuckTimer");

const boxNotice = $("#boxNotice");
const priceNormal = $("#priceNormal");
const priceMid = $("#priceMid");
const priceHigh = $("#priceHigh");
const cardNormal = $("#cardNormal");
const cardMid = $("#cardMid");
const cardHigh = $("#cardHigh");

const tapHint = $("#tapHint");
const upgradeTitle = $("#upgradeTitle");
const tapArea = $("#tapArea");
const boxA = $("#boxA");
const boxB = $("#boxB");
const dots = $("#dots");

const equipGrid = $("#equipGrid");
const modal = $("#modal");
const modalClose = $("#modalClose");
const modalTitle = $("#modalTitle");
const modalBig = $("#modalBig");
const modalDesc = $("#modalDesc");
const modalStats = $("#modalStats");
const btnSelect = $("#btnSelect");
const btnMainAction = $("#btnMainAction");
const modalNotice = $("#modalNotice");

const confirm = $("#confirm");
const confirmMsg = $("#confirmMsg");
const confirmYes = $("#confirmYes");
const confirmNo = $("#confirmNo");

const reward = $("#reward");
const rewardText = $("#rewardText");

const battleCanvas = $("#battleCanvas");
const btnBattleHome = $("#btnBattleHome");

/* ---------- State ---------- */
const state = {
  screen: "main",

  gems: 0,

  // 선택 상태
  selectedCharacter: false,
  selectedWeapon: null, // "club" | "wood_sword"

  // 무료 1회
  free_normal_used: false,
  free_mid_used: false,
  free_high_used: false,

  // 상자 가격
  PRICE_NORMAL: 7,
  PRICE_MID: 15,
  PRICE_HIGH: 30,

  // 상점 무료 쿨
  shopFreeIn: 0,
  shopCooldownTimer: null,

  // 서버럭
  serverLuckIn: 0,
  serverLuckTimer: null,

  // 캐릭터
  char_level: 1,
  char_level_max: 10,
  char_hp: 1.5,
  char_speed: 1.0,
  char_stamina: 50,

  // 나무몽둥이
  club_owned: true,
  club_level: 1,
  club_level_max: 10,
  club_atk: 2.0,
  club_stamina_cost: 0.10, // /번
  club_attack_speed: 1.0,  // 초(쿨다운)
  club_dura_cost: 0.10,
  club_total_dura: 7.0,

  // 목검
  wood_sword_owned: false,
  wood_sword_price: 100,
  wood_sword_level: 1,
  wood_sword_level_max: 10,
  wood_sword_atk: 5.0,
  wood_sword_stamina_cost: 1.5,
  wood_sword_attack_speed: 0.7,
  wood_sword_dura_cost: 0.15,
  wood_sword_total_dura: 10.0,

  // upgrade mini-game
  upgradeMode: null, // "normal" | "mid" | "high"
  up: {
    firstTapDone: false,
    filled: 3,
    openReady: false,
    splitDone: false,
    twoChests: false,

    // normal stage
    stage: "브론즈",

    // mid star
    star: 1,

    // high stage
    highStage: "희귀",
  },

  // modal context
  modalKey: null, // "char"|"club"|"wood_sword"
};

/* ---------- Utils ---------- */
function mmss(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function fmt2(n){ return (Math.round(n*100)/100).toString(); }
function fmt3(n){ return (Math.round(n*1000)/1000).toString(); }

function showNotice(el, text, ms=1200){
  el.textContent = text;
  if(ms>0) setTimeout(()=>{ el.textContent=""; }, ms);
}

function setHidden(el, yes){
  if(!el) return;
  el.classList.toggle("hidden", !!yes);
}

function showScreen(name){
  state.screen = name;
  Object.entries(screens).forEach(([k,el])=>{
    setHidden(el, k !== name);
  });

  // 전투 화면 진입/이탈 처리
  if(name === "battle") battleStart();
  else battleStop();

  refreshHUD();
}

/* ---------- HUD refresh ---------- */
function refreshHUD(){
  gemsText.textContent = String(state.gems);

  // 서버럭
  if(state.serverLuckIn > 0){
    setHidden(serverLuckLine, false);
    serverLuckText.textContent = mmss(state.serverLuckIn);
  }else{
    setHidden(serverLuckLine, true);
  }

  // 메인 선택 문구
  if(state.selectedCharacter && state.selectedWeapon){
    needSelectText.textContent = `선택됨: 네모 / ${state.selectedWeapon === "club" ? "나무몽둥이" : "목검"}`;
  }else{
    needSelectText.textContent = "캐릭터/주무기 선택 필요";
  }

  // 상점 무료 표시
  if(state.shopFreeIn <= 0){
    shopFreeStatus.textContent = "10개";
    shopFreeTimer.textContent = "";
  }else{
    shopFreeStatus.textContent = "이미 받은 아이템입니다";
    shopFreeTimer.textContent = `${mmss(state.shopFreeIn)}초 후 무료`;
  }

  if(state.serverLuckIn > 0){
    shopLuckTimer.textContent = `${mmss(state.serverLuckIn)} 남음`;
  }else{
    shopLuckTimer.textContent = "";
  }

  // box 가격
  priceNormal.textContent = state.free_normal_used ? `${state.PRICE_NORMAL} 크리스탈` : "무료 1회 남음";
  priceMid.textContent = state.free_mid_used ? `${state.PRICE_MID} 크리스탈` : "무료 1회 남음";
  priceHigh.textContent = state.free_high_used ? `${state.PRICE_HIGH} 크리스탈` : "무료 1회 남음";
}

/* ---------- economy ---------- */
function addGems(n){
  state.gems += n;
  refreshHUD();
}
function spendGems(n){
  if(state.gems < n) return false;
  state.gems -= n;
  refreshHUD();
  return true;
}

/* ---------- shop timers ---------- */
function startShopCooldown(sec=90){
  state.shopFreeIn = Math.max(0, Math.floor(sec));
  if(state.shopCooldownTimer) clearInterval(state.shopCooldownTimer);
  state.shopCooldownTimer = setInterval(()=>{
    state.shopFreeIn -= 1;
    if(state.shopFreeIn <= 0){
      state.shopFreeIn = 0;
      clearInterval(state.shopCooldownTimer);
      state.shopCooldownTimer = null;
    }
    refreshHUD();
  }, 1000);
}

function startServerLuck(sec=60){
  state.serverLuckIn = Math.max(1, Math.floor(sec));
  if(state.serverLuckTimer) clearInterval(state.serverLuckTimer);
  state.serverLuckTimer = setInterval(()=>{
    state.serverLuckIn -= 1;
    if(state.serverLuckIn <= 0){
      state.serverLuckIn = 0;
      clearInterval(state.serverLuckTimer);
      state.serverLuckTimer = null;
    }
    refreshHUD();
  }, 1000);
}
function serverLuckActive(){ return state.serverLuckIn > 0; }

/* ---------- confirm / reward ---------- */
let confirmYesCb = null;
let confirmNoCb = null;

function openConfirm(message, onYes, onNo){
  confirmMsg.textContent = message;
  confirmYesCb = onYes || null;
  confirmNoCb = onNo || null;
  setHidden(confirm, false);
}
function closeConfirm(){
  setHidden(confirm, true);
  confirmYesCb = null;
  confirmNoCb = null;
}

let rewardQueue = []; // amounts
let rewardDoneCb = null;

function openRewardQueue(amounts, doneCb){
  rewardQueue = [...amounts];
  rewardDoneCb = doneCb || null;
  showNextReward();
}
function showNextReward(){
  if(rewardQueue.length === 0){
    setHidden(reward, true);
    const cb = rewardDoneCb;
    rewardDoneCb = null;
    if(cb) cb();
    return;
  }
  const amt = rewardQueue[0];
  rewardText.textContent = `크리스탈 ${amt}개를 획득했습니다!`;
  setHidden(reward, false);
}
function clickReward(){
  if(rewardQueue.length === 0) return;
  const amt = rewardQueue.shift();
  setHidden(reward, true);
  addGems(amt);
  // 아주 짧게 텀
  setTimeout(showNextReward, 20);
}

/* ---------- upgrade game ---------- */
function resetUpgrade(mode){
  state.upgradeMode = mode;
  state.up.firstTapDone = false;
  state.up.filled = 3;
  state.up.openReady = false;
  state.up.splitDone = false;
  state.up.twoChests = false;

  if(mode === "normal"){
    state.up.stage = "브론즈";
    boxA.textContent = "📦";
    boxB.textContent = "📦";
  }else if(mode === "mid"){
    state.up.star = 1;
    boxA.textContent = "🎁";
    boxB.textContent = "🎁";
  }else{
    state.up.highStage = "희귀";
    boxA.textContent = "🧰";
    boxB.textContent = "🧰";
  }

  // UI
  setHidden(boxB, true);
  boxA.classList.remove("big");
  boxB.classList.remove("big");
  setHidden(tapHint, false);
  dots.textContent = "● ● ●";
  updateUpgradeTitle();
}

function updateUpgradeTitle(){
  const mode = state.upgradeMode;
  if(mode === "normal"){
    upgradeTitle.textContent = state.up.stage;
  }else if(mode === "mid"){
    upgradeTitle.textContent = "★".repeat(state.up.star);
  }else{
    upgradeTitle.textContent = state.up.highStage;
    // 고급은 스테이지별 배경 변경(파이썬 버전 느낌)
    const bgByStage = {
      "희귀":"#1aa84b",
      "초희귀":"#1f5fbf",
      "영웅":"#7a2cff",
      "신화":"#ff2b2b",
      "전설":"#ffd400",
      "울트라 전설":"#ffffff"
    };
    const bg = bgByStage[state.up.highStage] || "#ff6fb2";
    screens.upgrade.style.background = bg;
    // 글자색
    const fg = (bg.toLowerCase()==="#ffffff") ? "#000" : "#fff";
    screens.upgrade.style.color = fg;
  }
}

function dotsText(){
  const f = state.up.filled;
  return [0,1,2].map(i => (i < f ? "●" : "○")).join(" ");
}

function splitProb(){
  // normal/mid: 서버럭이면 0.15 아니면 0.10, high는 0.10 고정
  if(state.upgradeMode === "high") return 0.10;
  return serverLuckActive() ? 0.15 : 0.10;
}

function normalNextStageProbBase(stage){
  if(stage==="브론즈") return ["실버",0.70];
  if(stage==="실버") return ["골드",0.60];
  if(stage==="골드") return ["에메랄드",0.50];
  if(stage==="에메랄드") return ["다이아",0.30];
  if(stage==="다이아") return ["레드 다이아",0.10];
  return [null,0];
}
function normalReward(stage){
  return {"브론즈":1,"실버":2,"골드":3,"에메랄드":5,"다이아":7,"레드 다이아":10}[stage] || 1;
}

const midP = {1:0.35,2:0.25,3:0.15,4:0.05};
function midReward(star){
  return {1:7,2:10,3:15,4:25,5:37}[star] || 7;
}

function highNextStageProbBase(stage){
  if(stage==="희귀") return ["초희귀",0.75];
  if(stage==="초희귀") return ["영웅",0.50];
  if(stage==="영웅") return ["신화",0.35];
  if(stage==="신화") return ["전설",0.15];
  if(stage==="전설") return ["울트라 전설",0.05];
  return [null,0];
}
function highReward(stage){
  return {"희귀":20,"초희귀":25,"영웅":30,"신화":50,"전설":100,"울트라 전설":300}[stage] || 20;
}

/* ✅ 탭 버그(점 2개씩 빠짐) 방지용 락 */
let tapLock = false;

function onUpgradeTap(e){
  // 모바일에서 pointerdown + click 중복 방지
  if(e) e.preventDefault?.();
  if(tapLock) return;
  tapLock = true;
  setTimeout(()=> tapLock = false, 30);

  // 첫 탭이면 힌트 숨김
  if(!state.up.firstTapDone){
    state.up.firstTapDone = true;
    setHidden(tapHint, true);
  }

  // 이미 열릴 준비면 보상
  if(state.up.openReady){
    const times = state.up.twoChests ? 2 : 1;
    let amt = 1;
    if(state.upgradeMode==="normal") amt = normalReward(state.up.stage);
    else if(state.upgradeMode==="mid") amt = midReward(state.up.star);
    else amt = highReward(state.up.highStage);

    const arr = Array(times).fill(amt);
    openRewardQueue(arr, ()=>{
      // ✅ 보상 끝나면 무조건 box 선택 화면으로
      showScreen("box");
    });
    return;
  }

  // 쪼개기
  if(!state.up.splitDone && Math.random() < splitProb()){
    state.up.twoChests = true;
    state.up.splitDone = true;
    state.up.filled = 3;
    setHidden(boxB, false);
    dots.textContent = dotsText();
    return;
  }

  // ✅ 점은 1개씩만
  state.up.filled = Math.max(0, state.up.filled - 1);

  // 단계업
  if(state.upgradeMode==="normal"){
    let [nxt, p] = normalNextStageProbBase(state.up.stage);
    if(nxt){
      if(serverLuckActive()) p = Math.min(1, p + 0.05);
      if(Math.random() < p){
        state.up.stage = nxt;
        state.up.filled = 3;
        state.up.openReady = false;
        dots.textContent = dotsText();
        updateUpgradeTitle();
        return;
      }
    }
  }else if(state.upgradeMode==="mid"){
    if(state.up.star < 5){
      let p = midP[state.up.star] || 0;
      if(serverLuckActive()) p = Math.min(1, p + 0.05);
      if(Math.random() < p){
        state.up.star += 1;
        state.up.filled = 3;
        state.up.openReady = false;
        dots.textContent = dotsText();
        updateUpgradeTitle();
        return;
      }
    }
  }else{
    let [nxt, p] = highNextStageProbBase(state.up.highStage);
    if(nxt){
      if(serverLuckActive()) p = Math.min(1, p + 0.05);
      if(Math.random() < p){
        state.up.highStage = nxt;
        state.up.filled = 3;
        state.up.openReady = false;
        dots.textContent = dotsText();
        updateUpgradeTitle();
        return;
      }
    }
  }

  // 열릴 준비
  if(state.up.filled === 0){
    state.up.openReady = true;
    // 상자 크게
    boxA.classList.add("big");
    boxB.classList.add("big");
    dots.textContent = "";
    return;
  }

  // 일반 업데이트
  dots.textContent = dotsText();
}

/* ---------- equip modal data ---------- */
function charUpgradeCost(){
  const x = state.char_level|0;
  return x*x + 49;
}
function clubUpgradeCost(){
  const x = state.club_level|0;
  return x*x + 49;
}
function woodUpgradeCost(){
  const x = state.wood_sword_level|0;
  return x*x + 49;
}

function weaponData(key){
  if(key==="club"){
    return {
      owned: true,
      name: "나무몽둥이",
      emoji: "🪵",
      desc: "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다.",
      level: state.club_level,
      level_max: state.club_level_max,
      atk: state.club_atk,
      stam: state.club_stamina_cost,
      spd: state.club_attack_speed,
      dura_cost: state.club_dura_cost,
      total_dura: state.club_total_dura,
      can_upgrade: state.club_level < state.club_level_max,
      cost: clubUpgradeCost()
    };
  }
  // wood_sword
  return {
    owned: state.wood_sword_owned,
    name: "목검",
    emoji: "🗡️",
    desc: "초보자용 무기로 가격이 쌉니다.\n나무몽둥이보단 좋지만 여전히 데미지와 내구도가 적습니다.",
    level: state.wood_sword_level,
    level_max: state.wood_sword_level_max,
    atk: state.wood_sword_atk,
    stam: state.wood_sword_stamina_cost,
    spd: state.wood_sword_attack_speed,
    dura_cost: state.wood_sword_dura_cost,
    total_dura: state.wood_sword_total_dura,
    can_upgrade: state.wood_sword_owned && state.wood_sword_level < state.wood_sword_level_max,
    cost: woodUpgradeCost()
  };
}

/* ---------- equip grid ---------- */
let currentTab = "char";

function renderEquipGrid(){
  equipGrid.innerHTML = "";

  const makeSlot = (emo, name, badgeText, subText, onClick) => {
    const d = document.createElement("div");
    d.className = "slot";
    d.innerHTML = `
      <div class="badge">${badgeText || ""}</div>
      <div class="emo">${emo}</div>
      <div class="name">${name}</div>
      <div class="sub">${subText || ""}</div>
    `;
    d.addEventListener("click", onClick);
    return d;
  };

  if(currentTab==="char"){
    equipGrid.appendChild(makeSlot("⬛", "네모", String(state.char_level), (state.char_level>=state.char_level_max)?"맥시멈 레벨":"", ()=>{
      openModal("char");
    }));
    equipGrid.appendChild(makeSlot("🙂","🙂","","", ()=>{}));
    equipGrid.appendChild(makeSlot("🙂","🙂","","", ()=>{}));
    equipGrid.appendChild(makeSlot("🙂","🙂","","", ()=>{}));
    equipGrid.appendChild(makeSlot("🙂","🙂","","", ()=>{}));
  }
  else if(currentTab==="mainw"){
    // club
    equipGrid.appendChild(makeSlot("🪵","나무몽둥이", String(state.club_level),
      (state.club_level>=state.club_level_max)?"맥시멈 레벨":"", ()=>{
        openModal("club");
      }));
    // wood sword (스탯은 무조건 보임)
    equipGrid.appendChild(makeSlot("🗡️","목검",
      state.wood_sword_owned ? String(state.wood_sword_level) : "",
      state.wood_sword_owned ? ((state.wood_sword_level>=state.wood_sword_level_max)?"맥시멈 레벨":"") : `구매:${state.wood_sword_price}크리스탈`,
      ()=>{ openModal("wood_sword"); }
    ));
    equipGrid.appendChild(makeSlot("⚔️","⚔️","","", ()=>{}));
    equipGrid.appendChild(makeSlot("⚔️","⚔️","","", ()=>{}));
    equipGrid.appendChild(makeSlot("⚔️","⚔️","","", ()=>{}));
  }
  else if(currentTab==="subw"){
    for(let i=0;i<5;i++) equipGrid.appendChild(makeSlot("🛡️","🛡️","","", ()=>{}));
  }
  else{
    for(let i=0;i<5;i++) equipGrid.appendChild(makeSlot("🔮","🔮","","", ()=>{}));
  }
}

function openModal(key){
  state.modalKey = key;
  modalNotice.textContent = "";
  setHidden(modal, false);

  // theme (equip가 green이니까 green 그대로)
  modalTitle.textContent = "상세";

  if(key==="char"){
    modalTitle.textContent = "네모";
    modalBig.textContent = "⬛";
    modalDesc.textContent = "기본캐릭터";

    modalStats.innerHTML = `
      <div>레벨: ${state.char_level}</div>
      <div>체력: ${fmt2(state.char_hp)}</div>
      <div>이동속도: ${fmt2(state.char_speed)}</div>
      <div>스테미너: ${state.char_stamina|0}</div>
    `;

    btnSelect.textContent = state.selectedCharacter ? "선택됨" : "선택";
    btnSelect.disabled = !!state.selectedCharacter;

    if(state.char_level < state.char_level_max){
      btnMainAction.textContent = `업그레이드하기: ${charUpgradeCost()} 크리스탈`;
      btnMainAction.disabled = false;
    }else{
      btnMainAction.textContent = "맥시멈 레벨";
      btnMainAction.disabled = true;
    }
  }else{
    const d = weaponData(key);
    modalTitle.textContent = d.name;
    modalBig.textContent = d.emoji;
    modalDesc.textContent = d.desc;

    modalStats.innerHTML = `
      <div>레벨: ${d.level}</div>
      <div>공격력: ${fmt2(d.atk)}</div>
      <div>소모 스테미너: ${fmt2(d.stam)}/번</div>
      <div>공격 속도: ${fmt2(d.spd)}초</div>
      <div>내구도소모: ${fmt3(d.dura_cost)}/번</div>
      <div>총 내구도: ${fmt2(d.total_dura)}</div>
    `;

    // 선택 버튼
    const selectable = (key==="club") || (key==="wood_sword" && state.wood_sword_owned);
    if(state.selectedWeapon === key){
      btnSelect.textContent = "선택됨";
      btnSelect.disabled = true;
    }else{
      btnSelect.textContent = "선택";
      btnSelect.disabled = !selectable;
    }

    // 메인 액션 버튼(목검은 구매/업그레이드)
    if(key==="wood_sword" && !state.wood_sword_owned){
      btnMainAction.textContent = `구매:${state.wood_sword_price}크리스탈`;
      btnMainAction.disabled = false;
    }else{
      if(d.can_upgrade){
        btnMainAction.textContent = `업그레이드하기: ${d.cost} 크리스탈`;
        btnMainAction.disabled = false;
      }else{
        btnMainAction.textContent = "맥시멈 레벨";
        btnMainAction.disabled = true;
      }
    }
  }

  refreshHUD();
  renderEquipGrid(); // 배지 업데이트
}

function closeModal(){
  setHidden(modal, true);
  state.modalKey = null;
  renderEquipGrid();
  refreshHUD();
}

/* ---------- battle (canvas) ---------- */
const battle = {
  running:false,
  raf:null,
  ctx:null,
  w:0,h:0,
  gridGap:48,

  player:{
    x:200,y:200,size:34,speed:5
  },
  keys:new Set(),

  lastAttack:0,
  slashes:[], // {x,y,r,theta,start,end,t0,life}
};

function battleWeaponCooldown(){
  if(state.selectedWeapon === "wood_sword") return state.wood_sword_attack_speed;
  return state.club_attack_speed;
}

function battleResize(){
  const rect = battleCanvas.getBoundingClientRect();
  battleCanvas.width = Math.floor(rect.width * devicePixelRatio);
  battleCanvas.height = Math.floor(rect.height * devicePixelRatio);
  battle.ctx = battleCanvas.getContext("2d");
  battle.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  battle.w = rect.width;
  battle.h = rect.height;
  // center player
  battle.player.x = battle.w/2;
  battle.player.y = battle.h/2;
}

function drawGrid(){
  const ctx = battle.ctx;
  const gap = battle.gridGap;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";
  for(let x=0; x<=battle.w; x+=gap){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,battle.h); ctx.stroke();
  }
  for(let y=0; y<=battle.h; y+=gap){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(battle.w,y); ctx.stroke();
  }
}

function spawnSlash(mx,my){
  const px = battle.player.x, py = battle.player.y;
  let dx = mx - px, dy = my - py;
  if(dx===0 && dy===0) dx = 1;

  const theta = Math.atan2(dy, dx);      // 화면 좌표
  const deg = -theta * 180/Math.PI;      // canvas arc용 각 변환은 직접 계산 대신 라디안 사용
  const forward = 46;
  const baseX = px + Math.cos(theta)*forward;
  const baseY = py + Math.sin(theta)*forward;

  const r = 110;
  const startX = baseX;
  const startY = baseY - 34;

  // 파이썬 버전 느낌(위->아래)
  const startAng = (deg - 85) * Math.PI/180;
  const endAng = (deg - 35) * Math.PI/180;

  battle.slashes.push({
    x:startX, y:startY,
    r,
    theta,
    a0:startAng,
    a1:endAng,
    t0: performance.now(),
    life: 200 // ms
  });
}

function drawSlash(s){
  const ctx = battle.ctx;
  const t = clamp((performance.now()-s.t0)/s.life, 0, 1);

  const ang = s.a0 + (s.a1 - s.a0) * t;

  const drop = 60 * t;
  const push = 20 * t;
  const cx = s.x + Math.cos(s.theta)*push;
  const cy = s.y + drop + Math.sin(s.theta)*push;

  // 부채꼴(PIESLICE 느낌)
  const extent = 120 * Math.PI/180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, s.r, ang, ang+extent, false);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  ctx.stroke();
}

function battleLoop(){
  if(!battle.running) return;

  // clear
  battle.ctx.clearRect(0,0,battle.w,battle.h);

  // grid
  drawGrid();

  // movement
  let dx=0, dy=0;
  if(battle.keys.has("w")) dy -= battle.player.speed;
  if(battle.keys.has("s")) dy += battle.player.speed;
  if(battle.keys.has("a")) dx -= battle.player.speed;
  if(battle.keys.has("d")) dx += battle.player.speed;

  if(dx!==0 || dy!==0){
    battle.player.x = clamp(battle.player.x + dx, battle.player.size/2, battle.w - battle.player.size/2);
    battle.player.y = clamp(battle.player.y + dy, battle.player.size/2, battle.h - battle.player.size/2);
  }

  // player
  battle.ctx.fillStyle = "#000";
  battle.ctx.fillRect(
    battle.player.x - battle.player.size/2,
    battle.player.y - battle.player.size/2,
    battle.player.size,
    battle.player.size
  );

  // slashes
  battle.slashes = battle.slashes.filter(s => (performance.now()-s.t0) <= s.life);
  for(const s of battle.slashes) drawSlash(s);

  battle.raf = requestAnimationFrame(battleLoop);
}

function onBattleKeyDown(e){
  const k = (e.key || "").toLowerCase();
  if(["w","a","s","d"].includes(k)) battle.keys.add(k);
}
function onBattleKeyUp(e){
  const k = (e.key || "").toLowerCase();
  battle.keys.delete(k);
}
function onBattlePointerDown(e){
  // 클릭 공격
  const now = performance.now();
  const cd = battleWeaponCooldown()*1000;
  if(now - battle.lastAttack < cd) return;
  battle.lastAttack = now;

  const rect = battleCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  spawnSlash(mx,my);
}

function battleStart(){
  // 선택 체크
  if(!state.selectedCharacter || !state.selectedWeapon){
    showNotice(mainNotice, "캐릭터,주무기를 선택해주세요!");
    showScreen("main");
    return;
  }

  battle.running = true;
  battleResize();
  battle.lastAttack = 0;
  battle.keys.clear();
  battle.slashes = [];

  window.addEventListener("resize", battleResize);
  window.addEventListener("keydown", onBattleKeyDown);
  window.addEventListener("keyup", onBattleKeyUp);
  battleCanvas.addEventListener("pointerdown", onBattlePointerDown);

  battleLoop();
}
function battleStop(){
  if(!battle.running) return;
  battle.running = false;
  if(battle.raf) cancelAnimationFrame(battle.raf);
  battle.raf = null;

  window.removeEventListener("resize", battleResize);
  window.removeEventListener("keydown", onBattleKeyDown);
  window.removeEventListener("keyup", onBattleKeyUp);
  battleCanvas.removeEventListener("pointerdown", onBattlePointerDown);
}

/* ---------- events wiring ---------- */
function init(){
  // start button: 너 HTML에 있는 걸 그대로 이어붙임
  $("#btnStart").addEventListener("click", ()=> showScreen("main"));

  $("#btnShop").addEventListener("click", ()=> showScreen("shop"));
  $("#btnEquip").addEventListener("click", ()=>{
    currentTab = "char";
    setActiveTab("char");
    renderEquipGrid();
    showScreen("equip");
  });
  $("#btnBox").addEventListener("click", ()=> showScreen("box"));
  $("#btnBattle").addEventListener("click", ()=> showScreen("battle"));

  // back buttons (data-back)
  $$(".back").forEach(b=>{
    b.addEventListener("click", ()=>{
      const to = b.getAttribute("data-back") || "main";
      showScreen(to);
    });
  });

  // shop free
  shopFreeCard.addEventListener("click", ()=>{
    if(state.shopFreeIn > 0) return;
    addGems(10);
    startShopCooldown(90);
    openRewardQueue([10], ()=>{ /* stay */ });
    refreshHUD();
  });

  // shop luck
  shopLuckCard.addEventListener("click", ()=>{
    openConfirm("정말로 구매하시겠습니까?", ()=>{
      closeConfirm();
      if(!spendGems(5)){
        showNotice(shopNotice, "크리스탈이 부족합니다!");
        return;
      }
      showNotice(shopNotice, "서버 운 강화를 구매했습니다!");
      startServerLuck(60);
      refreshHUD();
    }, ()=>{
      closeConfirm();
    });
  });

  // box select
  cardNormal.addEventListener("click", ()=>{
    if(!state.free_normal_used){
      state.free_normal_used = true;
      resetUpgrade("normal");
      showScreen("upgrade");
      refreshHUD();
      return;
    }
    if(!spendGems(state.PRICE_NORMAL)){
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    resetUpgrade("normal");
    showScreen("upgrade");
  });

  cardMid.addEventListener("click", ()=>{
    if(!state.free_mid_used){
      state.free_mid_used = true;
      resetUpgrade("mid");
      showScreen("upgrade");
      refreshHUD();
      return;
    }
    if(!spendGems(state.PRICE_MID)){
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    resetUpgrade("mid");
    showScreen("upgrade");
  });

  cardHigh.addEventListener("click", ()=>{
    if(!state.free_high_used){
      state.free_high_used = true;
      resetUpgrade("high");
      showScreen("upgrade");
      refreshHUD();
      return;
    }
    if(!spendGems(state.PRICE_HIGH)){
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    resetUpgrade("high");
    showScreen("upgrade");
  });

  // upgrade tap (✅ pointerdown만 사용해서 중복 탭 방지)
  tapArea.addEventListener("pointerdown", onUpgradeTap);

  // confirm
  confirmYes.addEventListener("click", ()=>{
    if(typeof confirmYesCb === "function") confirmYesCb();
  });
  confirmNo.addEventListener("click", ()=>{
    if(typeof confirmNoCb === "function") confirmNoCb();
    closeConfirm();
  });

  // reward
  $("#reward").addEventListener("click", clickReward);

  // tabs
  $$(".tab").forEach(t=>{
    t.addEventListener("click", ()=>{
      const tab = t.getAttribute("data-tab");
      currentTab = tab;
      setActiveTab(tab);
      renderEquipGrid();
    });
  });

  // modal
  modalClose.addEventListener("click", closeModal);
  btnSelect.addEventListener("click", ()=>{
    const key = state.modalKey;
    if(!key) return;

    if(key==="char"){
      state.selectedCharacter = true;
      openModal("char");
      refreshHUD();
      return;
    }
    if(key==="club"){
      state.selectedWeapon = "club";
      openModal("club");
      refreshHUD();
      return;
    }
    if(key==="wood_sword"){
      if(!state.wood_sword_owned){
        showNotice(modalNotice, "구매 후 선택 가능합니다!");
        return;
      }
      state.selectedWeapon = "wood_sword";
      openModal("wood_sword");
      refreshHUD();
      return;
    }
  });

  btnMainAction.addEventListener("click", ()=>{
    const key = state.modalKey;
    if(!key) return;

    if(key==="char"){
      if(state.char_level >= state.char_level_max){
        showNotice(modalNotice, "이미 맥시멈 레벨입니다!");
        return;
      }
      const cost = charUpgradeCost();
      openConfirm(
        `업그레이드 할까요?\n비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
        ()=>{
          closeConfirm();
          if(!spendGems(cost)){
            showNotice(modalNotice, "크리스탈이 부족합니다!");
            return;
          }
          state.char_level += 1;
          state.char_hp += 0.5;
          state.char_speed += 0.01;
          state.char_stamina += 5;
          openModal("char");
        },
        ()=> closeConfirm()
      );
      return;
    }

    // weapon
    if(key==="wood_sword" && !state.wood_sword_owned){
      openConfirm(
        `목검을 구매하시겠습니까?\n비용: ${state.wood_sword_price} 크리스탈`,
        ()=>{
          closeConfirm();
          if(!spendGems(state.wood_sword_price)){
            showNotice(modalNotice, "크리스탈이 부족합니다!");
            return;
          }
          state.wood_sword_owned = true;
          showNotice(modalNotice, "구매 완료!");
          openModal("wood_sword");
        },
        ()=> closeConfirm()
      );
      return;
    }

    const d = weaponData(key);
    if(!d.can_upgrade){
      showNotice(modalNotice, "이미 맥시멈 레벨입니다!");
      return;
    }

    openConfirm(
      `${d.name} 강화할까요?\n비용: ${d.cost} 크리스탈\n\n추가되는 능력치\n공격력 +0.1\n소모 스테미너 -0.01\n내구도소모 -0.005/번\n총 내구도 +0.5`,
      ()=>{
        closeConfirm();
        if(!spendGems(d.cost)){
          showNotice(modalNotice, "크리스탈이 부족합니다!");
          return;
        }
        if(key==="club"){
          state.club_level += 1;
          state.club_atk += 0.1;
          state.club_stamina_cost -= 0.01;
          state.club_dura_cost -= 0.005;
          state.club_total_dura += 0.5;
          openModal("club");
        }else{
          state.wood_sword_level += 1;
          state.wood_sword_atk += 0.1;
          state.wood_sword_stamina_cost -= 0.01;
          state.wood_sword_dura_cost -= 0.005;
          state.wood_sword_total_dura += 0.5;
          openModal("wood_sword");
        }
        showNotice(modalNotice, "업그레이드 완료!", 900);
      },
      ()=> closeConfirm()
    );
  });

  // battle home
  btnBattleHome.addEventListener("click", ()=>{
    openConfirm("메인화면으로 돌아가겠습니까?", ()=>{
      closeConfirm();
      showScreen("main");
    }, ()=>{
      closeConfirm();
    });
  });

  // 초기
  screens.upgrade.style.background = ""; // 고급에서 바뀌었을 수 있으니
  setHidden(modal, true);
  setHidden(confirm, true);
  setHidden(reward, true);
  showScreen("main");
  refreshHUD();
  renderEquipGrid();
}

function setActiveTab(tab){
  $$(".tab").forEach(b=>{
    b.classList.toggle("active", b.getAttribute("data-tab") === tab);
  });
}

/* start */
init();
