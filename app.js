/* 운빨겜 - Web (JS + Canvas)
   포함: 상자 업그레이드 3종 + 보상팝업 + 확인창 + 장비선택 + 전투(WASD+그리드+클릭슬래쉬)
*/

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------------------------
   전역 상태 (Python 버전 맞춤)
------------------------- */
const S = {
  // colors
  GREEN_BG: "#0b3b1a",
  BLUE_BG: "#1f5fbf",
  PINK_BG: "#ff6fb2",
  LUCK_PURPLE: "#7a2cff",

  // prices
  PRICE_NORMAL: 7,
  PRICE_MID: 15,
  PRICE_HIGH: 30,

  // currency
  gems: 0,

  // free 1-time
  free_normal_used: false,
  free_mid_used: false,
  free_high_used: false,

  // timers
  server_luck_in: 0,
  shop_free_in: 0,

  // selection
  selected_character: false,
  selected_weapon: null, // "club" or "wood_sword"

  // character
  char_level: 1,
  char_level_max: 10,
  char_hp: 1.5,
  char_speed: 1.0,
  char_stamina: 50,

  // club
  club_owned: true,
  club_level: 1,
  club_level_max: 10,
  club_atk: 2.0,
  club_stamina_cost: 0.10,
  club_attack_speed: 1.0,
  club_dura_cost: 0.10,
  club_total_dura: 7.0,

  // wood sword
  wood_sword_owned: false,
  wood_sword_price: 100,
  wood_sword_level: 1,
  wood_sword_level_max: 10,
  wood_sword_atk: 5.0,
  wood_sword_stamina_cost: 1.5,
  wood_sword_attack_speed: 0.7,
  wood_sword_dura_cost: 0.15,
  wood_sword_total_dura: 10.0,
};

/* -------------------------
   유틸
------------------------- */
function formatMMSS(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}
function serverLuckActive() { return S.server_luck_in > 0; }
function shopIsFree() { return S.shop_free_in <= 0; }

function addGems(n) {
  S.gems += n;
  renderHUD();
}
function spendGems(n) {
  if (S.gems < n) return false;
  S.gems -= n;
  renderHUD();
  return true;
}

/* -------------------------
   화면 전환
------------------------- */
const screens = {
  title: $("screenTitle"),
  main: $("screenMain"),
  shop: $("screenShop"),
  box: $("screenBox"),
  upgrade: $("screenUpgrade"),
  equip: $("screenEquip"),
  battle: $("screenBattle"),
};

function hideAllScreens() {
  Object.values(screens).forEach(el => el.classList.add("hidden"));
}

let currentScreen = "title";
function showScreen(name) {
  hideAllScreens();
  screens[name].classList.remove("hidden");
  currentScreen = name;

  // HUD 왼쪽 버튼(뒤로가기)을 화면별로 다르게
  const hud = $("hud");
  hud.style.display = (name === "title") ? "none" : "flex";

  // 화면별 refresh
  if (name === "main") refreshMain();
  if (name === "shop") refreshShop();
  if (name === "box") refreshBox();
  if (name === "equip") refreshEquip();
  if (name === "battle") battleStart();
}

/* -------------------------
   HUD
------------------------- */
function applyThemeForHUDAndBody(bg) {
  // 배경은 각 screen이 담당. HUD 텍스트만 분위기 맞춤
  $("hud").style.color = (bg === "#ffffff") ? "#000" : "#fff";
}
function renderHUD() {
  $("hudGems").textContent = String(S.gems);

  const luck = $("hudLuck");
  if (serverLuckActive()) {
    luck.textContent = `서버럭: ${formatMMSS(S.server_luck_in)} 남음`;
  } else {
    luck.textContent = "";
  }

  // 메인 loadout
  if (!screens.main.classList.contains("hidden")) refreshMain();
}

/* -------------------------
   공용: Notice / Popup / Confirm
------------------------- */
function tempNotice(el, text, ms = 1200) {
  el.textContent = text;
  if (ms > 0) setTimeout(() => { el.textContent = ""; }, ms);
}

const confirmOverlay = $("confirmOverlay");
const confirmMsg = $("confirmMsg");
let confirmYesFn = null;
let confirmNoFn = null;

function openConfirm(message, yesFn, noFn, themeBg = null) {
  confirmMsg.textContent = message;
  confirmYesFn = yesFn;
  confirmNoFn = noFn;
  confirmOverlay.classList.remove("hidden");

  // 테마색
  const card = confirmOverlay.querySelector(".overlay-card");
  if (themeBg) card.style.background = themeBg;
  else card.style.background = "transparent";
}
function closeConfirm() {
  confirmOverlay.classList.add("hidden");
  confirmYesFn = null;
  confirmNoFn = null;
}

