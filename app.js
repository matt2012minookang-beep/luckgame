// =========================
// 상태
// =========================
const state = {
  screen: "title", // title, game, shop, box, equip, normal, mid, high, charDetail
  prevStack: [],

  gems: 0,

  // 서버럭
  serverLuckLeft: 0, // seconds
  luckTimer: null,

  // 상점 무료 크리스탈
  shopFreeLeft: 0,
  shopFreeTimer: null,

  // 무료 1회 (일반/중급/고급)
  freeNormalUsed: false,
  freeMidUsed: false,
  freeHighUsed: false,

  // 캐릭터
  charLevel: 1,
  charLevelMax: 10,
  hp: 1.5,
  speed: 1.0,
  stamina: 50,

  // 장비 탭
  equipTab: 0, // 0 캐릭터 1 주무기 2 보조무기 3 유물

  // 뽑기(공용)
  draw: null, // draw object for current upgrade screen

  // 보상 큐
  rewardQueue: [],
};

// =========================
// DOM
// =========================
const screenRoot = document.getElementById("screenRoot");
const topbar = document.getElementById("topbar");
const backBtn = document.getElementById("backBtn");
const topTitle = document.getElementById("topTitle");
const topSub = document.getElementById("topSub");
const gemsVal = document.getElementById("gemsVal");
const toast = document.getElementById("toast");

const rewardOverlay = document.getElementById("rewardOverlay");
const rewardText = document.getElementById("rewardText");

const inlineConfirm = document.getElementById("inlineConfirm");
const confirmTitle = document.getElementById("confirmTitle");
const confirmDesc = document.getElementById("confirmDesc");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

rewardOverlay.addEventListener("click", () => {
  if (state.rewardQueue.length === 0) {
    hideReward();
    return;
  }
  const amt = state.rewardQueue.shift();
  addGems(amt);
  if (state.rewardQueue.length === 0) {
    hideReward();
    navigate("box", true); // 보상 끝나면 상자선택으로
  } else {
    showReward(state.rewardQueue[0]);
  }
});

confirmNo.addEventListener("click", () => closeInlineConfirm());
confirmYes.addEventListener("click", () => { /* set dynamically */ });

backBtn.addEventListener("click", () => goBack());

// =========================
// 유틸
// =========================
function fmtMMSS(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function setTopTheme(bg) {
  topbar.style.background = bg;
  screenRoot.style.background = bg;
}

function serverLuckActive() {
  return state.serverLuckLeft > 0;
}

function applyThemeForMainScreens() {
  // 서버럭이면 메인/상점/상자선택만 보라색(장비/뽑기화면은 제외)
  const mainLike = (state.screen === "game" || state.screen === "shop" || state.screen === "box");
  if (serverLuckActive() && mainLike) {
    setTopTheme("var(--purple)");
  } else {
    // 기본: screen별 배경
    if (state.screen === "shop") setTopTheme("var(--blue)");
    else if (state.screen === "box" || state.screen === "normal" || state.screen === "mid") setTopTheme("var(--pink)");
    else if (state.screen === "high") {
      // 고급은 stage별로 별도 처리 (renderHigh에서 setTopTheme 호출)
    } else setTopTheme("var(--green)");
  }
}

function showToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 1200);
}

function updateCurrency() {
  gemsVal.textContent = String(state.gems);
}

function addGems(n) {
  state.gems += n;
  updateCurrency();
}

function spendGems(n) {
  if (state.gems < n) return false;
  state.gems -= n;
  updateCurrency();
  return true;
}

function showReward(amount) {
  rewardText.textContent = `크리스탈 ${amount}개를 획득했습니다!`;
  rewardOverlay.hidden = false;
}

function hideReward() {
  rewardOverlay.hidden = true;
}

function openInlineConfirm(title, desc, onYes) {
  confirmTitle.textContent = title;
  confirmDesc.textContent = desc;
  inlineConfirm.hidden = false;
  confirmYes.onclick = onYes;
}

function closeInlineConfirm() {
  inlineConfirm.hidden = true;
  confirmYes.onclick = null;
}

// =========================
// 네비게이션
// =========================
function navigate(screen, replace=false) {
  if (!replace) state.prevStack.push(state.screen);
  state.screen = screen;

  // 뽑기 화면 들어갈 때 draw 세팅
  if (screen === "normal") initNormalDraw();
  if (screen === "mid") initMidDraw();
  if (screen === "high") initHighDraw();

  render();
}

