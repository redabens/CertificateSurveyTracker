import React from 'react';
import { ShipIcon, AlertIcon, WarningIcon, CheckIcon } from '../Icons';

interface DashboardOverviewProps {
  vessels: any[];
  t: (key: string) => string;
  chartRef: React.RefObject<HTMLCanvasElement | null>;
  setActiveView: (view: 'dashboard' | 'fleet' | 'logs' | 'users' | 'audit') => void;
  setSelectedVesselId: (id: number | null) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  vessels,
  t,
  chartRef,
  setActiveView,
  setSelectedVesselId,
}) => {
  const urgentCount = vessels.reduce((acc, curr) => acc + (curr.counts?.overdue || 0) + (curr.counts?.red || 0), 0);
  const warningCount = vessels.reduce((acc, curr) => acc + (curr.counts?.yellow || 0), 0);
  const greenCount = vessels.reduce((acc, curr) => acc + (curr.counts?.green || 0), 0);

  const criticalVessels = vessels.filter(v => v.status === 'Imminent' || v.status === 'Attention');

  const handleVesselClick = (vesselId: number) => {
    setSelectedVesselId(vesselId);
    setActiveView('fleet');
  };

  const handleStatCardClick = () => {
    setActiveView('fleet');
  };

  return (
    <section className="app-view active">
      <div className="stats-grid">
        <div className="stat-card stat-total" style={{ cursor: 'pointer' }} onClick={handleStatCardClick}>
          <div className="stat-icon icon-svg" style={{ color: 'var(--primary-color)' }}>
            <ShipIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_active_vessels')}</h3>
            <div className="stat-number">{vessels.length}</div>
          </div>
        </div>
        <div className="stat-card stat-red" style={{ cursor: 'pointer' }} onClick={handleStatCardClick}>
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-red)' }}>
            <AlertIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_urgent')}</h3>
            <div className="stat-number">{urgentCount}</div>
          </div>
        </div>
        <div className="stat-card stat-yellow" style={{ cursor: 'pointer' }} onClick={handleStatCardClick}>
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-yellow)' }}>
            <WarningIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_attention')}</h3>
            <div className="stat-number">{warningCount}</div>
          </div>
        </div>
        <div className="stat-card stat-green" style={{ cursor: 'pointer' }} onClick={handleStatCardClick}>
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-green)' }}>
            <CheckIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_monitored')}</h3>
            <div className="stat-number">{greenCount}</div>
          </div>
        </div>
      </div>

      {/* ─── CATEGORY BREAKDOWN ─────────────────────────────────── */}
      <div className="card glass" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>{t('category_breakdown_title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>⚓ {t('cat_class_alerts')}</span>
            <span className="badge badge-normal" style={{ fontSize: 13, padding: '4px 10px' }}>
              {vessels.reduce((acc, curr) => acc + (curr.counts?.classCerts || 0), 0)} {t('tab_certs')}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>🚩 {t('cat_flag_alerts')}</span>
            <span className="badge badge-normal" style={{ fontSize: 13, padding: '4px 10px' }}>
              {vessels.reduce((acc, curr) => acc + (curr.counts?.flagCerts || 0), 0)} {t('tab_certs')}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>🛠️ {t('cat_servicing_alerts')}</span>
            <span className="badge badge-normal" style={{ fontSize: 13, padding: '4px 10px' }}>
              {vessels.reduce((acc, curr) => acc + (curr.counts?.servicingCerts || 0), 0)} {t('tab_certs')}
            </span>
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
            {criticalVessels.length === 0 ? (
              <p className="placeholder-text">{t('no_alerts')}</p>
            ) : (
              criticalVessels.map(v => (
                <div 
                  className="critical-list-item" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => handleVesselClick(v.id)} 
                  key={v.id}
                >
                  <div className="item-left">
                    <span className="item-title">{v.name}</span>
                    <span className="item-sub">
                      {t('need_compliance_action')}
                    </span>
                  </div>
                  <span className={`badge ${v.status === 'Imminent' ? 'badge-red' : 'badge-yellow'}`}>
                    {(v.counts?.urgent ?? ((v.counts?.overdue || 0) + (v.counts?.red || 0)))} {t('lbl_urgents')} | {v.counts?.yellow || 0} {t('lbl_warnings')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── OPTION 3: 90-DAY SURVEY FORECAST WIDGET ───────────────────────── */}
      <div className="card glass" style={{ marginTop: 24, padding: '18px 22px' }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          📅 {t('forecast_title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: '14px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--status-red)', letterSpacing: '0.5px' }}>
              {t('month_current')}
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
              {urgentCount}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('surveys_count')}</span>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 10, padding: '14px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--status-yellow)', letterSpacing: '0.5px' }}>
              {t('month_next')}
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
              {warningCount}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('surveys_count')}</span>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 10, padding: '14px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--status-green)', letterSpacing: '0.5px' }}>
              {t('month_plus2')}
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '6px 0 2px' }}>
              {greenCount}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('surveys_count')}</span>
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2>{t('vessel_summary')}</h2>
      </div>
      <div className="vessels-card-grid">
        {vessels.map(v => (
          <div 
            className={`vessel-card status-${v.status}`} 
            onClick={() => handleVesselClick(v.id)} 
            key={v.id}
          >
            <div className="vessel-card-header">
              <div>
                <h3>{v.name}</h3>
                <span className="vessel-card-imo">IMO {v.imo_number || 'N/A'}</span>
              </div>
              <span className={`badge ${v.status === 'Imminent' ? 'badge-red' : v.status === 'Attention' ? 'badge-yellow' : v.status === 'Suivi' ? 'badge-green' : 'badge-normal'}`}>
                {v.status === 'Imminent' ? t('status_imminent') : v.status === 'Attention' ? t('status_attention') : v.status === 'Suivi' ? t('status_suivi') : t('status_normal')}
              </span>
            </div>
            <div className="vessel-card-body">
              {v.counts?.overdue > 0 && (
                <div className="vessel-card-stat">
                  <span className="dot dot-red"></span>
                  <span>{t('status_overdue')}: <strong>{v.counts.overdue}</strong></span>
                </div>
              )}
              {v.counts?.red > 0 && (
                <div className="vessel-card-stat">
                  <span className="dot dot-orange"></span>
                  <span>{t('status_under_1m')}: <strong>{v.counts.red}</strong></span>
                </div>
              )}
              {v.counts?.yellow > 0 && (
                <div className="vessel-card-stat">
                  <span className="dot dot-yellow"></span>
                  <span>{t('label_warning')}: <strong>{v.counts.yellow}</strong></span>
                </div>
              )}
              {(v.counts?.overdue || 0) === 0 && (v.counts?.red || 0) === 0 && (v.counts?.yellow || 0) === 0 && (
                <div className="vessel-card-stat" style={{ color: 'var(--status-green)' }}>
                  <span className="dot" style={{ backgroundColor: 'var(--status-green)' }}></span>
                  <span>{t('label_compliant')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
