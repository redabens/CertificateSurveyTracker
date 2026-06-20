/* ==========================================================================
   BABOR TRACKER - CLIENT-SIDE FRONTEND APPLICATION LOGIC (VANILLA JS)
   ========================================================================== */

// App State
let state = {
  vessels: [],
  selectedVesselId: null,
  certificates: [],
  actionableItems: [],
  emailLogs: [],
  token: localStorage.getItem('babor_token') || null,
  user: JSON.parse(localStorage.getItem('babor_user')) || null,
  lang: localStorage.getItem('babor_lang') || 'fr',
  complianceChart: null
};

let translations = {};

// Current Date for reference (local mock date from system metadata)
const RUNTIME_DATE = "2026-06-20";

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupSPA();
  setupEventListeners();
  
  // Load translations
  await loadTranslations(state.lang);
  
  // Check authorization and load screen
  checkAuth();
  
  // Start TV Time Ticker
  setInterval(updateTvTime, 1000);
});

// ----------------------------------------------------
// API FETCH WRAPPER
// ----------------------------------------------------
async function apiFetch(url, options = {}) {
  options.headers = options.headers || {};
  if (state.token) {
    options.headers['Authorization'] = 'Bearer ' + state.token;
  }
  
  const res = await fetch(url, options);
  
  if (res.status === 401 || res.status === 403) {
    handleLogout();
    throw new Error('Session expirée');
  }
  
  return res;
}

// ----------------------------------------------------
// AUTHENTICATION & SESSION MANAGEMENT
// ----------------------------------------------------
function checkAuth() {
  const loginPage = document.getElementById('loginPage');
  const mainAppGrid = document.getElementById('mainAppGrid');
  
  if (!state.token || !state.user) {
    if (loginPage) loginPage.style.display = 'flex';
    if (mainAppGrid) mainAppGrid.style.display = 'none';
  } else {
    if (loginPage) loginPage.style.display = 'none';
    if (mainAppGrid) mainAppGrid.style.display = 'grid';
    
    updateUserProfileUI();
    applyRolePermissions();
    
    // Initial data loading
    loadVessels();
    loadEmailLogs();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      state.token = data.token;
      state.user = data.user;
      
      localStorage.setItem('babor_token', data.token);
      localStorage.setItem('babor_user', JSON.stringify(data.user));
      
      document.getElementById('formLogin').reset();
      
      showToast(state.lang === 'fr' ? 'Connexion réussie !' : 'Login successful!', 'success');
      checkAuth();
    } else {
      showToast(data.error || 'Identifiants incorrects', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur lors de la connexion', 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  state.vessels = [];
  state.certificates = [];
  state.actionableItems = [];
  state.emailLogs = [];
  state.selectedVesselId = null;
  
  localStorage.removeItem('babor_token');
  localStorage.removeItem('babor_user');
  
  checkAuth();
  showToast(state.lang === 'fr' ? 'Déconnexion effectuée' : 'Logged out successfully', 'info');
}

function updateUserProfileUI() {
  const currentUserName = document.getElementById('currentUserName');
  const currentUserRoleBadge = document.getElementById('currentUserRoleBadge');
  
  if (state.user) {
    if (currentUserName) currentUserName.textContent = state.user.full_name || state.user.email;
    if (currentUserRoleBadge) {
      const roleLabels = {
        'Admin': 'Administrateur',
        'Crew': 'Équipage (Capitaine)',
        'Partner': 'Partenaire B2B',
        'Auditor': 'Auditeur Externe'
      };
      const roleLabelsEn = {
        'Admin': 'Administrator',
        'Crew': 'Crew (Captain)',
        'Partner': 'B2B Partner',
        'Auditor': 'External Auditor'
      };
      
      const labels = state.lang === 'fr' ? roleLabels : roleLabelsEn;
      currentUserRoleBadge.textContent = labels[state.user.role] || state.user.role;
    }
  }
}

function applyRolePermissions() {
  if (!state.user) return;
  const role = state.user.role;
  
  const btnImportExcel = document.getElementById('btnImportExcel');
  const btnNewVesselManual = document.getElementById('btnNewVesselManual');
  const btnAddCertManual = document.getElementById('btnAddCertManual');
  const btnAddActionableManual = document.getElementById('btnAddActionableManual');
  const btnDeleteVessel = document.getElementById('btnDeleteVessel');
  const btnVesselSettings = document.getElementById('btnVesselSettings');
  const btnManualTriggerCheck = document.getElementById('btnManualTriggerCheck');
  
  if (role === 'Admin') {
    if (btnImportExcel) btnImportExcel.style.display = 'inline-flex';
    if (btnNewVesselManual) btnNewVesselManual.style.display = 'inline-block';
    if (btnAddCertManual) btnAddCertManual.style.display = 'inline-block';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'inline-block';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'inline-block';
    if (btnVesselSettings) btnVesselSettings.style.display = 'inline-block';
    if (btnManualTriggerCheck) btnManualTriggerCheck.style.display = 'inline-block';
  } else if (role === 'Crew') {
    if (btnImportExcel) btnImportExcel.style.display = 'none';
    if (btnNewVesselManual) btnNewVesselManual.style.display = 'none';
    if (btnAddCertManual) btnAddCertManual.style.display = 'inline-block';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'none';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'none';
    if (btnVesselSettings) btnVesselSettings.style.display = 'none';
    if (btnManualTriggerCheck) btnManualTriggerCheck.style.display = 'none';
  } else {
    if (btnImportExcel) btnImportExcel.style.display = 'none';
    if (btnNewVesselManual) btnNewVesselManual.style.display = 'none';
    if (btnAddCertManual) btnAddCertManual.style.display = 'none';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'none';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'none';
    if (btnVesselSettings) btnVesselSettings.style.display = 'none';
    if (btnManualTriggerCheck) btnManualTriggerCheck.style.display = 'none';
  }
  
  if (state.selectedVesselId) {
    renderCertificates();
    renderActionableItems();
  }
}

// ----------------------------------------------------
// BILINGUAL TRANSLATION ENGINE (i18n)
// ----------------------------------------------------
async function loadTranslations(lang) {
  state.lang = lang;
  localStorage.setItem('babor_lang', lang);
  
  const btnFr = document.getElementById('btnLangFr');
  const btnEn = document.getElementById('btnLangEn');
  if (btnFr && btnEn) {
    if (lang === 'fr') {
      btnFr.classList.add('active');
      btnEn.classList.remove('active');
    } else {
      btnEn.classList.add('active');
      btnFr.classList.remove('active');
    }
  }

  try {
    const res = await fetch(`/locales/${lang}.json`);
    translations = await res.json();
    
    // Apply translations
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (translations[key]) {
        el.placeholder = translations[key];
      }
    });

    const titles = {
      'fr': {
        '#dashboard': 'Tableau de bord de la flotte',
        '#fleet': 'Gestion de la Flotte',
        '#logs': 'Historique des Rappels & Logs'
      },
      'en': {
        '#dashboard': 'Fleet Dashboard',
        '#fleet': 'Fleet Management',
        '#logs': 'Reminders & Logs History'
      }
    };
    
    const hash = window.location.hash || '#dashboard';
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl && titles[lang] && titles[lang][hash]) {
      pageTitleEl.textContent = titles[lang][hash];
    }
    
    updateUserProfileUI();
    
    if (state.vessels.length > 0) {
      updateDashboardWidgets();
      renderDashboardVessels();
      renderFleetSidebar();
      if (state.selectedVesselId) {
        // Refresh detail view
        const vessel = state.vessels.find(v => v.id == state.selectedVesselId);
        if (vessel) {
          document.getElementById('vesselDetailName').textContent = vessel.name;
          document.getElementById('vesselDetailImo').textContent = vessel.imo_number || 'N/A';
          document.getElementById('vesselDetailFlag').textContent = vessel.flag || 'N/A';
          document.getElementById('vesselDetailType').textContent = vessel.asset_type || 'N/A';
          
          document.getElementById('specOwner').textContent = vessel.owner || '-';
          document.getElementById('specManager').textContent = vessel.manager || '-';
          document.getElementById('specPort').textContent = vessel.port_of_registry || '-';
          document.getElementById('specCallSign').textContent = vessel.call_sign || '-';
          document.getElementById('specGT').textContent = vessel.gross_tonnage ? vessel.gross_tonnage.toLocaleString() : '-';
          document.getElementById('specDWT').textContent = vessel.deadweight_tonnage ? vessel.deadweight_tonnage.toLocaleString() : '-';
        }
        renderCertificates();
        renderActionableItems();
      }
    }
  } catch (err) {
    console.error('Error loading translations:', err);
  }
}

