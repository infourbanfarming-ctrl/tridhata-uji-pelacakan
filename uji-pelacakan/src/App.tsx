// Layar tunggal aplikasi uji: tombol besar, angka berjalan, catat kejadian, bagikan hasil.
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { File, Paths } from 'expo-file-system';
import { bacaStatus, bateraiPersen, buatCsv, catatPeristiwa, ringkasan, tulisStatus, type Ringkasan } from './db';
import { hentikanPelacakan, mulaiPelacakan, pelacakanBerjalan } from './tugas';
import { WARNA_UTAMA } from './pengaturan';
import { teks } from './teks';

const KUNCI_MULAI = 'uji_mulai_pada';

function jam(ms: number | null): string {
  if (!ms) return '–';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

function lama(ms: number): string {
  const menit = Math.floor(ms / 60000);
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`;
}

function infoPerangkat(): string {
  return [
    `merek=${Device.manufacturer ?? '?'}`,
    `model=${Device.modelName ?? '?'}`,
    `android=${Device.osVersion ?? '?'}`,
    'aplikasi=uji-pelacakan 0.0.1',
  ].join('; ');
}

async function mintaIzin(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    // Android 13+: tanpa izin ini notifikasi "Pelacakan kerja aktif" tidak terlihat.
    await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
  }
  const depan = await Location.requestForegroundPermissionsAsync();
  if (depan.status !== 'granted') return false;
  const belakang = await Location.requestBackgroundPermissionsAsync();
  return belakang.status === 'granted';
}

export default function App() {
  const [mulaiPada, setMulaiPada] = useState<number | null>(null);
  const [jalan, setJalan] = useState({ rute: false, aktif: false });
  const [data, setData] = useState<Ringkasan>({ jumlahRute: 0, jumlahAktif: 0, aktifTerakhir: null });
  const [baterai, setBaterai] = useState<number | null>(null);
  const [sekarang, setSekarang] = useState(Date.now());
  const [pesan, setPesan] = useState('');

  const segarkan = useCallback(async () => {
    const m = await bacaStatus(KUNCI_MULAI);
    const mNum = m ? Number(m) : null;
    setMulaiPada(mNum);
    setJalan(await pelacakanBerjalan());
    setData(await ringkasan(mNum ?? 0));
    setBaterai(await bateraiPersen());
    setSekarang(Date.now());
  }, []);

  // Saat layar dibuka: bila uji seharusnya berjalan tetapi pelacakan mati
  // (misal setelah HP restart), catat dulu, lalu hidupkan lagi.
  useEffect(() => {
    (async () => {
      await catatPeristiwa('layar_dibuka', infoPerangkat());
      const m = await bacaStatus(KUNCI_MULAI);
      if (m) {
        const j = await pelacakanBerjalan();
        if (!j.rute || !j.aktif) {
          await catatPeristiwa('pelacakan_mati_terdeteksi', `rute=${j.rute}; aktif=${j.aktif}`);
          try {
            await mulaiPelacakan();
            await catatPeristiwa('pelacakan_dipulihkan_saat_dibuka');
          } catch (e) {
            await catatPeristiwa('gagal_memulihkan', String(e));
          }
        }
      }
      await segarkan();
    })();
    const t = setInterval(segarkan, 5000);
    return () => clearInterval(t);
  }, [segarkan]);

  const tekanMulai = async () => {
    const boleh = await mintaIzin();
    if (!boleh) {
      Alert.alert(teks.pengaturanIzin, teks.izinDitolak);
      await catatPeristiwa('izin_ditolak');
      return;
    }
    const waktu = Date.now();
    await tulisStatus(KUNCI_MULAI, String(waktu));
    await catatPeristiwa('uji_mulai', infoPerangkat());
    await mulaiPelacakan();
    await segarkan();
  };

  const tekanSelesai = () => {
    Alert.alert(teks.selesaiUji, teks.konfirmasiSelesai, [
      { text: teks.batal, style: 'cancel' },
      {
        text: teks.ya,
        onPress: async () => {
          await hentikanPelacakan();
          await catatPeristiwa('uji_selesai');
          await tulisStatus(KUNCI_MULAI, null);
          await segarkan();
        },
      },
    ]);
  };

  const tekanKejadian = async (jenis: string, label: string) => {
    await catatPeristiwa('catatan_penguji', jenis);
    setPesan(`${teks.tersimpan}: ${label} (${jam(Date.now())})`);
  };

  const tekanBagikan = async () => {
    const csv = await buatCsv(infoPerangkat());
    if (csv.split('\n').length <= 2) {
      Alert.alert(teks.bagikanHasil, teks.tidakAdaData);
      return;
    }
    const tgl = new Date().toISOString().slice(0, 10);
    const model = (Device.modelName ?? 'hp').replace(/[^A-Za-z0-9]+/g, '-');
    const file = new File(Paths.cache, `hasil-uji-${model}-${tgl}.csv`);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: teks.bagikanHasil });
  };

  const ujiBerjalan = mulaiPada !== null;
  const lacakAktif = jalan.rute && jalan.aktif;

  return (
    <SafeAreaView style={gaya.layar}>
      {/* Android 15+ / RN baru: status bar transparan (edge-to-edge), warna latar tidak bisa diatur.
          Ikon dibuat gelap karena latar layar putih. */}
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={gaya.isi}>
        <Text style={gaya.judul}>{teks.judul}</Text>
        <Text style={gaya.subjudul}>{teks.subjudul}</Text>

        <View
          style={[
            gaya.status,
            { backgroundColor: lacakAktif ? '#E3F3E8' : ujiBerjalan ? '#FDECEA' : '#EEEEEE' },
          ]}
        >
          <Text style={[gaya.statusTeks, { color: lacakAktif ? WARNA_UTAMA : ujiBerjalan ? '#B3261E' : '#555' }]}>
            {lacakAktif ? teks.pelacakanAktif : ujiBerjalan ? teks.harusAktifTapiMati : teks.pelacakanMati}
          </Text>
        </View>

        <View style={gaya.kotakAngka}>
          <Angka label={teks.titikRute} nilai={String(data.jumlahRute)} />
          <Angka label={teks.tandaAktif} nilai={String(data.jumlahAktif)} />
          <Angka label={teks.tandaAktifTerakhir} nilai={jam(data.aktifTerakhir)} />
          <Angka label={teks.baterai} nilai={baterai === null ? '–' : `${baterai}%`} />
          <Angka label={teks.lamaUji} nilai={ujiBerjalan ? lama(sekarang - (mulaiPada ?? sekarang)) : '–'} />
        </View>

        {!ujiBerjalan ? (
          <Tombol label={teks.mulaiUji} onPress={tekanMulai} warna={WARNA_UTAMA} />
        ) : (
          <Tombol label={teks.selesaiUji} onPress={tekanSelesai} warna="#B3261E" />
        )}

        {ujiBerjalan && (
          <>
            <Text style={gaya.bagian}>{teks.catatKejadian}</Text>
            {(Object.entries(teks.kejadian) as [string, string][]).map(([jenis, label]) => (
              <Tombol key={jenis} label={label} onPress={() => tekanKejadian(jenis, label)} warna="#4A6B57" kecil />
            ))}
            {pesan !== '' && <Text style={gaya.pesan}>{pesan}</Text>}
          </>
        )}

        <Tombol label={teks.bagikanHasil} onPress={tekanBagikan} warna="#1F5F99" />

        <Text style={gaya.bagian}>{teks.pengaturanIzin}</Text>
        <Tombol label={teks.bukaIzinAplikasi} onPress={() => Linking.openSettings()} warna="#666" kecil />
        <Tombol
          label={teks.bukaBaterai}
          onPress={() =>
            IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
          }
          warna="#666"
          kecil
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Angka({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={gaya.baris}>
      <Text style={gaya.label}>{label}</Text>
      <Text style={gaya.nilai}>{nilai}</Text>
    </View>
  );
}

function Tombol({
  label,
  onPress,
  warna,
  kecil = false,
}: {
  label: string;
  onPress: () => void;
  warna: string;
  kecil?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        gaya.tombol,
        { backgroundColor: warna, opacity: pressed ? 0.7 : 1, paddingVertical: kecil ? 14 : 22 },
      ]}
    >
      <Text style={[gaya.tombolTeks, { fontSize: kecil ? 16 : 22 }]}>{label}</Text>
    </Pressable>
  );
}

const gaya = StyleSheet.create({
  // Jarak atas setinggi status bar, supaya judul tidak tertutup jam/baterai HP.
  layar: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: StatusBar.currentHeight ?? 0 },
  isi: { padding: 16, paddingBottom: 48 },
  judul: { fontSize: 24, fontWeight: '700', color: WARNA_UTAMA },
  subjudul: { fontSize: 14, color: '#666', marginBottom: 16 },
  status: { borderRadius: 12, padding: 16, marginBottom: 12 },
  statusTeks: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  kotakAngka: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 12, marginBottom: 16 },
  baris: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 17, color: '#333' },
  nilai: { fontSize: 17, fontWeight: '700', color: '#111' },
  tombol: { borderRadius: 12, alignItems: 'center', marginBottom: 10, minHeight: 56, justifyContent: 'center' },
  tombolTeks: { color: '#FFFFFF', fontWeight: '700' },
  bagian: { fontSize: 15, fontWeight: '700', color: '#444', marginTop: 16, marginBottom: 8 },
  pesan: { fontSize: 15, color: WARNA_UTAMA, marginBottom: 8 },
});
