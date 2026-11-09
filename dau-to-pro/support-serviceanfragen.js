/* Sticky-Themenreiter, Suche und dynamische Kapitelstapel wie auf IT VI.01. */
(() => {
  "use strict";
  const flow = document.getElementById("support-flow");
  if (!flow) return;
  const tabs = [...document.querySelectorAll(".map .jump[data-topic]")];
  const chapters = [...flow.querySelectorAll(":scope > .chapter")];
  const search = document.getElementById("topic-search");
  const status = document.getElementById("support-search-status");
  const wall = document.querySelector(".support-backdrop");
  const header = document.querySelector("header.top");
  const nav = document.querySelector(".map");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width:901px)");
  const groupById = new Map(chapters.map(ch => [ch.id, ch.dataset.topicGroup]));
  let active = "intake", raf = 0;

  const norm = value => (value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de-DE");
  const offset = () => (header?.offsetHeight || 64) + (nav?.offsetHeight || 70) + 18;

  function measure() {
    const shown = chapters.filter(ch => !ch.hidden);
    shown.forEach((ch, i) => {
      // Lange Kapitel erhalten einen negativen Sticky-Topwert: ihr Text bleibt scrollbar.
      const top = Math.min(offset(), innerHeight - ch.offsetHeight - 28);
      ch.style.setProperty("--support-fold-top", top + "px");
      ch.style.setProperty("--support-stack-z", String(i + 10));
    });
    paint();
  }
  function paint() {
    raf = 0;
    if (wall) {
      if (motion.matches) wall.style.removeProperty("--support-wall-shift");
      else wall.style.setProperty("--support-wall-shift",
        (Math.atan(Math.max(0, scrollY) / 1100) * 46).toFixed(1) + "px");
    }
    if (!desktop.matches || motion.matches || search.value.trim()) return;
    const shown = chapters.filter(ch => !ch.hidden);
    shown.forEach((ch, i) => {
      const next = shown[i + 1]?.getBoundingClientRect();
      const progress = next ? Math.max(0, Math.min(1,
        (innerHeight - next.top) / Math.max(190, innerHeight * .62))) : 0;
      ch.style.setProperty("--support-card-light", (1 - progress * .35).toFixed(3));
      ch.style.setProperty("--support-fold-scale", (1 - progress * .013).toFixed(3));
    });
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function select(topic, options = {}) {
    active = topic;
    search.value = "";
    status.hidden = true;
    document.body.dataset.activeTopic = topic;
    chapters.forEach(ch => { ch.hidden = ch.dataset.topicGroup !== topic; });
    tabs.forEach(tab => {
      const chosen = tab.dataset.topic === topic;
      tab.classList.toggle("is-current", chosen);
      tab.setAttribute("aria-selected", String(chosen));
      tab.tabIndex = chosen ? 0 : -1;
    });
    measure();
    if (options.scroll) {
      requestAnimationFrame(() => {
        measure();
        const top = flow.getBoundingClientRect().top + scrollY - offset() - 3;
        scrollTo({top: Math.max(0, top), behavior: motion.matches ? "instant" : "smooth"});
      });
    }
    if (options.hash) history.replaceState(null, "", "#" + options.hash);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", event => {
      event.preventDefault();
      select(tab.dataset.topic, {scroll:true, hash:tab.getAttribute("href").slice(1)});
    });
    tab.addEventListener("keydown", event => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
        (i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      tabs[next].focus();
      select(tabs[next].dataset.topic, {scroll:true, hash:tabs[next].getAttribute("href").slice(1)});
    });
  });
  search.addEventListener("input", () => {
    const term = norm(search.value.trim());
    if (!term) { select(active); return; }
    document.body.dataset.activeTopic = "search";
    tabs.forEach(tab => {
      tab.classList.remove("is-current");
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = 0;
    });
    let found = 0;
    chapters.forEach(ch => {
      const match = norm(ch.textContent).includes(term);
      ch.hidden = !match;
      if (match) found++;
    });
    status.hidden = false;
    status.textContent = found
      ? found + " Kapitel gefunden. Wähle einen Themenreiter, um zur Ansicht zurückzukehren."
      : "Kein Kapitel gefunden. Versuche einen anderen Suchbegriff.";
    measure();
  });
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!groupById.has(id)) return;
    select(groupById.get(id));
    document.getElementById(id)?.scrollIntoView({block:"start",behavior:"instant"});
  });
  addEventListener("scroll", queue, {passive:true});
  addEventListener("resize", measure, {passive:true});
  addEventListener("load", measure);
  if ("ResizeObserver" in window)
    new ResizeObserver(() => requestAnimationFrame(measure)).observe(flow);
  motion.addEventListener?.("change", measure);
  desktop.addEventListener?.("change", measure);

  const hashId = decodeURIComponent(location.hash.slice(1));
  const fromHash = groupById.get(hashId);
  select(fromHash || "intake");
  if (fromHash) requestAnimationFrame(() =>
    document.getElementById(hashId)?.scrollIntoView({block:"start",behavior:"instant"}));
})();