$("confirmYes").onclick = () => { if (typeof confirmYesFn === "function") confirmYesFn(); };
$("confirmNo").onclick = () => { if (typeof confirmNoFn === "function") confirmNoFn(); };

const rewardPopup = $("rewardPopup");
const rewardMsg = $("rewardMsg");
let rewardClickFn = null;

function openReward(amount, onClick, themeBg = null, fg = "#fff") {
  rewardMsg.textContent = `크리스탈 ${amount}개를 획득했습니다!`;
  rewardClickFn = onClick;
  rewardPopup.classList.remove("hidden");

  const card = rewardPopup.querySelector(".overlay-card");
  if (themeBg) card.style.background = themeBg;
  else card.style.background = "transparent";
  card.style.color = fg;
}
function closeReward() {
  rewardPopup.classList.add("hidden");
  rewardClickFn = null;
}
rewardPopup.addEventListener("click", () => {
  if (typeof rewardClickFn === "function") rewardClickFn();
});

/* -------------------------
   타이틀
------------------------- */
$("btnStart").onclick = () => showScreen("main");

/* -------------------------
   메인
------------------------- */
$("btnShop").onclick = () => showScreen("shop");
$("btnEquip").onclick = () => showScreen("equip");
$("btnBox").onclick = () => showScreen("box");

$("btnBattle").onclick = () => {
  if (!S.selected_character || !S.selected_weapon) {
    tempNotice($("mainNotice"), "캐릭터,주무기를 선택해주세요!");
    return;
  }
  showScreen("battle");
};

function refreshMain() {
  // 서버럭 테마 반영(메인 배경색만 바꾸는 느낌)
  const main = screens.main;
  main.style.background = serverLuckActive() ? S.LUCK_PURPLE : S.GREEN_BG;
  applyThemeForHUDAndBody(serverLuckActive() ? S.LUCK_PURPLE : S.GREEN_BG);

  // 상점 버튼 강조(무료면 노랑)
  $("btnShop").style.background = shopIsFree() ? "yellow" : "#fff";

  // loadout 표시
  const w = $("loadoutWeapon");
  const c = $("loadoutCharBox");
  const t = $("loadoutText");

  if (S.selected_weapon === "club") w.textContent = "🪵";
  else if (S.selected_weapon === "wood_sword") w.textContent = "🗡️";
  else w.textContent = "";

  if (S.selected_character) {
    c.style.background = "#000";
    t.textContent = "선택됨: 네모";
  } else {
    c.style.background = "#222";
    t.textContent = "캐릭터/주무기 선택 필요";
  }
}

/* -------------------------
   상점
------------------------- */
$("btnShopBack").onclick = () => showScreen("main");

$("shopFree").onclick = () => {
  if (!shopIsFree()) return;
  addGems(10);
  startShopCooldown(90);

  const bg = serverLuckActive() ? S.LUCK_PURPLE : S.BLUE_BG;
  openReward(10, () => closeReward(), bg, "#fff");
  refreshShop();
};

$("shopLuck").onclick = () => {
  const bg = serverLuckActive() ? S.LUCK_PURPLE : S.BLUE_BG;
  openConfirm("정말로 구매하시겠습니까?", () => {
    closeConfirm();
    if (!spendGems(5)) {
      tempNotice($("shopNotice"), "크리스탈이 부족합니다!");
      return;
    }
    tempNotice($("shopNotice"), "서버 운 강화를 구매했습니다!");
    startServerLuck(60);
    refreshShop();
  }, () => closeConfirm(), bg);
};

function refreshShop() {
  const shop = screens.shop;
  const bg = serverLuckActive() ? S.LUCK_PURPLE : S.BLUE_BG;
  shop.style.background = bg;
  applyThemeForHUDAndBody(bg);

  if (shopIsFree()) {
    $("shopFreeStatus").textContent = "10개";
    $("shopFreeTimer").textContent = "";
  } else {
    $("shopFreeStatus").textContent = "이미 받은 아이템입니다";
    $("shopFreeTimer").textContent = `${formatMMSS(S.shop_free_in)}초 후 무료`;
  }

  $("shopLuckTimer").textContent = serverLuckActive()
    ? `${formatMMSS(S.server_luck_in)} 남음`
    : "";
}

/* -------------------------
   상자 선택
------------------------- */
$("btnBoxBack").onclick = () => showScreen("main");

$("cardNormal").onclick = () => {
  if (!S.free_normal_used) {
    S.free_normal_used = true;
    openUpgrade("normal");
    refreshBox();
    return;
  }
  if (!spendGems(S.PRICE_NORMAL)) return tempNotice($("boxNotice"), "크리스탈이 부족합니다!");
  openUpgrade("normal");
};

