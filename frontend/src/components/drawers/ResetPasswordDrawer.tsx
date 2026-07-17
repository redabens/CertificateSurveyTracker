'use client';

import React, { useState } from 'react';
import { CloseIcon, EyeIcon, EyeOffIcon } from '../Icons';

export interface ResetPasswordDrawerProps {
  open: boolean;
  userName: string;
  passwordValue: string;
  isSubmitting: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResetPasswordDrawer({
  open,
  userName,
  passwordValue,
  isSubmitting,
  t,
  onClose,
  onPasswordChange,
  onSubmit,
}: ResetPasswordDrawerProps) {
  const [showPassword, setShowPassword] = useState(false);
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('title_reset_password')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="drawer-body">
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 16 }}>
              {t('desc_reset_password').replace('{name}', userName)}
            </p>
            <div className="form-group">
              <label>{t('label_new_temp_password')}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingRight: '40px', width: '100%' }}
                  required
                  minLength={6}
                  maxLength={50}
                  placeholder={t('placeholder_min_6_chars')}
                  value={passwordValue}
                  onChange={(e) => onPasswordChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('btn_cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? t('btn_resetting')
                : t('btn_reset')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
