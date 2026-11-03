# Aplikasi Uji Pelacakan – Paket 0 (Tahap A)

Alat ukur satu layar untuk menguji apakah pelacakan gratis
(`expo-location` + `expo-task-manager`) bertahan seharian di HP tim
(Samsung Galaxy M21 dan Infinix Hot 50). **Bukan** aplikasi sales.
Tidak mengirim data ke server mana pun; semua tersimpan di HP lalu
dibagikan sebagai file CSV.

Acuan: 02-TechLead-Rancangan-Teknis-v3 Bagian 4.

## Untuk DevOps: membuat APK

Kode ini ditulis tanpa memasang pustaka (ruang kerja Mobile Developer
tidak bisa mengakses npm). Versi pustaka **dipasang oleh `npx expo install`**
supaya cocok dengan versi Expo terbaru.

```bash
npx create-expo-app@latest tridhata-uji-pelacakan --template blank-typescript
cd tridhata-uji-pelacakan
# salin isi folder ini (app.json, eas.json, index.ts, tsconfig.json, src/) ke dalamnya,
# timpa file yang sama; di package.json cukup ubah "main" menjadi "index.ts"
npx expo install expo-location expo-task-manager expo-sqlite expo-battery \
  expo-sharing expo-file-system expo-intent-launcher expo-device
npx tsc --noEmit            # harus lulus tanpa galat
npx expo-doctor             # harus lulus
eas build -p android --profile uji   # menghasilkan file .apk
```

Catatan:
- Tidak bisa diuji dengan aplikasi **Expo Go**; pelacakan latar belakang butuh APK sendiri.
- Tidak ada rahasia (kunci server/Drive) di aplikasi ini.
- Bila `tsc` menunjukkan galat karena nama fungsi berubah di versi Expo terbaru,
  kirim pesan galatnya ke chat Mobile Developer.

## Isi file hasil (CSV)

Satu baris = satu titik lokasi atau satu peristiwa.

| Kolom | Arti |
|---|---|
| tipe | `titik` atau `peristiwa` |
| jenis | titik: `rute` / `aktif`. peristiwa: `uji_mulai`, `uji_selesai`, `layar_dibuka`, `kode_dimuat`, `pelacakan_mati_terdeteksi`, `pelacakan_dipulihkan_saat_dibuka`, `catatan_penguji`, `galat_*` |
| waktu_hp, waktu_gps | milidetik sejak 1970 (UTC) |
| akurasi_m | perkiraan kesalahan lokasi (meter) |
| lokasi_palsu | 1 bila Android menandai lokasi palsu (Fake GPS) |
| baterai_persen | sisa baterai saat baris dicatat |
| keterangan | untuk peristiwa |

Analisis: `alat/analisis_hasil.py hasil.csv`.
