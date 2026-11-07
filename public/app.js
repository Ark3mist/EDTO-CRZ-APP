(() => {
  const TABS = ["crz", "edto", "app"];
  const DEFAULT = "crz";
  const title = document.getElementById("screen-title");
  const tabs = document.querySelectorAll(".tab");
  const screens = document.querySelectorAll(".screen");

  function show(tab) {
    if (!TABS.includes(tab)) tab = DEFAULT;
    tabs.forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    screens.forEach((s) => { s.hidden = s.dataset.tab !== tab; });
    title.textContent = tab.toUpperCase();
  }

  function go(tab) {
    show(tab);
    if (location.hash.slice(1) !== tab) history.replaceState(null, "", "#" + tab);
  }

  tabs.forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));

  // Arrow-key navigation between tabs
  document.querySelector(".bottom-nav").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = TABS.indexOf(location.hash.slice(1) || DEFAULT);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    go(next);
    document.getElementById("tab-" + next).focus();
  });

  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
