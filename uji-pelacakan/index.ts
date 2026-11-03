// Titik masuk aplikasi.
// Tugas latar belakang WAJIB didaftarkan sebelum layar dimuat,
// karena Android bisa menjalankan tugas ini tanpa membuka layar (misal setelah HP restart).
import './src/tugas';
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
