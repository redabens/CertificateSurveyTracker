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
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Une plateforme d'analyse intelligente de classe mondiale conçue pour centraliser le suivi des certificats maritimes, automatiser les alertes d'échéance et synchroniser vos dossiers techniques.
          </p>
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
        </div>
      </div>
    </div>
  );
}
