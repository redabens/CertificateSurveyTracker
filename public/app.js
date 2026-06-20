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
  currentRole: 'Admin', // Default demo role
  complianceChart: null
};

// Current Date for reference (local mock date from system metadata)
const RUNTIME_DATE = "2026-06-20";

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupSPA();
  setupRoleSelector();
  setupEventListeners();
  loadVessels();
  loadEmailLogs();
  
  // Start TV Time Ticker
  setInterval(updateTvTime, 1000);
});

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

    // Standard views navigation
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));

    const targetHash = hash || '#dashboard';
    const targetViewId = 'view-' + targetHash.substring(1);
    const targetView = document.getElementById(targetViewId);
    const targetNavItem = document.getElementById('nav-' + targetHash.substring(1));

    if (targetView) targetView.classList.add('active');
    if (targetNavItem) targetNavItem.classList.add('active');

    // Update Header Title
    const titles = {
      '#dashboard': 'Tableau de bord de la flotte',
      '#fleet': 'Gestion de la Flotte',
      '#logs': 'Historique des Rappels & Logs'
    };
    document.getElementById('pageTitle').textContent = titles[targetHash] || 'Babor Tracker';
    
    // Trigger specific views logic
    if (targetHash === '#dashboard') {
      loadVessels();
    } else if (targetHash === '#logs') {
      loadEmailLogs();
    }
  }

  // Handle Hash Changes
  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash);
  });

  // Load Initial Hash
  navigateTo(window.location.hash);
}

// ----------------------------------------------------
// ROLE MANAGER (DEMO PERMISSIONS)
// ----------------------------------------------------
function setupRoleSelector() {
  const selector = document.getElementById('roleSelector');
  selector.addEventListener('change', (e) => {
    state.currentRole = e.target.value;
    
    // Update Profile Display
    const roleBadges = {
      'Admin': 'Administrateur',
      'Crew': 'Équipage (Capitaine)',
      'Partner': 'Partenaire B2B',
      'Auditor': 'Auditeur Externe'
    };
    
    document.getElementById('currentUserName').textContent = 
      state.currentRole === 'Admin' ? 'Mehdi' : 
      state.currentRole === 'Crew' ? 'Cdt. Babor' : 
      state.currentRole === 'Partner' ? 'Partenaire B2B' : 'Inspecteur LR';
      
    document.getElementById('currentUserRoleBadge').textContent = roleBadges[state.currentRole];
    
    applyRolePermissions();
    showToast(`Rôle changé vers: ${roleBadges[state.currentRole]}`, 'info');
  });
  
  applyRolePermissions();
}

function applyRolePermissions() {
  const role = state.currentRole;
  
  // Admin button permissions
  const btnImportExcel = document.getElementById('btnImportExcel');
  const btnNewVesselManual = document.getElementById('btnNewVesselManual');
  const btnAddCertManual = document.getElementById('btnAddCertManual');
  const btnAddActionableManual = document.getElementById('btnAddActionableManual');
  const btnDeleteVessel = document.getElementById('btnDeleteVessel');
  const btnVesselSettings = document.getElementById('btnVesselSettings');
  
  if (role === 'Admin') {
    btnImportExcel.style.display = 'inline-flex';
    btnNewVesselManual.style.display = 'inline-block';
    if (btnAddCertManual) btnAddCertManual.style.display = 'inline-block';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'inline-block';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'inline-block';
    if (btnVesselSettings) btnVesselSettings.style.display = 'inline-block';
  } else if (role === 'Crew') {
    btnImportExcel.style.display = 'none';
    btnNewVesselManual.style.display = 'none';
    // Crew can add/edit servicing certs
    if (btnAddCertManual) btnAddCertManual.style.display = 'inline-block';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'none';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'none';
    if (btnVesselSettings) btnVesselSettings.style.display = 'none';
  } else {
    // Partner & Auditor are view only
    btnImportExcel.style.display = 'none';
    btnNewVesselManual.style.display = 'none';
    if (btnAddCertManual) btnAddCertManual.style.display = 'none';
    if (btnAddActionableManual) btnAddActionableManual.style.display = 'none';
    if (btnDeleteVessel) btnDeleteVessel.style.display = 'none';
    if (btnVesselSettings) btnVesselSettings.style.display = 'none';
  }
  
  // Refresh the active table to update row actions (Edit/Delete buttons)
  if (state.selectedVesselId) {
    renderCertificates();
    renderActionableItems();
  }
}