$("cardMid").onclick = () => {
  if (!S.free_mid_used) {
    S.free_mid_used = true;
    openUpgrade("mid");
    refreshBox();
    return;
  }
  if (!spendGems(S.PRICE_MID)) return tempNotice($("boxNotice"), "크리스탈이 부족합니다!");
  openUpgrade("mid");
};

$("cardHigh").onclick = () => {
  if (!S.free_high_used) {
    S.free_high_used = true;
    openUpgrade("high");
    refreshBox();
    return;
  }
  if (!spendGems(S.PRICE_HIGH)) return tempNotice($("boxNotice"), "크리스탈이 부족합니다!");
  openUpgrade("high");
};

function refreshBox() {
  const bg = serverLuckActive() ? S.LUCK_PURPLE : S.PINK_BG;
  screens.box.style.background = bg;
  applyThemeForHUDAndBody(bg);

  $("priceNormal").textContent = S.free_normal_used ? `${S.PRICE_NORMAL} 크리스탈` : "무료 1회 남음";
  $("priceMid").textContent = S.free_mid_used ? `${S.PRICE_MID} 크리스탈` : "무료 1회 남음";
  $("priceHigh").textContent = S.free_high_used ? `${S.PRICE_HIGH} 크리스탈` : "무료 1회 남음";
}

/* -------------------------
   업그레이드 3종 (Python 로직 반영)
------------------------- */
let U = null; // upgrade runtime state
const upTap = $("upgradeTap");
const upGrade = $("upgradeGrade");
const upArea = $("upgradeArea");
const upDots = $("upgradeDots");
const upBox1 = $("upgradeBox1");
const upBox2 = $("upgradeBox2");

upArea.addEventListener("click", () => upgradeTap());
$("screenUpgrade").addEventListener("click", (e) => {
  // 화면 아무데나 눌러도 탭되게 (파이썬처럼)
  if (e.target === $("screenUpgrade")) upgradeTap();
});

function openUpgrade(kind) {
  U = makeUpgradeState(kind);
  showScreen("upgrade");
  renderUpgrade();
}

function makeUpgradeState(kind) {
  // kind: normal / mid / high
  const st = {
    kind,
    firstTapDone: false,
    stage: "브론즈",   // normal
    filled: 3,
    openReady: false,
    splitDone: false,
    twoChests: false,
    popupQueue: [],
    popupMode: false,
  };

  if (kind === "mid") {
    st.star = 1;
  }
  if (kind === "high") {
    st.stage = "희귀";
  }
  return st;
}

function upgradeSplitProb() {
  // normal/mid는 서버럭이면 0.15, 아니면 0.10 / high는 0.10 고정
  if (!U) return 0.10;
  if (U.kind === "high") return 0.10;
  return serverLuckActive() ? 0.15 : 0.10;
}

function upgradeDotsText() {
  return ["●","●","●"].map((v,i)=> (i < U.filled ? "●" : "○")).join(" ");
}

function normalNextStageProbBase(stage) {
  if (stage === "브론즈") return ["실버", 0.70];
  if (stage === "실버") return ["골드", 0.60];
  if (stage === "골드") return ["에메랄드", 0.50];
  if (stage === "에메랄드") return ["다이아", 0.30];
  if (stage === "다이아") return ["레드 다이아", 0.10];
  return [null, 0.0];
}
function normalReward(stage) {
  return ({ "브론즈":1, "실버":2, "골드":3, "에메랄드":5, "다이아":7, "레드 다이아":10 }[stage] ?? 1);
}

function midUpgradeProb(star) {
  let p = 0.0;
  if (star === 1) p = 0.35;
  else if (star === 2) p = 0.25;
  else if (star === 3) p = 0.15;
  else if (star === 4) p = 0.05;
  if (serverLuckActive()) p = Math.min(1.0, p + 0.05);
  return p;
}
function midReward(star) {
  return ({1:7,2:10,3:15,4:25,5:37}[star] ?? 7);
}

const HIGH_BG_BY_STAGE = {
  "희귀":"#1aa84b",
  "초희귀":"#1f5fbf",
  "영웅":"#7a2cff",
  "신화":"#ff2b2b",
  "전설":"#ffd400",
  "울트라 전설":"#ffffff",
};
function highNextStageProbBase(stage) {
  if (stage === "희귀") return ["초희귀", 0.75];
  if (stage === "초희귀") return ["영웅", 0.50];
  if (stage === "영웅") return ["신화", 0.35];
  if (stage === "신화") return ["전설", 0.15];
  if (stage === "전설") return ["울트라 전설", 0.05];
  return [null, 0.0];
}
function highReward(stage) {
  return ({ "희귀":20, "초희귀":25, "영웅":30, "신화":50, "전설":100, "울트라 전설":300 }[stage] ?? 20);
}

