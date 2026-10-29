import urllib.request
import urllib.parse
import io
import pandas as pd
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter

# ==============================================================================
# KONFIGURASI SPREADSHEET (Bisa diganti di sini jika menggunakan link lain)
# ==============================================================================
SHEET_ID = '17zB_EjnHGmDRFrXixR3lvVVj93ggs7Z95zlgc-aF-nU'
SHEET_NAME = '[SOCIAL MEDIA SCRAPING]'
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(SHEET_NAME)}"

# Load data: try online Google Sheet first, fallback to Book1.xlsx
df = None
try:
    print(f"Mengambil data terbaru langsung dari Google Sheet ({SHEET_NAME})...")
    req = urllib.request.Request(CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw_csv = resp.read()
    df_raw = pd.read_csv(io.BytesIO(raw_csv), low_memory=False)
    scraper_col = [c for c in df_raw.columns if 'scraper' in str(c).lower()][0]
    is_dzaki = df_raw[scraper_col].astype(str).str.strip().str.lower() == 'dzaki'
    has_resto = df_raw['Restaurant Name'].notna() & (df_raw['Restaurant Name'].astype(str).str.strip() != '') & (df_raw['Restaurant Name'].astype(str).str.strip().str.lower() != 'nan')
    has_city = df_raw['City.1'].notna() & (df_raw['City.1'].astype(str).str.strip() != '') & (df_raw['City.1'].astype(str).str.strip().str.lower() != 'nan')
    
    df_filtered = df_raw[is_dzaki & has_resto & has_city].copy()
    
    df = pd.DataFrame()
    df['Source'] = df_filtered['  Source'].fillna('Tiktok').astype(str).str.strip()
    df['Scraper Name'] = df_filtered[scraper_col].astype(str).str.strip()
    df['Restaurant Name'] = df_filtered['Restaurant Name'].astype(str).str.strip()
    df['Priority'] = df_filtered['Priority'].fillna('P2').astype(str).str.strip()
    df['City'] = df_filtered['City.1'].astype(str).str.strip()
    df['Region'] = df_filtered['Region'].fillna('Lainnya').astype(str).str.strip()
    df['Google Rating'] = df_filtered['Google Rating'].fillna('-').astype(str).str.strip()
    
    sanity_col = [c for c in df_filtered.columns if 'sanity check internal' in str(c).lower()]
    if sanity_col:
        df['Sanity Check Internal'] = df_filtered[sanity_col[0]].fillna('Belum Dicek').astype(str).str.strip().replace({'nan': 'Belum Dicek', '': 'Belum Dicek', '-': 'Belum Dicek'})
    else:
        df['Sanity Check Internal'] = 'Belum Dicek'
        
    print(f"Berhasil memuat {len(df)} leads dari Google Sheet!")
except Exception as e:
    print(f"Koneksi online gagal ({e}), memuat dari Book1.xlsx lokal...")
    file_path = 'Book1.xlsx'
    df_raw = pd.read_excel(file_path)
    df = df_raw[df_raw['Scraper Name'].astype(str).str.strip().str.lower() == 'dzaki'].copy()
    if 'Sanity Check Internal' not in df.columns:
        df['Sanity Check Internal'] = 'Belum Dicek'

total_leads = len(df)
virgin_leads = int((df['Sanity Check Internal'].str.lower() == 'virgin').sum())
virgin_reward = virgin_leads * 5000

# Aggregate city data
summary = df.groupby(['City', 'Region']).agg(
    Total_Leads=('Restaurant Name', 'count'),
    Virgin=('Sanity Check Internal', lambda x: (x.str.lower() == 'virgin').sum()),
    Tiktok=('Source', lambda x: (x.str.lower() == 'tiktok').sum()),
    Instagram=('Source', lambda x: (x.str.lower() == 'instagram').sum()),
    Website=('Source', lambda x: (x.str.lower() == 'website').sum()),
    P0=('Priority', lambda x: (x.str.upper() == 'P0').sum()),
    P1=('Priority', lambda x: (x.str.upper() == 'P1').sum()),
    P2=('Priority', lambda x: (x.str.upper() == 'P2').sum())
).reset_index().sort_values(by='Total_Leads', ascending=False)

# Add Rank and Percentage
summary.insert(0, 'Peringkat', range(1, len(summary) + 1))
summary['Persentase'] = summary['Total_Leads'] / total_leads

# Create Workbook
wb = openpyxl.Workbook()

# Sheet 1: Rekap & Chart
ws_summary = wb.active
ws_summary.title = "Rekap Leads"
ws_summary.views.sheetView[0].showGridLines = True

# Colors
navy_header = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
sub_header = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
kpi_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")
green_fill = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")

thin_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)
double_bottom_border = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='94A3B8'),
    bottom=Side(style='double', color='0F172A')
)

