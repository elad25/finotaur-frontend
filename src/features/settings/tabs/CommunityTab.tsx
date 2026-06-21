// src/features/settings/tabs/CommunityTab.tsx
// Community visibility opt-in toggles. Writes profiles.global_feed_opt_in
// and profiles.global_leaderboard_opt_in (both default false in the DB).

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Save, Users, Globe, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds/Spinner";
import { useSettings } from "../settings-shared";

export const CommunityTab = () => {
  const { user } = useAuth();
  const { profile, setProfile, saving, setSaving } = useSettings();

  const [joinCommunity, setJoinCommunity] = useState(false);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);

  useEffect(() => {
    if (profile) {
      setJoinCommunity(profile.global_feed_opt_in ?? false);
      setShowOnLeaderboard(profile.global_leaderboard_opt_in ?? false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          global_feed_opt_in: joinCommunity,
          global_leaderboard_opt_in: showOnLeaderboard,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        global_feed_opt_in: joinCommunity,
        global_leaderboard_opt_in: showOnLeaderboard,
      } : null);

      toast.success('Community settings saved');
    } catch (err) {
      console.error('Error saving community settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Community</h1>
          <p className="text-sm text-zinc-500">Control your visibility in the FINOTAUR community</p>
        </div>
      </div>

      <Card className="p-5 bg-zinc-900/50 border-zinc-700/50">
        <div className="space-y-5">
          {/* Join the community */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <Label className="text-sm font-medium text-white">Join the FINOTAUR community</Label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Share trades to the global feed and take part in the community. Your trades stay private until you explicitly share one.
                </p>
              </div>
            </div>
            <Switch checked={joinCommunity} onCheckedChange={setJoinCommunity} />
          </div>

          {/* Show on leaderboard */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-zinc-800/60">
            <div className="flex items-start gap-3 pt-4">
              <div className="w-8 h-8 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <Label className="text-sm font-medium text-white">Show me on the global leaderboard</Label>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Appear on the public performance and discipline leaderboards, ranked against the rest of the desk.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <Switch checked={showOnLeaderboard} onCheckedChange={setShowOnLeaderboard} />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-[#C9A646] hover:bg-[#B8963F] text-black"
          >
            {saving ? (
              <><Spinner size="sm" color="inherit" className="mr-2" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save changes</>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CommunityTab;
