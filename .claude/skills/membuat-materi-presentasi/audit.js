// Disuntik oleh verify-deck.sh. Hasil ditulis ke elemen pre#audit-result.
// OVERFLOW  = ada elemen konten yang keluar dari kotak slide 1280x720 (dekorasi .bigbrace diabaikan)
// NO-NOTES  = slide tanpa data-notes (catatan presenter)
// PLACEHOLDER = masih ada {{...}} dari template
addEventListener("load", function () {
  var out = [];
  var slides = document.querySelectorAll(".slide");
  slides.forEach(function (s, k) {
    var was = s.classList.contains("active");
    s.classList.add("active");
    var sr = s.getBoundingClientRect(), worst = 0;
    s.querySelectorAll("*").forEach(function (el) {
      if (el.closest(".bigbrace")) return;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      worst = Math.max(worst, r.bottom - sr.bottom, r.right - sr.right);
    });
    if (worst > 1) out.push("OVERFLOW slide " + (k + 1) + " (lebih " + Math.round(worst) + "px)");
    s.querySelectorAll("pre, td, .card").forEach(function (el) { // isi terpotong di dalam kotak
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
        out.push("CLIPPED slide " + (k + 1) + " <" + el.tagName.toLowerCase() + "> " + (el.textContent || "").trim().slice(0, 40));
    });
    if (!(s.dataset.notes || "").trim()) out.push("NO-NOTES slide " + (k + 1));
    var c = s.cloneNode(true);
    c.querySelectorAll("pre, code").forEach(function (x) { x.remove(); }); // {{ }} di kode = sintaks asli (Vue/Angular)
    if (/\{\{/.test(c.outerHTML)) out.push("PLACEHOLDER slide " + (k + 1));
    if (!was) s.classList.remove("active");
  });
  var pre = document.createElement("pre");
  pre.id = "audit-result";
  pre.textContent = "AUDIT " + (out.length ? out.join("\n") : "OK") + "\nSLIDES " + slides.length;
  document.body.appendChild(pre);
});
