'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from 'next/navigation';

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
  }, [token]);

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
      setError('Erreur serveur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass">
        <div className="login-brand">
          <span className="logo-icon">🚢</span>
          <span className="logo-text">Babor<span>Tracker</span></span>
        </div>
        <h2>{t('login_title')}</h2>
        
        {error && (
          <div className="toast toast-error" style={{ marginBottom: 16, borderLeft: '4px solid var(--status-red)', width: '100%', position: 'static' }}>
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
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            disabled={loading}
          >
            {loading ? 'Connexion...' : t('login_btn')}
          </button>
        </form>
        
        <div className="login-demo-help">
          <p>💡 <strong>Comptes Démo (Mots de passe : <code style={{ fontFamily: 'monospace' }}>admin123</code>, etc.) :</strong></p>
          <ul>
            <li><strong>Admin</strong> : <code style={{ fontFamily: 'monospace' }}>admin@babor.com</code></li>
            <li><strong>Crew</strong> : <code style={{ fontFamily: 'monospace' }}>captain@babor.com</code></li>
            <li><strong>Partner B2B</strong> : <code style={{ fontFamily: 'monospace' }}>partner@babor.com</code></li>
            <li><strong>Auditor</strong> : <code style={{ fontFamily: 'monospace' }}>auditor@babor.com</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
