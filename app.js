/* =========================
   상태/유틸
========================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function mmss(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  return `${m}:${s}`;
}

/* =========================
   게임 데이터(원본 Tk 버전 느낌 유지)
========================= */
const state = {
  gems: 0,

  // 상자 가격
  PRICE_NORMAL: 7,
  PRICE_MID: 15,
  PRICE_HIGH: 30,

  // 무료 1회
  free_normal_used: false,
  free_mid_used: false,
  free_high_used: false,

  // 서버럭
  serverLuckIn: 0,
  serverLuckTimer: null,

  // 상점 무료쿨
  shopFreeIn: 0,
  shopFreeTimer: null,

  // 선택 상태
  selected_character: false,
  selected_weapon: null, // "club" | "wood_sword"

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
  club_stamina_cost: 0.10,  // 표시: /번
  club_attack_speed: 1.0,   // 초(쿨다운)
  club_dura_cost: 0.10,
  club_total_dura: 7.0,

  // 목검
  wood_owned: false,
  wood_price: 100,
  wood_level: 1,
  wood_level_max: 10,
  wood_atk: 5.0,
  wood_stamina_cost: 1.5,
  wood_attack_speed: 0.7,
  wood_dura_cost: 0.15,
  wood_total_dura: 10.0,
};

function upgradeCost(level){
  const x = Math.floor(level);
  return x*x + 49;
}

function addGems(n){
  state.gems += n;
  renderHUD();
  renderMain();
  renderShop();
}
function spendGems(n){
  if(state.gems < n) return false;
  state.gems -= n;
  renderHUD();
  renderMain();
  renderShop();
  return true;
}
function serverLuckActive(){ return state.serverLuckIn > 0; }

/* =========================
   화면 전환 (한꺼번에 보이는 문제 방지)
========================= */
const screens = {
  main: $("#screen-main"),
  shop: $("#screen-shop"),
  box: $("#screen-box"),
  upgrade: $("#screen-upgrade"),
  equip: $("#screen-equip"),
  battle: $("#screen-battle"),
};

function showScreen(name){
  Object.entries(screens).forEach(([k, el])=>{
    el.classList.toggle("hidden", k !== name);
  });

  // 테마 HUD 색 느낌(간단)
  const isWhite = (name === "battle");
  $(".hud").style.color = isWhite ? "#000" : "#fff";

  if(name === "battle"){
    startBattle();
  }else{
    stopBattle();
  }
}

/* =========================
   HUD
========================= */
function renderHUD(){
  $("#gemsText").textContent = String(state.gems);

  const line = $("#serverLuckLine");
  if(serverLuckActive()){
    line.classList.remove("hidden");
    $("#serverLuckText").textContent = mmss(state.serverLuckIn);
  }else{
    line.classList.add("hidden");
  }
}

/* =========================
   메인 화면
========================= */
let mainNoticeTO = null;
function mainNotice(msg){
  const el = $("#mainNotice");
  el.textContent = msg;
  clearTimeout(mainNoticeTO);
  mainNoticeTO = setTimeout(()=> el.textContent="", 1400);
}

function renderMain(){
  if(state.selected_character && state.selected_weapon){
    $("#needSelectText").textContent = "선택됨: 네모 / " + (state.selected_weapon==="club" ? "나무몽둥이" : "목검");
  }else{
    $("#needSelectText").textContent = "캐릭터/주무기 선택 필요";
  }

  // 상점 무료면 버튼 강조(노랑)
  const btnShop = $("#btnShop");
  if(state.shopFreeIn <= 0){
    btnShop.style.background = "yellow";
  }else{
    btnShop.style.background = "";
  }
}

/* =========================
   상점
========================= */
let shopNoticeTO = null;
function shopNotice(msg){
  const el = $("#shopNotice");
  el.textContent = msg;
  clearTimeout(shopNoticeTO);
  shopNoticeTO = setTimeout(()=> el.textContent="", 1200);
}

function startShopCooldown(seconds=90){
  clearInterval(state.shopFreeTimer);
  state.shopFreeIn = Math.max(0, Math.floor(seconds));
  state.shopFreeTimer = setInterval(()=>{
    state.shopFreeIn -= 1;
    if(state.shopFreeIn <= 0){
      state.shopFreeIn = 0;
      clearInterval(state.shopFreeTimer);
      state.shopFreeTimer = null;
    }
    renderShop();
    renderMain();
  }, 1000);
}

