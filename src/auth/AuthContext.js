import { createContext, useContext, useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

/**
 * Wraps the signed-in app and exposes auth state to every screen:
 *   user     — the Cognito user (from <Authenticator>)
 *   signOut  — sign-out callback (from <Authenticator>)
 *   email    — convenient display string
 *   isAdmin  — null while loading, then true/false based on the
 *              "admin" Cognito group membership
 */
export function AuthProvider({ user, signOut, children }) {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await fetchAuthSession();
        const groups =
          session.tokens?.accessToken?.payload?.['cognito:groups'] ?? [];
        if (active) {
          setIsAdmin(Array.isArray(groups) && groups.includes('admin'));
        }
      } catch {
        if (active) setIsAdmin(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const email = user?.signInDetails?.loginId ?? user?.username ?? '';

  return (
    <AuthContext.Provider value={{ user, signOut, email, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