// ----------------------------------------------------
// API REQUESTS & DATA LOADING
// ----------------------------------------------------
async function loadVessels() {
  try {
    const res = await fetch('/api/vessels');
    const data = await res.json();
    state.vessels = data;
    
    updateDashboardWidgets();
    renderDashboardVessels();
    renderFleetSidebar();
    
    // Auto-select first vessel if none selected
    if (state.vessels.length > 0 && !state.selectedVesselId) {
      selectVessel(state.vessels[0].id);
    }
  } catch (err) {
    console.error('Error loading vessels:', err);
    showToast('Erreur de connexion avec le serveur', 'error');
  }
}

async function selectVessel(id) {
  state.selectedVesselId = id;
  
  // Update sidebar active class
  document.querySelectorAll('.fleet-vessel-item').forEach(item => {
    if (item.dataset.id == id) item.classList.add('active');
    else item.classList.remove('active');
  });
  
  // Load vessel data
  const vessel = state.vessels.find(v => v.id == id);
  if (!vessel) return;
  
  document.getElementById('noVesselSelected').style.display = 'none';
  document.getElementById('vesselDetailContainer').style.display = 'block';
  
  // Fill Header Info
  document.getElementById('vesselDetailName').textContent = vessel.name;
  document.getElementById('vesselDetailImo').textContent = vessel.imo_number || 'N/A';
  document.getElementById('vesselDetailFlag').textContent = vessel.flag || 'N/A';
  document.getElementById('vesselDetailType').textContent = vessel.asset_type || 'N/A';
  
  // Fill Specifications
  document.getElementById('specOwner').textContent = vessel.owner || '-';
  document.getElementById('specManager').textContent = vessel.manager || '-';
  document.getElementById('specPort').textContent = vessel.port_of_registry || '-';
  document.getElementById('specCallSign').textContent = vessel.call_sign || '-';
  document.getElementById('specGT').textContent = vessel.gross_tonnage ? vessel.gross_tonnage.toLocaleString() : '-';
  document.getElementById('specDWT').textContent = vessel.deadweight_tonnage ? vessel.deadweight_tonnage.toLocaleString() : '-';
  
  // Fetch Certs & Actionable Items
  await Promise.all([
    loadCertificates(id),
    loadActionableItems(id)
  ]);
}

async function loadCertificates(vesselId) {
  try {
    const res = await fetch(`/api/vessels/${vesselId}/certificates`);
    state.certificates = await res.json();
    renderCertificates();
  } catch (err) {
    console.error('Error loading certs:', err);
  }
}

async function loadActionableItems(vesselId) {
  try {
    const res = await fetch(`/api/vessels/${vesselId}/actionable-items`);
    state.actionableItems = await res.json();
    renderActionableItems();
  } catch (err) {
    console.error('Error loading actionable items:', err);
  }
}

async function loadEmailLogs() {
  try {
    const res = await fetch('/api/email-logs');
    state.emailLogs = await res.json();
    renderEmailLogs();
  } catch (err) {
    console.error('Error loading email logs:', err);
  }
}

