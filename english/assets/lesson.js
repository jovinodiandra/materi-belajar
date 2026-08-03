/* Shared engine for english/level-*-materi-*/index.html pages.
   Each page must set, in an inline <script> BEFORE loading this file:
     window.LESSON_KEY         e.g. "english::level-4-materi-4"
     window.LESSON_QUESTIONS   array of {id,type:"fill"|"mc",prompt,answer|options+answer,explain}
     window.LESSON_DONE_HTML   endcard text (HTML ok) shown when all questions correct
     window.LESSON_LOCKED_HTML endcard text with {done} and {total} placeholders, shown until then
*/
(function () {
  "use strict";
  var sections = Array.prototype.slice.call(document.querySelectorAll("section.chapter"));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll(".rail a"));
  var progress = document.getElementById("progress");
  var counter = document.getElementById("counter");
  var total = sections.length;
  var current = 0;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("in"); });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var idx = sections.indexOf(e.target);
      if (idx < 0) return;
      current = idx;
      railLinks.forEach(function (a, i) { a.classList.toggle("active", i === idx); });
      if (counter) counter.textContent = pad(idx) + " / " + pad(total - 1);
    });
  }, { threshold: 0.5 });
  sections.forEach(function (s) { spy.observe(s); });

  function updateProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
    if (progress) progress.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    sections[i].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var k = ev.key;
    if (k === "ArrowRight" || k === "ArrowDown" || k === "j" || k === "PageDown") {
      ev.preventDefault(); goTo(current + 1);
    } else if (k === "ArrowLeft" || k === "ArrowUp" || k === "k" || k === "PageUp") {
      ev.preventDefault(); goTo(current - 1);
    } else if (k === "Home") { ev.preventDefault(); goTo(0); }
    else if (k === "End") { ev.preventDefault(); goTo(total - 1); }
  });
})();

