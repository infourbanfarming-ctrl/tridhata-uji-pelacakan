#!/usr/bin/env python3
"""Analisis file hasil uji pelacakan Paket 0.

Pemakaian:  python3 analisis_hasil.py hasil-uji-Galaxy-M21-2026-11-10.csv

Angka acuan diambil dari dokumen yang sudah disetujui:
- batas_akurasi_gps_m = 100   (02-DB-Skema-SQL-v5, tabel pengaturan)
- tanda aktif tiap 15 menit; "pelacakan terputus" bila > 30 menit (Architect v3 Bagian 5)
Hanya memakai pustaka bawaan Python.
"""
import csv
import math
import sys
from datetime import datetime, timedelta, timezone

WIB = timezone(timedelta(hours=7))
BATAS_AKURASI_M = 100
INTERVAL_AKTIF_MIN = 15
BATAS_TERPUTUS_MIN = 30
CELAH_GERAK_MIN = 10       # celah rute dihitung bila > 10 menit ...
CELAH_GERAK_JARAK_M = 500  # ... dan HP berpindah > 500 m tanpa titik di antaranya
BATAS_PULIH_MENIT = 5


def jam(ms):
    return datetime.fromtimestamp(ms / 1000, WIB).strftime('%d/%m %H.%M')


def jarak_m(a, b):
    r = 6371000
    p1, p2 = math.radians(a['lat']), math.radians(b['lat'])
    dp, dl = p2 - p1, math.radians(b['lon'] - a['lon'])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def baca(path):
    info, baris = '', []
    with open(path, newline='', encoding='utf-8') as f:
        teks = f.read().splitlines()
    if teks and teks[0].startswith('#'):
        info = teks[0][1:].strip()
        teks = teks[1:]
    for r in csv.DictReader(teks):
        r['waktu_hp'] = int(r['waktu_hp'])
        for k in ('lat', 'lon', 'akurasi_m', 'baterai_persen'):
            r[k] = float(r[k]) if r.get(k) not in (None, '') else None
        baris.append(r)
    baris.sort(key=lambda r: r['waktu_hp'])
    return info, baris