// ----------------------------------------------------
// RENDERING FUNCTIONS
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
  const ctx = document.getElementById('fleetComplianceChart').getContext('2d');
  
  // Calculate normal/OK certificates
  let normal = 0;
  state.vessels.forEach(v => {
    normal += v.counts.normal || 0;
  });

  const total = red + yellow + green + normal;
  
  if (state.complianceChart) {
    state.complianceChart.destroy();
  }

  if (total === 0) {
    // Empty state chart
    state.complianceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aucune donnée'],
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
  
  state.complianceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Urgent / Expire (<30j)', 'Attention (30j-90j)', 'Suivi (90j-180j)', 'Conforme (>180j)'],
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
  container.innerHTML = '';
  
  if (state.vessels.length === 0) {
    container.innerHTML = `<p class="placeholder-text">Aucun navire configuré. Cliquez sur "Importer Navire" pour commencer.</p>`;
    return;
  }
  
  state.vessels.forEach(v => {
    const card = document.createElement('div');
    card.className = `vessel-card status-${v.status}`;
    card.innerHTML = `
      <div class="vessel-card-header">
        <div>
          <h3>${v.name}</h3>
          <span class="vessel-card-imo">IMO ${v.imo_number || 'N/A'}</span>
        </div>
        <span class="badge ${v.status === 'Imminent' ? 'badge-red' : v.status === 'Attention' ? 'badge-yellow' : v.status === 'Suivi' ? 'badge-green' : 'badge-normal'}">${v.status}</span>
      </div>
      <div class="vessel-card-stats">
        <div class="vessel-stat-col">
          Urgents
          <span class="text-red">${v.counts.red}</span>
        </div>
        <div class="vessel-stat-col">
          Alertes
          <span class="text-yellow">${v.counts.yellow}</span>
        </div>
        <div class="vessel-stat-col">
          Suivis
          <span class="text-green">${v.counts.green}</span>
        </div>
        <div class="vessel-stat-col">
          Certificats
          <span>${v.counts.total}</span>
        </div>
      </div>
    `;
    
    // Click opens in Fleet Detail
    card.addEventListener('click', () => {
      window.location.hash = '#fleet';
      selectVessel(v.id);
    });
    
    container.appendChild(card);
  });

  // Populate urgent dashboard list
  populateCriticalAlertsList();
}

function populateCriticalAlertsList() {
  const list = document.getElementById('criticalCertsList');
  list.innerHTML = '';
  
  let criticalItems = [];
  
  // Loop through all vessels and find red/yellow certificates
  state.vessels.forEach(v => {
    // Fetch critical details. We request them dynamically or map from state.
    // To make it easy, we can list urgent certificates for each vessel if loaded.
  });
  
  // Since we haven't loaded certificates for all vessels locally in one go,
  // we will trigger a background fetch or query of critical items from the REST API,
  // or simply build the list from certificates we have or compute them.
  // For the demo dashboard list, let's call a query or compile from loaded data.
  // Let's write a quick API request in server.js or fetch it from vessels state counts.
  // Let's make a request or compile.
  
  // Let's compile what's currently in state.certificates if selected. Or show a list.
  // Better yet, we can query an endpoint or build it dynamically:
  const criticalCerts = [];
  
  // We will build a list from the current vessels
  let html = "";
  
  state.vessels.forEach(v => {
    if (v.status === 'Imminent' || v.status === 'Attention') {
      html += `
        <div class="critical-list-item" onclick="window.location.hash='#fleet'; selectVessel(${v.id});">
          <div class="item-left">
            <span class="item-title">${v.name}</span>
            <span class="item-sub">Le navire nécessite des actions de conformité urgentes</span>
          </div>
          <span class="badge ${v.status === 'Imminent' ? 'badge-red' : 'badge-yellow'}">${v.counts.red} Urgents | ${v.counts.yellow} Alertes</span>
        </div>
      `;
    }
  });
  
  if (html === "") {
    list.innerHTML = `<p class="placeholder-text">Aucun navire n'a d'alertes en cours. Tout est en règle !</p>`;
  } else {
    list.innerHTML = html;
  }
}

