# 📊 Dashboard Rekap Data Leads

Dashboard interaktif dan analitik rekapitulasi data leads merchant terintegrasi langsung dengan Google Sheets (`[SOCIAL MEDIA SCRAPING]`), mencakup visualisasi distribusi per kota, region, platform sumber, serta perhitungan insentif berbasis status **Sanity Check Internal (GoFood)**.

---

## ✨ Fitur Utama

- **Live & Offline Data Synchronization**: Terhubung secara live dengan Google Sheets API (GViz) serta dilengkapi fallback data bundle lokal (`data_payload.js`) untuk performa instan tanpa loading lama.
- **Filter Multi-Scraper**: Filter data secara dinamis per anggota scraper (Dzaki, Uca, Ivena, Raihan, Pipit, dll.) atau lihat ringkasan total tim (*Semua Scraper*).
- **Kalkulasi Insentif Sanity Check Internal**:
  - ⭐ Terverifikasi **Virgin** (Perhitungan otomatis insentif Rp 5.000 / lead)
  - ⏳ **Belum Dicek / Pending** (Menghitung estimasi sisa potensi insentif)
  - ❌ **Non-Virgin / Not Eligible** (Existing merchant, tidak memenuhi kriteria, dll.)
- **Visualisasi Interaktif (Chart.js)**:
  - Distribusi Leads per Kota (Mode bar horizontal & vertikal dengan click-to-filter merchant)
  - Proporsi Distribusi Donut Chart (Filter berdasarkan Platform, Region, Prioritas, Sanity Check, & Scraper)
- **Tabel Data Detail & Pencarian**:
  - Filter interaktif per kota, region, platform, prioritas, dan status sanity check
  - Quick Search pencarian merchant, akun IG/TikTok, alamat, dll.
  - Pagination dinamis
- **Export & Laporan**:
  - Download grafik visual dalam format high-resolution PNG
  - Export data leads terfilter ke file CSV
  - Script Python otomatisasi untuk rekap Excel (`.xlsx`) dan chart headless

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Modern Glassmorphism & Responsive Layout), JavaScript ES6+
- **Charting**: [Chart.js 4.4](https://www.chartjs.org/)
- **Icons**: FontAwesome 6
- **Automation / Data Pipeline (Python)**:
  - `sync_google_sheet.py`: Mengunduh dan memproses spreadsheet ke bundle JSON dan JS
  - `generate_excel.py`: Mengenerate file Excel ringkasan rekapitulasi leads
  - `generate_chart.py`: Menghasilkan chart visual PNG headless via Matplotlib & Seaborn

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Clone repository**:
   ```bash
   git clone https://github.com/dzakisalman/leads-chart.git
   cd leads-chart
   ```

2. **Jalankan local web server**:
   Bisa menggunakan Python built-in server:
   ```bash
   python -m http.server 8080
   ```
   Atau buka file `index.html` langsung di browser favorit Anda.

3. **Buka di Browser**:
   Kunjungi [http://localhost:8080](http://localhost:8080).

---

## 🔄 Sinkronisasi Data Spreadsheet Baru

Jika ingin memperbarui data leads dari Google Sheets secara offline / payload lokal:
```bash
python sync_google_sheet.py
```
Script akan otomatis mengunduh tab terbaru, menormalkan format nama kota & region, menghitung metrik sanity check, dan memperbarui `data_payload.js` serta `leads_data.json`.

---

## 👤 Author & Copyright

**Muhammad Dzaki Salman**  
Project Repository: [dzakisalman/leads-chart](https://github.com/dzakisalman/leads-chart)
