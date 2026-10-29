// Leads Dashboard Application Logic
// Integrated with Google Sheets: [SOCIAL MEDIA SCRAPING]
// Link: https://docs.google.com/spreadsheets/d/17zB_EjnHGmDRFrXixR3lvVVj93ggs7Z95zlgc-aF-nU/edit?usp=sharing

const OLD_SHEET_ID = '1kwhpZTUEkzGnc8QuEpP0fN3bmrFRtmTTSV9AQSM6Le8';
const DEFAULT_SHEET_ID = '17zB_EjnHGmDRFrXixR3lvVVj93ggs7Z95zlgc-aF-nU';
const DEFAULT_SHEET_TAB = '[SOCIAL MEDIA SCRAPING]';

// Auto-migrate if user previously had the previous temporary sheet cached
try {
  const customId = localStorage.getItem('custom_sheet_id');
  const cachedSheetId = localStorage.getItem('cached_sheet_id');
  if (customId === OLD_SHEET_ID || cachedSheetId === OLD_SHEET_ID || (!customId && cachedSheetId !== DEFAULT_SHEET_ID)) {
    localStorage.removeItem('custom_sheet_id');
    localStorage.removeItem('all_leads_data_cached');
    localStorage.removeItem('leads_data_cached');
    localStorage.removeItem('leads_last_synced');
    localStorage.removeItem('selected_scraper');
    localStorage.setItem('cached_sheet_id', DEFAULT_SHEET_ID);
  }
} catch (e) {}

let activeSheetId = localStorage.getItem('custom_sheet_id') || DEFAULT_SHEET_ID;
let activeSheetTab = localStorage.getItem('custom_sheet_tab') || DEFAULT_SHEET_TAB;

let allLeadsData = typeof LEADS_DATA !== 'undefined' ? [...LEADS_DATA] : [];
let selectedScraper = localStorage.getItem('selected_scraper') || 'all';

let currentSummaryData = typeof SUMMARY_DATA !== 'undefined' ? [...SUMMARY_DATA] : [];
let currentLeadsData = typeof LEADS_DATA !== 'undefined' ? [...LEADS_DATA] : [];

let cityChart = null;
let distChart = null;
let currentDistMode = 'platform';
let currentBarOrientation = 'horizontal';

// Detailed table state
let filteredLeads = [...currentLeadsData];
let currentPage = 1;
let rowsPerPage = 10;
let searchQuery = '';
let selectedCity = 'all';
let selectedPlatform = 'all';
let selectedPriority = 'all';
let selectedSanity = 'all';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadCachedSyncData();
  populateScraperFilters();
  updateScraperScope(selectedScraper, false);
  initDetailedTable();
  setupEventListeners();
  updateSyncStatusDisplay();
  updateSheetLinkUI();
});

// Update Google Sheet links and tab display in UI
function updateSheetLinkUI() {
  const linkEl = document.getElementById('sheet-open-link');
  if (linkEl) {
    linkEl.href = `https://docs.google.com/spreadsheets/d/${activeSheetId}/edit?usp=sharing`;
  }
  const tabNameEl = document.querySelector('.sheet-tab-name');
  if (tabNameEl) {
    tabNameEl.innerHTML = `Tab: <strong>${activeSheetTab}</strong>`;
  }
}

// Mapping of city to official GoFood region for fallback and auto-healing
const CITY_TO_REGION_MAP = {
  // EJBN (East Java, Bali, Nusa Tenggara)
  'surabaya': 'EJBN',
  'malang': 'EJBN',
  'sidoarjo': 'EJBN',
  'gresik': 'EJBN',
  'kediri': 'EJBN',
  'madiun': 'EJBN',
  'mataram': 'EJBN',
  'blitar': 'EJBN',
  'pasuruan': 'EJBN',
  'probolinggo': 'EJBN',
  'jember': 'EJBN',
  'banyuwangi': 'EJBN',
  'tulungagung': 'EJBN',
  'mojokerto': 'EJBN',
  'batu': 'EJBN',
  'denpasar': 'EJBN',
  'badung': 'EJBN',
  'gianyar': 'EJBN',
  'kupang': 'EJBN',

  // CWJ (Central & West Java)
  'garut': 'CWJ',
  'cirebon': 'CWJ',
  'tasikmalaya': 'CWJ',
  'bandung': 'CWJ',
  'cimahi': 'CWJ',
  'semarang': 'CWJ',
  'solo': 'CWJ',
  'surakarta': 'CWJ',
  'yogyakarta': 'CWJ',
  'jogja': 'CWJ',
  'sleman': 'CWJ',
  'bantul': 'CWJ',
  'magelang': 'CWJ',
  'salatiga': 'CWJ',
  'tegal': 'CWJ',
  'pekalongan': 'CWJ',
  'kudus': 'CWJ',
  'purwokerto': 'CWJ',
  'banyumas': 'CWJ',
  'cilacap': 'CWJ',
  'sukabumi': 'CWJ',
  'purwakarta': 'CWJ',
  'subang': 'CWJ',
  'karawang': 'CWJ',

  // JABODETABEK
  'jakarta': 'JABODETABEK',
  'jakarta pusat': 'JABODETABEK',
  'jakarta selatan': 'JABODETABEK',
  'jakarta barat': 'JABODETABEK',
  'jakarta timur': 'JABODETABEK',
  'jakarta utara': 'JABODETABEK',
  'bogor': 'JABODETABEK',
  'depok': 'JABODETABEK',
  'tangerang': 'JABODETABEK',
  'tangerang selatan': 'JABODETABEK',
  'tangsel': 'JABODETABEK',
  'bekasi': 'JABODETABEK',

  // SUMATERA
  'medan': 'SUMATERA',
  'palembang': 'SUMATERA',
  'padang': 'SUMATERA',
  'pekanbaru': 'SUMATERA',
  'batam': 'SUMATERA',
  'tanjung pinang': 'SUMATERA',
  'tanjungpinang': 'SUMATERA',
  'bandar lampung': 'SUMATERA',
  'lampung': 'SUMATERA',
  'jambi': 'SUMATERA',
  'bengkulu': 'SUMATERA',
  'banda aceh': 'SUMATERA',
  'pangkal pinang': 'SUMATERA',
  'binjai': 'SUMATERA',
  'deli serdang': 'SUMATERA',

  // EI (East Indonesia / Kalimantan / Sulawesi / Papua)
  'banjarmasin': 'EI',
  'banjarbaru': 'EI',
  'palangkaraya': 'EI',
  'palangka raya': 'EI',
  'balikpapan': 'EI',
  'samarinda': 'EI',
  'pontianak': 'EI',
  'tarakan': 'EI',
  'makassar': 'EI',
  'manado': 'EI',
  'palu': 'EI',
  'kendari': 'EI',
  'gorontalo': 'EI',
  'ambon': 'EI',
  'jayapura': 'EI'
};

