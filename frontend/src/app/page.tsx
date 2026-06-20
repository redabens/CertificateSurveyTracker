'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/navigation';
import { Chart } from 'chart.js/auto';

type ToastMsg = { id: number; text: string; type: 'success' | 'error' | 'info' };

export default function Dashboard() {
  const { token, user, logout, apiFetch } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();

  // Navigation & Views
  const [activeView, setActiveView] = useState<'dashboard' | 'fleet' | 'logs'>('dashboard');
  const [tvMode, setTvMode] = useState(false);
  const [tvTime, setTvTime] = useState('');
  const [tvDate, setTvDate] = useState('');
  const [tvCerts, setTvCerts] = useState<any[]>([]);

  // State Data
  const [vessels, setVessels] = useState<any[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [actionableItems, setActionableItems] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  
  // Search & Filters (Certificates)
  const [certSearch, setCertSearch] = useState('');
  const [certCategory, setCertCategory] = useState('ALL');
  const [certStatus, setCertStatus] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'certs' | 'recs'>('certs');

  // Modals Visibility
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddVesselModal, setShowAddVesselModal] = useState(false);
  const [showEditCertModal, setShowEditCertModal] = useState(false);
  const [showAddActionableModal, setShowAddActionableModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Form States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [vesselForm, setVesselForm] = useState({ name: '', imo_number: '', flag: '', asset_type: '', owner: '', manager: '' });
  const [certForm, setCertForm] = useState({ id: '', name: '', category: 'Class', organization: '', issuing_date: '', expiration_date: '', due_date: '', window: '', remarks: '' });
  const [certPdfFile, setCertPdfFile] = useState<File | null>(null);
  const [certPdfCurrent, setCertPdfCurrent] = useState('');
  const [actionableForm, setActionableForm] = useState({ imposed_date: '', category: '', report_number: '', due_date: '', description: '' });
  const [settingsForm, setSettingsForm] = useState({ vessel_id: 0, email1: '', email2: '', email3: '' });
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  const [pdfViewerName, setPdfViewerName] = useState('');

  // UI Toast system
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Chart Ref
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);

  // Load Vessels
  const loadVessels = useCallback(async () => {
    try {
      const res = await apiFetch('/vessels');
      const data = await res.json();
      setVessels(data);
      if (data.length > 0 && !selectedVesselId) {
        setSelectedVesselId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [apiFetch, selectedVesselId]);

  // Check Session
  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      void loadVessels();
    }
  }, [token, loadVessels, router]);

  const loadVesselDetails = useCallback(async (id: number) => {
    try {
      const [resCerts, resRecs] = await Promise.all([
        apiFetch(`/vessels/${id}/certificates`),
        apiFetch(`/vessels/${id}/actionable-items`)
      ]);
      setCertificates(await resCerts.json());
      setActionableItems(await resRecs.json());
    } catch (err) {
      console.error(err);
    }
  }, [apiFetch]);

  // Load Vessel Related details
  useEffect(() => {
    if (selectedVesselId) {
      void loadVesselDetails(selectedVesselId);
    }
  }, [selectedVesselId, loadVesselDetails]);

  const loadEmailLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/email-logs');
      setEmailLogs(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (activeView === 'logs') {
      void loadEmailLogs();
    }
  }, [activeView, loadEmailLogs]);

  // Update Doughnut Chart
  useEffect(() => {
    if (activeView === 'dashboard' && vessels.length > 0 && chartRef.current) {
      let red = 0, yellow = 0, green = 0, normal = 0;
      vessels.forEach(v => {
        red += v.counts.red || 0;
        yellow += v.counts.yellow || 0;
        green += v.counts.green || 0;
        normal += v.counts.normal || 0;
      });

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const total = red + yellow + green + normal;
      if (total === 0) {
        chartInstance.current = new Chart(chartRef.current, {
          type: 'doughnut',
          data: {
            labels: [lang === 'fr' ? 'Aucune donnée' : 'No Data'],
            datasets: [{ data: [1], backgroundColor: ['#27272a'], borderWidth: 0 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        return;
      }

      const labelsFr = ['Urgent / Expire (<30j)', 'Attention (30j-90j)', 'Suivi (90j-180j)', 'Conforme (>180j)'];
      const labelsEn = ['Urgent / Expired (<30d)', 'Warning (30d-90d)', 'Monitored (90d-180d)', 'Compliant (>180d)'];

      chartInstance.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: {
          labels: lang === 'fr' ? labelsFr : labelsEn,
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
              labels: { color: 'rgb(148, 163, 184)', font: { family: 'Inter', size: 12 } }
            }
          },
          cutout: '65%'
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [vessels, activeView, lang]);

  const loadTvCerts = useCallback(async () => {
    const list: any[] = [];
    for (const v of vessels) {
      try {
        const res = await apiFetch(`/vessels/${v.id}/certificates`);
        const certs = await res.json();
        certs.forEach((c: any) => {
          const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
          const isYellow = c.alarm_status.includes('YELLOW');
          const isGreen = c.alarm_status.includes('GREEN');
          if (isRed || isYellow || isGreen) {
            list.push({
              vessel_name: v.name,
              cert_name: c.name,
              due_date: c.due_date || c.expiration_date || 'N/A',
              alarm_status: c.alarm_status,
              level: isRed ? 'red' : isYellow ? 'yellow' : 'green'
            });
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
    list.sort((a, b) => {
      const ord: Record<string, number> = { red: 1, yellow: 2, green: 3 };
      return ord[a.level] - ord[b.level];
    });
    setTvCerts(list);
  }, [apiFetch, vessels]);

  // TV mode clocks
  useEffect(() => {
    if (tvMode) {
      const update = () => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        setTvTime(`${hrs}:${mins}:${secs}`);

        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as any;
        setTvDate(now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', opts));
      };
      update();
      const interval = setInterval(update, 1000);
      void loadTvCerts();
      const tvFetchInterval = setInterval(() => {
        void loadTvCerts();
      }, 30000);
      return () => {
        clearInterval(interval);
        clearInterval(tvFetchInterval);
      };
    }
  }, [tvMode, vessels, lang, loadTvCerts]);

  // Operations
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await apiFetch('/vessels/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(lang === 'fr' ? `Navire importé avec succès !` : 'Vessel imported successfully!', 'success');
        setShowImportModal(false);
        setImportFile(null);
        await loadVessels();
        setSelectedVesselId(data.vesselId);
      } else {
        showToast(data.error || 'Erreur d\'importation', 'error');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'import: ${errMsg}` : `Import error: ${errMsg}`, 'error');
    }
  };

  const handleCreateVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/vessels/manual', {
        method: 'POST',
        body: JSON.stringify(vesselForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(lang === 'fr' ? 'Navire créé' : 'Vessel created', 'success');
        setShowAddVesselModal(false);
        setVesselForm({ name: '', imo_number: '', flag: '', asset_type: '', owner: '', manager: '' });
        await loadVessels();
        setSelectedVesselId(data.id);
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la création du navire: ${errMsg}` : `Error creating vessel: ${errMsg}`, 'error');
    }
  };

  const handleDeleteVessel = async () => {
    if (!selectedVesselId) return;
    const conf = lang === 'fr' 
      ? 'Êtes-vous absolument sûr de vouloir supprimer ce navire et toutes ses données ?' 
      : 'Are you sure you want to delete this vessel and all its data?';
    if (!confirm(conf)) return;
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Navire supprimé' : 'Vessel deleted', 'success');
        setSelectedVesselId(null);
        await loadVessels();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la suppression du navire: ${errMsg}` : `Error deleting vessel: ${errMsg}`, 'error');
    }
  };

  const handleEditCertOpen = (c: any) => {
    setCertForm({
      id: c.id,
      name: c.name,
      category: c.category,
      organization: c.organization || '',
      issuing_date: c.issuing_date || '',
      expiration_date: c.expiration_date || '',
      due_date: c.due_date || '',
      window: c.window || '',
      remarks: c.remarks || ''
    });
    setCertPdfFile(null);
    setCertPdfCurrent(c.pdf_url || '');
    setShowEditCertModal(true);
  };

  const handleCreateCertOpen = () => {
    setCertForm({
      id: '',
      name: '',
      category: user?.role === 'Crew' ? 'Servicing' : 'Class',
      organization: '',
      issuing_date: '',
      expiration_date: '',
      due_date: '',
      window: '',
      remarks: ''
    });
    setCertPdfFile(null);
    setCertPdfCurrent('');
    setShowEditCertModal(true);
  };

  const handleEditCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let url = certForm.id ? `/certificates/${certForm.id}` : `/vessels/${selectedVesselId}/certificates`;
      let method = certForm.id ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: certForm.name,
          category: certForm.category,
          organization: certForm.organization,
          issuing_date: certForm.issuing_date,
          expiration_date: certForm.expiration_date,
          due_date: certForm.due_date,
          window: certForm.window,
          remarks: certForm.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        const certId = certForm.id || data.id;
        
        // Handle PDF upload if selected
        if (certPdfFile) {
          const formData = new FormData();
          formData.append('pdf', certPdfFile);
          
          const uploadRes = await fetch(`http://localhost:3000/api/certificates/${certId}/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          if (uploadRes.ok) {
            showToast(lang === 'fr' ? 'PDF téléversé !' : 'PDF uploaded!', 'success');
          }
        }

        showToast(lang === 'fr' ? 'Certificat enregistré' : 'Certificate saved', 'success');
        setShowEditCertModal(false);
        if (selectedVesselId) loadVesselDetails(selectedVesselId);
        loadVessels();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'enregistrement: ${errMsg}` : `Error saving: ${errMsg}`, 'error');
    }
  };

  const handleDeleteCert = async (certId: number) => {
    if (!confirm(lang === 'fr' ? 'Supprimer ce certificat ?' : 'Delete this certificate?')) return;
    try {
      const res = await apiFetch(`/certificates/${certId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Certificat supprimé' : 'Certificate deleted', 'success');
        if (selectedVesselId) loadVesselDetails(selectedVesselId);
        loadVessels();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur de suppression: ${errMsg}` : `Delete error: ${errMsg}`, 'error');
    }
  };

  const handleActionableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/actionable-items`, {
        method: 'POST',
        body: JSON.stringify(actionableForm)
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Recommandation ajoutée' : 'Recommendation added', 'success');
        setShowAddActionableModal(false);
        setActionableForm({ imposed_date: '', category: '', report_number: '', due_date: '', description: '' });
        if (selectedVesselId) loadVesselDetails(selectedVesselId);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'ajout: ${errMsg}` : `Error adding: ${errMsg}`, 'error');
    }
  };

  const toggleActionableStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await apiFetch(`/actionable-items/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Statut mis à jour' : 'Status updated', 'success');
        if (selectedVesselId) loadVesselDetails(selectedVesselId);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur de mise à jour du statut: ${errMsg}` : `Error updating status: ${errMsg}`, 'error');
    }
  };

  const handleEmailSettingsOpen = async () => {
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/settings`);
      const data = await res.json();
      setSettingsForm({
        vessel_id: selectedVesselId || 0,
        email1: data.email1 || '',
        email2: data.email2 || '',
        email3: data.email3 || ''
      });
      setShowSettingsModal(true);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur de chargement: ${errMsg}` : `Loading error: ${errMsg}`, 'error');
    }
  };

  const handleEmailSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          email1: settingsForm.email1,
          email2: settingsForm.email2,
          email3: settingsForm.email3
        })
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Paramètres e-mail enregistrés' : 'Email parameters saved', 'success');
        setShowSettingsModal(false);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la sauvegarde: ${errMsg}` : `Error saving: ${errMsg}`, 'error');
    }
  };

  const triggerAlertCheck = async () => {
    try {
      const res = await apiFetch('/trigger-notifications', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const msg = lang === 'fr'
          ? `Vérification effectuée. ${data.checked} certificats analysés, ${data.alerts} alertes e-mail.`
          : `Check complete. ${data.checked} certificates analyzed, ${data.alerts} email alerts generated.`;
        showToast(msg, 'success');
        loadEmailLogs();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la vérification: ${errMsg}` : `Verification error: ${errMsg}`, 'error');
    }
  };

  const handleExcelExport = () => {
    if (!selectedVesselId) return;
    const url = `http://localhost:3000/api/vessels/${selectedVesselId}/export?token=${encodeURIComponent(token || '')}&lang=${lang}`;
    window.open(url);
    showToast(lang === 'fr' ? 'Téléchargement lancé...' : 'Download started...', 'success');
  };

  const openPdfViewer = (url: string, name: string) => {
    // URL relative pointed to backend static files
    setPdfViewerUrl(`http://localhost:3000${url}`);
    setPdfViewerName(name);
    setShowPdfModal(true);
  };

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  // Filters certs list
  const filteredCerts = certificates.filter(c => {
    if (certSearch && !c.name.toLowerCase().includes(certSearch.toLowerCase())) return false;
    if (certCategory !== 'ALL' && c.category !== certCategory) return false;
    if (certStatus !== 'ALL') {
      const isRed = c.alarm_status.includes('RED') || c.alarm_status.includes('OVERDUE');
      const isYellow = c.alarm_status.includes('YELLOW');
      const isGreen = c.alarm_status.includes('GREEN');
      const isNormal = c.alarm_status.includes('MONITOR') || c.alarm_status.includes('N/A');
      if (certStatus === 'RED' && !isRed) return false;
      if (certStatus === 'YELLOW' && !isYellow) return false;
      if (certStatus === 'GREEN' && !isGreen) return false;
      if (certStatus === 'NORMAL' && !isNormal) return false;
    }
    return true;
  });

  const getAlarmBadgeClass = (status: string) => {
    if (status.includes('RED') || status.includes('OVERDUE')) return 'badge-red';
    if (status.includes('YELLOW')) return 'badge-yellow';
    if (status.includes('GREEN')) return 'badge-green';
    return 'badge-normal';
  };

  const getAlarmLabel = (status: string) => {
    if (lang === 'fr') {
      if (status.includes('RED')) return 'ROUGE - <1 MOIS';
      if (status.includes('YELLOW')) return 'JAUNE - 1 A 3 MOIS';
      if (status.includes('GREEN')) return 'VERT - 3 A 6 MOIS';
      if (status.includes('MONITOR')) return 'SUIVI >6 MOIS';
      if (status.includes('OVERDUE')) return 'EXPIRÉ / IMMINENT';
      return status;
    }
    return status;
  };

  // TV Fullscreen toggler
  const enterTvMode = () => {
    setTvMode(true);
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
  };

  const exitTvMode = () => {
    setTvMode(false);
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!token || !user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      
      {/* ---------------------------------------------------- */}
      {/* TV FULLSCREEN OVERLAY */}
      {/* ---------------------------------------------------- */}
      {tvMode && (
        <div id="view-tv-mode" className="tv-dashboard">
          <div className="tv-header">
            <div className="tv-brand">
              <span className="tv-logo-icon">🚢</span>
              <span className="tv-logo-text">Portail<span>Certificats</span> <small>CNAN NORD</small></span>
            </div>
            <div className="tv-time-container">
              <span id="tv-current-time">{tvTime}</span>
              <span id="tv-current-date">{tvDate}</span>
            </div>
            <button className="btn btn-sm btn-outline btn-tv-exit" onClick={exitTvMode}>{t('tv_exit_btn')}</button>
          </div>

          <div className="tv-layout">
            <div className="tv-panel tv-panel-left">
              <h2>{t('tv_overall_fleet')}</h2>
              <div className="tv-vessel-list">
                {vessels.map(v => (
                  <div className="tv-vessel-row" key={v.id}>
                    <div className="tv-vessel-row-left">
                      <span className="tv-vessel-name">{v.name}</span>
                      <span className="tv-vessel-meta">IMO {v.imo_number || 'N/A'} | Flag {v.flag || 'N/A'}</span>
                    </div>
                    <div className="tv-vessel-status-indicator">
                      <span className={`tv-indicator-circle ${v.status === 'Imminent' ? 'red' : v.status === 'Attention' ? 'yellow' : v.status === 'Suivi' ? 'green' : 'normal'}`}></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tv-panel tv-panel-right">
              <div className="tv-summary-widgets">
                <div className="tv-widget tv-widget-red">
                  <span className="widget-label">{t('widget_urgent')}</span>
                  <span className="widget-value">{vessels.reduce((acc, curr) => acc + curr.counts.red, 0)}</span>
                </div>
                <div className="tv-widget tv-widget-yellow">
                  <span className="widget-label">{t('widget_attention')}</span>
                  <span className="widget-value">{vessels.reduce((acc, curr) => acc + curr.counts.yellow, 0)}</span>
                </div>
                <div className="tv-widget tv-widget-green">
                  <span className="widget-label">{t('logs_col_status')}</span>
                  <span className="widget-value">
                    {vessels.reduce((acc, curr) => acc + curr.counts.total, 0) > 0
                      ? Math.round((vessels.reduce((acc, curr) => acc + curr.counts.normal + curr.counts.green, 0) / vessels.reduce((acc, curr) => acc + curr.counts.total, 0)) * 100)
                      : 100}%
                  </span>
                </div>
              </div>

              <div className="tv-scrolling-alerts-box">
                <h2>{t('tv_alerts_title')}</h2>
                <div className="tv-alerts-container scrollable" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                  {tvCerts.length === 0 ? (
                    <p className="placeholder-text" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {lang === 'fr' ? 'Aucune alerte active dans la flotte. Statut conforme.' : 'No active alerts in fleet. Compliant status.'}
                    </p>
                  ) : (
                    tvCerts.map((item, idx) => (
                      <div className={`tv-alert-item tv-alert-${item.level}`} key={idx}>
                        <div className="tv-alert-item-left">
                          <span className="tv-alert-vessel">{item.vessel_name}</span>
                          <span className="tv-alert-name">{item.cert_name}</span>
                          <span className="tv-alert-due">{lang === 'fr' ? 'Échéance' : 'Due'}: {item.due_date}</span>
                        </div>
                        <span className={`tv-alert-status ${item.level === 'red' ? 'text-red' : item.level === 'yellow' ? 'text-yellow' : 'text-green'}`}>
                          {getAlarmLabel(item.alarm_status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* APP BODY CONTAINER */}
      {/* ---------------------------------------------------- */}
      {!tvMode && (
        <div className="app-grid">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="brand">
              <span className="logo-icon">🚢</span>
              <span className="logo-text">CNAN<span>Certifs</span></span>
            </div>
            <nav className="nav-menu">
              <a href="#dashboard" className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
                <span className="icon">📊</span> <span>{t('nav_dashboard')}</span>
              </a>
              <a href="#fleet" className={`nav-item ${activeView === 'fleet' ? 'active' : ''}`} onClick={() => setActiveView('fleet')}>
                <span className="icon">⚓</span> <span>{t('nav_fleet')}</span>
              </a>
              <a href="#tv-mode" className="nav-item" onClick={(e) => { e.preventDefault(); enterTvMode(); }}>
                <span className="icon">📺</span> <span>{t('nav_tv_mode')}</span>
              </a>
              <a href="#logs" className={`nav-item ${activeView === 'logs' ? 'active' : ''}`} onClick={() => setActiveView('logs')}>
                <span className="icon">✉️</span> <span>{t('nav_logs')}</span>
              </a>
            </nav>
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="avatar">👨‍✈️</div>
                <div className="profile-info">
                  <div className="profile-name">{user.full_name}</div>
                  <div className="profile-role" id="currentUserRoleBadge">
                    {user.role === 'Admin' ? 'Administrateur' : user.role === 'Crew' ? 'Équipage (Capitaine)' : user.role === 'Partner' ? 'Partenaire B2B' : 'Auditeur Externe'}
                  </div>
                </div>
                <button className="btn-logout" onClick={logout} title="Déconnexion">🚪</button>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="main-content">
            {/* HEADER */}
            <header className="app-header">
              <div className="header-search">
                <h1>{t(`nav_${activeView}`)}</h1>
              </div>
              <div className="header-actions">
                <div className="lang-selector">
                  <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>FR</button>
                  <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
                </div>
                {user.role === 'Admin' && (
                  <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
                    <span className="icon">📥</span> <span>{t('btn_import_excel')}</span>
                  </button>
                )}
              </div>
            </header>

            {/* ---------------------------------------------------- */}
            {/* VIEW: DASHBOARD */}
            {/* ---------------------------------------------------- */}
            {activeView === 'dashboard' && (
              <section className="app-view active">
                <div className="stats-grid">
                  <div className="stat-card stat-total">
                    <div className="stat-icon">🚢</div>
                    <div className="stat-details">
                      <h3>{t('widget_active_vessels')}</h3>
                      <div className="stat-number">{vessels.length}</div>
                    </div>
                  </div>
                  <div className="stat-card stat-red">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-details">
                      <h3>{t('widget_urgent')}</h3>
                      <div className="stat-number">{vessels.reduce((acc, curr) => acc + curr.counts.red, 0)}</div>
                    </div>
                  </div>
                  <div className="stat-card stat-yellow">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-details">
                      <h3>{t('widget_attention')}</h3>
                      <div className="stat-number">{vessels.reduce((acc, curr) => acc + curr.counts.yellow, 0)}</div>
                    </div>
                  </div>
                  <div className="stat-card stat-green">
                    <div className="stat-icon">✅</div>
                    <div className="stat-details">
                      <h3>{t('widget_monitored')}</h3>
                      <div className="stat-number">{vessels.reduce((acc, curr) => acc + curr.counts.green, 0)}</div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-charts-grid">
                  <div className="card glass">
                    <h2>{t('chart_title')}</h2>
                    <div className="chart-container">
                      <canvas ref={chartRef}></canvas>
                    </div>
                  </div>
                  <div className="card glass flex-column">
                    <h2>{t('actions_required')}</h2>
                    <div className="list-container scrollable">
                      {vessels.filter(v => v.status === 'Imminent' || v.status === 'Attention').length === 0 ? (
                        <p className="placeholder-text">{t('no_alerts')}</p>
                      ) : (
                        vessels.filter(v => v.status === 'Imminent' || v.status === 'Attention').map(v => (
                          <div className="critical-list-item" style={{ cursor: 'pointer' }} onClick={() => { setActiveView('fleet'); setSelectedVesselId(v.id); }} key={v.id}>
                            <div className="item-left">
                              <span className="item-title">{v.name}</span>
                              <span className="item-sub">
                                {lang === 'fr' ? 'Nécessite des actions de conformité urgentes' : 'Requires urgent compliance action'}
                              </span>
                            </div>
                            <span className={`badge ${v.status === 'Imminent' ? 'badge-red' : 'badge-yellow'}`}>
                              {v.counts.red} {lang === 'fr' ? 'Urgents' : 'Urgents'} | {v.counts.yellow} {lang === 'fr' ? 'Alertes' : 'Warnings'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="section-header">
                  <h2>{t('vessel_summary')}</h2>
                </div>
                <div className="vessels-card-grid">
                  {vessels.map(v => (
                    <div className={`vessel-card status-${v.status}`} onClick={() => { setActiveView('fleet'); setSelectedVesselId(v.id); }} key={v.id}>
                      <div className="vessel-card-header">
                        <div>
                          <h3>{v.name}</h3>
                          <span className="vessel-card-imo">IMO {v.imo_number || 'N/A'}</span>
                        </div>
                        <span className={`badge ${v.status === 'Imminent' ? 'badge-red' : v.status === 'Attention' ? 'badge-yellow' : v.status === 'Suivi' ? 'badge-green' : 'badge-normal'}`}>
                          {lang === 'fr' 
                            ? (v.status === 'Imminent' ? 'Imminent' : v.status === 'Attention' ? 'Attention' : v.status === 'Suivi' ? 'Suivi' : 'Normal')
                            : (v.status === 'Imminent' ? 'Urgent' : v.status === 'Attention' ? 'Warning' : v.status === 'Suivi' ? 'Monitored' : 'Normal')}
                        </span>
                      </div>
                      <div className="vessel-card-stats">
                        <div className="vessel-stat-col">
                          {lang === 'fr' ? 'Urgents' : 'Urgents'}
                          <span className="text-red">{v.counts.red}</span>
                        </div>
                        <div className="vessel-stat-col">
                          {lang === 'fr' ? 'Alertes' : 'Warnings'}
                          <span className="text-yellow">{v.counts.yellow}</span>
                        </div>
                        <div className="vessel-stat-col">
                          {lang === 'fr' ? 'Suivis' : 'Monitored'}
                          <span className="text-green">{v.counts.green}</span>
                        </div>
                        <div className="vessel-stat-col">
                          {lang === 'fr' ? 'Certificats' : 'Certs'}
                          <span>{v.counts.total}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---------------------------------------------------- */}
            {/* VIEW: FLEET */}
            {/* ---------------------------------------------------- */}
            {activeView === 'fleet' && (
              <section className="app-view active">
                <div className="fleet-view-container">
                  <div className="fleet-sidebar">
                    <div className="fleet-sidebar-header">
                      <h3>{t('nav_fleet')}</h3>
                      {user.role === 'Admin' && (
                        <button className="btn btn-sm btn-outline" onClick={() => setShowAddVesselModal(true)}>
                          {t('btn_manual_vessel')}
                        </button>
                      )}
                    </div>
                    <div className="fleet-list">
                      {vessels.map(v => (
                        <div className={`fleet-vessel-item ${selectedVesselId === v.id ? 'active' : ''}`} onClick={() => setSelectedVesselId(v.id)} key={v.id}>
                          <span>{v.name}</span>
                          <span className={`tv-indicator-circle ${v.status === 'Imminent' ? 'red' : v.status === 'Attention' ? 'yellow' : v.status === 'Suivi' ? 'green' : 'normal'}`}></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="fleet-detail-area">
                    {!selectedVessel ? (
                      <div className="empty-state">
                        <span className="empty-icon">⚓</span>
                        <h3>{t('empty_selection')}</h3>
                        <p>{t('empty_selection_desc')}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="vessel-detail-header">
                          <div>
                            <h2>{selectedVessel.name}</h2>
                            <p className="vessel-meta-sub">
                              IMO: {selectedVessel.imo_number || 'N/A'} | Flag: {selectedVessel.flag || 'N/A'} | Type: {selectedVessel.asset_type || 'N/A'}
                            </p>
                          </div>
                          <div className="vessel-actions">
                            {user.role === 'Admin' && (
                              <button className="btn btn-outline" onClick={handleEmailSettingsOpen}>
                                {t('btn_email_settings')}
                              </button>
                            )}
                            <button className="btn btn-success" onClick={handleExcelExport}>
                              {t('btn_export_audit')}
                            </button>
                            {user.role === 'Admin' && (
                              <button className="btn btn-danger" onClick={handleDeleteVessel}>
                                {t('btn_delete_vessel')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Specifications info grid */}
                        <div className="vessel-spec-grid card glass">
                          <div className="spec-item">
                            <strong>{t('spec_owner')}</strong>
                            <span>{selectedVessel.owner || '-'}</span>
                          </div>
                          <div className="spec-item">
                            <strong>{t('spec_manager')}</strong>
                            <span>{selectedVessel.manager || '-'}</span>
                          </div>
                          <div className="spec-item">
                            <strong>{t('spec_port')}</strong>
                            <span>{selectedVessel.port_of_registry || '-'}</span>
                          </div>
                          <div className="spec-item">
                            <strong>{t('spec_callsign')}</strong>
                            <span>{selectedVessel.call_sign || '-'}</span>
                          </div>
                          <div className="spec-item">
                            <strong>{t('spec_gt')}</strong>
                            <span>{selectedVessel.gross_tonnage ? selectedVessel.gross_tonnage.toLocaleString() : '-'}</span>
                          </div>
                          <div className="spec-item">
                            <strong>{t('spec_dwt')}</strong>
                            <span>{selectedVessel.deadweight_tonnage ? selectedVessel.deadweight_tonnage.toLocaleString() : '-'}</span>
                          </div>
                        </div>

                        {/* Tabs content */}
                        <div className="tabs-container">
                          <div className="tabs">
                            <button className={`tab-btn ${activeTab === 'certs' ? 'active' : ''}`} onClick={() => setActiveTab('certs')}>
                              {t('tab_certs')}
                            </button>
                            <button className={`tab-btn ${activeTab === 'recs' ? 'active' : ''}`} onClick={() => setActiveTab('recs')}>
                              {t('tab_recs')}
                            </button>
                          </div>

                          {/* TAB: CERTIFICATES */}
                          {activeTab === 'certs' && (
                            <div>
                              <div className="table-toolbar">
                                <div className="search-filters">
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder={t('search_placeholder')}
                                    value={certSearch}
                                    onChange={(e) => setCertSearch(e.target.value)}
                                  />
                                  <select className="select-field" value={certCategory} onChange={(e) => setCertCategory(e.target.value)}>
                                    <option value="ALL">{t('filter_all_cats')}</option>
                                    <option value="Class">{t('filter_class_certs')}</option>
                                    <option value="Flag">{t('filter_flag_certs')}</option>
                                    <option value="Servicing">{t('filter_servicing_certs')}</option>
                                  </select>
                                  <select className="select-field" value={certStatus} onChange={(e) => setCertStatus(e.target.value)}>
                                    <option value="ALL">{t('filter_all_status')}</option>
                                    <option value="RED">{t('filter_status_red')}</option>
                                    <option value="YELLOW">{t('filter_status_yellow')}</option>
                                    <option value="GREEN">{t('filter_status_green')}</option>
                                    <option value="NORMAL">{t('filter_status_normal')}</option>
                                  </select>
                                </div>
                                {(user.role === 'Admin' || user.role === 'Crew') && (
                                  <button className="btn btn-sm btn-primary" onClick={handleCreateCertOpen}>
                                    {t('btn_add_cert')}
                                  </button>
                                )}
                              </div>

                              <div className="table-container scrollable">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{t('table_col_name')}</th>
                                      <th>{t('table_col_cat')}</th>
                                      <th>{t('table_col_org')}</th>
                                      <th>{t('table_col_issue')}</th>
                                      <th>{t('table_col_expiry')}</th>
                                      <th>{t('table_col_due')}</th>
                                      <th>{t('table_col_status')}</th>
                                      <th>{t('table_col_remarks')}</th>
                                      <th>{t('table_col_actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredCerts.length === 0 ? (
                                      <tr><td colSpan={9} className="placeholder-text">{lang === 'fr' ? 'Aucun certificat trouvé.' : 'No certificates found.'}</td></tr>
                                    ) : (
                                      filteredCerts.map(c => {
                                        const isReadOnly = user.role === 'Partner' || user.role === 'Auditor';
                                        const isCrew = user.role === 'Crew';
                                        
                                        return (
                                          <tr key={c.id}>
                                            <td>
                                              <strong>{c.name}</strong>
                                              {c.pdf_url && (
                                                <span className="pdf-icon-btn" onClick={() => openPdfViewer(c.pdf_url, c.name)} title={lang === 'fr' ? 'Voir le PDF' : 'View PDF'} style={{ marginLeft: 6 }}>📎</span>
                                              )}
                                            </td>
                                            <td>
                                              {c.category === 'Class' ? t('filter_class_certs') : c.category === 'Flag' ? t('filter_flag_certs') : t('filter_servicing_certs')}
                                            </td>
                                            <td>{c.organization || '-'}</td>
                                            <td>{c.issuing_date || '-'}</td>
                                            <td>{c.expiration_date || '-'}</td>
                                            <td>{c.due_date || '-'}</td>
                                            <td>
                                              <span className={`badge ${getAlarmBadgeClass(c.alarm_status)}`}>
                                                {getAlarmLabel(c.alarm_status)}
                                              </span>
                                            </td>
                                            <td><small className="text-secondary">{c.remarks || ''}</small></td>
                                            <td>
                                              {isReadOnly ? (
                                                <span className="text-muted">{lang === 'fr' ? 'Lecture seule' : 'Read-only'}</span>
                                              ) : isCrew ? (
                                                c.category === 'Servicing' ? (
                                                  <button className="btn btn-sm btn-outline" onClick={() => handleEditCertOpen(c)}>{lang === 'fr' ? 'Mettre à jour' : 'Update'}</button>
                                                ) : (
                                                  <span className="text-muted">{lang === 'fr' ? 'Restreint' : 'Restricted'}</span>
                                                )
                                              ) : (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                  <button className="btn btn-sm btn-outline" onClick={() => handleEditCertOpen(c)}>{lang === 'fr' ? 'Modifier' : 'Edit'}</button>
                                                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCert(c.id)} style={{ padding: '6px 10px' }}>✖</button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* TAB: RECOMMENDATIONS */}
                          {activeTab === 'recs' && (
                            <div>
                              <div className="table-toolbar">
                                <div className="search-filters">
                                  <h3 style={{ margin: 0 }}>{t('rec_title')}</h3>
                                </div>
                                {user.role === 'Admin' && (
                                  <button className="btn btn-sm btn-primary" onClick={() => setShowAddActionableModal(true)}>
                                    {t('btn_add_rec')}
                                  </button>
                                )}
                              </div>

                              <div className="table-container scrollable">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{t('rec_col_id')}</th>
                                      <th>{t('rec_col_imposed')}</th>
                                      <th>{t('rec_col_cat')}</th>
                                      <th>{t('rec_col_report')}</th>
                                      <th>{t('rec_col_due')}</th>
                                      <th>{t('rec_col_desc')}</th>
                                      <th>{t('rec_col_status')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {actionableItems.length === 0 ? (
                                      <tr><td colSpan={7} className="placeholder-text">{lang === 'fr' ? 'Aucune recommandation.' : 'No recommendations.'}</td></tr>
                                    ) : (
                                      actionableItems.map(a => {
                                        const isCompleted = a.status === 'Completed';
                                        const isReadOnly = user.role === 'Partner' || user.role === 'Auditor' || user.role === 'Crew';
                                        
                                        return (
                                          <tr key={a.id}>
                                            <td><code style={{ fontFamily: 'Roboto Mono' }}>{a.item_id || '-'}</code></td>
                                            <td>{a.imposed_date || '-'}</td>
                                            <td>{a.category || '-'}</td>
                                            <td>{a.report_number || '-'}</td>
                                            <td><strong>{a.due_date || (lang === 'fr' ? 'Non spécifiée' : 'Not specified')}</strong></td>
                                            <td><div style={{ maxWidth: 400, whiteSpace: 'normal', fontSize: 12 }}>{a.description}</div></td>
                                            <td>
                                              {!isReadOnly ? (
                                                <button className={`btn btn-sm ${isCompleted ? 'btn-outline' : 'btn-success'}`} onClick={() => toggleActionableStatus(a.id, a.status)}>
                                                  {isCompleted ? (lang === 'fr' ? 'En attente' : 'Pending') : (lang === 'fr' ? 'Terminé' : 'Completed')}
                                                </button>
                                              ) : (
                                                <span className={`badge ${isCompleted ? 'badge-green' : 'badge-yellow'}`}>
                                                  {isCompleted ? (lang === 'fr' ? 'Fait ✓' : 'Done ✓') : (lang === 'fr' ? 'En attente' : 'Pending')}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ---------------------------------------------------- */}
            {/* VIEW: EMAIL LOGS */}
            {/* ---------------------------------------------------- */}
            {activeView === 'logs' && (
              <section className="app-view active">
                <div className="card glass">
                  <div className="card-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{t('logs_title')}</h2>
                    {user.role === 'Admin' && (
                      <button className="btn btn-outline" onClick={triggerAlertCheck}>
                        {t('btn_trigger_check')}
                      </button>
                    )}
                  </div>
                  <p className="section-desc" style={{ marginTop: 8 }}>{t('logs_desc')}</p>

                  <div className="table-container scrollable" style={{ marginTop: 20 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('log_col_vessel')}</th>
                          <th>{t('log_col_cert')}</th>
                          <th>{t('log_col_level')}</th>
                          <th>{t('log_col_sent_to')}</th>
                          <th>{t('log_col_sent_at')}</th>
                          <th>{t('log_col_status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.length === 0 ? (
                          <tr><td colSpan={6} className="placeholder-text">{lang === 'fr' ? 'Aucun log disponible.' : 'No email logs available.'}</td></tr>
                        ) : (
                          emailLogs.map(l => {
                            const isFailure = l.sent_to.includes('Echec') || l.sent_to.includes('Error');
                            const badgeClass = l.alarm_level.includes('RED') ? 'badge-red' : l.alarm_level.includes('YELLOW') ? 'badge-yellow' : 'badge-green';

                            return (
                              <tr key={l.id}>
                                <td><strong>{l.vessel_name}</strong></td>
                                <td>{l.certificate_name}</td>
                                <td><span className={`badge ${badgeClass}`}>{getAlarmLabel(l.alarm_level)}</span></td>
                                <td><code style={{ fontSize: 11 }}>{l.sent_to}</code></td>
                                <td>{l.sent_at}</td>
                                <td>
                                  <span className={`badge ${isFailure ? 'badge-red' : 'badge-green'}`}>
                                    {isFailure ? (lang === 'fr' ? 'ÉCHEC' : 'FAILED') : (lang === 'fr' ? 'ENVOYÉ ✓' : 'SENT ✓')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* POPUP MODALS */}
      {/* ---------------------------------------------------- */}

      {/* MODAL: IMPORT EXCEL */}
      {showImportModal && (
        <div className="modal active">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2>{t('btn_import_excel')}</h2>
              <span className="close-btn" onClick={() => setShowImportModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleImportExcel}>
              <div className="form-group">
                <label>Sélectionnez le fichier Excel du suivi des certificats (Format .xlsx)</label>
                <div className="file-drop-zone">
                  <input type="file" accept=".xlsx" required onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                  <p>Glissez-déposez le fichier ici ou cliquez pour parcourir</p>
                  <small className="file-name-display">{importFile ? importFile.name : (lang === 'fr' ? 'Aucun fichier' : 'No file')}</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowImportModal(false)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{lang === 'fr' ? "Lancer l'importation" : 'Start Import'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL VESSEL CREATION */}
      {showAddVesselModal && (
        <div className="modal active">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2>{t('btn_manual_vessel')}</h2>
              <span className="close-btn" onClick={() => setShowAddVesselModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleCreateVessel}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom du Navire *</label>
                  <input type="text" required className="input-field" placeholder="Ex. BABOR ALGERIEN" value={vesselForm.name} onChange={(e) => setVesselForm({ ...vesselForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Numéro IMO</label>
                  <input type="text" className="input-field" placeholder="Ex. 9477177" value={vesselForm.imo_number} onChange={(e) => setVesselForm({ ...vesselForm, imo_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Pavillon</label>
                  <input type="text" className="input-field" placeholder="Ex. Algérie" value={vesselForm.flag} onChange={(e) => setVesselForm({ ...vesselForm, flag: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type d&apos;Asset</label>
                  <input type="text" className="input-field" placeholder="Ex. Products Tanker" value={vesselForm.asset_type} onChange={(e) => setVesselForm({ ...vesselForm, asset_type: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Propriétaire</label>
                  <input type="text" className="input-field" placeholder="Ex. CNAN" value={vesselForm.owner} onChange={(e) => setVesselForm({ ...vesselForm, owner: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Technical Manager</label>
                  <input type="text" className="input-field" placeholder="Ex. Verital" value={vesselForm.manager} onChange={(e) => setVesselForm({ ...vesselForm, manager: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddVesselModal(false)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{lang === 'fr' ? 'Créer Navire' : 'Create Vessel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CERTIFICATE */}
      {showEditCertModal && (
        <div className="modal active">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2>{certForm.id ? t('table_col_actions') : t('btn_add_cert')}</h2>
              <span className="close-btn" onClick={() => setShowEditCertModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleEditCertSubmit}>
              <div className="form-group">
                <label>Nom du Certificat *</label>
                <input type="text" required className="input-field" disabled={user?.role === 'Crew'} value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select className="select-field" required disabled={user?.role === 'Crew'} value={certForm.category} onChange={(e) => setCertForm({ ...certForm, category: e.target.value })}>
                    <option value="Class">Certificats de Classe / Statutaires</option>
                    <option value="Flag">Certificats de Pavillon</option>
                    <option value="Servicing">Certificats d&apos;Entretien (Équipement)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Émetteur</label>
                  <input type="text" className="input-field" placeholder="Ex. LR" value={certForm.organization} onChange={(e) => setCertForm({ ...certForm, organization: e.target.value })} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Emission</label>
                  <input type="date" className="input-field" value={certForm.issuing_date} onChange={(e) => setCertForm({ ...certForm, issuing_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Expiration</label>
                  <input type="date" className="input-field" value={certForm.expiration_date} onChange={(e) => setCertForm({ ...certForm, expiration_date: e.target.value })} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Date Visite / Échéance Active</label>
                  <input type="date" className="input-field" value={certForm.due_date} onChange={(e) => setCertForm({ ...certForm, due_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Fenêtre Autorisée</label>
                  <input type="text" className="input-field" placeholder="Ex. AS Window" value={certForm.window} onChange={(e) => setCertForm({ ...certForm, window: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Fichier Certificat PDF (Facultatif - Max 10 Mo)</label>
                <div className="pdf-upload-controls">
                  <input type="file" accept=".pdf" className="input-field" style={{ width: '100%' }} onChange={(e) => setCertPdfFile(e.target.files?.[0] || null)} />
                  {certPdfCurrent && (
                    <small className="text-secondary" style={{ marginTop: 4, display: 'block' }}>
                      📎 <span style={{ color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => openPdfViewer(certPdfCurrent, certForm.name)}>
                        {lang === 'fr' ? 'Voir le PDF actuel' : 'View current PDF'}
                      </span>
                    </small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Remarques</label>
                <textarea rows={3} className="textarea-field" value={certForm.remarks} onChange={(e) => setCertForm({ ...certForm, remarks: e.target.value })}></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditCertModal(false)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{lang === 'fr' ? 'Enregistrer' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACTIONABLE ITEM */}
      {showAddActionableModal && (
        <div className="modal active">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2>{t('btn_add_rec')}</h2>
              <span className="close-btn" onClick={() => setShowAddActionableModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleActionableSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Date Imposée</label>
                  <input type="date" className="input-field" value={actionableForm.imposed_date} onChange={(e) => setActionableForm({ ...actionableForm, imposed_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Catégorie</label>
                  <input type="text" className="input-field" placeholder="Ex. Class" value={actionableForm.category} onChange={(e) => setActionableForm({ ...actionableForm, category: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Rapport N°</label>
                  <input type="text" className="input-field" placeholder="Ex. 12345" value={actionableForm.report_number} onChange={(e) => setActionableForm({ ...actionableForm, report_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date Limite</label>
                  <input type="date" className="input-field" value={actionableForm.due_date} onChange={(e) => setActionableForm({ ...actionableForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea rows={4} required className="textarea-field" value={actionableForm.description} onChange={(e) => setActionableForm({ ...actionableForm, description: e.target.value })}></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddActionableModal(false)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{lang === 'fr' ? 'Ajouter' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMAIL SETTINGS */}
      {showSettingsModal && (
        <div className="modal active">
          <div className="modal-content glass">
            <div className="modal-header">
              <h2>{t('btn_email_settings')}</h2>
              <span className="close-btn" onClick={() => setShowSettingsModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleEmailSettingsSubmit}>
              <div className="form-group">
                <label>Adresse E-mail 1</label>
                <input type="email" className="input-field" placeholder="manager1@babor.com" value={settingsForm.email1} onChange={(e) => setSettingsForm({ ...settingsForm, email1: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Adresse E-mail 2</label>
                <input type="email" className="input-field" placeholder="manager2@babor.com" value={settingsForm.email2} onChange={(e) => setSettingsForm({ ...settingsForm, email2: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Adresse E-mail 3</label>
                <input type="email" className="input-field" placeholder="manager3@babor.com" value={settingsForm.email3} onChange={(e) => setSettingsForm({ ...settingsForm, email3: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowSettingsModal(false)}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary">{lang === 'fr' ? 'Enregistrer' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PDF VIEWER */}
      {showPdfModal && (
        <div className="modal active" id="modalPdfViewer">
          <div className="modal-content glass" style={{ maxWidth: 850 }}>
            <div className="modal-header">
              <h2>{t('pdf_viewer_title')} - {pdfViewerName}</h2>
              <span className="close-btn" onClick={() => { setShowPdfModal(false); setPdfViewerUrl(''); }}>&times;</span>
            </div>
            <div className="pdf-container">
              <iframe src={pdfViewerUrl} width="100%" height="600px" style={{ border: 'none', borderRadius: 'var(--border-radius-md)', background: '#121620' }}></iframe>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="toast-container">
        {toasts.map(t => (
          <div className={`toast toast-${t.type}`} key={t.id}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ'}</span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
