import React, { useState } from 'react';
import { LogoIcon, CheckIcon, AlertIcon, WarningIcon, EyeIcon, EyeOffIcon } from '../Icons';

type ToastMsg = { id: number; text: string; type: 'success' | 'error' | 'info' };

interface ForcePasswordChangeViewProps {
  t: (key: string) => string;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  passwordChangeError: string | null;
  passwordChangeLoading: boolean;
  handleForcePasswordChange: (e: React.FormEvent) => void;
  toasts: ToastMsg[];
}

export const ForcePasswordChangeView: React.FC<ForcePasswordChangeViewProps> = ({
  t,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordChangeError,
  passwordChangeLoading,
  handleForcePasswordChange,
  toasts,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#040807' }}>
      <div className="login-card glass" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', justifyContent: 'center' }}>
          <LogoIcon size={52} />
          <span className="logo-text" style={{ fontSize: '28px', fontWeight: 800 }}>CNAN<span>Certifs</span></span>
        </div>
        <h2 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 700 }}>
          {t('title_change_password')}
        </h2>
        <p className="form-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {t('desc_first_login_password')}
        </p>

        {passwordChangeError && (
          <div className="toast toast-error" style={{ marginBottom: 20, width: '100%', position: 'static' }}>
            <span>⚠</span>
            <div>{passwordChangeError}</div>
          </div>
        )}

        <form onSubmit={handleForcePasswordChange}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {t('label_new_password_min_6')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: '40px', width: '100%' }}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {t('label_confirm_password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: '40px', width: '100%' }}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontWeight: 600 }}
            disabled={passwordChangeLoading}
          >
            {passwordChangeLoading 
              ? t('btn_saving') 
              : t('btn_save_password')}
          </button>
        </form>
      </div>
      {/* Toast container for force password view */}
      <div className="toast-container">
        {toasts.map(t => (
          <div className={`toast toast-${t.type}`} key={t.id}>
            <span className="icon-svg">
              {t.type === 'success' ? <CheckIcon size={16} /> : t.type === 'error' ? <AlertIcon size={16} /> : <WarningIcon size={16} />}
            </span>
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
