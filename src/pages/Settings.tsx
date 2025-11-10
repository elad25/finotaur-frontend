import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LogOut, Check } from 'lucide-react';
import { PLANS, ADDONS } from '@/config/plans';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SettingsSection = 'profile' | 'plan' | 'preferences';

export default function Settings() {
  const { user, logout } = useAuth();
  const { plan, addons, updatePlan, toggleAddon } = usePlan();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const handlePlanChange = (planId: string) => {
    updatePlan(planId as any);
    toast.success(`Switched to ${planId.toUpperCase()} plan (demo only)`);
  };

  const handleAddonToggle = (addonId: string) => {
    toggleAddon(addonId);
    const addon = ADDONS.find((a) => a.id === addonId);
    toast.success(
      addons.includes(addonId)
        ? `${addon?.name} removed (demo only)`
        : `${addon?.name} added (demo only)`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Left Sidebar Menu */}
        <nav className="space-y-1">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'plan', label: 'Plan & Add-ons' },
            { id: 'preferences', label: 'Preferences' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as SettingsSection)}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-smooth',
                activeSection === section.id
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted-foreground hover:bg-base-700 hover:text-foreground'
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
              <h2 className="mb-6 text-xl font-bold">Profile</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    defaultValue={user?.name}
                    className="bg-base-700"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email}
                    className="bg-base-700"
                    disabled
                  />
                </div>

                <Button variant="outline" className="mt-4" disabled>
                  Update Profile
                </Button>
              </div>
            </Card>
          )}

          {/* Plan & Add-ons Section */}
          {activeSection === 'plan' && (
            <div className="space-y-6">
              {/* Current Plan Display */}
              <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Current Plan</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You're on the{' '}
                      <span className="font-medium text-gold capitalize">{plan}</span> plan
                    </p>
                  </div>
                  <Badge className="bg-gold/10 text-gold hover:bg-gold/20 capitalize">
                    {plan}
                  </Badge>
                </div>
              </Card>

              {/* Plan Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((p) => {
                  const isActive = plan === p.id;

                  return (
                    <Card
                      key={p.id}
                      className={cn(
                        'rounded-2xl p-6 shadow-premium transition-smooth hover:shadow-lg',
                        isActive
                          ? 'border-2 border-gold bg-base-800'
                          : 'border border-border bg-base-800'
                      )}
                    >
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{p.name}</h3>
                            {p.badge && (
                              <Badge className="bg-gold/10 text-gold hover:bg-gold/20">
                                {p.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="text-3xl font-bold">${p.price}</span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                          {p.yearlyPrice && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              ${p.yearlyPrice}/year (coming soon)
                            </p>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">{p.description}</p>

                        <Separator className="bg-border" />

                        <ul className="space-y-2">
                          {p.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm">
                              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => handlePlanChange(p.id)}
                          disabled={isActive}
                          className={cn(
                            'w-full',
                            isActive
                              ? 'bg-gold/20 text-gold cursor-default'
                              : 'bg-gold text-base-900 hover:bg-gold-600'
                          )}
                        >
                          {isActive ? 'Current Plan' : 'Select Plan'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Add-ons */}
              <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
                <h2 className="mb-4 text-xl font-bold">Add-ons</h2>

                <div className="space-y-4">
                  {ADDONS.map((addon) => {
                    const isActive = addons.includes(addon.id);

                    return (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-base-700 p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{addon.name}</h3>
                            <span className="text-sm text-gold">+${addon.price}/mo</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {addon.description}
                          </p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleAddonToggle(addon.id)}
                          className="ml-4"
                        />
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  💳 Payments integration coming soon
                </p>
              </Card>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
              <h2 className="mb-6 text-xl font-bold">Preferences</h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Light mode coming soon
                    </p>
                  </div>
                  <Switch disabled checked />
                </div>

                <Separator className="bg-border" />

                <div>
                  <Label className="text-base">Notifications</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Notification settings will be available soon
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Sign Out */}
          <Separator className="bg-border" />

          <Card className="rounded-2xl border-border bg-base-800 p-6 shadow-premium">
            <Button variant="destructive" onClick={logout} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
