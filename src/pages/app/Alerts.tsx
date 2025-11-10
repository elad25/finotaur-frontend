import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bell, TrendingUp, Calendar, AlertCircle, Check, X } from "lucide-react";
import { usePlan } from "@/contexts/PlanContext";

const Alerts = () => {
  const { currentPlan } = usePlan();
  const [activeTab, setActiveTab] = useState("active");

  const maxAlertsPerSymbol = currentPlan === "basic" ? 2 : currentPlan === "pro" ? 10 : 999;

  const alerts = [
    {
      id: 1,
      symbol: "AAPL",
      type: "Price",
      condition: "Above $180",
      status: "active",
      triggered: false,
      created: "2 days ago",
      delivery: "Email",
    },
    {
      id: 2,
      symbol: "NVDA",
      type: "% Change",
      condition: "Up 5% intraday",
      status: "active",
      triggered: false,
      created: "1 week ago",
      delivery: "Email + In-app",
    },
    {
      id: 3,
      symbol: "TSLA",
      type: "Earnings",
      condition: "Before earnings (3 days)",
      status: "active",
      triggered: false,
      created: "3 days ago",
      delivery: "Email",
    },
    {
      id: 4,
      symbol: "META",
      type: "Price",
      condition: "Below $470",
      status: "triggered",
      triggered: true,
      triggeredAt: "2 hours ago",
      created: "1 day ago",
      delivery: "Email",
    },
  ];

  const activeAlerts = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "Price": return TrendingUp;
      case "% Change": return TrendingUp;
      case "Earnings": return Calendar;
      default: return Bell;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Alerts</h1>
          <p className="text-muted-foreground">
            Never miss important price moves and events
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            Up to {maxAlertsPerSymbol === 999 ? "Unlimited" : maxAlertsPerSymbol} alerts per symbol
          </Badge>
          <Button className="glow-primary">
            <Plus className="mr-2 h-4 w-4" /> New Alert
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAlerts.length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{triggeredAlerts.length}</p>
              <p className="text-sm text-muted-foreground">Triggered</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">87%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="triggered">Triggered ({triggeredAlerts.length})</TabsTrigger>
          <TabsTrigger value="all">All Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <Card key={alert.id} className="p-6 hover:border-primary/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold">{alert.symbol}</h3>
                        <Badge variant="outline">{alert.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{alert.delivery}</Badge>
                      </div>
                      <p className="text-muted-foreground">{alert.condition}</p>
                      <p className="text-sm text-muted-foreground mt-1">Created {alert.created}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="triggered" className="space-y-4">
          {triggeredAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <Card key={alert.id} className="p-6 border-destructive/50 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold">{alert.symbol}</h3>
                        <Badge variant="destructive">Triggered</Badge>
                        <Badge variant="outline">{alert.type}</Badge>
                      </div>
                      <p className="text-muted-foreground">{alert.condition}</p>
                      <p className="text-sm text-destructive font-medium mt-1">
                        Triggered {alert.triggeredAt}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <Card key={alert.id} className={`p-6 ${alert.triggered ? "border-destructive/50 bg-destructive/5" : "hover:border-primary/50"} transition-smooth`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${alert.triggered ? "bg-destructive/10" : "bg-primary/10"}`}>
                      {alert.triggered ? (
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      ) : (
                        <Icon className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold">{alert.symbol}</h3>
                        <Badge variant={alert.triggered ? "destructive" : "outline"}>{alert.triggered ? "Triggered" : alert.type}</Badge>
                        {!alert.triggered && <Badge variant="secondary" className="text-xs">{alert.delivery}</Badge>}
                      </div>
                      <p className="text-muted-foreground">{alert.condition}</p>
                      <p className={`text-sm mt-1 ${alert.triggered ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {alert.triggered ? `Triggered ${alert.triggeredAt}` : `Created ${alert.created}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {alert.triggered ? (
                      <Button variant="outline" size="sm">View Details</Button>
                    ) : (
                      <Button variant="outline" size="sm">Edit</Button>
                    )}
                    <Button variant="ghost" size="sm" className={alert.triggered ? "" : "text-destructive hover:text-destructive"}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {alerts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">No alerts yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first alert to get notified of important price moves
            </p>
            <Button className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Alert
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Alerts;
