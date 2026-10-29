import urllib.request
import urllib.parse
import pandas as pd
import json
import os
import io

# ==============================================================================
# KONFIGURASI SPREADSHEET (Bisa diganti di sini jika menggunakan link lain)
# ==============================================================================
SHEET_ID = '17zB_EjnHGmDRFrXixR3lvVVj93ggs7Z95zlgc-aF-nU'
SHEET_NAME = '[SOCIAL MEDIA SCRAPING]'
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(SHEET_NAME)}"

print(f"Downloading data from Google Sheet: {SHEET_NAME}...")
req = urllib.request.Request(CSV_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req) as resp:
    csv_bytes = resp.read()

df_raw = pd.read_csv(io.BytesIO(csv_bytes), low_memory=False)
print(f"Raw rows: {len(df_raw)}")

# Identify scraper column
scraper_cols = [c for c in df_raw.columns if 'scraper' in str(c).lower()]
scraper_col = scraper_cols[0] if scraper_cols else 'Scraper Name'

# Identify city column (the actual merchant city column)
city_cols = [c for c in df_raw.columns if 'city' in str(c).lower()]
city_col = city_cols[-1] if city_cols else 'City'

resto_cols = [c for c in df_raw.columns if 'restaurant' in str(c).lower()]
resto_col = resto_cols[0] if resto_cols else 'Restaurant Name'

# Filter rows where Restaurant Name and City are valid (all scrapers supported)
has_resto = df_raw[resto_col].notna() & (df_raw[resto_col].astype(str).str.strip() != '') & (df_raw[resto_col].astype(str).str.strip().str.lower() != 'nan') & (df_raw[resto_col].astype(str).str.strip() != '#REF!')
has_city = df_raw[city_col].notna() & (df_raw[city_col].astype(str).str.strip() != '') & (df_raw[city_col].astype(str).str.strip().str.lower() != 'nan') & (df_raw[city_col].astype(str).str.strip() != '#REF!')

df_filtered = df_raw[has_resto & has_city].copy()
print(f"Filtered valid leads (all scrapers): {len(df_filtered)}")

# Standardize columns to match project schema
df_standard = pd.DataFrame()
source_cols = [c for c in df_filtered.columns if 'source' in str(c).lower() and 'link' not in str(c).lower()]
df_standard['Source'] = df_filtered[source_cols[0]].fillna('Tiktok').astype(str).str.strip() if source_cols else 'Tiktok'
df_standard['Scraper Name'] = df_filtered[scraper_col].fillna('Tidak Diketahui').astype(str).str.strip()

date_cols = [c for c in df_filtered.columns if 'posting' in str(c).lower()]
df_standard['Date Posting'] = df_filtered[date_cols[0]].fillna('-').astype(str).str.strip() if date_cols else '-'
df_standard['Week'] = df_filtered['Week '].fillna('-').astype(str).str.strip() if 'Week ' in df_filtered.columns else '-'
df_standard['Year'] = df_filtered['Year'].fillna('2026').astype(str).str.strip() if 'Year' in df_filtered.columns else '2026'

# GMaps link / query
if '      Link Gmaps' in df_filtered.columns:
    df_standard['Link Gmaps'] = df_filtered['      Link Gmaps'].fillna(df_filtered[resto_col]).astype(str).str.strip()
else:
    df_standard['Link Gmaps'] = df_filtered[resto_col]

priority_cols = [c for c in df_filtered.columns if 'priority' in str(c).lower()]
df_standard['Priority'] = df_filtered[priority_cols[0]].fillna('P2').astype(str).str.strip() if priority_cols else 'P2'
df_standard['Restaurant Name'] = df_filtered[resto_col].astype(str).str.strip()

# Sanity Check Internal (GoFood)
sanity_cols = [c for c in df_filtered.columns if 'sanity check internal' in str(c).lower()]
if sanity_cols:
    raw_sanity = df_filtered[sanity_cols[0]].fillna('Belum Dicek').astype(str).str.strip()
    df_standard['Sanity Check Internal'] = raw_sanity.replace({
        'nan': 'Belum Dicek',
        '': 'Belum Dicek',
        '-': 'Belum Dicek'
    })
else:
    df_standard['Sanity Check Internal'] = 'Belum Dicek'

# Grab & Shopee fields if available
for col in ['Grab ID', 'Grab Link', 'Grab Rating', 'Grab Review', 'Shopee ID', 'Shopee Link', 'Shopee Rating', 'Shopee Review']:
    if col in df_filtered.columns:
        df_standard[col] = df_filtered[col].fillna('-')
    else:
        df_standard[col] = '-'

# Google Rating & Review
df_standard['Google Rating'] = df_filtered['Google Rating'].fillna('-').astype(str).str.strip() if 'Google Rating' in df_filtered.columns else '-'
df_standard['Google Review'] = df_filtered['Google Review'].fillna('-').astype(str).str.strip() if 'Google Review' in df_filtered.columns else '-'
source_link_cols = [c for c in df_filtered.columns if 'source link' in str(c).lower()]
df_standard['Source Link'] = df_filtered[source_link_cols[0]].fillna('-').astype(str).str.strip() if source_link_cols else '-'
account_cols = [c for c in df_filtered.columns if 'account' in str(c).lower()]
df_standard['IG/Tiktok Account (Merchant)'] = df_filtered[account_cols[0]].fillna('Tidak ditemukan').astype(str).str.strip() if account_cols else 'Tidak ditemukan'
df_standard['Followers'] = df_filtered['Followers'].fillna('-').astype(str).str.strip() if 'Followers' in df_filtered.columns else '-'
df_standard['City'] = df_filtered[city_col].astype(str).str.strip()
region_cols = [c for c in df_filtered.columns if str(c).strip().lower() == 'region']
df_standard['Region'] = df_filtered[region_cols[0]].fillna('Lainnya').astype(str).str.strip() if region_cols else 'Lainnya'
address_cols = [c for c in df_filtered.columns if 'address' in str(c).lower() or 'alamat' in str(c).lower()]
df_standard['Address'] = df_filtered[address_cols[0]].fillna('-').astype(str).str.strip() if address_cols else '-'
df_standard['Latitude'] = df_filtered['Latitude'].fillna('-') if 'Latitude' in df_filtered.columns else '-'
df_standard['Longitude'] = df_filtered['Longitude'].fillna('-') if 'Longitude' in df_filtered.columns else '-'

