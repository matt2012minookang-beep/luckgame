document.addEventListener("DOMContentLoaded", () => {
  const screenRoot = document.getElementById("screenRoot");
  const backBtn = document.getElementById("backBtn");
  const topTitle = document.getElementById("topTitle");
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
    prev: [],
    gems: 0,
    onYes: null,
  };

  function updateGems() {
    gemsVal.textContent = state.gems;
  }

  function clear() {
    screenRoot.innerHTML = "";
  }

  function panel() {
    const p = document.createElement("div");
    p.className = "panel";
    return p;
  }

  function btn(text, onClick) {
    const b = document.createElement("button");
    b.className = "btn btn-white";
    b.textContent = text;
    b.onclick = onClick;
    return b;
  }

  function showReward(text) {
    rewardText.textContent = text;
    rewardOverlay.hidden = false;
  }

  function hideReward() {
    rewardOverlay.hidden = true;
  }

  function openConfirm(title, desc, onYes) {
    confirmTitle.textContent = title;
    confirmDesc.textContent = desc;
    state.onYes = onYes;
    confirmOverlay.hidden = false;
  }

  function closeConfirm() {
    confirmOverlay.hidden = true;
    state.onYes = null;
  }

  confirmYes.onclick = () => {
    if (state.onYes) state.onYes();
    closeConfirm();
  };

  confirmNo.onclick = closeConfirm;
  rewardOverlay.onclick = hideReward;

  function renderTitle() {
    backBtn.hidden = true;
    topTitle.textContent = "운빨겜!";
    clear();

    const col = document.createElement("div");
    col.className = "centerCol";

    const title = document.createElement("div");
    title.className = "bigTitle";
    title.textContent = "운빨겜!";
    col.appendChild(title);

    const p = panel();
    p.appendChild(btn("게임 시작!", () => {
      state.prev.push("title");
      state.screen = "game";
      render();
    }));
    col.appendChild(p);

    screenRoot.appendChild(col);
  }

  function renderGame() {
    backBtn.hidden = false;
    clear();

    const col = document.createElement("div");
    col.className = "centerCol";

    const p = panel();
    p.appendChild(btn("확인창 테스트", () => {
      openConfirm("확인", "예를 누르면 크리스탈 +10", () => {
        state.gems += 10;
        updateGems();
        showReward("💎 크리스탈 10개 획득!");
      });
    }));

    col.appendChild(p);
    screenRoot.appendChild(col);
  }

  backBtn.onclick = () => {
    state.screen = state.prev.pop() || "title";
    render();
  };

  function render() {
    updateGems();
    closeConfirm();
    hideReward();
    if (state.screen === "title") renderTitle();
    else renderGame();
  }

  /* 🔥 시작 시 무조건 닫기 (핵심) */
  confirmOverlay.hidden = true;
  rewardOverlay.hidden = true;

  render();
});
