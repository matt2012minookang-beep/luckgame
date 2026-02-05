document.addEventListener("DOMContentLoaded", () => {
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

  const state = {
    screen: "title",
    prev: [],
    gems: 0,
    confirmYesHandler: null,
  };

  function setHeader(title, sub, showBack) {
    topTitle.textContent = title;
    if (sub) {
      topSub.textContent = sub;
      topSub.hidden = false;
    } else {
      topSub.hidden = true;
    }
    backBtn.hidden = !showBack;
  }

  function updateGems() {
    gemsVal.textContent = String(state.gems);
  }

  // ✅ 보상 오버레이: class로만 표시
  function showReward(text) {
    rewardText.textContent = text;
    rewardOverlay.hidden = false;            // 접근성용
    rewardOverlay.classList.add("is-open");  // 실제 표시
  }

  function hideReward() {
    rewardOverlay.classList.remove("is-open");
    rewardOverlay.hidden = true;
  }

  // ✅ 확인창: class로만 표시
  function openConfirm(title, desc, onYes) {
    confirmTitle.textContent = title;
    confirmDesc.textContent = desc;
    state.confirmYesHandler = onYes;

    inlineConfirm.hidden = false;              // 접근성용
    inlineConfirm.classList.add("is-open");    // 실제 표시
  }

  function closeConfirm() {
    inlineConfirm.classList.remove("is-open");
    inlineConfirm.hidden = true;
    state.confirmYesHandler = null;
  }

  // ✅ 시작할 때 무조건 닫아버림
  closeConfirm();
  hideReward();

  // ---- 이벤트 ----
  backBtn.addEventListener("click", () => {
    if (state.prev.length === 0) return;
    state.screen = state.prev.pop();
    render();
  });

  rewardOverlay.addEventListener("click", () => hideReward());

  confirmNo.addEventListener("click", () => closeConfirm());

  confirmYes.addEventListener("click", () => {
    if (typeof state.confirmYesHandler === "function") {
      const fn = state.confirmYesHandler;
      closeConfirm();
      fn();
    }
  });

  // ---- 화면 렌더 ----
  function clear() {
    screenRoot.innerHTML = "";
  }

  function btn(text, onClick) {
    const b = document.createElement("button");
    b.className = "btn btn-white";
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  function panel() {
    const p = document.createElement("div");
    p.className = "panel";
    return p;
  }

  function navigate(next) {
    state.prev.push(state.screen);
    state.screen = next;
    render();
  }

  function renderTitle() {
    setHeader("운빨겜!", "", false);
    clear();

    const col = document.createElement("div");
    col.className = "centerCol";

    const title = document.createElement("div");
    title.className = "bigTitle";
    title.textContent = "운빨겜!";
    col.appendChild(title);

    const p = panel();
    p.appendChild(btn("게임 시작!", () => navigate("game")));
    col.appendChild(p);

    screenRoot.appendChild(col);
  }

  function renderGame() {
    setHeader("운빨겜!", "", false);
    clear();

    const col = document.createElement("div");
    col.className = "centerCol";

    const p = panel();

    // ✅ 테스트: 확인창 동작 확인
    p.appendChild(
      btn("상점(테스트)", () => {
        openConfirm("테스트 확인창", "예/아니요가 동작하면 성공!", () => {
          showReward("✅ 예 버튼이 정상 동작했어!");
        });
      })
    );

    // ✅ 테스트: 크리스탈 증가
    p.appendChild(
      btn("크리스탈 +10(테스트)", () => {
        state.gems += 10;
        updateGems();
        showReward("크리스탈 10개를 획득했습니다!");
      })
    );

    col.appendChild(p);
    screenRoot.appendChild(col);
  }

  function render() {
    updateGems();
    // 화면 전환 시 혹시 남아있으면 무조건 닫기
    closeConfirm();
    hideReward();

    if (state.screen === "title") return renderTitle();
    if (state.screen === "game") return renderGame();

    state.screen = "title";
    return renderTitle();
  }

  render();
});