const VALID_REGIONS = ['EJBN', 'CWJ', 'JABODETABEK', 'SUMATERA', 'EI'];
const ADDRESS_PATTERN = /\b(jalan|jl|jln|no\.?|rt|rw|kec|kel|kab|blok|gang|gg|lantai|gedung|komplek|pasar|hotel|raya|ruko|pos|\d{5})\b/i;

function resolveRegion(city, rawRegion, address = '') {
  // 1. Check if rawRegion is already a valid short region code
  if (rawRegion && typeof rawRegion === 'string') {
    const trimmed = rawRegion.trim().toUpperCase();
    if (VALID_REGIONS.includes(trimmed)) {
      return trimmed;
    }
    // Check known variations
    if (trimmed === 'JABODETABEK' || trimmed === 'JBODETABEK' || trimmed === 'JAKARTA') return 'JABODETABEK';
    if (trimmed === 'SUMATRA') return 'SUMATERA';
    if (trimmed === 'EAST INDONESIA') return 'EI';

    // If it is NOT an address and <= 15 chars and not placeholder, treat as valid region
    const isAddress = trimmed.length > 20 || ADDRESS_PATTERN.test(trimmed);
    if (!isAddress && trimmed !== '' && trimmed !== 'LAINNYA' && trimmed !== 'NAN' && trimmed !== '-') {
      return trimmed;
    }
  }

  // 2. City lookup from CITY_TO_REGION_MAP
  const cleanCity = (city || '').trim().toLowerCase();
  if (cleanCity && CITY_TO_REGION_MAP[cleanCity]) {
    return CITY_TO_REGION_MAP[cleanCity];
  }

  // 3. Fallback partial city matching against map keys
  for (const [keyCity, reg] of Object.entries(CITY_TO_REGION_MAP)) {
    if (cleanCity.includes(keyCity) || keyCity.includes(cleanCity)) {
      return reg;
    }
  }

  // 4. Fallback inference by keywords in city, address, or rawRegion
  const combined = `${cleanCity} ${rawRegion || ''} ${address || ''}`.toLowerCase();
  if (combined.includes('jawa timur') || combined.includes('jatim') || combined.includes('bali') || combined.includes('lombok') || combined.includes('surabaya')) {
    return 'EJBN';
  }
  if (combined.includes('jawa barat') || combined.includes('jabar') || combined.includes('jawa tengah') || combined.includes('jateng') || combined.includes('bandung') || combined.includes('semarang')) {
    return 'CWJ';
  }
  if (combined.includes('jakarta') || combined.includes('tangerang') || combined.includes('bekasi') || combined.includes('depok') || combined.includes('bogor')) {
    return 'JABODETABEK';
  }
  if (combined.includes('kalimantan') || combined.includes('sulawesi') || combined.includes('papua') || combined.includes('maluku') || combined.includes('banjarmasin') || combined.includes('makassar')) {
    return 'EI';
  }
  if (combined.includes('sumatera') || combined.includes('sumatra') || combined.includes('medan') || combined.includes('palembang') || combined.includes('riau') || combined.includes('lampung')) {
    return 'SUMATERA';
  }

  return 'Lainnya';
}

// Load Cached Data from localStorage if newer than bundle
function loadCachedSyncData() {
  try {
    const cachedAll = localStorage.getItem('all_leads_data_cached') || localStorage.getItem('leads_data_cached');
    if (cachedAll) {
      const parsedLeads = JSON.parse(cachedAll);
      if (Array.isArray(parsedLeads) && parsedLeads.length > 0) {
        parsedLeads.forEach(lead => {
          lead.region = resolveRegion(lead.city, lead.region, lead.address);
          if (!lead.scraper) lead.scraper = 'Tidak Diketahui';
        });
        allLeadsData = parsedLeads;
        // Auto-heal and persist back cleaned data so corrupted cache is fixed
        try {
          localStorage.setItem('all_leads_data_cached', JSON.stringify(allLeadsData));
        } catch (e) {}
      }
    } else {
      allLeadsData.forEach(lead => {
        lead.region = resolveRegion(lead.city, lead.region, lead.address);
        if (!lead.scraper) lead.scraper = 'Tidak Diketahui';
      });
    }
  } catch (e) {
    console.warn('Gagal memuat cache lokal:', e);
  }
}

// Populate Scraper Filter Dropdowns (Header & Detailed Table Controls)
function populateScraperFilters() {
  const scraperCounts = {};
  allLeadsData.forEach(d => {
    const s = (d.scraper || 'Tidak Diketahui').trim();
    scraperCounts[s] = (scraperCounts[s] || 0) + 1;
  });

  const scrapers = Object.keys(scraperCounts).sort();

  const populateSelect = (selectEl) => {
    if (!selectEl) return;
    const currentVal = selectedScraper;
    selectEl.innerHTML = '';

    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = `Semua Scraper (${allLeadsData.length})`;
    selectEl.appendChild(optAll);

    scrapers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `${s} (${scraperCounts[s]})`;
      selectEl.appendChild(opt);
    });

    selectEl.value = (scrapers.includes(currentVal) || currentVal === 'all') ? currentVal : 'all';
  };

  populateSelect(document.getElementById('header-filter-scraper'));
  populateSelect(document.getElementById('filter-scraper'));
}

