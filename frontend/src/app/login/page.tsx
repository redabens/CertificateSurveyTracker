'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'next/navigation';
import { LogoIcon } from '../../components/Icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, token } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.push('/');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Erreur serveur lors de la connexion: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (role: 'admin' | 'captain' | 'partner' | 'auditor') => {
    const creds = {
      admin: { email: 'admin@babor.com', pass: 'admin123' },
      captain: { email: 'captain@babor.com', pass: 'captain123' },
      partner: { email: 'partner@babor.com', pass: 'partner123' },
      auditor: { email: 'auditor@babor.com', pass: 'auditor123' }
    };
    const selected = creds[role];
    setEmail(selected.email);
    setPassword(selected.pass);
  };

  return (
    <div className="login-page">
      {/* Left panel: Branding & Showcase */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-left-brand">
            <LogoIcon size={56} />
            <span className="logo-text">CNAN<span>Certifs</span></span>
          </div>
          <h1>Gérez la <span>Conformité</span> réglementaire de votre flotte commerciale</h1>
          <p className="subtitle">
            Une plateforme d'analyse intelligente de classe mondiale conçue pour centraliser le suivi des certificats maritimes, automatiser les alertes d'échéance et synchroniser vos dossiers techniques.
          </p>
          
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Dashboard de Conformité</h3>
                <p>Suivi en temps réel des alarmes et alertes de renouvellement par navire.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Notifications SMTP Automatisées</h3>
                <p>Emails de rappels automatiques envoyés directement aux armateurs et managers.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Importation Excel Intelligente</h3>
                <p>Générez vos dossiers navires en téléversant simplement votre tracker Excel d'origine.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Login Form */}
      <div className="login-right">
        <div className="login-card glass">
          {/* Brand logo for mobile screens only */}
          <div className="login-brand">
            <LogoIcon size={44} />
            <span className="logo-text">CNAN<span>Certifs</span></span>
          </div>
          
          <h2>Connexion</h2>
          <p className="form-desc">{t('login_title')}</p>
          
          {error && (
            <div className="toast toast-error" style={{ marginBottom: 20, borderLeft: '4px solid var(--status-red)', width: '100%', position: 'static' }}>
              <span>⚠</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="loginEmail">{t('login_email')}</label>
              <input
                type="email"
                id="loginEmail"
                className="input-field"
                required
                placeholder="ex. admin@babor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">{t('login_password')}</label>
              <input
                type="password"
                id="loginPassword"
                className="input-field"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16, height: 44, fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : t('login_btn')}
            </button>
          </form>
          
          <div className="login-demo-help">
            <p className="help-title">🎯 Comptes de démonstration</p>
            <div className="demo-pills">
              <button type="button" className="demo-pill-btn" onClick={() => handleSelectDemo('admin')}>
                <span className="demo-pill-role">Administrateur</span>
                <span className="demo-pill-email">admin@babor.com</span>
              </button>
              <button type="button" className="demo-pill-btn" onClick={() => handleSelectDemo('captain')}>
                <span className="demo-pill-role">Capitaine</span>
                <span className="demo-pill-email">captain@babor.com</span>
              </button>
              <button type="button" className="demo-pill-btn" onClick={() => handleSelectDemo('partner')}>
                <span className="demo-pill-role">Partenaire</span>
                <span className="demo-pill-email">partner@babor.com</span>
              </button>
              <button type="button" className="demo-pill-btn" onClick={() => handleSelectDemo('auditor')}>
                <span className="demo-pill-role">Auditeur</span>
                <span className="demo-pill-email">auditor@babor.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