function startServerLuck(seconds=60){
  clearInterval(state.serverLuckTimer);
  state.serverLuckIn = Math.max(1, Math.floor(seconds));
  state.serverLuckTimer = setInterval(()=>{
    state.serverLuckIn -= 1;
    if(state.serverLuckIn <= 0){
      state.serverLuckIn = 0;
      clearInterval(state.serverLuckTimer);
      state.serverLuckTimer = null;
    }
    renderHUD();
    renderShop();
    renderBox();
  }, 1000);
  renderHUD();
}

function renderShop(){
  // 무료크리
  if(state.shopFreeIn <= 0){
    $("#shopFreeStatus").textContent = "10개";
    $("#shopFreeTimer").textContent = "";
  }else{
    $("#shopFreeStatus").textContent = "이미 받은 아이템입니다";
    $("#shopFreeTimer").textContent = `${mmss(state.shopFreeIn)}초 후 무료`;
  }

  // 서버럭
  $("#shopLuckTimer").textContent = serverLuckActive() ? `${mmss(state.serverLuckIn)} 남음` : "";
}

/* =========================
   상자 선택
========================= */
let boxNoticeTO = null;
function boxNotice(msg){
  const el = $("#boxNotice");
  el.textContent = msg;
  clearTimeout(boxNoticeTO);
  boxNoticeTO = setTimeout(()=> el.textContent="", 1200);
}

function renderBox(){
  $("#priceNormal").textContent = (!state.free_normal_used) ? "무료 1회 남음" : `${state.PRICE_NORMAL} 크리스탈`;
  $("#priceMid").textContent = (!state.free_mid_used) ? "무료 1회 남음" : `${state.PRICE_MID} 크리스탈`;
  $("#priceHigh").textContent = (!state.free_high_used) ? "무료 1회 남음" : `${state.PRICE_HIGH} 크리스탈`;
}

/* =========================
   Confirm / Reward
========================= */
const confirmEl = $("#confirm");
let confirmYes = null;
let confirmNo = null;

function openConfirm(msg, onYes, onNo, theme="blue"){
  $("#confirmMsg").textContent = msg;
  confirmYes = onYes;
  confirmNo = onNo;

  const card = $(".confirm-card");
  if(theme === "green") card.style.background = "var(--green)";
  else if(theme === "pink") card.style.background = "var(--pink)";
  else if(theme === "white") card.style.background = "#fff";
  else card.style.background = "var(--blue)";

  card.style.color = (theme === "white") ? "#000" : "#fff";

  confirmEl.classList.remove("hidden");
}
function closeConfirm(){
  confirmEl.classList.add("hidden");
  confirmYes = null;
  confirmNo = null;
}
$("#confirmYes").addEventListener("click", ()=>{ if(confirmYes) confirmYes(); });
$("#confirmNo").addEventListener("click", ()=>{ if(confirmNo) confirmNo(); });

const rewardEl = $("#reward");
let rewardQueue = [];
function showReward(amount, bgTheme="pink", onDone){
  rewardQueue.push({amount, bgTheme, onDone});
  if(!rewardEl.classList.contains("hidden")) return;
  nextReward();
}
function nextReward(){
  if(rewardQueue.length === 0){
    rewardEl.classList.add("hidden");
    return;
  }
  const {amount, bgTheme} = rewardQueue[0];
  $("#rewardText").textContent = `크리스탈 ${amount}개를 획득했습니다!`;

  const card = $(".reward-card");
  if(bgTheme === "green") card.style.background = "var(--green)";
  else if(bgTheme === "blue") card.style.background = "var(--blue)";
  else if(bgTheme === "purple") card.style.background = "var(--purple)";
  else card.style.background = "var(--pink)";

  rewardEl.classList.remove("hidden");
}
rewardEl.addEventListener("click", ()=>{
  if(rewardQueue.length === 0) return;
  const item = rewardQueue.shift();
  rewardEl.classList.add("hidden");
  addGems(item.amount);
  setTimeout(()=>{
    if(typeof item.onDone === "function") item.onDone();
    nextReward();
  }, 10);
});

/* =========================
   업그레이드(일반/중급/고급) 하나의 화면으로 처리
========================= */
const upgradeUI = {
  tapHint: $("#tapHint"),
  title: $("#upgradeTitle"),
  tapArea: $("#tapArea"),
  boxA: $("#boxA"),
  boxB: $("#boxB"),
  dots: $("#dots"),
};

let upgradeMode = null; // "normal" | "mid" | "high"
let uStage = null;
let uFilled = 3;
let uOpenReady = false;
let uSplitDone = false;
let uTwo = false;

