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
  alarm_status: string;
  remarks?: string;
  pdf_url?: string;
}

export interface CertificatesTableProps {
  filteredCerts: Certificate[];
  userRole: string;
  lang: string;
  t: (key: string) => string;
  formatDateString: (dateStr: string) => string;
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
  lang,
  t,
  formatDateString,
  getAlarmBadgeClass,
  getAlarmLabel,
  handleEditCertOpen,
  handleDeleteCert,
  openPdfViewer,
}: CertificatesTableProps) {
  const isReadOnly = userRole === 'Partner' || userRole === 'Auditor';
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
                {lang === 'fr' ? 'Aucun certificat trouvé.' : 'No certificates found.'}
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
                      title={lang === 'fr' ? 'Voir le PDF' : 'View PDF'}
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
                <td>{formatDateString(c.due_date ?? '')}</td>

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
                      {lang === 'fr' ? 'Lecture seule' : 'Read-only'}
                    </span>
                  ) : isCrew ? (
                    c.category === 'Servicing' ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditCertOpen(c)}
                      >
                        {lang === 'fr' ? 'Mettre à jour' : 'Update'}
                      </button>
                    ) : (
                      <span className="text-muted">
                        {lang === 'fr' ? 'Restreint' : 'Restricted'}
                      </span>
                    )
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditCertOpen(c)}
                      >
                        {lang === 'fr' ? 'Modifier' : 'Edit'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger icon-svg"
                        onClick={() => handleDeleteCert(c.id)}
                        style={{ padding: '6px 10px' }}
                        title={lang === 'fr' ? 'Supprimer' : 'Delete'}
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
