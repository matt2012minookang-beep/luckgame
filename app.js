document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM =====
  const screenRoot = document.getElementById("screenRoot");
  const backBtn = document.getElementById("backBtn");
  const topTitle = document.getElementById("topTitle");
  const topSub = document.getElementById("topSub");
  const gemsVal = document.getElementById("gemsVal");

  const rewardOverlay = document.getElementById("rewardOverlay");
  const rewardText = document.getElementById("rewardText");

  const inlineConfirm = document.getElementById("inlineConfirm");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmDesc = document.getElementById("confirmDesc");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  // ===== State =====
  const state = {
    screen: "title",
    prev: [],

    gems: 0,

    shopFreeIn: 0,            // 무료 크리스탈 쿨다운(초)
    serverLuckIn: 0,          // 서버럭 남은 시간(초)

    // 첫 1회 무료 뽑기
    freeDrawUsed: { normal: false, mid: false, high: false },

    // 캐릭터(네모)
    char: {
      name: "네모",
      level: 1,
      hp: 1.5,
      speed: 1.0,
      stamina: 50,
    },

    // 오버레이 확인창
    confirmYesHandler: null,

    // 업그레이드 화면(공통)
    upgrade: null, // { type: 'normal'|'mid'|'high', ... }
    notice: "",
    noticeTimer: null,

    // 장비
    equip: {
      tab: "char",          // char / main / sub / relic
      view: "grid",         // grid / charDetail
      askOpen: false,
    },
  };

  // ===== Utils =====
  function clampInt(x){ return Math.max(0, Math.floor(x)); }
  function mmss(sec){
    sec = clampInt(sec);
    const m = String(Math.floor(sec/60)).padStart(2,"0");
    const s = String(sec%60).padStart(2,"0");
    return `${m}:${s}`;
  }
  function serverLuckActive(){ return state.serverLuckIn > 0; }

  function setHeader(title, sub, showBack) {
    topTitle.textContent = title;
    if (sub) { topSub.textContent = sub; topSub.hidden = false; }
    else { topSub.hidden = true; }
    backBtn.hidden = !showBack;
  }

  function updateGems() {
    gemsVal.textContent = String(state.gems);
  }

  function setNotice(text){
    state.notice = text || "";
    if (state.noticeTimer) clearTimeout(state.noticeTimer);
    if (text) {
      state.noticeTimer = setTimeout(() => {
        state.notice = "";
        render();
      }, 1200);
    }
    render();
  }

  // ===== Reward overlay =====
  function showReward(text){
    rewardText.textContent = text;
    rewardOverlay.hidden = false;
    rewardOverlay.classList.add("is-open");
  }
  function hideReward(){
    rewardOverlay.classList.remove("is-open");
    rewardOverlay.hidden = true;
  }

  // ===== Confirm overlay =====
  function openConfirm(title, desc, onYes){
    confirmTitle.textContent = title;
    confirmDesc.textContent = desc;
    state.confirmYesHandler = onYes;

    inlineConfirm.hidden = false;
    inlineConfirm.classList.add("is-open");
  }
  function closeConfirm(){
    inlineConfirm.classList.remove("is-open");
    inlineConfirm.hidden = true;
    state.confirmYesHandler = null;
  }

  // ===== Currency =====
  function addGems(n){
    state.gems += n;
    updateGems();
  }
  function spendGems(n){
    if (state.gems < n) return false;
    state.gems -= n;
    updateGems();
    return true;
  }

  // ===== Theme =====
  function screenBgColor(screen){
    // 서버럭이면: 메인/상점/뽑기 화면만 보라색. (장비 제외)
    const luck = serverLuckActive();
    if (screen === "equip") return "var(--bg-equip)";
    if (luck && (screen === "game" || screen === "shop" || screen === "box")) return "var(--bg-luck)";
    if (screen === "title" || screen === "game") return "var(--bg-main)";
    if (screen === "shop") return "var(--bg-shop)";
    if (screen === "box") return "var(--bg-box)";
    // 업그레이드 화면은 type마다 기본색/특수색
    return "var(--bg-box)";
  }

  // ===== Navigation =====
  function navigate(next){
    state.prev.push(state.screen);
    state.screen = next;
    render();
  }
  function goBack(){
    if (state.prev.length === 0) return;
    state.screen = state.prev.pop();
    render();
  }

  // ===== Timers (1초 틱) =====
  setInterval(() => {
    let changed = false;
    if (state.shopFreeIn > 0) { state.shopFreeIn -= 1; changed = true; }
    if (state.serverLuckIn > 0) { state.serverLuckIn -= 1; changed = true; }
    if (changed) render();
  }, 1000);

  // ===== Events =====
  backBtn.addEventListener("click", goBack);
  rewardOverlay.addEventListener("click", hideReward);
  confirmNo.addEventListener("click", closeConfirm);
  confirmYes.addEventListener("click", () => {
    const fn = state.confirmYesHandler;
    closeConfirm();
    if (typeof fn === "function") fn();
  });

  // ===== UI helpers =====
  function clear(){
    screenRoot.innerHTML = "";
  }
  function el(tag, cls){
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
  }
  function button(text, cls, onClick){
    const b = el("button", cls);
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }
  function card(title, emoji, priceText, onClick){
    const c = el("div","card");
    c.addEventListener("click", onClick);

    const emo = el("div","emojiBig"); emo.textContent = emoji;
    const t = el("div","cardTitle"); t.textContent = title;
    const p = el("div","cardPrice"); p.textContent = priceText;

    c.appendChild(emo);
    c.appendChild(t);
    c.appendChild(p);
    return c;
  }

  // ===== Upgrade Logic =====
  function makeUpgrade(type){
    // 공통 상태
    return {
      type,                 // normal / mid / high
      firstTapDone: false,
      filled: 3,
      openReady: false,
      splitDone: false,
      two: false,
      stage: null,          // normal: 브론즈~ , mid: 1~5, high: string
      bg: null,
    };
  }

  function dotsText(filled){
    return [0,1,2].map(i => (i < filled ? "●" : "○")).join(" ");
  }

  function splitProb(type){
    // 파이썬 기준: normal은 10% (서버럭 시 15%)
    // high는 요청에서 10%라고 했으니 동일 적용
    // mid도 동일하게 적용(파이썬 시스템 통일)
    const base = 0.10;
    const bonus = serverLuckActive() ? 0.05 : 0.0;
    return base + bonus;
  }

  // ---- Normal ----
  const normalStages = ["브론즈","실버","골드","에메랄드","다이아","레드 다이아"];
  const normalRewards = { "브론즈":1, "실버":2, "골드":3, "에메랄드":5, "다이아":7, "레드 다이아":10 };
  function normalNextProb(stage){
    // base + (serverLuck ? +0.05 : 0)
    const add = serverLuckActive() ? 0.05 : 0.0;
    if (stage==="브론즈") return { next:"실버", p: Math.min(1, 0.70+add) };
    if (stage==="실버") return { next:"골드", p: Math.min(1, 0.60+add) };
    if (stage==="골드") return { next:"에메랄드", p: Math.min(1, 0.50+add) };
    if (stage==="에메랄드") return { next:"다이아", p: Math.min(1, 0.30+add) };
    if (stage==="다이아") return { next:"레드 다이아", p: Math.min(1, 0.10+add) };
    return { next:null, p:0 };
  }

  // ---- Mid (Stars) ----
  // 요청: "1성이 될때의 확률 45%" / "1->2:35 / 2->3:25 / 3->4:15 / 4->5:5"
  // => 시작은 항상 1성(확정). 업그레이드 단계별 확률 적용.
  // 보상: 1:7,2:10,3:15,4:25,5:37
  const starRewards = { 1:7, 2:10, 3:15, 4:25, 5:37 };
  function starNextProb(star){
    const add = serverLuckActive() ? 0.05 : 0.0;
    if (star===1) return { next:2, p: Math.min(1, 0.35+add) };
    if (star===2) return { next:3, p: Math.min(1, 0.25+add) };
    if (star===3) return { next:4, p: Math.min(1, 0.15+add) };
    if (star===4) return { next:5, p: Math.min(1, 0.05+add) };
    return { next:null, p:0 };
  }

  // ---- High (Rare → Ultra) ----
  const highStages = ["희귀","초희귀","영웅","신화","전설","울트라 전설"];
  const highRewards = { "희귀":20, "초희귀":25, "영웅":30, "신화":50, "전설":100, "울트라 전설":300 };
  function highNextProb(stage){
    const add = serverLuckActive() ? 0.05 : 0.0;
    if (stage==="희귀") return { next:"초희귀", p: Math.min(1, 0.75+add) };
    if (stage==="초희귀") return { next:"영웅", p: Math.min(1, 0.50+add) };
    if (stage==="영웅") return { next:"신화", p: Math.min(1, 0.35+add) };
    if (stage==="신화") return { next:"전설", p: Math.min(1, 0.15+add) };
    if (stage==="전설") return { next:"울트라 전설", p: Math.min(1, 0.05+add) };
    return { next:null, p:0 };
  }

  function highStageBg(stage){
    // 요청: 희귀 초록 / 초희귀 파랑 / 영웅 보라 / 신화 빨강 / 전설 노랑 / 울트라 흰색(글씨 안보이게 조정)
    if (stage==="희귀") return { bg:"#0b3b1a", fg:"#fff" };
    if (stage==="초희귀") return { bg:"#1f5fbf", fg:"#fff" };
    if (stage==="영웅") return { bg:"#6a2bbf", fg:"#fff" };
    if (stage==="신화") return { bg:"#ff2b2b", fg:"#fff" };
    if (stage==="전설") return { bg:"#ffe34a", fg:"#000" };
    if (stage==="울트라 전설") return { bg:"#ffffff", fg:"#000" };
    return { bg:"var(--bg-box)", fg:"#fff" };
  }

  // ===== Character Upgrade =====
  function charUpgradeCost(level){
    // 다음 업그레이드 비용: x^2 + 49, x = 현재 레벨(= 업그레이드 횟수)
    // L=1이면 50, L=2이면 53 ...
    return (level*level) + 49;
  }

  // ===== Screens =====
  function renderTitle(){
    setHeader("운빨겜!","",false);
    clear();

    const scr = el("div","screen");
    scr.style.background = screenBgColor("title");

    const wrap = el("div","centerCol");
    const title = el("div","bigTitle"); title.textContent = "운빨겜!";
    wrap.appendChild(title);

    const p = el("div","panel");
    p.appendChild(button("게임 시작!","btn btn-white", () => navigate("game")));
    wrap.appendChild(p);

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  function renderGame(){
    const luckText = serverLuckActive() ? `서버럭: ${mmss(state.serverLuckIn)} 남음` : "";
    setHeader("운빨겜!", luckText, false);

    clear();
    const scr = el("div","screen");
    scr.style.background = screenBgColor("game");

    const wrap = el("div","centerCol");

    const p = el("div","panel");

    // 상점 버튼: 무료면 노란색
    const shopBtn = button("상점","btn " + (state.shopFreeIn<=0 ? "btn-yellow" : "btn-white"), () => navigate("shop"));
    const boxBtn = button("상자 뽑기!","btn btn-white", () => navigate("box"));
    const equipBtn = button("장비","btn btn-white", () => navigate("equip"));
    const battleBtn = button("전투시작!","btn btn-white", () => setNotice("전투 기능은 준비중입니다!"));

    p.appendChild(shopBtn);
    p.appendChild(boxBtn);
    p.appendChild(equipBtn);
    p.appendChild(battleBtn);

    wrap.appendChild(p);

    if (state.notice){
      const n = el("div","notice");
      n.textContent = state.notice;
      wrap.appendChild(n);
    }

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  function renderShop(){
    const luckText = serverLuckActive() ? `서버럭: ${mmss(state.serverLuckIn)} 남음` : "";
    setHeader("상점", luckText, true);

    clear();
    const scr = el("div","screen");
    scr.style.background = screenBgColor("shop");

    const wrap = el("div","centerCol");
    const row = el("div","row");

    // 무료 크리스탈(10개) — 쿨 90초
    const freeTitle = state.shopFreeIn<=0 ? "크리스탈(무료)" : "이미 받은 아이템입니다";
    const freePrice = state.shopFreeIn<=0 ? "10개" : `${mmss(state.shopFreeIn)}초 후 무료`;

    const freeCard = card(freeTitle, "💎", freePrice, () => {
      if (state.shopFreeIn > 0) return;
      addGems(10);
      state.shopFreeIn = 90;
      showReward("크리스탈 10개를 획득했습니다!");
      render();
    });

    // 서버 운 강화 — 5개, 1분
    const luckCard = card("서버 운 강화", "🍀", "크리스탈 5개 (1분)", () => {
      openConfirm("정말로 구매하시겠습니까?", "서버 운 강화(1분)를 구매합니다.", () => {
        if (!spendGems(5)){
          setNotice("크리스탈이 부족합니다!");
          return;
        }
        state.serverLuckIn = 60; // 1분
        setNotice("서버 운 강화를 구매했습니다!");
        render();
      });
    });

    row.appendChild(freeCard);
    row.appendChild(luckCard);

    wrap.appendChild(row);

    if (state.notice){
      const n = el("div","notice");
      n.textContent = state.notice;
      wrap.appendChild(n);
    }

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  function renderBox(){
    const luckText = serverLuckActive() ? `서버럭: ${mmss(state.serverLuckIn)} 남음` : "";
    setHeader("상자 뽑기", luckText, true);

    clear();
    const scr = el("div","screen");
    scr.style.background = screenBgColor("box");

    const wrap = el("div","centerCol");
    const row = el("div","row");

    // 첫 1회 무료: normal/mid/high
    const normalPrice = state.freeDrawUsed.normal ? "7 크리스탈" : "무료 1회";
    const midPrice    = state.freeDrawUsed.mid    ? "15 크리스탈" : "무료 1회";
    const highPrice   = state.freeDrawUsed.high   ? "30 크리스탈" : "무료 1회";

    const normalCard = card("일반 상자 업그레이드", "🎁", normalPrice, () => {
      const cost = 7;
      if (!state.freeDrawUsed.normal){
        state.freeDrawUsed.normal = true;
        startUpgrade("normal");
        return;
      }
      if (!spendGems(cost)){
        setNotice("크리스탈이 부족합니다!");
        return;
      }
      startUpgrade("normal");
    });

    const midCard = card("중급 상자 업그레이드", "🎁", midPrice, () => {
      const cost = 15;
      if (!state.freeDrawUsed.mid){
        state.freeDrawUsed.mid = true;
        startUpgrade("mid");
        return;
      }
      if (!spendGems(cost)){
        setNotice("크리스탈이 부족합니다!");
        return;
      }
      startUpgrade("mid");
    });

    const highCard = card("고급 상자 업그레이드", "🎁", highPrice, () => {
      const cost = 30;
      if (!state.freeDrawUsed.high){
        state.freeDrawUsed.high = true;
        startUpgrade("high");
        return;
      }
      if (!spendGems(cost)){
        setNotice("크리스탈이 부족합니다!");
        return;
      }
      startUpgrade("high");
    });

    row.appendChild(normalCard);
    row.appendChild(midCard);
    row.appendChild(highCard);

    wrap.appendChild(row);

    if (state.notice){
      const n = el("div","notice");
      n.textContent = state.notice;
      wrap.appendChild(n);
    }

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  function startUpgrade(type){
    state.upgrade = makeUpgrade(type);
    if (type === "normal"){
      state.upgrade.stage = "브론즈";
      state.upgrade.bg = "var(--bg-box)";
    } else if (type === "mid"){
      state.upgrade.stage = 1; // 1성부터 시작(확정)
      state.upgrade.bg = "var(--bg-box)";
    } else if (type === "high"){
      state.upgrade.stage = "희귀";
      // 고급은 단계별 배경
      const { bg } = highStageBg("희귀");
      state.upgrade.bg = bg;
    }
    navigate("upgrade");
  }

  function upgradeRewardAmount(){
    const u = state.upgrade;
    if (!u) return 0;
    if (u.type==="normal") return normalRewards[u.stage] ?? 1;
    if (u.type==="mid") return starRewards[u.stage] ?? 7;
    if (u.type==="high") return highRewards[u.stage] ?? 20;
    return 0;
  }

  function upgradeTitleText(){
    const u = state.upgrade;
    if (!u) return "";
    if (u.type==="normal") return String(u.stage);
    if (u.type==="mid") return `${u.stage}성`;
    if (u.type==="high") return String(u.stage);
    return "";
  }

  function upgradeTapHint(){
    const u = state.upgrade;
    if (!u) return "";
    return u.firstTapDone ? "" : "탭하세요!";
  }

  function renderUpgrade(){
    const u = state.upgrade;
    if (!u) { state.screen="box"; render(); return; }

    // 업그레이드 화면은 back이 box로
    setHeader(
      u.type==="normal" ? "일반 업그레이드" : (u.type==="mid" ? "중급 업그레이드" : "고급 업그레이드"),
      "",
      true
    );

    clear();

    const scr = el("div","screen");
    // 배경 설정
    if (u.type === "high"){
      const { bg, fg } = highStageBg(u.stage);
      scr.style.background = bg;
      scr.style.color = fg;
    } else {
      scr.style.background = "var(--bg-box)";
      scr.style.color = "#fff";
    }

    const wrap = el("div","upWrap");

    // 탭 텍스트
    if (!u.firstTapDone){
      const th = el("div","tapHint");
      th.textContent = "탭하세요!";
      wrap.appendChild(th);
    } else {
      // 빈 공간 느낌 유지
      const spacer = el("div","tapHint");
      spacer.textContent = "";
      spacer.style.height = "22px";
      wrap.appendChild(spacer);
    }

    const st = el("div","stageTitle");
    st.textContent = upgradeTitleText();
    wrap.appendChild(st);

    // 클릭 영역
    const area = el("div","clickArea");
    area.style.cursor = "pointer";

    // 상자 이모지(트윙클 없음, 선물상자만)
    const holder = el("div", u.two ? "two" : "");
    const b1 = el("div","boxEmoji" + (u.openReady ? " openReady" : ""));
    b1.textContent = "🎁";
    holder.appendChild(b1);

    if (u.two){
      const b2 = el("div","boxEmoji" + (u.openReady ? " openReady" : ""));
      b2.textContent = "🎁";
      holder.appendChild(b2);
    }

    area.appendChild(holder);

    // dots
    const dots = el("div","dots");
    dots.textContent = u.openReady ? "" : dotsText(u.filled);

    // 탭 이벤트
    function onTap(){
      // 오픈 준비면 보상
      if (u.openReady){
        // 두 개면 2번 지급
        const times = u.two ? 2 : 1;
        const amtEach = upgradeRewardAmount();
        // 클릭 한번에 순차 지급 느낌: 1개씩 보상 오버레이로 받고 닫으면 다음
        let left = times;

        const giveOne = () => {
          addGems(amtEach);
          showReward(`크리스탈 ${amtEach}개를 획득했습니다!`);
          left -= 1;
          // 오버레이 클릭해서 닫을 때 다음 지급
          const handler = () => {
            rewardOverlay.removeEventListener("click", handler);
            hideReward();
            if (left > 0){
              setTimeout(giveOne, 10);
            } else {
              // 끝나면 box로 돌아감
              state.upgrade = null;
              state.prev = state.prev.filter(s => s !== "upgrade");
              state.screen = "box";
              render();
            }
          };
          rewardOverlay.addEventListener("click", handler);
        };

        giveOne();
        return;
      }

      // 첫 탭
      if (!u.firstTapDone) u.firstTapDone = true;

      // 분열
      if (!u.splitDone && Math.random() < splitProb(u.type)){
        u.two = true;
        u.splitDone = true;
        u.filled = 3;
        render();
        return;
      }

      // 원 감소
      u.filled = Math.max(0, u.filled - 1);

      // 단계 업그레이드 확률
      if (u.type === "normal"){
        const { next, p } = normalNextProb(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          u.openReady = false;
          render();
          return;
        }
      }

      if (u.type === "mid"){
        const { next, p } = starNextProb(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          u.openReady = false;
          render();
          return;
        }
      }

      if (u.type === "high"){
        const { next, p } = highNextProb(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          u.openReady = false;
          render();
          return;
        }
      }

      // 열 준비
      if (u.filled === 0){
        u.openReady = true;
        render();
        return;
      }

      render();
    }

    area.addEventListener("click", onTap);

    wrap.appendChild(area);
    wrap.appendChild(dots);

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  function renderEquip(){
    setHeader("장비 구성", "", true);
    clear();

    const scr = el("div","screen");
    scr.style.background = "var(--bg-equip)";

    const wrap = el("div","centerCol");

    // 탭 버튼
    const tabs = el("div","equipTopTabs");
    const tabDefs = [
      { key:"char", label:"캐릭터" },
      { key:"main", label:"주무기" },
      { key:"sub", label:"보조무기" },
      { key:"relic", label:"유물" },
    ];

    tabDefs.forEach(t => {
      const b = el("button","tabBtn" + (state.equip.tab===t.key ? " active": ""));
      b.textContent = t.label;
      b.addEventListener("click", () => {
        state.equip.tab = t.key;
        state.equip.view = "grid";
        state.equip.askOpen = false;
        render();
      });
      tabs.appendChild(b);
    });

    wrap.appendChild(tabs);

    // 상세 보기(캐릭터)
    if (state.equip.view === "charDetail"){
      const d = el("div","charDetail");

      // 상단 라인: 뒤로가기 버튼 오른쪽에 네모 + 기본캐릭터
      const headerLine = el("div","charHeaderLine");
      const main = el("div","charHeaderMain"); main.textContent = "네모";
      const sub = el("div","charHeaderSub"); sub.textContent = "기본캐릭터";
      headerLine.appendChild(main);
      headerLine.appendChild(sub);

      // 레벨 표시(체력 텍스트 위)
      const lvLine = el("div","charLevelLine");
      lvLine.textContent = `레벨: ${state.char.level}`;
      d.appendChild(headerLine);
      d.appendChild(lvLine);

      // 큰 캐릭터 박스(검정 네모)
      const big = el("div","charBigEmojiBox");
      const blk = el("div","charBigEmoji");
      big.appendChild(blk);
      d.appendChild(big);

      // 오른쪽 스탯
      const right = el("div","charStatsRight");

      const s1 = el("div","statRow");
      s1.innerHTML = `<span>체력:</span><span>${state.char.hp.toFixed(1)}</span>`;
      const s2 = el("div","statRow");
      s2.innerHTML = `<span>이동속도:</span><span>${state.char.speed.toFixed(2)}</span>`;
      const s3 = el("div","statRow");
      s3.innerHTML = `<span>스테미너:</span><span>${Math.round(state.char.stamina)}</span>`;
      right.appendChild(s1); right.appendChild(s2); right.appendChild(s3);

      d.appendChild(right);

      // 업그레이드 버튼(가격 증가)
      const maxed = state.char.level >= 10;
      const cost = maxed ? null : charUpgradeCost(state.char.level);
      const upBtn = el("button","upgradeBtn");
      upBtn.textContent = maxed ? "맥시멈 레벨" : `업그레이드하기: ${cost} 크리스탈`;
      upBtn.disabled = !!maxed;

      upBtn.addEventListener("click", () => {
        if (maxed) return;
        state.equip.askOpen = true;
        render();
      });

      d.appendChild(upBtn);

      // 화면 안 확인(겹침 방지)
      if (state.equip.askOpen && !maxed){
        const ask = el("div","inlineAsk");
        const t = el("div","inlineAskTitle"); t.textContent = "업그레이드 할까요?";
        const desc = el("div","inlineAskDesc");
        desc.textContent = "체력 +0.5 / 이동속도 +0.01 / 스테미너 +5";
        const btns = el("div","inlineAskBtns");

        const yes = button("예","btn btn-white", () => {
          const price = charUpgradeCost(state.char.level);
          if (!spendGems(price)){
            state.equip.askOpen = false;
            setNotice("크리스탈이 부족합니다!");
            return;
          }
          state.char.level += 1;
          state.char.hp += 0.5;
          state.char.speed += 0.01;
          state.char.stamina += 5;
          state.equip.askOpen = false;
          setNotice("업그레이드 완료!");
          render();
        });

        const no = button("아니요","btn btn-white", () => {
          state.equip.askOpen = false;
          render();
        });

        btns.appendChild(yes);
        btns.appendChild(no);

        ask.appendChild(t);
        ask.appendChild(desc);
        ask.appendChild(btns);
        d.appendChild(ask);
      }

      wrap.appendChild(d);

      scr.appendChild(wrap);
      screenRoot.appendChild(scr);
      return;
    }

    // 그리드(스크롤)
    const scroll = el("div","equipScroll");
    const grid = el("div","grid3");

    // 각 탭마다 5개 네모(읽는 순서)
    const slots = 5;

    for (let i=0;i<slots;i++){
      const slot = el("div","slotCard");

      // 캐릭터 탭 첫 슬롯은 "기본 캐릭터"
      if (state.equip.tab==="char" && i===0){
        const lvl = el("div","levelBadge");
        lvl.textContent = `${state.char.level}`;
        slot.appendChild(lvl);

        const bigBox = el("div","bigBox");
        const inner = el("div","innerBlack");
        bigBox.appendChild(inner);

        const name = el("div","charName");
        name.textContent = "네모";

        slot.appendChild(bigBox);
        slot.appendChild(name);

        if (state.char.level >= 10){
          const max = el("div","maxBadge");
          max.textContent = "맥시멈 레벨";
          slot.appendChild(max);
        }

        slot.addEventListener("click", () => {
          state.equip.view = "charDetail";
          state.equip.askOpen = false;
          render();
        });
      } else {
        // 나머지 슬롯은 비어있는 느낌(검정 네모만 중앙)
        const bigBox = el("div","bigBox");
        const inner = el("div","innerBlack");
        bigBox.appendChild(inner);
        slot.appendChild(bigBox);
      }

      grid.appendChild(slot);
    }

    scroll.appendChild(grid);
    wrap.appendChild(scroll);

    if (state.notice){
      const n = el("div","notice");
      n.textContent = state.notice;
      wrap.appendChild(n);
    }

    scr.appendChild(wrap);
    screenRoot.appendChild(scr);
  }

  // ===== Render Router =====
  function render(){
    updateGems();

    // 항상 오버레이 초기화
    closeConfirm();
    hideReward();

    // 화면별 배경 & 헤더는 각 화면이 설정
    if (state.screen === "title") return renderTitle();
    if (state.screen === "game") return renderGame();
    if (state.screen === "shop") return renderShop();
    if (state.screen === "box") return renderBox();
    if (state.screen === "upgrade") return renderUpgrade();
    if (state.screen === "equip") return renderEquip();

    // fallback
    state.screen = "title";
    renderTitle();
  }

  // ===== 초기 시작 =====
  render();
});