function goBack() {
  if (state.prevStack.length === 0) return;
  state.screen = state.prevStack.pop();
  render();
}

// 뒤로가기 버튼 표시 규칙
function setHeader(title, sub="", showBack=false) {
  topTitle.textContent = title;
  if (sub) {
    topSub.textContent = sub;
    topSub.hidden = false;
  } else {
    topSub.hidden = true;
  }
  backBtn.hidden = !showBack;
}

// =========================
// 서버럭(1분) 타이머
// =========================
function startServerLuck(seconds=60) {
  if (state.luckTimer) clearInterval(state.luckTimer);
  state.serverLuckLeft = seconds;
  state.luckTimer = setInterval(() => {
    state.serverLuckLeft -= 1;
    if (state.serverLuckLeft <= 0) {
      state.serverLuckLeft = 0;
      clearInterval(state.luckTimer);
      state.luckTimer = null;
    }
    render(); // 표시 갱신
  }, 1000);
}

// =========================
// 상점 무료 크리스탈 쿨다운(90초)
// =========================
function startShopFreeCooldown(seconds=90) {
  if (state.shopFreeTimer) clearInterval(state.shopFreeTimer);
  state.shopFreeLeft = seconds;
  state.shopFreeTimer = setInterval(() => {
    state.shopFreeLeft -= 1;
    if (state.shopFreeLeft <= 0) {
      state.shopFreeLeft = 0;
      clearInterval(state.shopFreeTimer);
      state.shopFreeTimer = null;
    }
    render();
  }, 1000);
}

