'use client';

import React, { useState } from 'react';
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
  t: (key: string) => string;
  onClose: () => void;
  onNewEmailChange: (v: string) => void;
  onAddEmailSubmit: (e: React.FormEvent) => void;
  onVerifyEmailSubmit: (e: React.FormEvent) => void;
  onDeleteEmail: (email: string) => void;
  onStartVerify: (email: string, otp: string | null) => void;
  onCancelVerify: () => void;
  onVerificationCodeChange: (v: string) => void;
  onForceNotifyVessel?: (status: string) => void;
}

export function EmailSettingsDrawer({
  open,
  vesselEmails,
  newVesselEmail,
  emailToVerify,
  verificationCode,
  devOtpNotice,
  isSubmitting,
  t,
  onClose,
  onNewEmailChange,
  onAddEmailSubmit,
  onVerifyEmailSubmit,
  onDeleteEmail,
  onStartVerify,
  onCancelVerify,
  onVerificationCodeChange,
  onForceNotifyVessel,
}: EmailSettingsDrawerProps) {
  const [alertFilter, setAlertFilter] = useState('ALL');
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>{t('alert_recipients_title')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>

        <div className="drawer-body">
          {/* Registered email list */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('registered_addresses_label')}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vesselEmails.length === 0 ? (
                <p className="placeholder-text" style={{ padding: '10px 0', textAlign: 'left' }}>
                  {t('no_emails_configured')}
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
                            ? t('email_verified_badge')
                            : t('email_pending_otp_badge')}
                        </span>
                        {!ve.is_verified && (
                          <button
                            type="button"
                            className="btn btn-link"
                            style={{ fontSize: '11px', color: 'var(--primary-color)', marginLeft: '8px', padding: 0 }}
                            onClick={() => onStartVerify(ve.email, ve.otp_code ?? null)}
                          >
                            {t('enter_code_action')}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger icon-svg"
                      style={{
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => onDeleteEmail(ve.email)}
                      title={t('btn_delete')}
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
                {t('verification_required_title')}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                {t('enter_otp_sent_to').replace('{email}', emailToVerify)}
              </p>
              <form onSubmit={onVerifyEmailSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" maxLength={10} className="input-field" required placeholder="Ex. 123456"
                  value={verificationCode}
                  onChange={(e) => onVerificationCodeChange(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', fontSize: '12px' }} disabled={isSubmitting}>
                  {isSubmitting ? t('btn_verifying') : t('btn_confirm')}
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0 12px', fontSize: '12px' }} onClick={onCancelVerify}>
                  {t('btn_cancel')}
                </button>
              </form>
              {devOtpNotice && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(212,163,89,0.08)', border: '1px solid rgba(212,163,89,0.3)', borderRadius: 'var(--border-radius-md)', color: 'var(--primary-color)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.4 }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <span>
                    {t('dev_otp_notice_prefix')}
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
                <label>{t('add_notification_email_label')}</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="email" maxLength={100} className="input-field" required
                    placeholder="manager@babor.com"
                    value={newVesselEmail}
                    onChange={(e) => onNewEmailChange(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }} disabled={isSubmitting}>
                    {isSubmitting ? t('btn_adding') : t('btn_add')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {vesselEmails.some((ve) => ve.is_verified) && onForceNotifyVessel && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <select
                className="input-field"
                style={{ flexGrow: 1, padding: '0 10px', height: '36px', fontSize: '13px', minWidth: '140px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
              >
                <option value="ALL">{t('opt_all_alerts')}</option>
                <option value="RED">{t('opt_urgent_alerts')}</option>
                <option value="YELLOW">{t('opt_warning_alerts')}</option>
                <option value="GREEN">{t('opt_monitored_alerts')}</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '13px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => onForceNotifyVessel(alertFilter)}
                disabled={isSubmitting}
              >
                <span>✉</span>
                {t('btn_notify')}
              </button>
            </div>
          )}
          <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
            {t('btn_close')}
          </button>
        </div>
      </div>
    </>
  );
}