// Switch Scraper Scope (recomputes KPIs, summary table, and charts)
function updateScraperScope(scraperVal, shouldSave = true) {
  selectedScraper = scraperVal || 'all';
  if (shouldSave) {
    try {
      localStorage.setItem('selected_scraper', selectedScraper);
    } catch (e) {}
  }

  // Synchronize both dropdowns
  const headerSelect = document.getElementById('header-filter-scraper');
  const filterSelect = document.getElementById('filter-scraper');
  if (headerSelect && headerSelect.value !== selectedScraper) headerSelect.value = selectedScraper;
  if (filterSelect && filterSelect.value !== selectedScraper) filterSelect.value = selectedScraper;

  // Update Brand Badge
  const brandBadge = document.getElementById('brand-scraper-badge');
  if (brandBadge) {
    brandBadge.textContent = selectedScraper === 'all' ? 'Semua Scraper' : selectedScraper;
  }

  // Filter current leads
  if (selectedScraper === 'all') {
    currentLeadsData = [...allLeadsData];
  } else {
    currentLeadsData = allLeadsData.filter(d => 
      (d.scraper || '').trim().toLowerCase() === selectedScraper.trim().toLowerCase()
    );
  }

  // Recompute Summary Data for this scraper scope
  recomputeSummaryData();

  // Reset city filter if selected city is not in current scraper scope
  if (selectedCity !== 'all' && !currentSummaryData.some(s => s.city.toLowerCase() === selectedCity.toLowerCase())) {
    selectedCity = 'all';
  }

  // Update Footer text
  const footerText = document.getElementById('footer-text');
  if (footerText) {
    footerText.innerHTML = `Laporan Rekapitulasi Leads • Scraper: <strong>${selectedScraper === 'all' ? 'Semua Scraper' : selectedScraper}</strong> (${currentLeadsData.length} Entri) • Sumber: Google Sheets <code>[${activeSheetTab}]</code>`;
  }

  // Re-render UI components
  renderKPIs();
  initSummaryTable();
  initCityChart();
  initDistChart();
  populateCityFilter();
  applyFilters();
}

// Recompute Summary Data from currentLeadsData
function recomputeSummaryData() {
  const cityMap = {};
  currentLeadsData.forEach(lead => {
    const c = lead.city;
    if (!c) return;
    if (!cityMap[c]) {
      cityMap[c] = {
        city: c,
        region: resolveRegion(c, lead.region, lead.address),
        count: 0,
        pct: 0,
        virgin: 0,
        tiktok: 0,
        instagram: 0,
        website: 0,
        p0: 0,
        p1: 0,
        p2: 0
      };
    }
    const item = cityMap[c];
    item.count += 1;

    if ((lead.sanity || '').toLowerCase() === 'virgin') {
      item.virgin += 1;
    }

    const src = (lead.source || '').toLowerCase();
    if (src === 'tiktok') item.tiktok += 1;
    else if (src === 'instagram') item.instagram += 1;
    else if (src === 'website') item.website += 1;

    const prio = (lead.priority || '').toUpperCase();
    if (prio === 'P0') item.p0 += 1;
    else if (prio === 'P1') item.p1 += 1;
    else if (prio === 'P2') item.p2 += 1;
  });

  const total = currentLeadsData.length || 1;
  currentSummaryData = Object.values(cityMap).map(item => {
    item.pct = parseFloat(((item.count / total) * 100).toFixed(1));
    return item;
  });
  currentSummaryData.sort((a, b) => b.count - a.count);
}

// Update Sync Status Display
function updateSyncStatusDisplay(customTime) {
  const statusEl = document.getElementById('sheet-sync-status');
  if (!statusEl) return;
  
  const savedTime = customTime || localStorage.getItem('leads_last_synced') || (typeof GOOGLE_SHEET_CONFIG !== 'undefined' ? GOOGLE_SHEET_CONFIG.lastSynced : 'Terbaru');
  statusEl.textContent = `Sinkronisasi terakhir: ${savedTime}`;
}

