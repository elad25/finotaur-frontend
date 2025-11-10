import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, BarChart3, Search, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">("dark");
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 4;

  const popularSymbols = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "SPY", "QQQ", "IWM"
  ];

  const marketOptions = [
    { id: "stocks", label: "Stocks", icon: TrendingUp },
    { id: "etfs", label: "ETFs", icon: BarChart3 },
    { id: "options", label: "Options", icon: TrendingDown },
    { id: "futures", label: "Futures", icon: BarChart3 },
  ];

  const roleOptions = [
    { id: "trader", label: "Day Trader", desc: "Frequent trades, technical analysis" },
    { id: "investor", label: "Long-term Investor", desc: "Buy and hold, fundamentals" },
  ];

  const toggleMarket = (marketId: string) => {
    setMarkets(prev => 
      prev.includes(marketId) 
        ? prev.filter(m => m !== marketId)
        : [...prev, marketId]
    );
  };

  const addSymbol = (symbol: string) => {
    if (!watchlistSymbols.includes(symbol) && watchlistSymbols.length < 15) {
      setWatchlistSymbols([...watchlistSymbols, symbol]);
      setSearchQuery("");
    }
  };

  const removeSymbol = (symbol: string) => {
    setWatchlistSymbols(watchlistSymbols.filter(s => s !== symbol));
  };

  const handleNext = () => {
    if (step === 1 && (!role || !timezone)) {
      toast({ title: "Please complete all profile fields", variant: "destructive" });
      return;
    }
    if (step === 1 && markets.length === 0) {
      toast({ title: "Please select at least one market", variant: "destructive" });
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    if (step === 3) {
      setStep(4);
    }
  };

  const handleComplete = () => {
    // Save theme to localStorage
    localStorage.setItem("theme", selectedTheme);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(selectedTheme);
    
    toast({
      title: "Profile setup complete! 🎉",
      description: "Now let's activate your trial and get started.",
    });
    // Navigate to billing with user info
    navigate("/billing", { 
      state: { 
        plan: "basic", 
        email: "", 
        name: role === "trader" ? "Day Trader" : "Long-term Investor",
        markets,
        timezone
      } 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 gradient-hero">
      <Card className="w-full max-w-3xl p-8 bg-card border-border shadow-premium">
        {/* Header with Skip */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1" />
          {step === 3 && (
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              Skip
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-primary">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Set Up Your Profile</h2>
              <p className="text-muted-foreground">
                Tell us about your trading style and preferences
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <Label>What describes you best?</Label>
              <div className="grid md:grid-cols-2 gap-4">
                {roleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setRole(option.id)}
                    className={`p-6 rounded-lg border-2 transition-all text-left relative ${
                      role === option.id
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-2">{option.label}</h3>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                    {role === option.id && (
                      <Check className="absolute top-4 right-4 text-primary" size={24} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Markets */}
            <div className="space-y-4">
              <Label>Which markets interest you?</Label>
              <div className="grid md:grid-cols-2 gap-4">
                {marketOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleMarket(option.id)}
                      className={`p-4 rounded-lg border-2 transition-all relative ${
                        markets.includes(option.id)
                          ? "border-primary bg-primary/5 shadow-lg"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={markets.includes(option.id) ? "text-primary" : "text-muted-foreground"} size={20} />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      {markets.includes(option.id) && (
                        <Check className="absolute top-3 right-3 text-primary" size={18} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Theme Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Choose Your Theme</h2>
              <p className="text-muted-foreground">
                Select the look and feel that matches your style
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dark Theme Preview */}
              <button
                onClick={() => setSelectedTheme("dark")}
                className={`relative p-6 rounded-xl border-2 transition-all overflow-hidden ${
                  selectedTheme === "dark"
                    ? "border-primary shadow-2xl scale-105"
                    : "border-border hover:border-primary/50 hover:scale-102"
                }`}
              >
                {selectedTheme === "dark" && (
                  <Check className="absolute top-4 right-4 text-primary z-10" size={32} />
                )}
                
                {/* Dark theme preview card */}
                <div className="bg-[#0a0f1a] rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-3 w-24 bg-[#FFD700] rounded" />
                    <div className="h-2 w-16 bg-gray-700 rounded" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 bg-gray-700 rounded w-full" />
                    <div className="h-2 bg-gray-700 rounded w-5/6" />
                    <div className="h-2 bg-gray-700 rounded w-4/6" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 bg-[#FFD700] rounded" />
                    <div className="h-8 flex-1 bg-gray-800 rounded" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Dark Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Premium dark theme with gold accents — perfect for focused trading sessions
                  </p>
                  <Badge className="mt-3 bg-primary/20 text-primary border-primary/30">
                    Default
                  </Badge>
                </div>
              </button>

              {/* Light Theme Preview */}
              <button
                onClick={() => setSelectedTheme("light")}
                className={`relative p-6 rounded-xl border-2 transition-all overflow-hidden ${
                  selectedTheme === "light"
                    ? "border-[#1e3a8a] shadow-2xl scale-105"
                    : "border-border hover:border-[#1e3a8a]/50 hover:scale-102"
                }`}
              >
                {selectedTheme === "light" && (
                  <Check className="absolute top-4 right-4 text-[#1e3a8a] z-10" size={32} />
                )}
                
                {/* Light theme preview card */}
                <div className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-3 w-24 bg-[#1e3a8a] rounded" />
                    <div className="h-2 w-16 bg-gray-300 rounded" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-5/6" />
                    <div className="h-2 bg-gray-300 rounded w-4/6" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 bg-[#1e3a8a] rounded" />
                    <div className="h-8 flex-1 bg-gray-100 rounded" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Light Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Clean professional look with navy accents — ideal for daytime analysis
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Watchlist Creation */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Create Your First Watchlist</h2>
              <p className="text-muted-foreground">
                Add up to 15 symbols to track (you can skip this step)
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search symbols (e.g., AAPL, MSFT, TSLA)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && searchQuery) {
                    addSymbol(searchQuery);
                  }
                }}
                className="pl-10"
              />
            </div>

            {/* Popular Symbols */}
            <div>
              <Label className="mb-3 block">Popular Symbols</Label>
              <div className="flex flex-wrap gap-2">
                {popularSymbols.map((symbol) => (
                  <Badge
                    key={symbol}
                    variant={watchlistSymbols.includes(symbol) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => 
                      watchlistSymbols.includes(symbol) 
                        ? removeSymbol(symbol)
                        : addSymbol(symbol)
                    }
                  >
                    {symbol}
                    {watchlistSymbols.includes(symbol) && (
                      <Check size={14} className="ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Selected Symbols */}
            {watchlistSymbols.length > 0 && (
              <div>
                <Label className="mb-3 block">Your Watchlist ({watchlistSymbols.length}/15)</Label>
                <div className="flex flex-wrap gap-2">
                  {watchlistSymbols.map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="default"
                      className="px-4 py-2 text-sm cursor-pointer"
                      onClick={() => removeSymbol(symbol)}
                    >
                      {symbol}
                      <span className="ml-2 text-xs">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skip Link */}
            <div className="text-center">
              <Button variant="link" onClick={handleSkip} className="text-muted-foreground">
                Skip for now — I'll add symbols later
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm Plan */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground">
                Your plan and trial details
              </p>
            </div>

            <Card className="p-6 bg-muted/50 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Basic Plan</h3>
                  <p className="text-sm text-muted-foreground">Perfect for new investors</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#FFD700]">$23.99</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-success" />
                  <span>Aggregated News Feed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-success" />
                  <span>Basic Earnings Calendar</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-success" />
                  <span>1 Watchlist (up to 15 symbols)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-success" />
                  <span>Trading Journal</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/pricing")}
              >
                Compare Plans & Upgrade
              </Button>
            </Card>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="text-center">
                🎉 You're on a <span className="font-bold text-primary">14-day free trial</span>. Cancel anytime before it ends.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          <Button
            className="ml-auto glow-primary"
            onClick={handleNext}
          >
            {step === totalSteps ? "Get Started" : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
