'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

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

export interface EditCertificateDrawerProps {
  open: boolean;
  certForm: CertFormState;
  certPdfCurrent: string;
  isSubmitting: boolean;
  isCrew: boolean;
  lang: string;
  t: (key: string) => string;
  onClose: () => void;
  onFormChange: (form: CertFormState) => void;
  onPdfFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onViewCurrentPdf: () => void;
  onFileSizeError: () => void;
}

export function EditCertificateDrawer({
  open,
  certForm,
  certPdfCurrent,
  isSubmitting,
  isCrew,
  lang,
  t,
  onClose,
  onFormChange,
  onPdfFileChange,
  onSubmit,
  onViewCurrentPdf,
  onFileSizeError,
}: EditCertificateDrawerProps) {
  if (!open) return null;

  const set = (patch: Partial<CertFormState>) => onFormChange({ ...certForm, ...patch });

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{certForm.id ? t('table_col_actions') : t('btn_add_cert')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ height: '100%' }}>
          <div className="drawer-body">
            {/* Name */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Nom du Certificat *</label>
              <input
                type="text" required maxLength={150} className="input-field"
                disabled={isCrew}
                value={certForm.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>

            {/* Category + Org */}
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Catégorie *</label>
                <select className="select-field" required disabled={isCrew} value={certForm.category} onChange={(e) => set({ category: e.target.value })}>
                  <option value="Class">Certificats de Classe / Statutaires</option>
                  <option value="Flag">Certificats de Pavillon</option>
                  <option value="Servicing">{"Certificats d'Entretien (Équipement)"}</option>
                </select>
              </div>
              <div className="form-group">
                <label>Émetteur</label>
                <input type="text" maxLength={100} className="input-field" placeholder="Ex. LR" value={certForm.organization} onChange={(e) => set({ organization: e.target.value })} />
              </div>
            </div>

            {/* Dates: Issue + Expiry */}
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Emission</label>
                <input type="date" className="input-field" value={certForm.issuing_date} onChange={(e) => set({ issuing_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Expiration</label>
                <input type="date" className="input-field" value={certForm.expiration_date} onChange={(e) => set({ expiration_date: e.target.value })} />
              </div>
            </div>

            {/* Due date + Window */}
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>{"Date Visite / Échéance Active"}</label>
                <input type="date" className="input-field" value={certForm.due_date} onChange={(e) => set({ due_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fenêtre Autorisée</label>
                <input type="text" maxLength={50} className="input-field" placeholder="Ex. AS Window" value={certForm.window} onChange={(e) => set({ window: e.target.value })} />
              </div>
            </div>

            {/* PDF upload */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Fichier Certificat PDF (Facultatif - Max 10 Mo)</label>
              <div className="pdf-upload-controls">
                <input
                  type="file"
                  accept=".pdf"
                  className="input-field"
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 10 * 1024 * 1024) {
                      onFileSizeError();
                      e.target.value = '';
                      onPdfFileChange(null);
                    } else {
                      onPdfFileChange(file);
                    }
                  }}
                />
                {certPdfCurrent && (
                  <small className="text-secondary" style={{ marginTop: 4, display: 'block' }}>
                    📎{' '}
                    <span
                      style={{ color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={onViewCurrentPdf}
                    >
                      {lang === 'fr' ? 'Voir le PDF actuel' : 'View current PDF'}
                    </span>
                  </small>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className="form-group">
              <label>Remarques</label>
              <textarea rows={3} maxLength={1000} className="textarea-field" value={certForm.remarks} onChange={(e) => set({ remarks: e.target.value })} />
            </div>
          </div>

          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'fr' ? 'Enregistrement...' : 'Saving...'
                : lang === 'fr' ? 'Enregistrer' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