// ----------------------------------------------------
// SPA ROUTING
// ----------------------------------------------------
function setupSPA() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.app-view');

  function navigateTo(hash) {
    if (hash === '#tv-mode') {
      enterTvMode();
      return;
    }

    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));

    const targetHash = hash || '#dashboard';
    const targetViewId = 'view-' + targetHash.substring(1);
    const targetView = document.getElementById(targetViewId);
    const targetNavItem = document.getElementById('nav-' + targetHash.substring(1));

    if (targetView) targetView.classList.add('active');
    if (targetNavItem) targetNavItem.classList.add('active');

    const titles = {
      'fr': {
        '#dashboard': 'Tableau de bord de la flotte',
        '#fleet': 'Gestion de la Flotte',
        '#logs': 'Historique des Rappels & Logs'
      },
      'en': {
        '#dashboard': 'Fleet Dashboard',
        '#fleet': 'Fleet Management',
        '#logs': 'Reminders & Logs History'
      }
    };
    
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl && titles[state.lang] && titles[state.lang][targetHash]) {
      pageTitleEl.textContent = titles[state.lang][targetHash];
    }
    
    if (state.token && state.user) {
      if (targetHash === '#dashboard') {
        loadVessels();
      } else if (targetHash === '#logs') {
        loadEmailLogs();
      }
    }
  }

  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash);
  });

  navigateTo(window.location.hash);
}

// ----------------------------------------------------
// DATA LOADING
// ----------------------------------------------------
async function loadVessels() {
  try {
    const res = await apiFetch('/api/vessels');
    const data = await res.json();
    state.vessels = data;
    
    updateDashboardWidgets();
    renderDashboardVessels();
    renderFleetSidebar();
    
    if (state.vessels.length > 0 && !state.selectedVesselId) {
      selectVessel(state.vessels[0].id);
    }
  } catch (err) {
    console.error('Error loading vessels:', err);
  }
}

async function selectVessel(id) {
  state.selectedVesselId = id;
  
  document.querySelectorAll('.fleet-vessel-item').forEach(item => {
    if (item.dataset.id == id) item.classList.add('active');
    else item.classList.remove('active');
  });
  
  const vessel = state.vessels.find(v => v.id == id);
  if (!vessel) return;
  
  const emptyState = document.getElementById('noVesselSelected');
  const detailContainer = document.getElementById('vesselDetailContainer');
  if (emptyState) emptyState.style.display = 'none';
  if (detailContainer) detailContainer.style.display = 'block';
  
  document.getElementById('vesselDetailName').textContent = vessel.name;
  document.getElementById('vesselDetailImo').textContent = vessel.imo_number || 'N/A';
  document.getElementById('vesselDetailFlag').textContent = vessel.flag || 'N/A';
  document.getElementById('vesselDetailType').textContent = vessel.asset_type || 'N/A';
  
  document.getElementById('specOwner').textContent = vessel.owner || '-';
  document.getElementById('specManager').textContent = vessel.manager || '-';
  document.getElementById('specPort').textContent = vessel.port_of_registry || '-';
  document.getElementById('specCallSign').textContent = vessel.call_sign || '-';
  document.getElementById('specGT').textContent = vessel.gross_tonnage ? vessel.gross_tonnage.toLocaleString() : '-';
  document.getElementById('specDWT').textContent = vessel.deadweight_tonnage ? vessel.deadweight_tonnage.toLocaleString() : '-';
  
  await Promise.all([
    loadCertificates(id),
    loadActionableItems(id)
  ]);
}

async function loadCertificates(vesselId) {
  try {
    const res = await apiFetch(`/api/vessels/${vesselId}/certificates`);
    state.certificates = await res.json();
    renderCertificates();
  } catch (err) {
    console.error('Error loading certs:', err);
  }
}

async function loadActionableItems(vesselId) {
  try {
    const res = await apiFetch(`/api/vessels/${vesselId}/actionable-items`);
    state.actionableItems = await res.json();
    renderActionableItems();
  } catch (err) {
    console.error('Error loading recommendations:', err);
  }
}

async function loadEmailLogs() {
  try {
    const res = await apiFetch('/api/email-logs');
    state.emailLogs = await res.json();
    renderEmailLogs();
  } catch (err) {
    console.error('Error loading email logs:', err);
  }
}

