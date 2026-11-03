# 04-Mobile-Paket0-Rencana-Uji-v1
## Rencana Uji, Panduan Penguji, dan Formulir Hasil – Paket 0 (Uji Coba Teknis Pelacakan)

**Disusun oleh:** Mobile Developer
**Tanggal:** 3 November 2026
**Status:** Menunggu persetujuan pemilik proyek. **Belum berisi hasil uji.** Laporan hasil (dokumen terpisah, **04-Mobile-Laporan-Paket0-v1**) ditulis setelah file hasil dari kedua HP diterima.
**Acuan:** 02-TechLead-Rancangan-Teknis-v3 Bagian 4 dan 12.1, 02-TechLead-Tinjauan-Paket-Rilis1-v1 Bagian 3 dan 9, 02-Architect-Rancangan-Sistem-v3 Bagian 5, 02-DB-Skema-SQL-v5 (tabel `pengaturan`)

---

## 1. Ringkasan Satu Halaman

Paket 0 menjawab satu pertanyaan sebelum aplikasi sungguhan dibangun: **apakah HP tim membiarkan pelacakan gratis berjalan seharian?** Jawabannya menentukan Skenario A (gratis cukup) atau Skenario B (pindah ke pustaka berbayar) di jadwal Tech Lead.

| Hal | Keputusan di dokumen ini |
|---|---|
| HP yang diuji | **Samsung Galaxy M21** dan **Infinix Hot 50** (sesuai jawaban pemilik proyek, 3 Nov 2026) |
| Dibagi dua tahap | **Tahap A** (uji 1–5: pelacakan & baterai) bisa jalan sekarang tanpa server. **Tahap B** (uji 6–7: foto & 200 catatan offline) menunggu Supabase Uji + Google Drive dari DevOps |
| Alat uji | Aplikasi satu layar "Tridhata Uji Lacak" (bukan aplikasi sales). Hasil tersimpan di HP, dibagikan sebagai file CSV |
| Lama uji Tahap A | 1 hari kerja penuh, kedua HP dibawa **orang yang sama** di **rute yang sama** supaya adil dibandingkan |
| Yang dibutuhkan | APK dari DevOps; 1 orang lapangan; ±15 menit persiapan izin per HP |

**Catatan Infinix:** dokumen yang disetujui menyebut tim memakai HP Samsung. Infinix (sistem XOS) dikenal lebih agresif mematikan aplikasi di latar belakang daripada Samsung. Mengujinya sekarang lebih murah daripada menemukan masalahnya saat masa percobaan.

---

## 2. Yang Diuji dan Kapan Dianggap Lulus

Angka "lulus" memakai angka yang sudah disetujui bila ada; sisanya usulan Mobile Developer, dinilai bersama QA, diputuskan Tech Lead.

### Tahap A – Pelacakan (tanpa server)

| No | Yang diuji | Kejadian nyata | Lulus bila | Dasar angka |
|---|---|---|---|---|
| 1 | Rute tetap tercatat saat layar mati dan aplikasi di-swipe tutup | HP di saku seharian; sekali aplikasi di-swipe dari daftar aplikasi terbaru | Tidak ada celah **> 10 menit dan > 500 m** saat bergerak; setelah swipe, titik tetap masuk | Usulan |
| 2 | Tanda aktif tiap 15 menit saat diam | Duduk ≥ 1 jam di toko, HP di meja dengan layar mati | Minimal **90%** tanda aktif masuk **dan tidak ada jeda > 30 menit** | 30 menit = batas "pelacakan terputus" di Architect v3 Bagian 5 |
| 3 | Pelacakan hidup lagi setelah HP di-restart | HP dimatikan-dinyalakan di tengah hari | Hidup **sendiri** (tanpa membuka aplikasi) paling lambat **5 menit** setelah HP menyala | Usulan |
| 4 | Tahan fitur hemat baterai HP setelah panduan izin diikuti | Samsung: "Aplikasi tidur". Infinix: Manajemen daya / Mulai otomatis | Uji 1–3 lulus dengan izin sesuai panduan (Bagian 4) | Rancangan Teknis v3 |
| 5 | Baterai | Persen pagi dan sore | Dicatat dan dibandingkan dengan hari biasa tanpa aplikasi. Usulan batas: tambahan **≤ 15–20 poin** per hari kerja | Architect memperkirakan 5–10%; ini batas atas |