// =========================
// 렌더 helper
// =========================
function el(tag, className="", html="") {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

function clearRoot() {
  screenRoot.innerHTML = "";
}

// =========================
// 화면들
// =========================
function renderTitle() {
  applyThemeForMainScreens();
  setHeader("운빨겜!", "", false);

  const col = el("div", "centerCol");
  col.appendChild(el("div", "bigTitle", "운빨겜!"));
  const btn = el("button", "btn btn-white");
  btn.textContent = "게임 시작!";
  btn.onclick = () => navigate("game");
  const wrap = el("div", "panel");
  wrap.appendChild(btn);
  col.appendChild(wrap);

  clearRoot();
  screenRoot.appendChild(col);
}

function renderGame() {
  applyThemeForMainScreens();
  setHeader("운빨겜!", serverLuckActive() ? `서버럭: ${fmtMMSS(state.serverLuckLeft)} 남음` : "", false);

  const col = el("div", "centerCol");

  const row = el("div", "cardRow");
  const shop = el("button", "btn");
  shop.textContent = "상점";
  if (state.shopFreeLeft <= 0) shop.className = "btn btn-yellow";
  else shop.className = "btn btn-white";
  shop.onclick = () => navigate("shop");
  row.appendChild(shop);

  const equip = el("button", "btn btn-white");
  equip.textContent = "장비";
  equip.onclick = () => navigate("equip");
  row.appendChild(equip);

  col.appendChild(row);

  const panel = el("div", "panel");
  const boxBtn = el("button", "btn btn-white");
  boxBtn.textContent = "상자 뽑기!";
  boxBtn.onclick = () => navigate("box");
  panel.appendChild(boxBtn);

  const battleBtn = el("button", "btn btn-white");
  battleBtn.textContent = "전투시작!";
  battleBtn.onclick = () => showToast("전투 기능은 준비중입니다!");
  panel.appendChild(battleBtn);

  col.appendChild(panel);

  clearRoot();
  screenRoot.appendChild(col);
}

function renderShop() {
  applyThemeForMainScreens();
  setHeader("상점", serverLuckActive() ? `서버럭: ${fmtMMSS(state.serverLuckLeft)} 남음` : "", true);

  const col = el("div", "centerCol");

  const row = el("div", "cardRow");

  // 무료 크리스탈 카드
  const freeCard = el("div", "card");
  freeCard.appendChild(el("div", "emoji", "💎"));
  freeCard.appendChild(el("div", "name", "크리스탈"));
  const freeStatus = el("div", "price");
  const freeSmall = el("div", "small");

  if (state.shopFreeLeft <= 0) {
    freeStatus.textContent = "10개";
    freeSmall.textContent = "";
  } else {
    freeStatus.textContent = "이미 받은 아이템입니다";
    freeSmall.textContent = `${fmtMMSS(state.shopFreeLeft)}초 후 무료`;
  }
  freeCard.appendChild(freeStatus);
  freeCard.appendChild(freeSmall);

  freeCard.style.cursor = "pointer";
  freeCard.onclick = () => {
    if (state.shopFreeLeft > 0) return;
    addGems(10);
    startShopFreeCooldown(90);
    state.rewardQueue = [10];
    showReward(10);
  };

  // 서버럭 카드
  const luckCard = el("div", "card");
  luckCard.appendChild(el("div", "emoji", "🍀"));
  luckCard.appendChild(el("div", "name", "서버 운 강화"));
  luckCard.appendChild(el("div", "price", "크리스탈 5개"));
  const luckSmall = el("div", "small", serverLuckActive() ? `${fmtMMSS(state.serverLuckLeft)} 남음` : "");
  luckCard.appendChild(luckSmall);

  luckCard.style.cursor = "pointer";
  luckCard.onclick = () => {
    // 간단 확인
    openInlineConfirm(
      "정말로 구매하시겠습니까?",
      "서버럭 1분 활성화\n(메인/상점/상자선택 화면이 보라색)",
      () => {
        closeInlineConfirm();
        if (!spendGems(5)) {
          showToast("크리스탈이 부족합니다!");
          return;
        }
        startServerLuck(60);
        showToast("서버 운 강화를 구매했습니다!");
      }
    );
  };

  row.appendChild(freeCard);
  row.appendChild(luckCard);
  col.appendChild(row);

  clearRoot();
  screenRoot.appendChild(col);
}

function renderBox() {
  applyThemeForMainScreens();
  setHeader("상자 뽑기", serverLuckActive() ? `서버럭: ${fmtMMSS(state.serverLuckLeft)} 남음` : "", true);

  const col = el("div", "centerCol");
  const row = el("div", "cardRow");

  const normal = el("div", "card");
  normal.appendChild(el("div", "name", "일반 상자 업그레이드"));
  normal.appendChild(el("div", "price", state.freeNormalUsed ? "7 크리스탈" : "무료 1회 남음"));
  normal.style.cursor = "pointer";
  normal.onclick = () => {
    if (!state.freeNormalUsed) {
      state.freeNormalUsed = true;
      navigate("normal");
      return;
    }
    if (!spendGems(7)) return showToast("크리스탈이 부족합니다!");
    navigate("normal");
  };

  const mid = el("div", "card");
  mid.appendChild(el("div", "name", "중급 상자 업그레이드"));
  mid.appendChild(el("div", "price", state.freeMidUsed ? "15 크리스탈" : "무료 1회 남음"));
  mid.style.cursor = "pointer";
  mid.onclick = () => {
    if (!state.freeMidUsed) {
      state.freeMidUsed = true;
      navigate("mid");
      return;
    }
    if (!spendGems(15)) return showToast("크리스탈이 부족합니다!");
    navigate("mid");
  };

  const high = el("div", "card");
  high.appendChild(el("div", "name", "고급 상자 업그레이드"));
  high.appendChild(el("div", "price", state.freeHighUsed ? "30 크리스탈" : "무료 1회 남음"));
  high.style.cursor = "pointer";
  high.onclick = () => {
    if (!state.freeHighUsed) {
      state.freeHighUsed = true;
      navigate("high");
      return;
    }
    if (!spendGems(30)) return showToast("크리스탈이 부족합니다!");
    navigate("high");
  };

  row.appendChild(normal);
  row.appendChild(mid);
  row.appendChild(high);
  col.appendChild(row);

  clearRoot();
  screenRoot.appendChild(col);
}

// =========================
// 장비 화면
// =========================
function charUpgradeCost() {
  const x = state.charLevel;
  return x * x + 49;
}
function canCharUpgrade() {
  return state.charLevel < state.charLevelMax;
}

function renderEquip() {
  // 장비는 서버럭 색 영향 X, 배경은 녹색 고정
  setTopTheme("var(--green)");
  setHeader("장비 구성", "", true);

  const col = el("div", "centerCol");

  // 탭
  const tabs = el("div", "tabsRow");
  const tabNames = ["캐릭터", "주무기", "보조무기", "유물"];
  tabNames.forEach((name, idx) => {
    const b = el("button", "tabBtn" + (state.equipTab === idx ? " active" : ""));
    b.textContent = name;
    b.onclick = () => {
      state.equipTab = idx;
      render();
    };
    tabs.appendChild(b);
  });
  col.appendChild(tabs);

  // 스크롤 영역
  const scroll = el("div", "equipScroll");
  scroll.style.background = "transparent";

  const grid = el("div", "slotGrid");

  // 5칸: 3 + 2 (책 읽는 순서)
  const slots = [0,1,2,3,4];
  slots.forEach((i) => {
    const s = el("div", "slot");
    if (state.equipTab === 0 && i === 0) {
      // 캐릭터 기본(검정 네모 + 네모 이름 + 레벨 뱃지)
      const inner = el("div", "charInner");
      s.appendChild(inner);

      const name = el("div", "charName");
      name.textContent = "네모";
      s.appendChild(name);

      const lv = el("div", "levelBadge");
      lv.textContent = String(state.charLevel);
      s.appendChild(lv);

      const max = el("div", "maxBadge");
      max.textContent = (state.charLevel >= state.charLevelMax) ? "맥시멈 레벨" : "";
      s.appendChild(max);

      s.onclick = () => navigate("charDetail");
    } else {
      const emo = el("div", "slotEmoji");
      if (state.equipTab === 0) emo.textContent = "🙂";
      if (state.equipTab === 1) emo.textContent = "⚔️";
      if (state.equipTab === 2) emo.textContent = "🛡️";
      if (state.equipTab === 3) emo.textContent = "🔮";
      s.appendChild(emo);
      s.onclick = () => showToast("준비중입니다!");
    }
    grid.appendChild(s);
  });

  scroll.appendChild(grid);
  // 스크롤 여유(위아래)
  scroll.appendChild(el("div", "", ""));
  col.appendChild(scroll);

  clearRoot();
  screenRoot.appendChild(col);
}

function renderCharDetail() {
  // 장비 상세도 서버럭 영향 X
  setTopTheme("var(--green)");
  setHeader("장비", "네모  ·  기본캐릭터", true);

  const col = el("div", "centerCol");

  const wrap = el("div", "tapArea");
  wrap.style.cursor = "default";

  const detail = el("div", "charDetail");

  const big = el("div", "bigCharBox");
  detail.appendChild(big);

  const stats = el("div", "statsCol");
  stats.appendChild(el("div", "lv", `레벨: ${state.charLevel}`));
  stats.appendChild(el("div", "st", `체력: ${fmtNum(state.hp)}`));
  stats.appendChild(el("div", "st", `이동속도: ${fmtNum(state.speed)}`));
  stats.appendChild(el("div", "st", `스테미너: ${Math.floor(state.stamina)}`));
  detail.appendChild(stats);

  wrap.appendChild(detail);

  const info = el("div", "notice");
  info.textContent = "";
  wrap.appendChild(info);

  col.appendChild(wrap);

  // 업그레이드 버튼(우하단)
  const br = el("div", "bottomRight");
  const btn = el("button", "btn btn-white");
  if (!canCharUpgrade()) {
    btn.textContent = "맥시멈 레벨";
    btn.className = "btn btn-white btn-disabled";
    btn.onclick = () => showToast("이미 맥시멈 레벨입니다!");
  } else {
    const cost = charUpgradeCost();
    btn.textContent = `업그레이드하기: ${cost} 크리스탈`;
    btn.onclick = () => {
      openInlineConfirm(
        "업그레이드 할까요?",
        `비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
        () => {
          closeInlineConfirm();
          if (!spendGems(cost)) return showToast("크리스탈이 부족합니다!");
          state.charLevel += 1;
          state.hp += 0.5;
          state.speed += 0.01;
          state.stamina += 5;
          render();
          showToast("업그레이드 완료!");
        }
      );
    };
  }
  br.appendChild(btn);
  col.appendChild(br);

  clearRoot();
  screenRoot.appendChild(col);
}

function fmtNum(x){
  // 보기 좋게
  const s = Number(x).toFixed(2);
  return s.replace(/\.00$/,"").replace(/(\.\d)0$/,"$1");
}

// =========================
// 뽑기 공용 로직
// =========================
function dotsText(filled){
  return Array.from({length:3}, (_,i)=> i<filled ? "●" : "○").join(" ");
}

function queueRewards(amountEach, times){
  state.rewardQueue = Array(times).fill(amountEach);
  showReward(state.rewardQueue[0]);
}

function tapCommon(draw, onStageChanged){
  if (draw.popupMode) return;

  if (!draw.firstTapDone) {
    draw.firstTapDone = true;
  }

  if (draw.openReady) {
    const times = draw.twoChests ? 2 : 1;
    queueRewards(draw.rewardAmount(), times);
    return;
  }

  // 분열(1회만)
  if (!draw.splitDone && Math.random() < draw.splitProb()) {
    draw.twoChests = true;
    draw.splitDone = true;
    draw.filled = 3;
    return;
  }

  // 원 감소
  draw.filled = Math.max(0, draw.filled - 1);

  // 업그레이드 시도
  const upgraded = draw.tryUpgrade();
  if (upgraded) {
    draw.filled = 3;
    draw.openReady = false;
    if (onStageChanged) onStageChanged();
    return;
  }

  if (draw.filled === 0) {
    draw.openReady = true;
    return;
  }
}

// =========================
// 일반(브론즈~레드다이아)
// =========================
function initNormalDraw(){
  state.draw = {
    type:"normal",
    firstTapDone:false,
    stage:"브론즈",
    filled:3,
    openReady:false,
    splitDone:false,
    twoChests:false,
    popupMode:false,
    splitProb: ()=> serverLuckActive() ? 0.15 : 0.10,
    rewardAmount: ()=>{
      const map = {"브론즈":1,"실버":2,"골드":3,"에메랄드":5,"다이아":7,"레드 다이아":10};
      return map[state.draw.stage] ?? 1;
    },
    baseUpgrade: ()=>{
      const s = state.draw.stage;
      if (s==="브론즈") return ["실버",0.70];
      if (s==="실버") return ["골드",0.60];
      if (s==="골드") return ["에메랄드",0.50];
      if (s==="에메랄드") return ["다이아",0.30];
      if (s==="다이아") return ["레드 다이아",0.10];
      return [null,0.0];
    },
    tryUpgrade: ()=>{
      const [next, p0] = state.draw.baseUpgrade();
      if (!next) return false;
      let p = p0;
      if (serverLuckActive()) p = Math.min(1.0, p + 0.05);
      if (Math.random() < p) {
        state.draw.stage = next;
        return true;
      }
      return false;
    },
    emoji:"📦"
  };
}

function renderNormal(){
  applyThemeForMainScreens(); // normal은 핑크 유지(서버럭 보라색 적용 X)
  setTopTheme("var(--pink)");
  setHeader("상자 뽑기", "", true);

  const draw = state.draw;
  const col = el("div","centerCol");

  const tap = el("div","tapHint", draw.firstTapDone ? "" : "탭하세요!");
  col.appendChild(tap);

  const st = el("div","stageTitle", draw.stage);
  col.appendChild(st);

  const area = el("div","tapArea");
  area.onclick = ()=>{
    tapCommon(draw);
    render();
  };

  const em = el("div","chestEmoji" + (draw.openReady ? " big" : ""), draw.emoji);
  area.appendChild(em);

  if (!draw.openReady) {
    area.appendChild(el("div","dots", dotsText(draw.filled)));
  }

  col.appendChild(area);

  clearRoot();
  screenRoot.appendChild(col);
}

// =========================
// 중급(별 1~5 + 단계별 확률)
// =========================
function initMidDraw(){
  state.draw = {
    type:"mid",
    firstTapDone:false,
    star:1,
    filled:3,
    openReady:false,
    splitDone:false,
    twoChests:false,
    splitProb: ()=> serverLuckActive() ? 0.15 : 0.10,
    rewardAmount: ()=>{
      const map = {1:7,2:10,3:15,4:25,5:37};
      return map[state.draw.star] ?? 7;
    },
    upgradeProb: ()=>{
      let p = 0;
      if (state.draw.star===1) p = 0.35;
      else if (state.draw.star===2) p = 0.25;
      else if (state.draw.star===3) p = 0.15;
      else if (state.draw.star===4) p = 0.05;
      else p = 0.0;
      if (serverLuckActive()) p = Math.min(1.0, p + 0.05);
      return p;
    },
    tryUpgrade: ()=>{
      if (state.draw.star>=5) return false;
      if (Math.random() < state.draw.upgradeProb()) {
        state.draw.star += 1;
        return true;
      }
      return false;
    },
    emoji:"🎁"
  };
}

function renderMid(){
  setTopTheme("var(--pink)");
  setHeader("상자 뽑기", "", true);

  const draw = state.draw;
  const col = el("div","centerCol");
  const tap = el("div","tapHint", draw.firstTapDone ? "" : "탭하세요!");
  col.appendChild(tap);

  const st = el("div","stageTitle", "★".repeat(draw.star));
  col.appendChild(st);

  const area = el("div","tapArea");
  area.onclick = ()=>{
    tapCommon(draw);
    render();
  };

  const em = el("div","chestEmoji" + (draw.openReady ? " big" : ""), draw.emoji);
  area.appendChild(em);
  if (!draw.openReady) area.appendChild(el("div","dots", dotsText(draw.filled)));

  col.appendChild(area);
  clearRoot();
  screenRoot.appendChild(col);
}

// =========================
// 고급(희귀~울트라 전설 + 배경색)
// =========================
const HIGH_STAGES = ["희귀","초희귀","영웅","신화","전설","울트라 전설"];
const HIGH_BG = {
  "희귀":"#1aa84b",
  "초희귀":"#1f5fbf",
  "영웅":"#7a2cff",
  "신화":"#ff2b2b",
  "전설":"#ffd400",
  "울트라 전설":"#ffffff",
};
const HIGH_REWARD = {"희귀":20,"초희귀":25,"영웅":30,"신화":50,"전설":100,"울트라 전설":300};
const HIGH_UP = {
  "희귀":["초희귀",0.75],
  "초희귀":["영웅",0.50],
  "영웅":["신화",0.35],
  "신화":["전설",0.15],
  "전설":["울트라 전설",0.05],
  "울트라 전설":[null,0.0],
};

function initHighDraw(){
  state.draw = {
    type:"high",
    firstTapDone:false,
    stage:"희귀",
    filled:3,
    openReady:false,
    splitDone:false,
    twoChests:false,
    splitProb: ()=> 0.10,
    rewardAmount: ()=> HIGH_REWARD[state.draw.stage] ?? 20,
    tryUpgrade: ()=>{
      const [next, p0] = HIGH_UP[state.draw.stage] ?? [null,0.0];
      if (!next) return false;
      let p = p0;
      if (serverLuckActive()) p = Math.min(1.0, p + 0.05);
      if (Math.random() < p) {
        state.draw.stage = next;
        return true;
      }
      return false;
    },
    emoji:"🧰"
  };
}

function renderHigh(){
  const draw = state.draw;
  const bg = HIGH_BG[draw.stage] ?? "#ff6fb2";
  const fg = (bg.toLowerCase()==="#ffffff") ? "#000" : "#fff";
  topbar.style.background = bg;
  screenRoot.style.background = bg;

  setHeader("상자 뽑기", "", true);

  const col = el("div","centerCol");
  const tap = el("div","tapHint", draw.firstTapDone ? "" : "탭하세요!");
  tap.style.color = fg;
  col.appendChild(tap);

  const st = el("div","stageTitle", draw.stage);
  st.style.color = fg;
  col.appendChild(st);

  const area = el("div","tapArea");
  area.style.borderColor = "rgba(255,255,255,.9)";
  area.onclick = ()=>{
    tapCommon(draw, ()=>{/* stage changed */});
    render();
  };

  const em = el("div","chestEmoji" + (draw.openReady ? " big" : ""), draw.emoji);
  em.style.color = fg;
  area.appendChild(em);

  if (!draw.openReady) {
    const d = el("div","dots", dotsText(draw.filled));
    d.style.color = fg;
    area.appendChild(d);
  }

  col.appendChild(area);
  clearRoot();
  screenRoot.appendChild(col);

  // 보상 오버레이 글씨색은 기본 흰색이라, 울트라 흰 배경에서도 문제 없음(오버레이는 어두운 카드)
}

// =========================
// 공용 render
// =========================
function render() {
  updateCurrency();

  // 헤더 뒤로가기: title/game만 숨김
  if (state.screen === "title" || state.screen === "game") backBtn.hidden = true;
  else backBtn.hidden = false;

  // 보상/확인 오버레이는 화면 전환 시 그대로 유지해도 되지만,
  // 여기서는 사용자 실수 방지용으로 뽑기/장비 이동 시 자동 닫지 않음.

  if (state.screen === "title") return renderTitle();
  if (state.screen === "game") return renderGame();
  if (state.screen === "shop") return renderShop();
  if (state.screen === "box") return renderBox();
  if (state.screen === "equip") return renderEquip();
  if (state.screen === "charDetail") return renderCharDetail();
  if (state.screen === "normal") return renderNormal();
  if (state.screen === "mid") return renderMid();
  if (state.screen === "high") return renderHigh();
}

// 시작
navigate("title", true);
