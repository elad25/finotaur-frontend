import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, TrendingUp, Calendar, AlertCircle } from "lucide-react";

const Notifications = () => {
  const notifications = [
    {
      id: 1,
      type: "alert",
      title: "Price Alert Triggered",
      message: "AAPL reached your target price of $180",
      time: "5 minutes ago",
      read: false,
      icon: TrendingUp,
      iconColor: "text-success",
    },
    {
      id: 2,
      type: "earnings",
      title: "Upcoming Earnings",
      message: "NVDA reports earnings in 2 days",
      time: "1 hour ago",
      read: false,
      icon: Calendar,
      iconColor: "text-primary",
    },
    {
      id: 3,
      type: "alert",
      title: "Unusual Volume Alert",
      message: "TSLA volume spike detected (+250% avg)",
      time: "2 hours ago",
      read: true,
      icon: AlertCircle,
      iconColor: "text-destructive",
    },
    {
      id: 4,
      type: "system",
      title: "New Feature Available",
      message: "Check out our improved screener with more filters",
      time: "1 day ago",
      read: true,
      icon: Bell,
      iconColor: "text-muted-foreground",
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with alerts and important events
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline">
            <Check className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{notifications.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total</p>
          </div>
        </Card>
        
        <Card className="p-4 border-primary/50">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{unreadCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Unread</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-muted-foreground">
              {notifications.length - unreadCount}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Read</p>
          </div>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card
              key={notification.id}
              className={`p-6 transition-smooth ${
                !notification.read 
                  ? "border-primary/50 bg-primary/5" 
                  : "hover:border-border opacity-70"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !notification.read ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`h-6 w-6 ${notification.iconColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{notification.title}</h3>
                        {!notification.read && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">{notification.time}</p>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button variant="ghost" size="sm">
                          <Check className="h-4 w-4 mr-2" />
                          Mark as Read
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              You're all caught up! Notifications will appear here when you have alerts or updates.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
