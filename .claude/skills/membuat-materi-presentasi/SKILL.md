---
name: membuat-materi-presentasi
description: Use when the user asks to make a presentation, slide deck, knowledge-sharing session, or "materi persentasi/presentasi/slide" in this materi-belajar repo, or to turn an existing materi topic into slides for a team or junior engineers.
---

# Membuat Materi Presentasi

## Overview

Deck di repo ini = **satu file HTML statis** (tanpa build step) dengan panggung 1280×720, navigasi keyboard, dan catatan presenter. Gayanya mengikuti `fundamental-engineering/index.html`. Mulai **selalu** dari `template.html` di folder skill ini — jangan tulis CSS/JS dari nol.

Audiensnya **junior**. Aturan nomor satu: **pakai "bahasa bayi"** — jelaskan seperti ke orang yang baru pertama kali dengar.

## Aturan "Bahasa Bayi" (WAJIB)

| Lakukan | Hindari |
|---|---|
| Kalimat pendek: 1 kalimat = 1 ide, maks ±15 kata | Kalimat panjang berlapis "yang… yang… sehingga…" |
| Analogi sehari-hari dulu, baru istilah teknis ("HashMap itu kayak **lemari loker bernomor**: tahu nomornya, langsung buka") | Langsung definisi formal |
| Istilah teknis dijelaskan saat pertama muncul: **Big O** (= seberapa lambat kode saat datanya makin banyak) | Akronim tanpa penjelasan (ACID, CQRS, O(log n)) |
| Kata akrab: "kita", "kamu", "gampangnya…", "bayangin…" | Bahasa akademik/kaku |
| Satu slide = satu pesan. Maks 3–4 poin | Slide padat seperti dokumen |
| Contoh kode pendek (≤12 baris), beri komentar `// ← ini masalahnya` | Kode panjang tanpa penunjuk |
| Tunjukkan "salah dulu → lalu yang benar" | Langsung solusi tanpa rasa masalahnya |

Tes cepat tiap slide: *"Apakah anak magang hari pertama bisa menceritakan ulang slide ini dalam satu kalimat?"* Kalau tidak → sederhanakan atau pecah jadi dua slide.

Istilah teknis bahasa Inggris boleh tetap dipakai (HashMap, test, deploy) — tapi selalu dengan penjelasan sederhana di dekatnya.

## Alur Kerja

1. **Tanya singkat (kalau belum jelas):** topik, audiens, durasi. Patokan: ±1 slide per 2–3 menit (30 menit ≈ 12–15 slide).
2. **Susun outline** dengan alur cerita ini, tunjukkan ke user dulu:
   1. Judul (`slide dark`) → 2. Kenapa penting (+ kotak Given/When/Then) → 3. Agenda/pilar → 4. Warm-up (pertanyaan/kode pemantik) → 5. Jawaban warm-up → per pilar: pembuka pilar + 1–2 contoh (sebelum vs sesudah) → Penutup (`slide dark`, N hal untuk diingat).
3. **Lokasi file:** `<kategori>/<slug>/index.html` (lihat kategori yang ada di root). Salin `template.html` ke sana.
4. **Isi slide** dengan komponen dari template (lihat tabel di bawah). Ganti semua `{{...}}`. Hapus slide contoh yang tidak dipakai, salin yang perlu diulang. Beri komentar `<!-- ════════ N — NAMA ════════ -->` di tiap slide.
5. **Catatan presenter** di `data-notes` setiap slide: apa yang diucapkan, pertanyaan ke audiens, berapa lama. Juga pakai bahasa bayi.
6. **Tombol keluar** `#__exitbtn`: `href` = `../` × kedalaman folder + `index.html` (contoh `etc/regex/index.html` → `../../index.html`).
7. **Daftarkan di katalog** `index.html` root: objek `DATA.cats[...].items` → item dengan `"path"` yang sama, set `"ready": true`; kalau item baru, tambahkan lalu naikkan `"total"`; sesuaikan `"ready_count"`.
8. **Verifikasi** (wajib, jangan klaim selesai sebelum lulus):
   ```bash
   .claude/skills/membuat-materi-presentasi/verify-deck.sh <kategori>/<slug>/index.html --shots
   ```
   Cek: exit button, placeholder, katalog, overflow 1280×720, catatan presenter. `--shots` menyimpan *contact sheet* (6 slide per gambar, urut kiri→kanan, atas→bawah) — **buka gambarnya** untuk memastikan tidak ada teks terpotong/bertumpuk.

## Komponen (sudah ada di template)

| Kebutuhan | Class / pola |
|---|---|
| Label kecil di atas judul | `.eyebrow` (judul) · `.lens-tag lt-teal/amber/green/ink/red` (pilar) |
| Kolom | `.cols c2` / `.cols c3` / `style="grid-template-columns: 1.5fr 1fr"` |
| Kartu | `.card` + `tint-teal/amber/green/red` |
| Poin bergambar | `.iconrow` > `.dot` (emoji) + `h3` + `p` |
| Daftar | `ul.clean` |
| Kode | `pre.code` / `pre.code.sm`, warna `<span class="kw">`, komentar `<span class="cm">`, judul `.codehead.bad` / `.codehead.good` |
| Alur langkah | `.cycle` > `.step` + `.arrow` |
| Tabel | `table` biasa, `td.mono` untuk kode |
| Kalimat penutup slide | `.foot` (otomatis menempel di bawah) |
| Kotak "Buat apa ini?" | blok Given/When/Then di slide 2 template |

Pintasan di deck: ← → navigasi, `N` catatan presenter, `F` fullscreen, URL `#5` = slide 5.

## Kesalahan Umum

- **Konten overflow** — panggung tetap 720px dan `overflow: hidden`, jadi teks berlebih **hilang diam-diam**. Kotak Given/When/Then makan ±220px: slide yang memuatnya harus isi sedikit. Solusi: pecah slide, bukan kecilkan font di bawah 14px.
- Bahasa terlalu teknis/panjang → kembali ke tabel "Bahasa Bayi".
- Lupa `data-notes` atau lupa update katalog `index.html`.
- Path `#__exitbtn` salah kedalaman.
- Menambah library/CDN atau build step — repo ini murni statis.
