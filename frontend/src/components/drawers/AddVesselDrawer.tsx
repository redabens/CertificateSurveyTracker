'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

export interface VesselFormState {
  name: string;
  imo_number: string;
  flag: string;
  asset_type: string;
  owner: string;
  manager: string;
}

export interface AddVesselDrawerProps {
  open: boolean;
  vesselForm: VesselFormState;
  isSubmitting: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onFormChange: (form: VesselFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddVesselDrawer({
  open,
  vesselForm,
  isSubmitting,
  t,
  onClose,
  onFormChange,
  onSubmit,
}: AddVesselDrawerProps) {
  if (!open) return null;

  const set = (patch: Partial<VesselFormState>) => onFormChange({ ...vesselForm, ...patch });

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('btn_manual_vessel')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="drawer-body">
            <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Nom du Navire *</label>
                <input
                  type="text" required maxLength={100} className="input-field"
                  placeholder="Ex. BABOR ALGERIEN"
                  value={vesselForm.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Numéro IMO</label>
                <input
                  type="text" maxLength={20} pattern="[0-9A-Za-z ]+"
                  title="Letters, numbers and spaces only"
                  className="input-field" placeholder="Ex. 9477177"
                  value={vesselForm.imo_number}
                  onChange={(e) => set({ imo_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Pavillon</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. Algérie"
                  value={vesselForm.flag}
                  onChange={(e) => set({ flag: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{"Type d'Asset"}</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. Products Tanker"
                  value={vesselForm.asset_type}
                  onChange={(e) => set({ asset_type: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Propriétaire</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. CNAN"
                  value={vesselForm.owner}
                  onChange={(e) => set({ owner: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Technical Manager</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. Verital"
                  value={vesselForm.manager}
                  onChange={(e) => set({ manager: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('btn_cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? t('btn_creating')
                : t('btn_create_vessel')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