// KPI & Incentive Dynamic Rendering
function renderKPIs() {
  const totalLeadsEl = document.getElementById('kpi-total-leads');
  const totalLeadsSubtextEl = document.getElementById('kpi-total-leads-subtext');
  const totalCitiesEl = document.getElementById('kpi-total-cities');
  const regionSubtextEl = document.getElementById('kpi-region-subtext');
  
  const topCityEl = document.getElementById('kpi-top-city');
  const topCityBadgeEl = document.getElementById('kpi-top-city-badge');
  const topCityPctEl = document.getElementById('kpi-top-city-pct');

  const topPlatformEl = document.getElementById('kpi-top-platform');
  const topPlatformBadgeEl = document.getElementById('kpi-top-platform-badge');
  const topPlatformPctEl = document.getElementById('kpi-top-platform-pct');

  const total = currentLeadsData.length;
  const totalAll = allLeadsData.length || 1;

  if (totalLeadsEl) totalLeadsEl.textContent = total.toLocaleString();

  // Dynamic Total Leads Subtext based on active scraper
  if (totalLeadsSubtextEl) {
    const isAll = selectedScraper === 'all';
    const pct = ((total / totalAll) * 100).toFixed(1);
    if (isAll) {
      totalLeadsSubtextEl.innerHTML = `
        <span class="badge badge-primary">Semua Scraper</span>
        100% dari total ${totalAll.toLocaleString()} leads
      `;
    } else {
      totalLeadsSubtextEl.innerHTML = `
        <span class="badge badge-primary">Scraper: ${selectedScraper}</span>
        ${pct}% dari total leads (${total.toLocaleString()} leads)
      `;
    }
  }

  if (totalCitiesEl) totalCitiesEl.textContent = `${currentSummaryData.length} Kota`;

  // Region breakdown - filter out any invalid/address entries
  const validRegions = [...new Set(currentSummaryData.map(d => d.region))]
    .filter(r => r && r !== 'Lainnya' && r.length <= 15 && !ADDRESS_PATTERN.test(r));
  if (regionSubtextEl) {
    const rCount = validRegions.length || 1;
    const rList = validRegions.length > 0 ? validRegions.join(', ') : 'Semua Wilayah';
    regionSubtextEl.innerHTML = `
      <span class="badge badge-secondary">${rCount} Region</span>
      ${rList}
    `;
  }

  // Top City
  if (currentSummaryData.length > 0) {
    const topCity = currentSummaryData[0];
    if (topCityEl) topCityEl.textContent = topCity.city;
    if (topCityBadgeEl) topCityBadgeEl.textContent = `${topCity.count} Leads`;
    if (topCityPctEl) topCityPctEl.textContent = `${topCity.pct}%`;
  }

  // Top Platform
  const platformCounts = {};
  currentLeadsData.forEach(d => {
    platformCounts[d.source] = (platformCounts[d.source] || 0) + 1;
  });
  const sortedPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);
  if (sortedPlatforms.length > 0) {
    const [topPlat, topCount] = sortedPlatforms[0];
    const topPct = ((topCount / (total || 1)) * 100).toFixed(1);
    if (topPlatformEl) topPlatformEl.textContent = topPlat;
    if (topPlatformBadgeEl) topPlatformBadgeEl.textContent = `${topCount} Leads`;
    if (topPlatformPctEl) topPlatformPctEl.textContent = `${topPct}%`;
  }

  // Sanity Check GoFood & Virgin Incentive Calculations
  // Fee per Virgin lead = Rp 5.000
  const virginLeads = currentLeadsData.filter(d => (d.sanity || '').toLowerCase() === 'virgin');
  const pendingLeads = currentLeadsData.filter(d => {
    const s = (d.sanity || '').toLowerCase();
    return s === 'belum dicek' || s === '' || s === '-' || s === 'nan';
  });
  const otherLeads = currentLeadsData.filter(d => {
    const s = (d.sanity || '').toLowerCase();
    return s !== 'virgin' && s !== 'belum dicek' && s !== '' && s !== '-' && s !== 'nan';
  });

  const virginCount = virginLeads.length;
  const pendingCount = pendingLeads.length;
  const otherCount = otherLeads.length;

  const virginEarned = virginCount * 5000;
  const potentialTotal = (virginCount + pendingCount) * 5000;
  const virginPct = total > 0 ? ((virginCount / total) * 100).toFixed(1) : 0;

  // Update Incentive elements
  const earnedValEl = document.getElementById('incentive-earned-val');
  if (earnedValEl) earnedValEl.textContent = `Rp ${virginEarned.toLocaleString('id-ID')}`;

  const statVirginCountEl = document.getElementById('stat-virgin-count');
  if (statVirginCountEl) statVirginCountEl.textContent = `${virginCount} Leads`;

  const statVirginSubtextEl = document.getElementById('stat-virgin-subtext');
  if (statVirginSubtextEl) {
    statVirginSubtextEl.innerHTML = `${virginPct}% dari total leads (Rp ${virginEarned.toLocaleString('id-ID')}) 🔍`;
  }

  const statPendingCountEl = document.getElementById('stat-pending-count');
  if (statPendingCountEl) statPendingCountEl.textContent = `${pendingCount} Leads`;

  const statPendingSubtextEl = document.getElementById('stat-pending-subtext');
  if (statPendingSubtextEl) {
    statPendingSubtextEl.innerHTML = `Potensi insentif: Rp ${(pendingCount * 5000).toLocaleString('id-ID')} 🔍`;
  }

  const statOtherCountEl = document.getElementById('stat-other-count');
  if (statOtherCountEl) statOtherCountEl.textContent = `${otherCount} Leads`;

  const statOtherSubtextEl = document.getElementById('stat-other-subtext');
  if (statOtherSubtextEl) {
    const otherPct = total > 0 ? ((otherCount / total) * 100).toFixed(1) : 0;
    const otherReasons = {};
    otherLeads.forEach(d => {
      const reason = d.sanity || 'Lainnya';
      otherReasons[reason] = (otherReasons[reason] || 0) + 1;
    });
    const topReasons = Object.entries(otherReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${k} (${v})`)
      .join(', ');
    statOtherSubtextEl.innerHTML = topReasons 
      ? `${topReasons}, dll. (${otherPct}%) 🔍` 
      : `${otherPct}% dari total leads 🔍`;
  }

  const statPotentialValEl = document.getElementById('stat-potential-val');
  if (statPotentialValEl) statPotentialValEl.textContent = `Rp ${potentialTotal.toLocaleString('id-ID')}`;

  const statPotentialSubtextEl = document.getElementById('stat-potential-subtext');
  if (statPotentialSubtextEl) {
    statPotentialSubtextEl.textContent = `Jika sisa ${pendingCount} leads pending disetujui Virgin`;
  }
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('leads_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('leads_theme', newTheme);
  updateThemeIcon(newTheme);
  updateChartsTheme();
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getThemeColors() {
  const dark = isDark();
  return {
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#94a3b8' : '#64748b',
    grid: dark ? '#1e293b' : '#f1f5f9',
    surface: dark ? '#131b2e' : '#ffffff'
  };
}

// Summary Table Rendering
function initSummaryTable() {
  const tbody = document.getElementById('summary-table-body');
  if (!tbody) return;

  let totalLeads = 0;
  let totalVirgin = 0;
  let totalTiktok = 0;
  let totalIg = 0;
  let totalWeb = 0;
  let totalP0 = 0;
  let totalP1 = 0;
  let totalP2 = 0;

  let html = '';
  currentSummaryData.forEach((item, index) => {
    totalLeads += item.count;
    totalVirgin += (item.virgin || 0);
    totalTiktok += item.tiktok;
    totalIg += item.instagram;
    totalWeb += item.website;
    totalP0 += item.p0;
    totalP1 += item.p1;
    totalP2 += item.p2;

    const virginCell = (item.virgin && item.virgin > 0)
      ? `<strong style="color: #059669;">${item.virgin}</strong>`
      : `<span style="color: var(--text-muted);">-</span>`;

    html += `
      <tr>
        <td style="font-weight: 700; text-align: center;">${index + 1}</td>
        <td>
          <strong style="cursor: pointer; color: var(--primary);" onclick="filterByCity('${item.city}')" title="Klik untuk filter data leads ${item.city}">
            ${item.city} 🔍
          </strong>
        </td>
        <td><span class="badge badge-secondary">${item.region}</span></td>
        <td style="text-align: right; font-weight: 700; color: var(--primary); font-size: 0.95rem;">${item.count.toLocaleString()}</td>
        <td>
          <div class="progress-cell">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${item.pct}%;"></div>
            </div>
            <span style="font-weight: 600; font-size: 0.8125rem;">${item.pct}%</span>
          </div>
        </td>
        <td style="text-align: right; background: rgba(16, 185, 129, 0.05);">${virginCell}</td>
        <td style="text-align: right;">${item.tiktok}</td>
        <td style="text-align: right;">${item.instagram}</td>
        <td style="text-align: right;">${item.website}</td>
        <td style="text-align: right;"><span class="pill-p0">${item.p0}</span></td>
        <td style="text-align: right;"><span class="pill-p1">${item.p1}</span></td>
        <td style="text-align: right;"><span class="pill-p2">${item.p2}</span></td>
        <td style="text-align: center;">
          <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="filterByCity('${item.city}')">
            Detail
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Update Summary Total Row
  const tfoot = document.getElementById('summary-table-foot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="table-summary-row">
        <td colspan="3" style="text-align: center; font-weight: 800;">TOTAL KESELURUHAN</td>
        <td style="text-align: right; font-weight: 800; color: var(--primary); font-size: 1.05rem;">${totalLeads.toLocaleString()}</td>
        <td style="font-weight: 800;">100.0%</td>
        <td style="text-align: right; font-weight: 800; color: #059669; font-size: 1.05rem;">${totalVirgin}</td>
        <td style="text-align: right; font-weight: 800;">${totalTiktok}</td>
        <td style="text-align: right; font-weight: 800;">${totalIg}</td>
        <td style="text-align: right; font-weight: 800;">${totalWeb}</td>
        <td style="text-align: right; font-weight: 800;"><span class="pill-p0">${totalP0}</span></td>
        <td style="text-align: right; font-weight: 800;"><span class="pill-p1">${totalP1}</span></td>
        <td style="text-align: right; font-weight: 800;"><span class="pill-p2">${totalP2}</span></td>
        <td></td>
      </tr>
    `;
  }
}

// Chart 1: City Bar Chart
function initCityChart() {
  const ctx = document.getElementById('cityBarChart');
  if (!ctx) return;

  const colors = getThemeColors();
  const isHoriz = currentBarOrientation === 'horizontal';

  // Sort: if horizontal, top city at top
  const sortedData = [...currentSummaryData];
  if (isHoriz) {
    sortedData.reverse();
  }

  const labels = sortedData.map(d => d.city);
  const data = sortedData.map(d => d.count);

  if (cityChart) {
    cityChart.destroy();
  }

  cityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Leads',
        data: data,
        backgroundColor: sortedData.map((d, i) => {
          const ratio = (i + 1) / (sortedData.length || 1);
          return isHoriz 
            ? `rgba(37, 99, 235, ${0.40 + (ratio * 0.60)})`
            : `rgba(37, 99, 235, ${1 - (ratio * 0.55)})`;
        }),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: isHoriz ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Plus Jakarta Sans', weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const count = context.parsed[isHoriz ? 'x' : 'y'];
              const pct = ((count / (currentLeadsData.length || 1)) * 100).toFixed(1);
              return ` ${count} Leads (${pct}% dari total)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: { color: colors.muted, font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: isHoriz ? 'transparent' : colors.grid, drawBorder: false },
          ticks: { color: colors.text, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const clickedCity = labels[index];
          filterByCity(clickedCity);
        }
      }
    }
  });
}

