// Tugas latar belakang: dijalankan Android walaupun layar mati atau aplikasi ditutup.
// File ini dimuat paling awal (lihat index.ts).
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { catatPeristiwa, simpanTitik, waktuTandaAktifTerakhir } from './db';
import {
  INTERVAL_TANDA_AKTIF_MS,
  JARAK_TITIK_RUTE_M,
  JEDA_MINIMAL_TANDA_AKTIF_MS,
  TUGAS_RUTE,
  TUGAS_TANDA_AKTIF,
  WARNA_UTAMA,
} from './pengaturan';

type DataLokasi = { locations?: Location.LocationObject[] };

// Mencatat setiap kali kode aplikasi dimuat ulang oleh Android.
// "tanpa_layar" = Android menghidupkan tugas sendiri (misal setelah restart / setelah di-swipe).
let sudahDicatat = false;
function catatDimuat(sumber: string) {
  if (sudahDicatat) return;
  sudahDicatat = true;
  const konteks = AppState.currentState === 'active' ? 'dengan_layar' : 'tanpa_layar';
  catatPeristiwa('kode_dimuat', `${sumber}; ${konteks}`).catch(() => {});
}

TaskManager.defineTask<DataLokasi>(TUGAS_RUTE, async ({ data, error }) => {
  catatDimuat('tugas_rute');
  if (error) {
    await catatPeristiwa('galat_tugas_rute', error.message);
    return;
  }
  // Uji ini menyimpan SEMUA titik termasuk yang akurasinya buruk.
  // Penyaringan batas_akurasi_gps_m dilakukan saat analisis, supaya kita tahu berapa yang terbuang.
  await simpanTitik('rute', data?.locations ?? []);
});

TaskManager.defineTask<DataLokasi>(TUGAS_TANDA_AKTIF, async ({ data, error }) => {
  catatDimuat('tugas_tanda_aktif');
  if (error) {
    await catatPeristiwa('galat_tugas_tanda_aktif', error.message);
    return;
  }
  const lokasi = data?.locations ?? [];
  if (lokasi.length === 0) return;
  const terakhir = await waktuTandaAktifTerakhir();
  if (terakhir !== null && Date.now() - terakhir < JEDA_MINIMAL_TANDA_AKTIF_MS) return;
  // Cukup satu titik (yang terbaru) per tanda aktif.
  await simpanTitik('aktif', [lokasi[lokasi.length - 1]]);
});

const notifikasiTetap = {
  notificationTitle: 'Pelacakan kerja aktif',
  notificationBody: 'Aplikasi uji Tridhata sedang mencatat rute',
  notificationColor: WARNA_UTAMA,
  // false = layanan TIDAK ikut mati saat aplikasi di-swipe dari daftar aplikasi terbaru (uji no. 1).
  killServiceOnDestroy: false,
};

export async function mulaiPelacakan(): Promise<void> {
  if (!(await Location.hasStartedLocationUpdatesAsync(TUGAS_RUTE))) {
    await Location.startLocationUpdatesAsync(TUGAS_RUTE, {
      accuracy: Location.Accuracy.High,
      distanceInterval: JARAK_TITIK_RUTE_M,
      timeInterval: 10_000,
      pausesUpdatesAutomatically: false,
      foregroundService: notifikasiTetap,
    });
  }
  if (!(await Location.hasStartedLocationUpdatesAsync(TUGAS_TANDA_AKTIF))) {
    // Akurasi rendah supaya hemat baterai; tidak ikut garis rute.
    await Location.startLocationUpdatesAsync(TUGAS_TANDA_AKTIF, {
      accuracy: Location.Accuracy.Low,
      distanceInterval: 0,
      timeInterval: INTERVAL_TANDA_AKTIF_MS,
      pausesUpdatesAutomatically: false,
      foregroundService: notifikasiTetap,
    });
  }
}

export async function hentikanPelacakan(): Promise<void> {
  for (const nama of [TUGAS_RUTE, TUGAS_TANDA_AKTIF]) {
    if (await Location.hasStartedLocationUpdatesAsync(nama)) {
      await Location.stopLocationUpdatesAsync(nama);
    }
  }
}

export async function pelacakanBerjalan(): Promise<{ rute: boolean; aktif: boolean }> {
  return {
    rute: await Location.hasStartedLocationUpdatesAsync(TUGAS_RUTE),
    aktif: await Location.hasStartedLocationUpdatesAsync(TUGAS_TANDA_AKTIF),
  };
}
