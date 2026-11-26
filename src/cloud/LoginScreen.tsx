import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LANGS, getLang, setLang, t, type Lang } from '../i18n';
import { loadSettings, saveSettings } from '../state/settings';
import styles from './LoginScreen.module.css';

export function LoginScreen({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>(getLang());

  const switchLang = (l: Lang) => {
    setLang(l);
    saveSettings({ ...loadSettings(), language: l });
    setLangState(l);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(/invalid login/i.test(err.message) ? t('Wrong email or password.') : err.message);
    } catch {
      setError(t('Could not connect. Check your internet and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.langSwitch} role="radiogroup" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={lang === l.id}
            className={lang === l.id ? styles.langActive : ''}
            onClick={() => switchLang(l.id)}
          >
            {l.id === 'en' ? 'EN' : 'हिं'}
          </button>
        ))}
      </div>

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/icon-192.png" alt="" />
          <h1 className={styles.title}>{t('Kinematic')}</h1>
          <p className={styles.tagline}>{t('Your AI form coach')}</p>
        </div>

        <p className={styles.sub}>{t('Kinematic is invite-only. Sign in with the email and password you were given.')}</p>

        <label className={styles.field}>
          <span>{t('Email')}</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>{t('Password')}</span>
          <div className={styles.passwordWrap}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.showBtn}
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
            >
              {showPassword ? t('Hide') : t('Show')}
            </button>
          </div>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? t('Signing in…') : t('Sign in')}
        </button>
        <p className={styles.hint}>{t("Don't have a login? Ask your gym or trainer.")}</p>
      </form>

      <p className={styles.privacy}>{t('Your camera video never leaves your phone.')}</p>
    </div>
  );
}
