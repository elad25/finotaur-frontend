import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, FileText, Users } from "lucide-react";

const Company = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [activeTab, setActiveTab] = useState("snapshot");

  // Mock company data
  const companyData = {
    name: "Apple Inc.",
    ticker: ticker || "AAPL",
    price: 178.52,
    change: 2.34,
    changePercent: 1.33,
    marketCap: "2.8T",
    pe: 29.4,
    eps: 6.07,
    nextEarnings: "2024-02-01",
    description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
  };

  const fundamentals = [
    { label: "P/E Ratio", value: "29.4" },
    { label: "EV/EBITDA", value: "23.1" },
    { label: "Price/Sales", value: "7.8" },
    { label: "Price/Book", value: "45.2" },
    { label: "Debt/Equity", value: "1.73" },
    { label: "ROE", value: "160.58%" },
    { label: "Operating Margin", value: "30.74%" },
    { label: "Net Margin", value: "25.31%" },
  ];

  const filings = [
    { type: "10-K", date: "2023-11-02", description: "Annual Report" },
    { type: "10-Q", date: "2023-08-04", description: "Quarterly Report Q3" },
    { type: "10-Q", date: "2023-05-05", description: "Quarterly Report Q2" },
    { type: "8-K", date: "2023-02-02", description: "Earnings Release" },
  ];

  const peers = [
    { ticker: "MSFT", name: "Microsoft", pe: 35.2, marketCap: "2.9T", change: 1.2 },
    { ticker: "GOOGL", name: "Alphabet", pe: 25.8, marketCap: "1.7T", change: 0.8 },
    { ticker: "AMZN", name: "Amazon", pe: 52.3, marketCap: "1.5T", change: -0.5 },
    { ticker: "META", name: "Meta", pe: 31.4, marketCap: "900B", change: 2.1 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Company Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">{companyData.ticker}</h1>
            <Badge variant="outline" className="text-sm">
              {companyData.marketCap} Market Cap
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">{companyData.name}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">${companyData.price}</div>
          <div className={`flex items-center justify-end gap-1 text-lg ${
            companyData.change >= 0 ? "text-success" : "text-destructive"
          }`}>
            {companyData.change >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span>
              {companyData.change >= 0 ? "+" : ""}
              {companyData.change} ({companyData.changePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Company Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
          <TabsTrigger 
            value="snapshot" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative"
          >
            Snapshot
          </TabsTrigger>
          <TabsTrigger 
            value="fundamentals"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative"
          >
            Fundamentals
          </TabsTrigger>
          <TabsTrigger 
            value="filings"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative"
          >
            Filings
          </TabsTrigger>
          <TabsTrigger 
            value="peers"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative"
          >
            Peers
          </TabsTrigger>
        </TabsList>

        {/* Snapshot Tab */}
        <TabsContent value="snapshot" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="font-semibold">{companyData.pe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS</span>
                  <span className="font-semibold">${companyData.eps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-semibold">{companyData.marketCap}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Calendar size={18} />
                  Next Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companyData.nextEarnings}</div>
                <p className="text-sm text-muted-foreground mt-2">After Market Close</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-primary">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{companyData.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Price Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">Chart integration coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fundamentals Tab */}
        <TabsContent value="fundamentals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Financial Ratios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {fundamentals.map((item) => (
                  <div key={item.label}>
                    <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filings Tab */}
        <TabsContent value="filings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <FileText size={18} />
                SEC Filings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filings.map((filing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{filing.type}</Badge>
                      <div>
                        <p className="font-medium">{filing.description}</p>
                        <p className="text-sm text-muted-foreground">{filing.date}</p>
                      </div>
                    </div>
                    <FileText size={18} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peers Tab */}
        <TabsContent value="peers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <Users size={18} />
                Peer Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {peers.map((peer) => (
                  <div
                    key={peer.ticker}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold text-lg">{peer.ticker}</p>
                        <p className="text-sm text-muted-foreground">{peer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">P/E Ratio</p>
                        <p className="font-semibold">{peer.pe}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p className="font-semibold">{peer.marketCap}</p>
                      </div>
                      <div className={peer.change >= 0 ? "text-success" : "text-destructive"}>
                        <p className="font-semibold">
                          {peer.change >= 0 ? "+" : ""}
                          {peer.change}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Company;
