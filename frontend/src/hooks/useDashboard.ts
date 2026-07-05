'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/navigation';
import { Chart } from 'chart.js/auto';

// ─── Shared Types ────────────────────────────────────────────────────────────

export type ToastMsg = { id: number; text: string; type: 'success' | 'error' | 'info' };

export type ActiveView = 'dashboard' | 'fleet' | 'logs' | 'users' | 'audit';
export type ActiveTab = 'certs' | 'recs';

export interface VesselFormState {
  name: string;
  imo_number: string;
  flag: string;
  asset_type: string;
  owner: string;
  manager: string;
}

export interface CertFormState {
  id: string;
  name: string;
  category: string;
  organization: string;
  issuing_date: string;
  expiration_date: string;
  due_date: string;
  window: string;
  remarks: string;
}

export interface ActionableFormState {
  imposed_date: string;
  category: string;
  report_number: string;
  due_date: string;
  description: string;
}

export interface UserFormState {
  email: string;
  fullName: string;
  role: string;
  companyId: number;
  vesselId: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboard(chartRef: RefObject<HTMLCanvasElement | null>) {
  const { token, user, logout, apiFetch, updateUser } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const chartInstance = useRef<any>(null);

  // Navigation & Views
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [tvMode, setTvMode] = useState(false);
  const [tvTime, setTvTime] = useState('');
  const [tvDate, setTvDate] = useState('');
  const [tvCerts, setTvCerts] = useState<any[]>([]);

  // Audit
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Data
  const [vessels, setVessels] = useState<any[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [actionableItems, setActionableItems] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  // Filters
  const [certSearch, setCertSearch] = useState('');
  const [certCategory, setCertCategory] = useState('ALL');
  const [certStatus, setCertStatus] = useState('ALL');
  const [activeTab, setActiveTab] = useState<ActiveTab>('certs');

  // Modals visibility
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddVesselModal, setShowAddVesselModal] = useState(false);
  const [showEditCertModal, setShowEditCertModal] = useState(false);
  const [showAddActionableModal, setShowAddActionableModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Form states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [vesselForm, setVesselForm] = useState<VesselFormState>({
    name: '', imo_number: '', flag: '', asset_type: '', owner: '', manager: ''
  });
  const [certForm, setCertForm] = useState<CertFormState>({
    id: '', name: '', category: 'Class', organization: '',
    issuing_date: '', expiration_date: '', due_date: '', window: '', remarks: ''
  });
  const [certPdfFile, setCertPdfFile] = useState<File | null>(null);
  const [certPdfCurrent, setCertPdfCurrent] = useState('');
  const [actionableForm, setActionableForm] = useState<ActionableFormState>({
    imposed_date: '', category: '', report_number: '', due_date: '', description: ''
  });
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  const [pdfViewerName, setPdfViewerName] = useState('');

  // Email states
  const [vesselEmails, setVesselEmails] = useState<any[]>([]);
  const [newVesselEmail, setNewVesselEmail] = useState('');
  const [emailToVerify, setEmailToVerify] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // User management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userForm, setUserForm] = useState<UserFormState>({
    email: '', fullName: '', role: 'Crew', companyId: 1, vesselId: ''
  });
  const [tempInviteOtp, setTempInviteOtp] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [resetPasswordUserName, setResetPasswordUserName] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  // Password change overlay
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast system
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const handleCatchError = useCallback((err: any) => {
    if (err instanceof Error && err.message === 'Unauthorized') return;
    console.error(err);
  }, []);

  const formatDateString = useCallback((dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  }, [lang]);