function resetUpgrade(mode){
  upgradeMode = mode;
  uFilled = 3;
  uOpenReady = false;
  uSplitDone = false;
  uTwo = false;

  if(mode === "normal") uStage = "브론즈";
  if(mode === "mid") uStage = 1; // star
  if(mode === "high") uStage = "희귀";

  // 박스 이모지
  if(mode === "normal"){
    upgradeUI.boxA.textContent = "📦";
    upgradeUI.boxB.textContent = "📦";
  }else if(mode === "mid"){
    upgradeUI.boxA.textContent = "🎁";
    upgradeUI.boxB.textContent = "🎁";
  }else{
    upgradeUI.boxA.textContent = "🧰";
    upgradeUI.boxB.textContent = "🧰";
  }

  // 탭힌트 보이기
  upgradeUI.tapHint.classList.remove("hidden");
  renderUpgrade();
}

function dotsText(){
  const arr = [];
  for(let i=0;i<3;i++) arr.push(i<uFilled ? "●" : "○");
  return arr.join(" ");
}

function splitProb(){
  return serverLuckActive() ? 0.15 : 0.10;
}

function renderUpgrade(){
  // 타이틀
  if(upgradeMode === "mid"){
    upgradeUI.title.textContent = "★".repeat(uStage);
  }else{
    upgradeUI.title.textContent = String(uStage);
  }

  // dots
  upgradeUI.dots.textContent = uOpenReady ? "" : dotsText();

  // 2개 상자 표시
  upgradeUI.boxB.classList.toggle("hidden", !uTwo);

  // 열 준비면 박스 크기 크게
  const size = uOpenReady ? "132px" : "92px";
  upgradeUI.boxA.style.fontSize = size;
  upgradeUI.boxB.style.fontSize = size;

  // 고급은 단계별 배경 변경
  if(upgradeMode === "high"){
    const bgMap = {
      "희귀":"#1aa84b",
      "초희귀":"#1f5fbf",
      "영웅":"#7a2cff",
      "신화":"#ff2b2b",
      "전설":"#ffd400",
      "울트라 전설":"#ffffff",
    };
    const bg = bgMap[uStage] || state.PINK_BG;
    screens.upgrade.style.background = bg;
    const fg = (bg.toLowerCase()==="#ffffff") ? "#000" : "#fff";
    screens.upgrade.style.color = fg;
    upgradeUI.tapArea.style.borderColor = (fg==="#000") ? "rgba(0,0,0,.7)" : "rgba(255,255,255,.85)";
    upgradeUI.tapHint.style.color = fg;
    upgradeUI.title.style.color = fg;
    upgradeUI.dots.style.color = fg;
    upgradeUI.boxA.style.color = fg;
    upgradeUI.boxB.style.color = fg;
  }else{
    screens.upgrade.style.background = "var(--pink)";
    screens.upgrade.style.color = "#fff";
    upgradeUI.tapArea.style.borderColor = "rgba(255,255,255,.85)";
    upgradeUI.tapHint.style.color = "#fff";
    upgradeUI.title.style.color = "#fff";
    upgradeUI.dots.style.color = "#fff";
    upgradeUI.boxA.style.color = "#fff";
    upgradeUI.boxB.style.color = "#fff";
  }
}

function normalReward(){
  const map = {"브론즈":1,"실버":2,"골드":3,"에메랄드":5,"다이아":7,"레드 다이아":10};
  return map[uStage] ?? 1;
}
function normalNextProb(){
  let nxt=null, p=0;
  if(uStage==="브론즈"){ nxt="실버"; p=0.70; }
  else if(uStage==="실버"){ nxt="골드"; p=0.60; }
  else if(uStage==="골드"){ nxt="에메랄드"; p=0.50; }
  else if(uStage==="에메랄드"){ nxt="다이아"; p=0.30; }
  else if(uStage==="다이아"){ nxt="레드 다이아"; p=0.10; }
  if(serverLuckActive()) p = Math.min(1, p+0.05);
  return [nxt, p];
}

function midReward(){
  const map = {1:7,2:10,3:15,4:25,5:37};
  return map[uStage] ?? 7;
}
function midProb(){
  let p = 0;
  if(uStage===1) p=0.35;
  else if(uStage===2) p=0.25;
  else if(uStage===3) p=0.15;
  else if(uStage===4) p=0.05;
  if(serverLuckActive()) p = Math.min(1, p+0.05);
  return p;
}

