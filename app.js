alert("app.js 진입");
console.log("app.js 진입");

/* =========================
   운빨겜! - Web Full Version
   ========================= */

(() => {
  /** @type {HTMLElement} */
  const appEl = document.getElementById("app");

  // Screens
  const screens = {
    main: document.getElementById("screen-main"),
    shop: document.getElementById("screen-shop"),
    box: document.getElementById("screen-box"),
    upgrade: document.getElementById("screen-upgrade"),
    equip: document.getElementById("screen-equip"),
    battle: document.getElementById("screen-battle"),
  };

  // HUD
  const gemsText = document.getElementById("gemsText");
  const serverLuckLine = document.getElementById("serverLuckLine");
  const serverLuckText = document.getElementById("serverLuckText");

  // Main UI
  const btnStart = document.getElementById("btnStart");
  const btnShop = document.getElementById("btnShop");
  const btnEquip = document.getElementById("btnEquip");
  const btnBox = document.getElementById("btnBox");
  const btnBattle = document.getElementById("btnBattle");
  const needSelectText = document.getElementById("needSelectText");
  const mainNotice = document.getElementById("mainNotice");

  // Shop UI
  const shopFreeCard = document.getElementById("shopFreeCard");
  const shopFreeStatus = document.getElementById("shopFreeStatus");
  const shopFreeTimer = document.getElementById("shopFreeTimer");
  const shopLuckCard = document.getElementById("shopLuckCard");
  const shopLuckTimer = document.getElementById("shopLuckTimer");
  const shopNotice = document.getElementById("shopNotice");

  // Box UI
  const cardNormal = document.getElementById("cardNormal");
  const cardMid = document.getElementById("cardMid");
  const cardHigh = document.getElementById("cardHigh");
  const priceNormal = document.getElementById("priceNormal");
  const priceMid = document.getElementById("priceMid");
  const priceHigh = document.getElementById("priceHigh");
  const boxNotice = document.getElementById("boxNotice");

  // Upgrade UI
  const tapHint = document.getElementById("tapHint");
  const upgradeTitle = document.getElementById("upgradeTitle");
  const tapArea = document.getElementById("tapArea");
  const boxA = document.getElementById("boxA");
  const boxB = document.getElementById("boxB");
  const dots = document.getElementById("dots");

  // Equip UI
  const equipGrid = document.getElementById("equipGrid");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  // Modal
  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalBig = document.getElementById("modalBig");
  const modalDesc = document.getElementById("modalDesc");
  const modalStats = document.getElementById("modalStats");
  const btnSelect = document.getElementById("btnSelect");
  const btnMainAction = document.getElementById("btnMainAction");
  const modalNotice = document.getElementById("modalNotice");

  // Confirm
  const confirm = document.getElementById("confirm");
  const confirmMsg = document.getElementById("confirmMsg");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  // Reward
  const reward = document.getElementById("reward");
  const rewardText = document.getElementById("rewardText");

  // Battle
  const btnBattleHome = document.getElementById("btnBattleHome");
  const battleCanvas = document.getElementById("battleCanvas");
  const ctx = battleCanvas.getContext("2d");

  /* =========================
     State
  ========================= */
  const state = {
    // currency
    gems: 0,

    // free box 1 time
    freeNormalUsed: false,
    freeMidUsed: false,
    freeHighUsed: false,

    // shop cooldown
    shopFreeIn: 0,        // seconds
    serverLuckIn: 0,      // seconds

    // selections (battle start requirement)
    selectedCharacter: false,
    selectedWeapon: null, // "club" | "wood_sword" | null

    // character
    charLevel: 1,
    charLevelMax: 10,
    charHp: 1.5,
    charSpeed: 1.0,
    charStamina: 50,

    // club
    clubOwned: true,
    clubLevel: 1,
    clubLevelMax: 10,
    clubAtk: 2.0,
    clubStaminaCost: 0.10,
    clubAttackSpeed: 1.0,
    clubDuraCost: 0.10,
    clubTotalDura: 7.0,

    // wood sword
    woodSwordOwned: false,
    woodSwordPrice: 100,
    woodSwordLevel: 1,
    woodSwordLevelMax: 10,
    woodSwordAtk: 5.0,
    woodSwordStaminaCost: 1.5,
    woodSwordAttackSpeed: 0.7,
    woodSwordDuraCost: 0.15,
    woodSwordTotalDura: 10.0,
  };

  /* =========================
     Helpers
  ========================= */
  const fmtMMSS = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const showNotice = (el, text, ms = 1200) => {
    el.textContent = text || "";
    if (!text) return;
    window.setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, ms);
  };

  const setHidden = (el, hidden) => {
  el.classList.toggle("hidden", !!hidden);

  // ✅ CSS가 꼬여도 나열 안 되게 display 강제
  el.style.display = hidden ? "none" : "block";
};


  const closeModal = () => {
    setHidden(modal, true);
    currentDetailKey = null;
    modalNotice.textContent = "";
  };

  const closeConfirm = () => {
    setHidden(confirm, true);
    confirmYesFn = null;
    confirmNoFn = null;
  };

  const hideReward = () => setHidden(reward, true);

  const showScreen = (name) => {
    // ✅ 화면 “나열” 방지: 항상 하나만 보이게 강제
    Object.entries(screens).forEach(([k, el]) => setHidden(el, k !== name));

    // 오버레이 정리
    closeModal();
    closeConfirm();
    hideReward();

    // 갱신
    refreshHUD();
    if (name === "shop") refreshShop();
    if (name === "box") refreshBox();
    if (name === "equip") renderEquip();
    if (name === "battle") battle.start();
  };

  const addGems = (amt) => {
    state.gems += amt;
    refreshHUD();
    refreshShop();
    refreshBox();
    renderEquipIfOpen();
  };

  const spendGems = (amt) => {
    if (state.gems < amt) return false;
    state.gems -= amt;
    refreshHUD();
    refreshShop();
    refreshBox();
    renderEquipIfOpen();
    return true;
  };

  const charUpgradeCost = () => {
    const x = Math.floor(state.charLevel);
    return x * x + 49;
  };
  const clubUpgradeCost = () => {
    const x = Math.floor(state.clubLevel);
    return x * x + 49;
  };
  const woodUpgradeCost = () => {
    const x = Math.floor(state.woodSwordLevel);
    return x * x + 49;
  };

  const serverLuckActive = () => state.serverLuckIn > 0;

  const applyLuckTheme = () => {
    appEl.classList.toggle("luck", serverLuckActive());
  };

  const refreshHUD = () => {
    gemsText.textContent = String(state.gems);

    if (serverLuckActive()) {
      setHidden(serverLuckLine, false);
      serverLuckText.textContent = fmtMMSS(state.serverLuckIn);
    } else {
      setHidden(serverLuckLine, true);
    }

    applyLuckTheme();

    // ✅ 메인 “선택됨: …” 같은 나열 텍스트는 숨김 처리
    if (state.selectedCharacter && state.selectedWeapon) {
      needSelectText.textContent = "";
      needSelectText.classList.add("hidden");
    } else {
      needSelectText.classList.remove("hidden");
      needSelectText.textContent = "캐릭터/주무기 선택 필요";
    }
  };

  /* =========================
     Back buttons
  ========================= */
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => {
      const to = btn.getAttribute("data-back");
      if (to && screens[to]) showScreen(to);
    });
  });

  /* =========================
     Confirm overlay
  ========================= */
  let confirmYesFn = null;
  let confirmNoFn = null;

  const openConfirm = (message, onYes, onNo) => {
    confirmMsg.textContent = message || "";
    confirmYesFn = onYes || null;
    confirmNoFn = onNo || null;
    setHidden(confirm, false);
  };

  confirmYes.addEventListener("click", () => {
    const fn = confirmYesFn;
    closeConfirm();
    if (typeof fn === "function") fn();
  });
  confirmNo.addEventListener("click", () => {
    const fn = confirmNoFn;
    closeConfirm();
    if (typeof fn === "function") fn();
  });

  /* =========================
     Reward popup (queue)
  ========================= */
  let rewardQueue = [];
  let rewardOnFinish = null;

  const showRewardQueue = (amounts, onFinish) => {
    rewardQueue = [...amounts];
    rewardOnFinish = onFinish || null;
    showNextReward();
  };

  const showNextReward = () => {
    if (rewardQueue.length <= 0) {
      hideReward();
      const fn = rewardOnFinish;
      rewardOnFinish = null;
      if (typeof fn === "function") fn();
      return;
    }
    const amt = rewardQueue[0];
    rewardText.textContent = `크리스탈 ${amt}개를 획득했습니다!`;
    setHidden(reward, false);
  };

  reward.addEventListener("click", () => {
    if (rewardQueue.length <= 0) return;
    const amt = rewardQueue.shift();
    hideReward();
    addGems(amt);
    window.setTimeout(showNextReward, 10);
  });

  /* =========================
     Main events
  ========================= */
  btnStart.addEventListener("click", () => {
    showNotice(mainNotice, "게임을 시작합니다!");
  });
  btnShop.addEventListener("click", () => showScreen("shop"));
  btnEquip.addEventListener("click", () => showScreen("equip"));
  btnBox.addEventListener("click", () => showScreen("box"));

  btnBattle.addEventListener("click", () => {
    if (!state.selectedCharacter || !state.selectedWeapon) {
      showNotice(mainNotice, "캐릭터,주무기를 선택해주세요!");
      return;
    }
    showScreen("battle");
  });

  /* =========================
     Shop
  ========================= */
  const refreshShop = () => {
    if (state.shopFreeIn <= 0) {
      shopFreeStatus.textContent = "10개";
      shopFreeTimer.textContent = "";
    } else {
      shopFreeStatus.textContent = "이미 받은 아이템입니다";
      shopFreeTimer.textContent = `${fmtMMSS(state.shopFreeIn)}초 후 무료`;
    }

    if (serverLuckActive()) {
      shopLuckTimer.textContent = `${fmtMMSS(state.serverLuckIn)} 남음`;
    } else {
      shopLuckTimer.textContent = "";
    }
  };

  shopFreeCard.addEventListener("click", () => {
    if (state.shopFreeIn > 0) return;
    state.shopFreeIn = 90;
    refreshShop();
    showRewardQueue([10], () => {});
  });

  shopLuckCard.addEventListener("click", () => {
    openConfirm("정말로 구매하시겠습니까?", () => {
      if (!spendGems(5)) {
        showNotice(shopNotice, "크리스탈이 부족합니다!");
        return;
      }
      showNotice(shopNotice, "서버 운 강화를 구매했습니다!");
      state.serverLuckIn = 60;
      refreshHUD();
      refreshShop();
      refreshBox();
      renderEquipIfOpen();
    }, () => {});
  });

  /* =========================
     Box select
  ========================= */
  const PRICE_NORMAL = 7;
  const PRICE_MID = 15;
  const PRICE_HIGH = 30;

  const refreshBox = () => {
    priceNormal.textContent = state.freeNormalUsed ? `${PRICE_NORMAL} 크리스탈` : "무료 1회 남음";
    priceMid.textContent = state.freeMidUsed ? `${PRICE_MID} 크리스탈` : "무료 1회 남음";
    priceHigh.textContent = state.freeHighUsed ? `${PRICE_HIGH} 크리스탈` : "무료 1회 남음";
  };

  /* =========================
     Upgrade system (single screen)
  ========================= */
  const upgrade = {
    mode: null, // "normal"|"mid"|"high"
    firstTapDone: false,
    filled: 3,
    openReady: false,
    splitDone: false,
    twoChests: false,

    stage: "브론즈",
    star: 1,
    highStage: "희귀",

    reset(mode){
      this.mode = mode;
      this.firstTapDone = false;
      this.filled = 3;
      this.openReady = false;
      this.splitDone = false;
      this.twoChests = false;

      this.stage = "브론즈";
      this.star = 1;
      this.highStage = "희귀";

      tapHint.textContent = "탭하세요!";
      setHidden(tapHint, false);

      boxA.textContent = (mode === "mid") ? "🎁" : (mode === "high" ? "🧰" : "📦");
      boxB.textContent = boxA.textContent;
      setHidden(boxB, true);

      this.applyTheme();
      this.render();
    },

    splitProb(){
      if (this.mode === "high") return 0.10;
      return serverLuckActive() ? 0.15 : 0.10;
    },

    nextStageProbBase(stage){
      if (stage === "브론즈") return ["실버", 0.70];
      if (stage === "실버") return ["골드", 0.60];
      if (stage === "골드") return ["에메랄드", 0.50];
      if (stage === "에메랄드") return ["다이아", 0.30];
      if (stage === "다이아") return ["레드 다이아", 0.10];
      return [null, 0.0];
    },
    nextStageProb(stage){
      const [nxt, p0] = this.nextStageProbBase(stage);
      if (!nxt) return [null, 0.0];
      const p = serverLuckActive() ? Math.min(1.0, p0 + 0.05) : p0;
      return [nxt, p];
    },
    rewardAmountNormal(stage){
      return ({ "브론즈":1, "실버":2, "골드":3, "에메랄드":5, "다이아":7, "레드 다이아":10 })[stage] ?? 1;
    },

    upgradeProbMid(star){
      const base = (star === 1) ? 0.35 :
                   (star === 2) ? 0.25 :
                   (star === 3) ? 0.15 :
                   (star === 4) ? 0.05 : 0.0;
      return serverLuckActive() ? Math.min(1.0, base + 0.05) : base;
    },
    rewardAmountMid(star){
      return ({1:7,2:10,3:15,4:25,5:37})[star] ?? 7;
    },

    highBg(stage){
      return ({
        "희귀":"#1aa84b",
        "초희귀":"#1f5fbf",
        "영웅":"#7a2cff",
        "신화":"#ff2b2b",
        "전설":"#ffd400",
        "울트라 전설":"#ffffff",
      })[stage] ?? "#ff6fb2";
    },
    nextHighProbBase(stage){
      if (stage === "희귀") return ["초희귀", 0.75];
      if (stage === "초희귀") return ["영웅", 0.50];
      if (stage === "영웅") return ["신화", 0.35];
      if (stage === "신화") return ["전설", 0.15];
      if (stage === "전설") return ["울트라 전설", 0.05];
      return [null, 0.0];
    },
    nextHighProb(stage){
      const [nxt, p0] = this.nextHighProbBase(stage);
      if (!nxt) return [null, 0.0];
      const p = serverLuckActive() ? Math.min(1.0, p0 + 0.05) : p0;
      return [nxt, p];
    },
    rewardAmountHigh(stage){
      return ({ "희귀":20, "초희귀":25, "영웅":30, "신화":50, "전설":100, "울트라 전설":300 })[stage] ?? 20;
    },

    dotsText(){
      const arr = [];
      for (let i=0;i<3;i++) arr.push(i < this.filled ? "●" : "○");
      return arr.join(" ");
    },

    applyTheme(){
      const scr = screens.upgrade;

      if (this.mode === "high") {
        const bg = this.highBg(this.highStage);
        scr.style.background = bg;
        tapArea.style.background = "transparent";

        const fg = (bg.toLowerCase() === "#ffffff") ? "#111" : "#fff";
        scr.style.color = fg;
        tapHint.style.color = fg;
        upgradeTitle.style.color = fg;
        dots.style.color = fg;
        boxA.style.color = fg;
        boxB.style.color = fg;
        return;
      }

      scr.style.background = "";
      scr.style.color = "";
      tapHint.style.color = "";
      upgradeTitle.style.color = "";
      dots.style.color = "";
      boxA.style.color = "";
      boxB.style.color = "";
    },

    render(){
      if (this.mode === "normal") upgradeTitle.textContent = this.stage;
      if (this.mode === "mid") upgradeTitle.textContent = "★".repeat(this.star);
      if (this.mode === "high") upgradeTitle.textContent = this.highStage;

      boxA.classList.toggle("big", this.openReady);
      boxB.classList.toggle("big", this.openReady);

      setHidden(boxB, !this.twoChests);

      dots.textContent = this.openReady ? "" : this.dotsText();
    },

    startReward(){
      const times = this.twoChests ? 2 : 1;
      let amtEach = 1;

      if (this.mode === "normal") amtEach = this.rewardAmountNormal(this.stage);
      if (this.mode === "mid") amtEach = this.rewardAmountMid(this.star);
      if (this.mode === "high") amtEach = this.rewardAmountHigh(this.highStage);

      const arr = Array(times).fill(amtEach);

      showRewardQueue(arr, () => {
        showScreen("box");
      });
    },

    tap(){
      if (!reward.classList.contains("hidden")) return;
      if (!confirm.classList.contains("hidden")) return;

      if (!this.firstTapDone) {
        this.firstTapDone = true;
        setHidden(tapHint, true);
      }

      if (this.openReady) {
        this.startReward();
        return;
      }

      if (!this.splitDone && Math.random() < this.splitProb()) {
        this.twoChests = true;
        this.splitDone = true;
        this.filled = 3;
        this.render();
        return;
      }

      this.filled = Math.max(0, this.filled - 1);

      if (this.mode === "normal") {
        const [nxt, p] = this.nextStageProb(this.stage);
        if (nxt && Math.random() < p) {
          this.stage = nxt;
          this.filled = 3;
          this.openReady = false;
          this.render();
          return;
        }
      }

      if (this.mode === "mid") {
        if (this.star < 5 && Math.random() < this.upgradeProbMid(this.star)) {
          this.star += 1;
          this.filled = 3;
          this.openReady = false;
          this.render();
          return;
        }
      }

      if (this.mode === "high") {
        const [nxt, p] = this.nextHighProb(this.highStage);
        if (nxt && Math.random() < p) {
          this.highStage = nxt;
          this.filled = 3;
          this.openReady = false;
          this.applyTheme();
          this.render();
          return;
        }
      }

      if (this.filled === 0) {
        this.openReady = true;
        this.render();
        return;
      }

      this.render();
    }
  };

  tapArea.addEventListener("click", () => upgrade.tap());
  screens.upgrade.addEventListener("click", (e) => {
    if (e.target === screens.upgrade) upgrade.tap();
  });

  const openUpgradeNormal = () => { upgrade.reset("normal"); showScreen("upgrade"); };
  const openUpgradeMid = () => { upgrade.reset("mid"); showScreen("upgrade"); };
  const openUpgradeHigh = () => { upgrade.reset("high"); showScreen("upgrade"); };

  cardNormal.addEventListener("click", () => {
    if (!state.freeNormalUsed) {
      state.freeNormalUsed = true;
      refreshBox();
      openUpgradeNormal();
      return;
    }
    if (!spendGems(PRICE_NORMAL)) {
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    openUpgradeNormal();
  });

  cardMid.addEventListener("click", () => {
    if (!state.freeMidUsed) {
      state.freeMidUsed = true;
      refreshBox();
      openUpgradeMid();
      return;
    }
    if (!spendGems(PRICE_MID)) {
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    openUpgradeMid();
  });

  cardHigh.addEventListener("click", () => {
    if (!state.freeHighUsed) {
      state.freeHighUsed = true;
      refreshBox();
      openUpgradeHigh();
      return;
    }
    if (!spendGems(PRICE_HIGH)) {
      showNotice(boxNotice, "크리스탈이 부족합니다!");
      return;
    }
    openUpgradeHigh();
  });

  /* =========================
     Equip
  ========================= */
  let currentTab = "char";
  let currentDetailKey = null;

  const setActiveTab = (tabKey) => {
    currentTab = tabKey;
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabKey));
    renderEquip();
  };

  tabs.forEach(t => {
    t.addEventListener("click", () => setActiveTab(t.dataset.tab));
  });

  const renderEquipIfOpen = () => {
    if (!modal.classList.contains("hidden")) renderDetail(currentDetailKey);
    if (!screens.equip.classList.contains("hidden")) renderEquip();
  };

  const slotEl = ({emoji, name, badge, foot, isChar=false}) => {
    const div = document.createElement("div");
    div.className = "slot clickable";
    if (isChar) {
      const mini = document.createElement("div");
      mini.className = "char-mini";
      div.appendChild(mini);
    } else {
      const em = document.createElement("div");
      em.className = "slot-emo";
      em.textContent = emoji;
      div.appendChild(em);
    }

    const nm = document.createElement("div");
    nm.className = "slot-name";
    nm.textContent = name;
    div.appendChild(nm);

    if (badge !== undefined && badge !== null && badge !== "") {
      const b = document.createElement("div");
      b.className = "badge";
      b.textContent = badge;
      div.appendChild(b);
    }
    if (foot) {
      const f = document.createElement("div");
      f.className = "slot-foot";
      f.textContent = foot;
      div.appendChild(f);
    }
    return div;
  };

  const renderEquip = () => {
    equipGrid.innerHTML = "";

    const add = (el) => equipGrid.appendChild(el);

    if (currentTab === "char") {
      const s0 = slotEl({
        emoji:"",
        name:"네모",
        badge:String(state.charLevel),
        foot: (state.charLevel >= state.charLevelMax) ? "맥시멈 레벨" : "",
        isChar:true
      });
      s0.addEventListener("click", () => openDetail("char"));
      add(s0);

      for (let i=0;i<4;i++){
        const p = slotEl({emoji:"🙂", name:"", badge:"", foot:""});
        p.style.opacity = "0.75";
        add(p);
      }
      return;
    }

    if (currentTab === "mainw") {
      const club = slotEl({
        emoji:"🪵",
        name:"나무몽둥이",
        badge:String(state.clubLevel),
        foot: (state.clubLevel >= state.clubLevelMax) ? "맥시멈 레벨" : ""
      });
      club.addEventListener("click", () => openDetail("club"));
      add(club);

      const wood = slotEl({
        emoji:"🗡️",
        name:"목검",
        badge: state.woodSwordOwned ? String(state.woodSwordLevel) : "",
        foot: state.woodSwordOwned
          ? ((state.woodSwordLevel >= state.woodSwordLevelMax) ? "맥시멈 레벨" : "")
          : `구매:${state.woodSwordPrice}크리스탈`
      });
      wood.addEventListener("click", () => openDetail("wood_sword"));
      add(wood);

      for (let i=0;i<3;i++){
        const p = slotEl({emoji:"⚔️", name:"", badge:"", foot:""});
        p.style.opacity = "0.75";
        add(p);
      }
      return;
    }

    if (currentTab === "subw") {
      for (let i=0;i<5;i++){
        const p = slotEl({emoji:"🛡️", name:"", badge:"", foot:""});
        p.style.opacity = "0.75";
        add(p);
      }
      return;
    }

    for (let i=0;i<5;i++){
      const p = slotEl({emoji:"🔮", name:"", badge:"", foot:""});
      p.style.opacity = "0.75";
      add(p);
    }
  };

  const openDetail = (key) => {
    currentDetailKey = key;
    modalNotice.textContent = "";
    renderDetail(key);
    setHidden(modal, false);
  };

  modalClose.addEventListener("click", closeModal);

  const weaponData = (key) => {
    if (key === "club") {
      return {
        key,
        owned: state.clubOwned,
        name: "나무몽둥이",
        emoji: "🪵",
        desc: "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다.",
        level: state.clubLevel,
        levelMax: state.clubLevelMax,
        atk: state.clubAtk,
        stam: state.clubStaminaCost,
        spd: state.clubAttackSpeed,
        duraCost: state.clubDuraCost,
        totalDura: state.clubTotalDura,
        canUpgrade: state.clubLevel < state.clubLevelMax,
        cost: clubUpgradeCost(),
      };
    }
    return {
      key,
      owned: state.woodSwordOwned,
      name: "목검",
      emoji: "🗡️",
      desc: "초보자용 무기로 가격이 쌉니다.\n나무몽둥이보단 좋지만 여전히 데미지와 내구도가 적습니다.",
      level: state.woodSwordLevel,
      levelMax: state.woodSwordLevelMax,
      atk: state.woodSwordAtk,
      stam: state.woodSwordStaminaCost,
      spd: state.woodSwordAttackSpeed,
      duraCost: state.woodSwordDuraCost,
      totalDura: state.woodSwordTotalDura,
      canUpgrade: state.woodSwordOwned && (state.woodSwordLevel < state.woodSwordLevelMax),
      cost: woodUpgradeCost(),
    };
  };

  const renderDetail = (key) => {
    modalNotice.textContent = "";

    if (key === "char") {
      modalTitle.textContent = "네모";
      modalBig.textContent = "⬛";
      modalDesc.textContent = "기본캐릭터";

      modalStats.innerHTML = `
        <div class="stat-line">레벨: ${state.charLevel}</div>
        <div class="stat-line">체력: ${trimNum(state.charHp)}</div>
        <div class="stat-line">이동속도: ${trimNum(state.charSpeed)}</div>
        <div class="stat-line">스테미너: ${Math.floor(state.charStamina)}</div>
      `;

      btnSelect.textContent = state.selectedCharacter ? "선택됨" : "선택";
      btnSelect.disabled = !!state.selectedCharacter;

      if (state.charLevel >= state.charLevelMax) {
        btnMainAction.textContent = "맥시멈 레벨";
        btnMainAction.disabled = true;
      } else {
        btnMainAction.textContent = `업그레이드하기: ${charUpgradeCost()} 크리스탈`;
        btnMainAction.disabled = false;
      }

      btnSelect.onclick = () => {
        state.selectedCharacter = true;
        refreshHUD();
        renderEquip();
        closeModal();
        showScreen("main");
      };

      btnMainAction.onclick = () => {
        if (state.charLevel >= state.charLevelMax) {
          showNotice(modalNotice, "이미 맥시멈 레벨입니다!");
          return;
        }
        const cost = charUpgradeCost();
        openConfirm(
          "업그레이드 할까요?",
          () => {
            if (!spendGems(cost)) {
              showNotice(modalNotice, "크리스탈이 부족합니다!");
              return;
            }
            state.charLevel += 1;
            state.charHp += 0.5;
            state.charSpeed += 0.01;
            state.charStamina += 5;

            showNotice(modalNotice, "업그레이드 완료!");
            renderDetail("char");
            renderEquip();
            refreshHUD();
          },
          () => {}
        );
      };

      return;
    }

    if (key === "club" || key === "wood_sword") {
      const d = weaponData(key);

      modalTitle.textContent = d.name;
      modalBig.textContent = d.emoji;
      modalDesc.textContent = d.desc;

      modalStats.innerHTML = `
        <div class="stat-line">레벨: ${d.level}</div>
        <div class="stat-line">공격력: ${trimNum(d.atk)}</div>
        <div class="stat-line">소모 스테미너: ${trimNum(d.stam)}/번</div>
        <div class="stat-line">공격 속도: ${trimNum(d.spd)}초</div>
        <div class="stat-line">내구도소모: ${trimNum3(d.duraCost)}/번</div>
        <div class="stat-line">총 내구도: ${trimNum(d.totalDura)}</div>
      `;

      const selected = (state.selectedWeapon === key);
      btnSelect.textContent = selected ? "선택됨" : "선택";
      btnSelect.disabled = selected;

      btnSelect.onclick = () => {
        if (key === "wood_sword" && !state.woodSwordOwned) {
          showNotice(modalNotice, "구매 후 선택 가능합니다!");
          return;
        }
        state.selectedWeapon = key;
        refreshHUD();
        renderEquip();
        closeModal();
        showScreen("main");
      };

      if (key === "wood_sword" && !state.woodSwordOwned) {
        btnMainAction.textContent = `구매:${state.woodSwordPrice}크리스탈`;
        btnMainAction.disabled = false;

        btnMainAction.onclick = () => {
          openConfirm(
            "목검을 구매하시겠습니까?",
            () => {
              if (!spendGems(state.woodSwordPrice)) {
                showNotice(modalNotice, "크리스탈이 부족합니다!");
                return;
              }
              state.woodSwordOwned = true;
              showNotice(modalNotice, "구매 완료!");
              renderDetail("wood_sword");
              renderEquip();
              refreshHUD();
            },
            () => {}
          );
        };
        return;
      }

      if (!d.canUpgrade) {
        btnMainAction.textContent = "맥시멈 레벨";
        btnMainAction.disabled = true;
      } else {
        btnMainAction.textContent = `업그레이드하기: ${d.cost} 크리스탈`;
        btnMainAction.disabled = false;
      }

      btnMainAction.onclick = () => {
        if (!d.canUpgrade) {
          showNotice(modalNotice, "이미 맥시멈 레벨입니다!");
          return;
        }
        const cost = d.cost;
        openConfirm(
          `${d.name} 강화할까요?`,
          () => {
            if (!spendGems(cost)) {
              showNotice(modalNotice, "크리스탈이 부족합니다!");
              return;
            }
            if (key === "club") {
              state.clubLevel += 1;
              state.clubAtk += 0.1;
              state.clubStaminaCost -= 0.01;
              state.clubDuraCost -= 0.005;
              state.clubTotalDura += 0.5;
            } else {
              state.woodSwordLevel += 1;
              state.woodSwordAtk += 0.1;
              state.woodSwordStaminaCost -= 0.01;
              state.woodSwordDuraCost -= 0.005;
              state.woodSwordTotalDura += 0.5;
            }
            showNotice(modalNotice, "업그레이드 완료!");
            renderDetail(key);
            renderEquip();
            refreshHUD();
          },
          () => {}
        );
      };

      return;
    }
  };

  function trimNum(n){
    const s = Number(n).toFixed(2);
    return s.replace(/\.?0+$/,"");
  }
  function trimNum3(n){
    const s = Number(n).toFixed(3);
    return s.replace(/\.?0+$/,"");
  }

  /* =========================
     Battle system (WASD + click slash)
  ========================= */
  const battle = {
    running:false,
    paused:false,
    bound:false,
    looping:false,
    keys:new Set(),
    lastAttackT:0,
    player:{ x:200, y:200, size:34, speed:5 },
    slashes:[],

    gridGap:48,
    gridWidth:1,

    start(){
      if (screens.battle.classList.contains("hidden")) return;

      this.running = true;
      this.paused = false;
      this.keys.clear();
      this.slashes = [];
      this.lastAttackT = 0;

      this.resizeCanvas();
      this.player.x = battleCanvas.width/2;
      this.player.y = battleCanvas.height/2;

      if (!this.bound) {
        this.bound = true;

        battleCanvas.tabIndex = 0;

        window.addEventListener("keydown", (e) => {
          if (!this.running || this.paused) return;
          const k = (e.key || "").toLowerCase();
          if (["w","a","s","d"].includes(k)) this.keys.add(k);
        });

        window.addEventListener("keyup", (e) => {
          const k = (e.key || "").toLowerCase();
          if (this.keys.has(k)) this.keys.delete(k);
        });

        battleCanvas.addEventListener("click", (e) => {
          if (!this.running || this.paused) return;
          this.attack(e);
        });

        window.addEventListener("resize", () => this.resizeCanvas());
      }

      battleCanvas.focus();

      if (!this.looping) {
        this.looping = true;
        this.loop();
      }
    },

    stop(){
      this.running = false;
      this.paused = false;
      this.keys.clear();
      this.slashes = [];
    },

    resizeCanvas(){
      const rect = battleCanvas.getBoundingClientRect();
      battleCanvas.width = Math.max(300, Math.floor(rect.width));
      battleCanvas.height = Math.max(300, Math.floor(rect.height));
    },

    weaponCooldown(){
      if (state.selectedWeapon === "wood_sword") return state.woodSwordAttackSpeed;
      return state.clubAttackSpeed;
    },

    attack(e){
      const now = performance.now()/1000;
      const cd = this.weaponCooldown();
      if (now - this.lastAttackT < cd) return;
      this.lastAttackT = now;

      const rect = battleCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (battleCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (battleCanvas.height / rect.height);

      const dx = mx - this.player.x;
      const dy = my - this.player.y;
      const theta = Math.atan2(dy, dx);

      const forward = 46;
      const baseX = this.player.x + Math.cos(theta)*forward;
      const baseY = this.player.y + Math.sin(theta)*forward;

      const startX = baseX;
      const startY = baseY - 34;

      const life = 0.20;
      const r = 110;
      const extent = (120 * Math.PI)/180;

      const startAng = theta - (85*Math.PI/180);
      const endAng = theta - (35*Math.PI/180);

      this.slashes.push({
        x:startX, y:startY, r,
        theta,
        startAng,
        endAng,
        extent,
        life,
        age:0,
      });
    },

    loop(){
      if (this.running && !this.paused) this.update(1/60);
      this.draw();
      requestAnimationFrame(()=>this.loop());
    },

    update(dt){
      let dx=0, dy=0;
      if (this.keys.has("w")) dy -= this.player.speed;
      if (this.keys.has("s")) dy += this.player.speed;
      if (this.keys.has("a")) dx -= this.player.speed;
      if (this.keys.has("d")) dx += this.player.speed;

      if (dx || dy) {
        const half = this.player.size/2;
        this.player.x = clamp(this.player.x + dx, half, battleCanvas.width - half);
        this.player.y = clamp(this.player.y + dy, half, battleCanvas.height - half);
      }

      for (const s of this.slashes) s.age += dt;
      this.slashes = this.slashes.filter(s => s.age < s.life);
    },

    draw(){
      const w = battleCanvas.width;
      const h = battleCanvas.height;

      ctx.clearRect(0,0,w,h);

      ctx.save();
      ctx.lineWidth = this.gridWidth;
      ctx.strokeStyle = "#000";
      for (let x=0;x<=w;x+=this.gridGap){
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,h);
        ctx.stroke();
      }
      for (let y=0;y<=h;y+=this.gridGap){
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(w,y);
        ctx.stroke();
      }
      ctx.restore();

      for (const s of this.slashes) {
        const t = s.age / s.life;
        const ang = lerp(s.startAng, s.endAng, t);

        const drop = 60 * t;
        const push = 20 * t;

        const cx = s.x + Math.cos(s.theta)*push;
        const cy = s.y + drop + Math.sin(s.theta)*push;

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, s.r, ang, ang + s.extent, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = "#000";
      const half = this.player.size/2;
      ctx.fillRect(this.player.x-half, this.player.y-half, this.player.size, this.player.size);
      ctx.restore();
    },
  };

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }

  btnBattleHome.addEventListener("click", () => {
    battle.paused = true;
    battle.keys.clear();
    openConfirm("메인화면으로 돌아가겠습니까?", () => {
      battle.stop();
      showScreen("main");
    }, () => {
      battle.paused = false;
      battleCanvas.focus();
    });
  });

  /* =========================
     Global timer ticks (1s)
  ========================= */
  window.setInterval(() => {
    if (state.shopFreeIn > 0) state.shopFreeIn -= 1;
    if (state.serverLuckIn > 0) state.serverLuckIn -= 1;

    refreshHUD();
    refreshShop();
    refreshBox();
  }, 1000);

  /* =========================
     Initial (진짜 중요)
  ========================= */
  // ✅ 시작부터 “나열” 절대 안 뜨게 main만 남기고 전부 숨김
 Object.entries(screens).forEach(([k, el]) => {
  const hide = (k !== "main");
  setHidden(el, hide);
});

  closeModal();
  closeConfirm();
  hideReward();

  refreshHUD();
  refreshShop();
  refreshBox();
  setActiveTab("char");
})();





