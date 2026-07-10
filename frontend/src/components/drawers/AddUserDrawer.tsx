'use client';

import React from 'react';
import { CloseIcon, CheckIcon } from '../Icons';

export interface UserFormState {
  email: string;
  fullName: string;
  role: string;
  companyId: number;
  vesselId: string;
}

export interface Vessel {
  id: number;
  name: string;
}

export interface AddUserDrawerProps {
  open: boolean;
  userForm: UserFormState;
  vessels: Vessel[];
  tempInviteOtp: string | null;
  isSubmitting: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onFormChange: (form: UserFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddUserDrawer({
  open,
  userForm,
  vessels,
  tempInviteOtp,
  isSubmitting,
  t,
  onClose,
  onFormChange,
  onSubmit,
}: AddUserDrawerProps) {
  if (!open) return null;

  const set = (patch: Partial<UserFormState>) => onFormChange({ ...userForm, ...patch });

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('title_create_new_user')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>

        <div className="drawer-body">
          {tempInviteOtp ? (
            /* Success state */
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--status-green)', marginBottom: '16px' }}>
                <CheckIcon size={48} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('toast_account_created')}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 24px 0' }}>
                {t('label_temp_pwd_generated')}
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '16px', fontSize: '20px', fontWeight: 800, fontFamily: 'Roboto Mono', color: 'var(--primary-color)', letterSpacing: '2px', display: 'inline-block', margin: '0 auto 24px auto' }}>
                {tempInviteOtp}
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
                {t('btn_done')}
              </button>
            </div>
          ) : (
            /* Creation form */
            <form onSubmit={onSubmit} className="flex-column" style={{ height: '100%' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>{t('label_full_name')} *</label>
                <input type="text" required maxLength={100} className="input-field" placeholder="Ex. Amine Benamar" value={userForm.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Adresse E-mail *</label>
                <input type="email" required maxLength={100} className="input-field" placeholder="amine@babor.com" value={userForm.email} onChange={(e) => set({ email: e.target.value })} />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>{t('label_role')} *</label>
                  <select
                    className="select-field" required value={userForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      let nextCompanyId = 1;
                      if (nextRole === 'Partner') nextCompanyId = 2;
                      else if (nextRole === 'Auditor') nextCompanyId = 3;
                      set({ role: nextRole, companyId: nextCompanyId, vesselId: '' });
                    }}
                  >
                    <option value="Admin">Administrateur</option>
                    <option value="Crew">Équipage (Capitaine)</option>
                    <option value="Partner">Partenaire B2B</option>
                    <option value="Auditor">Auditeur Externe</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('label_company')} *</label>
                  <select className="select-field" required disabled value={userForm.companyId}>
                    <option value={1}>CNAN NORD</option>
                    <option value={2}>Verital Marine</option>
                    <option value={3}>Lloyds Register</option>
                  </select>
                </div>
              </div>

              {userForm.role === 'Crew' && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label>{t('label_assigned_vessel')} *</label>
                  <select className="select-field" required value={userForm.vesselId} onChange={(e) => set({ vesselId: e.target.value })}>
                    <option value="">{t('select_vessel_option')}</option>
                    {vessels.map((v) => (
                      <option value={v.id} key={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="drawer-footer" style={{ borderTop: 'none', padding: 0, marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  {t('btn_cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting
                    ? t('btn_creating')
                    : t('btn_create')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
