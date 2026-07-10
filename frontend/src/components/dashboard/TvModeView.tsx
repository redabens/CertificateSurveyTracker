import React from 'react';
import { LogoIcon } from '../Icons';
import { TvScrollContainer } from '../TvAutoScroll';

interface TvModeViewProps {
  vessels: any[];
  tvTime: string;
  tvDate: string;
  tvCerts: any[];
  exitTvMode: () => void;
  t: (key: string) => string;
  getAlarmLabel: (status: string) => string;
}

export const TvModeView: React.FC<TvModeViewProps> = ({
  vessels,
  tvTime,
  tvDate,
  tvCerts,
  exitTvMode,
  t,
  getAlarmLabel,
}) => {
  return (
    <div id="view-tv-mode" className="tv-dashboard">
      <div className="tv-header">
        <div className="tv-brand">
          <span className="tv-logo-icon icon-svg">
            <LogoIcon size={42} />
          </span>
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
            <TvScrollContainer itemCount={tvCerts.length}>
              {tvCerts.length === 0 ? (
                <p className="placeholder-text" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {t('tv_no_alerts')}
                </p>
              ) : (
                tvCerts.map((item, idx) => (
                  <div className={`tv-alert-item tv-alert-${item.level}`} key={idx}>
                    <div className="tv-alert-item-left">
                      <span className="tv-alert-vessel">{item.vessel_name}</span>
                      <span className="tv-alert-name">{item.cert_name}</span>
                      <span className="tv-alert-due">{t('label_due')}: {item.due_date}</span>
                    </div>
                    <span className={`tv-alert-status ${item.level === 'red' ? 'text-red' : item.level === 'orange' ? 'text-orange' : item.level === 'yellow' ? 'text-yellow' : 'text-green'}`}>
                      {getAlarmLabel(item.alarm_status)}
                    </span>
                  </div>
                ))
              )}
            </TvScrollContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