Titik dengan akurasi lebih buruk dari **100 m** (`batas_akurasi_gps_m`, Skema SQL v5) tidak dihitung sebagai titik rute, sama seperti aplikasi sungguhan nanti.

### Tahap B – Foto dan sinyal lemah (butuh server)

| No | Yang diuji | Lulus bila | Syarat |
|---|---|---|---|
| 6 | Foto tidak masuk galeri, lalu terhapus dari HP setelah sampai di Drive | Foto ada di Drive, tidak ada di Galeri, dan hilang dari folder aplikasi | Supabase Uji, folder transit Storage, akun Drive "In production" |
| 7 | 200 catatan saat mode pesawat lalu dikirim | Tepat 200 di server, tidak dobel, tidak hilang, walaupun sinyal sengaja diputus saat mengirim | Supabase Uji + tabel uji sederhana |

Tahap B dirancang setelah DevOps memberi kabar server Uji siap. Tahap A **tidak** menunggu Tahap B.

---

## 3. Aplikasi Uji "Tridhata Uji Lacak"

**Isi layar:** status besar (hijau "Pelacakan AKTIF" / merah "uji berjalan tetapi pelacakan mati"), angka titik rute, tanda aktif, jam tanda aktif terakhir, baterai, lama uji; tombol **MULAI UJI**, **SELESAI UJI**, **BAGIKAN HASIL**; tombol "Catat kejadian"; tombol pintas ke pengaturan izin dan baterai.

**Cara kerjanya (sama dengan Rancangan Teknis v3 Bagian 4):**
- Titik rute: tiap berpindah 100 m, akurasi tinggi.
- Tanda aktif: tugas kedua tiap 15 menit, akurasi rendah.
- Layanan latar depan dengan notifikasi tetap "Pelacakan kerja aktif". Bisa muncul **1 atau 2 notifikasi**; itu normal untuk aplikasi uji.
- Layanan **tidak ikut mati** saat aplikasi di-swipe.
- Tanda lokasi palsu (Fake GPS) dicatat.
- Aplikasi uji **tidak** memasang mekanisme "hidup lagi setelah restart" buatan sendiri. Tujuannya mengukur kemampuan asli pustaka gratis. Bila layar dibuka dan pelacakan ternyata mati, aplikasi mencatatnya lalu menghidupkan lagi, sehingga sisa hari tetap terukur.
- Tidak ada data yang dikirim ke server. Tidak ada rahasia di kode.

**Kode:** folder `uji-pelacakan` (diserahkan bersama dokumen ini). Langkah membuat APK ada di README-nya, untuk **DevOps**.

**Keterbatasan yang perlu diketahui:** ruang kerja Mobile Developer tidak bisa mengakses npm, jadi pemeriksaan otomatis TypeScript belum dijalankan. Pemeriksaan itu menjadi langkah wajib DevOps saat membuat APK (`npx tsc --noEmit` dan `npx expo-doctor`). Bila ada galat, pesan galatnya dikirim ke chat Mobile Developer. Alat analisis hasil sudah diuji dengan data contoh dan berjalan benar.

---

## 4. Panduan Penguji

### 4.1 Sehari sebelum uji (±15 menit per HP)

**Kedua HP:**
1. Pasang APK "Tridhata Uji Lacak" (izinkan "pasang dari sumber tidak dikenal" bila diminta).
2. Catat versi Android: Pengaturan → Tentang ponsel → Informasi perangkat lunak.
3. Cas penuh sampai 100% malam harinya.
4. Pastikan **Lokasi** HP menyala dan **Mode hemat daya** HP mati.
5. Bila Anda tahu persen baterai HP itu pada hari biasa (pagi dan sore), catat di Formulir Bagian 5. Ini pembanding baterai.