function setBarOrientation(orientation) {
  currentBarOrientation = orientation;
  document.getElementById('btn-orient-h')?.classList.toggle('active', orientation === 'horizontal');
  document.getElementById('btn-orient-v')?.classList.toggle('active', orientation === 'vertical');
  initCityChart();
}

// Chart 2: Donut / Distribution Chart
function initDistChart() {
  const ctx = document.getElementById('distChart');
  if (!ctx) return;

  const colors = getThemeColors();
  let labels = [];
  let data = [];
  let bgColors = [];

  if (currentDistMode === 'platform') {
    const platformMap = {};
    currentLeadsData.forEach(d => { platformMap[d.source] = (platformMap[d.source] || 0) + 1; });
    labels = Object.keys(platformMap);
    data = Object.values(platformMap);
    bgColors = ['#2563eb', '#ea580c', '#10b981', '#8b5cf6'];
  } else if (currentDistMode === 'region') {
    const regionMap = {};
    currentSummaryData.forEach(s => {
      regionMap[s.region] = (regionMap[s.region] || 0) + s.count;
    });
    labels = Object.keys(regionMap);
    data = Object.values(regionMap);
    bgColors = ['#3b82f6', '#0d9488', '#8b5cf6', '#f59e0b', '#ec4899'];
  } else if (currentDistMode === 'priority') {
    labels = ['P0 (High)', 'P1 (Medium)', 'P2 (Standard)'];
    const p0 = currentLeadsData.filter(d => d.priority === 'P0').length;
    const p1 = currentLeadsData.filter(d => d.priority === 'P1').length;
    const p2 = currentLeadsData.filter(d => d.priority === 'P2').length;
    data = [p0, p1, p2];
    bgColors = ['#ef4444', '#f59e0b', '#3b82f6'];
  } else if (currentDistMode === 'sanity') {
    const virginCount = currentLeadsData.filter(d => (d.sanity || '').toLowerCase() === 'virgin').length;
    const pendingCount = currentLeadsData.filter(d => {
      const s = (d.sanity || '').toLowerCase();
      return s === 'belum dicek' || s === '' || s === '-' || s === 'nan';
    }).length;
    const otherCount = currentLeadsData.length - virginCount - pendingCount;
    
    labels = ['⭐ Virgin (Rp 5rb)', '⏳ Belum Dicek', '❌ Non-Virgin'];
    data = [virginCount, pendingCount, otherCount];
    bgColors = ['#10b981', '#64748b', '#ef4444'];
  } else if (currentDistMode === 'scraper') {
    const scraperMap = {};
    allLeadsData.forEach(d => {
      const s = (d.scraper || 'Tidak Diketahui').trim();
      scraperMap[s] = (scraperMap[s] || 0) + 1;
    });
    labels = Object.keys(scraperMap);
    data = Object.values(scraperMap);
    bgColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
  }

  if (distChart) {
    distChart.destroy();
  }

  distChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: colors.surface,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.text,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
            padding: 10,
            boxWidth: 8,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Plus Jakarta Sans', weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const val = context.parsed;
              const pct = ((val / (currentLeadsData.length || 1)) * 100).toFixed(1);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function setDistMode(mode) {
  currentDistMode = mode;
  document.querySelectorAll('.dist-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  initDistChart();
}

function updateChartsTheme() {
  if (cityChart) initCityChart();
  if (distChart) initDistChart();
}

// Detailed Leads Table Management
function initDetailedTable() {
  populateCityFilter();
  applyFilters();
}

function populateCityFilter() {
  const citySelect = document.getElementById('filter-city');
  if (!citySelect) return;

  const prevValue = selectedCity;
  citySelect.innerHTML = '<option value="all">Semua Kota</option>';

  currentSummaryData.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.city;
    opt.textContent = `${item.city} (${item.count})`;
    citySelect.appendChild(opt);
  });

  citySelect.value = prevValue;
}

