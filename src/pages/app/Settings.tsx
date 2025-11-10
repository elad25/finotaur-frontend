import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Check } from "lucide-react";

const Settings = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      id: "dark" as const,
      label: "Dark Mode",
      description: "Premium dark theme with gold accents",
      icon: Moon,
      preview: "bg-[#0a0f1a]",
      accentPreview: "bg-[#FFD700]",
    },
    {
      id: "light" as const,
      label: "Light Mode", 
      description: "Clean professional look with navy accents",
      icon: Sun,
      preview: "bg-white border border-gray-200",
      accentPreview: "bg-[#1e3a8a]",
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and customize your workspace
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize how TraderHUB looks on your device
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Theme</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose between dark and light mode. Your preference will be saved automatically.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = theme === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => setTheme(option.id)}
                      className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary shadow-lg scale-105"
                          : "border-border hover:border-primary/50 hover:scale-102"
                      }`}
                    >
                      {isSelected && (
                        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                          <Check size={14} className="mr-1" />
                          Active
                        </Badge>
                      )}

                      {/* Theme Preview */}
                      <div className={`${option.preview} rounded-lg p-4 mb-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`h-2 w-16 ${option.accentPreview} rounded`} />
                          <div className={`h-2 w-12 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded`} />
                        </div>
                        <div className="space-y-2">
                          <div className={`h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded w-full`} />
                          <div className={`h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} rounded w-4/5`} />
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Icon size={24} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        <div className="flex-1">
                          <h3 className="font-bold mb-1">{option.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Account Section */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Account</h2>
            <p className="text-sm text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts and updates via email</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Timezone</Label>
                <p className="text-sm text-muted-foreground">Eastern Time (ET)</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Language</Label>
                <p className="text-sm text-muted-foreground">English (US)</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </Card>

        {/* Privacy Section */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Privacy & Security</h2>
            <p className="text-sm text-muted-foreground">
              Manage your data and security settings
            </p>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Change Password</Label>
                <p className="text-sm text-muted-foreground">Update your password regularly</p>
              </div>
              <Button variant="outline" size="sm">Update</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Data Export</Label>
                <p className="text-sm text-muted-foreground">Download your data</p>
              </div>
              <Button variant="outline" size="sm">Request</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