**Samsung Galaxy M21** (nama menu bisa sedikit berbeda menurut versi One UI):
1. Buka aplikasi uji → tekan **MULAI UJI** sekali untuk memunculkan permintaan izin → izinkan lokasi → pilih **"Izinkan sepanjang waktu"** → izinkan notifikasi. Lalu tekan **SELESAI UJI** (ini hanya persiapan).
2. Tekan **"Buka izin aplikasi"** → **Baterai** → pilih **"Tidak dibatasi"**.
3. Pengaturan → **Baterai dan perawatan perangkat** → **Baterai** → **Batas penggunaan latar belakang**:
   - Matikan **"Aplikasi tidak terpakai ditidurkan"**.
   - Pastikan "Tridhata Uji Lacak" **tidak ada** di daftar **"Aplikasi tidur"** dan **"Aplikasi tidur nyenyak"**.
   - Tambahkan "Tridhata Uji Lacak" ke **"Aplikasi tidak pernah tidur"**.
4. Foto layar setiap langkah di atas (untuk panduan izin sungguhan nanti).

**Infinix Hot 50** (XOS; nama menu bisa sedikit berbeda):
1. Langkah izin lokasi dan notifikasi sama dengan Samsung langkah 1.
2. Tekan **"Buka izin aplikasi"** → **Baterai/Penggunaan daya** → pilih **"Tidak dibatasi"** atau **"Izinkan aktivitas latar belakang"**.
3. Cari pengaturan **"Mulai otomatis"** / **"Auto-start"** (biasanya di Pengaturan → Aplikasi, atau di aplikasi **Phone Master**) → nyalakan untuk "Tridhata Uji Lacak".
4. Di aplikasi **Phone Master** (bila ada), matikan pembersihan otomatis untuk aplikasi ini / masukkan ke daftar pengecualian.
5. Buka daftar aplikasi terbaru, tekan lama kartu "Tridhata Uji Lacak" → pilih **kunci** (ikon gembok) bila tersedia.
6. Foto layar setiap langkah.

Bila ada menu yang tidak ditemukan, tulis di Formulir Bagian 6; panduan akan disesuaikan.

### 4.2 Hari uji (satu hari kerja penuh)

Kedua HP dibawa **satu orang yang sama**, berkunjung seperti biasa.

| Waktu | Yang dilakukan | Tombol "Catat kejadian" |
|---|---|---|
| Berangkat (±07.30) | Buka aplikasi di kedua HP → **MULAI UJI**. Pastikan status hijau. Matikan layar, simpan HP | – |
| Pagi | Berjalan/berkendara seperti biasa. **Jangan** membuka aplikasi uji | – |
| Sekitar 09.00 | Buka daftar aplikasi terbaru → **swipe tutup** aplikasi uji di kedua HP | Tekan **"Saya swipe tutup aplikasi"** sebelum swipe |
| Saat singgah di toko ≥ 1 jam | Taruh kedua HP di meja, layar mati | **"Mulai diam di toko"** saat tiba, **"Selesai diam, jalan lagi"** saat pergi |
| Sekitar 12.00 | **Restart** kedua HP. Setelah menyala, **jangan membuka aplikasi uji selama 10 menit**. Lanjutkan perjalanan. Setelah 10 menit boleh dibuka untuk melihat status | Tekan **"Saya akan restart HP"** sebelum restart |
| Siang–sore | Seperti biasa. Boleh melihat status sesekali | – |
| Pulang (±16.30) | Buka aplikasi → **SELESAI UJI** → **BAGIKAN HASIL** → kirim lewat WhatsApp/email ke diri sendiri | – |

**Penting:**
- **Jangan mengecas** HP selama jam uji (agar angka baterai bisa dinilai). Bila terpaksa mengecas, tulis jamnya di Formulir.
- Bila status menjadi merah ("uji berjalan tetapi pelacakan mati"), catat jamnya di Formulir. Membuka aplikasi akan menghidupkannya lagi.
- Nyalakan Lokasi HP sepanjang hari.

### 4.3 Setelah uji
Kirim ke chat **Mobile Developer**: 2 file CSV (satu per HP), Formulir Bagian 5–6 yang sudah diisi, dan foto layar langkah izin.

---

## 5. Formulir Hasil (diisi penguji)

