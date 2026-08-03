'use client';

import React from 'react';
import { CloseIcon, AttachmentIcon } from '../Icons';
import { Certificate } from './CertificatesTable';

export interface WindowItem {
  type: string;
  mode: 'predefined' | 'custom';
  offsetMonths: number;
  startDate: string;
  endDate: string;
  legacyText?: string;
}

export interface CertificateDetailsModalProps {
  open: boolean;
  cert: Certificate | null;
  onClose: () => void;
  openPdfViewer: (url: string, name: string) => void;
  t: (key: string) => string;
  formatDateString: (dateStr: string) => string;
  getAlarmBadgeClass: (status: string) => string;
  getAlarmLabel: (status: string) => string;
}

export function CertificateDetailsModal({
  open,
  cert,
  onClose,
  openPdfViewer,
  t,
  formatDateString,
  getAlarmBadgeClass,
  getAlarmLabel,
}: CertificateDetailsModalProps) {
  if (!open || !cert) return null;

  // Parse due dates (5 annuals + 1 intermediate)
  let annuals: string[] = ['', '', '', '', ''];
  let intermediate: string = '';

  if (cert.due_date) {
    const val = cert.due_date.trim();
    if (val.startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed.annuals)) {
          const padded = [...parsed.annuals];
          while (padded.length < 5) padded.push('');
          annuals = padded.slice(0, 5);
        }
        intermediate = parsed.intermediate || '';
      } catch (e) {
        console.warn('[CertificateDetailsModal] Failed to parse due_date object:', e);
      }
    } else if (val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val) as string[];
        const padded = [...parsed];
        while (padded.length < 5) padded.push('');
        annuals = padded.slice(0, 5);
      } catch (e) {
        console.warn('[CertificateDetailsModal] Failed to parse due_date array:', e);
      }
    } else {
      annuals[0] = val;
    }
  }

  // Parse windows
  let windows: WindowItem[] = [];
  if (cert.window) {
    const winVal = cert.window.trim();
    if (winVal.startsWith('[')) {
      try {
        windows = JSON.parse(winVal) as WindowItem[];
      } catch (e) {
        console.warn('[CertificateDetailsModal] Failed to parse windows JSON:', e);
      }
    }
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 1050 }} />
      <div className="drawer drawer-lg" style={{ zIndex: 1060 }}>
        <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{t('title_cert_details')}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cert.name}</span>
          </div>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>

        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Header Card */}
          <div className="card glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{cert.name}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {cert.category === 'Class' ? t('filter_class_certs') : cert.category === 'Flag' ? t('filter_flag_certs') : t('filter_servicing_certs')}
                {cert.organization ? ` | ${cert.organization}` : ''}
              </p>
            </div>
            <div>
              <span className={`badge ${getAlarmBadgeClass(cert.alarm_status)}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                {getAlarmLabel(cert.alarm_status)}
              </span>
            </div>
          </div>

          {/* Key Dates Grid */}
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)' }}>{t('label_key_dates')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{t('table_col_issue')}</strong>
                <span style={{ fontSize: '14px' }}>{formatDateString(cert.issuing_date || '')}</span>
              </div>
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{t('table_col_expiry')}</strong>
                <span style={{ fontSize: '14px' }}>{formatDateString(cert.expiration_date || '')}</span>
              </div>
            </div>
          </div>

          {/* Annual Survey Scheduling */}
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)' }}>{t('title_annual_survey_scheduling')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t('annual_survey_1')}</small>
                <strong>{formatDateString(annuals[0])}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t('annual_survey_2')}</small>
                <strong>{formatDateString(annuals[1])}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t('annual_survey_3')}</small>
                <strong>{formatDateString(annuals[2])}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t('annual_survey_4')}</small>
                <strong>{formatDateString(annuals[3])}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{t('renewal_survey_5')}</small>
                <strong>{formatDateString(annuals[4])}</strong>
              </div>
            </div>
          </div>

          {/* Standalone Intermediate Survey */}
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--primary-color)' }}>{t('intermediate_survey_scheduling')}</h4>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <strong>{formatDateString(intermediate)}</strong>
            </div>
          </div>

          {/* Authorized Survey Windows */}
          <div className="card glass" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)' }}>{t('label_authorized_survey_windows')}</h4>
            {windows.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('label_no_windows_configured')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {windows.map((w, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--primary-color)' }}>{w.type || 'Window'}</strong>
                      <span className="badge badge-normal" style={{ fontSize: '10px' }}>{w.mode === 'custom' ? t('label_mode_custom') : t('label_mode_standard')}</span>
                    </div>
                    {w.mode === 'custom' ? (
                      <div>{formatDateString(w.startDate)} &rarr; {formatDateString(w.endDate)}</div>
                    ) : (
                      <div>+/- {w.offsetMonths || 0} {t('option_months_suffix')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks */}
          {cert.remarks && (
            <div className="card glass" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--primary-color)' }}>{t('table_col_remarks')}</h4>
              <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap' }}>{cert.remarks}</p>
            </div>
          )}

          {/* PDF Document */}
          {cert.pdf_url && (
            <div className="card glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AttachmentIcon size={18} />
                <span style={{ fontSize: '13px' }}>{t('form_cert_pdf')}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => openPdfViewer(cert.pdf_url!, cert.name)}
              >
                {t('view_pdf')}
              </button>
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t('btn_done')}
          </button>
        </div>
      </div>
    </>
  );
}
