#!/usr/bin/env bash
# Cek deck presentasi materi. Pakai: verify-deck.sh <path/ke/index.html> [--shots]
#   --shots  : simpan screenshot tiap slide (1280x720) ke folder sementara, untuk dicek visual.
# Jalankan dari root repo materi.
set -u
DECK="${1:?pakai: verify-deck.sh <path/ke/index.html> [--shots]}"
SHOTS="${2:-}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fail=0
err() { echo "✗ $*"; fail=1; }
ok()  { echo "✓ $*"; }

[ -f "$DECK" ] || { echo "file tidak ada: $DECK"; exit 1; }

# 1. Tombol keluar menunjuk ke index.html root (../ sebanyak kedalaman folder)
depth=$(echo "$DECK" | tr -cd '/' | wc -c | tr -d ' ')
expect="$(printf '../%.0s' $(seq 1 "$depth"))index.html"
grep -q "id=\"__exitbtn\" href=\"$expect\"" "$DECK" && ok "exit button → $expect" || err "exit button harus href=\"$expect\""

# 2. Placeholder template tidak tersisa
n=$(sed 's|<pre[^>]*>.*||' "$DECK" | grep -c '{{'); [ "$n" -eq 0 ] && ok "tanpa placeholder {{ }}" || err "$n baris masih berisi placeholder {{ }}"

# 3. Terdaftar di katalog homepage
grep -q "\"path\": \"$DECK\"" index.html && ok "terdaftar di index.html" || err "belum terdaftar di DATA index.html (\"path\": \"$DECK\")"
grep -A2 "\"path\": \"$DECK\"" index.html | grep -q '"ready": true' || err "item di index.html belum \"ready\": true"

# 4. Audit render di Chrome headless (overflow 1280x720, catatan presenter)
if [ -x "$CHROME" ]; then
  dir="$(cd "$(dirname "$DECK")" && pwd)"
  url="file://$dir/$(basename "$DECK")"
  # salinan sementara di folder yang sama + audit.js disuntik sebelum </body>
  tmp="$dir/.audit-tmp-$$.html"; trap 'rm -f "$tmp"' EXIT
  HERE="$(cd "$(dirname "$0")" && pwd)"
  python3 -c 'import sys; d=open(sys.argv[1]).read(); a=open(sys.argv[2]).read(); open(sys.argv[3],"w").write(d.replace("</body>","<script>"+a+"</script></body>",1))' "$DECK" "$HERE/audit.js" "$tmp"
  res=$("$CHROME" --headless=new --disable-gpu --window-size=1280,720 --virtual-time-budget=4000 --dump-dom "file://$tmp" 2>/dev/null \
        | sed -n '/<pre id="audit-result">/,/<\/pre>/p' | sed 's/<[^>]*>//g; s/&gt;/>/g')
  rm -f "$tmp"
  if [ -z "$res" ]; then err "audit tidak jalan (cek error JavaScript)";
  else echo "$res" | grep -q '^AUDIT OK' && ok "audit render: $(echo "$res" | grep SLIDES)" || { err "audit render:"; echo "$res"; }; fi
  if [ "$SHOTS" = "--shots" ]; then
    # Contact sheet: 6 slide per gambar (grid 2x3, tiap slide 640x360). Satu proses Chrome per gambar, dibatasi 40 detik.
    out="${TMPDIR:-/tmp}/deck-shots-$$"; mkdir -p "$out"
    total=$(echo "$res" | sed -n 's/^SLIDES //p'); total=${total:-0}
    sheet="$dir/.sheet-tmp-$$.html"
    page=0
    while [ $((page * 6)) -lt "$total" ]; do
      python3 - "$DECK" "$sheet" "$page" <<'PY'
import sys
d = open(sys.argv[1]).read(); p = int(sys.argv[3])
css = """<style>html,body{overflow:visible!important;height:auto!important;background:#0e1418}
#viewport{position:static!important;display:block!important}
#stage{transform:none!important;width:1280px!important;height:auto!important;display:grid!important;grid-template-columns:640px 640px}
#stage .slide{position:relative!important;inset:auto!important;width:1280px;height:720px;zoom:.5;display:none;animation:none!important;outline:2px solid #f00}
#stage .slide.pg{display:flex!important}
#bar,#hud,#help,#notes,#__exitbtn{display:none!important}</style>"""
js = "<script>addEventListener('load',function(){document.querySelectorAll('.slide').forEach(function(s,k){if(k>=%d&&k<%d)s.classList.add('pg')})})</script>" % (p*6, p*6+6)
open(sys.argv[2], "w").write(d.replace("<body>", css + "<body>", 1).replace("</body>", js + "</body>", 1))
PY
      "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,1080 --virtual-time-budget=3000 \
        --screenshot="$out/sheet-$((page + 1)).png" "file://$sheet" >/dev/null 2>&1 &
      cpid=$!
      ( sleep 40; kill $cpid ) >/dev/null 2>&1 & wpid=$!
      while kill -0 $cpid 2>/dev/null; do [ -s "$out/sheet-$((page + 1)).png" ] && { sleep 1; kill $cpid 2>/dev/null; break; }; sleep 1; done
      { kill $wpid; wait $wpid $cpid; } 2>/dev/null
      page=$((page + 1))
    done
    rm -f "$sheet"
    ok "contact sheet (6 slide/gambar, berurutan kiri→kanan, atas→bawah) di $out"
  fi
else
  echo "! Chrome tidak ditemukan — lewati audit render, cek manual di browser"
fi

[ $fail -eq 0 ] && echo "SEMUA CEK LULUS" || { echo "ADA YANG GAGAL"; exit 1; }
