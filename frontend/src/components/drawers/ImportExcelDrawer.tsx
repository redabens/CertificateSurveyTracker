'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

export interface ImportExcelDrawerProps {
  open: boolean;
  importFile: File | null;
  isSubmitting: boolean;
  lang: string;
  t: (key: string) => string;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ImportExcelDrawer({
  open,
  importFile,
  isSubmitting,
  lang,
  t,
  onClose,
  onFileChange,
  onSubmit,
}: ImportExcelDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('btn_import_excel')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ height: '100%' }}>
          <div className="drawer-body">
            <div className="form-group">
              <label>Sélectionnez le fichier Excel du suivi des certificats (Format .xlsx)</label>
              <div className="file-drop-zone">
                <input
                  type="file"
                  accept=".xlsx"
                  required
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
                <p>Glissez-déposez le fichier ici ou cliquez pour parcourir</p>
                <small className="file-name-display">
                  {importFile ? importFile.name : lang === 'fr' ? 'Aucun fichier' : 'No file'}
                </small>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'fr' ? 'Importation...' : 'Importing...'
                : lang === 'fr' ? "Lancer l'importation" : 'Start Import'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
