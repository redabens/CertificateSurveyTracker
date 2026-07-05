'use client';

import React, { useRef } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { ForcePasswordChangeView } from '../components/dashboard/ForcePasswordChangeView';
import { TvModeView } from '../components/dashboard/TvModeView';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { PdfViewerModal } from '../components/dashboard/PdfViewerModal';
import { CertificatesTable } from '../components/dashboard/CertificatesTable';
import { VesselSelector } from '../components/dashboard/VesselSelector';
import { ResetPasswordDrawer } from '../components/drawers/ResetPasswordDrawer';
import { ImportExcelDrawer } from '../components/drawers/ImportExcelDrawer';
import { AddVesselDrawer } from '../components/drawers/AddVesselDrawer';
import { EditCertificateDrawer } from '../components/drawers/EditCertificateDrawer';
import { AddActionableDrawer } from '../components/drawers/AddActionableDrawer';
import { EmailSettingsDrawer } from '../components/drawers/EmailSettingsDrawer';
import { AddUserDrawer } from '../components/drawers/AddUserDrawer';
import {
  LogoIcon,
  DashboardIcon,
  FleetIcon,
  TvIcon,
  LogsIcon,
  UserIcon,
  LogoutIcon,
  ImportIcon,
  AlertIcon,
  WarningIcon,
  CheckIcon
} from '../components/Icons';