function renderFleetSidebar() {
  const container = document.getElementById('fleetVesselsList');
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
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('certSearchInput').value.toLowerCase();
  const catFilter = document.getElementById('certCategoryFilter').value;
  const statusFilter = document.getElementById('certStatusFilter').value;
  
  const filtered = state.certificates.filter(c => {
    // Search
    if (searchVal && !c.name.toLowerCase().includes(searchVal)) return false;
    // Category
    if (catFilter !== 'ALL' && c.category !== catFilter) return false;
    // Status
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
    tbody.innerHTML = `<tr><td colspan="9" class="placeholder-text">Aucun certificat correspondant trouvé.</td></tr>`;
    return;
  }
  
  filtered.forEach(c => {
    const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
    const isYellow = c.alarm_status.includes('YELLOW');
    const isGreen = c.alarm_status.includes('GREEN');
    
    const badgeClass = isRed ? 'badge-red' : isYellow ? 'badge-yellow' : isGreen ? 'badge-green' : 'badge-normal';
    
    // Format Category display
    const catLabels = {
      'Class': 'Classe (LR/Statutaire)',
      'Flag': 'Pavillon',
      'Servicing': 'Entretien Annuel'
    };
    
    const tr = document.createElement('tr');
    
    // Action buttons based on Role permissions
    let actionButtons = '';
    const isReadOnly = (state.currentRole === 'Partner' || state.currentRole === 'Auditor');
    const isCrew = state.currentRole === 'Crew';
    
    if (isReadOnly) {
      actionButtons = `<span class="text-muted">Lecture seule</span>`;
    } else if (isCrew) {
      // Crew can only edit Servicing certificates
      if (c.category === 'Servicing') {
        actionButtons = `
          <button class="btn btn-sm btn-outline btn-edit-cert" data-id="${c.id}">Mettre à jour</button>
        `;
      } else {
        actionButtons = `<span class="text-muted">Restreint</span>`;
      }
    } else {
      // Admin has full control
      actionButtons = `
        <button class="btn btn-sm btn-outline btn-edit-cert" data-id="${c.id}">Modifier</button>
        <button class="btn btn-sm btn-danger btn-delete-cert" data-id="${c.id}" style="padding: 6px 10px; margin-left: 5px;">✖</button>
      `;
    }
    
    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${catLabels[c.category] || c.category}</td>
      <td>${c.organization || '-'}</td>
      <td>${c.issuing_date || '-'}</td>
      <td>${c.expiration_date || '-'}</td>
      <td>${c.due_date || '-'}</td>
      <td><span class="badge ${badgeClass}">${c.alarm_status}</span></td>
      <td><small class="text-secondary">${c.remarks || ''}</small></td>
      <td>${actionButtons}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Attach listeners to newly rendered action buttons
  document.querySelectorAll('.btn-edit-cert').forEach(btn => {
    btn.addEventListener('click', (e) => openEditCertModal(e.target.dataset.id));
  });
  document.querySelectorAll('.btn-delete-cert').forEach(btn => {
    btn.addEventListener('click', (e) => deleteCertificate(e.target.dataset.id));
  });
}

function renderActionableItems() {
  const tbody = document.getElementById('actionableTableBody');
  tbody.innerHTML = '';
  
  if (state.actionableItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="placeholder-text">Aucune recommandation pour ce navire.</td></tr>`;
    return;
  }
  
  state.actionableItems.forEach(a => {
    const isCompleted = a.status === 'Completed';
    const isReadOnly = (state.currentRole === 'Partner' || state.currentRole === 'Auditor' || state.currentRole === 'Crew');
    
    let toggleBtn = '';
    if (!isReadOnly) {
      toggleBtn = `
        <button class="btn btn-sm ${isCompleted ? 'btn-outline' : 'btn-success'} btn-toggle-act" data-id="${a.id}" data-status="${a.status}">
          Marquer comme ${isCompleted ? 'En attente' : 'Terminé'}
        </button>
      `;
    } else {
      toggleBtn = `<span class="badge ${isCompleted ? 'badge-green' : 'badge-yellow'}">${isCompleted ? 'Fait' : 'En attente'}</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code style="font-family: 'Roboto Mono', monospace;">${a.item_id || '-'}</code></td>
      <td>${a.imposed_date || '-'}</td>
      <td>${a.category || '-'}</td>
      <td>${a.report_number || '-'}</td>
      <td><strong>${a.due_date || 'Non spécifiée'}</strong></td>
      <td><div style="max-width: 400px; white-space: normal; font-size: 12px;">${a.description}</div></td>
      <td>${toggleBtn}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Attach listeners to toggle buttons
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
  tbody.innerHTML = '';
  
  if (state.emailLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="placeholder-text">Aucune alarme e-mail n'a été envoyée pour le moment.</td></tr>`;
    return;
  }
  
  state.emailLogs.forEach(l => {
    const isFailure = l.sent_to.includes('Echec');
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
          ${isFailure ? 'ÉCHEC' : 'ENVOYÉ ✓'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// DIALOGS & FORM SUBMISSIONS
// ----------------------------------------------------
function setupEventListeners() {
  // Modal toggle handlers
  const importModal = document.getElementById('modalImportExcel');
  const manualVesselModal = document.getElementById('modalAddVesselManual');
  const editCertModal = document.getElementById('modalEditCert');
  const actionableModal = document.getElementById('modalAddActionable');
  const settingsModal = document.getElementById('modalEmailSettings');

  // Trigger Open Modals
  document.getElementById('btnImportExcel').addEventListener('click', () => importModal.classList.add('active'));
  document.getElementById('btnNewVesselManual').addEventListener('click', () => manualVesselModal.classList.add('active'));
  
  document.getElementById('btnAddCertManual').addEventListener('click', () => {
    // Reset Edit Modal for creation
    document.getElementById('editCertId').value = '';
    document.getElementById('editCertModalTitle').textContent = 'Créer un Certificat';
    document.getElementById('formEditCert').reset();
    
    // Disable inputs based on permissions (if Captain, lock to Servicing)
    const categorySelector = document.getElementById('editCertCategory');
    if (state.currentRole === 'Crew') {
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

  // Close modals buttons
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

  // File Field styling
  const fileField = document.getElementById('importFileField');
  fileField.addEventListener('change', (e) => {
    const filename = e.target.files[0]?.name || 'Aucun fichier sélectionné';
    document.getElementById('importFileNameDisplay').textContent = filename;
  });

  // Table filters listeners
  document.getElementById('certSearchInput').addEventListener('input', renderCertificates);
  document.getElementById('certCategoryFilter').addEventListener('change', renderCertificates);
  document.getElementById('certStatusFilter').addEventListener('change', renderCertificates);

  // Form Submissions
  document.getElementById('formImportExcel').addEventListener('submit', handleExcelImport);
  document.getElementById('formAddVesselManual').addEventListener('submit', handleManualVesselAdd);
  document.getElementById('formEditCert').addEventListener('submit', handleEditCertSubmit);
  document.getElementById('formAddActionable').addEventListener('submit', handleActionableSubmit);
  document.getElementById('formEmailSettings').addEventListener('submit', handleSettingsSubmit);

  // Manual cron trigger check
  document.getElementById('btnManualTriggerCheck').addEventListener('click', triggerManualEmailCheck);
  
  // Delete Vessel
  document.getElementById('btnDeleteVessel').addEventListener('click', deleteCurrentVessel);
  
  // Export Excel
  document.getElementById('btnExportExcelVessel').addEventListener('click', exportVesselExcel);
  
  // TV Mode togglers
  document.getElementById('btnExitTvMode').addEventListener('click', exitTvMode);
  
  // Sidebar TV item click
  document.getElementById('nav-tv-mode').addEventListener('click', (e) => {
    e.preventDefault();
    enterTvMode();
  });
}

// REST API call actions
async function handleExcelImport(e) {
  e.preventDefault();
  const fileField = document.getElementById('importFileField');
  if (fileField.files.length === 0) return;
  
  const formData = new FormData();
  formData.append('file', fileField.files[0]);
  
  const submitBtn = document.getElementById('btnSubmitImport');
  submitBtn.disabled = true;
  submitBtn.textContent = "Importation en cours...";
  
  try {
    const res = await fetch('/api/vessels/import', {
      method: 'POST',
      body: formData
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast(`Navire "${result.name}" importé avec succès !`, 'success');
      document.getElementById('modalImportExcel').classList.remove('active');
      document.getElementById('formImportExcel').reset();
      document.getElementById('importFileNameDisplay').textContent = 'Aucun fichier sélectionné';
      
      await loadVessels();
      selectVessel(result.vesselId);
    } else {
      showToast(result.error || 'Erreur lors de l\'import', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur lors du téléversement', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Lancer l'importation";
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
    const res = await fetch('/api/vessels/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, imo_number, flag, asset_type, owner, manager })
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast('Navire créé avec succès', 'success');
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
  document.getElementById('editCertModalTitle').textContent = 'Modifier Certificat';
  
  document.getElementById('editCertName').value = cert.name;
  document.getElementById('editCertCategory').value = cert.category;
  document.getElementById('editCertOrg').value = cert.organization || '';
  document.getElementById('editCertIssueDate').value = cert.issuing_date || '';
  document.getElementById('editCertExpiryDate').value = cert.expiration_date || '';
  document.getElementById('editCertDueDate').value = cert.due_date || '';
  document.getElementById('editCertWindow').value = cert.window || '';
  document.getElementById('editCertRemarks').value = cert.remarks || '';
  
  // Permissions logic for Crew role in modal
  const catSelector = document.getElementById('editCertCategory');
  const nameInput = document.getElementById('editCertName');
  if (state.currentRole === 'Crew') {
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
      // Creation manual mode
      url = `/api/vessels/${state.selectedVesselId}/certificates`;
      method = 'POST';
      payload.name = name;
      payload.category = category;
    }
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast(certId ? 'Certificat mis à jour avec succès' : 'Certificat créé avec succès', 'success');
      document.getElementById('modalEditCert').classList.remove('active');
      
      // Reload current vessel details
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
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce certificat ?')) return;
  try {
    const res = await fetch(`/api/certificates/${certId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Certificat supprimé', 'success');
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
    const res = await fetch(`/api/vessels/${state.selectedVesselId}/actionable-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imposed_date, category, report_number, due_date, description })
    });
    
    if (res.ok) {
      showToast('Recommandation ajoutée', 'success');
      document.getElementById('modalAddActionable').classList.remove('active');
      await loadActionableItems(state.selectedVesselId);
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function toggleActionableStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/actionable-items/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(newStatus === 'Completed' ? 'Marqué comme terminé ✓' : 'Marqué comme en attente', 'success');
      await loadActionableItems(state.selectedVesselId);
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function openEmailSettingsModal() {
  try {
    const res = await fetch(`/api/vessels/${state.selectedVesselId}/settings`);
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
    const res = await fetch(`/api/vessels/${vesselId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email1, email2, email3 })
    });
    
    if (res.ok) {
      showToast('Adresses e-mail de rappel enregistrées', 'success');
      document.getElementById('modalEmailSettings').classList.remove('active');
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

async function triggerManualEmailCheck() {
  const btn = document.getElementById('btnManualTriggerCheck');
  btn.disabled = true;
  btn.textContent = "Vérification en cours...";
  
  try {
    const res = await fetch('/api/trigger-notifications', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      showToast(`Vérification effectuée. ${result.checked} certificats vérifiés, ${result.alerts} e-mails d'alerte envoyés.`, 'success');
      await loadEmailLogs();
    }
  } catch (err) {
    showToast('Erreur lors du déclenchement du script d\'alertes', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ Déclencher Test Alarme E-mail";
  }
}

async function deleteCurrentVessel() {
  if (!confirm('Êtes-vous absolument sûr de vouloir supprimer ce navire et toutes ses données associées ? Cette action est irréversible.')) return;
  
  try {
    const res = await fetch(`/api/vessels/${state.selectedVesselId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Navire supprimé avec succès', 'success');
      state.selectedVesselId = null;
      await loadVessels();
    }
  } catch (err) {
    showToast('Erreur serveur', 'error');
  }
}

function exportVesselExcel() {
  if (!state.selectedVesselId) return;
  // Trigger file download directly by opening url in browser
  window.open(`/api/vessels/${state.selectedVesselId}/export`);
  showToast('Téléchargement du rapport Excel formaté lancé...', 'success');
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// CSS injection for toast fade out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastFadeOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(50px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ----------------------------------------------------
// OFFICE TV DASHBOARD FUNCTIONALITY
// ----------------------------------------------------
let tvInterval = null;

function enterTvMode() {
  // Hide normal grid app, show fullscreen TV container
  document.getElementById('mainAppGrid').style.display = 'none';
  document.getElementById('view-tv-mode').style.display = 'flex';
  
  // Start fullscreen requested if supported
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
  
  // Initial TV render & data reload
  renderTvDashboard();
  
  // Auto refresh every 30 seconds
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
  
  // Return hash to dashboard
  window.location.hash = '#dashboard';
}

function updateTvTime() {
  const timeEl = document.getElementById('tv-current-time');
  const dateEl = document.getElementById('tv-current-date');
  if (!timeEl || !dateEl) return;
  
  const now = new Date();
  
  // Time format
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  timeEl.textContent = `${hours}:${minutes}:${seconds}`;
  
  // Date Format French
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('fr-FR', options);
}

async function renderTvDashboard() {
  const listEl = document.getElementById('tvVesselList');
  const scrollEl = document.getElementById('tvAlertsScroll');
  if (!listEl || !scrollEl) return;
  
  listEl.innerHTML = '';
  scrollEl.innerHTML = '';
  
  let totalRed = 0, totalYellow = 0;
  let allCriticalCerts = [];
  
  // Fetch lists for all vessels to show in scrolling widget
  for (const v of state.vessels) {
    totalRed += v.counts.red || 0;
    totalYellow += v.counts.yellow || 0;
    
    // Add vessel row to sidebar
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
    
    // Fetch certificate list for this vessel to compile urgent ones
    try {
      const res = await fetch(`/api/vessels/${v.id}/certificates`);
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
  
  // Update Big counts
  document.getElementById('tv-count-red').textContent = totalRed;
  document.getElementById('tv-count-yellow').textContent = totalYellow;
  
  // Calculate compliance rate
  const totalCertsCount = state.vessels.reduce((acc, curr) => acc + curr.counts.total, 0);
  const compliantCount = state.vessels.reduce((acc, curr) => acc + curr.counts.normal + curr.counts.green, 0);
  const rate = totalCertsCount > 0 ? Math.round((compliantCount / totalCertsCount) * 100) : 100;
  document.getElementById('tv-compliance-rate').textContent = `${rate}%`;
  
  // Sort critical items by urgency (Red, then Yellow, then Green)
  allCriticalCerts.sort((a, b) => {
    const order = { 'red': 1, 'yellow': 2, 'green': 3 };
    return order[a.level] - order[b.level];
  });
  
  // Render scrolling list
  if (allCriticalCerts.length === 0) {
    scrollEl.innerHTML = `<p class="placeholder-text" style="color:rgba(255,255,255,0.4)">Aucune alerte active dans la flotte. Statut conforme.</p>`;
    return;
  }
  
  allCriticalCerts.forEach(item => {
    const div = document.createElement('div');
    div.className = `tv-alert-item tv-alert-${item.level}`;
    div.innerHTML = `
      <div class="tv-alert-item-left">
        <span class="tv-alert-vessel">${item.vessel_name}</span>
        <span class="tv-alert-name">${item.cert_name}</span>
        <span class="tv-alert-due">Échéance: ${item.due_date}</span>
      </div>
      <span class="tv-alert-status ${item.level === 'red' ? 'text-red' : item.level === 'yellow' ? 'text-yellow' : 'text-green'}">
        ${item.alarm_status}
      </span>
    `;
    scrollEl.appendChild(div);
  });
  
  // Simple CSS animation loop or automated scroll behavior
  startTvScrollAnimation();
}

function startTvScrollAnimation() {
  const container = document.getElementById('tvAlertsScroll');
  if (!container) return;
  
  let scrollAmount = 0;
  const scrollStep = 1;
  const delay = 50;
  
  let scrollId = setInterval(() => {
    // If user left TV mode, stop
    if (document.getElementById('view-tv-mode').style.display === 'none') {
      clearInterval(scrollId);
      return;
    }
    
    container.scrollTop += scrollStep;
    if (container.scrollTop >= (container.scrollHeight - container.clientHeight)) {
      // Loop back smoothly
      setTimeout(() => {
        container.scrollTop = 0;
      }, 2000);
    }
  }, delay);
}
