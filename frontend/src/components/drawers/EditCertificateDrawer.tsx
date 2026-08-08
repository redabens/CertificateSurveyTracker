'use client';

import React from 'react';
import { CloseIcon, TrashIcon, WarningIcon } from '../Icons';

export interface CertFormState {
  id: string;
  name: string;
  category: string;
  organization: string;
  issuing_date: string;
  expiration_date: string;
  due_date: string;
  window: string;
  remarks: string;
}

export interface WindowItem {
  type: string;
  mode: 'predefined' | 'custom';
  offsetMonths: number;
  startDate: string;
  endDate: string;
  legacyText?: string;
}

export interface EditCertificateDrawerProps {
  open: boolean;
  certForm: CertFormState;
  certPdfCurrent: string;
  isSubmitting: boolean;
  isCrew: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onFormChange: (form: CertFormState) => void;
  onPdfFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onViewCurrentPdf: () => void;
  onFileSizeError: () => void;
}

export function EditCertificateDrawer({
  open,
  certForm,
  certPdfCurrent,
  isSubmitting,
  isCrew,
  t,
  onClose,
  onFormChange,
  onPdfFileChange,
  onSubmit,
  onViewCurrentPdf,
  onFileSizeError,
}: EditCertificateDrawerProps) {
  const [dates, setDates] = React.useState<string[]>(['', '', '', '', '']);
  const [intermediateDate, setIntermediateDate] = React.useState<string>('');
  const [windows, setWindows] = React.useState<WindowItem[]>([]);

  // Sync prop to local state when drawer opens or certForm changes
  React.useEffect(() => {
    if (open) {
      const val = certForm.due_date || '';
      if (val.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(val);
          const annuals = Array.isArray(parsed.annuals) ? parsed.annuals : [];
          const padded = [...annuals];
          while (padded.length < 5) padded.push('');
          setDates(padded.slice(0, 5));
          setIntermediateDate(parsed.intermediate || '');
        } catch (e) {
          console.warn('[EditCertificateDrawer] Failed to parse JSON due_date object:', e);
          setDates([val, '', '', '', '']);
          setIntermediateDate('');
        }
      } else if (val.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(val) as string[];
          const padded = [...parsed];
          while (padded.length < 5) padded.push('');
          setDates(padded.slice(0, 5));
          setIntermediateDate('');
        } catch (e) {
          console.warn('[EditCertificateDrawer] Failed to parse JSON due_date:', e);
          setDates([val, '', '', '', '']);
          setIntermediateDate('');
        }
      } else {
        setDates([val, '', '', '', '']);
        setIntermediateDate('');
      }

      // Sync windows list from certForm.window
      const winVal = certForm.window || '';
      if (winVal.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(winVal) as WindowItem[];
          setWindows(parsed);
        } catch (e) {
          console.warn('[EditCertificateDrawer] Failed to parse JSON windows:', e);
          setWindows([{ type: 'AS window', mode: 'custom', offsetMonths: 3, startDate: '', endDate: '', legacyText: winVal }]);
        }
      } else if (winVal) {
        const offset = parseInt(winVal, 10);
        if (!isNaN(offset)) {
          setWindows([{ type: 'AS window', mode: 'predefined', offsetMonths: offset, startDate: '', endDate: '' }]);
        } else {
          setWindows([{ type: 'AS window', mode: 'custom', offsetMonths: 3, startDate: '', endDate: '', legacyText: winVal }]);
        }
      } else {
        setWindows([{ type: 'AS window', mode: 'predefined', offsetMonths: 3, startDate: '', endDate: '' }]);
      }
    }
  }, [open, certForm.due_date, certForm.window]);

  if (!open) return null;

  const set = (patch: Partial<CertFormState>) => onFormChange({ ...certForm, ...patch });

  const saveDueDateState = (newDates: string[], newInter: string) => {
    setDates(newDates);
    setIntermediateDate(newInter);
    onFormChange({
      ...certForm,
      due_date: JSON.stringify({ annuals: newDates, intermediate: newInter })
    });
  };

  const handleAutoFill = () => {
    let startYearDate: Date | null = null;
    if (dates[0]) {
      startYearDate = new Date(dates[0]);
    } else if (certForm.issuing_date) {
      const issue = new Date(certForm.issuing_date);
      if (!isNaN(issue.getTime())) {
        startYearDate = new Date(issue);
        startYearDate.setFullYear(issue.getFullYear() + 1);
      }
    }

    if (!startYearDate || isNaN(startYearDate.getTime())) {
      alert(t('alert_fill_issuing_date'));
      return;
    }

    const expTime = certForm.expiration_date ? new Date(certForm.expiration_date).getTime() : null;

    const newDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startYearDate!);
      d.setFullYear(startYearDate!.getFullYear() + i);
      const isoStr = d.toISOString().substring(0, 10);
      if (expTime && d.getTime() >= expTime) {
        return '';
      }
      return isoStr;
    });

    saveDueDateState(newDates, intermediateDate);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Issue Date vs Expiry Date validation
    if (certForm.issuing_date && certForm.expiration_date) {
      const issue = new Date(certForm.issuing_date);
      const exp = new Date(certForm.expiration_date);

      if (exp.getTime() <= issue.getTime()) {
        alert("La date d'expiration doit être supérieure à la date d'émission.");
        return;
      }

      const yearDiff = exp.getFullYear() - issue.getFullYear();
      const daysDiff = (exp.getTime() - issue.getTime()) / (1000 * 3600 * 24);

      if (daysDiff > 6 * 366 || yearDiff > 6) {
        alert("L'écart entre la date d'émission et la date d'expiration ne doit pas dépasser 6 ans.");
        return;
      }
    }

    // 2. Annual Survey dates validation
    if (certForm.issuing_date || certForm.expiration_date) {
      const issueTime = certForm.issuing_date ? new Date(certForm.issuing_date).getTime() : null;
      const expTime = certForm.expiration_date ? new Date(certForm.expiration_date).getTime() : null;

      for (let i = 0; i < dates.length; i++) {
        const dStr = dates[i];
        if (!dStr) continue;
        const tVal = new Date(dStr).getTime();
        if (isNaN(tVal)) continue;

        if (issueTime && tVal <= issueTime) {
          alert(`La date de la visite annuelle ${i + 1} (${dStr}) doit être supérieure à la date d'émission.`);
          return;
        }
        if (expTime && tVal >= expTime) {
          alert(`La date de la visite annuelle ${i + 1} (${dStr}) doit être inférieure à la date d'expiration.`);
          return;
        }
      }
    }

    onSubmit(e);
  };

  const handleDateChange = (index: number, value: string) => {
    const updated = [...dates];
    updated[index] = value;
    saveDueDateState(updated, intermediateDate);
  };

  const handleIntermediateChange = (value: string) => {
    saveDueDateState(dates, value);
  };

  const addWindow = () => {
    const updated: WindowItem[] = [
      ...windows,
      { type: 'AS window', mode: 'predefined', offsetMonths: 3, startDate: '', endDate: '' }
    ];
    setWindows(updated);
    onFormChange({
      ...certForm,
      window: JSON.stringify(updated)
    });
  };

  const handleWindowChange = (index: number, patch: Partial<WindowItem>) => {
    const updated = windows.map((w, idx) => {
      if (idx === index) {
        return { ...w, ...patch };
      }
      return w;
    });
    setWindows(updated);
    onFormChange({
      ...certForm,
      window: JSON.stringify(updated)
    });
  };

  const removeWindow = (index: number) => {
    const updated = windows.filter((_, idx) => idx !== index);
    setWindows(updated);
    onFormChange({
      ...certForm,
      window: JSON.stringify(updated)
    });
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer drawer-lg">
        <div className="drawer-header">
          <h2>{certForm.id ? t('table_col_actions') : t('btn_add_cert')}</h2>
          <span className="close-btn icon-svg" onClick={onClose}>
            <CloseIcon size={18} />
          </span>
        </div>
        <form onSubmit={handleFormSubmit} className="flex-column" style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="drawer-body">
            {/* Name */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>{t('form_cert_name')} *</label>
              <input
                type="text" required maxLength={150} className="input-field"
                disabled={isCrew}
                value={certForm.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>

            {/* Category + Org */}
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>{t('form_cert_category')} *</label>
                <select className="select-field" required disabled={isCrew} value={certForm.category} onChange={(e) => set({ category: e.target.value })}>
                  <option value="Class">{t('form_cert_cat_class')}</option>
                  <option value="Flag">{t('form_cert_cat_flag')}</option>
                  <option value="Servicing">{t('form_cert_cat_servicing')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('form_cert_issuer')}</label>
                <input type="text" maxLength={100} className="input-field" placeholder="Ex. LR" value={certForm.organization} onChange={(e) => set({ organization: e.target.value })} />
              </div>
            </div>

            {/* Dates: Issue + Expiry */}
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>{t('form_cert_issue_date')}</label>
                <input type="date" className="input-field" value={certForm.issuing_date} onChange={(e) => set({ issuing_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('form_cert_expiry_date')}</label>
                <input type="date" className="input-field" value={certForm.expiration_date} onChange={(e) => set({ expiration_date: e.target.value })} />
              </div>
            </div>

            {/* Annual Survey Scheduling Section */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--primary-color)' }}>
                  {t('title_annual_survey_scheduling')}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleAutoFill}
                >
                  <span>{dates[0] ? t('btn_fill_remaining') : t('btn_auto_fill_dates')}</span>
                </button>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label>{t('annual_survey_1')}</label>
                  <input type="date" className="input-field" value={dates[0]} onChange={(e) => handleDateChange(0, e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('annual_survey_2')}</label>
                  <input type="date" className="input-field" value={dates[1]} onChange={(e) => handleDateChange(1, e.target.value)} />
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', display: 'grid' }}>
                <div className="form-group">
                  <label>{t('annual_survey_3')}</label>
                  <input type="date" className="input-field" value={dates[2]} onChange={(e) => handleDateChange(2, e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('annual_survey_4')}</label>
                  <input type="date" className="input-field" value={dates[3]} onChange={(e) => handleDateChange(3, e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>{t('renewal_survey_5')}</label>
                <input type="date" className="input-field" value={dates[4]} onChange={(e) => handleDateChange(4, e.target.value)} />
              </div>
            </div>

            {/* Standalone Intermediate Survey Scheduling Section */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: '600' }}>{t('intermediate_survey_scheduling')}</label>
              <input
                type="date"
                className="input-field"
                style={{ marginTop: '6px' }}
                value={intermediateDate}
                onChange={(e) => handleIntermediateChange(e.target.value)}
              />
            </div>

            {/* Structured Multi-Windows Section */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--primary-color)' }}>
                  {t('label_authorized_survey_windows')}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addWindow}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>+</span>
                  <span>{t('btn_add_window')}</span>
                </button>
              </div>

              {windows.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  {t('label_no_windows_configured')}
                </div>
              ) : (
                windows.map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '12px', marginBottom: '8px', alignItems: 'end' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {t('label_window_type')}
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex. AS window, Renewal"
                          style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }}
                          value={w.type}
                          onChange={(e) => handleWindowChange(idx, { type: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mode</label>
                        <select
                          className="select-field"
                          style={{ padding: '8px 12px', fontSize: '13px', width: '100%', height: '37px' }}
                          value={w.mode}
                          onChange={(e) => handleWindowChange(idx, { mode: e.target.value as 'predefined' | 'custom' })}
                        >
                          <option value="predefined">{t('label_mode_standard')}</option>
                          <option value="custom">{t('label_mode_custom')}</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger icon-svg"
                        style={{
                          width: '32px',
                          height: '32px',
                          padding: 0,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => removeWindow(idx)}
                        title={t('btn_delete_window')}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>

                    {w.mode === 'predefined' ? (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {t('label_window_offset')}
                        </label>
                        <select
                          className="select-field"
                          style={{ padding: '8px 12px', fontSize: '13px', width: '100%', height: '37px' }}
                          value={String(w.offsetMonths)}
                          onChange={(e) => handleWindowChange(idx, { offsetMonths: parseInt(e.target.value, 10) })}
                        >
                          <option value="0">{t('option_none')}</option>
                          <option value="1">{t('option_1_month')}</option>
                          <option value="2">{t('option_2_months')}</option>
                          <option value="3">{t('option_3_months')}</option>
                          <option value="6">{t('option_6_months')}</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {t('label_start_date')}
                          </label>
                          <input
                            type="date"
                            className="input-field"
                            style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }}
                            value={w.startDate}
                            onChange={(e) => handleWindowChange(idx, { startDate: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {t('label_end_date')}
                          </label>
                          <input
                            type="date"
                            className="input-field"
                            style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }}
                            value={w.endDate}
                            onChange={(e) => handleWindowChange(idx, { endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {w.legacyText && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <WarningIcon size={12} style={{ color: 'var(--alarm-yellow)' }} /> {t('label_raw_imported_data')} "{w.legacyText}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* PDF upload */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>{t('form_cert_pdf')}</label>
              <div className="pdf-upload-controls">
                <input
                  type="file"
                  accept=".pdf"
                  className="input-field"
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 10 * 1024 * 1024) {
                      onFileSizeError();
                      e.target.value = '';
                      onPdfFileChange(null);
                    } else {
                      onPdfFileChange(file);
                    }
                  }}
                />
                {certPdfCurrent && (
                  <small className="text-secondary" style={{ marginTop: 4, display: 'block' }}>
                    📎{' '}
                    <span
                      style={{ color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={onViewCurrentPdf}
                    >
                      {t('view_current_pdf')}
                    </span>
                  </small>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className="form-group">
              <label>{t('form_cert_remarks')}</label>
              <textarea rows={3} maxLength={1000} className="textarea-field" value={certForm.remarks} onChange={(e) => set({ remarks: e.target.value })} />
            </div>
          </div>

          <div className="drawer-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('btn_cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? t('btn_saving')
                : t('btn_save')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
