# Tridhata – Uji Pelacakan (Paket 0)

Repositori ini berisi aplikasi uji "Tridhata Uji Lacak" (folder `uji-pelacakan/`)
dan resep otomatis untuk membuat APK di server GitHub
(`.github/workflows/buat-apk-uji.yml`).

## Membuat APK (tanpa memasang apa pun di komputer)
1. Buka tab **Actions** di repositori ini.
2. Pilih **Buat APK Uji Lacak** → tombol **Run workflow** → **Run workflow**.
3. Tunggu ±15–25 menit sampai tanda centang hijau.
4. Klik hasil jalannya → gulir ke bawah ke **Artifacts** → unduh `tridhata-uji-lacak-apk`
   (file .zip berisi file .apk).

Bila ada tanda silang merah: buka langkah yang merah, salin pesan galatnya,
kirim ke chat **Mobile Developer** (bila langkah 3 TypeScript) atau **DevOps** (langkah lain).

Catatan: APK ini ditandatangani kunci uji (debug). Cukup untuk uji coba, **bukan** untuk aplikasi sungguhan.
