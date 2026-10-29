import urllib.request
import urllib.parse
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os
import shutil
import io

SHEET_ID = '17zB_EjnHGmDRFrXixR3lvVVj93ggs7Z95zlgc-aF-nU'
SHEET_NAME = '[SOCIAL MEDIA SCRAPING]'
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(SHEET_NAME)}"

# 1. Load Data: Try online Google Sheet first, fallback to Book1.xlsx
df = None
try:
    print(f"Mengambil data terbaru langsung dari Google Sheet ({SHEET_NAME})...")
    req = urllib.request.Request(CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw_csv = resp.read()
    df_raw = pd.read_csv(io.BytesIO(raw_csv), low_memory=False)
    scraper_col = [c for c in df_raw.columns if 'scraper' in str(c).lower()][0]
    is_dzaki = df_raw[scraper_col].astype(str).str.strip().str.lower() == 'dzaki'
    has_resto = df_raw['Restaurant Name'].notna() & (df_raw['Restaurant Name'].astype(str).str.strip() != '')
    has_city = df_raw['City.1'].notna() & (df_raw['City.1'].astype(str).str.strip() != '')
    
    df_filtered = df_raw[is_dzaki & has_resto & has_city].copy()
    
    df = pd.DataFrame()
    df['City'] = df_filtered['City.1'].astype(str).str.strip()
    df['Source'] = df_filtered['  Source'].fillna('Tiktok').astype(str).str.strip()
    df['Region'] = df_filtered['Region'].fillna('Lainnya').astype(str).str.strip()
    df['Priority'] = df_filtered['Priority'].fillna('P2').astype(str).str.strip()
    print(f"Berhasil memuat {len(df)} leads dari Google Sheet!")
except Exception as e:
    print(f"Koneksi online gagal ({e}), memuat dari Book1.xlsx lokal...")
    df_raw = pd.read_excel('Book1.xlsx')
    df = df_raw[df_raw['Scraper Name'].astype(str).str.strip().str.lower() == 'dzaki'].copy()

total_leads = len(df)

# Group by City
city_counts = df['City'].value_counts().reset_index()
city_counts.columns = ['City', 'Count']
city_counts['Percentage'] = (city_counts['Count'] / total_leads * 100).round(1)

# Group by Source
source_counts = df['Source'].value_counts().reset_index()
source_counts.columns = ['Source', 'Count']
source_counts['Percentage'] = (source_counts['Count'] / total_leads * 100).round(1)

# Group by Region
region_counts = df['Region'].value_counts().reset_index()
region_counts.columns = ['Region', 'Count']
region_counts['Percentage'] = (region_counts['Count'] / total_leads * 100).round(1)

# Priority
priority_counts = df['Priority'].value_counts().to_dict()

# Set style
plt.rcParams['font.sans-serif'] = 'Segoe UI'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['text.color'] = '#0F172A'
plt.rcParams['axes.labelcolor'] = '#334155'
plt.rcParams['xtick.color'] = '#64748B'
plt.rcParams['ytick.color'] = '#1E293B'

# Create Figure
fig = plt.figure(figsize=(15, 10), facecolor='#F8FAFC', dpi=200)

# Grid layout: 2 rows (KPI banner at top, charts below)
gs = fig.add_gridspec(2, 2, height_ratios=[1.1, 4.8], width_ratios=[1.45, 1], hspace=0.25, wspace=0.22,
                       top=0.93, bottom=0.07, left=0.06, right=0.95)

# --- Top Header & KPI Summary ---
ax_kpi = fig.add_subplot(gs[0, :])
ax_kpi.axis('off')

# Title & Subtitle
ax_kpi.text(0.0, 0.88, "Dashboard Rekap Leads (Khusus Dzaki)", fontsize=20, fontweight='bold', color='#0F172A', va='top')
ax_kpi.text(0.0, 0.45, f"Laporan rekapitulasi data leads scraper Dzaki (Total: {total_leads} Leads di {len(city_counts)} Kota)", 
            fontsize=10.5, color='#64748B', va='top')

# KPI Card drawing helper
def draw_kpi_card(ax, x, y, w, h, title, value, subtext, bg_color, border_color, val_color):
    card = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.015,rounding_size=0.03",
                                  facecolor=bg_color, edgecolor=border_color, linewidth=1.2)
    ax.add_patch(card)
    ax.text(x + w * 0.08, y + h * 0.76, title.upper(), fontsize=7.5, fontweight='bold', color='#64748B', va='center')
    ax.text(x + w * 0.08, y + h * 0.44, str(value), fontsize=17, fontweight='heavy', color=val_color, va='center')
    ax.text(x + w * 0.08, y + h * 0.18, subtext, fontsize=8, color='#64748B', va='center')

# Draw 4 KPI cards with perfect spacing
card_w = 0.118
gap = 0.014
start_x = 0.46
draw_kpi_card(ax_kpi, start_x, 0.08, card_w, 0.82, "Total Leads", f"{total_leads}", "Khusus Dzaki", "#FFFFFF", "#E2E8F0", "#2563EB")
draw_kpi_card(ax_kpi, start_x + (card_w + gap), 0.08, card_w, 0.82, "Total Kota", f"{len(city_counts)}", "Jangkauan wilayah", "#FFFFFF", "#E2E8F0", "#0D9488")
top_city = city_counts.iloc[0]
draw_kpi_card(ax_kpi, start_x + (card_w + gap)*2, 0.08, card_w, 0.82, "Top Kota", f"{top_city['City']}", f"{top_city['Count']} leads ({top_city['Percentage']}%)", "#FFFFFF", "#E2E8F0", "#7C3AED")
top_source = source_counts.iloc[0]
draw_kpi_card(ax_kpi, start_x + (card_w + gap)*3, 0.08, card_w, 0.82, "Top Sumber", f"{top_source['Source']}", f"{top_source['Count']} leads ({top_source['Percentage']}%)", "#FFFFFF", "#E2E8F0", "#EA580C")