# 1. Title Block
ws_summary.merge_cells("A1:L1")
ws_summary["A1"] = "RINGKASAN & REKAPITULASI DATA LEADS"
ws_summary["A1"].font = Font(name="Segoe UI", size=16, bold=True, color="1E3A8A")
ws_summary["A1"].alignment = Alignment(vertical="center")

ws_summary.merge_cells("A2:L2")
ws_summary["A2"] = f"Total Data: {total_leads} Leads | Wilayah: {len(summary)} Kota | Leads Virgin: {virgin_leads} (Rp {virgin_reward:,}) | Sumber: Google Sheets Live"
ws_summary["A2"].font = Font(name="Segoe UI", size=10, italic=True, color="64748B")
ws_summary["A2"].alignment = Alignment(vertical="center")

# 2. KPI Cards Block (Rows 4-5)
kpis = [
    ("B4", "C4", "B5", "C5", "TOTAL LEADS", total_leads, "1E3A8A", kpi_fill),
    ("E4", "F4", "E5", "F5", "LEADS VIRGIN (GOFOOD)", f"{virgin_leads} Leads (Rp {virgin_reward:,})", "059669", green_fill),
    ("H4", "I4", "H5", "I5", "KOTA TERBANYAK", f"{summary.iloc[0]['City']} ({summary.iloc[0]['Total_Leads']})", "7C3AED", kpi_fill),
    ("K4", "L4", "K5", "L5", "PLATFORM UTAMA", f"TikTok ({df['Source'].str.capitalize().value_counts().get('Tiktok', 0)})", "EA580C", kpi_fill),
]

for top_l, top_r, bot_l, bot_r, title, val, col, fill in kpis:
    ws_summary.merge_cells(f"{top_l}:{top_r}")
    ws_summary.merge_cells(f"{bot_l}:{bot_r}")
    ws_summary[top_l] = title
    ws_summary[top_l].font = Font(name="Segoe UI", size=9, bold=True, color="64748B")
    ws_summary[top_l].alignment = Alignment(horizontal="center", vertical="center")
    ws_summary[top_l].fill = fill
    
    ws_summary[bot_l] = val
    ws_summary[bot_l].font = Font(name="Segoe UI", size=11 if len(str(val)) > 15 else 13, bold=True, color=col)
    ws_summary[bot_l].alignment = Alignment(horizontal="center", vertical="center")
    ws_summary[bot_l].fill = fill

ws_summary.row_dimensions[4].height = 20
ws_summary.row_dimensions[5].height = 28

# 3. Table Header (Row 7)
headers = [
    "No", "Kota", "Region", "Jumlah Leads", "Kontribusi (%)", "Virgin (GoFood)",
    "TikTok", "Instagram", "Website", "Prioritas P0", "Prioritas P1", "Prioritas P2"
]
start_row = 7
ws_summary.row_dimensions[start_row].height = 26

for col_idx, header in enumerate(headers, start=1):
    cell = ws_summary.cell(row=start_row, column=col_idx, value=header)
    cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    cell.fill = navy_header
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thin_border

# 4. Table Data Rows
current_row = start_row + 1
for _, row_data in summary.iterrows():
    ws_summary.row_dimensions[current_row].height = 20
    is_zebra = (current_row % 2 == 1)
    row_fill = zebra_fill if is_zebra else None

    vals = [
        row_data['Peringkat'],
        row_data['City'],
        row_data['Region'],
        row_data['Total_Leads'],
        row_data['Persentase'],
        row_data['Virgin'],
        row_data['Tiktok'],
        row_data['Instagram'],
        row_data['Website'],
        row_data['P0'],
        row_data['P1'],
        row_data['P2']
    ]

    for col_idx, val in enumerate(vals, start=1):
        cell = ws_summary.cell(row=current_row, column=col_idx, value=val)
        cell.font = Font(name="Segoe UI", size=10)
        cell.border = thin_border
        if row_fill:
            cell.fill = row_fill

        if col_idx in [1, 3]:  # No, Region
            cell.alignment = Alignment(horizontal="center", vertical="center")
        elif col_idx == 2:  # City
            cell.alignment = Alignment(horizontal="left", vertical="center")
            cell.font = Font(name="Segoe UI", size=10, bold=True)
        elif col_idx == 4:  # Leads
            cell.alignment = Alignment(horizontal="right", vertical="center")
            cell.number_format = '#,##0'
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="1E3A8A")
        elif col_idx == 5:  # Persentase
            cell.alignment = Alignment(horizontal="right", vertical="center")
            cell.number_format = '0.0%'
        elif col_idx == 6:  # Virgin
            cell.alignment = Alignment(horizontal="right", vertical="center")
            cell.number_format = '#,##0'
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="059669")
        else:
            cell.alignment = Alignment(horizontal="right", vertical="center")
            cell.number_format = '#,##0'

    current_row += 1

