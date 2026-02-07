document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("appRoot");

  // overlays
  const rewardOverlay = document.getElementById("rewardOverlay");
  const rewardText = document.getElementById("rewardText");
  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmMsg = document.getElementById("confirmMsg");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  // ---- State (Tkinter와 동일 개념) ----
  const state = {
    screen: "title",
    stack: [],

    gems: 0,

    shopFreeIn: 0,       // 90초
    serverLuckIn: 0,     // 60초

    // 첫 1회 무료 뽑기
    freeDrawUsed: { normal:false, mid:false, high:false },

    // 업그레이드(일반/중급/고급)
    upgrade: null,       // { type, stage, filled, openReady, two, splitDone, firstTapDone }

    // 장비
    equipTab: "char",    // char/main/sub/relic
    equipView: "grid",   // grid/detail
    charAskOpen: false,

    // 캐릭터(네모)
    char: { level: 1, hp: 1.5, speed: 1.0, stamina: 50 }
  };

  // ---- constants (Tkinter값 그대로) ----
  const GREEN_BG = getCss("--GREEN_BG");
  const BLUE_BG = getCss("--BLUE_BG");
  const PINK_BG = getCss("--PINK_BG");
  const LUCK_PURPLE = getCss("--LUCK_PURPLE");

  const PRICE_NORMAL = 7;
  const PRICE_MID = 15;
  const PRICE_HIGH = 30;

  function getCss(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function mmss(sec){
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec/60)).padStart(2,"0");
    const s = String(sec%60).padStart(2,"0");
    return `${m}:${s}`;
  }
  function serverLuckActive(){ return state.serverLuckIn > 0; }

  // ---- overlays: IMPORTANT (render가 닫지 않음. 이동할 때만 닫음) ----
  let confirmYesHandler = null;

  function openConfirm(message, onYes){
    confirmMsg.textContent = message;
    confirmYesHandler = onYes;
    confirmOverlay.hidden = false;
  }
  function closeConfirm(){
    confirmOverlay.hidden = true;
    confirmYesHandler = null;
  }

  let rewardQueue = []; // ["텍스트", ...] or [{text, amt}]
  function showRewardQueue(items){
    rewardQueue = items.slice();
    showNextReward();
  }
  function showNextReward(){
    if (rewardQueue.length === 0){
      rewardOverlay.hidden = true;
      return;
    }
    const item = rewardQueue[0];
    rewardText.textContent = typeof item === "string" ? item : item.text;
    rewardOverlay.hidden = false;
  }
  function closeRewardOne(){
    if (rewardQueue.length === 0) { rewardOverlay.hidden = true; return; }
    const item = rewardQueue.shift();
    if (typeof item === "object" && typeof item.amt === "number"){
      state.gems += item.amt;
    }
    if (rewardQueue.length === 0){
      rewardOverlay.hidden = true;
      return;
    }
    showNextReward();
  }

  rewardOverlay.addEventListener("click", () => {
    closeRewardOne();
    render();
  });

  confirmNo.addEventListener("click", () => closeConfirm());
  confirmYes.addEventListener("click", () => {
    const fn = confirmYesHandler;
    closeConfirm();
    if (typeof fn === "function") fn();
    render();
  });

  // ---- Navigation (Tkraise 느낌) ----
  function go(screen){
    // 화면 이동할 때만 오버레이 닫기
    closeConfirm();
    rewardOverlay.hidden = true;
    rewardQueue = [];

    state.stack.push(state.screen);
    state.screen = screen;
    render();
  }
  function back(){
    closeConfirm();
    rewardOverlay.hidden = true;
    rewardQueue = [];

    if (state.stack.length === 0) return;
    state.screen = state.stack.pop();
    render();
  }

  // ---- Currency helpers ----
  function spend(n){
    if (state.gems < n) return false;
    state.gems -= n;
    return true;
  }

  // ---- Timers (1초 틱) ----
  setInterval(() => {
    let changed = false;
    if (state.shopFreeIn > 0) { state.shopFreeIn -= 1; changed = true; }
    if (state.serverLuckIn > 0) { state.serverLuckIn -= 1; changed = true; }
    if (changed) render();
  }, 1000);

  // ---- Upgrade logic (Tkinter 규칙 그대로) ----
  // Normal
  const normalRewards = { "브론즈":1, "실버":2, "골드":3, "에메랄드":5, "다이아":7, "레드 다이아":10 };
  function normalNext(stage){
    let p = 0;
    let next = null;
    if (stage==="브론즈"){ next="실버"; p=0.70; }
    else if(stage==="실버"){ next="골드"; p=0.60; }
    else if(stage==="골드"){ next="에메랄드"; p=0.50; }
    else if(stage==="에메랄드"){ next="다이아"; p=0.30; }
    else if(stage==="다이아"){ next="레드 다이아"; p=0.10; }
    if (serverLuckActive()) p = Math.min(1, p + 0.05);
    return { next, p };
  }

  // Mid stars (요청: 단계별 확률)
  const starRewards = { 1:7, 2:10, 3:15, 4:25, 5:37 };
  function starNext(star){
    let next=null, p=0;
    if (star===1){ next=2; p=0.35; }
    else if (star===2){ next=3; p=0.25; }
    else if (star===3){ next=4; p=0.15; }
    else if (star===4){ next=5; p=0.05; }
    if (serverLuckActive()) p = Math.min(1, p + 0.05);
    return { next, p };
  }

  // High
  const highRewards = { "희귀":20, "초희귀":25, "영웅":30, "신화":50, "전설":100, "울트라 전설":300 };
  function highNext(stage){
    let next=null, p=0;
    if (stage==="희귀"){ next="초희귀"; p=0.75; }
    else if (stage==="초희귀"){ next="영웅"; p=0.50; }
    else if (stage==="영웅"){ next="신화"; p=0.35; }
    else if (stage==="신화"){ next="전설"; p=0.15; }
    else if (stage==="전설"){ next="울트라 전설"; p=0.05; }
    if (serverLuckActive()) p = Math.min(1, p + 0.05);
    return { next, p };
  }
  function highBg(stage){
    if (stage==="희귀") return { bg: GREEN_BG, fg:"#fff" };
    if (stage==="초희귀") return { bg: BLUE_BG, fg:"#fff" };
    if (stage==="영웅") return { bg: LUCK_PURPLE, fg:"#fff" };
    if (stage==="신화") return { bg: "#ff2b2b", fg:"#fff" };
    if (stage==="전설") return { bg: "#ffe34a", fg:"#000" };
    if (stage==="울트라 전설") return { bg: "#ffffff", fg:"#000" };
    return { bg: PINK_BG, fg:"#fff" };
  }

  function splitProb(){
    // 기본 10%, 서버럭이면 +5%
    return serverLuckActive() ? 0.15 : 0.10;
  }

  function startUpgrade(type){
    state.upgrade = {
      type,
      firstTapDone:false,
      filled:3,
      openReady:false,
      splitDone:false,
      two:false,
      stage: (type==="normal" ? "브론즈" : (type==="mid" ? 1 : "희귀"))
    };
    go("upgrade");
  }

  function upgradeRewardAmt(){
    const u = state.upgrade;
    if (!u) return 0;
    if (u.type==="normal") return normalRewards[u.stage] ?? 1;
    if (u.type==="mid") return starRewards[u.stage] ?? 7;
    if (u.type==="high") return highRewards[u.stage] ?? 20;
    return 0;
  }

  // ---- Character upgrade cost y=x^2+49 ----
  function charCost(level){
    return (level*level) + 49;
  }

  // ---- Render helpers ----
  function el(tag, cls){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function setRoot(node){
    root.innerHTML = "";
    root.appendChild(node);
  }

  function currencyBlock(parent, showLuckText, bgColor){
    const cur = el("div","currency");
    cur.innerHTML = `<span class="label">크리스탈:</span><span class="val" id="gemsVal">${state.gems}</span>`;
    parent.appendChild(cur);

    if (showLuckText){
      const luck = el("div","luckLabel");
      luck.textContent = serverLuckActive() ? `서버럭: ${mmss(state.serverLuckIn)} 남음` : "";
      parent.appendChild(luck);
    }
  }

  // ---- Screens ----
  function renderTitle(){
    const s = el("div","screen");
    s.style.background = GREEN_BG;

    const t = el("div","titleBig");
    t.textContent = "운빨겜!";
    s.appendChild(t);

    const btn = el("button","btn btn-white");
    btn.style.position = "absolute";
    btn.style.left = "50%";
    btn.style.top = "260px";
    btn.style.transform = "translateX(-50%)";
    btn.textContent = "게임 시작!";
    btn.addEventListener("click", () => { state.stack=[]; state.screen="game"; render(); });
    s.appendChild(btn);

    setRoot(s);
  }

  function renderGame(){
    const s = el("div","screen");

    // 서버럭이면 메인 배경 보라
    s.style.background = serverLuckActive() ? LUCK_PURPLE : GREEN_BG;

    // 상점 버튼(왼쪽 위)
    const shopBtn = el("button","btn " + (state.shopFreeIn<=0 ? "btn-yellow" : "btn btn-white"));
    shopBtn.className = "btn " + (state.shopFreeIn<=0 ? "btn-yellow" : "btn-white");
    shopBtn.textContent = "상점";
    shopBtn.style.position="absolute";
    shopBtn.style.left="12px";
    shopBtn.style.top="12px";
    shopBtn.addEventListener("click", ()=>go("shop"));
    s.appendChild(shopBtn);

    // 장비 버튼(왼쪽 중간)
    const equipBtn = el("button","btn btn-white");
    equipBtn.textContent = "장비";
    equipBtn.style.position="absolute";
    equipBtn.style.left="12px";
    equipBtn.style.top="50%";
    equipBtn.style.transform="translateY(-50%)";
    equipBtn.addEventListener("click", ()=>go("equip"));
    s.appendChild(equipBtn);

    // 크리스탈/서버럭 표시(오른쪽 위)
    currencyBlock(s, true);

    // 가운데 하단 박스 + 버튼 2개
    const box = el("div","centerBox");

    const boxBtn = el("button","btn btn-white");
    boxBtn.textContent = "상자 뽑기!";
    boxBtn.addEventListener("click", ()=>go("box"));

    const battleBtn = el("button","btn btn-white");
    battleBtn.textContent = "전투시작!";
    battleBtn.addEventListener("click", ()=>{
      showRewardQueue(["전투 기능은 준비중입니다!"]);
    });

    box.appendChild(boxBtn);
    box.appendChild(battleBtn);
    s.appendChild(box);

    setRoot(s);
  }

  function renderShop(){
    const s = el("div","screen");
    s.style.background = serverLuckActive() ? LUCK_PURPLE : BLUE_BG;

    const backBtn = el("button","btn btn-white backBtn");
    backBtn.textContent = "<-";
    backBtn.addEventListener("click", back);
    s.appendChild(backBtn);

    const title = el("div","sectionTitle");
    title.textContent = "상점";
    s.appendChild(title);

    currencyBlock(s, true);

    const row = el("div","row");

    // 무료 크리스탈
    const free = el("div","itemBox");
    free.innerHTML = `
      <div class="itemEmoji">💎</div>
      <div class="itemName">크리스탈</div>
      <div class="itemStatus">${state.shopFreeIn<=0 ? "10개" : "이미 받은 아이템입니다"}</div>
      <div class="itemSmall">${state.shopFreeIn<=0 ? "" : `${mmss(state.shopFreeIn)}초 후 무료`}</div>
    `;
    free.addEventListener("click", ()=>{
      if (state.shopFreeIn>0) return;
      state.gems += 10;
      state.shopFreeIn = 90;
      showRewardQueue([{ text:"크리스탈 10개를 획득했습니다!", amt:0 }]);
      render();
    });

    // 서버 운 강화
    const luck = el("div","itemBox");
    const luckRemain = serverLuckActive() ? `${mmss(state.serverLuckIn)} 남음` : "";
    luck.innerHTML = `
      <div class="itemEmoji">🍀</div>
      <div class="itemName">서버 운 강화</div>
      <div class="priceRow"><span>크리스탈 5개</span><span class="gem">💎</span></div>
      <div class="itemSmall">${luckRemain}</div>
    `;
    luck.addEventListener("click", ()=>{
      openConfirm("정말로 구매하시겠습니까?", ()=>{
        if (!spend(5)){
          showRewardQueue(["크리스탈이 부족합니다!"]);
          render();
          return;
        }
        state.serverLuckIn = 60; // ✅ 1분
        showRewardQueue(["서버 운 강화를 구매했습니다!"]);
        render();
      });
    });

    row.appendChild(free);
    row.appendChild(luck);
    s.appendChild(row);

    setRoot(s);
  }

  function renderBox(){
    const s = el("div","screen");
    s.style.background = serverLuckActive() ? LUCK_PURPLE : PINK_BG;

    const backBtn = el("button","btn btn-white backBtn");
    backBtn.textContent = "<-";
    backBtn.addEventListener("click", back);
    s.appendChild(backBtn);

    const title = el("div","sectionTitle");
    title.textContent = "상자 뽑기";
    s.appendChild(title);

    currencyBlock(s, true);

    const row = el("div","row");

    const normal = el("div","boxCard");
    normal.innerHTML = `
      <div class="boxCardTitle">일반 상자 업그레이드</div>
      <div class="boxCardPrice">${state.freeDrawUsed.normal ? `${PRICE_NORMAL} 크리스탈` : "무료 1회"}</div>
    `;
    normal.addEventListener("click", ()=>{
      if (!state.freeDrawUsed.normal){
        state.freeDrawUsed.normal = true;
        startUpgrade("normal");
        return;
      }
      if (!spend(PRICE_NORMAL)){
        showRewardQueue(["크리스탈이 부족합니다!"]);
        render();
        return;
      }
      startUpgrade("normal");
    });

    const mid = el("div","boxCard");
    mid.innerHTML = `
      <div class="boxCardTitle">중급 상자 업그레이드</div>
      <div class="boxCardPrice">${state.freeDrawUsed.mid ? `${PRICE_MID} 크리스탈` : "무료 1회"}</div>
    `;
    mid.addEventListener("click", ()=>{
      if (!state.freeDrawUsed.mid){
        state.freeDrawUsed.mid = true;
        startUpgrade("mid");
        return;
      }
      if (!spend(PRICE_MID)){
        showRewardQueue(["크리스탈이 부족합니다!"]);
        render();
        return;
      }
      startUpgrade("mid");
    });

    const high = el("div","boxCard");
    high.innerHTML = `
      <div class="boxCardTitle">고급 상자 업그레이드</div>
      <div class="boxCardPrice">${state.freeDrawUsed.high ? `${PRICE_HIGH} 크리스탈` : "무료 1회"}</div>
    `;
    high.addEventListener("click", ()=>{
      if (!state.freeDrawUsed.high){
        state.freeDrawUsed.high = true;
        startUpgrade("high");
        return;
      }
      if (!spend(PRICE_HIGH)){
        showRewardQueue(["크리스탈이 부족합니다!"]);
        render();
        return;
      }
      startUpgrade("high");
    });

    row.appendChild(normal);
    row.appendChild(mid);
    row.appendChild(high);
    s.appendChild(row);

    setRoot(s);
  }

  function renderUpgrade(){
    const u = state.upgrade;
    if (!u) { state.screen="box"; render(); return; }

    // 배경: normal/mid는 핑크, high는 단계별
    const s = el("div","screen");

    if (u.type==="high"){
      const { bg, fg } = highBg(u.stage);
      s.style.background = bg;
      s.style.color = fg;
    } else {
      s.style.background = PINK_BG;
    }

    const backBtn = el("button","btn btn-white backBtn");
    backBtn.textContent = "<-";
    backBtn.addEventListener("click", ()=>{
      state.upgrade = null;
      back(); // box로
    });
    s.appendChild(backBtn);

    const tap = el("div","tapHint");
    tap.textContent = u.firstTapDone ? "" : "탭하세요!";
    s.appendChild(tap);

    const stage = el("div","stageLabel");
    stage.textContent = u.type==="normal" ? u.stage : (u.type==="mid" ? `${u.stage}성` : u.stage);
    s.appendChild(stage);

    const area = el("div","clickArea");
    const holder = el("div","boxHolder");
    const b1 = el("div","boxEmoji" + (u.openReady ? " openReady" : ""));
    b1.textContent = "🎁";
    holder.appendChild(b1);

    if (u.two){
      const b2 = el("div","boxEmoji" + (u.openReady ? " openReady" : ""));
      b2.textContent = "🎁";
      holder.appendChild(b2);
    }

    area.appendChild(holder);
    s.appendChild(area);

    const dots = el("div","dots");
    dots.textContent = u.openReady ? "" : ["●","●","●"].map((c,i)=> i<u.filled? "●":"○").join(" ");
    s.appendChild(dots);

    area.addEventListener("click", ()=>{
      // 보상 단계
      if (u.openReady){
        const times = u.two ? 2 : 1;
        const amt = upgradeRewardAmt();
        const items = [];
        for (let i=0;i<times;i++){
          items.push({ text:`크리스탈 ${amt}개를 획득했습니다!`, amt });
        }
        showRewardQueue(items);

        // 끝나면 box로 복귀
        state.upgrade = null;
        state.screen = "box";
        state.stack = ["game"]; // box의 back은 game 느낌 유지
        render();
        return;
      }

      if (!u.firstTapDone) u.firstTapDone = true;

      // 분열
      if (!u.splitDone && Math.random() < splitProb()){
        u.two = true;
        u.splitDone = true;
        u.filled = 3;
        render();
        return;
      }

      // 원 감소
      u.filled = Math.max(0, u.filled - 1);

      // 업그레이드 확률
      if (u.type==="normal"){
        const { next, p } = normalNext(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          render();
          return;
        }
      } else if (u.type==="mid"){
        const { next, p } = starNext(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          render();
          return;
        }
      } else {
        const { next, p } = highNext(u.stage);
        if (next && Math.random() < p){
          u.stage = next;
          u.filled = 3;
          render();
          return;
        }
      }

      if (u.filled === 0){
        u.openReady = true;
        render();
        return;
      }

      render();
    });

    setRoot(s);
  }

  function renderEquip(){
    const s = el("div","screen");
    s.style.background = GREEN_BG;

    const backBtn = el("button","btn btn-white backBtn");
    backBtn.textContent = "<-";
    backBtn.addEventListener("click", back);
    s.appendChild(backBtn);

    const title = el("div","sectionTitle");
    title.textContent = "장비 구성";
    s.appendChild(title);

    // ✅ 장비도 크리스탈 표시 (요청)
    currencyBlock(s, false);

    const tabs = el("div","equipTabs");
    const tabDefs = [
      ["char","캐릭터"], ["main","주무기"], ["sub","보조무기"], ["relic","유물"]
    ];
    tabDefs.forEach(([key, label])=>{
      const b = el("button","tabBtn" + (state.equipTab===key ? " active": ""));
      b.textContent = label;
      b.addEventListener("click", ()=>{
        state.equipTab = key;
        state.equipView = "grid";
        state.charAskOpen = false;
        render();
      });
      tabs.appendChild(b);
    });
    s.appendChild(tabs);

    // 캐릭터 상세
    if (state.equipView === "detail"){
      const d = el("div","charDetail");

      const header = el("div","charHeader");
      header.innerHTML = `<span class="main">네모</span><span class="sub">기본캐릭터</span>`;
      d.appendChild(header);

      const lv = el("div","charLevelLine");
      lv.textContent = `레벨: ${state.char.level}`;
      d.appendChild(lv);

      const big = el("div","charBigBox");
      const blk = el("div","innerBlack");
      big.appendChild(blk);
      d.appendChild(big);

      const stats = el("div","charStats");
      stats.innerHTML = `
        <div class="statRow"><span>체력:</span><span>${state.char.hp.toFixed(1)}</span></div>
        <div class="statRow"><span>이동속도:</span><span>${state.char.speed.toFixed(2)}</span></div>
        <div class="statRow"><span>스테미너:</span><span>${Math.round(state.char.stamina)}</span></div>
      `;
      d.appendChild(stats);

      const maxed = state.char.level >= 10;
      const cost = maxed ? null : charCost(state.char.level);

      const up = el("button","btn btn-white upgradeBtn");
      up.textContent = maxed ? "맥시멈 레벨" : `업그레이드하기: ${cost} 크리스탈`;
      up.disabled = !!maxed;
      up.addEventListener("click", ()=>{
        if (maxed) return;
        state.charAskOpen = true;
        render();
      });
      d.appendChild(up);

      if (state.charAskOpen && !maxed){
        const ask = el("div","inlineAsk");
        ask.innerHTML = `
          <div class="inlineAskTitle">업그레이드 할까요?</div>
          <div class="inlineAskDesc">체력 +0.5 / 이동속도 +0.01 / 스테미너 +5</div>
        `;
        const btns = el("div","inlineAskBtns");
        const y = el("button","btn btn-white");
        y.textContent = "예";
        y.addEventListener("click", ()=>{
          const price = charCost(state.char.level);
          if (!spend(price)){
            state.charAskOpen = false;
            showRewardQueue(["크리스탈이 부족합니다!"]);
            render();
            return;
          }
          state.char.level += 1;
          state.char.hp += 0.5;
          state.char.speed += 0.01;
          state.char.stamina += 5;
          state.charAskOpen = false;
          showRewardQueue(["업그레이드 완료!"]);
          render();
        });

        const n = el("button","btn btn-white");
        n.textContent = "아니요";
        n.addEventListener("click", ()=>{
          state.charAskOpen = false;
          render();
        });

        btns.appendChild(y);
        btns.appendChild(n);
        ask.appendChild(btns);
        d.appendChild(ask);
      }

      s.appendChild(d);
      setRoot(s);
      return;
    }

    // grid view
    const scroll = el("div","equipScroll");
    const grid = el("div","grid3");

    // 각 탭마다 5개 슬롯
    for (let i=0;i<5;i++){
      const slot = el("div","slot");
      // 첫 슬롯(캐릭터 탭) = 네모
      if (state.equipTab==="char" && i===0){
        slot.appendChild(el("div","innerBlack"));

        const name = el("div","slotName");
        name.textContent = "네모";
        slot.appendChild(name);

        const lvl = el("div","levelNum");
        lvl.textContent = String(state.char.level);
        slot.appendChild(lvl);

        if (state.char.level>=10){
          const max = el("div","maxBadge");
          max.textContent = "맥시멈 레벨";
          slot.appendChild(max);
        }

        slot.addEventListener("click", ()=>{
          state.equipView = "detail";
          state.charAskOpen = false;
          render();
        });
      } else {
        slot.appendChild(el("div","innerBlack"));
      }
      grid.appendChild(slot);
    }

    scroll.appendChild(grid);
    s.appendChild(scroll);

    setRoot(s);
  }

  // ---- Router ----
  function render(){
    // title -> game back버튼 숨김은 화면 내부에서 처리 (웹은 버튼 개별)

    if (state.screen==="title") return renderTitle();
    if (state.screen==="game") return renderGame();
    if (state.screen==="shop") return renderShop();
    if (state.screen==="box") return renderBox();
    if (state.screen==="upgrade") return renderUpgrade();
    if (state.screen==="equip") return renderEquip();

    state.screen="title";
    renderTitle();
  }

  // ---- start ----
  render();
});
