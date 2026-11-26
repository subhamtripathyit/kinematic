import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { LoginScreen } from './LoginScreen';
import { setLang, t } from '../i18n';
import { loadSettings } from '../state/settings';

type Auth = { user: User | null; signOut: () => void };

const AuthContext = createContext<Auth>({ user: null, signOut: () => {} });

/** The signed-in user (null when cloud is off). */
export const useAuth = () => useContext(AuthContext);

/** Cloud off -> app as before. Cloud on -> login screen until signed in. */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!supabase) return <>{children}</>;
  return <CloudGate client={supabase}>{children}</CloudGate>;
}

function CloudGate({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  // undefined = still checking for a saved login
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data }) => alive && setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  setLang(loadSettings().language);

  if (session === undefined) return <div className="authLoading">{t('Loading…')}</div>;
  if (!session) return <LoginScreen client={client} />;

  return (
    <AuthContext.Provider value={{ user: session.user, signOut: () => void client.auth.signOut() }}>
      {children}
    </AuthContext.Provider>
  );
}
