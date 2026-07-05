'use client';

import React from 'react';
import { CloseIcon, TrashIcon } from '../Icons';

export interface VesselEmail {
  email: string;
  is_verified: boolean;
  otp_code?: string | null;
}

export interface EmailSettingsDrawerProps {
  open: boolean;
  vesselEmails: VesselEmail[];
  newVesselEmail: string;
  emailToVerify: string | null;
  verificationCode: string;
  devOtpNotice: string | null;
  isSubmitting: boolean;
  lang: string;
  onClose: () => void;
  onNewEmailChange: (v: string) => void;
  onAddEmailSubmit: (e: React.FormEvent) => void;
  onVerifyEmailSubmit: (e: React.FormEvent) => void;
  onDeleteEmail: (email: string) => void;
  onStartVerify: (email: string, otp: string | null) => void;
  onCancelVerify: () => void;
  onVerificationCodeChange: (v: string) => void;
}

export function EmailSettingsDrawer({
  open,
  vesselEmails,
  newVesselEmail,
  emailToVerify,
  verificationCode,
  devOtpNotice,
  isSubmitting,
  lang,
  onClose,
  onNewEmailChange,
  onAddEmailSubmit,
  onVerifyEmailSubmit,
  onDeleteEmail,
  onStartVerify,
  onCancelVerify,
  onVerificationCodeChange,
}: EmailSettingsDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{lang === 'fr' ? 'Destinataires des Alertes' : 'Alert Recipients'}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>

        <div className="drawer-body">
          {/* Registered email list */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {lang === 'fr' ? 'Adresses enregistrées' : 'Registered Addresses'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vesselEmails.length === 0 ? (
                <p className="placeholder-text" style={{ padding: '10px 0', textAlign: 'left' }}>
                  {lang === 'fr' ? 'Aucune adresse e-mail configurée.' : 'No email addresses configured.'}
                </p>
              ) : (
                vesselEmails.map((ve, idx) => (
                  <div
                    key={idx}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--border-radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <code style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ve.email}</code>
                      <div>
                        <span className={`badge ${ve.is_verified ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {ve.is_verified
                            ? lang === 'fr' ? 'Vérifié' : 'Verified'
                            : lang === 'fr' ? 'En attente de code' : 'Pending OTP'}
                        </span>
                        {!ve.is_verified && (
                          <button
                            type="button"
                            className="btn btn-link"
                            style={{ fontSize: '11px', color: 'var(--primary-color)', marginLeft: '8px', padding: 0 }}
                            onClick={() => onStartVerify(ve.email, ve.otp_code ?? null)}
                          >
                            {lang === 'fr' ? 'Saisir le code' : 'Enter code'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger icon-svg"
                      style={{ padding: '6px 8px' }}
                      onClick={() => onDeleteEmail(ve.email)}
                      title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* OTP verification prompt */}
          {emailToVerify && (
            <div style={{ borderLeft: '3px solid var(--primary-color)', background: 'rgba(204,164,59,0.03)', padding: '16px', borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0', marginBottom: 24 }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary-color)', fontWeight: 600 }}>
                {lang === 'fr' ? 'Vérification e-mail requis' : 'Email verification required'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                {lang === 'fr'
                  ? `Saisissez le code OTP à 6 chiffres envoyé à ${emailToVerify}`
                  : `Enter the 6-digit OTP code sent to ${emailToVerify}`}
              </p>
              <form onSubmit={onVerifyEmailSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" maxLength={10} className="input-field" required placeholder="Ex. 123456"
                  value={verificationCode}
                  onChange={(e) => onVerificationCodeChange(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', fontSize: '12px' }} disabled={isSubmitting}>
                  {isSubmitting ? lang === 'fr' ? 'Vérification...' : 'Verifying...' : lang === 'fr' ? 'Confirmer' : 'Confirm'}
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0 12px', fontSize: '12px' }} onClick={onCancelVerify}>
                  {lang === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
              </form>
              {devOtpNotice && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(212,163,89,0.08)', border: '1px solid rgba(212,163,89,0.3)', borderRadius: 'var(--border-radius-md)', color: 'var(--primary-color)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.4 }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <span>
                    {lang === 'fr' ? '[Dev Mode] Code OTP généré : ' : '[Dev Mode] Generated OTP: '}
                    <strong style={{ fontFamily: 'Roboto Mono', fontSize: '14px', letterSpacing: '1px', textShadow: '0 0 8px rgba(212,163,89,0.3)' }}>
                      {devOtpNotice}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Add new email */}
          {!emailToVerify && (
            <form onSubmit={onAddEmailSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div className="form-group">
                <label>{lang === 'fr' ? 'Ajouter une adresse de notification' : 'Add notification email address'}</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="email" maxLength={100} className="input-field" required
                    placeholder="manager@babor.com"
                    value={newVesselEmail}
                    onChange={(e) => onNewEmailChange(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }} disabled={isSubmitting}>
                    {isSubmitting ? lang === 'fr' ? 'Ajout...' : 'Adding...' : lang === 'fr' ? 'Ajouter' : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="drawer-footer">
          <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </>
  );
}