export default function Dashboard() {
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  // Destructure everything from useDashboard hook to avoid changing the JSX structure below
  const {
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
    actionableItems, emailLogs,
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
    setCertPdfFile,
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
    setResetPasswordUserId,
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
  } = useDashboard(chartRef);

  if (!token || !user) return null;

  if (user.mustChangePassword) {
    return (
      <ForcePasswordChangeView
        lang={lang}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordChangeError={passwordChangeError}
        passwordChangeLoading={passwordChangeLoading}
        handleForcePasswordChange={handleForcePasswordChange}
        toasts={toasts}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      
      {/* ---------------------------------------------------- */}
      {/* TV FULLSCREEN OVERLAY */}
      {/* ---------------------------------------------------- */}
      {tvMode && (
        <TvModeView
          lang={lang}
          vessels={vessels}
          tvTime={tvTime}
          tvDate={tvDate}
          tvCerts={tvCerts}
          exitTvMode={exitTvMode}
          t={t}
          getAlarmLabel={getAlarmLabel}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* APP BODY CONTAINER */}
      {/* ---------------------------------------------------- */}
      {!tvMode && (
        <div className="app-grid">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="brand">
              <span className="logo-icon icon-svg">
                <LogoIcon size={42} />
              </span>
              <span className="logo-text">CNAN<span>Certifs</span></span>
            </div>
            <nav className="nav-menu">
              <a href="#dashboard" className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
                <span className="icon-svg"><DashboardIcon /></span> <span>{t('nav_dashboard')}</span>
              </a>
              <a href="#fleet" className={`nav-item ${activeView === 'fleet' ? 'active' : ''}`} onClick={() => setActiveView('fleet')}>
                <span className="icon-svg"><FleetIcon /></span> <span>{t('nav_fleet')}</span>
              </a>
              <a href="#tv-mode" className="nav-item" onClick={(e) => { e.preventDefault(); enterTvMode(); }}>
                <span className="icon-svg"><TvIcon /></span> <span>{t('nav_tv_mode')}</span>
              </a>
              <a href="#logs" className={`nav-item ${activeView === 'logs' ? 'active' : ''}`} onClick={() => setActiveView('logs')}>
                <span className="icon-svg"><LogsIcon /></span> <span>{t('nav_logs')}</span>
              </a>
              {user.role === 'Admin' && (
                <a href="#users" className={`nav-item ${activeView === 'users' ? 'active' : ''}`} onClick={() => setActiveView('users')}>
                  <span className="icon-svg"><UserIcon size={18} /></span> <span>{lang === 'fr' ? 'Utilisateurs' : 'Users'}</span>
                </a>
              )}
              {user.role === 'Admin' && (
                <a
                  href="#audit"
                  className={`nav-item ${activeView === 'audit' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveView('audit');
                    void loadAuditLogs();
                  }}
                >
                  <span className="icon-svg"><LogsIcon /></span>
                  <span>{lang === 'fr' ? 'Audit Trail' : 'Audit Trail'}</span>
                </a>
              )}
            </nav>
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="avatar icon-svg" style={{ background: 'rgba(156, 163, 175, 0.1)', borderRadius: 'var(--border-radius-md)', width: 36, height: 36, color: 'var(--text-secondary)' }}>
                  <UserIcon size={18} />
                </div>
                <div className="profile-info">
                  <div className="profile-name">{user.full_name}</div>
                  <div className="profile-role" id="currentUserRoleBadge">
                    {user.role === 'Admin' ? 'Administrateur' : user.role === 'Crew' ? 'Équipage (Capitaine)' : user.role === 'Partner' ? 'Partenaire B2B' : 'Auditeur Externe'}
                  </div>
                </div>
                <button className="btn-logout icon-svg" onClick={logout} title="Déconnexion"><LogoutIcon size={18} /></button>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="main-content">
            {/* HEADER */}
            <header className="app-header">
              <div className="header-search">
                <h1>{activeView === 'audit' ? (lang === 'fr' ? 'Journal d\'Audit' : 'Audit Trail') : t(`nav_${activeView}`)}</h1>
              </div>
              <div className="header-actions">
                <div className="lang-selector">
                  <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>FR</button>
                  <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
                </div>
                {user.role === 'Admin' && (
                  <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
                    <span className="icon-svg"><ImportIcon /></span> <span>{t('btn_import_excel')}</span>
                  </button>
                )}
              </div>
            </header>

            {/* ---------------------------------------------------- */}
            {/* VIEW: DASHBOARD */}
            {/* ---------------------------------------------------- */}
            {activeView === 'dashboard' && (
              <DashboardOverview
                vessels={vessels}
                lang={lang}
                t={t}
                chartRef={chartRef}
                setActiveView={setActiveView}
                setSelectedVesselId={setSelectedVesselId}
              />
            )}

            {/* ---------------------------------------------------- */}
            {/* VIEW: FLEET */}
            {/* ---------------------------------------------------- */}
            {activeView === 'fleet' && (
              <section className="app-view active">
                <div className="fleet-view-container">
                  <VesselSelector
                    vessels={vessels}
                    selectedVesselId={selectedVesselId}
                    onSelect={setSelectedVesselId}
                    isAdmin={user.role === 'Admin'}
                    onAddVessel={() => setShowAddVesselModal(true)}
                    t={t}
                  />

                  <div className="fleet-detail-area">
                    {!selectedVessel ? (
                      <div className="empty-state">
                        <span className="empty-icon icon-svg" style={{ opacity: 0.4, color: 'var(--text-muted)' }}>
                          <FleetIcon size={64} />
                        </span>
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
                                    id="certSearchInput"
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

                              <CertificatesTable
                                filteredCerts={filteredCerts}
                                userRole={user.role}
                                lang={lang}
                                t={t}
                                formatDateString={formatDateString}
                                getAlarmBadgeClass={getAlarmBadgeClass}
                                getAlarmLabel={getAlarmLabel}
                                handleEditCertOpen={handleEditCertOpen}
                                handleDeleteCert={handleDeleteCert}
                                openPdfViewer={openPdfViewer}
                              />
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
                                            <td>{formatDateString(a.imposed_date)}</td>
                                            <td>{a.category || '-'}</td>
                                            <td>{a.report_number || '-'}</td>
                                            <td><strong>{a.due_date ? formatDateString(a.due_date) : (lang === 'fr' ? 'Non spécifiée' : 'Not specified')}</strong></td>
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
                                <td>{formatDateTimeString(l.sent_at)}</td>
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

            {/* ---------------------------------------------------- */}
            {/* VIEW: USER MANAGEMENT */}
            {/* ---------------------------------------------------- */}
            {activeView === 'users' && user?.role === 'Admin' && (
              <section className="app-view active">
                <div className="card glass">
                  <div className="card-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{lang === 'fr' ? 'Gestion des Utilisateurs' : 'User Management'}</h2>
                    <button className="btn btn-primary" onClick={() => { setTempInviteOtp(null); setShowAddUserModal(true); }}>
                      <span className="icon-svg"><UserIcon size={16} /></span> <span style={{ marginLeft: '8px' }}>{lang === 'fr' ? 'Nouvel Utilisateur' : 'New User'}</span>
                    </button>
                  </div>
                  <p className="section-desc" style={{ marginTop: 8 }}>
                    {lang === 'fr'
                      ? 'Créez des comptes et attribuez-leur des rôles (Administrateur, Équipage, Partenaire, Auditeur).'
                      : 'Create accounts and assign them roles (Admin, Crew, Partner, Auditor).'}
                  </p>

                  <div className="table-container scrollable" style={{ marginTop: 20 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{lang === 'fr' ? 'Nom Complet' : 'Full Name'}</th>
                          <th>Email</th>
                          <th>{lang === 'fr' ? 'Rôle' : 'Role'}</th>
                          <th>{lang === 'fr' ? 'Première Connexion' : 'First Connection'}</th>
                          <th>{lang === 'fr' ? 'Navire Associé' : 'Associated Vessel'}</th>
                          <th>{lang === 'fr' ? 'Actions' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.length === 0 ? (
                          <tr><td colSpan={6} className="placeholder-text">{lang === 'fr' ? 'Aucun utilisateur trouvé.' : 'No users found.'}</td></tr>
                        ) : (
                          usersList.map(u => {
                            const linkedVesselName = vessels.find(v => v.id === u.vessel_id)?.name || '-';
                            return (
                              <tr key={u.id}>
                                  <td><strong>{u.full_name}</strong></td>
                                  <td><code>{u.email}</code></td>
                                  <td>
                                    <span className={`badge ${u.role === 'Admin' ? 'badge-red' : u.role === 'Crew' ? 'badge-yellow' : u.role === 'Partner' ? 'badge-green' : 'badge-normal'}`}>
                                      {u.role === 'Admin' ? 'Administrateur' : u.role === 'Crew' ? 'Équipage' : u.role === 'Partner' ? 'Partenaire' : 'Auditeur'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${u.must_change_password ? 'badge-yellow' : 'badge-green'}`}>
                                      {u.must_change_password 
                                        ? (lang === 'fr' ? 'En attente (OTP)' : 'Pending (OTP)') 
                                        : (lang === 'fr' ? 'Configuré ✓' : 'Configured ✓')}
                                    </span>
                                  </td>
                                  <td><strong>{linkedVesselName}</strong></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                        onClick={() => {
                                          setResetPasswordUserId(u.id);
                                          setResetPasswordUserName(u.full_name);
                                          setResetPasswordValue('');
                                          setShowResetPasswordModal(true);
                                        }}
                                        title={lang === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset password'}
                                      >
                                        🔑 {lang === 'fr' ? 'MDP' : 'Reset'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        style={{ fontSize: '11px', padding: '4px 8px' }}
                                        onClick={() => handleDeleteUser(u.id, u.full_name)}
                                        title={lang === 'fr' ? 'Supprimer cet utilisateur' : 'Delete this user'}
                                      >
                                        🗑️
                                      </button>
                                    </div>
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

            {/* ---------------------------------------------------- */}
            {/* VIEW: AUDIT TRAIL */}
            {/* ---------------------------------------------------- */}
            {activeView === 'audit' && user?.role === 'Admin' && (
              <section className="app-view active">
                <div className="card glass">
                  <div className="card-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{lang === 'fr' ? 'Journal d\'Audit' : 'Audit Trail'}</h2>
                    <button className="btn btn-outline" onClick={loadAuditLogs} disabled={auditLoading}>
                      {auditLoading ? (lang === 'fr' ? 'Chargement...' : 'Loading...') : (lang === 'fr' ? 'Rafraîchir' : 'Refresh')}
                    </button>
                  </div>
                  <p className="section-desc" style={{ marginTop: 8 }}>
                    {lang === 'fr'
                      ? 'Historique complet des actions critiques effectuées sur la plateforme.'
                      : 'Complete history of critical actions performed on the platform.'}
                  </p>

                  <div className="table-container scrollable" style={{ marginTop: 20 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date / Heure</th>
                          <th>Utilisateur</th>
                          <th>Action</th>
                          <th>Type de Cible</th>
                          <th>ID Cible</th>
                          <th>Nom de Cible</th>
                          <th>Changements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.length === 0 ? (
                          <tr><td colSpan={7} className="placeholder-text">{lang === 'fr' ? 'Aucun log d\'audit disponible.' : 'No audit logs available.'}</td></tr>
                        ) : (
                          auditLogs.map(l => {
                            let changesStr = '';
                            if (l.changes) {
                              try {
                                const parsed = JSON.parse(l.changes);
                                changesStr = Object.entries(parsed).map(([k, v]: [string, any]) => {
                                  return `${k}: ${v.from} ➔ ${v.to}`;
                                }).join(', ');
                              } catch {
                                changesStr = String(l.changes);
                              }
                            }
                            return (
                              <tr key={l.id}>
                                <td>{formatDateTimeString(l.timestamp)}</td>
                                <td>{l.user_email}</td>
                                <td><span className="badge badge-normal">{l.action}</span></td>
                                <td>{l.target_type}</td>
                                <td>{l.target_id || '-'}</td>
                                <td><strong>{l.target_name || '-'}</strong></td>
                                <td><small className="text-secondary">{changesStr || '-'}</small></td>
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

      <ResetPasswordDrawer
        open={showResetPasswordModal}
        userName={resetPasswordUserName}
        passwordValue={resetPasswordValue}
        isSubmitting={isSubmitting}
        lang={lang}
        onClose={() => { setShowResetPasswordModal(false); setResetPasswordValue(''); }}
        onPasswordChange={setResetPasswordValue}
        onSubmit={handleAdminResetPassword}
      />

      <ImportExcelDrawer
        open={showImportModal}
        importFile={importFile}
        isSubmitting={isSubmitting}
        lang={lang}
        t={t}
        onClose={() => setShowImportModal(false)}
        onFileChange={setImportFile}
        onSubmit={handleImportExcel}
      />

      <AddVesselDrawer
        open={showAddVesselModal}
        vesselForm={vesselForm}
        isSubmitting={isSubmitting}
        lang={lang}
        t={t}
        onClose={() => setShowAddVesselModal(false)}
        onFormChange={setVesselForm}
        onSubmit={handleCreateVessel}
      />

      <EditCertificateDrawer
        open={showEditCertModal}
        certForm={certForm}
        certPdfCurrent={certPdfCurrent}
        isSubmitting={isSubmitting}
        isCrew={user?.role === 'Crew'}
        lang={lang}
        t={t}
        onClose={() => setShowEditCertModal(false)}
        onFormChange={setCertForm}
        onPdfFileChange={setCertPdfFile}
        onSubmit={handleEditCertSubmit}
        onViewCurrentPdf={() => openPdfViewer(certPdfCurrent, certForm.name)}
        onFileSizeError={() => showToast(lang === 'fr' ? 'Fichier trop volumineux (Max. 10 Mo)' : 'File too large (Max. 10 MB)', 'error')}
      />

      <AddActionableDrawer
        open={showAddActionableModal}
        actionableForm={actionableForm}
        isSubmitting={isSubmitting}
        lang={lang}
        t={t}
        onClose={() => setShowAddActionableModal(false)}
        onFormChange={setActionableForm}
        onSubmit={handleActionableSubmit}
      />

      <EmailSettingsDrawer
        open={showSettingsModal}
        vesselEmails={vesselEmails}
        newVesselEmail={newVesselEmail}
        emailToVerify={emailToVerify}
        verificationCode={verificationCode}
        devOtpNotice={devOtpNotice}
        isSubmitting={isSubmitting}
        lang={lang}
        onClose={() => setShowSettingsModal(false)}
        onNewEmailChange={setNewVesselEmail}
        onAddEmailSubmit={handleAddEmailSubmit}
        onVerifyEmailSubmit={handleVerifyEmailSubmit}
        onDeleteEmail={handleDeleteEmail}
        onStartVerify={(email, otp) => { setEmailToVerify(email); setVerificationCode(''); setDevOtpNotice(otp); }}
        onCancelVerify={() => { setEmailToVerify(null); setDevOtpNotice(null); }}
        onVerificationCodeChange={setVerificationCode}
      />

      <AddUserDrawer
        open={showAddUserModal}
        userForm={userForm}
        vessels={vessels}
        tempInviteOtp={tempInviteOtp}
        isSubmitting={isSubmitting}
        lang={lang}
        onClose={() => { setTempInviteOtp(null); setShowAddUserModal(false); }}
        onFormChange={setUserForm}
        onSubmit={handleCreateUserSubmit}
      />

      {/* MODAL: PDF VIEWER */}
      <PdfViewerModal
        showPdfModal={showPdfModal}
        pdfViewerName={pdfViewerName}
        pdfViewerUrl={pdfViewerUrl}
        setShowPdfModal={setShowPdfModal}
        setPdfViewerUrl={setPdfViewerUrl}
        t={t}
      />

      {/* TOAST SYSTEM CONTAINER */}
      <div className="toast-container">
        {toasts.map(t => (
          <div className={`toast toast-${t.type}`} key={t.id}>
            <span className="icon-svg">
              {t.type === 'success' ? <CheckIcon size={16} /> : t.type === 'error' ? <AlertIcon size={16} /> : <WarningIcon size={16} />}
            </span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