// ----------------------------------------------------
// RENDERING INTERFACES
// ----------------------------------------------------
function updateDashboardWidgets() {
  let totalRed = 0, totalYellow = 0, totalGreen = 0;
  
  state.vessels.forEach(v => {
    totalRed += v.counts.red || 0;
    totalYellow += v.counts.yellow || 0;
    totalGreen += v.counts.green || 0;
  });
  
  document.getElementById('widget-total-vessels').textContent = state.vessels.length;
  document.getElementById('widget-red-certs').textContent = totalRed;
  document.getElementById('widget-yellow-certs').textContent = totalYellow;
  document.getElementById('widget-green-certs').textContent = totalGreen;
  
  renderComplianceChart(totalRed, totalYellow, totalGreen);
}

function renderComplianceChart(red, yellow, green) {
  const canvas = document.getElementById('fleetComplianceChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let normal = 0;
  state.vessels.forEach(v => {
    normal += v.counts.normal || 0;
  });

  const total = red + yellow + green + normal;
  
  if (state.complianceChart) {
    state.complianceChart.destroy();
  }

  if (total === 0) {
    state.complianceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [state.lang === 'fr' ? 'Aucune donnée' : 'No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#27272a'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }
  
  const labelsFr = ['Urgent / Expire (<30j)', 'Attention (30j-90j)', 'Suivi (90j-180j)', 'Conforme (>180j)'];
  const labelsEn = ['Urgent / Expired (<30d)', 'Warning (30d-90d)', 'Monitored (90d-180d)', 'Compliant (>180d)'];

  state.complianceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: state.lang === 'fr' ? labelsFr : labelsEn,
      datasets: [{
        data: [red, yellow, green, normal],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'rgb(148, 163, 184)',
            font: { family: 'Inter', size: 12 }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function renderDashboardVessels() {
  const container = document.getElementById('dashboardVesselsGrid');
  if (!container) return;
  container.innerHTML = '';
  
  if (state.vessels.length === 0) {
    container.innerHTML = `<p class="placeholder-text">${
      state.lang === 'fr' ? 'Aucun navire configuré. Contactez l\'administrateur.' : 'No vessels configured. Contact your admin.'
    }</p>`;
    return;
  }
  
  state.vessels.forEach(v => {
    const card = document.createElement('div');
    card.className = `vessel-card status-${v.status}`;
    
    // Status translation display
    let statusText = v.status;
    if (state.lang === 'fr') {
      if (v.status === 'Imminent') statusText = 'Imminent';
      else if (v.status === 'Attention') statusText = 'Attention';
      else if (v.status === 'Suivi') statusText = 'Suivi';
      else statusText = 'Normal';
    } else {
      if (v.status === 'Imminent') statusText = 'Urgent';
      else if (v.status === 'Attention') statusText = 'Warning';
      else if (v.status === 'Suivi') statusText = 'Monitored';
      else statusText = 'Normal';
    }

    const badgeClass = v.status === 'Imminent' ? 'badge-red' : v.status === 'Attention' ? 'badge-yellow' : v.status === 'Suivi' ? 'badge-green' : 'badge-normal';

    card.innerHTML = `
      <div class="vessel-card-header">
        <div>
          <h3>${v.name}</h3>
          <span class="vessel-card-imo">IMO ${v.imo_number || 'N/A'}</span>
        </div>
        <span class="badge ${badgeClass}">${statusText}</span>
      </div>
      <div class="vessel-card-stats">
        <div class="vessel-stat-col">
          ${state.lang === 'fr' ? 'Urgents' : 'Urgents'}
          <span class="text-red">${v.counts.red}</span>
        </div>
        <div class="vessel-stat-col">
          ${state.lang === 'fr' ? 'Alertes' : 'Warnings'}
          <span class="text-yellow">${v.counts.yellow}</span>
        </div>
        <div class="vessel-stat-col">
          ${state.lang === 'fr' ? 'Suivis' : 'Monitored'}
          <span class="text-green">${v.counts.green}</span>
        </div>
        <div class="vessel-stat-col">
          Certificats
          <span>${v.counts.total}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      window.location.hash = '#fleet';
      selectVessel(v.id);
    });
    
    container.appendChild(card);
  });

  populateCriticalAlertsList();
}

function populateCriticalAlertsList() {
  const list = document.getElementById('criticalCertsList');
  if (!list) return;
  list.innerHTML = '';
  
  let html = "";
  state.vessels.forEach(v => {
    if (v.status === 'Imminent' || v.status === 'Attention') {
      const msgFr = `${v.name} nécessite des actions de conformité urgentes`;
      const msgEn = `${v.name} requires urgent compliance actions`;
      const urgLabelFr = `${v.counts.red} Urgents | ${v.counts.yellow} Alertes`;
      const urgLabelEn = `${v.counts.red} Urgents | ${v.counts.yellow} Warnings`;

      html += `
        <div class="critical-list-item" style="cursor:pointer;" onclick="window.location.hash='#fleet'; selectVessel(${v.id});">
          <div class="item-left">
            <span class="item-title">${v.name}</span>
            <span class="item-sub">${state.lang === 'fr' ? msgFr : msgEn}</span>
          </div>
          <span class="badge ${v.status === 'Imminent' ? 'badge-red' : 'badge-yellow'}">${
            state.lang === 'fr' ? urgLabelFr : urgLabelEn
          }</span>
        </div>
      `;
    }
  });
  
  if (html === "") {
    list.innerHTML = `<p class="placeholder-text">${
      state.lang === 'fr' ? 'Aucune alerte urgente en cours. Tout est en règle !' : 'No urgent alerts. Everything is in order!'
    }</p>`;
  } else {
    list.innerHTML = html;
  }
}

function renderFleetSidebar() {
  const container = document.getElementById('fleetVesselsList');
  if (!container) return;
  container.innerHTML = '';
  
  state.vessels.forEach(v => {
    const item = document.createElement('div');
    item.className = `fleet-vessel-item ${state.selectedVesselId == v.id ? 'active' : ''}`;
    item.dataset.id = v.id;
    item.innerHTML = `
      <span>${v.name}</span>
      <span class="tv-indicator-circle ${v.status === 'Imminent' ? 'red' : v.status === 'Attention' ? 'yellow' : v.status === 'Suivi' ? 'green' : 'normal'}"></span>
    `;
    item.addEventListener('click', () => selectVessel(v.id));
    container.appendChild(item);
  });
}

function renderCertificates() {
  const tbody = document.getElementById('certsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('certSearchInput').value.toLowerCase();
  const catFilter = document.getElementById('certCategoryFilter').value;
  const statusFilter = document.getElementById('certStatusFilter').value;
  
  const filtered = state.certificates.filter(c => {
    if (searchVal && !c.name.toLowerCase().includes(searchVal)) return false;
    if (catFilter !== 'ALL' && c.category !== catFilter) return false;
    
    if (statusFilter !== 'ALL') {
      const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
      const isYellow = c.alarm_status.includes('YELLOW');
      const isGreen = c.alarm_status.includes('GREEN');
      const isNormal = c.alarm_status.includes('MONITOR') || c.alarm_status.includes('N/A');
      
      if (statusFilter === 'RED' && !isRed) return false;
      if (statusFilter === 'YELLOW' && !isYellow) return false;
      if (statusFilter === 'GREEN' && !isGreen) return false;
      if (statusFilter === 'NORMAL' && !isNormal) return false;
    }
    return true;
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="placeholder-text">${
      state.lang === 'fr' ? 'Aucun certificat correspondant trouvé.' : 'No matching certificates found.'
    }</td></tr>`;
    return;
  }
  
  const catLabels = {
    'Class': state.lang === 'fr' ? 'Classe (LR/Statutaire)' : 'Class (LR/Statutory)',
    'Flag': state.lang === 'fr' ? 'Pavillon' : 'Flag',
    'Servicing': state.lang === 'fr' ? 'Entretien Annuel' : 'Annual Servicing'
  };

  filtered.forEach(c => {
    const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
    const isYellow = c.alarm_status.includes('YELLOW');
    const isGreen = c.alarm_status.includes('GREEN');
    
    const badgeClass = isRed ? 'badge-red' : isYellow ? 'badge-yellow' : isGreen ? 'badge-green' : 'badge-normal';
    
    let alarmDisplay = c.alarm_status;
    if (state.lang === 'fr') {
      if (c.alarm_status.includes('RED')) alarmDisplay = 'ROUGE - <1 MOIS';
      else if (c.alarm_status.includes('YELLOW')) alarmDisplay = 'JAUNE - 1 A 3 MOIS';
      else if (c.alarm_status.includes('GREEN')) alarmDisplay = 'VERT - 3 A 6 MOIS';
      else if (c.alarm_status.includes('MONITOR')) alarmDisplay = 'SUIVI >6 MOIS';
      else if (c.alarm_status.includes('OVERDUE')) alarmDisplay = 'EXPIRÉ / IMMINENT';
    } else {
      if (c.alarm_status.includes('RED')) alarmDisplay = 'RED - <1 MONTH';
      else if (c.alarm_status.includes('YELLOW')) alarmDisplay = 'YELLOW - 1 TO 3 MONTHS';
      else if (c.alarm_status.includes('GREEN')) alarmDisplay = 'GREEN - 3 TO 6 MONTHS';
      else if (c.alarm_status.includes('MONITOR')) alarmDisplay = 'MONITOR >6 MONTHS';
      else if (c.alarm_status.includes('OVERDUE')) alarmDisplay = 'OVERDUE / IMMEDIATE';
    }

    let actionButtons = '';
    const isReadOnly = !state.user || (state.user.role === 'Partner' || state.user.role === 'Auditor');
    const isCrew = state.user && state.user.role === 'Crew';
    
    if (isReadOnly) {
      actionButtons = `<span class="text-muted">${state.lang === 'fr' ? 'Lecture seule' : 'Read-only'}</span>`;
    } else if (isCrew) {
      if (c.category === 'Servicing') {
        actionButtons = `
          <button class="btn btn-sm btn-outline btn-edit-cert" data-id="${c.id}">${state.lang === 'fr' ? 'Mettre à jour' : 'Update'}</button>
        `;
      } else {
        actionButtons = `<span class="text-muted">${state.lang === 'fr' ? 'Restreint' : 'Restricted'}</span>`;
      }
    } else {
      actionButtons = `
        <button class="btn btn-sm btn-outline btn-edit-cert" data-id="${c.id}">${state.lang === 'fr' ? 'Modifier' : 'Edit'}</button>
        <button class="btn btn-sm btn-danger btn-delete-cert" data-id="${c.id}" style="padding: 6px 10px; margin-left: 5px;">✖</button>
      `;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${c.name}</strong>
        ${c.pdf_url ? `<span class="pdf-icon-btn btn-view-pdf" data-url="${c.pdf_url}" data-name="${c.name}" title="${state.lang === 'fr' ? 'Voir le PDF' : 'View PDF'}" style="margin-left: 6px; cursor: pointer;">📎</span>` : ''}
      </td>
      <td>${catLabels[c.category] || c.category}</td>
      <td>${c.organization || '-'}</td>
      <td>${c.issuing_date || '-'}</td>
      <td>${c.expiration_date || '-'}</td>
      <td>${c.due_date || '-'}</td>
      <td><span class="badge ${badgeClass}">${alarmDisplay}</span></td>
      <td><small class="text-secondary">${c.remarks || ''}</small></td>
      <td>${actionButtons}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Attach listeners
  document.querySelectorAll('.btn-edit-cert').forEach(btn => {
    btn.addEventListener('click', (e) => openEditCertModal(e.target.dataset.id));
  });
  document.querySelectorAll('.btn-delete-cert').forEach(btn => {
    btn.addEventListener('click', (e) => deleteCertificate(e.target.dataset.id));
  });
  document.querySelectorAll('.btn-view-pdf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = e.currentTarget.dataset.url;
      const name = e.currentTarget.dataset.name;
      openPdfViewer(url, name);
    });
  });
}

function renderActionableItems() {
  const tbody = document.getElementById('actionableTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (state.actionableItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="placeholder-text">${
      state.lang === 'fr' ? 'Aucune recommandation pour ce navire.' : 'No recommendations for this vessel.'
    }</td></tr>`;
    return;
  }
  
  state.actionableItems.forEach(a => {
    const isCompleted = a.status === 'Completed';
    const isReadOnly = !state.user || (state.user.role === 'Partner' || state.user.role === 'Auditor' || state.user.role === 'Crew');
    
    let toggleBtn = '';
    if (!isReadOnly) {
      toggleBtn = `
        <button class="btn btn-sm ${isCompleted ? 'btn-outline' : 'btn-success'} btn-toggle-act" data-id="${a.id}" data-status="${a.status}">
          ${isCompleted 
            ? (state.lang === 'fr' ? 'Marquer En attente' : 'Mark Pending')
            : (state.lang === 'fr' ? 'Marquer Terminé' : 'Mark Completed')
          }
        </button>
      `;
    } else {
      const label = isCompleted 
        ? (state.lang === 'fr' ? 'Terminé ✓' : 'Done ✓') 
        : (state.lang === 'fr' ? 'En attente' : 'Pending');
      toggleBtn = `<span class="badge ${isCompleted ? 'badge-green' : 'badge-yellow'}">${label}</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code style="font-family: 'Roboto Mono', monospace;">${a.item_id || '-'}</code></td>
      <td>${a.imposed_date || '-'}</td>
      <td>${a.category || '-'}</td>
      <td>${a.report_number || '-'}</td>
      <td><strong>${a.due_date || (state.lang === 'fr' ? 'Non spécifiée' : 'Not specified')}</strong></td>
      <td><div style="max-width: 400px; white-space: normal; font-size: 12px;">${a.description}</div></td>
      <td>${toggleBtn}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.btn-toggle-act').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const curStatus = e.target.dataset.status;
      const nextStatus = curStatus === 'Completed' ? 'Pending' : 'Completed';
      toggleActionableStatus(id, nextStatus);
    });
  });
}

function renderEmailLogs() {
  const tbody = document.getElementById('emailLogsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (state.emailLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="placeholder-text">${
      state.lang === 'fr' ? 'Aucune alarme e-mail envoyée.' : 'No email alerts sent yet.'
    }</td></tr>`;
    return;
  }
  
  state.emailLogs.forEach(l => {
    const isFailure = l.sent_to.includes('Echec') || l.sent_to.includes('Error');
    const badgeClass = l.alarm_level.includes('RED') ? 'badge-red' : l.alarm_level.includes('YELLOW') ? 'badge-yellow' : 'badge-green';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${l.vessel_name}</strong></td>
      <td>${l.certificate_name}</td>
      <td><span class="badge ${badgeClass}">${l.alarm_level}</span></td>
      <td><code style="font-size: 11px;">${l.sent_to}</code></td>
      <td>${l.sent_at}</td>
      <td>
        <span class="badge ${isFailure ? 'badge-red' : 'badge-green'}">
          ${isFailure ? (state.lang === 'fr' ? 'ÉCHEC' : 'FAILED') : (state.lang === 'fr' ? 'ENVOYÉ ✓' : 'SENT ✓')}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// EVENT LISTENERS & MODALS SETUP
// ----------------------------------------------------
function setupEventListeners() {
  const importModal = document.getElementById('modalImportExcel');
  const manualVesselModal = document.getElementById('modalAddVesselManual');
  const editCertModal = document.getElementById('modalEditCert');
  const actionableModal = document.getElementById('modalAddActionable');
  const settingsModal = document.getElementById('modalEmailSettings');

  // Trigger Open Modals
  document.getElementById('btnImportExcel').addEventListener('click', () => importModal.classList.add('active'));
  document.getElementById('btnNewVesselManual').addEventListener('click', () => manualVesselModal.classList.add('active'));
  
  document.getElementById('btnAddCertManual').addEventListener('click', () => {
    document.getElementById('editCertId').value = '';
    document.getElementById('editCertModalTitle').textContent = state.lang === 'fr' ? 'Créer un Certificat' : 'Create Certificate';
    document.getElementById('formEditCert').reset();
    
    const certPdfCurrent = document.getElementById('certPdfCurrent');
    if (certPdfCurrent) certPdfCurrent.textContent = '';
    const pdfField = document.getElementById('certPdfField');
    if (pdfField) pdfField.value = '';
    
    const categorySelector = document.getElementById('editCertCategory');
    if (state.user && state.user.role === 'Crew') {
      categorySelector.value = 'Servicing';
      categorySelector.disabled = true;
    } else {
      categorySelector.disabled = false;
    }
    
    editCertModal.classList.add('active');
  });

  document.getElementById('btnAddActionableManual').addEventListener('click', () => {
    document.getElementById('formAddActionable').reset();
    actionableModal.classList.add('active');
  });

  document.getElementById('btnVesselSettings').addEventListener('click', () => openEmailSettingsModal());

  // Close modals
  document.getElementById('closeImportModal').addEventListener('click', () => importModal.classList.remove('active'));
  document.getElementById('closeManualVesselModal').addEventListener('click', () => manualVesselModal.classList.remove('active'));
  document.getElementById('closeEditCertModal').addEventListener('click', () => editCertModal.classList.remove('active'));
  document.getElementById('closeActionableModal').addEventListener('click', () => actionableModal.classList.remove('active'));
  document.getElementById('closeSettingsModal').addEventListener('click', () => settingsModal.classList.remove('active'));

  document.getElementById('btnCancelImport').addEventListener('click', () => importModal.classList.remove('active'));
  document.getElementById('btnCancelManualVessel').addEventListener('click', () => manualVesselModal.classList.remove('active'));
  document.getElementById('btnCancelEditCert').addEventListener('click', () => editCertModal.classList.remove('active'));
  document.getElementById('btnCancelActionable').addEventListener('click', () => actionableModal.classList.remove('active'));
  document.getElementById('btnCancelSettings').addEventListener('click', () => settingsModal.classList.remove('active'));

  // Drop zone text
  const fileField = document.getElementById('importFileField');
  fileField.addEventListener('change', (e) => {
    const filename = e.target.files[0]?.name || (state.lang === 'fr' ? 'Aucun fichier sélectionné' : 'No file selected');
    document.getElementById('importFileNameDisplay').textContent = filename;
  });

  // Table filters
  document.getElementById('certSearchInput').addEventListener('input', renderCertificates);
  document.getElementById('certCategoryFilter').addEventListener('change', renderCertificates);
  document.getElementById('certStatusFilter').addEventListener('change', renderCertificates);

  // Forms submit
  document.getElementById('formLogin').addEventListener('submit', handleLoginSubmit);
  document.getElementById('formImportExcel').addEventListener('submit', handleExcelImport);
  document.getElementById('formAddVesselManual').addEventListener('submit', handleManualVesselAdd);
  document.getElementById('formEditCert').addEventListener('submit', handleEditCertSubmit);
  document.getElementById('formAddActionable').addEventListener('submit', handleActionableSubmit);
  document.getElementById('formEmailSettings').addEventListener('submit', handleSettingsSubmit);

  // General trigger & operations
  document.getElementById('btnManualTriggerCheck').addEventListener('click', triggerManualEmailCheck);
  document.getElementById('btnDeleteVessel').addEventListener('click', deleteCurrentVessel);
  document.getElementById('btnExportExcelVessel').addEventListener('click', exportVesselExcel);
  
  // Logout
  document.getElementById('btnLogout').addEventListener('click', handleLogout);

  // Language selectors
  document.getElementById('btnLangFr').addEventListener('click', () => loadTranslations('fr'));
  document.getElementById('btnLangEn').addEventListener('click', () => loadTranslations('en'));

  // Close PDF Modal
  document.getElementById('closePdfModal').addEventListener('click', () => {
    const modal = document.getElementById('modalPdfViewer');
    const iframe = document.getElementById('pdfFrame');
    if (modal) modal.classList.remove('active');
    if (iframe) iframe.src = '';
  });

  // TV mode exit
  document.getElementById('btnExitTvMode').addEventListener('click', exitTvMode);
  document.getElementById('nav-tv-mode').addEventListener('click', (e) => {
    e.preventDefault();
    enterTvMode();
  });
}

// ----------------------------------------------------
// ACTIONS & FORM HANDLERS
// ----------------------------------------------------
async function handleExcelImport(e) {
  e.preventDefault();
  const fileField = document.getElementById('importFileField');
  if (fileField.files.length === 0) return;
  
  const formData = new FormData();
  formData.append('file', fileField.files[0]);
  
  const submitBtn = document.getElementById('btnSubmitImport');
  submitBtn.disabled = true;
  submitBtn.textContent = state.lang === 'fr' ? 'Importation...' : 'Importing...';
  
  try {
    const res = await fetch('/api/vessels/import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + state.token
      },
      body: formData
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast(
        state.lang === 'fr' ? `Navire "${result.name}" importé !` : `Vessel "${result.name}" imported!`, 
        'success'
      );
      document.getElementById('modalImportExcel').classList.remove('active');
      document.getElementById('formImportExcel').reset();
      document.getElementById('importFileNameDisplay').textContent = state.lang === 'fr' ? 'Aucun fichier sélectionné' : 'No file selected';
      
      await loadVessels();
      selectVessel(result.vesselId);
    } else {
      showToast(result.error || 'Erreur lors de l\'import', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur lors de l\'import', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = state.lang === 'fr' ? "Lancer l'importation" : 'Start Import';
  }
}

async function handleManualVesselAdd(e) {
  e.preventDefault();
  const name = document.getElementById('manualVesselName').value;
  const imo_number = document.getElementById('manualVesselImo').value;
  const flag = document.getElementById('manualVesselFlag').value;
  const asset_type = document.getElementById('manualVesselType').value;
  const owner = document.getElementById('manualVesselOwner').value;
  const manager = document.getElementById('manualVesselManager').value;
  
  try {
    const res = await apiFetch('/api/vessels/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, imo_number, flag, asset_type, owner, manager })
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast(state.lang === 'fr' ? 'Navire créé avec succès' : 'Vessel created successfully', 'success');
      document.getElementById('modalAddVesselManual').classList.remove('active');
      document.getElementById('formAddVesselManual').reset();
      
      await loadVessels();
      selectVessel(result.id);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function openEditCertModal(certId) {
  const cert = state.certificates.find(c => c.id == certId);
  if (!cert) return;
  
  document.getElementById('editCertId').value = cert.id;
  document.getElementById('editCertModalTitle').textContent = state.lang === 'fr' ? 'Modifier Certificat' : 'Edit Certificate';
  
  document.getElementById('editCertName').value = cert.name;
  document.getElementById('editCertCategory').value = cert.category;
  document.getElementById('editCertOrg').value = cert.organization || '';
  document.getElementById('editCertIssueDate').value = cert.issuing_date || '';
  document.getElementById('editCertExpiryDate').value = cert.expiration_date || '';
  document.getElementById('editCertDueDate').value = cert.due_date || '';
  document.getElementById('editCertWindow').value = cert.window || '';
  document.getElementById('editCertRemarks').value = cert.remarks || '';
  
  const pdfField = document.getElementById('certPdfField');
  if (pdfField) pdfField.value = '';
  
  const certPdfCurrent = document.getElementById('certPdfCurrent');
  if (certPdfCurrent) {
    if (cert.pdf_url) {
      certPdfCurrent.innerHTML = state.lang === 'fr' 
        ? `📎 <a href="#" class="btn-view-pdf" data-url="${cert.pdf_url}" data-name="${cert.name}" style="color:var(--primary-color); text-decoration:underline;">Voir le PDF actuel</a>`
        : `📎 <a href="#" class="btn-view-pdf" data-url="${cert.pdf_url}" data-name="${cert.name}" style="color:var(--primary-color); text-decoration:underline;">View current PDF</a>`;
      
      certPdfCurrent.querySelector('.btn-view-pdf').addEventListener('click', (e) => {
        e.preventDefault();
        openPdfViewer(cert.pdf_url, cert.name);
      });
    } else {
      certPdfCurrent.textContent = state.lang === 'fr' ? 'Aucun PDF téléversé' : 'No PDF uploaded';
    }
  }

  const catSelector = document.getElementById('editCertCategory');
  const nameInput = document.getElementById('editCertName');
  if (state.user && state.user.role === 'Crew') {
    nameInput.disabled = true;
    catSelector.disabled = true;
  } else {
    nameInput.disabled = false;
    catSelector.disabled = false;
  }

  document.getElementById('modalEditCert').classList.add('active');
}

async function handleEditCertSubmit(e) {
  e.preventDefault();
  const certId = document.getElementById('editCertId').value;
  const name = document.getElementById('editCertName').value;
  const category = document.getElementById('editCertCategory').value;
  const organization = document.getElementById('editCertOrg').value;
  const issuing_date = document.getElementById('editCertIssueDate').value;
  const expiration_date = document.getElementById('editCertExpiryDate').value;
  const due_date = document.getElementById('editCertDueDate').value;
  const windowVal = document.getElementById('editCertWindow').value;
  const remarks = document.getElementById('editCertRemarks').value;
  
  const payload = { organization, issuing_date, expiration_date, due_date, window: windowVal, remarks };
  
  try {
    let url = `/api/certificates/${certId}`;
    let method = 'PUT';
    
    if (!certId) {
      url = `/api/vessels/${state.selectedVesselId}/certificates`;
      method = 'POST';
      payload.name = name;
      payload.category = category;
    }
    
    const res = await apiFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const resultData = await res.json();
      const savedCertId = certId || resultData.id;
      
      // Handle PDF upload if selected
      const pdfField = document.getElementById('certPdfField');
      if (pdfField && pdfField.files.length > 0) {
        const formData = new FormData();
        formData.append('pdf', pdfField.files[0]);
        
        const uploadRes = await fetch(`/api/certificates/${savedCertId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + state.token
          },
          body: formData
        });
        
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          showToast(`Erreur PDF : ${uploadErr.error || 'Erreur inconnue'}`, 'error');
        } else {
          showToast(state.lang === 'fr' ? 'PDF téléversé avec succès !' : 'PDF uploaded successfully!', 'success');
        }
      }
      
      showToast(certId 
        ? (state.lang === 'fr' ? 'Certificat mis à jour' : 'Certificate updated')
        : (state.lang === 'fr' ? 'Certificat créé' : 'Certificate created'), 
        'success'
      );
      
      document.getElementById('modalEditCert').classList.remove('active');
      document.getElementById('formEditCert').reset();
      
      await loadVessels();
      await selectVessel(state.selectedVesselId);
    } else {
      const errData = await res.json();
      showToast(errData.error, 'error');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function deleteCertificate(certId) {
  const confirmMsg = state.lang === 'fr' 
    ? 'Êtes-vous sûr de vouloir supprimer ce certificat ?' 
    : 'Are you sure you want to delete this certificate?';
    
  if (!confirm(confirmMsg)) return;
  try {
    const res = await apiFetch(`/api/certificates/${certId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(state.lang === 'fr' ? 'Certificat supprimé' : 'Certificate deleted', 'success');
      await loadVessels();
      await selectVessel(state.selectedVesselId);
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function handleActionableSubmit(e) {
  e.preventDefault();
  const imposed_date = document.getElementById('actImposedDate').value;
  const category = document.getElementById('actCategory').value;
  const report_number = document.getElementById('actReportNum').value;
  const due_date = document.getElementById('actDueDate').value;
  const description = document.getElementById('actDescription').value;
  
  try {
    const res = await apiFetch(`/api/vessels/${state.selectedVesselId}/actionable-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imposed_date, category, report_number, due_date, description })
    });
    
    if (res.ok) {
      showToast(state.lang === 'fr' ? 'Recommandation ajoutée' : 'Recommendation added', 'success');
      document.getElementById('modalAddActionable').classList.remove('active');
      await loadActionableItems(state.selectedVesselId);
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function toggleActionableStatus(id, newStatus) {
  try {
    const res = await apiFetch(`/api/actionable-items/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      const msg = newStatus === 'Completed'
        ? (state.lang === 'fr' ? 'Marqué comme terminé ✓' : 'Marked as completed ✓')
        : (state.lang === 'fr' ? 'Marqué comme en attente' : 'Marked as pending');
      showToast(msg, 'success');
      await loadActionableItems(state.selectedVesselId);
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function openEmailSettingsModal() {
  try {
    const res = await apiFetch(`/api/vessels/${state.selectedVesselId}/settings`);
    const settings = await res.json();
    
    document.getElementById('settingsVesselId').value = state.selectedVesselId;
    document.getElementById('settingsEmail1').value = settings.email1 || '';
    document.getElementById('settingsEmail2').value = settings.email2 || '';
    document.getElementById('settingsEmail3').value = settings.email3 || '';
    
    document.getElementById('modalEmailSettings').classList.add('active');
  } catch (err) {
    showToast('Erreur de chargement des paramètres', 'error');
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const vesselId = document.getElementById('settingsVesselId').value;
  const email1 = document.getElementById('settingsEmail1').value;
  const email2 = document.getElementById('settingsEmail2').value;
  const email3 = document.getElementById('settingsEmail3').value;
  
  try {
    const res = await apiFetch(`/api/vessels/${vesselId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email1, email2, email3 })
    });
    
    if (res.ok) {
      showToast(state.lang === 'fr' ? 'Adresses e-mail enregistrées' : 'Email settings updated', 'success');
      document.getElementById('modalEmailSettings').classList.remove('active');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function triggerManualEmailCheck() {
  const btn = document.getElementById('btnManualTriggerCheck');
  btn.disabled = true;
  btn.textContent = state.lang === 'fr' ? 'Vérification...' : 'Checking...';
  
  try {
    const res = await apiFetch('/api/trigger-notifications', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      const msg = state.lang === 'fr'
        ? `Vérification effectuée. ${result.checked} certificats analysés, ${result.alerts} alertes e-mail.`
        : `Check complete. ${result.checked} certificates analyzed, ${result.alerts} email alerts generated.`;
      showToast(msg, 'success');
      await loadEmailLogs();
    }
  } catch (err) {
    showToast('Erreur lors du déclenchement du script', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = state.lang === 'fr' ? '⚡ Déclencher Test Alarme E-mail' : '⚡ Trigger Email Alert Check';
  }
}

async function deleteCurrentVessel() {
  const confirmMsg = state.lang === 'fr'
    ? 'Êtes-vous absolument sûr de vouloir supprimer ce navire et toutes ses données associées ? Cette action est irréversible.'
    : 'Are you absolutely sure you want to delete this vessel and all its associated data? This action is irreversible.';

  if (!confirm(confirmMsg)) return;
  
  try {
    const res = await apiFetch(`/api/vessels/${state.selectedVesselId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(state.lang === 'fr' ? 'Navire supprimé avec succès' : 'Vessel deleted successfully', 'success');
      state.selectedVesselId = null;
      await loadVessels();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

function exportVesselExcel() {
  if (!state.selectedVesselId) return;
  const url = `/api/vessels/${state.selectedVesselId}/export?token=${encodeURIComponent(state.token)}&lang=${state.lang}`;
  window.open(url);
  showToast(
    state.lang === 'fr' ? 'Téléchargement du rapport Excel formaté lancé...' : 'Formatted Excel report download started...', 
    'success'
  );
}

function openPdfViewer(url, name) {
  const modal = document.getElementById('modalPdfViewer');
  const iframe = document.getElementById('pdfFrame');
  const title = document.getElementById('pdfViewerTitle');
  
  if (modal && iframe) {
    iframe.src = url;
    if (title) {
      title.textContent = `${translations['pdf_viewer_title'] || 'Prévisualisation'} - ${name}`;
    }
    modal.classList.add('active');
  }
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// CSS injection for toast animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastFadeOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(50px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ----------------------------------------------------
// OFFICE TV DASHBOARD
// ----------------------------------------------------
let tvInterval = null;

function enterTvMode() {
  document.getElementById('mainAppGrid').style.display = 'none';
  document.getElementById('view-tv-mode').style.display = 'flex';
  
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
  
  renderTvDashboard();
  
  tvInterval = setInterval(async () => {
    await loadVessels();
    renderTvDashboard();
  }, 30000);
}

function exitTvMode() {
  document.getElementById('view-tv-mode').style.display = 'none';
  document.getElementById('mainAppGrid').style.display = 'grid';
  
  if (document.exitFullscreen && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  
  if (tvInterval) {
    clearInterval(tvInterval);
    tvInterval = null;
  }
  
  window.location.hash = '#dashboard';
}

function updateTvTime() {
  const timeEl = document.getElementById('tv-current-time');
  const dateEl = document.getElementById('tv-current-date');
  if (!timeEl || !dateEl) return;
  
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = `${hours}:${minutes}:${seconds}`;
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString(state.lang === 'fr' ? 'fr-FR' : 'en-US', options);
}

async function renderTvDashboard() {
  const listEl = document.getElementById('tvVesselList');
  const scrollEl = document.getElementById('tvAlertsScroll');
  if (!listEl || !scrollEl) return;
  
  listEl.innerHTML = '';
  scrollEl.innerHTML = '';
  
  let totalRed = 0, totalYellow = 0;
  let allCriticalCerts = [];
  
  for (const v of state.vessels) {
    totalRed += v.counts.red || 0;
    totalYellow += v.counts.yellow || 0;
    
    const row = document.createElement('div');
    row.className = 'tv-vessel-row';
    row.innerHTML = `
      <div class="tv-vessel-row-left">
        <span class="tv-vessel-name">${v.name}</span>
        <span class="tv-vessel-meta">IMO ${v.imo_number || 'N/A'} | Flag ${v.flag || 'N/A'}</span>
      </div>
      <div class="tv-vessel-status-indicator">
        <span class="tv-indicator-circle ${v.status === 'Imminent' ? 'red' : v.status === 'Attention' ? 'yellow' : v.status === 'Suivi' ? 'green' : 'normal'}"></span>
      </div>
    `;
    listEl.appendChild(row);
    
    try {
      const res = await apiFetch(`/api/vessels/${v.id}/certificates`);
      const certs = await res.json();
      
      certs.forEach(c => {
        const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
        const isYellow = c.alarm_status.includes('YELLOW');
        const isGreen = c.alarm_status.includes('GREEN');
        
        if (isRed || isYellow || isGreen) {
          allCriticalCerts.push({
            vessel_name: v.name,
            cert_name: c.name,
            due_date: c.due_date || c.expiration_date || 'N/A',
            alarm_status: c.alarm_status,
            level: isRed ? 'red' : isYellow ? 'yellow' : 'green'
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
  }
  
  document.getElementById('tv-count-red').textContent = totalRed;
  document.getElementById('tv-count-yellow').textContent = totalYellow;
  
  const totalCertsCount = state.vessels.reduce((acc, curr) => acc + curr.counts.total, 0);
  const compliantCount = state.vessels.reduce((acc, curr) => acc + curr.counts.normal + curr.counts.green, 0);
  const rate = totalCertsCount > 0 ? Math.round((compliantCount / totalCertsCount) * 100) : 100;
  document.getElementById('tv-compliance-rate').textContent = `${rate}%`;
  
  allCriticalCerts.sort((a, b) => {
    const order = { 'red': 1, 'yellow': 2, 'green': 3 };
    return order[a.level] - order[b.level];
  });
  
  if (allCriticalCerts.length === 0) {
    scrollEl.innerHTML = `<p class="placeholder-text" style="color:rgba(255,255,255,0.4)">${
      state.lang === 'fr' ? 'Aucune alerte active dans la flotte. Statut conforme.' : 'No active alerts in fleet. Compliant status.'
    }</p>`;
    return;
  }
  
  allCriticalCerts.forEach(item => {
    const div = document.createElement('div');
    div.className = `tv-alert-item tv-alert-${item.level}`;
    
    let alarmDisplay = item.alarm_status;
    if (state.lang === 'fr') {
      if (item.alarm_status.includes('RED')) alarmDisplay = 'ROUGE - <1 MOIS';
      else if (item.alarm_status.includes('YELLOW')) alarmDisplay = 'JAUNE - 1 A 3 MOIS';
      else if (item.alarm_status.includes('GREEN')) alarmDisplay = 'VERT - 3 A 6 MOIS';
      else if (item.alarm_status.includes('MONITOR')) alarmDisplay = 'SUIVI >6 MOIS';
      else if (item.alarm_status.includes('OVERDUE')) alarmDisplay = 'EXPIRÉ / IMMINENT';
    } else {
      if (item.alarm_status.includes('RED')) alarmDisplay = 'RED - <1 MONTH';
      else if (item.alarm_status.includes('YELLOW')) alarmDisplay = 'YELLOW - 1 TO 3 MONTHS';
      else if (item.alarm_status.includes('GREEN')) alarmDisplay = 'GREEN - 3 TO 6 MONTHS';
      else if (item.alarm_status.includes('MONITOR')) alarmDisplay = 'MONITOR >6 MONTHS';
      else if (item.alarm_status.includes('OVERDUE')) alarmDisplay = 'OVERDUE / IMMEDIATE';
    }

    div.innerHTML = `
      <div class="tv-alert-item-left">
        <span class="tv-alert-vessel">${item.vessel_name}</span>
        <span class="tv-alert-name">${item.cert_name}</span>
        <span class="tv-alert-due">${state.lang === 'fr' ? 'Échéance' : 'Due'}: ${item.due_date}</span>
      </div>
      <span class="tv-alert-status ${item.level === 'red' ? 'text-red' : item.level === 'yellow' ? 'text-yellow' : 'text-green'}">
        ${alarmDisplay}
      </span>
    `;
    scrollEl.appendChild(div);
  });
  
  startTvScrollAnimation();
}

function startTvScrollAnimation() {
  const container = document.getElementById('tvAlertsScroll');
  if (!container) return;
  
  let scrollAmount = 0;
  const scrollStep = 1;
  const delay = 50;
  
  let scrollId = setInterval(() => {
    if (document.getElementById('view-tv-mode').style.display === 'none') {
      clearInterval(scrollId);
      return;
    }
    
    container.scrollTop += scrollStep;
    if (container.scrollTop >= (container.scrollHeight - container.clientHeight)) {
      setTimeout(() => {
        container.scrollTop = 0;
      }, 2000);
    }
  }, delay);
}