function renderUpgrade() {
  if (!U) return;

  // 테마 배경
  let bg = S.PINK_BG;
  let fg = "#fff";
  let emoji = "📦";
  if (U.kind === "mid") emoji = "🎁";
  if (U.kind === "high") {
    bg = HIGH_BG_BY_STAGE[U.stage] ?? S.PINK_BG;
    fg = (bg.toLowerCase() === "#ffffff") ? "#000" : "#fff";
    emoji = "🧰";
  } else {
    bg = serverLuckActive() ? S.LUCK_PURPLE : S.PINK_BG;
    fg = "#fff";
  }
  screens.upgrade.style.background = bg;
  applyThemeForHUDAndBody(bg);

  // tap label
  upTap.style.display = U.firstTapDone ? "none" : "block";
  upTap.style.color = fg;

  // grade label
  if (U.kind === "mid") upGrade.textContent = "★".repeat(U.star);
  else upGrade.textContent = U.stage;
  upGrade.style.color = fg;

  // box emoji & size
  upBox1.textContent = emoji;
  upBox2.textContent = emoji;

  upBox1.classList.toggle("big", U.openReady);
  upBox2.classList.toggle("big", U.openReady);

  // two chests
  upBox2.classList.toggle("hidden", !U.twoChests);

  // dots
  upDots.style.color = fg;
  upDots.textContent = U.openReady ? "" : upgradeDotsText();

  // area theme
  upArea.style.background = "transparent";
}

function startRewardPopups() {
  const times = U.twoChests ? 2 : 1;
  let amtEach = 1;

  if (U.kind === "normal") amtEach = normalReward(U.stage);
  else if (U.kind === "mid") amtEach = midReward(U.star);
  else amtEach = highReward(U.stage);

  U.popupQueue = Array(times).fill(amtEach);
  U.popupMode = true;
  showNextPopup();
}

function showNextPopup() {
  if (!U.popupQueue.length) {
    U.popupMode = false;
    closeReward();
    showScreen("box");
    return;
  }

  const amt = U.popupQueue[0];

  // 배경색은 현재 업그레이드 화면과 동일하게
  let bg = screens.upgrade.style.background || S.PINK_BG;
  let fg = (String(bg).toLowerCase() === "#ffffff") ? "#000" : "#fff";

  openReward(amt, () => {
    // 클릭 시 지급하고 다음 팝업
    U.popupQueue.shift();
    closeReward();
    addGems(amt);
    setTimeout(showNextPopup, 10);
  }, bg, fg);
}

function upgradeTap() {
  if (!U) return;
  if (U.popupMode) return;

  if (!U.firstTapDone) U.firstTapDone = true;

  // open ready면 보상 시작
  if (U.openReady) {
    startRewardPopups();
    return;
  }

  // split
  if (!U.splitDone && Math.random() < upgradeSplitProb()) {
    U.twoChests = true;
    U.splitDone = true;
    U.filled = 3;
    renderUpgrade();
    return;
  }

  // dots 1 감소(항상 1개씩만)
  U.filled = Math.max(0, U.filled - 1);

  // 업그레이드 확률
  if (U.kind === "normal") {
    let [nxt, p] = normalNextStageProbBase(U.stage);
    if (nxt && serverLuckActive()) p = Math.min(1.0, p + 0.05);
    if (nxt && Math.random() < p) {
      U.stage = nxt;
      U.filled = 3;
      U.openReady = false;
      renderUpgrade();
      return;
    }
  } else if (U.kind === "mid") {
    if (U.star < 5 && Math.random() < midUpgradeProb(U.star)) {
      U.star += 1;
      U.filled = 3;
      U.openReady = false;
      renderUpgrade();
      return;
    }
  } else { // high
    let [nxt, p] = highNextStageProbBase(U.stage);
    if (nxt && serverLuckActive()) p = Math.min(1.0, p + 0.05);
    if (nxt && Math.random() < p) {
      U.stage = nxt;
      U.filled = 3;
      U.openReady = false;
      renderUpgrade();
      return;
    }
  }

  // open ready
  if (U.filled === 0) {
    U.openReady = true;
    renderUpgrade();
    return;
  }

  renderUpgrade();
}

/* -------------------------
   장비(Equip)
------------------------- */
$("btnEquipBack").onclick = () => showScreen("main");

let equipTab = "character";
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    equipTab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === equipTab));
    refreshEquip();
  };
});
// 초기 active
document.querySelectorAll(".tab")[0].classList.add("active");