# --- Chart 1: Bar Chart Leads per Kota (Left Column) ---
ax_bar = fig.add_subplot(gs[1, 0])
ax_bar.set_facecolor('#FFFFFF')
ax_bar.grid(axis='x', linestyle='--', alpha=0.4, color='#E2E8F0', zorder=0)

# Sort ascending for horizontal bar chart (top city at top)
city_sorted = city_counts.sort_values(by='Count', ascending=True)
n_cities = len(city_sorted)
y_pos = np.arange(n_cities)

# Dynamic gradient color palette
cmap = plt.cm.get_cmap('Blues')
colors = [cmap(val) for val in np.linspace(0.4, 0.9, n_cities)]

bars = ax_bar.barh(y_pos, city_sorted['Count'], height=0.6, color=colors, edgecolor='none', zorder=3)

# Labels
ax_bar.set_yticks(y_pos)
ax_bar.set_yticklabels(city_sorted['City'], fontsize=10.5, fontweight='600', color='#1E293B')
ax_bar.set_xlabel('Jumlah Leads', fontsize=10, fontweight='600', color='#475569', labelpad=8)
ax_bar.set_title('Distribusi Leads Dzaki per Kota', fontsize=13, fontweight='bold', color='#0F172A', pad=12, loc='left')

# Add value labels at the end of bars
max_val = city_counts['Count'].max()
ax_bar.set_xlim(0, max_val * 1.22)
for bar, count, pct in zip(bars, city_sorted['Count'], city_sorted['Percentage']):
    w = bar.get_width()
    ax_bar.text(w + (max_val * 0.02), bar.get_y() + bar.get_height() / 2,
                f"{count} ({pct}%)", va='center', ha='left', fontsize=9.5, fontweight='bold', color='#1E293B')

# Styling spines
for spine in ['top', 'right', 'left']:
    ax_bar.spines[spine].set_visible(False)
ax_bar.spines['bottom'].set_color('#CBD5E1')

# Add subtle border container around ax_bar
rect_bar = patches.FancyBboxPatch((-0.03, -0.05), 1.05, 1.07, transform=ax_bar.transAxes,
                                  boxstyle="round,pad=0.03,rounding_size=0.03",
                                  facecolor='none', edgecolor='#E2E8F0', linewidth=1.2, zorder=1)
ax_bar.add_patch(rect_bar)

# --- Chart 2: Donut Chart Sumber Leads & Region (Right Column) ---
ax_pie = fig.add_subplot(gs[1, 1])
ax_pie.set_facecolor('#FFFFFF')

pie_colors = ['#2563EB', '#F97316', '#10B981', '#8B5CF6']
wedges, texts, autotexts = ax_pie.pie(
    source_counts['Count'],
    labels=source_counts['Source'],
    autopct='%1.1f%%',
    pctdistance=0.74,
    startangle=140,
    colors=pie_colors[:len(source_counts)],
    wedgeprops=dict(width=0.45, edgecolor='#FFFFFF', linewidth=2.5),
    textprops=dict(color='#1E293B', fontsize=10, fontweight='600')
)

for autotext in autotexts:
    autotext.set_color('#FFFFFF')
    autotext.set_fontsize(9.5)
    autotext.set_fontweight('bold')

ax_pie.set_title('Proporsi Sumber Platform Leads Dzaki', fontsize=13, fontweight='bold', color='#0F172A', pad=12, loc='left')

# Center text inside donut
ax_pie.text(0, 0.06, f"{total_leads}", ha='center', va='center', fontsize=20, fontweight='heavy', color='#0F172A')
ax_pie.text(0, -0.15, "Leads Dzaki", ha='center', va='center', fontsize=9, color='#64748B', fontweight='bold')

# Region Mini Breakdown below donut
region_lines = [f"{r['Region']}: {r['Count']} leads ({r['Percentage']}%)" for _, r in region_counts.iterrows()]
priority_lines = [f"P0: {priority_counts.get('P0', 0)}", f"P1: {priority_counts.get('P1', 0)}", f"P2: {priority_counts.get('P2', 0)}"]

summary_box_text = "Sebaran per Region (Dzaki):\n• " + "\n• ".join(region_lines) + "\n\nPrioritas: " + " | ".join(priority_lines)
ax_pie.text(0, -1.38, summary_box_text, ha='center', va='top', fontsize=8.8, color='#334155', linespacing=1.35,
            bbox=dict(boxstyle='round,pad=0.55', facecolor='#F1F5F9', edgecolor='#E2E8F0', linewidth=1))

# Border container around ax_pie
rect_pie = patches.FancyBboxPatch((-0.05, -0.32), 1.1, 1.34, transform=ax_pie.transAxes,
                                  boxstyle="round,pad=0.03,rounding_size=0.03",
                                  facecolor='none', edgecolor='#E2E8F0', linewidth=1.2, zorder=1)
ax_pie.add_patch(rect_pie)

# Save chart
out_png_workspace = 'leads_chart.png'
fig.savefig(out_png_workspace, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())

plt.close(fig)
print("Updated chart specifically for Dzaki successfully created!")
