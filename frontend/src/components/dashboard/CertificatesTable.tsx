'use client';

import React from 'react';
import { AttachmentIcon, TrashIcon, EyeIcon } from '../Icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Certificate {
  id: number;
  name: string;
  category: 'Class' | 'Flag' | 'Servicing' | string;
  organization?: string;
  issuing_date?: string;
  expiration_date?: string;
  due_date?: string;
  window?: string;
  alarm_status: string;
  remarks?: string;
  pdf_url?: string;
}

export interface CertificatesTableProps {
  filteredCerts: Certificate[];
  userRole: string;
  t: (key: string) => string;
  formatDateString: (dateStr: string) => string;
  formatDueDateWithWindow: (dueStr: string | null | undefined, windowStr: string | null | undefined) => string;
  getAlarmBadgeClass: (status: string) => string;
  getAlarmLabel: (status: string) => string;
  handleViewDetails: (cert: Certificate) => void;
  handleEditCertOpen: (cert: Certificate) => void;
  handleDeleteCert: (id: number) => void;
  openPdfViewer: (url: string, name: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

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

export function CertificatesTable({
  filteredCerts,
  userRole,
  t,
  formatDateString,
  formatDueDateWithWindow,
  getAlarmBadgeClass,
  getAlarmLabel,
  handleViewDetails,
  handleEditCertOpen,
  handleDeleteCert,
  openPdfViewer,
}: CertificatesTableProps) {
  const isReadOnly = userRole === 'Auditor';
  const isCrew = userRole === 'Crew';

  return (
    <div className="table-container scrollable">
      <table className="data-table">
        <thead>
          <tr>
            <th className="col-name">{t('table_col_name')}</th>
            <th>{t('table_col_cat')}</th>
            <th className="col-org">{t('table_col_org')}</th>
            <th>{t('table_col_issue')}</th>
            <th>{t('table_col_expiry')}</th>
            <th>{t('table_col_due')}</th>
            <th>{t('table_col_intermediate_due')}</th>
            <th className="col-status">{t('table_col_status')}</th>
            <th className="col-remarks">{t('table_col_remarks')}</th>
            <th className="col-actions">{t('table_col_actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredCerts.length === 0 ? (
            <tr>
              <td colSpan={10} className="placeholder-text">
                {t('no_certs_found')}
              </td>
            </tr>
          ) : (
            filteredCerts.map((c) => (
              <tr key={c.id}>
                {/* Name + PDF attachment */}
                <td className="col-name">
                  <strong>{c.name}</strong>
                  {c.pdf_url && (
                    <span
                      className="pdf-icon-btn icon-svg"
                      onClick={() => openPdfViewer(c.pdf_url!, c.name)}
                      title={t('view_pdf')}
                      style={{ marginLeft: 6, display: 'inline-flex', verticalAlign: 'middle' }}
                    >
                      <AttachmentIcon size={14} />
                    </span>
                  )}
                </td>

                {/* Category */}
                <td>
                  {c.category === 'Class'
                    ? t('filter_class_certs')
                    : c.category === 'Flag'
                    ? t('filter_flag_certs')
                    : t('filter_servicing_certs')}
                </td>

                {/* Org / Dates */}
                <td className="col-org">{c.organization || '-'}</td>
                <td>{formatDateString(c.issuing_date ?? '')}</td>
                <td>{formatDateString(c.expiration_date ?? '')}</td>
                <td>{formatDueDateWithWindow(c.due_date, c.window)}</td>
                <td>{formatDateString(getIntermediateSurveyDate(c.due_date))}</td>

                {/* Status badge */}
                <td className="col-status">
                  <span className={`badge ${getAlarmBadgeClass(c.alarm_status)}`}>
                    {getAlarmLabel(c.alarm_status)}
                  </span>
                </td>

                {/* Remarks */}
                <td className="col-remarks">
                  <small className="text-secondary">{c.remarks || ''}</small>
                </td>

                {/* Actions – role-gated */}
                <td className="col-actions">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleViewDetails(c)}
                      title={t('btn_details')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <EyeIcon size={13} />
                      <span>{t('btn_details')}</span>
                    </button>
                    {!isReadOnly && !isCrew && (
                      <>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEditCertOpen(c)}
                        >
                          {t('btn_edit')}
                        </button>
                        <button
                          className="btn btn-danger icon-svg"
                          onClick={() => handleDeleteCert(c.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title={t('btn_delete')}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </>
                    )}
                    {isCrew && c.category === 'Servicing' && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditCertOpen(c)}
                      >
                        {t('btn_update')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