# 5. Total Row
tot_row = current_row
ws_summary.row_dimensions[tot_row].height = 24
ws_summary.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=3)
tot_label = ws_summary.cell(row=tot_row, column=1, value="TOTAL KESELURUHAN")
tot_label.font = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
tot_label.alignment = Alignment(horizontal="center", vertical="center")

for c in range(1, 4):
    ws_summary.cell(row=tot_row, column=c).fill = total_fill
    ws_summary.cell(row=tot_row, column=c).border = double_bottom_border

# Formulas for total
total_cols = [
    (4, f"=SUM(D8:D{tot_row-1})", '#,##0'),
    (5, f"=SUM(E8:E{tot_row-1})", '0.0%'),
    (6, f"=SUM(F8:F{tot_row-1})", '#,##0'),
    (7, f"=SUM(G8:G{tot_row-1})", '#,##0'),
    (8, f"=SUM(H8:H{tot_row-1})", '#,##0'),
    (9, f"=SUM(I8:I{tot_row-1})", '#,##0'),
    (10, f"=SUM(J8:J{tot_row-1})", '#,##0'),
    (11, f"=SUM(K8:K{tot_row-1})", '#,##0'),
    (12, f"=SUM(L8:L{tot_row-1})", '#,##0'),
]

for col_idx, formula, num_fmt in total_cols:
    cell = ws_summary.cell(row=tot_row, column=col_idx, value=formula)
    cell.font = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    cell.alignment = Alignment(horizontal="right", vertical="center")
    cell.fill = total_fill
    cell.border = double_bottom_border
    cell.number_format = num_fmt

# Auto adjust column widths
for col in ws_summary.columns:
    max_len = 0
    col_letter = get_column_letter(col[0].column)
    for cell in col:
        if cell.row < 7 and cell.coordinate not in ['B4', 'E4', 'H4', 'K4']:
            continue
        val_str = str(cell.value or '')
        if len(val_str) > max_len:
            max_len = len(val_str)
    ws_summary.column_dimensions[col_letter].width = max(max_len + 4, 11)

ws_summary.column_dimensions['A'].width = 7
ws_summary.column_dimensions['B'].width = 18
ws_summary.column_dimensions['C'].width = 16
ws_summary.column_dimensions['D'].width = 16
ws_summary.column_dimensions['E'].width = 16
ws_summary.column_dimensions['F'].width = 16

# 6. Add Embedded Excel Bar Chart
chart = BarChart()
chart.type = "bar"
chart.style = 10
chart.title = "Jumlah Leads per Kota"
chart.y_axis.title = "Kota"
chart.x_axis.title = "Jumlah Leads"
chart.width = 18
chart.height = 12
chart.legend = None

data = Reference(ws_summary, min_col=4, min_row=start_row, max_row=tot_row-1)
cats = Reference(ws_summary, min_col=2, min_row=start_row+1, max_row=tot_row-1)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
ws_summary.add_chart(chart, f"B{tot_row + 2}")

# Sheet 2: Raw Data
ws_raw = wb.create_sheet(title="Data Leads Asli")
ws_raw.views.sheetView[0].showGridLines = True

# Copy raw data
for r_idx, row in enumerate(df.itertuples(index=False), start=2):
    for c_idx, val in enumerate(row, start=1):
        ws_raw.cell(row=r_idx, column=c_idx, value=val)

# write header for raw sheet
for c_idx, col_name in enumerate(df.columns, start=1):
    c = ws_raw.cell(row=1, column=c_idx, value=str(col_name))
    c.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    c.fill = navy_header
    c.alignment = Alignment(horizontal="center", vertical="center")

# Save workbook
output_excel = "Rekap_Leads_Summary.xlsx"
wb.save(output_excel)
print(f"Excel workbook created: {output_excel}")
