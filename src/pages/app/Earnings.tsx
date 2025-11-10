import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Bell, TrendingUp, Star, Sparkles, Filter } from "lucide-react";

const Earnings = () => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [watchlistFilter, setWatchlistFilter] = useState("all");
  
  const earningsThisWeek = [
    { symbol: "NVDA", company: "NVIDIA Corp", date: "Wed, Mar 27", time: "After Close", est: "$5.23", sector: "Technology", favorite: true, inWatchlist: true },
    { symbol: "TSLA", company: "Tesla Inc", date: "Thu, Mar 28", time: "After Close", est: "$0.68", sector: "Automotive", favorite: false, inWatchlist: true },
    { symbol: "AAPL", company: "Apple Inc", date: "Fri, Mar 29", time: "Before Open", est: "$1.54", sector: "Technology", favorite: true, inWatchlist: true },
    { symbol: "AMZN", company: "Amazon.com Inc", date: "Fri, Mar 29", time: "After Close", est: "$0.98", sector: "Consumer", favorite: false, inWatchlist: false },
  ];

  const pastEarnings = [
    { symbol: "META", company: "Meta Platforms", date: "Mon, Mar 25", actual: "$5.45", est: "$5.23", beat: true, sector: "Technology", favorite: true },
    { symbol: "GOOGL", company: "Alphabet Inc.", date: "Tue, Mar 26", actual: "$1.89", est: "$1.95", beat: false, sector: "Technology", favorite: false },
  ];

  const favorites = earningsThisWeek.filter(e => e.favorite);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Earnings Calendar</h1>
          <p className="text-muted-foreground">Track upcoming and past earnings releases</p>
        </div>
        <Button size="sm" className="glow-primary">
          <Bell size={16} className="mr-2" />
          Set Earnings Alert
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-premium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Watchlist</label>
              <Select value={watchlistFilter} onValueChange={setWatchlistFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="watchlist">My Watchlist Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="consumer">Consumer</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Market Cap</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="large">Large Cap</SelectItem>
                  <SelectItem value="mid">Mid Cap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star size={16} className="mr-2" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="past">Past Results</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                This Week's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {earningsThisWeek.map((earning) => (
                  <div
                    key={earning.symbol}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Star
                              size={18}
                              className={earning.favorite ? "fill-primary text-primary" : "text-muted-foreground"}
                            />
                          </Button>
                          <span className="font-bold text-lg">{earning.symbol}</span>
                          <Badge variant="secondary">{earning.time}</Badge>
                          {earning.inWatchlist && (
                            <Badge variant="outline" className="text-xs border-primary text-primary">
                              Watchlist
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{earning.company}</p>
                        <p className="text-sm font-medium text-primary">{earning.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">EPS Est.</p>
                          <p className="text-lg font-bold">{earning.est}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedCompany(earning.symbol)}
                        >
                          <Sparkles size={16} />
                          AI Analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="mt-6">
          <Card className="shadow-premium border-border border-2 border-primary/20 bg-gradient-best-value">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Star size={20} className="fill-primary" />
                Favorite Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {favorites.length > 0 ? (
                  favorites.map((earning) => (
                    <div
                      key={earning.symbol}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer bg-background/50"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg">{earning.symbol}</span>
                            <Badge variant="secondary">{earning.time}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{earning.company}</p>
                          <p className="text-sm font-medium text-primary">{earning.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">EPS Est.</p>
                            <p className="text-lg font-bold">{earning.est}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setSelectedCompany(earning.symbol)}
                          >
                            <Sparkles size={16} />
                            AI Analyze
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Star size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Favorites Yet</h3>
                    <p className="text-muted-foreground">
                      Star companies to track their earnings here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <Card className="shadow-premium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-success" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastEarnings.map((earning) => (
                  <div
                    key={earning.symbol}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Star
                              size={18}
                              className={earning.favorite ? "fill-primary text-primary" : "text-muted-foreground"}
                            />
                          </Button>
                          <span className="font-bold text-lg">{earning.symbol}</span>
                          <Badge
                            variant={earning.beat ? "default" : "destructive"}
                            className={earning.beat ? "bg-success text-white" : ""}
                          >
                            {earning.beat ? "Beat" : "Miss"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{earning.company}</p>
                        <p className="text-sm font-medium text-muted-foreground">{earning.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Actual</p>
                              <p className="text-lg font-bold">{earning.actual}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Est.</p>
                              <p className="text-lg font-medium text-muted-foreground">{earning.est}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedCompany(earning.symbol)}
                        >
                          <Sparkles size={16} />
                          AI Analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Analysis Modal */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles size={24} className="text-primary" />
              AI Earnings Analysis - {selectedCompany}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 rounded-lg bg-muted/20 border border-border">
              <h3 className="font-bold text-lg mb-3">Analysis Summary</h3>
              <p className="text-muted-foreground mb-4">
                AI-powered earnings analysis will provide insights on revenue trends, 
                guidance commentary, analyst sentiment, and potential market impact.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming Soon</Badge>
                  <span className="text-sm">Revenue Growth Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming Soon</Badge>
                  <span className="text-sm">Guidance Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming Soon</Badge>
                  <span className="text-sm">Analyst Sentiment</span>
                </div>
              </div>
            </div>
            <Button className="w-full glow-primary" disabled>
              Generate Full Analysis (Pro Feature)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Earnings;