function applyFilters() {
  filteredLeads = currentLeadsData.filter(item => {
    const matchSearch = searchQuery === '' || 
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.account && item.account.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.city && item.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.sanity && item.sanity.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCity = selectedCity === 'all' || item.city === selectedCity;
    const matchPlatform = selectedPlatform === 'all' || item.source.toLowerCase() === selectedPlatform.toLowerCase();
    const matchPriority = selectedPriority === 'all' || item.priority.toUpperCase() === selectedPriority.toUpperCase();

    // Sanity filter
    let matchSanity = true;
    const itemSanity = (item.sanity || '').trim().toLowerCase();
    if (selectedSanity === 'all') {
      matchSanity = true;
    } else if (selectedSanity === 'Virgin') {
      matchSanity = itemSanity === 'virgin';
    } else if (selectedSanity === 'Belum Dicek') {
      matchSanity = itemSanity === 'belum dicek' || itemSanity === '' || itemSanity === '-' || itemSanity === 'nan';
    } else if (selectedSanity === 'other') {
      matchSanity = itemSanity !== 'virgin' && itemSanity !== 'belum dicek' && itemSanity !== '' && itemSanity !== '-' && itemSanity !== 'nan';
    } else {
      matchSanity = itemSanity === selectedSanity.toLowerCase();
    }

    return matchSearch && matchCity && matchPlatform && matchPriority && matchSanity;
  });

  currentPage = 1;
  renderDetailedTable();
}

function filterByCity(cityName) {
  selectedCity = cityName;
  const select = document.getElementById('filter-city');
  if (select) select.value = cityName;
  
  applyFilters();

  const el = document.getElementById('leads-detail-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function filterBySanity(sanityVal) {
  selectedSanity = sanityVal;
  const select = document.getElementById('filter-sanity');
  if (select) select.value = sanityVal;
  
  applyFilters();

  const el = document.getElementById('leads-detail-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function resetFilters() {
  searchQuery = '';
  selectedCity = 'all';
  selectedPlatform = 'all';
  selectedPriority = 'all';
  selectedSanity = 'all';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const filterCity = document.getElementById('filter-city');
  if (filterCity) filterCity.value = 'all';

  const filterPlatform = document.getElementById('filter-platform');
  if (filterPlatform) filterPlatform.value = 'all';

  const filterPriority = document.getElementById('filter-priority');
  if (filterPriority) filterPriority.value = 'all';

  const filterSanity = document.getElementById('filter-sanity');
  if (filterSanity) filterSanity.value = 'all';

  updateScraperScope('all');
}

function renderDetailedTable() {
  const tbody = document.getElementById('detailed-table-body');
  const countEl = document.getElementById('filtered-count');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `${filteredLeads.length} dari ${currentLeadsData.length} leads`;
  }

  if (filteredLeads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Tidak ditemukan leads yang sesuai dengan filter atau kata kunci.
        </td>
      </tr>
    `;
    renderPagination(0);
    return;
  }

  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, filteredLeads.length);
  const pageItems = filteredLeads.slice(startIdx, endIdx);

  let html = '';
  pageItems.forEach((lead, idx) => {
    const priorityPill = lead.priority === 'P0' 
      ? '<span class="pill-p0">P0</span>'
      : lead.priority === 'P1'
      ? '<span class="pill-p1">P1</span>'
      : '<span class="pill-p2">P2</span>';

    const sourceBadge = (lead.source || '').toLowerCase() === 'tiktok' 
      ? '<span class="badge badge-primary">TikTok</span>'
      : (lead.source || '').toLowerCase() === 'instagram'
      ? '<span class="badge badge-orange">Instagram</span>'
      : '<span class="badge badge-secondary">Website</span>';

    // Sanity Badge
    const sanityVal = (lead.sanity || '').trim();
    let sanityBadge = '';
    if (sanityVal.toLowerCase() === 'virgin') {
      sanityBadge = `<span class="badge-virgin" title="Terverifikasi Virgin (Insentif Rp 5.000)">⭐ Virgin (Rp 5rb)</span>`;
    } else if (sanityVal.toLowerCase() === 'belum dicek' || !sanityVal || sanityVal === '-' || sanityVal.toLowerCase() === 'nan') {
      sanityBadge = `<span class="badge-pending" title="Menunggu pengecekan tim internal GoFood">⏳ Belum Dicek</span>`;
    } else {
      sanityBadge = `<span class="badge-invalid" title="${sanityVal}">❌ ${sanityVal}</span>`;
    }

    let gmapsLink = '-';
    if (lead.gmaps && lead.gmaps !== '-') {
      const gmapsHref = lead.gmaps.startsWith('http') 
        ? lead.gmaps 
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.gmaps + ' ' + (lead.city || ''))}`;
      gmapsLink = `<a href="${gmapsHref}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-weight: 600;">📍 Maps</a>`;
    }

    const accountLink = (lead.account && lead.account.startsWith('http'))
      ? `<a href="${lead.account}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none;">${lead.account.replace(/https?:\/\/(www\.)?/, '')}</a>`
      : (lead.account || '-');

    html += `
      <tr>
        <td style="color: var(--text-muted); text-align: center;">${startIdx + idx + 1}</td>
        <td><strong>${lead.name}</strong></td>
        <td style="text-align: center;"><span class="badge badge-purple">${lead.scraper || '-'}</span></td>
        <td>${lead.city} <span style="font-size: 0.75rem; color: var(--text-muted);">(${lead.region})</span></td>
        <td>${sourceBadge}</td>
        <td>${priorityPill}</td>
        <td style="text-align: center;">${sanityBadge}</td>
        <td style="font-size: 0.8125rem;">${accountLink}</td>
        <td style="text-align: center;">${lead.rating !== '-' ? '⭐ ' + lead.rating : '-'}</td>
        <td style="text-align: center;">${gmapsLink}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  renderPagination(filteredLeads.length);
}

function renderPagination(totalItems) {
  const container = document.getElementById('pagination-container');
  const infoEl = document.getElementById('pagination-info');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  if (infoEl) {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);
    infoEl.textContent = `Menampilkan ${start} - ${end} dari ${totalItems} data`;
  }

  let html = `
    <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>« Prev</button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
      html += `
        <button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>
      `;
    } else if (p === currentPage - 3 || p === currentPage + 3) {
      html += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
    }
  }

  html += `
    <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next »</button>
  `;

  container.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderDetailedTable();
  }
}

