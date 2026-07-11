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
  port_of_registry: string;
  call_sign: string;
  gross_tonnage: string;
  deadweight_tonnage: string;
  year_built: string;
  class_society: string;
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
                <label>Numéro IMO *</label>
                <input
                  type="text" required maxLength={20} pattern="[0-9A-Za-z ]+"
                  title="Letters, numbers and spaces only"
                  className="input-field" placeholder="Ex. 9477177"
                  value={vesselForm.imo_number}
                  onChange={(e) => set({ imo_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Pavillon *</label>
                <input
                  type="text" required maxLength={100} className="input-field" placeholder="Ex. Algérie"
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
                <label>Propriétaire *</label>
                <input
                  type="text" required maxLength={100} className="input-field" placeholder="Ex. CNAN"
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
              <div className="form-group">
                <label>Port d'attache</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. Lome"
                  value={vesselForm.port_of_registry}
                  onChange={(e) => set({ port_of_registry: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Signal d'appel</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. 5VJB5"
                  value={vesselForm.call_sign}
                  onChange={(e) => set({ call_sign: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Jauge brute (GT)</label>
                <input
                  type="number" className="input-field" placeholder="Ex. 5036"
                  value={vesselForm.gross_tonnage}
                  onChange={(e) => set({ gross_tonnage: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Port en lourd (DWT)</label>
                <input
                  type="number" className="input-field" placeholder="Ex. 7119"
                  value={vesselForm.deadweight_tonnage}
                  onChange={(e) => set({ deadweight_tonnage: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Année de construction</label>
                <input
                  type="number" min="1900" max="2100" className="input-field" placeholder="Ex. 2012"
                  value={vesselForm.year_built}
                  onChange={(e) => set({ year_built: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Société de classification</label>
                <input
                  type="text" maxLength={100} className="input-field" placeholder="Ex. Lloyd's Register (LR)"
                  value={vesselForm.class_society}
                  onChange={(e) => set({ class_society: e.target.value })}
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
