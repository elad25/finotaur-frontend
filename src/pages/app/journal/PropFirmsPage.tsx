import { Building, Clock, Bell } from 'lucide-react';

export default function PropFirmsPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container max-w-7xl mx-auto p-6">
        
        {/* Coming Soon Content */}
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            
            {/* Icon */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gold/20 rounded-full animate-ping opacity-20" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                <Building className="w-10 h-10 text-gold" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Prop Firms</h1>
              <div className="flex items-center justify-center gap-2 text-gold">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Coming Soon</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm leading-relaxed">
              We're working on bringing you a comprehensive directory of the best prop trading firms.
              Compare challenges, profit splits, and find the perfect firm for your trading style.
            </p>

            {/* Features Preview */}
            <div className="bg-base-800/50 rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                What's Coming
              </h3>
              <ul className="space-y-2 text-sm text-left">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Detailed prop firm comparisons
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Challenge rules & payout terms
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Filter by asset type & account size
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Exclusive discount codes
                </li>
              </ul>
            </div>

            {/* Notify Button */}
            <button 
              disabled
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold/10 text-gold border border-gold/30 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
            >
              <Bell className="w-4 h-4" />
              Notify Me When Available
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}