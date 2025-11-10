import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, TrendingUp, TrendingDown, Calendar, Zap, ExternalLink, BookmarkPlus } from "lucide-react";
import { NewsItem, AnalystAction, Catalyst } from "@/types/news";
import { fetchGeneralNews, fetchFavoritesNews, fetchAnalystActions, fetchCatalysts } from "@/data/mockNews";
import { usePlan } from "@/contexts/PlanContext";
import UpgradeModal from "@/components/UpgradeModal";

const News = () => {
  const { canAccess } = usePlan();
  const [activeTab, setActiveTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  const [generalNews, setGeneralNews] = useState<NewsItem[]>([]);
  const [favoritesNews, setFavoritesNews] = useState<NewsItem[]>([]);
  const [analystActions, setAnalystActions] = useState<AnalystAction[]>([]);
  const [catalysts, setCatalysts] = useState<Catalyst[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock watchlist tickers
  const watchlistTickers = ["AAPL", "NVDA", "TSLA", "MSFT"];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "general") {
        const data = await fetchGeneralNews();
        setGeneralNews(data);
      } else if (activeTab === "favorites") {
        const data = await fetchFavoritesNews(watchlistTickers);
        setFavoritesNews(data);
      } else if (activeTab === "upgrades") {
        const data = await fetchAnalystActions();
        setAnalystActions(data);
      } else if (activeTab === "catalysts") {
        const data = await fetchCatalysts();
        setCatalysts(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "upgrade": return "bg-success/20 text-success border-success/30";
      case "downgrade": return "bg-destructive/20 text-destructive border-destructive/30";
      case "initiate": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProbabilityColor = (prob?: string) => {
    switch (prob) {
      case "high": return "text-success";
      case "medium": return "text-warning";
      case "low": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <UpgradeModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen}
        feature="Full News & Research Hub"
        requiredPlan="pro"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">News & Research Hub</h1>
          <p className="text-muted-foreground">Real-time market news, analyst actions, and catalysts</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter size={16} className="mr-2" />
          Filters
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Search news by ticker, keyword, or source..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades / Downgrades</TabsTrigger>
          <TabsTrigger value="catalysts">Catalyst Hunter</TabsTrigger>
        </TabsList>

        {/* General News Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} className="text-primary" />
                Latest Headlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : generalNews.length === 0 ? (
                <div className="text-center py-12">
                  <Zap size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No news found. Try a wider time window or remove filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generalNews.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-2">
                          {item.badges?.map((badge, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 leading-snug group-hover:text-primary transition-smooth">
                        {item.headline}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.source}</span>
                          {item.tickers.map((ticker) => (
                            <Badge key={ticker} variant="secondary" className="text-xs">
                              {ticker}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <BookmarkPlus size={14} className="mr-1" />
                            Add to Journal
                          </Button>
                          <Button variant="ghost" size="sm">
                            Add Alert
                          </Button>
                          <Button variant="link" size="sm" className="text-primary">
                            <ExternalLink size={14} className="mr-1" />
                            Read more
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-4">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle>News from Your Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              {favoritesNews.length === 0 ? (
                <div className="text-center py-12">
                  <Zap size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground mb-4">No watchlist yet — create your first watchlist to see personalized news.</p>
                  <Button variant="outline">Create Watchlist</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {favoritesNews.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-2">
                          {item.badges?.map((badge, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2">{item.headline}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.source}</span>
                          {item.tickers.map((ticker) => (
                            <Badge key={ticker} variant="secondary" className="text-xs">
                              {ticker}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <BookmarkPlus size={14} className="mr-1" />
                            Add to Journal
                          </Button>
                          <Button variant="ghost" size="sm">
                            Add Alert
                          </Button>
                          <Button variant="link" size="sm" className="text-primary">
                            Read more →
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upgrades/Downgrades Tab */}
        <TabsContent value="upgrades" className="space-y-4">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-success" />
                Analyst Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analystActions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No analyst actions found for your filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analystActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs font-bold">
                            {action.ticker}
                          </Badge>
                          <Badge className={getActionBadgeColor(action.action)}>
                            {action.action.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(action.publishedAt)}</span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="font-bold">{action.firm}</span>
                          {action.from && action.to && (
                            <span className="text-muted-foreground">
                              {action.from} → {action.to}
                            </span>
                          )}
                        </div>
                        {action.oldTarget && action.newTarget && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Price Target:</span>
                            <span className="font-medium">${action.oldTarget} → ${action.newTarget}</span>
                            <Badge variant="outline" className={
                              action.newTarget > action.oldTarget ? "text-success" : "text-destructive"
                            }>
                              {action.newTarget > action.oldTarget ? "+" : ""}
                              {(((action.newTarget - action.oldTarget) / action.oldTarget) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {action.note && (
                        <p className="text-sm text-muted-foreground mb-3">{action.note}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">View Company</Button>
                        {action.url && (
                          <Button variant="link" size="sm" className="text-primary">
                            <ExternalLink size={14} className="mr-1" />
                            Read Report
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalyst Hunter Tab */}
        <TabsContent value="catalysts" className="space-y-4">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Upcoming Catalysts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {catalysts.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No catalysts in this window. Try expanding your filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {catalysts.map((catalyst) => (
                    <div
                      key={catalyst.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {catalyst.ticker && (
                            <Badge variant="secondary" className="text-xs font-bold">
                              {catalyst.ticker}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {catalyst.category}
                          </Badge>
                          {catalyst.window && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {catalyst.window.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(catalyst.date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2">{catalyst.title}</h3>
                      
                      {catalyst.note && (
                        <p className="text-sm text-muted-foreground mb-3">{catalyst.note}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          {catalyst.probability && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Probability:</span>
                              <span className={`font-medium capitalize ${getProbabilityColor(catalyst.probability)}`}>
                                {catalyst.probability}
                              </span>
                            </div>
                          )}
                          {catalyst.expectedImpact && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Impact:</span>
                              <span className={`font-medium capitalize ${getProbabilityColor(catalyst.expectedImpact)}`}>
                                {catalyst.expectedImpact}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Add Reminder</Button>
                          {catalyst.url && (
                            <Button variant="link" size="sm" className="text-primary">
                              <ExternalLink size={14} className="mr-1" />
                              Source
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default News;
