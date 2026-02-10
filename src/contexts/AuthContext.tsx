import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type AppRole = "admin" | "recepcao" | "profissional" | "cliente";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isRole: (...roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  roles: [],
  loading: true,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: async () => {},
  isRole: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.rpc("get_my_roles"),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (rolesRes.data) setRoles(rolesRes.data as AppRole[]);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => fetchProfileAndRoles(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileAndRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRoles]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isRole = useCallback(
    (...r: AppRole[]) => roles.some((role) => r.includes(role)),
    [roles]
  );

  return (
    <AuthContext.Provider value={{ user, profile, roles, loading, login, signup, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};