  const formatDateTimeString = useCallback((dateTimeStr: string) => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr.replace(' ', 'T'));
      if (isNaN(date.getTime())) return dateTimeStr;
      return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(date);
    } catch {
      return dateTimeStr;
    }
  }, [lang]);

  const getAlarmBadgeClass = useCallback((status: string) => {
    if (status.includes('RED') || status.includes('OVERDUE')) return 'badge-red';
    if (status.includes('YELLOW')) return 'badge-yellow';
    if (status.includes('GREEN')) return 'badge-green';
    return 'badge-normal';
  }, []);

  const getAlarmLabel = useCallback((status: string) => {
    if (lang === 'fr') {
      if (status.includes('RED')) return 'ROUGE - <1 MOIS';
      if (status.includes('YELLOW')) return 'JAUNE - 1 A 3 MOIS';
      if (status.includes('GREEN')) return 'VERT - 3 A 6 MOIS';
      if (status.includes('MONITOR')) return 'SUIVI >6 MOIS';
      if (status.includes('OVERDUE')) return 'EXPIRÉ / IMMINENT';
      return status;
    }
    return status;
  }, [lang]);

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadVessels = useCallback(async () => {
    try {
      const res = await apiFetch('/vessels');
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setVessels(data);
        if (data.length > 0 && !selectedVesselId) {
          setSelectedVesselId(data[0].id);
        }
      } else {
        console.error('Expected array, got:', data);
      }
    } catch (err) {
      handleCatchError(err);
    }
  }, [apiFetch, selectedVesselId, handleCatchError]);

  const loadVesselDetails = useCallback(async (id: number) => {
    try {
      const [resCerts, resRecs] = await Promise.all([
        apiFetch(`/vessels/${id}/certificates`),
        apiFetch(`/vessels/${id}/actionable-items`)
      ]);
      if (resCerts.ok && resRecs.ok) {
        const certs = await resCerts.json();
        const recs = await resRecs.json();
        if (Array.isArray(certs)) setCertificates(certs);
        if (Array.isArray(recs)) setActionableItems(recs);
      } else {
        console.error('Error fetching vessel details', resCerts.status, resRecs.status);
      }
    } catch (err) {
      handleCatchError(err);
    }
  }, [apiFetch, handleCatchError]);

  const loadEmailLogs = useCallback(async () => {
    try {
      const res = await apiFetch('/email-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEmailLogs(data);
      } else {
        console.error('Error fetching email logs', res.status);
      }
    } catch (err) {
      handleCatchError(err);
    }
  }, [apiFetch, handleCatchError]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setUsersList(data);
      }
    } catch (err) {
      handleCatchError(err);
    }
  }, [apiFetch, handleCatchError]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await apiFetch('/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAuditLogs(data);
      } else {
        console.error('Error fetching audit logs', res.status);
      }
    } catch (err) {
      handleCatchError(err);
    } finally {
      setAuditLoading(false);
    }
  }, [apiFetch, handleCatchError]);

  const loadVesselEmails = useCallback(async (vesselId: number) => {
    try {
      const res = await apiFetch(`/vessels/${vesselId}/emails`);
      if (res.ok) {
        const data = await res.json();
        setVesselEmails(data);
      }
    } catch (err) {
      handleCatchError(err);
    }
  }, [apiFetch, handleCatchError]);

  const loadTvCerts = useCallback(async () => {
    const list: any[] = [];
    for (const v of vessels) {
      try {
        const res = await apiFetch(`/vessels/${v.id}/certificates`);
        if (res.ok) {
          const certs = await res.json();
          if (Array.isArray(certs)) {
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
          }
        }
      } catch (err) {
        handleCatchError(err);
      }
    }
    list.sort((a, b) => {
      const ord: Record<string, number> = { red: 1, yellow: 2, green: 3 };
      return ord[a.level] - ord[b.level];
    });
    setTvCerts(list);
  }, [apiFetch, vessels, handleCatchError]);

  const handleCreateCertOpen = useCallback(() => {
    setCertForm({
      id: '', name: '',
      category: user?.role === 'Crew' ? 'Servicing' : 'Class',
      organization: '', issuing_date: '', expiration_date: '',
      due_date: '', window: '', remarks: ''
    });
    setCertPdfFile(null);
    setCertPdfCurrent('');
    setShowEditCertModal(true);
  }, [user?.role]);

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Session check
  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else if (user && !user.mustChangePassword) {
      void loadVessels();
    }
  }, [token, loadVessels, router, user]);

  // Global keyboard shortcuts for fleet operators
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        setShowImportModal(false);
        setShowAddVesselModal(false);
        setShowEditCertModal(false);
        setShowAddActionableModal(false);
        setShowSettingsModal(false);
        setShowPdfModal(false);
        setShowAddUserModal(false);
        setShowResetPasswordModal(false);
      } else if (e.key === 's' || e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('certSearchInput') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === 'd') {
        setActiveView('dashboard');
      } else if (e.key === 'f') {
        setActiveView('fleet');
      } else if (e.key === 'l') {
        setActiveView('logs');
      } else if (e.key === 'u' && user?.role === 'Admin') {
        setActiveView('users');
      } else if (e.key === 'a' && user?.role === 'Admin') {
        setActiveView('audit');
      } else if (e.key === 't') {
        setTvMode(true);
        const doc = document.documentElement;
        if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
      } else if (e.key === 'n') {
        if (activeView === 'fleet' && activeTab === 'certs') {
          e.preventDefault();
          handleCreateCertOpen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, activeTab, user?.role, handleCreateCertOpen]);

  // Load vessel details on selection change
  useEffect(() => {
    if (selectedVesselId) void loadVesselDetails(selectedVesselId);
  }, [selectedVesselId, loadVesselDetails]);

  // Load email logs when switching to logs view
  useEffect(() => {
    if (activeView === 'logs') void loadEmailLogs();
  }, [activeView, loadEmailLogs]);

  // Load users list when switching to users view
  useEffect(() => {
    if (activeView === 'users' && user?.role === 'Admin') void loadUsers();
  }, [activeView, loadUsers, user]);

  // Load audit logs when switching to audit view
  useEffect(() => {
    if (activeView === 'audit' && user?.role === 'Admin') void loadAuditLogs();
  }, [activeView, loadAuditLogs, user]);

  // Chart.js doughnut — needs chartRef from component
  useEffect(() => {
    if (activeView === 'dashboard' && vessels.length > 0 && chartRef.current) {
      let red = 0, yellow = 0, green = 0, normal = 0;
      vessels.forEach(v => {
        red += v.counts.red || 0;
        yellow += v.counts.yellow || 0;
        green += v.counts.green || 0;
        normal += v.counts.normal || 0;
      });

      if (chartInstance.current) chartInstance.current.destroy();

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
            backgroundColor: ['#d64f3e', '#e59b3c', '#48a37e', '#cca43b'],
            borderWidth: 1,
            borderColor: 'var(--border-color)'
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
  }, [vessels, activeView, lang, chartRef]);

  // TV mode clock + auto-refresh
  useEffect(() => {
    if (tvMode) {
      const update = () => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        setTvTime(`${hrs}:${mins}:${secs}`);
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as const;
        setTvDate(now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', opts));
      };
      update();
      const interval = setInterval(update, 1000);
      void loadTvCerts();
      const tvFetchInterval = setInterval(() => { void loadTvCerts(); }, 30000);
      return () => {
        clearInterval(interval);
        clearInterval(tvFetchInterval);
      };
    }
  }, [tvMode, vessels, lang, loadTvCerts]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || isSubmitting) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await apiFetch('/vessels/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        showToast(lang === 'fr' ? 'Navire importé avec succès !' : 'Vessel imported successfully!', 'success');
        setShowImportModal(false);
        setImportFile(null);
        await loadVessels();
        setSelectedVesselId(data.vesselId);
      } else {
        showToast(data.error || "Erreur d'importation", 'error');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'import: ${errMsg}` : `Import error: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/vessels/manual', { method: 'POST', body: JSON.stringify(vesselForm) });
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
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la création du navire: ${errMsg}` : `Error creating vessel: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
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
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de la suppression du navire: ${errMsg}` : `Error deleting vessel: ${errMsg}`, 'error');
    }
  };

  const handleEditCertOpen = (c: any) => {
    setCertForm({
      id: c.id, name: c.name, category: c.category,
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

  const handleEditCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const url = certForm.id ? `/certificates/${certForm.id}` : `/vessels/${selectedVesselId}/certificates`;
      const method = certForm.id ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: certForm.name, category: certForm.category,
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
        if (certPdfFile) {
          const formData = new FormData();
          formData.append('pdf', certPdfFile);
          const uploadRes = await fetch(`http://localhost:3000/api/certificates/${certId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            showToast(lang === 'fr' ? 'PDF téléversé !' : 'PDF uploaded!', 'success');
          }
        }
        showToast(lang === 'fr' ? 'Certificat enregistré' : 'Certificate saved', 'success');
        setShowEditCertModal(false);
        if (selectedVesselId) void loadVesselDetails(selectedVesselId);
        void loadVessels();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'enregistrement: ${errMsg}` : `Error saving: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCert = async (certId: number) => {
    if (!confirm(lang === 'fr' ? 'Supprimer ce certificat ?' : 'Delete this certificate?')) return;
    try {
      const res = await apiFetch(`/certificates/${certId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Certificat supprimé' : 'Certificate deleted', 'success');
        if (selectedVesselId) void loadVesselDetails(selectedVesselId);
        void loadVessels();
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur de suppression: ${errMsg}` : `Delete error: ${errMsg}`, 'error');
    }
  };

  const handleActionableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/actionable-items`, {
        method: 'POST',
        body: JSON.stringify(actionableForm)
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Recommandation ajoutée' : 'Recommendation added', 'success');
        setShowAddActionableModal(false);
        setActionableForm({ imposed_date: '', category: '', report_number: '', due_date: '', description: '' });
        if (selectedVesselId) void loadVesselDetails(selectedVesselId);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur lors de l'ajout: ${errMsg}` : `Error adding: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
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
        if (selectedVesselId) void loadVesselDetails(selectedVesselId);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(lang === 'fr' ? `Erreur de mise à jour du statut: ${errMsg}` : `Error updating status: ${errMsg}`, 'error');
    }
  };

  const handleEmailSettingsOpen = async () => {
    if (!selectedVesselId) return;
    try {
      await loadVesselEmails(selectedVesselId);
      setEmailToVerify(null);
      setVerificationCode('');
      setNewVesselEmail('');
      setShowSettingsModal(true);
    } catch (err) {
      handleCatchError(err);
    }
  };

  const handleAddEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselEmail || !selectedVesselId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/emails`, {
        method: 'POST',
        body: JSON.stringify({ email: newVesselEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          lang === 'fr'
            ? "Code de vérification envoyé à l'adresse e-mail !"
            : 'Verification code sent to the email address!',
          'success'
        );
        setEmailToVerify(newVesselEmail);
        setVerificationCode('');
        setDevOtpNotice(data.devOtp || null);
        setNewVesselEmail('');
        await loadVesselEmails(selectedVesselId);
      } else {
        showToast(data.error || "Erreur lors de l'ajout", 'error');
      }
    } catch (err) {
      handleCatchError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToVerify || !verificationCode || !selectedVesselId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/emails/verify`, {
        method: 'POST',
        body: JSON.stringify({ email: emailToVerify, code: verificationCode }),
      });
      if (res.ok) {
        showToast(
          lang === 'fr' ? 'Adresse e-mail vérifiée avec succès !' : 'Email address verified successfully!',
          'success'
        );
        setEmailToVerify(null);
        setVerificationCode('');
        setDevOtpNotice(null);
        await loadVesselEmails(selectedVesselId);
      } else {
        const data = await res.json();
        showToast(data.error || 'Code incorrect', 'error');
      }
    } catch (err) {
      handleCatchError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    if (!selectedVesselId) return;
    const confirmMsg = lang === 'fr'
      ? `Supprimer l'adresse e-mail ${emailToDelete} ?`
      : `Delete email address ${emailToDelete}?`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await apiFetch(`/vessels/${selectedVesselId}/emails?email=${encodeURIComponent(emailToDelete)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Adresse e-mail supprimée' : 'Email address deleted', 'success');
        if (emailToVerify === emailToDelete) {
          setEmailToVerify(null);
          setDevOtpNotice(null);
        }
        await loadVesselEmails(selectedVesselId);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      handleCatchError(err);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: userForm.email,
          fullName: userForm.fullName,
          role: userForm.role,
          companyId: userForm.companyId,
          vesselId: userForm.role === 'Crew' ? parseInt(userForm.vesselId) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(lang === 'fr' ? 'Utilisateur créé avec succès !' : 'User created successfully!', 'success');
        setUserForm({ email: '', fullName: '', role: 'Crew', companyId: 1, vesselId: '' });
        setTempInviteOtp(data.tempOtp);
        await loadUsers();
      } else {
        showToast(data.error || "Erreur lors de la création de l'utilisateur", 'error');
      }
    } catch (err) {
      handleCatchError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUserId || !resetPasswordValue || isSubmitting) return;
    if (resetPasswordValue.length < 6) {
      showToast(lang === 'fr' ? 'Le mot de passe doit faire au moins 6 caractères.' : 'Password must be at least 6 characters.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/users/${resetPasswordUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Mot de passe réinitialisé avec succès.' : 'Password reset successfully.', 'success');
        setShowResetPasswordModal(false);
        setResetPasswordUserId(null);
        setResetPasswordUserName('');
        setResetPasswordValue('');
        await loadUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erreur', 'error');
      }
    } catch (err) {
      handleCatchError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmMsg = lang === 'fr'
      ? `Supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`
      : `Delete user "${userName}"? This action cannot be undone.`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(lang === 'fr' ? 'Utilisateur supprimé.' : 'User deleted.', 'success');
        await loadUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      handleCatchError(err);
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    if (newPassword.length < 6) {
      setPasswordChangeError(lang === 'fr' ? 'Le mot de passe doit faire au moins 6 caractères.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError(lang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    setPasswordChangeLoading(true);
    try {
      const res = await apiFetch('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        updateUser({ mustChangePassword: false });
        showToast(lang === 'fr' ? 'Mot de passe mis à jour avec succès !' : 'Password updated successfully!', 'success');
      } else {
        const data = await res.json();
        setPasswordChangeError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      setPasswordChangeError(String(err));
    } finally {
      setPasswordChangeLoading(false);
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
        void loadEmailLogs();
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') return;
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
    setPdfViewerUrl(`http://localhost:3000${url}`);
    setPdfViewerName(name);
    setShowPdfModal(true);
  };

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

  // ─── Derived values ────────────────────────────────────────────────────────

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

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

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Auth context passthrough
    token, user, logout,
    // Language
    lang, setLang, t,
    // Navigation
    activeView, setActiveView,
    tvMode, tvTime, tvDate, tvCerts,
    enterTvMode, exitTvMode,
    // Data
    vessels, selectedVesselId, setSelectedVesselId,
    certificates, actionableItems, emailLogs,
    selectedVessel, filteredCerts,
    // Audit
    auditLogs, auditLoading,
    // Filters
    certSearch, setCertSearch,
    certCategory, setCertCategory,
    certStatus, setCertStatus,
    activeTab, setActiveTab,
    // Modals
    showImportModal, setShowImportModal,
    showAddVesselModal, setShowAddVesselModal,
    showEditCertModal, setShowEditCertModal,
    showAddActionableModal, setShowAddActionableModal,
    showSettingsModal, setShowSettingsModal,
    showPdfModal, setShowPdfModal,
    showAddUserModal, setShowAddUserModal,
    showResetPasswordModal, setShowResetPasswordModal,
    // Form states
    importFile, setImportFile,
    vesselForm, setVesselForm,
    certForm, setCertForm,
    certPdfFile, setCertPdfFile,
    certPdfCurrent,
    actionableForm, setActionableForm,
    pdfViewerUrl, setPdfViewerUrl,
    pdfViewerName,
    // Email
    vesselEmails,
    newVesselEmail, setNewVesselEmail,
    emailToVerify, setEmailToVerify,
    verificationCode, setVerificationCode,
    devOtpNotice, setDevOtpNotice,
    // Users
    usersList,
    userForm, setUserForm,
    tempInviteOtp, setTempInviteOtp,
    resetPasswordUserId, setResetPasswordUserId,
    resetPasswordUserName, setResetPasswordUserName,
    resetPasswordValue, setResetPasswordValue,
    // Password change
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    passwordChangeError, passwordChangeLoading,
    // Global
    isSubmitting,
    toasts,
    // Helpers
    showToast,
    formatDateString, formatDateTimeString,
    getAlarmBadgeClass, getAlarmLabel,
    // Handlers
    handleImportExcel,
    handleCreateVessel,
    handleDeleteVessel,
    handleEditCertOpen,
    handleCreateCertOpen,
    handleEditCertSubmit,
    handleDeleteCert,
    handleActionableSubmit,
    toggleActionableStatus,
    handleEmailSettingsOpen,
    handleAddEmailSubmit,
    handleVerifyEmailSubmit,
    handleDeleteEmail,
    handleCreateUserSubmit,
    handleAdminResetPassword,
    handleDeleteUser,
    handleForcePasswordChange,
    triggerAlertCheck,
    handleExcelExport,
    openPdfViewer,
    loadAuditLogs,
  };
}

