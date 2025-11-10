import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* CTA Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[150px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            Ready to Trade <span className="text-primary">Smarter</span>?
          </h2>
          
          <p className="text-xl text-muted-foreground mb-12">
            Join thousands of traders who've transformed their performance with FINOTAUR
          </p>
        </div>
      </section>

      {/* Footer Bottom */}
      <div className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground mb-2">
            Luxury design. Real data. Smarter trading.
          </p>
          <p className="text-sm text-muted-foreground">
            © 2025 FINOTAUR — All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;