(function () {
  "use strict";

  var MATERI_KEY = window.LESSON_KEY;
  var STATE_KEY = "materi-answers::" + MATERI_KEY;
  var DONE_KEY = "materi-progress::" + MATERI_KEY;
  var QUESTIONS = window.LESSON_QUESTIONS || [];
  var DONE_HTML = window.LESSON_DONE_HTML || "✅ Semua soal sudah benar.";
  var LOCKED_HTML = window.LESSON_LOCKED_HTML || "Terkunci sampai semua soal benar ({done}/{total} saat ini).";

  function normalize(s) {
    return String(s || "").trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = loadState();

  function countDone() {
    return QUESTIONS.filter(function (q) { return state[q.id] === true; }).length;
  }

  function renderProgress() {
    var done = countDone();
    var total = QUESTIONS.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    ["quizCount", "quizCount2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = done + " / " + total + " benar";
    });
    ["quizFill", "quizFill2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.width = pct + "%";
    });
    var pill = document.getElementById("progressPill");
    var pillCount = document.getElementById("progressPillCount");
    if (pillCount) pillCount.textContent = done + "/" + total;
    if (pill) pill.classList.toggle("done", done === total);

    var banner = document.getElementById("completeBanner");
    if (banner) banner.classList.toggle("show", done === total);

    var endcardStatus = document.getElementById("endcardStatus");
    if (endcardStatus) {
      endcardStatus.innerHTML = done === total
        ? DONE_HTML
        : LOCKED_HTML.replace("{done}", done).replace("{total}", total);
    }

    try { localStorage.setItem(DONE_KEY, done === total ? "true" : "false"); } catch (e) {}
  }

  function markCorrect(id) {
    state[id] = true;
    saveState(state);
    renderProgress();
  }

  function buildFillBox(q, index) {
    var box = document.createElement("div");
    box.className = "qbox";
    box.setAttribute("data-qid", q.id);

    var num = document.createElement("div");
    num.className = "qbox__num";
    num.textContent = String(index);
    box.appendChild(num);

    var body = document.createElement("div");
    body.className = "qbox__body";

    var promptEl = document.createElement("p");
    promptEl.className = "qbox__prompt";
    promptEl.innerHTML = q.prompt;
    body.appendChild(promptEl);

    var row = document.createElement("div");
    row.className = "qbox__input-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "qinput";
    input.placeholder = "ketik jawabanmu…";
    input.autocomplete = "off";
    input.spellcheck = false;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qbtn";
    btn.textContent = "Cek";

    row.appendChild(input);
    row.appendChild(btn);
    body.appendChild(row);

    var feedback = document.createElement("div");
    feedback.className = "qbox__feedback";
    body.appendChild(feedback);

    box.appendChild(body);

    var isDone = state[q.id] === true;
    if (isDone) {
      box.classList.add("correct");
      input.value = q.answer[0];
      input.disabled = true;
      input.classList.add("is-correct");
      btn.disabled = true;
      feedback.className = "qbox__feedback ok";
      feedback.innerHTML = "✓ Benar! " + q.explain;
    }

    function check() {
      var val = normalize(input.value);
      var ok = q.answer.some(function (a) { return normalize(a) === val; });
      if (!val) return;
      if (ok) {
        box.classList.add("correct");
        input.disabled = true;
        input.classList.remove("is-wrong");
        input.classList.add("is-correct");
        btn.disabled = true;
        feedback.className = "qbox__feedback ok";
        feedback.innerHTML = "✓ Benar! " + q.explain;
        markCorrect(q.id);
      } else {
        input.classList.remove("is-wrong");
        void input.offsetWidth;
        input.classList.add("is-wrong");
        feedback.className = "qbox__feedback bad";
        feedback.innerHTML = "✕ Belum tepat, coba lagi.";
      }
    }

    btn.addEventListener("click", check);
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); check(); }
    });

    return box;
  }

  function buildMcBox(q, index) {
    var box = document.createElement("div");
    box.className = "qbox";
    box.setAttribute("data-qid", q.id);

    var num = document.createElement("div");
    num.className = "qbox__num";
    num.textContent = String(index);
    box.appendChild(num);

    var body = document.createElement("div");
    body.className = "qbox__body";

    var promptEl = document.createElement("p");
    promptEl.className = "qbox__prompt";
    promptEl.innerHTML = q.prompt;
    body.appendChild(promptEl);

    var opts = document.createElement("div");
    opts.className = "qbox__options";

    var feedback = document.createElement("div");
    feedback.className = "qbox__feedback";

    var isDone = state[q.id] === true;
    var buttons = [];

    q.options.forEach(function (optVal) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qopt";
      b.textContent = optVal;
      b.setAttribute("data-value", optVal);
      buttons.push(b);

      if (isDone) {
        b.disabled = true;
        if (optVal === q.answer) b.classList.add("is-correct");
      }

      b.addEventListener("click", function () {
        if (box.classList.contains("correct")) return;
        if (optVal === q.answer) {
          b.classList.add("is-correct");
          buttons.forEach(function (o) { o.disabled = true; });
          box.classList.add("correct");
          feedback.className = "qbox__feedback ok";
          feedback.innerHTML = "✓ Benar! " + q.explain;
          markCorrect(q.id);
        } else {
          b.classList.remove("is-wrong");
          void b.offsetWidth;
          b.classList.add("is-wrong");
          feedback.className = "qbox__feedback bad";
          feedback.innerHTML = "✕ Belum tepat, coba lagi.";
          setTimeout(function () { b.classList.remove("is-wrong"); }, 500);
        }
      });

      opts.appendChild(b);
    });

    body.appendChild(opts);
    body.appendChild(feedback);
    box.appendChild(body);

    if (isDone) {
      box.classList.add("correct");
      feedback.className = "qbox__feedback ok";
      feedback.innerHTML = "✓ Benar! " + q.explain;
    }

    return box;
  }

  var latihanHost = document.getElementById("quizLatihan");
  var quizHost = document.getElementById("quizQuiz");
  var storyHost = document.getElementById("quizStory");
  var qNum = 0;

  QUESTIONS.forEach(function (q) {
    qNum++;
    var box = q.type === "mc" ? buildMcBox(q, qNum) : buildFillBox(q, qNum);
    var host = latihanHost;
    if (q.id.indexOf("l") === 0) host = latihanHost;
    else if (q.id.indexOf("s") === 0) host = storyHost;
    else host = quizHost;
    if (host) host.appendChild(box);
  });

  renderProgress();
})();