function highReward(){
  const map = {"희귀":20,"초희귀":25,"영웅":30,"신화":50,"전설":100,"울트라 전설":300};
  return map[uStage] ?? 20;
}
function highNextProb(){
  let nxt=null, p=0;
  if(uStage==="희귀"){ nxt="초희귀"; p=0.75; }
  else if(uStage==="초희귀"){ nxt="영웅"; p=0.50; }
  else if(uStage==="영웅"){ nxt="신화"; p=0.35; }
  else if(uStage==="신화"){ nxt="전설"; p=0.15; }
  else if(uStage==="전설"){ nxt="울트라 전설"; p=0.05; }
  if(serverLuckActive()) p = Math.min(1, p+0.05);
  return [nxt, p];
}

function onTapUpgrade(){
  // 첫 탭이면 힌트 제거
  if(!upgradeUI.tapHint.classList.contains("hidden")){
    upgradeUI.tapHint.classList.add("hidden");
  }

  if(uOpenReady){
    const times = uTwo ? 2 : 1;
    const amt = (upgradeMode==="normal") ? normalReward()
            : (upgradeMode==="mid") ? midReward()
            : highReward();

    // ✅ 보상 다 받고 나면 박스 선택 화면으로 “바로” 돌아가게
    for(let i=0;i<times;i++){
      showReward(amt, (upgradeMode==="high" && uStage==="울트라 전설") ? "white" : "pink", (i===times-1) ? ()=>{
        showScreen("box");
        renderBox();
      } : null);
    }
    return;
  }

  // 분열 확률
  if(!uSplitDone && Math.random() < splitProb()){
    uTwo = true;
    uSplitDone = true;
    uFilled = 3;
    renderUpgrade();
    return;
  }

  // 동그라미는 “1개씩만” 감소
  uFilled = Math.max(0, uFilled - 1);

  // 단계 업
  if(upgradeMode === "normal"){
    const [nxt, p] = normalNextProb();
    if(nxt && Math.random() < p){
      uStage = nxt;
      uFilled = 3;
      uOpenReady = false;
      renderUpgrade();
      return;
    }
  }else if(upgradeMode === "mid"){
    if(uStage < 5 && Math.random() < midProb()){
      uStage += 1;
      uFilled = 3;
      uOpenReady = false;
      renderUpgrade();
      return;
    }
  }else{
    const [nxt, p] = highNextProb();
    if(nxt && Math.random() < p){
      uStage = nxt;
      uFilled = 3;
      uOpenReady = false;
      renderUpgrade();
      return;
    }
  }

  if(uFilled === 0){
    uOpenReady = true;
    renderUpgrade();
    return;
  }

  renderUpgrade();
}

/* =========================
   장비(탭/슬롯/상세)
========================= */
const equip = {
  tab: "char",
  grid: $("#equipGrid"),
  modal: $("#modal"),
  modalTitle: $("#modalTitle"),
  modalBig: $("#modalBig"),
  modalDesc: $("#modalDesc"),
  modalStats: $("#modalStats"),
  modalNotice: $("#modalNotice"),
  btnSelect: $("#btnSelect"),
  btnMainAction: $("#btnMainAction"),
  currentKey: null, // "char"|"club"|"wood"
};

function openModal(theme="green"){
  // 배경 테마
  const card = $(".modal-card");
  if(theme === "blue") card.style.background = "var(--blue)";
  else if(theme === "pink") card.style.background = "var(--pink)";
  else card.style.background = "var(--green)";
  equip.modal.classList.remove("hidden");
}
function closeModal(){
  equip.modal.classList.add("hidden");
  equip.currentKey = null;
  equip.modalNotice.textContent = "";
}

function modalNotice(msg){
  equip.modalNotice.textContent = msg;
  setTimeout(()=> equip.modalNotice.textContent="", 1200);
}

function weaponData(key){
  if(key === "club"){
    return {
      owned: true,
      name: "나무몽둥이",
      emoji: "🪵",
      desc: "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다.",
      level: state.club_level,
      max: state.club_level_max,
      atk: state.club_atk,
      stam: state.club_stamina_cost,
      spd: state.club_attack_speed,
      dura: state.club_dura_cost,
      total: state.club_total_dura,
      canUpgrade: state.club_level < state.club_level_max,
      cost: upgradeCost(state.club_level),
    };
  }
  return {
    owned: state.wood_owned,
    name: "목검",
    emoji: "🗡️",
    desc: "초보자용 무기로 가격이 쌉니다.\n나무몽둥이보단 좋지만 여전히 데미지와 내구도가 적습니다.",
    level: state.wood_level,
    max: state.wood_level_max,
    atk: state.wood_atk,
    stam: state.wood_stamina_cost,
    spd: state.wood_attack_speed,
    dura: state.wood_dura_cost,
    total: state.wood_total_dura,
    canUpgrade: state.wood_owned && (state.wood_level < state.wood_level_max),
    cost: upgradeCost(state.wood_level),
  };
}

