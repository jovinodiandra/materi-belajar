# Fitur Catatan (Notes) — Design Spec

## Latar Belakang

Situs "Materi Belajar" adalah situs statis murni (HTML/CSS/JS, tanpa backend/build step, dihost di GitHub Pages). Pengguna ingin fitur catatan bergaya Mac Notes / Google Keep untuk mencatat pengetahuan baru dan hal-hal penting dari materi yang dipelajari: bisa membuat catatan baru, menghapus catatan, melihat catatan, memberi judul, dan mengedit judul. Fitur harus responsif di semua device.

## Constraint Utama

Karena situs ini statis tanpa server/database, catatan disimpan sepenuhnya di **`localStorage` browser** (per-device, tidak sinkron otomatis antar device — dikonfirmasi oleh pengguna sebagai batasan yang bisa diterima). Tidak ada backend, tidak ada akun/login.

## Lokasi & Akses

- Halaman baru: `catatan/index.html`.
- Mengikuti pola halaman lain di situs ini: topbar dengan tombol kembali/close (`__exitbtn` pattern) yang mengarah ke `index.html` root.
- Ditambahkan satu entry point di `index.html` (root daftar isi) — tombol/link menuju `catatan/index.html`, terpisah dari 13 kategori materi yang sudah ada (bukan bagian dari grid kategori materi).

## Model Data

Disimpan di `localStorage` dengan key `materi-notes`, berupa array JSON. Skema tiap catatan:

```json
{
  "id": "string (uuid atau timestamp-based unique id)",
  "title": "string",
  "description": "string",
  "body": "string (plain text, boleh multi-baris)",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

- `title` dan `description` diisi manual oleh pengguna (bukan auto-generated dari `body`).
- `body` adalah plain text bebas (textarea, tanpa markdown/rich text).

## Tampilan Grid (Halaman Utama Catatan)

- Grid kartu catatan. Tiap kartu menampilkan `title` dan `description`.
- Urutan: catatan dengan `updatedAt` paling baru tampil paling atas.
- Tombol "+ Catatan Baru" di area header grid → membuat entri baru (title kosong/placeholder "Catatan Baru") dan langsung membuka editor full-screen untuk catatan tersebut.
- Tiap kartu memiliki tombol hapus (ikon kecil, misal "✕") yang **tidak** memicu buka editor saat diklik (stop propagation).
  - Klik tombol hapus → tampilkan dialog konfirmasi (native `confirm()` sudah cukup, atau modal kecil bergaya situs) sebelum benar-benar menghapus dari localStorage.
- Klik badan kartu (di luar tombol hapus) → membuka catatan tersebut di tampilan full-screen.
- Empty state: jika array catatan kosong, tampilkan pesan "Belum ada catatan" beserta tombol untuk membuat catatan pertama.

## Tampilan Full-Screen (Editor Catatan)

- Diakses via query param, misal `catatan/index.html?note=<id>`, atau via toggle DOM show/hide di halaman yang sama (SPA sederhana satu file) — pilih pendekatan yang lebih sederhana untuk diimplementasi: **satu file, toggle tampilan via JS** (grid view ↔ editor view), tanpa reload halaman.
- Tombol "← Kembali" di pojok kiri atas → menutup editor, kembali ke grid view (tidak menavigasi keluar dari halaman `catatan/index.html`).
- Field yang tersedia:
  - Judul (`<input>` teks) — bisa diedit kapan saja.
  - Deskripsi (`<input>` teks singkat) — bisa diedit kapan saja.
  - Isi Catatan (`<textarea>` besar, plain text, tinggi fleksibel/auto-grow atau scrollable).
- **Auto-save**: setiap perubahan pada field disimpan otomatis ke `localStorage` dengan debounce (misal 400–600ms setelah berhenti mengetik), memperbarui `updatedAt`. Tidak ada tombol "Simpan" manual.
- Tombol hapus catatan juga tersedia di editor (ikon/tombol di topbar editor), dengan dialog konfirmasi yang sama seperti di grid. Setelah dihapus, otomatis kembali ke grid view.

## Gaya Visual & Responsif

- Mengikuti design system yang sudah ada di situs: variabel CSS (`--bg`, `--bg-2`, `--card`, `--line`, `--ink`, `--ink-soft`, `--muted`, `--accent`, dll) dan dukungan dark/light mode via atribut `data-theme` pada `<html>`, disinkronkan dengan key `localStorage` yang sama (`materi-theme`) yang sudah dipakai halaman lain.
- Grid kartu responsif: multi-kolom (misal `auto-fill, minmax(240px, 1fr)`) di layar besar, menyusut ke 1 kolom di layar HP.
- Tampilan full-screen editor mengisi seluruh viewport di semua ukuran layar; di HP otomatis menjadi single-column stack (judul → deskripsi → isi).
- Topbar/tombol kembali & tombol tema mengikuti pola markup dan CSS yang sudah dipakai halaman materi lain di situs ini (reuse, bukan reinvent).

## Yang Sengaja Tidak Dibuat (Scope Exclusions)

- Tidak ada kotak pencarian/filter catatan.
- Tidak ada kategori/tag/pengelompokan catatan.
- Tidak ada sinkronisasi antar device / backend / akun.
- Tidak ada rich text atau markdown rendering — isi catatan plain text saja.
- Tidak ada versioning/riwayat perubahan catatan.

## Error Handling & Edge Cases

- Jika `localStorage` tidak tersedia/diblokir browser (mode private yang sangat ketat, dsb), tampilkan pesan sederhana bahwa fitur catatan butuh localStorage aktif — tidak perlu fallback storage lain (di luar scope).
- Jika data di `localStorage` korup/tidak bisa di-parse (misal JSON invalid), treat sebagai array kosong (fail-safe), jangan crash halaman.
- ID unik dibuat dengan kombinasi `Date.now()` + random suffix — cukup untuk kebutuhan single-user/single-device ini, tidak perlu library UUID eksternal.

## Testing / Verifikasi Manual

Karena ini fitur client-side murni, verifikasi dilakukan manual di browser:
1. Buka `catatan/index.html` dari entry point di `index.html` root — pastikan link/tombol berfungsi.
2. Buat catatan baru → isi judul, deskripsi, isi catatan → pastikan tersimpan (reload halaman, catatan masih ada).
3. Edit judul catatan yang sudah ada → pastikan perubahan tersimpan otomatis.
4. Hapus catatan → pastikan muncul konfirmasi, dan setelah konfirmasi catatan hilang dari grid dan dari localStorage.
5. Uji responsif: resize browser / buka di emulator mobile — grid menyusut ke 1 kolom, editor full-screen tetap rapi.
6. Uji dark/light mode toggle konsisten dengan halaman lain di situs.
