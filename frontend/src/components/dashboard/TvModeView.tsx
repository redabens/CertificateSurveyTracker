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
  formatDateString: (dateStr: string) => string;
  formatDueDateWithWindow: (dueStr: string | null | undefined, windowStr: string | null | undefined) => string;
}

function getIntermediateSurveyDate(dueStr: string | null | undefined): string {
  if (!dueStr) return '';
  const val = dueStr.trim();
  if (val.startsWith('{')) {
    try {
      const parsed = JSON.parse(val);
      return parsed.intermediate || '';
    } catch (e) {}
  }
  return '';
}

export const TvModeView: React.FC<TvModeViewProps> = ({
  vessels,
  tvTime,
  tvDate,
  tvCerts,
  exitTvMode,
  t,
  getAlarmLabel,
  formatDateString,
  formatDueDateWithWindow,
}) => {
  return (
    <div id="view-tv-mode" className="tv-dashboard">
      <div className="tv-header">
        <div className="tv-brand">
          <span className="tv-logo-icon icon-svg">
            <LogoIcon size={42} />
          </span>
          <span className="tv-logo-text">VM<span>Certifs</span> <small>VERITAL MARINE</small></span>
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
            {vessels.map(v => {
              const vTotal = v.counts?.total || 0;
              const vCompliant = (v.counts?.green || 0) + (v.counts?.normal || 0);
              const vRate = vTotal > 0 ? Math.round((vCompliant / vTotal) * 100) : 100;
              return (
                <div className="tv-vessel-row" key={v.id}>
                  <div className="tv-vessel-row-left">
                    <span className="tv-vessel-name">{v.name}</span>
                    <span className="tv-vessel-meta">IMO {v.imo_number || 'N/A'} | Flag {v.flag || 'N/A'}</span>
                    <div style={{ marginTop: 6, width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${vRate}%`, height: '100%', background: vRate >= 80 ? 'var(--status-green)' : vRate >= 50 ? 'var(--status-yellow)' : 'var(--status-red)', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                  <div className="tv-vessel-status-indicator" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`tv-indicator-circle ${v.status === 'Imminent' ? 'red' : v.status === 'Attention' ? 'yellow' : v.status === 'Suivi' ? 'green' : 'normal'}`}></span>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{vRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tv-panel tv-panel-right">
          <div className="tv-summary-widgets">
            <div className="tv-widget tv-widget-red">
              <span className="widget-label">{t('widget_urgent')}</span>
              <span className="widget-value">
                {vessels.reduce((acc, curr) => acc + (curr.counts?.urgent ?? ((curr.counts?.overdue || 0) + (curr.counts?.red || 0))), 0)}
              </span>
            </div>
            <div className="tv-widget tv-widget-yellow">
              <span className="widget-label">{t('widget_attention')}</span>
              <span className="widget-value">{vessels.reduce((acc, curr) => acc + (curr.counts?.yellow || 0), 0)}</span>
            </div>
            <div className="tv-widget tv-widget-green">
              <span className="widget-label">{t('tv_fleet_compliance')}</span>
              <span className="widget-value">
                {vessels.reduce((acc, curr) => acc + (curr.counts?.total || 0), 0) > 0
                  ? Math.round(
                      (vessels.reduce((acc, curr) => acc + (curr.counts?.normal || 0) + (curr.counts?.green || 0), 0) /
                        vessels.reduce((acc, curr) => acc + (curr.counts?.total || 0), 0)) *
                        100
                    )
                  : 100}%
              </span>
              <div style={{ marginTop: 6, width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${
                      vessels.reduce((acc, curr) => acc + (curr.counts?.total || 0), 0) > 0
                        ? Math.round(
                            (vessels.reduce((acc, curr) => acc + (curr.counts?.normal || 0) + (curr.counts?.green || 0), 0) /
                              vessels.reduce((acc, curr) => acc + (curr.counts?.total || 0), 0)) *
                              100
                          )
                        : 100
                    }%`,
                    height: '100%',
                    background: 'var(--status-green)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
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
                tvCerts.map((item, idx) => {
                  const formattedDue = formatDueDateWithWindow(item.due_date, item.window);
                  const intermediateDate = getIntermediateSurveyDate(item.due_date);
                  const formattedIntermediate = intermediateDate ? formatDateString(intermediateDate) : '';

                  return (
                    <div className={`tv-alert-item tv-alert-${item.level}`} key={idx}>
                      <div className="tv-alert-item-left">
                        <span className="tv-alert-vessel">{item.vessel_name}</span>
                        <span className="tv-alert-name">{item.cert_name}</span>
                        <div className="tv-alert-dates-row" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4, fontSize: 13, opacity: 0.85 }}>
                          <span>📅 <strong>{t('table_col_due')}:</strong> {formattedDue}</span>
                          {formattedIntermediate && (
                            <span>🔄 <strong>{t('table_col_intermediate_due')}:</strong> {formattedIntermediate}</span>
                          )}
                        </div>
                      </div>
                      <span className={`tv-alert-status ${item.level === 'red' ? 'text-red' : item.level === 'orange' ? 'text-orange' : item.level === 'yellow' ? 'text-yellow' : 'text-green'}`}>
                        {getAlarmLabel(item.alarm_status)}
                      </span>
                    </div>
                  );
                })
              )}
            </TvScrollContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
