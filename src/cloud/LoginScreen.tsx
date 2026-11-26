import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { t } from '../i18n';
import styles from './LoginScreen.module.css';

export function LoginScreen({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <form className={styles.card} onSubmit={submit}>
        <img className={styles.logo} src="/icon-192.png" alt="" />
        <h1 className={styles.title}>{t('Kinematic')}</h1>
        <p className={styles.sub}>{t('Kinematic is invite-only. Sign in with the email and password you were given.')}</p>

        <label className={styles.field}>
          <span>{t('Email')}</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{t('Password')}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? t('Signing in…') : t('Sign in')}
        </button>
        <p className={styles.hint}>{t("Don't have a login? Ask your gym or trainer.")}</p>
      </form>
    </div>
  );
}