def analisis(path):
    info, semua = baca(path)
    ev = [r for r in semua if r['tipe'] == 'peristiwa']
    mulai_ev = [r for r in ev if r['jenis'] == 'uji_mulai']
    if not mulai_ev:
        return {'kesalahan': 'Tidak ada peristiwa uji_mulai di file.'}
    t0 = mulai_ev[0]['waktu_hp']
    selesai_ev = [r for r in ev if r['jenis'] == 'uji_selesai' and r['waktu_hp'] > t0]
    t1 = selesai_ev[0]['waktu_hp'] if selesai_ev else semua[-1]['waktu_hp']
    dalam = [r for r in semua if t0 <= r['waktu_hp'] <= t1]
    durasi_min = (t1 - t0) / 60000

    rute_semua = [r for r in dalam if r['tipe'] == 'titik' and r['jenis'] == 'rute']
    rute = [r for r in rute_semua if r['akurasi_m'] is None or r['akurasi_m'] <= BATAS_AKURASI_M]
    aktif = [r for r in dalam if r['tipe'] == 'titik' and r['jenis'] == 'aktif']
    palsu = sum(1 for r in dalam if r['tipe'] == 'titik' and r.get('lokasi_palsu') == '1')

    # Uji 1: celah rute saat bergerak
    celah_rute = []
    for a, b in zip(rute, rute[1:]):
        menit = (b['waktu_hp'] - a['waktu_hp']) / 60000
        jauh = jarak_m(a, b)
        if menit > CELAH_GERAK_MIN and jauh > CELAH_GERAK_JARAK_M:
            celah_rute.append((a['waktu_hp'], b['waktu_hp'], round(menit), round(jauh)))
    jarak_total_km = sum(jarak_m(a, b) for a, b in zip(rute, rute[1:])) / 1000

    # Uji 2: tanda aktif
    harapan = int(durasi_min // INTERVAL_AKTIF_MIN)
    titik_waktu = [t0] + [r['waktu_hp'] for r in aktif] + [t1]
    jeda = [(a, b, (b - a) / 60000) for a, b in zip(titik_waktu, titik_waktu[1:])]
    terputus = [(a, b, round(m)) for a, b, m in jeda if m > BATAS_TERPUTUS_MIN]
    jeda_terpanjang = max((m for _, _, m in jeda), default=0)
    persen_aktif = (100 * len(aktif) / harapan) if harapan else 0

    # Uji 3: restart HP
    restart = []
    for r in ev:
        if r['jenis'] == 'catatan_penguji' and r['keterangan'] == 'restart' and t0 <= r['waktu_hp'] <= t1:
            sesudah = [x for x in dalam if x['waktu_hp'] > r['waktu_hp'] + 30_000 and x['tipe'] == 'titik']
            pulih_sendiri = None
            pulih_dibuka = None
            for x in dalam:
                if x['waktu_hp'] <= r['waktu_hp']:
                    continue
                if x['tipe'] == 'peristiwa' and x['jenis'] == 'pelacakan_dipulihkan_saat_dibuka':
                    pulih_dibuka = x['waktu_hp']
                    break
            pertama = sesudah[0]['waktu_hp'] if sesudah else None
            if pertama and (pulih_dibuka is None or pertama < pulih_dibuka):
                pulih_sendiri = pertama
            restart.append({
                'catat': r['waktu_hp'],
                'pulih_sendiri': pulih_sendiri,
                'pulih_saat_dibuka': pulih_dibuka,
            })

    # Uji 1b: swipe tutup
    swipe = []
    for r in ev:
        if r['jenis'] == 'catatan_penguji' and r['keterangan'] == 'swipe' and t0 <= r['waktu_hp'] <= t1:
            sesudah = [x for x in dalam if x['tipe'] == 'titik' and x['waktu_hp'] > r['waktu_hp']]
            swipe.append({'catat': r['waktu_hp'], 'titik_berikut': sesudah[0]['waktu_hp'] if sesudah else None})

    # Uji 5: baterai
    bat = [r for r in dalam if r['baterai_persen'] is not None]
    bat_awal = bat[0]['baterai_persen'] if bat else None
    bat_akhir = bat[-1]['baterai_persen'] if bat else None
    # Dianggap dicas bila baterai naik >= 5 poin dari titik terendah sebelumnya
    # (naik 1-2 poin bisa terjadi karena pembacaan baterai yang berayun).
    naik, terendah = False, None
    for r in bat:
        v = r['baterai_persen']
        if terendah is not None and v >= terendah + 5:
            naik = True
        terendah = v if terendah is None else min(terendah, v)

    galat = [r for r in ev if r['jenis'].startswith('galat') or r['jenis'] == 'gagal_memulihkan']
    mati = [r for r in ev if r['jenis'] == 'pelacakan_mati_terdeteksi' and t0 <= r['waktu_hp'] <= t1]

    return {
        'info': info, 't0': t0, 't1': t1, 'durasi_min': durasi_min,
        'rute_semua': len(rute_semua), 'rute': len(rute), 'jarak_km': jarak_total_km,
        'celah_rute': celah_rute, 'aktif': len(aktif), 'harapan_aktif': harapan,
        'persen_aktif': persen_aktif, 'jeda_terpanjang': jeda_terpanjang, 'terputus': terputus,
        'restart': restart, 'swipe': swipe, 'bat_awal': bat_awal, 'bat_akhir': bat_akhir,
        'bat_dicas': naik, 'palsu': palsu, 'galat': galat, 'mati': mati,
    }


def cetak(h):
    if 'kesalahan' in h:
        print('GALAT:', h['kesalahan'])
        return
    lulus = lambda x: 'LULUS' if x else 'TIDAK LULUS'
    print(f"Perangkat : {h['info']}")
    print(f"Uji       : {jam(h['t0'])} s.d. {jam(h['t1'])}  ({h['durasi_min'] / 60:.1f} jam)")
    print()
    print('UJI 1 – Rute saat layar mati / aplikasi di-swipe')
    print(f"  Titik rute: {h['rute']} dipakai dari {h['rute_semua']} (akurasi <= {BATAS_AKURASI_M} m)")
    print(f"  Panjang rute tercatat: {h['jarak_km']:.1f} km")
    print(f"  Celah saat bergerak (> {CELAH_GERAK_MIN} menit dan > {CELAH_GERAK_JARAK_M} m): {len(h['celah_rute'])}")
    for a, b, m, j in h['celah_rute']:
        print(f"    - {jam(a)} → {jam(b)}: {m} menit, {j} m tanpa titik")
    for s in h['swipe']:
        nxt = jam(s['titik_berikut']) if s['titik_berikut'] else 'TIDAK ADA'
        print(f"  Swipe tutup {jam(s['catat'])} → titik berikutnya {nxt}")
    print(f"  Hasil: {lulus(not h['celah_rute'] and all(s['titik_berikut'] for s in h['swipe']))}")
    print()
    print('UJI 2 – Tanda aktif tiap 15 menit')
    print(f"  Masuk {h['aktif']} dari harapan {h['harapan_aktif']} ({h['persen_aktif']:.0f}%)")
    print(f"  Jeda terpanjang: {h['jeda_terpanjang']:.0f} menit")
    print(f"  Jeda > {BATAS_TERPUTUS_MIN} menit (akan muncul 'pelacakan terputus'): {len(h['terputus'])}")
    for a, b, m in h['terputus']:
        print(f"    - {jam(a)} → {jam(b)}: {m} menit")
    print(f"  Hasil: {lulus(h['persen_aktif'] >= 90 and not h['terputus'])}")
    print()
    print('UJI 3 – Setelah HP di-restart')
    if not h['restart']:
        print('  Tidak ada catatan restart di file (tombol "Saya akan restart HP" tidak ditekan).')
    for r in h['restart']:
        if r['pulih_sendiri']:
            m = (r['pulih_sendiri'] - r['catat']) / 60000
            print(f"  Restart {jam(r['catat'])}: hidup SENDIRI {jam(r['pulih_sendiri'])} ({m:.0f} menit)")
            r['lulus'] = m <= BATAS_PULIH_MENIT + 2  # +2 menit untuk waktu HP menyala
        elif r['pulih_saat_dibuka']:
            m = (r['pulih_saat_dibuka'] - r['catat']) / 60000
            print(f"  Restart {jam(r['catat'])}: TIDAK hidup sendiri; baru jalan saat aplikasi dibuka {jam(r['pulih_saat_dibuka'])} ({m:.0f} menit)")
            r['lulus'] = False
        else:
            print(f"  Restart {jam(r['catat'])}: pelacakan TIDAK hidup lagi sampai uji selesai")
            r['lulus'] = False
    if h['restart']:
        print(f"  Hasil: {lulus(all(r['lulus'] for r in h['restart']))}")
    print()
    print('UJI 5 – Baterai')
    if h['bat_awal'] is not None:
        turun = h['bat_awal'] - h['bat_akhir']
        per_jam = turun / (h['durasi_min'] / 60) if h['durasi_min'] else 0
        print(f"  {h['bat_awal']:.0f}% → {h['bat_akhir']:.0f}%  (turun {turun:.0f} poin, ±{per_jam:.1f} poin/jam)")
        if h['bat_dicas']:
            print('  CATATAN: HP sempat dicas selama uji; angka baterai tidak bisa dibandingkan langsung.')
    print()
    print(f"Lokasi palsu terdeteksi: {h['palsu']} titik")
    print(f"Pelacakan mati terdeteksi saat layar dibuka: {len(h['mati'])} kali")
    for g in h['galat']:
        print(f"  Galat {jam(g['waktu_hp'])}: {g['jenis']} {g['keterangan']}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for p in sys.argv[1:]:
        print('=' * 70)
        print(p)
        print('=' * 70)
        cetak(analisis(p))
        print()
