// src/features/settings/SettingsProvider.tsx
// Owns the shared profile state and fetchProfile for the settings feature.
// Extracted from SettingsLayout.tsx shell.

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { SettingsLayoutSkeletonPage } from "@/components/skeletons/SettingsLayoutSkeleton";
import {
  SettingsContext,
  PROFILE_SELECT,
} from "./settings-shared";
import type { ProfileData } from "./settings-shared";

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // 🔥 v4 FIXED: Fetch profile data WITH Top Secret fields
  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setProfile(data as ProfileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return <SettingsLayoutSkeletonPage />;
  }

  return (
    <SettingsContext.Provider value={{
      profile,
      setProfile,
      saving,
      setSaving,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