function charUpgradeCost() {
  const x = Math.floor(S.char_level);
  return x*x + 49;
}
function clubUpgradeCost() {
  const x = Math.floor(S.club_level);
  return x*x + 49;
}
function woodUpgradeCost() {
  const x = Math.floor(S.wood_sword_level);
  return x*x + 49;
}

function refreshEquip() {
  const bg = serverLuckActive() ? S.LUCK_PURPLE : S.GREEN_BG;
  screens.equip.style.background = bg;
  applyThemeForHUDAndBody(bg);

  const grid = $("equipGrid");
  grid.innerHTML = "";

  function slotHTML({emoji, name, lvlText="", statusText=""}) {
    const d = document.createElement("div");
    d.className = "slot";
    d.innerHTML = `
      <div class="slot-emoji">${emoji}</div>
      <div class="slot-name">${name || ""}</div>
      <div class="slot-lvl">${lvlText || ""}</div>
      <div class="slot-status">${statusText || ""}</div>
    `;
    return d;
  }

  if (equipTab === "character") {
    const s0 = slotHTML({
      emoji: "⬛",
      name: "네모",
      lvlText: String(S.char_level),
      statusText: (S.char_level >= S.char_level_max) ? "맥시멈 레벨" : ""
    });
    s0.onclick = () => openDetail("character", "square");
    grid.appendChild(s0);

    // 더미 4개(파이썬처럼 5칸 느낌)
    ["🙂","🙂","🙂","🙂"].forEach(em => {
      const s = slotHTML({emoji: em, name:""});
      s.style.cursor = "default";
      grid.appendChild(s);
    });

  } else if (equipTab === "weapon") {
    const club = slotHTML({
      emoji:"🪵", name:"나무몽둥이",
      lvlText:String(S.club_level),
      statusText:(S.club_level>=S.club_level_max)?"맥시멈 레벨":""
    });
    club.onclick = () => openDetail("weapon", "club");
    grid.appendChild(club);

    const wood = slotHTML({
      emoji:"🗡️", name:"목검",
      lvlText: S.wood_sword_owned ? String(S.wood_sword_level) : "",
      statusText: S.wood_sword_owned
        ? ((S.wood_sword_level>=S.wood_sword_level_max)?"맥시멈 레벨":"")
        : `구매:${S.wood_sword_price}크리스탈`
    });
    wood.onclick = () => openDetail("weapon", "wood_sword");
    grid.appendChild(wood);

    ["⚔️","⚔️","⚔️"].forEach(em => {
      const s = slotHTML({emoji: em, name:""});
      s.style.cursor = "default";
      grid.appendChild(s);
    });

  } else if (equipTab === "sub") {
    ["🛡️","🛡️","🛡️","🛡️","🛡️"].forEach(em => {
      const s = slotHTML({emoji: em, name:""});
      s.style.cursor = "default";
      grid.appendChild(s);
    });
  } else {
    ["🔮","🔮","🔮","🔮","🔮"].forEach(em => {
      const s = slotHTML({emoji: em, name:""});
      s.style.cursor = "default";
      grid.appendChild(s);
    });
  }
}

/* -------------------------
   상세 모달 (캐릭터/무기)
------------------------- */
const modal = $("modal");
const modalTitle = $("modalTitle");
const modalBig = $("modalBig");
const modalDesc = $("modalDesc");
const modalStats = $("modalStats");
const modalSelect = $("modalSelect");
const modalMainAction = $("modalMainAction");
const modalNotice = $("modalNotice");

let detailType = null;
let detailKey = null;

$("modalBack").onclick = closeDetail;
function closeDetail() {
  modal.classList.add("hidden");
  modalNotice.textContent = "";
  detailType = null;
  detailKey = null;
  refreshEquip();
}

function openDetail(type, key) {
  detailType = type;
  detailKey = key;

  // 테마: Equip 배경색 유지
  modal.querySelector(".modal-card").style.background = screens.equip.style.background || S.GREEN_BG;

  modal.classList.remove("hidden");
  renderDetail();
}

