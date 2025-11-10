import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Blog = () => {
  const posts = [
    {
      id: 1,
      title: "Q4 Earnings Season Preview: What to Watch",
      excerpt: "Key earnings dates, expectations, and stocks to watch this quarter. Our analysis of major tech giants and market movers.",
      category: "Earnings",
      author: "Sarah Mitchell",
      date: "Jan 10, 2025",
      readTime: "5 min read",
      featured: true,
    },
    {
      id: 2,
      title: "How to Use Moving Averages in Your Trading Strategy",
      excerpt: "Master the art of moving averages. Learn how to identify trends, spot reversals, and time your entries with precision.",
      category: "Education",
      author: "Michael Chen",
      date: "Jan 8, 2025",
      readTime: "8 min read",
    },
    {
      id: 3,
      title: "Market Wrap: Tech Rally Continues Amid Fed Optimism",
      excerpt: "Major indices close higher as tech stocks lead the way. What this means for your portfolio and what to watch next week.",
      category: "Market Analysis",
      author: "David Torres",
      date: "Jan 5, 2025",
      readTime: "4 min read",
    },
  ];

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Insights & Analysis</h1>
          <p className="text-xl text-muted-foreground">Market updates, trading strategies, and educational content</p>
        </div>

        {/* Featured */}
        <Card className="mb-12 overflow-hidden hover:border-primary/50 transition-smooth">
          <div className="grid md:grid-cols-2">
            <div className="h-80 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
              <TrendingUp className="h-32 w-32 text-primary/30" />
            </div>
            <div className="p-8 flex flex-col justify-center">
              <Badge className="w-fit mb-4">{featuredPost.category}</Badge>
              <h2 className="text-3xl font-bold mb-4">{featuredPost.title}</h2>
              <p className="text-muted-foreground mb-6">{featuredPost.excerpt}</p>
              <div className="flex gap-4 text-sm text-muted-foreground mb-6">
                <span>{featuredPost.date}</span>
                <span>{featuredPost.readTime}</span>
              </div>
              <Button className="w-fit glow-primary">Read Article <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        </Card>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {regularPosts.map((post) => (
            <Card key={post.id} className="p-6 hover:border-primary/50 transition-smooth">
              <Badge className="mb-3">{post.category}</Badge>
              <h3 className="text-xl font-bold mb-3">{post.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{post.author}</span>
                <span>{post.readTime}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
