document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const screenRoot = $("screenRoot");
  const backBtn = $("backBtn");
  const topTitle = $("topTitle");
  const topSub = $("topSub");
  const gemsVal = $("gemsVal");
  const luckLine = $("luckLine");

  const rewardOverlay = $("rewardOverlay");
  const rewardText = $("rewardText");

  const confirmOverlay = $("confirmOverlay");
  const confirmMsg = $("confirmMsg");
  const confirmYes = $("confirmYes");
  const confirmNo = $("confirmNo");

  const inlineConfirm = $("inlineConfirm");
  const inlineTitle = $("inlineTitle");
  const inlineDesc = $("inlineDesc");
  const inlineYes = $("inlineYes");
  const inlineNo = $("inlineNo");

  // ===== 파이썬 앱 상태 그대로 =====
  const COLOR = {
    GREEN_BG: "#0b3b1a",
    BLUE_BG: "#1f5fbf",
    PINK_BG: "#ff6fb2",
    LUCK_PURPLE: "#7a2cff",
  };

  const state = {
    // navigation
    screen: "title",
    prev: [],

    // gems
    gems: 0,

    // shop prices
    PRICE_NORMAL: 7,
    PRICE_MID: 15,
    PRICE_HIGH: 30,

    // free 1 time
    free_normal_used: false,
    free_mid_used: false,
    free_high_used: false,

    // server luck timer
    server_luck_in: 0,
    server_luck_timer: null,

    // shop free cooldown
    shop_free_in: 0,
    shop_free_timer: null,

    // character stats
    char_level: 1,
    char_level_max: 10,
    char_hp: 1.5,
    char_speed: 1.0,
    char_stamina: 50,

    // main weapon (wood club)
    main_weapon_name: "나무몽둥이",
    main_weapon_level: 1,
    main_weapon_level_max: 10,
    weapon_atk: 2,
    weapon_stamina_cost: 0.1,
    weapon_attack_speed: 1.0, // 유지
    weapon_dura_cost: 0.1,
    weapon_total_dura: 7,

    // equip tab
    equip_tab: 0,
  };

  // ===== 유틸 =====
  const mmss = (sec) => {
    sec = Math.max(0, sec | 0);
    const m = String((sec / 60) | 0).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const serverLuckActive = () => state.server_luck_in > 0;
  const shopIsFree = () => state.shop_free_in <= 0;

  const charUpgradeCost = () => {
    const x = state.char_level | 0;
    return x * x + 49;
  };

  const weaponUpgradeCost = () => {
    const x = state.main_weapon_level | 0;
    return x * x + 49;
  };

  const setBG = (hex) => {
    document.body.style.background = hex;
    document.documentElement.style.background = hex;
    $(".topBar")?.style && (document.querySelector(".topBar").style.background = hex);
  };

  const setHeader = ({ title, sub = "", showBack = false }) => {
    topTitle.textContent = title;
    if (sub) {
      topSub.hidden = false;
      topSub.textContent = sub;
    } else {
      topSub.hidden = true;
      topSub.textContent = "";
    }
    backBtn.hidden = !showBack;
    gemsVal.textContent = String(state.gems);

    if (serverLuckActive()) {
      luckLine.hidden = false;
      luckLine.textContent = `서버럭: ${mmss(state.server_luck_in)} 남음`;
    } else {
      luckLine.hidden = true;
      luckLine.textContent = "";
    }
  };

  const clearScreen = () => (screenRoot.innerHTML = "");

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const button = (text, onClick, extraCls = "") => {
    const b = document.createElement("button");
    b.className = `btn btn-white ${extraCls}`.trim();
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  };

  // ===== 오버레이 (파이썬 RewardPopup/ConfirmOverlay/InlineConfirm) =====
  const hideAllOverlays = () => {
    rewardOverlay.hidden = true;
    confirmOverlay.hidden = true;
    inlineConfirm.hidden = true;
  };

  // RewardPopup: 큐 지원
  let rewardQueue = [];
  const showReward = (amount) => {
    rewardText.textContent = `크리스탈 ${amount}개를 획득했습니다!`;
    rewardOverlay.hidden = false;
  };
  const closeReward = () => {
    rewardOverlay.hidden = true;
    if (rewardQueue.length > 0) {
      const amt = rewardQueue.shift();
      state.gems += amt;
      gemsVal.textContent = String(state.gems);
      showReward(amt);
    } else {
      // 끝
    }
  };
  rewardOverlay.addEventListener("click", closeReward);

  // ConfirmOverlay: 상점 구매 확인
  let confirmYesHandler = null;
  const openConfirm = (message, onYes) => {
    confirmMsg.textContent = message;
    confirmYesHandler = onYes;
    confirmOverlay.hidden = false;
  };
  const closeConfirm = () => {
    confirmOverlay.hidden = true;
    confirmYesHandler = null;
  };
  confirmNo.addEventListener("click", closeConfirm);
  confirmYes.addEventListener("click", () => {
    if (typeof confirmYesHandler === "function") confirmYesHandler();
    closeConfirm();
  });

  // InlineConfirm: 업그레이드 확인
  let inlineYesHandler = null;
  const openInlineConfirm = (title, desc, onYes) => {
    inlineTitle.textContent = title;
    inlineDesc.textContent = desc;
    inlineYesHandler = onYes;
    inlineConfirm.hidden = false;
  };
  const closeInlineConfirm = () => {
    inlineConfirm.hidden = true;
    inlineYesHandler = null;
  };
  inlineNo.addEventListener("click", closeInlineConfirm);
  inlineYes.addEventListener("click", () => {
    if (typeof inlineYesHandler === "function") inlineYesHandler();
    closeInlineConfirm();
  });

  // ✅ 시작 시 무조건 닫기 (이걸로 "처음부터 예/아니요만 뜨는" 버그 차단)
  hideAllOverlays();

  // ===== 타이머(파이썬 after 1000) =====
  const startShopCooldown = (sec = 90) => {
    if (state.shop_free_timer) clearInterval(state.shop_free_timer);
    state.shop_free_in = sec | 0;
    state.shop_free_timer = setInterval(() => {
      state.shop_free_in -= 1;
      if (state.shop_free_in <= 0) {
        state.shop_free_in = 0;
        clearInterval(state.shop_free_timer);
        state.shop_free_timer = null;
      }
      // 화면이 shop/game이면 반영
      if (state.screen === "game" || state.screen === "shop") render();
    }, 1000);
  };

  const startServerLuck = (sec = 60) => {
    if (state.server_luck_timer) clearInterval(state.server_luck_timer);
    state.server_luck_in = Math.max(1, sec | 0);
    state.server_luck_timer = setInterval(() => {
      state.server_luck_in -= 1;
      if (state.server_luck_in <= 0) {
        state.server_luck_in = 0;
        clearInterval(state.server_luck_timer);
        state.server_luck_timer = null;
      }
      // 어디서든 상단 표시 업데이트
      setHeader({ title: topTitle.textContent, sub: topSub.hidden ? "" : topSub.textContent, showBack: !backBtn.hidden });
      // 업그레이드 화면이면 확률 반영/테마 반영
      if (["box", "chest", "star", "high", "shop", "game"].includes(state.screen)) render();
    }, 1000);
  };

  // ===== 네비게이션 =====
  const go = (next) => {
    state.prev.push(state.screen);
    state.screen = next;
    render();
  };
  backBtn.addEventListener("click", () => {
    const prev = state.prev.pop();
    if (!prev) return;
    state.screen = prev;
    render();
  });

  // ===== 화면들 =====
  const renderTitle = () => {
    hideAllOverlays();
    setBG(COLOR.GREEN_BG);
    setHeader({ title: "운빨겜!", sub: "", showBack: false });

    clearScreen();
    const col = el("div", "panel");
    const t = el("div", "bigTitle", "운빨겜!");
    col.appendChild(t);
    col.appendChild(button("게임 시작!", () => go("game")));
    screenRoot.appendChild(col);
  };

  const renderGame = () => {
    hideAllOverlays();
    const bg = serverLuckActive() ? COLOR.LUCK_PURPLE : COLOR.GREEN_BG;
    setBG(bg);
    setHeader({ title: "운빨겜!", sub: "", showBack: false });

    clearScreen();

    const wrap = el("div", "panel");
    wrap.style.background = "transparent";
    wrap.style.border = "none";
    wrap.style.gap = "24px";

    // 상단 버튼들(파이썬 위치 느낌)
    const topLeftRow = el("div", "");
    topLeftRow.style.position = "absolute";
    topLeftRow.style.left = "12px";
    topLeftRow.style.top = "68px";
    topLeftRow.style.display = "flex";
    topLeftRow.style.gap = "10px";

    // 상점 버튼: shop_free이면 노란색
    const shopBtn = button("상점", () => go("shop"));
    if (shopIsFree()) {
      shopBtn.style.background = "yellow";
      shopBtn.style.color = "#000";
    }
    const equipBtn = button("장비", () => go("equip"));
    topLeftRow.appendChild(shopBtn);
    topLeftRow.appendChild(equipBtn);

    // 가운데 박스(상자뽑기/전투시작)
    const box = el("div", "gameBox");
    const btnBox = button("상자 뽑기!", () => go("box"));
    const btnBattle = button("전투시작!", () => {
      // 파이썬 show_notice_popup
      const n = el("div", "");
      n.style.marginTop = "10px";
      n.style.fontWeight = "900";
      n.style.opacity = ".9";
      n.textContent = "전투 기능은 준비중입니다!";
      wrap.appendChild(n);
      setTimeout(() => n.remove(), 1200);
    });
    box.appendChild(btnBox);
    box.appendChild(btnBattle);

    // 중앙 정렬
    const center = el("div", "");
    center.style.display = "flex";
    center.style.flexDirection = "column";
    center.style.alignItems = "center";
    center.style.gap = "24px";
    center.style.width = "100%";

    const title = el("div", "bigTitle", "운빨겜!");
    center.appendChild(title);

    const bigPanel = el("div", "panel");
    bigPanel.style.width = "min(860px, 92vw)";
    bigPanel.style.height = "140px";
    bigPanel.style.display = "flex";
    bigPanel.style.alignItems = "center";
    bigPanel.style.justifyContent = "center";
    bigPanel.style.border = "3px solid rgba(255,255,255,.7)";
    bigPanel.appendChild(el("div", "", "")); // placeholder
    center.appendChild(bigPanel);

    // 파이썬 박스 위치 느낌으로 그 위에 box를 올려놔도 되지만,
    // 지금은 정확히 보이게 panel + box 둘 다 사용
    center.appendChild(box);

    screenRoot.appendChild(center);
    document.body.appendChild(topLeftRow);
    // 화면 바뀔 때 topLeftRow 제거되게
    // (render마다 새로 생성)
    setTimeout(() => {
      if (state.screen !== "game") topLeftRow.remove();
    }, 0);
  };

  const renderShop = () => {
    hideAllOverlays();
    const bg = serverLuckActive() ? COLOR.LUCK_PURPLE : COLOR.BLUE_BG;
    setBG(bg);
    setHeader({ title: "상점", sub: "", showBack: true });

    clearScreen();

    const wrap = el("div", "");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "18px";
    wrap.style.width = "100%";

    const title = el("div", "bigTitle", "상점");
    title.style.fontSize = "22px";
    wrap.appendChild(title);

    const row = el("div", "shopRow");

    // free crystal card
    const freeCard = el("div", "shopCard");
    freeCard.innerHTML = `
      <div class="shopEmoji">💎</div>
      <div class="shopName">크리스탈</div>
      <div class="shopMid" id="freeShopMain"></div>
      <div class="shopSmall" id="freeShopSub"></div>
    `;

    const refreshFreeText = () => {
      const main = freeCard.querySelector("#freeShopMain");
      const sub = freeCard.querySelector("#freeShopSub");
      if (shopIsFree()) {
        main.textContent = "10개";
        sub.textContent = "";
      } else {
        main.textContent = "이미 받은 아이템입니다";
        sub.textContent = `${mmss(state.shop_free_in)}초 후 무료`;
      }
    };
    refreshFreeText();

    freeCard.addEventListener("click", () => {
      if (!shopIsFree()) return;
      state.gems += 10;
      gemsVal.textContent = String(state.gems);
      startShopCooldown(90);

      rewardQueue = []; // shop은 1회만
      showReward(10);
      refreshFreeText();
      render(); // 상단/테마 반영
    });

    // luck card
    const luckCard = el("div", "shopCard");
    luckCard.innerHTML = `
      <div class="shopEmoji">🍀</div>
      <div class="shopName">서버 운 강화</div>
      <div class="shopMid">크리스탈 5개 💎</div>
      <div class="shopSmall" id="luckRemain"></div>
    `;
    const luckRemain = luckCard.querySelector("#luckRemain");
    luckRemain.textContent = serverLuckActive() ? `${mmss(state.server_luck_in)} 남음` : "";

    luckCard.addEventListener("click", () => {
      openConfirm("정말로 구매하시겠습니까?", () => {
        if (state.gems < 5) {
          // 파이썬 notice
          const n = el("div", "");
          n.style.fontWeight = "900";
          n.style.opacity = ".9";
          n.textContent = "크리스탈이 부족합니다!";
          wrap.appendChild(n);
          setTimeout(() => n.remove(), 1200);
          return;
        }
        state.gems -= 5;
        gemsVal.textContent = String(state.gems);
        startServerLuck(60);
        render();
      });
    });

    row.appendChild(freeCard);
    row.appendChild(luckCard);
    wrap.appendChild(row);

    screenRoot.appendChild(wrap);

    // 타이머 갱신용
    if (state.screen === "shop") {
      setTimeout(() => {
        if (state.screen !== "shop") return;
        refreshFreeText();
        luckRemain.textContent = serverLuckActive() ? `${mmss(state.server_luck_in)} 남음` : "";
      }, 50);
    }
  };

  const renderBox = () => {
    hideAllOverlays();
    const bg = serverLuckActive() ? COLOR.LUCK_PURPLE : COLOR.PINK_BG;
    setBG(bg);
    setHeader({ title: "상자 뽑기", sub: "", showBack: true });

    clearScreen();

    const wrap = el("div", "");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "18px";
    wrap.style.width = "100%";

    const title = el("div", "bigTitle", "상자 뽑기");
    title.style.fontSize = "22px";
    wrap.appendChild(title);

    const row = el("div", "boxRow");

    const makeCard = (name, priceText, onClick) => {
      const c = el("div", "boxCard");
      c.innerHTML = `
        <div class="boxCardTitle">${name}</div>
        <div class="boxCardPrice">${priceText}</div>
      `;
      c.addEventListener("click", onClick);
      return c;
    };

    const normalText = !state.free_normal_used ? "무료 1회 남음" : `${state.PRICE_NORMAL} 크리스탈`;
    const midText = !state.free_mid_used ? "무료 1회 남음" : `${state.PRICE_MID} 크리스탈`;
    const highText = !state.free_high_used ? "무료 1회 남음" : `${state.PRICE_HIGH} 크리스탈`;

    const notice = el("div", "");
    notice.style.marginTop = "12px";
    notice.style.fontWeight = "900";
    notice.style.opacity = ".9";

    const showNotice = (t) => {
      notice.textContent = t;
      setTimeout(() => (notice.textContent = ""), 1200);
    };

    row.appendChild(makeCard("일반 상자 업그레이드", normalText, () => {
      if (!state.free_normal_used) {
        state.free_normal_used = true;
        go("chest");
        return;
      }
      if (state.gems < state.PRICE_NORMAL) return showNotice("크리스탈이 부족합니다!");
      state.gems -= state.PRICE_NORMAL;
      go("chest");
    }));

    row.appendChild(makeCard("중급 상자 업그레이드", midText, () => {
      if (!state.free_mid_used) {
        state.free_mid_used = true;
        go("star");
        return;
      }
      if (state.gems < state.PRICE_MID) return showNotice("크리스탈이 부족합니다!");
      state.gems -= state.PRICE_MID;
      go("star");
    }));

    row.appendChild(makeCard("고급 상자 업그레이드", highText, () => {
      if (!state.free_high_used) {
        state.free_high_used = true;
        go("high");
        return;
      }
      if (state.gems < state.PRICE_HIGH) return showNotice("크리스탈이 부족합니다!");
      state.gems -= state.PRICE_HIGH;
      go("high");
    }));

    wrap.appendChild(row);
    wrap.appendChild(notice);
    screenRoot.appendChild(wrap);
  };

  // ===== 업그레이드 공용 로직 (파이썬 3종 화면 구조) =====
  const makeDots = (filled) => {
    const arr = [];
    for (let i = 0; i < 3; i++) arr.push(i < filled ? "●" : "○");
    return arr.join(" ");
  };

  const tapAnim = (node) => {
    // 파이썬: 18~26 왕복
    let size = 18;
    let grow = true;
    let alive = true;
    node.style.fontSize = size + "px";
    const id = setInterval(() => {
      if (!alive) return;
      if (grow) {
        size += 1;
        if (size >= 26) grow = false;
      } else {
        size -= 1;
        if (size <= 18) grow = true;
      }
      node.style.fontSize = size + "px";
    }, 80);
    return () => { alive = false; clearInterval(id); };
  };

  // 1) 일반 업그레이드 (브론즈~레드다이아)
  const renderChestUpgrade = () => {
    hideAllOverlays();
    setBG(COLOR.PINK_BG);
    setHeader({ title: "상자 뽑기", sub: "", showBack: true });

    clearScreen();

    let firstTapDone = false;
    let stage = "브론즈";
    let filled = 3;
    let openReady = false;
    let splitDone = false;
    let twoChests = false;

    const rewardAmount = () => ({ "브론즈":1, "실버":2, "골드":3, "에메랄드":5, "다이아":7, "레드 다이아":10 }[stage] || 1);

    const nextStageProbBase = () => {
      if (stage === "브론즈") return ["실버", 0.70];
      if (stage === "실버") return ["골드", 0.60];
      if (stage === "골드") return ["에메랄드", 0.50];
      if (stage === "에메랄드") return ["다이아", 0.30];
      if (stage === "다이아") return ["레드 다이아", 0.10];
      return [null, 0.0];
    };
    const nextStageProb = () => {
      const [n, p0] = nextStageProbBase();
      if (!n) return [null, 0];
      const p = serverLuckActive() ? Math.min(1.0, p0 + 0.05) : p0;
      return [n, p];
    };
    const splitProb = () => (serverLuckActive() ? 0.15 : 0.10);

    const wrap = el("div", "");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";

    const tapLabel = el("div", "tapText", "탭하세요!");
    const stopTap = tapAnim(tapLabel);

    const grade = el("div", "upGradeTitle", stage);

    const area = el("div", "clickArea");
    const holder = el("div", "boxHolder");
    const box1 = el("div", "emojiBoxNormal", "📦");
    const box2 = el("div", "emojiBoxNormal", "📦");
    const dots = el("div", "dotsLine", makeDots(filled));

    holder.appendChild(box1);
    area.appendChild(holder);
    area.appendChild(dots);

    const renderBoxes = () => {
      holder.innerHTML = "";
      box1.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      box2.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      holder.style.transform = openReady ? "translateY(-18px)" : "translateY(0px)";

      holder.appendChild(box1);
      if (twoChests) holder.appendChild(box2);

      dots.textContent = openReady ? "" : makeDots(filled);
      grade.textContent = stage;
    };

    const startRewards = () => {
      const times = twoChests ? 2 : 1;
      const amt = rewardAmount();
      rewardQueue = new Array(times).fill(amt);
      // 첫 팝업
      const first = rewardQueue.shift();
      state.gems += first;
      gemsVal.textContent = String(state.gems);
      showReward(first);
      // 나머지는 click으로 이어서
      // (파이썬은 클릭할 때 add_gems 하고 다음)
      // 여기선 첫 것도 동일하게 "획득" 처리했지만 팝업 흐름은 동일.
      // 더 파이썬처럼 하려면 첫 것도 큐로 넣고 closeReward에서 add하도록 바꿔도 됨.
      // 지금은 사용자가 보기엔 동일하게 작동.
      if (rewardQueue.length === 0) {
        // 팝업 닫으면 box로 복귀
        const oldClose = closeReward;
        const once = () => {
          rewardOverlay.removeEventListener("click", once);
          go("box");
        };
        rewardOverlay.addEventListener("click", once);
      } else {
        const old = rewardOverlay.onclick;
        // closeReward가 큐를 처리하니 마지막에 box로 보내기
        const hook = () => {
          // closeReward가 큐를 끝내면 여기서 box로
          if (rewardQueue.length === 0 && rewardOverlay.hidden) {
            go("box");
          }
        };
        rewardOverlay.addEventListener("click", () => setTimeout(hook, 0), { once: false });
      }
    };

    const onTap = () => {
      if (state.screen !== "chest") return;

      if (!firstTapDone) {
        firstTapDone = true;
        tapLabel.remove();
        stopTap();
      }

      if (rewardOverlay.hidden === false) return; // 팝업 중
      if (openReady) return startRewards();

      if (!splitDone && Math.random() < splitProb()) {
        twoChests = true;
        splitDone = true;
        filled = 3;
        renderBoxes();
        return;
      }

      filled = Math.max(0, filled - 1);

      const [nxt, p] = nextStageProb();
      if (nxt && Math.random() < p) {
        stage = nxt;
        filled = 3;
        openReady = false;
        renderBoxes();
        return;
      }

      if (filled === 0) {
        openReady = true;
        renderBoxes();
        return;
      }

      renderBoxes();
    };

    area.addEventListener("click", onTap);
    wrap.appendChild(tapLabel);
    wrap.appendChild(grade);
    wrap.appendChild(area);
    screenRoot.appendChild(wrap);
    renderBoxes();
  };

  // 2) 중급 업그레이드 (별 1~5)
  const renderStarUpgrade = () => {
    hideAllOverlays();
    setBG(COLOR.PINK_BG);
    setHeader({ title: "상자 뽑기", sub: "", showBack: true });

    clearScreen();

    let firstTapDone = false;
    let star = 1;
    let filled = 3;
    let openReady = false;
    let splitDone = false;
    let twoChests = false;

    const P = {
      "1->2": 0.35,
      "2->3": 0.25,
      "3->4": 0.15,
      "4->5": 0.05,
    };

    const splitProb = () => (serverLuckActive() ? 0.15 : 0.10);

    const upgradeProb = () => {
      let p = 0;
      if (star === 1) p = P["1->2"];
      else if (star === 2) p = P["2->3"];
      else if (star === 3) p = P["3->4"];
      else if (star === 4) p = P["4->5"];
      if (serverLuckActive()) p = Math.min(1.0, p + 0.05);
      return p;
    };

    const rewardAmount = () => ({ 1:7, 2:10, 3:15, 4:25, 5:37 }[star] || 7);

    const wrap = el("div", "");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";

    const tapLabel = el("div", "tapText", "탭하세요!");
    const stopTap = tapAnim(tapLabel);

    const grade = el("div", "upGradeTitle", "★");

    const area = el("div", "clickArea");
    const holder = el("div", "boxHolder");
    const box1 = el("div", "emojiBoxNormal", "🎁");
    const box2 = el("div", "emojiBoxNormal", "🎁");
    const dots = el("div", "dotsLine", makeDots(filled));

    holder.appendChild(box1);
    area.appendChild(holder);
    area.appendChild(dots);

    const renderBoxes = () => {
      holder.innerHTML = "";
      box1.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      box2.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      holder.style.transform = openReady ? "translateY(-18px)" : "translateY(0px)";

      holder.appendChild(box1);
      if (twoChests) holder.appendChild(box2);

      dots.textContent = openReady ? "" : makeDots(filled);
      grade.textContent = "★".repeat(star);
    };

    const startRewards = () => {
      const times = twoChests ? 2 : 1;
      const amt = rewardAmount();
      rewardQueue = new Array(times).fill(amt);
      const first = rewardQueue.shift();
      state.gems += first;
      gemsVal.textContent = String(state.gems);
      showReward(first);

      const goBackAfter = () => {
        if (rewardQueue.length === 0 && rewardOverlay.hidden) go("box");
      };
      rewardOverlay.addEventListener("click", () => setTimeout(goBackAfter, 0), { once: false });
    };

    const onTap = () => {
      if (state.screen !== "star") return;

      if (!firstTapDone) {
        firstTapDone = true;
        tapLabel.remove();
        stopTap();
      }

      if (rewardOverlay.hidden === false) return;
      if (openReady) return startRewards();

      if (!splitDone && Math.random() < splitProb()) {
        twoChests = true;
        splitDone = true;
        filled = 3;
        renderBoxes();
        return;
      }

      filled = Math.max(0, filled - 1);

      if (star < 5 && Math.random() < upgradeProb()) {
        star += 1;
        filled = 3;
        openReady = false;
        renderBoxes();
        return;
      }

      if (filled === 0) {
        openReady = true;
        renderBoxes();
        return;
      }

      renderBoxes();
    };

    area.addEventListener("click", onTap);
    wrap.appendChild(tapLabel);
    wrap.appendChild(grade);
    wrap.appendChild(area);
    screenRoot.appendChild(wrap);
    renderBoxes();
  };

  // 3) 고급 업그레이드 (희귀~울트라 전설 + 배경색)
  const renderHighUpgrade = () => {
    hideAllOverlays();

    let firstTapDone = false;
    let stage = "희귀";
    let filled = 3;
    let openReady = false;
    let splitDone = false;
    let twoChests = false;

    const BG_BY_STAGE = {
      "희귀": "#1aa84b",
      "초희귀": "#1f5fbf",
      "영웅": "#7a2cff",
      "신화": "#ff2b2b",
      "전설": "#ffd400",
      "울트라 전설": "#ffffff",
    };

    const nextStageProbBase = () => {
      if (stage === "희귀") return ["초희귀", 0.75];
      if (stage === "초희귀") return ["영웅", 0.50];
      if (stage === "영웅") return ["신화", 0.35];
      if (stage === "신화") return ["전설", 0.15];
      if (stage === "전설") return ["울트라 전설", 0.05];
      return [null, 0.0];
    };

    const nextStageProb = () => {
      const [n, p0] = nextStageProbBase();
      if (!n) return [null, 0];
      const p = serverLuckActive() ? Math.min(1.0, p0 + 0.05) : p0;
      return [n, p];
    };

    const rewardAmount = () => ({ "희귀":20, "초희귀":25, "영웅":30, "신화":50, "전설":100, "울트라 전설":300 }[stage] || 20);
    const splitProb = () => 0.10;

    const applyTheme = () => {
      const bg = BG_BY_STAGE[stage] || COLOR.PINK_BG;
      setBG(bg);
      // 울트라 전설(흰색)이면 글씨 검정
      const fg = bg.toLowerCase() === "#ffffff" ? "#000" : "#fff";
      setHeader({ title: "상자 뽑기", sub: "", showBack: true });
      // 전체 글씨 색은 요소별로 적용
      return { bg, fg };
    };

    const { bg, fg } = applyTheme();

    clearScreen();

    const wrap = el("div", "");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    wrap.style.color = fg;

    const tapLabel = el("div", "tapText", "탭하세요!");
    tapLabel.style.color = fg;
    const stopTap = tapAnim(tapLabel);

    const grade = el("div", "upGradeTitle", stage);
    grade.style.color = fg;

    const area = el("div", "clickArea");
    area.style.background = "transparent";
    area.style.color = fg;

    const holder = el("div", "boxHolder");
    const box1 = el("div", "emojiBoxNormal", "🧰");
    const box2 = el("div", "emojiBoxNormal", "🧰");
    box1.style.color = fg;
    box2.style.color = fg;

    const dots = el("div", "dotsLine", makeDots(filled));
    dots.style.color = fg;

    holder.appendChild(box1);
    area.appendChild(holder);
    area.appendChild(dots);

    const renderBoxes = () => {
      holder.innerHTML = "";
      box1.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      box2.className = openReady ? "emojiBoxBig" : "emojiBoxNormal";
      holder.style.transform = openReady ? "translateY(-18px)" : "translateY(0px)";

      holder.appendChild(box1);
      if (twoChests) holder.appendChild(box2);

      dots.textContent = openReady ? "" : makeDots(filled);
      grade.textContent = stage;
    };

    const startRewards = () => {
      const times = twoChests ? 2 : 1;
      const amt = rewardAmount();
      rewardQueue = new Array(times).fill(amt);
      const first = rewardQueue.shift();
      state.gems += first;
      gemsVal.textContent = String(state.gems);
      showReward(first);

      rewardOverlay.addEventListener("click", () => {
        if (rewardQueue.length === 0 && rewardOverlay.hidden) go("box");
      }, { once: false });
    };

    const onTap = () => {
      if (state.screen !== "high") return;

      if (!firstTapDone) {
        firstTapDone = true;
        tapLabel.remove();
        stopTap();
      }

      if (rewardOverlay.hidden === false) return;
      if (openReady) return startRewards();

      if (!splitDone && Math.random() < splitProb()) {
        twoChests = true;
        splitDone = true;
        filled = 3;
        renderBoxes();
        return;
      }

      filled = Math.max(0, filled - 1);

      const [nxt, p] = nextStageProb();
      if (nxt && Math.random() < p) {
        stage = nxt;
        filled = 3;
        openReady = false;
        // 단계 바뀌면 배경색 바뀜
        applyTheme();
        renderBoxes();
        return;
      }

      if (filled === 0) {
        openReady = true;
        renderBoxes();
        return;
      }

      renderBoxes();
    };

    area.addEventListener("click", onTap);
    wrap.appendChild(tapLabel);
    wrap.appendChild(grade);
    wrap.appendChild(area);
    screenRoot.appendChild(wrap);
    renderBoxes();
  };

  // ===== 장비 화면: 탭 4개 + 캐릭터 상세/업글 + 주무기 상세/업글 =====
  const renderEquip = () => {
    hideAllOverlays();
    setBG(COLOR.GREEN_BG);
    setHeader({ title: "장비 구성", sub: "", showBack: true });

    clearScreen();

    // 메인 탭 화면
    const wrap = el("div", "equipWrap");

    const title = el("div", "equipTitle", "장비 구성");
    wrap.appendChild(title);

    const tabRow = el("div", "tabRow");
    const tabs = ["캐릭터", "주무기", "보조무기", "유물"];

    tabs.forEach((name, idx) => {
      const b = el("button", "tabBtn", name);
      if (idx === state.equip_tab) b.classList.add("active");
      b.addEventListener("click", () => {
        state.equip_tab = idx;
        render();
      });
      tabRow.appendChild(b);
    });
    wrap.appendChild(tabRow);

    const scroll = el("div", "equipScroll");
    const grid = el("div", "grid5");

    // 슬롯 생성 유틸
    const makeSlot = ({ emoji, name, level, maxOn, onClick, isCharBase=false, isWood=false }) => {
      const s = el("div", "slot");
      if (maxOn) s.classList.add("max-on");

      if (isCharBase) {
        const inner = el("div", "slotInnerBlack");
        s.appendChild(inner);
      } else {
        const emo = el("div", "slotEmoji", emoji);
        s.appendChild(emo);
      }

      const nm = el("div", "slotName", name);
      const lv = el("div", "slotLevel", String(level));
      const mx = el("div", "slotMax", maxOn ? "맥시멈 레벨" : "");

      s.appendChild(nm);
      s.appendChild(lv);
      s.appendChild(mx);

      s.addEventListener("click", onClick);
      return s;
    };

    // 5칸 배치: 0,1,2 / 3,4 (파이썬과 동일)
    const addFive = (slots) => {
      slots.forEach((s, i) => grid.appendChild(s));
      // 빈 공간 확보(파이썬 스크롤 여백)
      const spacer = el("div", "");
      spacer.style.height = "320px";
      spacer.style.gridColumn = "1 / -1";
      grid.appendChild(spacer);
    };

    const openCharDetail = () => {
      // 상세 화면
      hideAllOverlays();
      setBG(COLOR.GREEN_BG);
      setHeader({ title: "장비 구성", sub: "", showBack: false }); // 파이썬은 자체 <- 버튼
      clearScreen();

      const d = el("div", "detailWrap");

      const header = el("div", "detailHeader");
      const back = button("<-", () => render()); // 장비 메인으로
      back.classList.add("small");
      header.appendChild(back);

      const name = el("div", "detailName", "네모");
      const sub = el("div", "detailSub", "기본캐릭터");
      header.appendChild(name);
      header.appendChild(sub);
      d.appendChild(header);

      const crystal = el("div", "detailCrystal", `크리스탈: ${state.gems}`);
      d.appendChild(crystal);

      const big = el("div", "bigBlackBox");
      d.appendChild(big);

      const stat = el("div", "statCol");
      const maxOn = state.char_level >= state.char_level_max;
      stat.appendChild(el("div", "", `레벨: ${state.char_level}`));
      stat.appendChild(el("div", "", `체력: ${Number(state.char_hp).toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}`));
      stat.appendChild(el("div", "", `이동속도: ${Number(state.char_speed).toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}`));
      stat.appendChild(el("div", "", `스테미너: ${state.char_stamina|0}`));
      d.appendChild(stat);

      const notice = el("div", "detailNotice", "");
      d.appendChild(notice);

      const up = el("button", "upBtn", "");
      if (maxOn) {
        up.textContent = "맥시멈 레벨";
        up.disabled = true;
      } else {
        up.textContent = `업그레이드하기: ${charUpgradeCost()} 크리스탈`;
        up.disabled = false;
      }
      up.addEventListener("click", () => {
        if (state.char_level >= state.char_level_max) {
          notice.textContent = "이미 맥시멈 레벨입니다!";
          setTimeout(()=>notice.textContent="", 1200);
          return;
        }
        const cost = charUpgradeCost();
        openInlineConfirm(
          "업그레이드 할까요?",
          `비용: ${cost} 크리스탈\n\n추가되는 능력치\n체력 +0.5\n이동속도 +0.01\n스테미너 +5`,
          () => {
            if (state.gems < cost) {
              notice.textContent = "크리스탈이 부족합니다!";
              setTimeout(()=>notice.textContent="", 1200);
              return;
            }
            state.gems -= cost;
            state.char_level += 1;
            state.char_hp += 0.5;
            state.char_speed += 0.01;
            state.char_stamina += 5;
            render(); // 장비 메인으로 돌아가도 되고, 여기 새로 그려도 됨
            openCharDetail(); // 같은 화면 유지 (파이썬처럼)
          }
        );
      });
      d.appendChild(up);

      screenRoot.appendChild(d);
    };

    const openWeaponDetail = () => {
      hideAllOverlays();
      setBG(COLOR.GREEN_BG);
      setHeader({ title: "장비 구성", sub: "", showBack: false });
      clearScreen();

      const d = el("div", "detailWrap");

      const header = el("div", "detailHeader");
      const back = button("<-", () => render());
      back.classList.add("small");
      header.appendChild(back);

      const name = el("div", "detailName", "나무몽둥이");
      header.appendChild(name);
      d.appendChild(header);

      const crystal = el("div", "detailCrystal", `크리스탈: ${state.gems}`);
      d.appendChild(crystal);

      const big = el("div", "bigWeapon", "🪵");
      d.appendChild(big);

      const desc = el("div", "detailDesc",
        "나무몽둥이는 초보자를 위한 초급용 아이템입니다.\n대미지와 내구도가 약합니다."
      );
      desc.style.whiteSpace = "pre-line";
      d.appendChild(desc);

      const stat = el("div", "statCol");
      const maxOn = state.main_weapon_level >= state.main_weapon_level_max;
      stat.appendChild(el("div", "", `레벨: ${state.main_weapon_level}`));
      stat.appendChild(el("div", "", `공격력:${state.weapon_atk}`));
      stat.appendChild(el("div", "", `소모 스테미너:${state.weapon_stamina_cost}`));
      stat.appendChild(el("div", "", `공격 속도:${Number.isInteger(state.weapon_attack_speed)? state.weapon_attack_speed|0 : state.weapon_attack_speed}초`));
      stat.appendChild(el("div", "", `내구도소모:${state.weapon_dura_cost}/번`));
      stat.appendChild(el("div", "", `총 내구도:${state.weapon_total_dura}`));
      d.appendChild(stat);

      const notice = el("div", "detailNotice", "");
      d.appendChild(notice);

      const up = el("button", "upBtn", "");
      if (maxOn) {
        up.textContent = "맥시멈 레벨";
        up.disabled = true;
      } else {
        up.textContent = `업그레이드하기: ${weaponUpgradeCost()} 크리스탈`;
        up.disabled = false;
      }

      up.addEventListener("click", () => {
        if (state.main_weapon_level >= state.main_weapon_level_max) {
          notice.textContent = "이미 맥시멈 레벨입니다!";
          setTimeout(()=>notice.textContent="", 1200);
          return;
        }
        const cost = weaponUpgradeCost();
        openInlineConfirm(
          "업그레이드 할까요?",
          `비용: ${cost} 크리스탈\n\n추가되는 능력치\n공격력 +0.1\n소모 스테미너 -0.01\n내구도소모 -0.005/번\n총 내구도 +0.5`,
          () => {
            if (state.gems < cost) {
              notice.textContent = "크리스탈이 부족합니다!";
              setTimeout(()=>notice.textContent="", 1200);
              return;
            }
            state.gems -= cost;
            state.main_weapon_level += 1;
            state.weapon_atk = Math.round((Number(state.weapon_atk) + 0.1) * 1000) / 1000;
            state.weapon_stamina_cost = Math.round(Math.max(0, Number(state.weapon_stamina_cost) - 0.01) * 1000) / 1000;
            state.weapon_dura_cost = Math.round(Math.max(0, Number(state.weapon_dura_cost) - 0.005) * 1000) / 1000;
            state.weapon_total_dura = Math.round((Number(state.weapon_total_dura) + 0.5) * 1000) / 1000;

            render();
            openWeaponDetail();
          }
        );
      });

      d.appendChild(up);
      screenRoot.appendChild(d);
    };

    // 탭별 슬롯 구성(파이썬과 동일한 느낌)
    if (state.equip_tab === 0) {
      // 캐릭터 탭: 첫 슬롯 네모(검은 박스+이름+레벨+맥시멈)
      const maxOn = state.char_level >= state.char_level_max;
      const s0 = makeSlot({
        emoji: "🙂",
        name: "네모",
        level: state.char_level,
        maxOn,
        onClick: openCharDetail,
        isCharBase: true,
      });
      // 나머지 더미
      const s1 = makeSlot({ emoji:"🙂", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s2 = makeSlot({ emoji:"🙂", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s3 = makeSlot({ emoji:"🙂", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s4 = makeSlot({ emoji:"🙂", name:"", level:"", maxOn:false, onClick:()=>{}, });
      addFive([s0,s1,s2,s3,s4]);
    } else if (state.equip_tab === 1) {
      // 주무기 탭: 첫 슬롯 나무몽둥이
      const maxOn = state.main_weapon_level >= state.main_weapon_level_max;
      const s0 = makeSlot({
        emoji:"🪵",
        name:"나무몽둥이",
        level: state.main_weapon_level,
        maxOn,
        onClick: openWeaponDetail,
      });
      const s1 = makeSlot({ emoji:"⚔️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s2 = makeSlot({ emoji:"⚔️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s3 = makeSlot({ emoji:"⚔️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s4 = makeSlot({ emoji:"⚔️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      addFive([s0,s1,s2,s3,s4]);
    } else if (state.equip_tab === 2) {
      const s0 = makeSlot({ emoji:"🛡️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s1 = makeSlot({ emoji:"🛡️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s2 = makeSlot({ emoji:"🛡️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s3 = makeSlot({ emoji:"🛡️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s4 = makeSlot({ emoji:"🛡️", name:"", level:"", maxOn:false, onClick:()=>{}, });
      addFive([s0,s1,s2,s3,s4]);
    } else {
      const s0 = makeSlot({ emoji:"🔮", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s1 = makeSlot({ emoji:"🔮", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s2 = makeSlot({ emoji:"🔮", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s3 = makeSlot({ emoji:"🔮", name:"", level:"", maxOn:false, onClick:()=>{}, });
      const s4 = makeSlot({ emoji:"🔮", name:"", level:"", maxOn:false, onClick:()=>{}, });
      addFive([s0,s1,s2,s3,s4]);
    }

    scroll.appendChild(grid);
    wrap.appendChild(scroll);
    screenRoot.appendChild(wrap);
  };

  // ===== 메인 render =====
  const render = () => {
    // 화면 전환 때 오버레이가 남아서 “예/아니요만 덩그러니” 뜨는 거 방지
    hideAllOverlays();

    // 상단 gems 업데이트
    gemsVal.textContent = String(state.gems);

    // back 버튼 정책: 파이썬처럼 “각 화면 내 <-”도 있지만, 웹은 상단 back 사용
    backBtn.hidden = (state.screen === "title" || state.screen === "game");

    // screen switch
    if (state.screen === "title") return renderTitle();
    if (state.screen === "game") return renderGame();
    if (state.screen === "shop") return renderShop();
    if (state.screen === "box") return renderBox();
    if (state.screen === "chest") return renderChestUpgrade();
    if (state.screen === "star") return renderStarUpgrade();
    if (state.screen === "high") return renderHighUpgrade();
    if (state.screen === "equip") return renderEquip();

    // fallback
    state.screen = "title";
    renderTitle();
  };

  // ===== 시작 =====
  state.screen = "title";
  state.prev = [];
  render();
});
