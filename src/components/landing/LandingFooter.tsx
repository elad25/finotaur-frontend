import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="relative bg-gradient-to-b from-base-800 to-base-900 border-t border-gold/20 py-16 px-4 sm:px-6 lg:px-8">
      {/* Top gold line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-5">
            <h3 className="text-3xl font-extrabold text-gradient-gold">
              FINOTAUR
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Institutional-grade tools, without the Bloomberg price.
            </p>
            <div className="flex space-x-4 pt-2">
              <Link to="#" className="h-10 w-10 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/20 flex items-center justify-center text-gold transition-all hover:scale-110">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link to="#" className="h-10 w-10 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/20 flex items-center justify-center text-gold transition-all hover:scale-110">
                <Linkedin className="h-4 w-4" />
              </Link>
              <Link to="#" className="h-10 w-10 rounded-full bg-gold/10 hover:bg-gold/20 border border-gold/20 flex items-center justify-center text-gold transition-all hover:scale-110">
                <Github className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-5">
            <h4 className="font-bold text-lg">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="#features" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Features</Link></li>
              <li><Link to="#pricing" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Pricing</Link></li>
              <li><Link to="#journal" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Trading Journal</Link></li>
              <li><Link to="#copytrade" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Copy Trade</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-5">
            <h4 className="font-bold text-lg">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">About</Link></li>
              <li><Link to="#" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Contact</Link></li>
              <li><Link to="#" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-5">
            <h4 className="font-bold text-lg">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="#" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-gold transition-colors inline-block hover:translate-x-1 duration-200">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gold/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2025 Finotaur. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with precision for serious traders
          </p>
        </div>
      </div>
    </footer>
  );
}
