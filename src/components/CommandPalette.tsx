import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { TrendingUp, Newspaper, Calendar, Bell, BookOpen, Search } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Mock data - would be replaced with real search results
  const tickers = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META"];
  const news = [
    "Apple announces new AI features",
    "Microsoft beats earnings expectations",
    "Tesla reveals new model",
  ];
  const earnings = [
    "AAPL - Q4 2024 Earnings",
    "MSFT - Q4 2024 Earnings",
    "NVDA - Q3 2024 Earnings",
  ];

  const filteredTickers = tickers.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNews = news.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );
  const filteredEarnings = earnings.filter((e) =>
    e.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (type: string, value: string) => {
    onOpenChange(false);
    switch (type) {
      case "ticker":
        navigate(`/app/all-markets/summary?symbol=${value}`);
        break;
      case "news":
        navigate("/app/news");
        break;
      case "earnings":
        navigate("/app/earnings");
        break;
      case "watchlist":
        navigate("/app/watchlists");
        break;
      case "alert":
        navigate("/app/alerts");
        break;
      case "journal":
        navigate("/app/journal");
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tickers, news, earnings, watchlists..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {filteredTickers.length > 0 && (
          <>
            <CommandGroup heading="Tickers">
              {filteredTickers.map((ticker) => (
                <CommandItem
                  key={ticker}
                  onSelect={() => handleSelect("ticker", ticker)}
                  className="cursor-pointer"
                >
                  <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium">{ticker}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredNews.length > 0 && (
          <>
            <CommandGroup heading="News">
              {filteredNews.map((article, idx) => (
                <CommandItem
                  key={idx}
                  onSelect={() => handleSelect("news", article)}
                  className="cursor-pointer"
                >
                  <Newspaper className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{article}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredEarnings.length > 0 && (
          <>
            <CommandGroup heading="Earnings">
              {filteredEarnings.map((earning, idx) => (
                <CommandItem
                  key={idx}
                  onSelect={() => handleSelect("earnings", earning)}
                  className="cursor-pointer"
                >
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{earning}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => handleSelect("watchlist", "")}
            className="cursor-pointer"
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>View Watchlists</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("alert", "")}
            className="cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>View Alerts</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("journal", "")}
            className="cursor-pointer"
          >
            <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>View Journal</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