function renderDetail() {
  modalNotice.textContent = "";

  if (detailType === "character") {
    modalTitle.textContent = "네모";
    modalBig.textContent = "⬛";
    modalDesc.textContent = "기본캐릭터";

    modalStats.textContent =
      `레벨: ${S.char_level}\n` +
      `체력: ${fmt2(S.char_hp)}\n` +
      `이동속도: ${fmt2(S.char_speed)}\n` +
      `스테미너: ${Math.floor(S.char_stamina)}`;

    // 선택 버튼
    if (S.selected_character) {
      modalSelect.textContent = "선택됨";
      modalSelect.disabled = true;
    } else {
      modalSelect.textContent = "선택";
      modalSelect.disabled = false;
    }
    modalSelect.onclick = () => {
      S.selected_character = true;
      closeDetail();
      showScreen("main");
    };

    // 업그레이드 버튼
    if (S.char_level >= S.char_level_max) {
      modalMainAction.textContent = "맥시멈 레벨";
      modalMainAction.disabled = true;
    } else {
      const cost = charUpgradeCost();
      modalMainAction.textContent = `업그레이드하기: ${cost} 크리스탈`;
      modalMainAction.disabled = false;
    }

    modalMainAction.onclick = () => {
      if (S.char_level >= S.char_level_max) return;
      const cost = charUpgradeCost();
      openConfirm(
        `업그레이드 할까요?\n비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
        () => {
          closeConfirm();
          if (!spendGems(cost)) return tempNotice(modalNotice, "크리스탈이 부족합니다!");
          S.char_level += 1;
          S.char_hp += 0.5;
          S.char_speed += 0.01;
          S.char_stamina += 5;
          tempNotice(modalNotice, "업그레이드 완료!");
          renderDetail();
        },
        () => closeConfirm(),
        screens.equip.style.background
      );
    };

  } else if (detailType === "weapon") {
    const d = weaponData(detailKey);
    modalTitle.textContent = d.name;
    modalBig.textContent = d.emoji;
    modalDesc.textContent = d.desc;

    // ✅ 구매 안 해도 스텟 보이게 (요청사항)
    modalStats.textContent =
      `레벨: ${d.level}\n` +
      `공격력: ${fmt2(d.atk)}\n` +
      `소모 스테미너: ${fmt2(d.stam)}/번\n` +
      `공격 속도: ${fmt2(d.spd)}초\n` +
      `내구도소모: ${fmt3(d.dura_cost)}/번\n` +
      `총 내구도: ${fmt2(d.total_dura)}`;

    // 선택 버튼(목검은 구매해야 선택 가능)
    if (S.selected_weapon === detailKey) {
      modalSelect.textContent = "선택됨";
      modalSelect.disabled = true;
    } else {
      modalSelect.textContent = "선택";
      modalSelect.disabled = false;
    }
    modalSelect.onclick = () => {
      if (detailKey === "wood_sword" && !S.wood_sword_owned) {
        return tempNotice(modalNotice, "구매 후 선택 가능합니다!");
      }
      S.selected_weapon = detailKey;
      closeDetail();
      showScreen("main");
    };

    // 오른쪽 버튼: 목검 미보유면 구매 / 보유면 업그레이드
    if (detailKey === "wood_sword" && !S.wood_sword_owned) {
      modalMainAction.textContent = `구매:${S.wood_sword_price}크리스탈`;
      modalMainAction.disabled = false;
      modalMainAction.onclick = () => {
        openConfirm(
          `목검을 구매하시겠습니까?\n비용: ${S.wood_sword_price} 크리스탈`,
          () => {
            closeConfirm();
            if (!spendGems(S.wood_sword_price)) return tempNotice(modalNotice, "크리스탈이 부족합니다!");
            S.wood_sword_owned = true;
            tempNotice(modalNotice, "구매 완료!");
            renderDetail();
            refreshEquip();
          },
          () => closeConfirm(),
          screens.equip.style.background
        );
      };
    } else {
      // 업그레이드
      const canUp = (detailKey === "club")
        ? (S.club_level < S.club_level_max)
        : (S.wood_sword_level < S.wood_sword_level_max);

      if (!canUp) {
        modalMainAction.textContent = "맥시멈 레벨";
        modalMainAction.disabled = true;
      } else {
        const cost = (detailKey === "club") ? clubUpgradeCost() : woodUpgradeCost();
        modalMainAction.textContent = `업그레이드하기: ${cost} 크리스탈`;
        modalMainAction.disabled = false;
      }

      modalMainAction.onclick = () => {
        const canUp2 = (detailKey === "club")
          ? (S.club_level < S.club_level_max)
          : (S.wood_sword_level < S.wood_sword_level_max);
        if (!canUp2) return;

        const cost = (detailKey === "club") ? clubUpgradeCost() : woodUpgradeCost();
        const nm = (detailKey === "club") ? "나무몽둥이" : "목검";

        openConfirm(
          `${nm} 강화할까요?\n비용: ${cost} 크리스탈\n\n추가되는 능력치\n공격력 +0.1\n소모 스테미너 -0.01\n내구도소모 -0.005/번\n총 내구도 +0.5`,
          () => {
            closeConfirm();
            if (!spendGems(cost)) return tempNotice(modalNotice, "크리스탈이 부족합니다!");

            if (detailKey === "club") {
              S.club_level += 1;
              S.club_atk += 0.1;
              S.club_stamina_cost -= 0.01;
              S.club_dura_cost -= 0.005;
              S.club_total_dura += 0.5;
            } else {
              S.wood_sword_level += 1;
              S.wood_sword_atk += 0.1;
              S.wood_sword_stamina_cost -= 0.01;
              S.wood_sword_dura_cost -= 0.005;
              S.wood_sword_total_dura += 0.5;
            }

            tempNotice(modalNotice, "업그레이드 완료!");
            renderDetail();
            refreshEquip();
          },
          () => closeConfirm(),
          screens.equip.style.background
        );
      };
    }
  }
}

function weaponData(key) {
  if (key === "club") {
    return {
      owned: S.club_owned,
      name: "나무몽둥이",
      emoji: "🪵",
      desc: "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다.",
      level: S.club_level,
      level_max: S.club_level_max,
      atk: S.club_atk,
      stam: S.club_stamina_cost,
      spd: S.club_attack_speed,
      dura_cost: S.club_dura_cost,
      total_dura: S.club_total_dura,
    };
  }
  return {
    owned: S.wood_sword_owned,
    name: "목검",
    emoji: "🗡️",
    desc: "초보자용 무기로 가격이 쌉니다.\n나무몽둥이보단 좋지만 여전히 데미지와 내구도가 적습니다.",
    level: S.wood_sword_level,
    level_max: S.wood_sword_level_max,
    atk: S.wood_sword_atk,
    stam: S.wood_sword_stamina_cost,
    spd: S.wood_sword_attack_speed,
    dura_cost: S.wood_sword_dura_cost,
    total_dura: S.wood_sword_total_dura,
  };
}

function fmt2(n){ return (Math.round(n*100)/100).toString().replace(/\.0+$/,"").replace(/(\.\d*[1-9])0+$/,"$1"); }
function fmt3(n){ return (Math.round(n*1000)/1000).toString().replace(/\.0+$/,"").replace(/(\.\d*[1-9])0+$/,"$1"); }

/* -------------------------
   타이머(상점 무료쿨 / 서버럭)
------------------------- */
let shopTimer = null;
let luckTimer = null;

function startShopCooldown(sec=90) {
  if (shopTimer) clearInterval(shopTimer);
  S.shop_free_in = Math.max(0, Math.floor(sec));
  shopTimer = setInterval(() => {
    S.shop_free_in -= 1;
    if (S.shop_free_in <= 0) {
      S.shop_free_in = 0;
      clearInterval(shopTimer);
      shopTimer = null;
    }
    renderHUD();
    if (currentScreen === "shop") refreshShop();
    if (currentScreen === "main") refreshMain();
  }, 1000);
}

function startServerLuck(sec=60) {
  if (luckTimer) clearInterval(luckTimer);
  S.server_luck_in = Math.max(1, Math.floor(sec));
  luckTimer = setInterval(() => {
    S.server_luck_in -= 1;
    if (S.server_luck_in <= 0) {
      S.server_luck_in = 0;
      clearInterval(luckTimer);
      luckTimer = null;
    }
    renderHUD();
    if (currentScreen === "shop") refreshShop();
    if (currentScreen === "box") refreshBox();
    if (currentScreen === "main") refreshMain();
  }, 1000);
}

/* -------------------------
   전투(Canvas): 그리드 + WASD 이동 + 클릭 슬래쉬(0.2s)
------------------------- */
const canvas = $("battleCanvas");
const ctx = canvas.getContext("2d");

const B = {
  running: false,
  paused: false,
  keys: new Set(),

  player: { x: 0, y: 0, size: 34 },
  speed: 5,

  lastAttackT: 0,
  slashes: [], // {t0, life, frames, theta, baseX, baseY, startAngle, endAngle}
};

function resizeCanvasToCSS() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

window.addEventListener("resize", () => {
  if (currentScreen === "battle") {
    resizeCanvasToCSS();
  }
});

function battleWeaponCooldown() {
  if (S.selected_weapon === "wood_sword") return Number(S.wood_sword_attack_speed);
  return Number(S.club_attack_speed);
}

$("btnBattleHome").onclick = () => {
  B.paused = true;
  B.keys.clear();
  openConfirm("메인화면으로 돌아가겠습니까?", () => {
    closeConfirm();
    battleStop();
    showScreen("main");
  }, () => {
    closeConfirm();
    B.paused = false;
  }, "rgba(255,255,255,.08)");
};

function battleStart() {
  // 화면 들어올 때 1회
  resizeCanvasToCSS();
  B.running = true;
  B.paused = false;
  B.keys.clear();
  B.slashes = [];
  B.lastAttackT = 0;

  // 플레이어 중앙
  const rect = canvas.getBoundingClientRect();
  B.player.x = rect.width / 2;
  B.player.y = rect.height / 2;

  // 입력
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("click", onBattleClick);

  requestAnimationFrame(loopBattle);
}

function battleStop() {
  B.running = false;
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  canvas.removeEventListener("click", onBattleClick);
}

function onKeyDown(e) {
  if (!B.running || B.paused) return;
  const k = (e.key || "").toLowerCase();
  if (["w","a","s","d"].includes(k)) B.keys.add(k);
}
function onKeyUp(e) {
  const k = (e.key || "").toLowerCase();
  if (B.keys.has(k)) B.keys.delete(k);
}

function onBattleClick(e) {
  if (!B.running || B.paused) return;

  const now = performance.now() / 1000;
  const cd = battleWeaponCooldown();
  if (now - B.lastAttackT < cd) return;
  B.lastAttackT = now;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  spawnSlash(mx, my);
}

function spawnSlash(mx, my) {
  const px = B.player.x;
  const py = B.player.y;

  let dx = mx - px;
  let dy = my - py;
  if (dx === 0 && dy === 0) dx = 1;

  const theta = Math.atan2(dy, dx); // screen coords
  // Tk처럼 보이게: deg = -theta
  const deg = -theta * 180 / Math.PI;

  const forward = 46;
  const baseX = px + Math.cos(theta) * forward;
  const baseY = py + Math.sin(theta) * forward;

  const startX = baseX;
  const startY = baseY - 34;

  const startAngle = (deg - 85) * Math.PI / 180;
  const endAngle   = (deg - 35) * Math.PI / 180;

  B.slashes.push({
    t0: performance.now() / 1000,
    life: 0.20,
    frames: 7,
    theta,
    startX, startY,
    startAngle,
    endAngle,
    r: 110,
    extent: 120 * Math.PI / 180,
  });
}

function drawGrid(w, h) {
  const gap = 48;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";
  for (let x=0; x<=w; x+=gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y=0; y<=h; y+=gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function updatePlayer(rectW, rectH) {
  if (B.paused) return;
  let dx=0, dy=0;
  if (B.keys.has("w")) dy -= B.speed;
  if (B.keys.has("s")) dy += B.speed;
  if (B.keys.has("a")) dx -= B.speed;
  if (B.keys.has("d")) dx += B.speed;

  if (dx===0 && dy===0) return;

  const half = B.player.size/2;
  B.player.x = clamp(B.player.x + dx, half, rectW - half);
  B.player.y = clamp(B.player.y + dy, half, rectH - half);
}

function drawPlayer() {
  ctx.fillStyle = "#000";
  const s = B.player.size;
  ctx.fillRect(B.player.x - s/2, B.player.y - s/2, s, s);
}

function drawSlash(slash, tNow) {
  const t = clamp((tNow - slash.t0) / slash.life, 0, 1);

  // 프레임 느낌
  const ang = slash.startAngle + (slash.endAngle - slash.startAngle) * t;

  const drop = 60 * t;
  let cx = slash.startX;
  let cy = slash.startY + drop;

  const push = 20 * t;
  cx += Math.cos(slash.theta) * push;
  cy += Math.sin(slash.theta) * push;

  // 부채꼴(PIESLICE 느낌)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, slash.r, ang, ang + slash.extent, false);
  ctx.closePath();

  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  ctx.stroke();
}

function loopBattle() {
  if (!B.running) return;

  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0,0,w,h);

  // grid
  drawGrid(w,h);

  // move
  updatePlayer(w,h);

  // slashes
  const tNow = performance.now() / 1000;
  B.slashes = B.slashes.filter(s => (tNow - s.t0) <= s.life + 0.03);
  for (const s of B.slashes) drawSlash(s, tNow);

  // player
  drawPlayer();

  requestAnimationFrame(loopBattle);
}

/* -------------------------
   HUD 왼쪽 버튼(상단 공용 ←) 동작
------------------------- */
$("btnHudLeft").onclick = () => {
  if (currentScreen === "main") return; // 메인에서는 의미없음
  if (currentScreen === "shop") return showScreen("main");
  if (currentScreen === "box") return showScreen("main");
  if (currentScreen === "equip") return showScreen("main");
  if (currentScreen === "upgrade") return showScreen("box");
  if (currentScreen === "battle") {
    // 전투는 버튼 따로 있으니 무시
    return;
  }
};

/* -------------------------
   초기 진입
------------------------- */
function init() {
  // HUD 숨김 상태에서 시작
  $("hud").style.display = "none";
  showScreen("title");
  renderHUD();
}
init();
