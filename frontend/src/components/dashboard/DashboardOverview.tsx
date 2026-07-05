import React from 'react';
import { ShipIcon, AlertIcon, WarningIcon, CheckIcon } from '../Icons';

interface DashboardOverviewProps {
  vessels: any[];
  lang: string;
  t: (key: string) => string;
  chartRef: React.RefObject<HTMLCanvasElement | null>;
  setActiveView: (view: 'dashboard' | 'fleet' | 'logs' | 'users' | 'audit') => void;
  setSelectedVesselId: (id: number | null) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  vessels,
  lang,
  t,
  chartRef,
  setActiveView,
  setSelectedVesselId,
}) => {
  const urgentCount = vessels.reduce((acc, curr) => acc + (curr.counts?.red || 0), 0);
  const warningCount = vessels.reduce((acc, curr) => acc + (curr.counts?.yellow || 0), 0);
  const greenCount = vessels.reduce((acc, curr) => acc + (curr.counts?.green || 0), 0);

  const criticalVessels = vessels.filter(v => v.status === 'Imminent' || v.status === 'Attention');

  const handleVesselClick = (vesselId: number) => {
    setSelectedVesselId(vesselId);
    setActiveView('fleet');
  };

  return (
    <section className="app-view active">
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon icon-svg" style={{ color: 'var(--primary-color)' }}>
            <ShipIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_active_vessels')}</h3>
            <div className="stat-number">{vessels.length}</div>
          </div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-red)' }}>
            <AlertIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_urgent')}</h3>
            <div className="stat-number">{urgentCount}</div>
          </div>
        </div>
        <div className="stat-card stat-yellow">
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-yellow)' }}>
            <WarningIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_attention')}</h3>
            <div className="stat-number">{warningCount}</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon icon-svg" style={{ color: 'var(--status-green)' }}>
            <CheckIcon size={24} />
          </div>
          <div className="stat-details">
            <h3>{t('widget_monitored')}</h3>
            <div className="stat-number">{greenCount}</div>
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
                      {lang === 'fr' ? 'Nécessite des actions de conformité urgentes' : 'Requires urgent compliance action'}
                    </span>
                  </div>
                  <span className={`badge ${v.status === 'Imminent' ? 'badge-red' : 'badge-yellow'}`}>
                    {v.counts?.red || 0} {lang === 'fr' ? 'Urgents' : 'Urgents'} | {v.counts?.yellow || 0} {lang === 'fr' ? 'Alertes' : 'Warnings'}
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
                {lang === 'fr' 
                  ? (v.status === 'Imminent' ? 'Imminent' : v.status === 'Attention' ? 'Attention' : v.status === 'Suivi' ? 'Suivi' : 'Normal')
                  : v.status}
              </span>
            </div>
            <div className="vessel-card-body">
              <div className="vessel-card-stat">
                <span className="dot dot-red"></span>
                <span>{lang === 'fr' ? 'Urgent' : 'Urgent'}: <strong>{v.counts?.red || 0}</strong></span>
              </div>
              <div className="vessel-card-stat">
                <span className="dot dot-yellow"></span>
                <span>{lang === 'fr' ? 'Attention' : 'Warning'}: <strong>{v.counts?.yellow || 0}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
