// "Buku catatan" uji di HP (SQLite). Semua hasil uji disimpan di sini,
// tidak dikirim ke server mana pun.
import * as SQLite from 'expo-sqlite';
import * as Battery from 'expo-battery';
import type { LocationObject } from 'expo-location';

export type JenisTitik = 'rute' | 'aktif';

let bukaDb: Promise<SQLite.SQLiteDatabase> | null = null;

export function db(): Promise<SQLite.SQLiteDatabase> {
  if (!bukaDb) {
    bukaDb = (async () => {
      const d = await SQLite.openDatabaseAsync('uji_pelacakan.db');
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS titik (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          jenis TEXT NOT NULL,
          waktu_hp INTEGER NOT NULL,
          waktu_gps INTEGER NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          akurasi_m REAL,
          kecepatan_ms REAL,
          lokasi_palsu INTEGER NOT NULL DEFAULT 0,
          baterai_persen INTEGER
        );
        CREATE TABLE IF NOT EXISTS peristiwa (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          waktu_hp INTEGER NOT NULL,
          jenis TEXT NOT NULL,
          keterangan TEXT,
          baterai_persen INTEGER
        );
        CREATE TABLE IF NOT EXISTS status (
          kunci TEXT PRIMARY KEY,
          nilai TEXT
        );
      `);
      return d;
    })();
  }
  return bukaDb;
}

export async function bateraiPersen(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : null;
  } catch {
    return null;
  }
}

export async function simpanTitik(jenis: JenisTitik, lokasi: LocationObject[]): Promise<void> {
  if (lokasi.length === 0) return;
  const d = await db();
  const baterai = await bateraiPersen();
  const sekarang = Date.now();
  // Satu langkah (transaksi) supaya tidak ada titik setengah tersimpan.
  await d.withTransactionAsync(async () => {
    for (const l of lokasi) {
      await d.runAsync(
        `INSERT INTO titik (jenis, waktu_hp, waktu_gps, lat, lon, akurasi_m, kecepatan_ms, lokasi_palsu, baterai_persen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        jenis,
        sekarang,
        l.timestamp,
        l.coords.latitude,
        l.coords.longitude,
        l.coords.accuracy ?? null,
        l.coords.speed ?? null,
        l.mocked ? 1 : 0,
        baterai,
      );
    }
  });
}

export async function catatPeristiwa(jenis: string, keterangan = ''): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT INTO peristiwa (waktu_hp, jenis, keterangan, baterai_persen) VALUES (?, ?, ?, ?)',
    Date.now(),
    jenis,
    keterangan,
    await bateraiPersen(),
  );
}

export async function bacaStatus(kunci: string): Promise<string | null> {
  const d = await db();
  const baris = await d.getFirstAsync<{ nilai: string }>('SELECT nilai FROM status WHERE kunci = ?', kunci);
  return baris?.nilai ?? null;
}

export async function tulisStatus(kunci: string, nilai: string | null): Promise<void> {
  const d = await db();
  if (nilai === null) {
    await d.runAsync('DELETE FROM status WHERE kunci = ?', kunci);
  } else {
    await d.runAsync('INSERT OR REPLACE INTO status (kunci, nilai) VALUES (?, ?)', kunci, nilai);
  }
}

export type Ringkasan = {
  jumlahRute: number;
  jumlahAktif: number;
  aktifTerakhir: number | null;
};

export async function ringkasan(sejak: number): Promise<Ringkasan> {
  const d = await db();
  const r = await d.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM titik WHERE jenis = 'rute' AND waktu_hp >= ?",
    sejak,
  );
  const a = await d.getFirstAsync<{ n: number; terakhir: number | null }>(
    "SELECT COUNT(*) AS n, MAX(waktu_hp) AS terakhir FROM titik WHERE jenis = 'aktif' AND waktu_hp >= ?",
    sejak,
  );
  return { jumlahRute: r?.n ?? 0, jumlahAktif: a?.n ?? 0, aktifTerakhir: a?.terakhir ?? null };
}

export async function waktuTandaAktifTerakhir(): Promise<number | null> {
  const d = await db();
  const b = await d.getFirstAsync<{ t: number | null }>("SELECT MAX(waktu_hp) AS t FROM titik WHERE jenis = 'aktif'");
  return b?.t ?? null;
}

// Satu file CSV berisi semua baris (titik + peristiwa), urut waktu.
export async function buatCsv(infoPerangkat: string): Promise<string> {
  const d = await db();
  const titik = await d.getAllAsync<Record<string, number | string | null>>('SELECT * FROM titik ORDER BY waktu_hp');
  const peristiwa = await d.getAllAsync<Record<string, number | string | null>>(
    'SELECT * FROM peristiwa ORDER BY waktu_hp',
  );
  const kolom = [
    'tipe',
    'jenis',
    'waktu_hp',
    'waktu_gps',
    'lat',
    'lon',
    'akurasi_m',
    'kecepatan_ms',
    'lokasi_palsu',
    'baterai_persen',
    'keterangan',
  ];
  const aman = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const baris: string[] = [`# ${infoPerangkat}`, kolom.join(',')];
  const semua = [
    ...titik.map((t) => ({ ...t, tipe: 'titik', keterangan: '' })),
    ...peristiwa.map((p) => ({ ...p, tipe: 'peristiwa' })),
  ].sort((x, y) => Number(x.waktu_hp) - Number(y.waktu_hp));
  for (const r of semua) {
    baris.push(kolom.map((k) => aman((r as Record<string, unknown>)[k])).join(','));
  }
  return baris.join('\n');
}
