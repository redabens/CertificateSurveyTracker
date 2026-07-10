'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

export interface ImportExcelDrawerProps {
  open: boolean;
  importFile: File | null;
  isSubmitting: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ImportExcelDrawer({
  open,
  importFile,
  isSubmitting,
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
        <form onSubmit={onSubmit} className="flex-column" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="drawer-body">
            <div className="form-group">
               <label>{t('label_select_excel')}</label>
              <div className="file-drop-zone">
                <input
                  type="file"
                  accept=".xlsx"
                  required
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
                <p>{t('label_drag_drop')}</p>
                <small className="file-name-display">
                  {importFile ? importFile.name : t('label_no_file')}
                </small>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('btn_cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? t('btn_importing')
                : t('btn_start_import')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
