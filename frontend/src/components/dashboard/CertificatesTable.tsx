'use client';

import React from 'react';
import { AttachmentIcon, TrashIcon } from '../Icons';

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
  handleEditCertOpen: (cert: Certificate) => void;
  handleDeleteCert: (id: number) => void;
  openPdfViewer: (url: string, name: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CertificatesTable({
  filteredCerts,
  userRole,
  t,
  formatDateString,
  formatDueDateWithWindow,
  getAlarmBadgeClass,
  getAlarmLabel,
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
            <tr>
              <td colSpan={9} className="placeholder-text">
                {t('no_certs_found')}
              </td>
            </tr>
          ) : (
            filteredCerts.map((c) => (
              <tr key={c.id}>
                {/* Name + PDF attachment */}
                <td>
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
                <td>{c.organization || '-'}</td>
                <td>{formatDateString(c.issuing_date ?? '')}</td>
                <td>{formatDateString(c.expiration_date ?? '')}</td>
                <td>{formatDueDateWithWindow(c.due_date, c.window)}</td>

                {/* Status badge */}
                <td>
                  <span className={`badge ${getAlarmBadgeClass(c.alarm_status)}`}>
                    {getAlarmLabel(c.alarm_status)}
                  </span>
                </td>

                {/* Remarks */}
                <td>
                  <small className="text-secondary">{c.remarks || ''}</small>
                </td>

                {/* Actions – role-gated */}
                <td>
                  {isReadOnly ? (
                    <span className="text-muted">
                      {t('readonly_label')}
                    </span>
                  ) : isCrew ? (
                    c.category === 'Servicing' ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditCertOpen(c)}
                      >
                        {t('btn_update')}
                      </button>
                    ) : (
                      <span className="text-muted">
                        {t('restricted_label')}
                      </span>
                    )
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