# Save standardized Book1.xlsx
df_standard.to_excel('Book1.xlsx', index=False)
print("Updated Book1.xlsx successfully!")

# Build SUMMARY_DATA
total_leads = len(df_standard)
summary_list = []
for city, grp in df_standard.groupby('City'):
    count = len(grp)
    region = grp['Region'].iloc[0]
    tiktok = int((grp['Source'].str.lower() == 'tiktok').sum())
    instagram = int((grp['Source'].str.lower() == 'instagram').sum())
    website = int((grp['Source'].str.lower() == 'website').sum())
    p0 = int((grp['Priority'].str.upper() == 'P0').sum())
    p1 = int((grp['Priority'].str.upper() == 'P1').sum())
    p2 = int((grp['Priority'].str.upper() == 'P2').sum())
    virgin = int((grp['Sanity Check Internal'].str.lower() == 'virgin').sum())
    pct = round((count / total_leads) * 100, 1)
    
    summary_list.append({
        'city': city,
        'region': region,
        'count': count,
        'pct': pct,
        'tiktok': tiktok,
        'instagram': instagram,
        'website': website,
        'p0': p0,
        'p1': p1,
        'p2': p2,
        'virgin': virgin
    })

# Sort summary by count descending
summary_list.sort(key=lambda x: x['count'], reverse=True)

# Build LEADS_DATA
leads_list = []
for idx, (_, row) in enumerate(df_standard.iterrows(), start=1):
    leads_list.append({
        'id': idx,
        'name': row['Restaurant Name'],
        'city': row['City'],
        'region': row['Region'],
        'source': row['Source'],
        'priority': row['Priority'],
        'sanity': row['Sanity Check Internal'],
        'date': row['Date Posting'],
        'account': row['IG/Tiktok Account (Merchant)'],
        'gmaps': row['Link Gmaps'],
        'rating': str(row['Google Rating']) if row['Google Rating'] != '-' else '-',
        'scraper': row['Scraper Name']
    })

# Calculate Virgin Metrics
virgin_count = int((df_standard['Sanity Check Internal'].str.lower() == 'virgin').sum())
pending_count = int((df_standard['Sanity Check Internal'].str.lower() == 'belum dicek').sum())
other_count = total_leads - virgin_count - pending_count
virgin_pct = round((virgin_count / (total_leads or 1)) * 100, 1)
virgin_fee = virgin_count * 5000
potential_fee = (virgin_count + pending_count) * 5000

print(f"\n--- SANITY CHECK & INSENTIF ---")
print(f"Total Leads: {total_leads}")
print(f"Leads Virgin: {virgin_count} ({virgin_pct}%)")
print(f"Total Diterima (Rp 5.000/lead): Rp {virgin_fee:,}")
print(f"Belum Dicek (Pending): {pending_count}")
print(f"Non-Virgin: {other_count}")
print(f"Potensi Maksimal: Rp {potential_fee:,}")

# Write leads_data.json
with open('leads_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        'meta': {
            'total_leads': total_leads,
            'total_cities': len(summary_list),
            'source_sheet_id': SHEET_ID,
            'source_sheet_name': SHEET_NAME,
            'sync_time': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
            'virgin_metrics': {
                'virgin_count': virgin_count,
                'virgin_pct': virgin_pct,
                'pending_count': pending_count,
                'other_count': other_count,
                'fee_per_lead': 5000,
                'total_earned': virgin_fee,
                'potential_earned': potential_fee
            }
        },
        'summary': summary_list,
        'leads': leads_list
    }, f, ensure_ascii=False, indent=2)
print("Updated leads_data.json successfully!")

# Write data_payload.js
payload_content = f"""// Auto-generated from Google Sheets: {SHEET_NAME}
// Last Synced: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
// Total: {total_leads} Leads across {len(summary_list)} Cities

const GOOGLE_SHEET_CONFIG = {{
  sheetId: '{SHEET_ID}',
  sheetName: '{SHEET_NAME}',
  viewUrl: 'https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?usp=sharing',
  csvUrl: 'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('{SHEET_NAME}'),
  jsonUrl: 'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?sheet=' + encodeURIComponent('{SHEET_NAME}'),
  lastSynced: '{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}',
  feePerVirgin: 5000
}};

const SANITY_METRICS = {{
  totalLeads: {total_leads},
  virginCount: {virgin_count},
  virginPct: {virgin_pct},
  pendingCount: {pending_count},
  otherCount: {other_count},
  feePerLead: 5000,
  totalEarned: {virgin_fee},
  potentialEarned: {potential_fee}
}};

const SUMMARY_DATA = {json.dumps(summary_list, indent=2)};

const LEADS_DATA = {json.dumps(leads_list, ensure_ascii=False)};
"""

with open('data_payload.js', 'w', encoding='utf-8') as f:
    f.write(payload_content)
print("Updated data_payload.js successfully!")
