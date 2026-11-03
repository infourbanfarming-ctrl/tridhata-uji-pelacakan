// Angka-angka uji. Disamakan dengan Rancangan Teknis v3 Bagian 4
// (di aplikasi sungguhan dibaca dari tabel `pengaturan`, aturan S7).

export const TUGAS_RUTE = 'uji-tugas-rute';
export const TUGAS_TANDA_AKTIF = 'uji-tugas-tanda-aktif';

export const JARAK_TITIK_RUTE_M = 100; // jarak_titik_rute_m
export const INTERVAL_TANDA_AKTIF_MS = 15 * 60 * 1000; // tanda aktif tiap 15 menit
// Android kadang mengirim lokasi lebih sering dari yang diminta.
// Tanda aktif yang datang kurang dari 14 menit setelah yang terakhir tidak dicatat.
export const JEDA_MINIMAL_TANDA_AKTIF_MS = 14 * 60 * 1000;

export const WARNA_UTAMA = '#1B7A3E'; // hijau logo Tridhata
