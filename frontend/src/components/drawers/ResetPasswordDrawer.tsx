'use client';

import React from 'react';
import { CloseIcon } from '../Icons';

export interface ResetPasswordDrawerProps {
  open: boolean;
  userName: string;
  passwordValue: string;
  isSubmitting: boolean;
  lang: string;
  onClose: () => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResetPasswordDrawer({
  open,
  userName,
  passwordValue,
  isSubmitting,
  lang,
  onClose,
  onPasswordChange,
  onSubmit,
}: ResetPasswordDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{lang === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset Password'}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex-column" style={{ height: '100%' }}>
          <div className="drawer-body">
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 16 }}>
              {lang === 'fr'
                ? `Définir un nouveau mot de passe temporaire pour ${userName}. L'utilisateur devra le changer à sa prochaine connexion.`
                : `Set a new temporary password for ${userName}. The user will be required to change it on next login.`}
            </p>
            <div className="form-group">
              <label>{lang === 'fr' ? 'Nouveau mot de passe temporaire' : 'New temporary password'}</label>
              <input
                type="password"
                className="input-field"
                required
                minLength={6}
                maxLength={50}
                placeholder={lang === 'fr' ? 'Min. 6 caractères' : 'Min. 6 characters'}
                value={passwordValue}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'fr' ? 'Réinitialisation...' : 'Resetting...'
                : lang === 'fr' ? 'Réinitialiser' : 'Reset'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