function renderEquip(){
  // 탭 버튼
  $$(".tab").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.tab === equip.tab);
  });

  equip.grid.innerHTML = "";

  const makeSlot = ({emoji, name, levelText="", statusText="", onClick})=>{
    const div = document.createElement("div");
    div.className = "slot";
    div.innerHTML = `
      <div class="slot-level">${levelText}</div>
      <div class="slot-emo">${emoji}</div>
      <div class="slot-name">${name}</div>
      <div class="slot-status">${statusText}</div>
    `;
    div.addEventListener("click", onClick);
    return div;
  };

  if(equip.tab === "char"){
    equip.grid.appendChild(makeSlot({
      emoji:"⬛",
      name:"네모",
      levelText:String(state.char_level),
      statusText:(state.char_level >= state.char_level_max ? "맥시멈 레벨" : ""),
      onClick: ()=> openCharDetail()
    }));
    // 빈칸 4개
    for(let i=0;i<4;i++){
      equip.grid.appendChild(makeSlot({emoji:"🙂", name:"", onClick: ()=>{} }));
    }
  }
  else if(equip.tab === "mainw"){
    // club
    equip.grid.appendChild(makeSlot({
      emoji:"🪵",
      name:"나무몽둥이",
      levelText:String(state.club_level),
      statusText:(state.club_level>=state.club_level_max ? "맥시멈 레벨" : ""),
      onClick: ()=> openWeaponDetail("club")
    }));
    // wood sword
    equip.grid.appendChild(makeSlot({
      emoji:"🗡️",
      name:"목검",
      levelText:(state.wood_owned ? String(state.wood_level) : ""),
      statusText:(state.wood_owned ? (state.wood_level>=state.wood_level_max ? "맥시멈 레벨" : "") : `구매:${state.wood_price}크리스탈`),
      onClick: ()=> openWeaponDetail("wood")
    }));
    // 빈칸 3개
    for(let i=0;i<3;i++){
      equip.grid.appendChild(makeSlot({emoji:"⚔️", name:"", onClick: ()=>{} }));
    }
  }
  else if(equip.tab === "subw"){
    for(let i=0;i<5;i++){
      equip.grid.appendChild(makeSlot({emoji:"🛡️", name:"", onClick: ()=>{} }));
    }
  }
  else{
    for(let i=0;i<5;i++){
      equip.grid.appendChild(makeSlot({emoji:"🔮", name:"", onClick: ()=>{} }));
    }
  }
}

