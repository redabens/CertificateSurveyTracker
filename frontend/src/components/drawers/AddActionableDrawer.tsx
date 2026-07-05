'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

export interface ActionableFormState {
  imposed_date: string;
  category: string;
  report_number: string;
  due_date: string;
  description: string;
}

export interface AddActionableDrawerProps {
  open: boolean;
  actionableForm: ActionableFormState;
  isSubmitting: boolean;
  lang: string;
  t: (key: string) => string;
  onClose: () => void;
  onFormChange: (form: ActionableFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddActionableDrawer({
  open,
  actionableForm,
  isSubmitting,
  lang,
  t,
  onClose,
  onFormChange,
  onSubmit,
}: AddActionableDrawerProps) {
  if (!open) return null;

  const set = (patch: Partial<ActionableFormState>) => onFormChange({ ...actionableForm, ...patch });

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('btn_add_rec')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ height: '100%' }}>
          <div className="drawer-body">
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Date Imposée</label>
                <input type="date" className="input-field" value={actionableForm.imposed_date} onChange={(e) => set({ imposed_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <input type="text" maxLength={50} className="input-field" placeholder="Ex. Class" value={actionableForm.category} onChange={(e) => set({ category: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Rapport N°</label>
                <input type="text" maxLength={50} className="input-field" placeholder="Ex. 12345" value={actionableForm.report_number} onChange={(e) => set({ report_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date Limite</label>
                <input type="date" className="input-field" value={actionableForm.due_date} onChange={(e) => set({ due_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea rows={4} required maxLength={2000} className="textarea-field" value={actionableForm.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'fr' ? 'Ajout...' : 'Adding...'
                : lang === 'fr' ? 'Ajouter' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
