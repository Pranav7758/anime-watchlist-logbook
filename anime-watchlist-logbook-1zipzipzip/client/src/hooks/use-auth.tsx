import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  username: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("Auth timeout - forcing loading to complete");
        setIsLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      } else {
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (isMounted) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email?: string, displayName?: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create it
        const username = displayName || email?.split("@")[0] || "User";
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: email || "",
            username: username,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating profile:", createError);
          // Still set user with basic info so they can use the app
          setUser({
            id: userId,
            email: email || "",
            username: username,
          });
        } else if (newProfile) {
          setUser({
            id: newProfile.id,
            email: newProfile.email || "",
            username: newProfile.username,
          });
        }
      } else if (error) {
        console.error("Error fetching profile:", error);
        // Still set user with basic info
        setUser({
          id: userId,
          email: email || "",
          username: displayName || email?.split("@")[0] || "User",
        });
      } else if (data) {
        setUser({
          id: data.id,
          email: data.email || "",
          username: data.username,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Still set user with basic info
      setUser({
        id: userId,
        email: email || "",
        username: displayName || email?.split("@")[0] || "User",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: email,
        username: username,
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }
    }
  };

  const logout = async () => {
    try {
      queryClient.clear();
      setUser(null);
      setSession(null);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error("Logout error:", error);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, resetPassword, loginWithGoogle, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