function openCharDetail(){
  equip.currentKey = "char";
  equip.modalTitle.textContent = "네모";
  equip.modalBig.textContent = "⬛";
  equip.modalDesc.textContent = "기본캐릭터";
  equip.modalStats.innerHTML = `
    <div>레벨: ${state.char_level}</div>
    <div>체력: ${fmt2(state.char_hp)}</div>
    <div>이동속도: ${fmt2(state.char_speed)}</div>
    <div>스테미너: ${Math.floor(state.char_stamina)}</div>
  `;

  // 선택 버튼
  equip.btnSelect.textContent = state.selected_character ? "선택됨" : "선택";
  equip.btnSelect.disabled = !!state.selected_character;

  // 업그레이드 버튼
  if(state.char_level < state.char_level_max){
    const cost = upgradeCost(state.char_level);
    equip.btnMainAction.textContent = `업그레이드하기: ${cost} 크리스탈`;
    equip.btnMainAction.disabled = false;
  }else{
    equip.btnMainAction.textContent = "맥시멈 레벨";
    equip.btnMainAction.disabled = true;
  }

  equip.btnSelect.onclick = ()=>{
    state.selected_character = true;
    closeModal();
    renderMain();
  };

  equip.btnMainAction.onclick = ()=>{
    if(state.char_level >= state.char_level_max){
      modalNotice("이미 맥시멈 레벨입니다!");
      return;
    }
    const cost = upgradeCost(state.char_level);
    openConfirm(
      `업그레이드 할까요?\n비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
      ()=>{
        closeConfirm();
        if(!spendGems(cost)){
          modalNotice("크리스탈이 부족합니다!");
          return;
        }
        state.char_level += 1;
        state.char_hp += 0.5;
        state.char_speed += 0.01;
        state.char_stamina += 5;
        openCharDetail();
        renderEquip();
        modalNotice("업그레이드 완료!");
      },
      ()=> closeConfirm(),
      "green"
    );
  };

  openModal("green");
}

function fmt2(n){
  // Tk 버전처럼 끝 0 정리
  const s = (Math.round(n*100)/100).toString();
  return s;
}

function openWeaponDetail(which){
  // which: "club" | "wood"
  const key = (which === "club") ? "club" : "wood";
  equip.currentKey = key;

  const d = weaponData(key === "club" ? "club" : "wood");

  equip.modalTitle.textContent = d.name;
  equip.modalBig.textContent = d.emoji;
  equip.modalDesc.textContent = d.desc;

  // ✅ 목검은 구매 안 해도 “스텟은 무조건 보여줌”
  equip.modalStats.innerHTML = `
    <div>레벨: ${d.level}</div>
    <div>공격력: ${fmt2(d.atk)}</div>
    <div>소모 스테미너: ${fmt2(d.stam)}/번</div>
    <div>공격 속도: ${fmt2(d.spd)}초</div>
    <div>내구도소모: ${trim3(d.dura)}/번</div>
    <div>총 내구도: ${fmt2(d.total)}</div>
  `;

  // 선택 버튼
  const canSelect = (key === "club") || (key === "wood" && state.wood_owned);
  equip.btnSelect.textContent = (state.selected_weapon === (key==="club"?"club":"wood_sword")) ? "선택됨" : "선택";
  equip.btnSelect.disabled = (state.selected_weapon === (key==="club"?"club":"wood_sword"));
  equip.btnSelect.onclick = ()=>{
    if(!canSelect){
      modalNotice("구매 후 선택 가능합니다!");
      return;
    }
    state.selected_weapon = (key==="club") ? "club" : "wood_sword";
    closeModal();
    renderMain();
  };

  // 메인 액션 버튼(구매/업그레이드)
  if(key === "wood" && !state.wood_owned){
    equip.btnMainAction.textContent = `구매:${state.wood_price}크리스탈`;
    equip.btnMainAction.disabled = false;
    equip.btnMainAction.onclick = ()=>{
      openConfirm(
        `목검을 구매하시겠습니까?\n비용: ${state.wood_price} 크리스탈`,
        ()=>{
          closeConfirm();
          // ✅ 크리스탈 부족해도 "구매하시겠습니까" 창은 뜨고, 예 누르면 부족 알림
          if(!spendGems(state.wood_price)){
            modalNotice("크리스탈이 부족합니다!");
            return;
          }
          state.wood_owned = true;
          modalNotice("구매 완료!");
          openWeaponDetail("wood");
          renderEquip();
        },
        ()=> closeConfirm(),
        "green"
      );
    };
  }else{
    if(d.canUpgrade){
      equip.btnMainAction.textContent = `업그레이드하기: ${d.cost} 크리스탈`;
      equip.btnMainAction.disabled = false;
      equip.btnMainAction.onclick = ()=>{
        openConfirm(
          `${d.name} 강화할까요?\n비용: ${d.cost} 크리스탈\n\n추가되는 능력치\n공격력 +0.1\n소모 스테미너 -0.01\n내구도소모 -0.005/번\n총 내구도 +0.5`,
          ()=>{
            closeConfirm();
            if(!spendGems(d.cost)){
              modalNotice("크리스탈이 부족합니다!");
              return;
            }
            if(key === "club"){
              state.club_level += 1;
              state.club_atk += 0.1;
              state.club_stamina_cost -= 0.01;
              state.club_dura_cost -= 0.005;
              state.club_total_dura += 0.5;
            }else{
              state.wood_level += 1;
              state.wood_atk += 0.1;
              state.wood_stamina_cost -= 0.01;
              state.wood_dura_cost -= 0.005;
              state.wood_total_dura += 0.5;
            }
            modalNotice("업그레이드 완료!");
            openWeaponDetail(which);
            renderEquip();
          },
          ()=> closeConfirm(),
          "green"
        );
      };
    }else{
      equip.btnMainAction.textContent = "맥시멈 레벨";
      equip.btnMainAction.disabled = true;
      equip.btnMainAction.onclick = ()=>{};
    }
  }

  openModal("green");
}

function trim3(n){
  // 0.150 -> 0.15 느낌
  let s = (Math.round(n*1000)/1000).toString();
  return s;
}

/* =========================
   전투 시스템 (WASD + 클릭 슬래쉬)
========================= */
const battle = {
  canvas: $("#battleCanvas"),
  ctx: null,
  running: false,
  keys: new Set(),

  player: {x:200, y:200, size:34, speed:5},
  grid: {gap:48, w:1},

  lastAttack: 0,
  slashes: [], // {t0, life, cx, cy, r, start, extent, theta}
  raf: 0,
};

function weaponCooldown(){
  if(state.selected_weapon === "wood_sword") return state.wood_attack_speed;
  return state.club_attack_speed;
}

function resizeBattle(){
  const c = battle.canvas;
  const rect = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.floor(rect.width * dpr);
  c.height = Math.floor(rect.height * dpr);
  const ctx = battle.ctx;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function drawGrid(){
  const ctx = battle.ctx;
  const w = battle.canvas.getBoundingClientRect().width;
  const h = battle.canvas.getBoundingClientRect().height;
  ctx.lineWidth = battle.grid.w;
  ctx.strokeStyle = "#000";
  const gap = battle.grid.gap;
  for(let x=0; x<=w; x+=gap){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
  }
  for(let y=0; y<=h; y+=gap){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
}

function drawPlayer(){
  const ctx = battle.ctx;
  const p = battle.player;
  ctx.fillStyle = "#000";
  ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
}

function spawnSlash(mx,my){
  const p = battle.player;
  let dx = mx - p.x;
  let dy = my - p.y;
  if(dx === 0 && dy === 0) dx = 1;

  const theta = Math.atan2(dy, dx);
  const deg = -theta * 180 / Math.PI;

  const forward = 46;
  const baseCx = p.x + Math.cos(theta)*forward;
  const baseCy = p.y + Math.sin(theta)*forward;

  const r = 110;

  const startCx = baseCx;
  const startCy = baseCy - 34;

  const startAngle = deg - 85;
  const endAngle = deg - 35;

  battle.slashes.push({
    t0: performance.now(),
    life: 200,
    startAngle,
    endAngle,
    extent: 120,
    theta,
    r,
    startCx,
    startCy
  });
}

function drawSlashes(){
  const ctx = battle.ctx;
  const now = performance.now();

  battle.slashes = battle.slashes.filter(s => (now - s.t0) <= s.life);

  for(const s of battle.slashes){
    const t = clamp((now - s.t0)/s.life, 0, 1);
    const ang = s.startAngle + (s.endAngle - s.startAngle)*t;

    const drop = 60 * t;
    let cx = s.startCx;
    let cy = s.startCy + drop;

    const push = 20 * t;
    cx += Math.cos(s.theta)*push;
    cy += Math.sin(s.theta)*push;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;

    // canvas arc는 라디안 (0=오른쪽, 시계방향이 양수)인데,
    // 우리는 Tk 느낌만 살리면 돼서 “대충” 비슷하게 구현
    const a0 = (-ang) * Math.PI/180;
    const a1 = (-(ang + s.extent)) * Math.PI/180;

    ctx.arc(cx, cy, s.r, a0, a1, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function movePlayer(){
  const p = battle.player;
  let dx=0, dy=0;
  if(battle.keys.has("w")) dy -= p.speed;
  if(battle.keys.has("s")) dy += p.speed;
  if(battle.keys.has("a")) dx -= p.speed;
  if(battle.keys.has("d")) dx += p.speed;

  if(dx===0 && dy===0) return;

  const rect = battle.canvas.getBoundingClientRect();
  const half = p.size/2;
  p.x = clamp(p.x + dx, half, rect.width - half);
  p.y = clamp(p.y + dy, half, rect.height - half);
}

function loopBattle(){
  if(!battle.running) return;

  const ctx = battle.ctx;
  const rect = battle.canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);

  drawGrid();
  movePlayer();
  drawSlashes();
  drawPlayer();

  battle.raf = requestAnimationFrame(loopBattle);
}

function startBattle(){
  if(battle.running) return;

  battle.ctx = battle.canvas.getContext("2d");
  battle.running = true;

  // 캔버스가 section 전체를 채우게
  const sec = screens.battle;
  sec.style.padding = "0";

  // 사이즈
  resizeBattle();
  window.addEventListener("resize", resizeBattle);

  // 플레이어 중앙 배치
  const rect = battle.canvas.getBoundingClientRect();
  battle.player.x = rect.width/2;
  battle.player.y = rect.height/2;

  // 키 바인딩
  battle.keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // 클릭 공격
  battle.canvas.addEventListener("pointerdown", onBattleClick);

  loopBattle();
}

function stopBattle(){
  if(!battle.running) return;
  battle.running = false;
  cancelAnimationFrame(battle.raf);
  battle.raf = 0;

  battle.slashes = [];
  battle.keys.clear();

  window.removeEventListener("resize", resizeBattle);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  battle.canvas.removeEventListener("pointerdown", onBattleClick);
}

function onKeyDown(e){
  const k = (e.key||"").toLowerCase();
  if(["w","a","s","d"].includes(k)) battle.keys.add(k);
}
function onKeyUp(e){
  const k = (e.key||"").toLowerCase();
  battle.keys.delete(k);
}

function onBattleClick(e){
  const now = performance.now();
  const cd = weaponCooldown()*1000;
  if(now - battle.lastAttack < cd) return;
  battle.lastAttack = now;

  const rect = battle.canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  spawnSlash(mx,my);
}

/* =========================
   이벤트 연결
========================= */
// 공용 back 버튼들
$$(".back").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const to = btn.dataset.back;
    if(to === "main") showScreen("main");
  });
});

// 메인 버튼
$("#btnStart").addEventListener("click", ()=> showScreen("main"));
$("#btnShop").addEventListener("click", ()=>{
  showScreen("shop");
  renderShop();
});
$("#btnEquip").addEventListener("click", ()=>{
  showScreen("equip");
  renderEquip();
});
$("#btnBox").addEventListener("click", ()=>{
  showScreen("box");
  renderBox();
});

// 전투 시작
$("#btnBattle").addEventListener("click", ()=>{
  if(!state.selected_character || !state.selected_weapon){
    mainNotice("캐릭터,주무기를 선택해주세요!");
    return;
  }
  showScreen("battle");
});

// 전투 홈 버튼
$("#btnBattleHome").addEventListener("click", ()=>{
  openConfirm(
    "메인화면으로 돌아가겠습니까?",
    ()=>{ closeConfirm(); showScreen("main"); },
    ()=> closeConfirm(),
    "white"
  );
});

// 상점 클릭
$("#shopFreeCard").addEventListener("click", ()=>{
  if(state.shopFreeIn > 0) return;
  addGems(10);
  startShopCooldown(90);
  showReward(10, "blue", null);
  renderShop();
});
$("#shopLuckCard").addEventListener("click", ()=>{
  openConfirm(
    "정말로 구매하시겠습니까?",
    ()=>{
      closeConfirm();
      if(!spendGems(5)){
        shopNotice("크리스탈이 부족합니다!");
        return;
      }
      shopNotice("서버 운 강화를 구매했습니다!");
      startServerLuck(60);
    },
    ()=> closeConfirm(),
    "blue"
  );
});

// 박스 선택
$("#cardNormal").addEventListener("click", ()=>{
  if(!state.free_normal_used){
    state.free_normal_used = true;
    showScreen("upgrade");
    resetUpgrade("normal");
    return;
  }
  if(!spendGems(state.PRICE_NORMAL)){
    boxNotice("크리스탈이 부족합니다!");
    return;
  }
  showScreen("upgrade");
  resetUpgrade("normal");
});
$("#cardMid").addEventListener("click", ()=>{
  if(!state.free_mid_used){
    state.free_mid_used = true;
    showScreen("upgrade");
    resetUpgrade("mid");
    return;
  }
  if(!spendGems(state.PRICE_MID)){
    boxNotice("크리스탈이 부족합니다!");
    return;
  }
  showScreen("upgrade");
  resetUpgrade("mid");
});
$("#cardHigh").addEventListener("click", ()=>{
  if(!state.free_high_used){
    state.free_high_used = true;
    showScreen("upgrade");
    resetUpgrade("high");
    return;
  }
  if(!spendGems(state.PRICE_HIGH)){
    boxNotice("크리스탈이 부족합니다!");
    return;
  }
  showScreen("upgrade");
  resetUpgrade("high");
});

// 업그레이드 탭 영역 클릭
upgradeUI.tapArea.addEventListener("click", onTapUpgrade);
$("#screen-upgrade").addEventListener("click", (e)=>{
  // 화면 다른 곳 눌러도 탭되게(원본처럼)
  if(e.target.id === "screen-upgrade") onTapUpgrade();
});

// 장비 탭 클릭
$$(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    equip.tab = btn.dataset.tab;
    renderEquip();
  });
});

// 모달
$("#modalClose").addEventListener("click", closeModal);

// confirm 외부 클릭 막고 싶으면 여기서 처리 가능(지금은 버튼만)
confirmEl.addEventListener("click", (e)=>{
  if(e.target === confirmEl) { /* 밖 클릭 무시 */ }
});

/* =========================
   초기 렌더
========================= */
function init(){
  // 처음은 메인
  showScreen("main");
  renderHUD();
  renderMain();
  renderShop();
  renderBox();
  renderEquip();
}
init();