// Export Table to CSV
function exportCSV() {
  let csv = 'No,Nama Merchant,Scraper,Kota,Region,Sumber,Prioritas,Sanity Check (GoFood),Akun Sosmed,Rating Google,Link Maps\n';
  filteredLeads.forEach((lead, i) => {
    const row = [
      i + 1,
      `"${(lead.name || '').replace(/"/g, '""')}"`,
      `"${(lead.scraper || '').replace(/"/g, '""')}"`,
      `"${lead.city || ''}"`,
      `"${lead.region || ''}"`,
      `"${lead.source || ''}"`,
      `"${lead.priority || ''}"`,
      `"${lead.sanity || ''}"`,
      `"${(lead.account || '').replace(/"/g, '""')}"`,
      `"${lead.rating || ''}"`,
      `"${(lead.gmaps || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Leads_${selectedCity !== 'all' ? selectedCity : 'Semua_Kota'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Toast Alert
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Google Sheets Live Sync
function syncFromGoogleSheet() {
  const btn = document.getElementById('btn-sync-sheet');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  if (btn) btn.disabled = true;
  if (syncIcon) syncIcon.classList.add('spinning');
  if (syncText) syncText.textContent = 'Menghubungkan...';

  const resetBtn = () => {
    if (btn) btn.disabled = false;
    if (syncIcon) syncIcon.classList.remove('spinning');
    if (syncText) syncText.textContent = 'Tarik Data Baru';
  };

  // Setup JSONP callback
  const callbackName = 'gvizResponseCallback_' + Date.now();
  window[callbackName] = function(response) {
    try {
      if (!response || !response.table) {
        showToast('⚠️ Data dari Google Sheet kosong atau tidak dapat diakses.');
        resetBtn();
        return;
      }
      processGoogleSheetResponse(response);
      const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      localStorage.setItem('leads_last_synced', nowStr);
      updateSyncStatusDisplay(nowStr);
      showToast(`✅ Berhasil disinkronkan dari Google Sheets! (${currentLeadsData.length} leads termuat)`);
    } catch (err) {
      console.error('Error processing Google Sheet data:', err);
      showToast('❌ Gagal memproses data dari Google Sheet.');
    } finally {
      resetBtn();
      delete window[callbackName];
      const s = document.getElementById('gviz-jsonp-script');
      if (s) s.remove();
    }
  };

  const script = document.createElement('script');
  script.id = 'gviz-jsonp-script';
  const url = `https://docs.google.com/spreadsheets/d/${activeSheetId}/gviz/tq?sheet=${encodeURIComponent(activeSheetTab)}&tqx=responseHandler:${callbackName}&_=${Date.now()}`;
  script.src = url;

  script.onerror = function() {
    showToast('❌ Gagal menghubungi Google Sheet. Pastikan link dapat diakses publik.');
    resetBtn();
    delete window[callbackName];
  };

  document.body.appendChild(script);
}

// Process Google Sheet gviz JSON data
function processGoogleSheetResponse(response) {
  const rows = response.table.rows || [];
  const cols = response.table.cols || [];
  const parsedLeads = [];

  // Find column indices dynamically
  let colIdxScraper = 6;
  let colIdxResto = 13;
  let colIdxCity = 27;
  let colIdxRegion = 28;
  let colIdxAddress = 29;
  let colIdxSource = 5;
  let colIdxPriority = 12;
  let colIdxDate = 7;
  let colIdxAccount = 25;
  let colIdxGmaps = 10;
  let colIdxRating = 22;
  let colIdxSanity = 33; // Default id: AH (Sanity Check Internal)

  cols.forEach((col, idx) => {
    const lbl = (col.label || '').toLowerCase().trim();
    if (lbl.includes('scraper')) colIdxScraper = idx;
    else if (lbl.includes('restaurant')) colIdxResto = idx;
    else if (lbl === 'city' && idx >= 20) colIdxCity = idx;
    else if (lbl.includes('address') || lbl.includes('alamat')) colIdxAddress = idx;
    else if ((lbl === 'region' || lbl === 'wilayah') && !lbl.includes('share to region') && !lbl.includes('address') && !lbl.includes('alamat')) colIdxRegion = idx;
    else if (lbl.includes('source') && !lbl.includes('link') && idx < 10) colIdxSource = idx;
    else if (lbl.includes('priority')) colIdxPriority = idx;
    else if (lbl.includes('posting')) colIdxDate = idx;
    else if (lbl.includes('account')) colIdxAccount = idx;
    else if (lbl.includes('gmaps')) colIdxGmaps = idx;
    else if (lbl.includes('rating') && idx >= 20) colIdxRating = idx;
    else if (lbl.includes('sanity check internal')) colIdxSanity = idx;
  });

  rows.forEach((row, idx) => {
    if (!row || !row.c) return;

    // Helper to get string value
    const getVal = (colIdx) => {
      const cell = row.c[colIdx];
      if (!cell) return '';
      if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return '';
    };

    const scraper = getVal(colIdxScraper) || 'Tidak Diketahui';
    const name = getVal(colIdxResto);
    const city = getVal(colIdxCity);

    // Accept valid leads regardless of scraper
    if (!name || name === '-' || name.toLowerCase() === 'nan') return;
    if (!city || city === '-' || city.toLowerCase() === 'nan') return;

    const source = getVal(colIdxSource) || 'Tiktok';
    const rawRegion = getVal(colIdxRegion);
    const address = getVal(colIdxAddress);
    const region = resolveRegion(city, rawRegion, address);
    const priority = getVal(colIdxPriority) || 'P2';
    const date = getVal(colIdxDate) || '-';
    const account = getVal(colIdxAccount) || 'Tidak ditemukan';
    const gmaps = getVal(colIdxGmaps) || name;
    const rating = getVal(colIdxRating) || '-';

    // Sanity Check GoFood
    let sanity = getVal(colIdxSanity);
    if (!sanity || sanity === '-' || sanity.toLowerCase() === 'nan') {
      sanity = 'Belum Dicek';
    }

    parsedLeads.push({
      id: parsedLeads.length + 1,
      name: name,
      city: city,
      region: region,
      address: address,
      source: source,
      priority: priority,
      sanity: sanity,
      date: date,
      account: account,
      gmaps: gmaps,
      rating: rating,
      scraper: scraper
    });
  });

  if (parsedLeads.length === 0) {
    showToast('⚠️ Tidak ada baris data leads yang valid ditemukan.');
    return;
  }

  // Update all leads data
  allLeadsData = parsedLeads;

  // Cache to localStorage
  try {
    localStorage.setItem('all_leads_data_cached', JSON.stringify(allLeadsData));
    localStorage.setItem('leads_data_cached', JSON.stringify(allLeadsData));
    localStorage.setItem('cached_sheet_id', activeSheetId);
  } catch (e) {
    console.warn('Gagal menyimpan ke cache lokal:', e);
  }

  // Populate scrapers and apply scope
  populateScraperFilters();
  updateScraperScope(selectedScraper, false);
}

// Modal Settings Dialog Functions
function openSheetSettingsModal() {
  const modal = document.getElementById('sheet-modal');
  const inputUrl = document.getElementById('input-sheet-url');
  const inputTab = document.getElementById('input-sheet-tab');

  if (inputUrl) inputUrl.value = `https://docs.google.com/spreadsheets/d/${activeSheetId}/edit?usp=sharing`;
  if (inputTab) inputTab.value = activeSheetTab;

  if (modal) modal.classList.add('open');
}

function closeSheetSettingsModal() {
  const modal = document.getElementById('sheet-modal');
  if (modal) modal.classList.remove('open');
}

function handleModalBackdropClick(event) {
  if (event.target.id === 'sheet-modal') {
    closeSheetSettingsModal();
  }
}

function saveSheetSettings() {
  const inputUrl = document.getElementById('input-sheet-url');
  const inputTab = document.getElementById('input-sheet-tab');

  if (!inputUrl || !inputTab) return;

  const rawUrl = inputUrl.value.trim();
  const rawTab = inputTab.value.trim();

  if (!rawUrl) {
    showToast('⚠️ Silakan masukkan link spreadsheet atau ID.');
    return;
  }

  // Extract ID from full URL or use as is
  let newId = rawUrl;
  const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    newId = match[1];
  }

  const newTab = rawTab || DEFAULT_SHEET_TAB;

  activeSheetId = newId;
  activeSheetTab = newTab;

  localStorage.setItem('custom_sheet_id', newId);
  localStorage.setItem('custom_sheet_tab', newTab);

  updateSheetLinkUI();
  closeSheetSettingsModal();
  showToast('💾 Pengaturan sheet disimpan! Mengambil data baru...');
  syncFromGoogleSheet();
}

function resetDefaultSheet() {
  activeSheetId = DEFAULT_SHEET_ID;
  activeSheetTab = DEFAULT_SHEET_TAB;

  localStorage.removeItem('custom_sheet_id');
  localStorage.removeItem('custom_sheet_tab');

  updateSheetLinkUI();
  closeSheetSettingsModal();
  showToast('🔄 Pengaturan sheet berhasil direset ke default.');
  syncFromGoogleSheet();
}

// Event Listeners Setup
function setupEventListeners() {
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilters();
  });

  document.getElementById('header-filter-scraper')?.addEventListener('change', (e) => {
    updateScraperScope(e.target.value);
  });

  document.getElementById('filter-scraper')?.addEventListener('change', (e) => {
    updateScraperScope(e.target.value);
  });

  document.getElementById('filter-city')?.addEventListener('change', (e) => {
    selectedCity = e.target.value;
    applyFilters();
  });

  document.getElementById('filter-platform')?.addEventListener('change', (e) => {
    selectedPlatform = e.target.value;
    applyFilters();
  });

  document.getElementById('filter-priority')?.addEventListener('change', (e) => {
    selectedPriority = e.target.value;
    applyFilters();
  });

  document.getElementById('filter-sanity')?.addEventListener('change', (e) => {
    selectedSanity = e.target.value;
    applyFilters();
  });
}
