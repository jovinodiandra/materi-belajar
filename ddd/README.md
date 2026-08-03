# Domain-Driven Design — materi learning

Materi knowledge sharing DDD. Semua contoh memakai domain netral yang semua orang kenal: **aplikasi ride-hailing** (produk fiktif "RideGo", ala Gojek/Grab).

## Isi

| File | Apa |
|---|---|
| [`index.html`](index.html) | **Presentasi utama** — 15 bab: kenapa DDD → strategic (bahasa, subdomain, bounded context, context map) → tactical (Entity/VO, Aggregate, Domain Event, Repository/Factory/Service) → hexagonal → CQRS & Event Sourcing. Buka di browser; navigasi ←/→. |
| [`contoh-confluence-1-glossary.html`](contoh-confluence-1-glossary.html) | Contoh nyata halaman Confluence: **Glossary / Ubiquitous Language** RideGo — tabel istilah + sinonim terlarang, istilah yang sengaja beda per context, changelog. |
| [`contoh-confluence-2-subdomain-map.html`](contoh-confluence-2-subdomain-map.html) | Contoh nyata halaman Confluence: **Peta Subdomain** — klasifikasi core/supporting/generic + alasan + strategi investasi, keputusan yang diperdebatkan ("kritikal ≠ core"), decision flow. |
| [`contoh-confluence-3-context-map.html`](contoh-confluence-3-context-map.html) | Contoh nyata halaman Confluence: **Context Map** — daftar bounded context, diagram & tabel relasi (upstream/downstream + pola), kontrak event + aturan evolusi skema, bendera merah. |
| [`cqrs/index.html`](cqrs/index.html) | **Deep dive CQRS** — 12 bab: akar CQS→CQRS, 4 level adopsi, 2 contoh end-to-end (riwayat trip & dashboard pendapatan driver: kode + SQL + tabel + diagram), anatomi command/query side, strategi UX eventual consistency, anti-pattern. |
| [`event-sourcing/index.html`](event-sourcing/index.html) | **Deep dive Event Sourcing** — 12 bab: log-bukan-foto, anatomi event store (tabel + optimistic locking), decide→apply→replay, 2 contoh end-to-end (dompet driver & trip lifecycle), projection & rebuild, schema evolution/upcaster, snapshot, anti-pattern. |
| [`clean-architecture/index.html`](clean-architecture/index.html) | **DDD & Clean Architecture — Buku Panduan Lapangan** — bahasan clean architecture (layer, dependency rule) disandingkan dengan DDD tactical patterns. |

## Cara memakai contoh Confluence

Ketiga dokumen `contoh-confluence-*.html` ditulis sebagai **halaman wiki tim RideGo sungguhan** — pelajari bentuk dan isinya, lalu buat versi produk sendiri di Confluence dengan struktur yang sama. Elemen yang layak selalu dipertahankan: pemilik halaman, status lozenge, aturan main, dan changelog — dokumen strategis DDD hanya berguna kalau *hidup* (di-update lewat kesepakatan), bukan ditulis sekali lalu basi.

Urutan yang disarankan saat mulai di produk nyata:
1. **Glossary** dulu (paling murah, dampak paling cepat — menghentikan perang istilah).
2. **Subdomain Map** (sepakati mana yang core → ke mana talenta terbaik).
3. **Context Map** (petakan integrasi & kontrak event yang sudah ada).
