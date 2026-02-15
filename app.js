document.addEventListener("DOMContentLoaded", () => {
  const screenRoot = document.getElementById("screenRoot");
  const topTitle = document.getElementById("topTitle");
  const topSub = document.getElementById("topSub");
  const gemsVal = document.getElementById("gemsVal");

  const rewardOverlay = document.getElementById("rewardOverlay");
  const rewardText = document.getElementById("rewardText");

  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmDesc = document.getElementById("confirmDesc");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  const state = {
    screen: "title",
    gems: 0,

    shopFreeIn: 0,
    serverLuckIn: 0,

    freeNormalUsed: false,
    freeMidUsed: false,
    freeHighUsed: false,

    charLevel: 1,
    charLevelMax: 10,
    charHp: 1.5,
    charSpeed: 1.0,
    charStamina: 50,

    woodName: "나무몽둥이",
    woodLevel: 1,
    woodLevelMax: 10,
    woodAtk: 2.0,
    woodStaminaCost: 0.1,
    woodAttackSpeed: 1.0,
    woodDuraCost: 0.1,
    woodTotalDura: 7.0,

    swordOwned: false,
    swordName: "목검",
    swordLevel: 1,
    swordLevelMax: 10,
    swordAtk: 2.5,
    swordStaminaCost: 0.09,
    swordAttackSpeed: 1.0,
    swordDuraCost: 0.09,
    swordTotalDura: 8.0,

    normal: null,
    mid: null,
    high: null,

    prev: [],

    confirmYesHandler: null,
    confirmNoHandler: null,

    rewardQueue: [],
    rewardOnDone: null,
  };

  const COLORS = {
    GREEN_BG: "#0b3b1a",
    BLUE_BG: "#1f5fbf",
    PINK_BG: "#ff6fb2",
    LUCK_PURPLE: "#7a2cff",
  };

  const PRICE = { NORMAL: 7, MID: 15, HIGH: 30 };

  function fmtMMSS(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function serverLuckActive() {
    return state.serverLuckIn > 0;
  }

  function setHeader(title, sub) {
    topTitle.textContent = title;
    if (sub) {
      topSub.textContent = sub;
      topSub.hidden = false;
    } else {
      topSub.hidden = true;
    }
  }

  function updateGems() {
    gemsVal.textContent = String(state.gems);
  }

  function addGems(n) {
    state.gems += n;
    updateGems();
    refreshScreen();
  }

  function spendGems(n) {
    if (state.gems < n) return false;
    state.gems -= n;
    updateGems();
    refreshScreen();
    return true;
  }

  function charUpgradeCost() {
    const x = state.charLevel;
    return x * x + 49;
  }

  function weaponUpgradeCost(level) {
    return level * level + 49;
  }

  // ---- overlays
  function showReward(text) {
    rewardText.textContent = text;
    rewardOverlay.hidden = false;
    rewardOverlay.classList.add("is-open");
  }

  function hideReward() {
    rewardOverlay.classList.remove("is-open");
    rewardOverlay.hidden = true;
  }

  function openConfirm(title, desc, onYes, onNo) {
    confirmTitle.textContent = title;
    confirmDesc.textContent = desc || "";
    state.confirmYesHandler = typeof onYes === "function" ? onYes : null;
    state.confirmNoHandler = typeof onNo === "function" ? onNo : null;

    confirmOverlay.hidden = false;
    confirmOverlay.classList.add("is-open");
  }

  function closeConfirm() {
    confirmOverlay.classList.remove("is-open");
    confirmOverlay.hidden = true;
    state.confirmYesHandler = null;
    state.confirmNoHandler = null;
  }

  rewardOverlay.addEventListener("click", () => {
    if (state.rewardQueue.length > 0) {
      const amt = state.rewardQueue.shift();
      hideReward();
      addGems(amt);
      setTimeout(() => {
        if (state.rewardQueue.length > 0) {
          showReward(`크리스탈 ${state.rewardQueue[0]}개를 획득했습니다!`);
        } else {
          if (typeof state.rewardOnDone === "function") state.rewardOnDone();
        }
      }, 10);
      return;
    }
    hideReward();
  });

  confirmNo.addEventListener("click", () => {
    const fn = state.confirmNoHandler;
    closeConfirm();
    if (fn) fn();
  });

  confirmYes.addEventListener("click", () => {
    const fn = state.confirmYesHandler;
    closeConfirm();
    if (fn) fn();
  });

  // ---- navigation
  function clear() { screenRoot.innerHTML = ""; }

  function pushNav(next) {
    state.prev.push(state.screen);
    state.screen = next;
    render();
  }

  function popNav() {
    if (state.prev.length === 0) return;
    state.screen = state.prev.pop();
    render();
  }

  // ---- ui helpers
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function makeScreen(themeClass) {
    return el("section", `screen ${themeClass}`);
  }

  function makeBtn(text, onClick, extraClass = "") {
    const b = el("button", `btn btn-white ${extraClass}`.trim(), text);
    b.addEventListener("click", onClick);
    return b;
  }

  function makeTopLeftBack(onClick) {
    const b = makeBtn("<-", onClick);
    b.classList.add("topLeftBtn");
    return b;
  }

  function makeNotice(text = "") {
    return el("div", "notice", text);
  }

  function applyLuckThemeOnNonEquip(screenEl, baseTheme) {
    screenEl.classList.remove("theme-green", "theme-blue", "theme-pink", "theme-purple");
    screenEl.classList.add(serverLuckActive() ? "theme-purple" : baseTheme);
  }

  // ---- title
  function renderTitle() {
    setHeader("운빨겜!", "");
    clear();

    const s = makeScreen("theme-green");

    const title = el("div", "screenTitle", "운빨겜!");
    title.style.fontSize = "34px";
    title.style.paddingTop = "110px";
    s.appendChild(title);

    const start = makeBtn("게임 시작!", () => {
      state.prev = [];
      state.screen = "game";
      render();
    });
    start.style.position = "absolute";
    start.style.left = "50%";
    start.style.top = "52%";
    start.style.transform = "translate(-50%, -50%)";
    start.style.fontSize = "16px";
    s.appendChild(start);

    screenRoot.appendChild(s);
  }

  // ---- game
  function renderGame() {
    setHeader("운빨겜!", "");
    clear();

    const s = makeScreen("theme-green");
    applyLuckThemeOnNonEquip(s, "theme-green");

    const shopBtn = makeBtn("상점", () => pushNav("shop"));
    shopBtn.classList.add("topLeftBtn");
    if (state.shopFreeIn <= 0) shopBtn.style.background = "yellow";
    s.appendChild(shopBtn);

    const equipBtn = makeBtn("장비", () => pushNav("equip"));
    equipBtn.style.position = "absolute";
    equipBtn.style.left = "12px";
    equipBtn.style.top = "50%";
    equipBtn.style.transform = "translateY(-50%)";
    s.appendChild(equipBtn);

    const luckLabel = el("div", "", "");
    luckLabel.style.position = "absolute";
    luckLabel.style.right = "12px";
    luckLabel.style.top = "46px";
    luckLabel.style.fontSize = "12px";
    luckLabel.style.fontWeight = "900";
    luckLabel.style.opacity = "0.95";
    if (serverLuckActive()) luckLabel.textContent = `서버럭: ${fmtMMSS(state.serverLuckIn)} 남음`;
    s.appendChild(luckLabel);

    const box = el("div", "mainBox");
    const boxBtn = makeBtn("상자 뽑기!", () => pushNav("box"));
    const battleBtn = makeBtn("전투시작!", () => showTempNotice("전투 기능은 준비중입니다!"));
    box.appendChild(boxBtn);
    box.appendChild(battleBtn);
    s.appendChild(box);

    const notice = makeNotice("");
    s.appendChild(notice);

    function showTempNotice(text) {
      notice.textContent = text;
      setTimeout(() => (notice.textContent = ""), 1200);
    }

    function refreshGameTexts() {
      if (serverLuckActive()) luckLabel.textContent = `서버럭: ${fmtMMSS(state.serverLuckIn)} 남음`;
      else luckLabel.textContent = "";

      if (state.shopFreeIn <= 0) shopBtn.style.background = "yellow";
      else shopBtn.style.background = "#ffffff";
    }
    s.__refresh = refreshGameTexts;
    refreshGameTexts();

    screenRoot.appendChild(s);
  }

  // ---- shop
  function renderShop() {
    setHeader("상점", "");
    clear();

    const s = makeScreen("theme-blue");
    applyLuckThemeOnNonEquip(s, "theme-blue");

    s.appendChild(makeTopLeftBack(() => popNav()));

    const title = el("div", "screenTitle", "상점");
    s.appendChild(title);

    const notice = makeNotice("");
    s.appendChild(notice);

    const row = el("div", "cardsRow");

    const freeCard = el("div", "card");
    freeCard.appendChild(el("div", "cardBigEmoji", "💎"));
    freeCard.appendChild(el("div", "cardTitle", "크리스탈"));

    const freeStatus = el("div", "cardPrice", "");
    const freeTimer = el("div", "cardTimer", "");
    freeCard.appendChild(freeStatus);
    freeCard.appendChild(freeTimer);

    freeCard.addEventListener("click", () => {
      if (state.shopFreeIn > 0) return;
      addGems(10);
      state.shopFreeIn = 90;
      showReward("크리스탈 10개를 획득했습니다!");
      refreshShopTexts();
    });

    const luckCard = el("div", "card");
    luckCard.appendChild(el("div", "cardBigEmoji", "🍀"));
    luckCard.appendChild(el("div", "cardTitle", "서버 운 강화"));

    const luckPrice = el("div", "cardPrice", "크리스탈 5개  💎");
    const luckTimer = el("div", "cardTimer", "");
    luckCard.appendChild(luckPrice);
    luckCard.appendChild(luckTimer);

    luckCard.addEventListener("click", () => {
      openConfirm(
        "정말로 구매하시겠습니까?",
        "",
        () => {
          if (!spendGems(5)) {
            notice.textContent = "크리스탈이 부족합니다!";
            setTimeout(() => (notice.textContent = ""), 1200);
            return;
          }
          notice.textContent = "서버 운 강화를 구매했습니다!";
          setTimeout(() => (notice.textContent = ""), 1200);
          state.serverLuckIn = 60;
          refreshScreen();
        },
        () => {}
      );
    });

    row.appendChild(freeCard);
    row.appendChild(luckCard);
    s.appendChild(row);

    function refreshShopTexts() {
      if (state.shopFreeIn <= 0) {
        freeStatus.textContent = "10개";
        freeTimer.textContent = "";
      } else {
        freeStatus.textContent = "이미 받은 아이템입니다";
        freeTimer.textContent = `${fmtMMSS(state.shopFreeIn)}초 후 무료`;
      }

      luckTimer.textContent = serverLuckActive() ? `${fmtMMSS(state.serverLuckIn)} 남음` : "";
    }

    s.__refresh = refreshShopTexts;
    refreshShopTexts();
    screenRoot.appendChild(s);
  }

  // ---- box select
  function renderBoxSelect() {
    setHeader("상자 뽑기", "");
    clear();

    const s = makeScreen("theme-pink");
    applyLuckThemeOnNonEquip(s, "theme-pink");

    s.appendChild(makeTopLeftBack(() => popNav()));

    const title = el("div", "screenTitle", "상자 뽑기");
    s.appendChild(title);

    const luckLabel = el("div", "", "");
    luckLabel.style.position = "absolute";
    luckLabel.style.right = "12px";
    luckLabel.style.top = "46px";
    luckLabel.style.fontSize = "12px";
    luckLabel.style.fontWeight = "900";
    luckLabel.textContent = serverLuckActive() ? `서버럭: ${fmtMMSS(state.serverLuckIn)} 남음` : "";
    s.appendChild(luckLabel);

    const notice = makeNotice("");
    s.appendChild(notice);

    const row = el("div", "cardsRow");

    const c1 = makeBoxCard("일반 상자 업그레이드", () => {
      if (!state.freeNormalUsed) {
        state.freeNormalUsed = true;
        startNormalRun();
        pushNav("normal");
        refreshScreen();
        return;
      }
      if (!spendGems(PRICE.NORMAL)) {
        notice.textContent = "크리스탈이 부족합니다!";
        setTimeout(() => (notice.textContent = ""), 1200);
        return;
      }
      startNormalRun();
      pushNav("normal");
    });

    const c2 = makeBoxCard("중급 상자 업그레이드", () => {
      if (!state.freeMidUsed) {
        state.freeMidUsed = true;
        startMidRun();
        pushNav("mid");
        refreshScreen();
        return;
      }
      if (!spendGems(PRICE.MID)) {
        notice.textContent = "크리스탈이 부족합니다!";
        setTimeout(() => (notice.textContent = ""), 1200);
        return;
      }
      startMidRun();
      pushNav("mid");
    });

    const c3 = makeBoxCard("고급 상자 업그레이드", () => {
      if (!state.freeHighUsed) {
        state.freeHighUsed = true;
        startHighRun();
        pushNav("high");
        refreshScreen();
        return;
      }
      if (!spendGems(PRICE.HIGH)) {
        notice.textContent = "크리스탈이 부족합니다!";
        setTimeout(() => (notice.textContent = ""), 1200);
        return;
      }
      startHighRun();
      pushNav("high");
    });

    row.appendChild(c1.card);
    row.appendChild(c2.card);
    row.appendChild(c3.card);
    s.appendChild(row);

    function makeBoxCard(titleText, onClick) {
      const card = el("div", "card small");
      const t = el("div", "cardTitle", titleText);
      t.style.marginTop = "0px";
      t.style.paddingTop = "6px";
      card.appendChild(t);

      const price = el("div", "cardPrice", "");
      card.appendChild(price);

      card.addEventListener("click", onClick);
      return { card, price };
    }

    function refreshBoxPrices() {
      c1.price.textContent = !state.freeNormalUsed ? "무료 1회 남음" : `${PRICE.NORMAL} 크리스탈`;
      c2.price.textContent = !state.freeMidUsed ? "무료 1회 남음" : `${PRICE.MID} 크리스탈`;
      c3.price.textContent = !state.freeHighUsed ? "무료 1회 남음" : `${PRICE.HIGH} 크리스탈`;

      luckLabel.textContent = serverLuckActive() ? `서버럭: ${fmtMMSS(state.serverLuckIn)} 남음` : "";
    }

    s.__refresh = refreshBoxPrices;
    refreshBoxPrices();
    screenRoot.appendChild(s);
  }

  // ---- reward sequence
  function dotsText(filled) {
    return ["●", "●", "●"].map((d, i) => (i < filled ? "●" : "○")).join(" ");
  }

  function beginRewardSequence(amountEach, times, onDone) {
    state.rewardQueue = Array(times).fill(amountEach);
    state.rewardOnDone = onDone;
    showReward(`크리스탈 ${state.rewardQueue[0]}개를 획득했습니다!`);
  }

  // ---- normal
  function startNormalRun() {
    state.normal = {
      stage: "브론즈",
      filled: 3,
      openReady: false,
      splitDone: false,
      two: false,
      tappedOnce: false,
      tapSizeGrow: true,
      tapSize: 18,
    };
  }

  function normalReward(stage) {
    const map = { "브론즈": 1, "실버": 2, "골드": 3, "에메랄드": 5, "다이아": 7, "레드 다이아": 10 };
    return map[stage] ?? 1;
  }

  function normalNextProbBase(stage) {
    if (stage === "브론즈") return ["실버", 0.70];
    if (stage === "실버") return ["골드", 0.60];
    if (stage === "골드") return ["에메랄드", 0.50];
    if (stage === "에메랄드") return ["다이아", 0.30];
    if (stage === "다이아") return ["레드 다이아", 0.10];
    return [null, 0.0];
  }

  function normalSplitProb() { return serverLuckActive() ? 0.15 : 0.10; }

  function renderNormal() {
    setHeader("상자 뽑기", "");
    clear();

    const s = makeScreen("theme-pink");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const tap = el("div", "tapLabel", "탭하세요!");
    const grade = el("div", "gradeLabel", "");
    s.appendChild(tap);
    s.appendChild(grade);

    const clickArea = el("div", "clickArea");
    s.appendChild(clickArea);

    const boxHolder = el("div", "boxHolder");
    clickArea.appendChild(boxHolder);

    const box1 = el("div", "boxEmoji", "📦");
    const box2 = el("div", "boxEmoji", "📦");
    boxHolder.appendChild(box1);

    const dots = el("div", "dotsLabel", "");
    clickArea.appendChild(dots);

    function refreshUI() {
      const st = state.normal;
      grade.textContent = st.stage;

      tap.style.display = st.tappedOnce ? "none" : "block";
      tap.style.fontSize = `${st.tapSize}px`;

      const isBig = st.openReady;
      box1.classList.toggle("big", isBig);
      box2.classList.toggle("big", isBig);

      boxHolder.innerHTML = "";
      if (st.two) {
        boxHolder.appendChild(box1);
        boxHolder.appendChild(box2);
      } else {
        boxHolder.appendChild(box1);
      }

      dots.textContent = st.openReady ? "" : dotsText(st.filled);
    }

    function tickTapAnim() {
      const st = state.normal;
      if (!st || st.tappedOnce) return;
      if (st.tapSizeGrow) {
        st.tapSize += 1;
        if (st.tapSize >= 26) st.tapSizeGrow = false;
      } else {
        st.tapSize -= 1;
        if (st.tapSize <= 18) st.tapSizeGrow = true;
      }
      tap.style.fontSize = `${st.tapSize}px`;
      requestAnimationFrame(() => setTimeout(tickTapAnim, 80));
    }
    tickTapAnim();

    function onTap() {
      const st = state.normal;
      if (!st) return;
      if (!st.tappedOnce) st.tappedOnce = true;

      if (st.openReady) {
        const times = st.two ? 2 : 1;
        const amt = normalReward(st.stage);
        beginRewardSequence(amt, times, () => {
          state.screen = "box";
          state.prev = ["game"];
          render();
        });
        return;
      }

      if (!st.splitDone && Math.random() < normalSplitProb()) {
        st.two = true;
        st.splitDone = true;
        st.filled = 3;
        refreshUI();
        return;
      }

      st.filled = Math.max(0, st.filled - 1);

      const [nxt, baseP] = normalNextProbBase(st.stage);
      let p = baseP;
      if (nxt && serverLuckActive()) p = Math.min(1.0, p + 0.05);

      if (nxt && Math.random() < p) {
        st.stage = nxt;
        st.filled = 3;
        st.openReady = false;
        refreshUI();
        return;
      }

      if (st.filled === 0) {
        st.openReady = true;
        refreshUI();
        return;
      }

      refreshUI();
    }

    clickArea.addEventListener("click", (e) => {
      e.preventDefault();
      onTap();
    });

    refreshUI();
    screenRoot.appendChild(s);
  }

  // ---- mid
  function startMidRun() {
    state.mid = {
      star: 1,
      filled: 3,
      openReady: false,
      splitDone: false,
      two: false,
      tappedOnce: false,
      tapSizeGrow: true,
      tapSize: 18,
    };
  }

  function midReward(star) {
    const map = { 1: 7, 2: 10, 3: 15, 4: 25, 5: 37 };
    return map[star] ?? 7;
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

  function midSplitProb() { return serverLuckActive() ? 0.15 : 0.10; }

  function renderMid() {
    setHeader("상자 뽑기", "");
    clear();

    const s = makeScreen("theme-pink");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const tap = el("div", "tapLabel", "탭하세요!");
    const grade = el("div", "gradeLabel", "");
    s.appendChild(tap);
    s.appendChild(grade);

    const clickArea = el("div", "clickArea");
    s.appendChild(clickArea);

    const boxHolder = el("div", "boxHolder");
    clickArea.appendChild(boxHolder);

    const box1 = el("div", "boxEmoji", "🎁");
    const box2 = el("div", "boxEmoji", "🎁");
    boxHolder.appendChild(box1);

    const dots = el("div", "dotsLabel", "");
    clickArea.appendChild(dots);

    function refreshUI() {
      const st = state.mid;
      grade.textContent = "★".repeat(st.star);

      tap.style.display = st.tappedOnce ? "none" : "block";
      tap.style.fontSize = `${st.tapSize}px`;

      const isBig = st.openReady;
      box1.classList.toggle("big", isBig);
      box2.classList.toggle("big", isBig);

      boxHolder.innerHTML = "";
      if (st.two) {
        boxHolder.appendChild(box1);
        boxHolder.appendChild(box2);
      } else {
        boxHolder.appendChild(box1);
      }

      dots.textContent = st.openReady ? "" : dotsText(st.filled);
    }

    function tickTapAnim() {
      const st = state.mid;
      if (!st || st.tappedOnce) return;
      if (st.tapSizeGrow) {
        st.tapSize += 1;
        if (st.tapSize >= 26) st.tapSizeGrow = false;
      } else {
        st.tapSize -= 1;
        if (st.tapSize <= 18) st.tapSizeGrow = true;
      }
      tap.style.fontSize = `${st.tapSize}px`;
      requestAnimationFrame(() => setTimeout(tickTapAnim, 80));
    }
    tickTapAnim();

    function onTap() {
      const st = state.mid;
      if (!st) return;

      if (!st.tappedOnce) st.tappedOnce = true;

      if (st.openReady) {
        const times = st.two ? 2 : 1;
        const amt = midReward(st.star);
        beginRewardSequence(amt, times, () => {
          state.screen = "box";
          state.prev = ["game"];
          render();
        });
        return;
      }

      if (!st.splitDone && Math.random() < midSplitProb()) {
        st.two = true;
        st.splitDone = true;
        st.filled = 3;
        refreshUI();
        return;
      }

      st.filled = Math.max(0, st.filled - 1);

      if (st.star < 5 && Math.random() < midUpgradeProb(st.star)) {
        st.star += 1;
        st.filled = 3;
        st.openReady = false;
        refreshUI();
        return;
      }

      if (st.filled === 0) {
        st.openReady = true;
        refreshUI();
        return;
      }

      refreshUI();
    }

    clickArea.addEventListener("click", (e) => {
      e.preventDefault();
      onTap();
    });

    refreshUI();
    screenRoot.appendChild(s);
  }

  // ---- high
  function startHighRun() {
    state.high = {
      stage: "희귀",
      filled: 3,
      openReady: false,
      splitDone: false,
      two: false,
      tappedOnce: false,
      tapSizeGrow: true,
      tapSize: 18,
    };
  }

  const HIGH_BG = {
    "희귀": "#1aa84b",
    "초희귀": "#1f5fbf",
    "영웅": "#7a2cff",
    "신화": "#ff2b2b",
    "전설": "#ffd400",
    "울트라 전설": "#ffffff",
  };

  function highNextProbBase(stage) {
    if (stage === "희귀") return ["초희귀", 0.75];
    if (stage === "초희귀") return ["영웅", 0.50];
    if (stage === "영웅") return ["신화", 0.35];
    if (stage === "신화") return ["전설", 0.15];
    if (stage === "전설") return ["울트라 전설", 0.05];
    return [null, 0.0];
  }

  function highReward(stage) {
    const map = { "희귀": 20, "초희귀": 25, "영웅": 30, "신화": 50, "전설": 100, "울트라 전설": 300 };
    return map[stage] ?? 20;
  }

  function renderHigh() {
    setHeader("상자 뽑기", "");
    clear();

    const s = makeScreen("theme-pink");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const tap = el("div", "tapLabel", "탭하세요!");
    const grade = el("div", "gradeLabel", "");
    s.appendChild(tap);
    s.appendChild(grade);

    const clickArea = el("div", "clickArea");
    s.appendChild(clickArea);

    const boxHolder = el("div", "boxHolder");
    clickArea.appendChild(boxHolder);

    const box1 = el("div", "boxEmoji", "🧰");
    const box2 = el("div", "boxEmoji", "🧰");
    boxHolder.appendChild(box1);

    const dots = el("div", "dotsLabel", "");
    clickArea.appendChild(dots);

    function applyStageTheme() {
      const st = state.high;
      const bg = HIGH_BG[st.stage] || COLORS.PINK_BG;
      const isWhite = String(bg).toLowerCase() === "#ffffff";
      const fg = isWhite ? "black" : "white";

      s.style.background = bg;
      clickArea.style.background = bg;

      tap.style.color = fg;
      grade.style.color = fg;
      dots.style.color = fg;

      tap.style.background = bg;
      grade.style.background = bg;
      dots.style.background = bg;

      box1.style.color = fg;
      box2.style.color = fg;
    }

    function refreshUI() {
      const st = state.high;
      grade.textContent = st.stage;

      tap.style.display = st.tappedOnce ? "none" : "block";
      tap.style.fontSize = `${st.tapSize}px`;

      const isBig = st.openReady;
      box1.classList.toggle("big", isBig);
      box2.classList.toggle("big", isBig);

      boxHolder.innerHTML = "";
      if (st.two) {
        boxHolder.appendChild(box1);
        boxHolder.appendChild(box2);
      } else {
        boxHolder.appendChild(box1);
      }

      dots.textContent = st.openReady ? "" : dotsText(st.filled);
      applyStageTheme();
    }

    function tickTapAnim() {
      const st = state.high;
      if (!st || st.tappedOnce) return;
      if (st.tapSizeGrow) {
        st.tapSize += 1;
        if (st.tapSize >= 26) st.tapSizeGrow = false;
      } else {
        st.tapSize -= 1;
        if (st.tapSize <= 18) st.tapSizeGrow = true;
      }
      tap.style.fontSize = `${st.tapSize}px`;
      requestAnimationFrame(() => setTimeout(tickTapAnim, 80));
    }
    tickTapAnim();

    function onTap() {
      const st = state.high;
      if (!st) return;

      if (!st.tappedOnce) st.tappedOnce = true;

      if (st.openReady) {
        const times = st.two ? 2 : 1;
        const amt = highReward(st.stage);
        beginRewardSequence(amt, times, () => {
          state.screen = "box";
          state.prev = ["game"];
          render();
        });
        return;
      }

      if (!st.splitDone && Math.random() < 0.10) {
        st.two = true;
        st.splitDone = true;
        st.filled = 3;
        refreshUI();
        return;
      }

      st.filled = Math.max(0, st.filled - 1);

      const [nxt, baseP] = highNextProbBase(st.stage);
      let p = baseP;
      if (nxt && serverLuckActive()) p = Math.min(1.0, p + 0.05);

      if (nxt && Math.random() < p) {
        st.stage = nxt;
        st.filled = 3;
        st.openReady = false;
        refreshUI();
        return;
      }

      if (st.filled === 0) {
        st.openReady = true;
        refreshUI();
        return;
      }

      refreshUI();
    }

    clickArea.addEventListener("click", (e) => {
      e.preventDefault();
      onTap();
    });

    refreshUI();
    screenRoot.appendChild(s);
  }

  // ---- equip
  function renderEquip() {
    setHeader("장비 구성", "");
    clear();

    const s = makeScreen("theme-green");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const title = el("div", "screenTitle", "장비 구성");
    s.appendChild(title);

    const tabs = el("div", "tabsRow");
    const names = ["캐릭터", "주무기", "보조무기", "유물"];
    const currentTab = state.__equipTab ?? 0;

    names.forEach((nm, idx) => {
      const b = el("button", "tabBtn", nm);
      if (idx === currentTab) b.classList.add("active");
      b.addEventListener("click", () => {
        state.__equipTab = idx;
        render({ closeOverlays: false });
      });
      tabs.appendChild(b);
    });
    s.appendChild(tabs);

    const wrap = el("div", "equipScrollWrap");
    const grid = el("div", "equipGrid");

    const tab = currentTab;
    const slots = [];

    if (tab === 0) {
      slots.push(makeCharacterSlot());
      slots.push(makeBasicSlot("🙂"));
      slots.push(makeBasicSlot("🙂"));
      slots.push(makeBasicSlot("🙂"));
      slots.push(makeBasicSlot("🙂"));
    } else if (tab === 1) {
      slots.push(makeWeaponSlot("wood"));
      slots.push(makeWeaponSlot("sword"));
      slots.push(makeBasicSlot("⚔️"));
      slots.push(makeBasicSlot("⚔️"));
      slots.push(makeBasicSlot("⚔️"));
    } else if (tab === 2) {
      slots.push(makeBasicSlot("🛡️"));
      slots.push(makeBasicSlot("🛡️"));
      slots.push(makeBasicSlot("🛡️"));
      slots.push(makeBasicSlot("🛡️"));
      slots.push(makeBasicSlot("🛡️"));
    } else {
      slots.push(makeBasicSlot("🔮"));
      slots.push(makeBasicSlot("🔮"));
      slots.push(makeBasicSlot("🔮"));
      slots.push(makeBasicSlot("🔮"));
      slots.push(makeBasicSlot("🔮"));
    }

    slots.forEach((sl) => grid.appendChild(sl));
    wrap.appendChild(grid);
    s.appendChild(wrap);

    screenRoot.appendChild(s);

    function makeBasicSlot(emoji) {
      const slot = el("div", "slot");
      slot.appendChild(el("div", "slotEmoji", emoji));
      return slot;
    }

    function makeCharacterSlot() {
      const slot = el("div", "slot");
      slot.appendChild(el("div", "slotInnerBlack"));

      const name = el("div", "slotName", "네모");
      slot.appendChild(name);

      slot.appendChild(el("div", "slotLevel", String(state.charLevel)));

      const bottom = el("div", "slotBottomTag", "");
      slot.appendChild(bottom);

      const maxOn = state.charLevel >= state.charLevelMax;
      bottom.textContent = maxOn ? "맥시멈 레벨" : "";
      if (maxOn) name.classList.add("maxShift");
      else name.classList.remove("maxShift");

      slot.addEventListener("click", () => pushNav("charDetail"));
      return slot;
    }

    function makeWeaponSlot(kind) {
      const slot = el("div", "slot");
      const emoji = kind === "wood" ? "🪵" : "🗡️";
      slot.appendChild(el("div", "slotEmoji", emoji));

      const nm = kind === "wood" ? "나무몽둥이" : "목검";
      const name = el("div", "slotName", nm);
      name.style.top = "140px";
      slot.appendChild(name);

      const lvlVal =
        kind === "wood" ? state.woodLevel :
        (state.swordOwned ? state.swordLevel : 0);

      const lvl = el("div", "slotLevel", String(lvlVal || ""));
      slot.appendChild(lvl);

      const bottom = el("div", "slotBottomTag", "");
      slot.appendChild(bottom);

      if (kind === "sword" && !state.swordOwned) {
        bottom.textContent = "100크리스탈";
        lvl.textContent = "";
      } else {
        const maxOn =
          kind === "wood" ? (state.woodLevel >= state.woodLevelMax) :
          (state.swordLevel >= state.swordLevelMax);

        bottom.textContent = maxOn ? "맥시멈 레벨" : "";
        if (maxOn) name.classList.add("maxShift");
      }

      slot.addEventListener("click", () => {
        if (kind === "wood") pushNav("woodDetail");
        else pushNav("swordDetail");
      });
      return slot;
    }
  }

  // ---- char detail
  function renderCharDetail() {
    setHeader("장비 구성", "");
    clear();

    const s = makeScreen("theme-green");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const header = el("div", "detailHeader");
    header.appendChild(el("div", "name", "네모"));
    header.appendChild(el("div", "sub", "기본캐릭터"));
    s.appendChild(header);

    s.appendChild(el("div", "bigBlackChar"));

    const stats = el("div", "statsRight");
    const lvl = el("div", "", "");
    const hp = el("div", "", "");
    const sp = el("div", "", "");
    const st = el("div", "", "");
    stats.appendChild(lvl);
    stats.appendChild(hp);
    stats.appendChild(sp);
    stats.appendChild(st);
    s.appendChild(stats);

    const notice = makeNotice("");
    s.appendChild(notice);

    const upgradeBtn = makeBtn("", () => openInlineConfirm());
    upgradeBtn.classList.add("upgradeBtn");
    s.appendChild(upgradeBtn);

    const inline = makeInlineConfirm();
    s.appendChild(inline.wrap);

    function refreshTexts() {
      lvl.textContent = `레벨: ${state.charLevel}`;
      hp.textContent = `체력: ${fmtFloat(state.charHp)}`;
      sp.textContent = `이동속도: ${fmtFloat(state.charSpeed)}`;
      st.textContent = `스테미너: ${Math.floor(state.charStamina)}`;

      if (state.charLevel < state.charLevelMax) {
        const cost = charUpgradeCost();
        upgradeBtn.disabled = false;
        upgradeBtn.textContent = `업그레이드하기: ${cost} 크리스탈`;
      } else {
        upgradeBtn.disabled = true;
        upgradeBtn.textContent = "맥시멈 레벨";
      }
    }

    function openInlineConfirm() {
      if (state.charLevel >= state.charLevelMax) {
        notice.textContent = "이미 맥시멈 레벨입니다!";
        setTimeout(() => (notice.textContent = ""), 1200);
        return;
      }
      const cost = charUpgradeCost();
      inline.open(
        "업그레이드 할까요?",
        `비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
        () => {
          if (!spendGems(cost)) {
            notice.textContent = "크리스탈이 부족합니다!";
            setTimeout(() => (notice.textContent = ""), 1200);
            return;
          }
          state.charLevel += 1;
          state.charHp += 0.5;
          state.charSpeed += 0.01;
          state.charStamina += 5;
          refreshTexts();
          notice.textContent = "업그레이드 완료!";
          setTimeout(() => (notice.textContent = ""), 1200);
          refreshScreen();
        },
        () => {}
      );
    }

    s.__refresh = refreshTexts;
    refreshTexts();
    screenRoot.appendChild(s);

    function fmtFloat(v) { return (Math.round(v * 100) / 100).toString(); }
  }

  // ---- weapon detail
  function renderWoodDetail() { renderWeaponDetail("wood"); }
  function renderSwordDetail() { renderWeaponDetail("sword"); }

  function renderWeaponDetail(kind) {
    setHeader("장비 구성", "");
    clear();

    const s = makeScreen("theme-green");
    s.appendChild(makeTopLeftBack(() => popNav()));

    const isWood = kind === "wood";
    const name = isWood ? "나무몽둥이" : "목검";

    const header = el("div", "detailHeader");
    header.appendChild(el("div", "name", name));
    s.appendChild(header);

    s.appendChild(el("div", "bigWeaponEmoji", isWood ? "🪵" : "🗡️"));

    const descText = isWood
      ? "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다."
      : "초보자용 무기로 가격이 쌉니다.\n나무몽둥이보단 좋지만 여전히 데미지와 내구도가 낮습니다.";
    s.appendChild(el("div", "weaponDesc", descText));

    const stats = el("div", "statsRight");
    stats.style.right = "300px";

    const lvl = el("div", "", "");
    const s1 = el("div", "", "");
    const s2 = el("div", "", "");
    const s3 = el("div", "", "");
    const s4 = el("div", "", "");
    const s5 = el("div", "", "");
    stats.appendChild(lvl);
    stats.appendChild(s1);
    stats.appendChild(s2);
    stats.appendChild(s3);
    stats.appendChild(s4);
    stats.appendChild(s5);
    s.appendChild(stats);

    const notice = makeNotice("");
    s.appendChild(notice);

    const actionBtn = makeBtn("", () => onAction());
    actionBtn.classList.add("upgradeBtn");
    s.appendChild(actionBtn);

    const inline = makeInlineConfirm();
    s.appendChild(inline.wrap);

    function readWeapon() {
      if (isWood) {
        return {
          owned: true,
          level: state.woodLevel,
          levelMax: state.woodLevelMax,
          atk: state.woodAtk,
          staminaCost: state.woodStaminaCost,
          atkSpeed: state.woodAttackSpeed,
          duraCost: state.woodDuraCost,
          totalDura: state.woodTotalDura,
        };
      }
      return {
        owned: state.swordOwned,
        level: state.swordLevel,
        levelMax: state.swordLevelMax,
        atk: state.swordAtk,
        staminaCost: state.swordStaminaCost,
        atkSpeed: state.swordAttackSpeed,
        duraCost: state.swordDuraCost,
        totalDura: state.swordTotalDura,
      };
    }

    function writeWeapon(next) {
      if (isWood) {
        state.woodLevel = next.level;
        state.woodAtk = next.atk;
        state.woodStaminaCost = next.staminaCost;
        state.woodAttackSpeed = next.atkSpeed;
        state.woodDuraCost = next.duraCost;
        state.woodTotalDura = next.totalDura;
      } else {
        state.swordOwned = next.owned;
        state.swordLevel = next.level;
        state.swordAtk = next.atk;
        state.swordStaminaCost = next.staminaCost;
        state.swordAttackSpeed = next.atkSpeed;
        state.swordDuraCost = next.duraCost;
        state.swordTotalDura = next.totalDura;
      }
      refreshScreen();
    }

    // ✅ 변경 포인트: 미구매라도 스텟 표시
    function refreshTexts() {
      const w = readWeapon();

      // 구매 여부와 상관없이 “기본 스텟 표시”
      // (미구매 상태면 레벨은 1 기준으로 보여주기)
      const showLevel = (!isWood && !w.owned) ? 1 : w.level;

      lvl.textContent = `레벨: ${showLevel}`;
      s1.textContent = `공격력:${fmt3(w.atk)}`;
      s2.textContent = `소모 스테미너:${fmt3(w.staminaCost)}`;
      s3.textContent = `공격 속도:${fmtSpeed(w.atkSpeed)}초`;
      s4.textContent = `내구도소모:${fmt3(w.duraCost)}/번`;
      s5.textContent = `총 내구도:${fmt3(w.totalDura)}`;

      // 버튼 텍스트/활성
      if (!isWood && !w.owned) {
        actionBtn.disabled = false;
        actionBtn.textContent = "100 크리스탈로 구매하기";
        return;
      }

      if (w.level < w.levelMax) {
        const cost = weaponUpgradeCost(w.level);
        actionBtn.disabled = false;
        actionBtn.textContent = `업그레이드하기: ${cost} 크리스탈`;
      } else {
        actionBtn.disabled = true;
        actionBtn.textContent = "맥시멈 레벨";
      }
    }

    function onAction() {
      const w = readWeapon();

      // 목검 구매
      if (!isWood && !w.owned) {
        openConfirm(
          "목검을 구매하시겠습니까?",
          "100 크리스탈",
          () => {
            if (!spendGems(100)) {
              notice.textContent = "크리스탈이 부족합니다!";
              setTimeout(() => (notice.textContent = ""), 1200);
              return;
            }
            writeWeapon({ ...w, owned: true, level: 1 });
            notice.textContent = "구매 완료!";
            setTimeout(() => (notice.textContent = ""), 1200);
            refreshTexts();
          },
          () => {}
        );
        return;
      }

      // 업그레이드
      if (w.level >= w.levelMax) {
        notice.textContent = "이미 맥시멈 레벨입니다!";
        setTimeout(() => (notice.textContent = ""), 1200);
        return;
      }

      const cost = weaponUpgradeCost(w.level);
      inline.open(
        "업그레이드 할까요?",
        `비용: ${cost} 크리스탈\n\n추가되는 능력치\n공격력 +0.1\n소모 스테미너 -0.01\n내구도소모 -0.005/번\n총 내구도 +0.5`,
        () => {
          if (!spendGems(cost)) {
            notice.textContent = "크리스탈이 부족합니다!";
            setTimeout(() => (notice.textContent = ""), 1200);
            return;
          }

          const next = { ...w };
          next.level += 1;
          next.atk = round3(next.atk + 0.1);
          next.staminaCost = round3(Math.max(0, next.staminaCost - 0.01));
          next.duraCost = round3(Math.max(0, next.duraCost - 0.005));
          next.totalDura = round3(next.totalDura + 0.5);

          writeWeapon(next);
          refreshTexts();
          notice.textContent = "업그레이드 완료!";
          setTimeout(() => (notice.textContent = ""), 1200);
        },
        () => {}
      );
    }

    s.__refresh = refreshTexts;
    refreshTexts();
    screenRoot.appendChild(s);

    function round3(x) { return Math.round(x * 1000) / 1000; }
    function fmt3(x) {
      const v = round3(Number(x));
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
    function fmtSpeed(x) {
      const v = Number(x);
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
  }

  // ---- inline confirm
  function makeInlineConfirm() {
    const wrap = el("div", "inlineConfirmWrap");
    const card = el("div", "inlineCard");
    const t = el("div", "inlineTitle", "");
    const d = el("div", "inlineDesc", "");
    const btns = el("div", "inlineBtns");
    const yes = makeBtn("예", () => {});
    const no = makeBtn("아니요", () => {});
    btns.appendChild(yes);
    btns.appendChild(no);
    card.appendChild(t);
    card.appendChild(d);
    card.appendChild(btns);
    wrap.appendChild(card);

    let yesFn = null;
    let noFn = null;

    function open(title, desc, onYes, onNo) {
      t.textContent = title;
      d.textContent = desc || "";
      yesFn = typeof onYes === "function" ? onYes : null;
      noFn = typeof onNo === "function" ? onNo : null;
      wrap.classList.add("is-open");
    }

    function close() {
      wrap.classList.remove("is-open");
      yesFn = null;
      noFn = null;
    }

    yes.addEventListener("click", () => {
      const fn = yesFn;
      close();
      if (fn) fn();
    });

    no.addEventListener("click", () => {
      const fn = noFn;
      close();
      if (fn) fn();
    });

    return { wrap, open, close };
  }

  // ---- render switch
  function render(opts = {}) {
    const closeOverlays = opts.closeOverlays !== false;

    updateGems();
    if (closeOverlays) {
      hideReward();
      closeConfirm();
    }

    if (state.screen === "title") return renderTitle();
    if (state.screen === "game") return renderGame();
    if (state.screen === "shop") return renderShop();
    if (state.screen === "box") return renderBoxSelect();
    if (state.screen === "normal") return renderNormal();
    if (state.screen === "mid") return renderMid();
    if (state.screen === "high") return renderHigh();
    if (state.screen === "equip") return renderEquip();
    if (state.screen === "charDetail") return renderCharDetail();
    if (state.screen === "woodDetail") return renderWeaponDetail("wood");
    if (state.screen === "swordDetail") return renderWeaponDetail("sword");

    state.screen = "title";
    return renderTitle();
  }

  function refreshScreen() {
    const screen = screenRoot.firstElementChild;
    if (screen && typeof screen.__refresh === "function") screen.__refresh();
  }

  // ---- timers
  setInterval(() => {
    if (state.shopFreeIn > 0) {
      state.shopFreeIn -= 1;
      if (state.shopFreeIn < 0) state.shopFreeIn = 0;
      if (state.screen === "shop" || state.screen === "game") refreshScreen();
    }

    if (state.serverLuckIn > 0) {
      state.serverLuckIn -= 1;
      if (state.serverLuckIn < 0) state.serverLuckIn = 0;
      refreshScreen();
    }
  }, 1000);

  render();
});