| Hal | Samsung Galaxy M21 | Infinix Hot 50 |
|---|---|---|
| Versi Android | | |
| Nama penguji / pembawa HP | | |
| Tanggal uji | | |
| Jam MULAI UJI | | |
| Jam SELESAI UJI | | |
| Baterai saat mulai (%) | | |
| Baterai saat selesai (%) | | |
| Baterai hari biasa tanpa aplikasi, pagi → sore (%) | | |
| Dicas selama uji? Jam berapa? | | |
| Notifikasi "Pelacakan kerja aktif" terlihat sepanjang hari? (Ya/Tidak) | | |
| Status pernah merah? Jam berapa? | | |
| Setelah restart: pelacakan hijau saat dibuka 10 menit kemudian? (Ya/Tidak) | | |
| Rute singkat yang dilalui (contoh: Kantor → Toko A Ciawi → Kebun Pak Puji → Kantor) | | |
| Jarak tempuh kira-kira (km) | | |

## 6. Catatan Penguji

| HP | Menu izin yang tidak ditemukan / berbeda nama | Kejadian aneh |
|---|---|---|
| Samsung M21 | | |
| Infinix Hot 50 | | |

---

## 7. Isi Laporan Hasil Nanti (04-Mobile-Laporan-Paket0-v1)

Laporan akan memuat, per HP:
1. Hasil uji 1–5 (lulus / tidak lulus) beserta angka dari alat analisis.
2. Daftar celah rute dan jeda tanda aktif (jam dan lamanya).
3. Hasil restart: hidup sendiri atau baru hidup saat aplikasi dibuka.
4. Pemakaian baterai dibanding hari biasa.
5. **Rekomendasi Skenario A atau B** untuk Tech Lead. Bila B, harga lisensi pustaka berbayar dicek ulang dan diajukan ke pemilik proyek sebelum dibeli (keputusan Rancangan Teknis v3 Bagian 15 no. 3).
6. Langkah izin per merek yang terbukti berhasil (bahan layar panduan izin untuk Designer, Architect v3 Bagian 5).
7. Lama pengerjaan Paket 0 (Bagian 8).

**Kemungkinan hasil uji 3 yang perlu diketahui sejak awal:** pustaka gratis umumnya **tidak** menghidupkan pelacakan sendiri setelah HP restart sampai aplikasi dibuka. Bila itu yang terjadi, Mobile Developer akan mengusulkan dua jalan di laporan: (a) tetap gratis, ditambah pengingat untuk membuka aplikasi setelah HP menyala, atau (b) pustaka berbayar yang punya fitur hidup otomatis setelah restart. Keputusan ada di Tech Lead dan pemilik proyek; dokumen ini tidak memutuskannya.

---

## 8. Catatan Lama Pengerjaan (untuk perkiraan waktu Tech Lead)

| Tanggal | Kegiatan | Siapa | Lama |
|---|---|---|---|
| 3 Nov 2026 | Rencana uji, kode aplikasi uji, alat analisis | Mobile Developer | ±1 sesi chat |
| | APK dibuat + pemeriksaan TypeScript | DevOps | |
| | Persiapan izin kedua HP | Pemilik proyek / penguji | |
| | Hari uji Tahap A | Penguji lapangan | 1 hari kerja |
| | Analisis + Laporan Paket 0 | Mobile Developer | |
| | Tahap B (setelah server Uji siap) | Mobile Developer + penguji | |

---

## 9. Serah Terima ke Peran Lain

| Peran | Yang perlu dikerjakan |
|---|---|
| **Pemilik proyek** | Menyetujui rencana ini; menunjuk penguji lapangan dan tanggal uji; meneruskan folder `uji-pelacakan` ke chat DevOps |
| **DevOps** | Membuat APK dari folder `uji-pelacakan` (langkah di README): `npx expo install …`, `npx tsc --noEmit`, `npx expo-doctor`, lalu `eas build -p android --profile uji`. Memberi kabar ke Mobile Developer kapan Supabase Uji + Drive siap untuk Tahap B |
| **QA** | Ikut menilai angka lulus di Bagian 2 dan hasil Paket 0 (Rancangan Teknis v3 Bagian 16) |
| **Tech Lead** | Menerima Laporan Paket 0 untuk menetapkan Skenario A/B dan perkiraan waktu final |
| **Designer** | Setelah laporan: menerima langkah izin per merek yang terbukti (Samsung dan Infinix) untuk layar panduan izin |
