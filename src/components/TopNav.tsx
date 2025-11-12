import { Search, User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEffect, useState } from 'react';
import { domains, domainOrder } from '@/constants/nav';
import { useDomain } from '@/hooks/useDomain';

// ✅ הוספה: קומפוננטת החיפוש החדשה (גודל בינוני, לא נסגר בפנים, 2 מלבנים CHART/SUMMARY)
import QuickSearch from '@/components/Search/QuickSearch';

export const TopNav = () => {
  const navigate = useNavigate();
  const { domainId } = useDomain();
  const [searchOpen, setSearchOpen] = useState(false);

  // ✅ תיקון: רישום קיצור מקלדת ב-useEffect (ולא ב-useState)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabClick = (id: string) => {
    const domain = domains[id];
    
    // Check if domain is locked
    if (domain?.locked) {
      // Optional: Show a toast notification
      // toast.error("This section is coming soon!");
      return;
    }
    
    // Navigate to the first subnav item of the domain
    if (domain?.subNav[0]) {
      navigate(domain.subNav[0].path);
    }
  };

  return (
    <div 
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        background: 'linear-gradient(to bottom, rgba(10,10,10,0.98), rgba(20,20,20,0.95))'
      }}
    >
      <div className="flex h-16 items-center justify-between px-6 lg:px-10">
        {/* Logo - More compact + לינק לדשבורד */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button 
            onClick={() => navigate('/app/journal/overview')}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img 
              src="/assets/WhatsApp Image 2025-11-05 at 06.49.32 2.jpeg" 
              alt="Finotaur" 
              className="h-10 w-auto"
            />
          </button>

          {/* Main Tabs - More compact, hidden on mobile */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {domainOrder.map((id) => {
              const domain = domains[id];
              const isActive = domainId === id;
              const locked = domain?.locked;

              return (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  disabled={locked}
                  className={`group relative rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-300 ${
                    locked
                      ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                      : isActive
                      ? 'bg-[#C9A646]/10 text-[#C9A646] shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                      : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
                  }`}
                  title={locked ? 'Coming Soon' : undefined}
                  style={isActive ? { borderBottom: '2px solid #C9A646' } : {}}
                >
                  <span className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                    <span>{domain.label}</span>
                    {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
                  </span>
                  
                  {/* Tooltip on hover */}
                  {locked && (
                    <span 
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50"
                      style={{ 
                        background: '#0A0A0A',
                        border: '1px solid rgba(201,166,70,0.2)',
                        color: '#A0A0A0'
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side - More compact */}
        <div className="flex items-center gap-3">
          {/* Search - LOCKED - Smaller */}
          <div className="relative hidden md:block group">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A0A0A0]" />
            <Lock className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#C9A646]/60" />
            <Input
              placeholder="Search..."
              className="w-40 lg:w-48 pl-8 pr-8 text-xs h-9 cursor-not-allowed opacity-50"
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255, 215, 0, 0.08)',
                color: '#A0A0A0'
              }}
              disabled
            />
            <span 
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50"
              style={{ 
                background: '#0A0A0A',
                border: '1px solid rgba(201,166,70,0.2)',
                color: '#A0A0A0'
              }}
            >
              Coming Soon
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden relative group cursor-not-allowed opacity-50 hover:bg-[#1A1A1A]"
            disabled
          >
            <Search className="h-5 w-5 text-[#A0A0A0]" />
            <Lock className="absolute -top-1 -right-1 h-3 w-3 text-[#C9A646]/60" />
          </Button>

          {/* User - LOCKED - More compact */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full cursor-not-allowed opacity-50 hover:bg-[#1A1A1A]"
              disabled
            >
              <User className="h-5 w-5 text-[#A0A0A0]" />
              <Lock className="absolute -top-1 -right-1 h-3 w-3 text-[#C9A646]/60" />
            </Button>
            <span 
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50"
              style={{ 
                background: '#0A0A0A',
                border: '1px solid rgba(201,166,70,0.2)',
                color: '#A0A0A0'
              }}
            >
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Scrollable */}
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden scrollbar-hide">
        {domainOrder.map((id) => {
          const domain = domains[id];
          const isActive = domainId === id;
          const locked = domain?.locked;

          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              disabled={locked}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
                locked
                  ? 'cursor-not-allowed opacity-40 text-[#A0A0A0]'
                  : isActive
                  ? 'bg-[#C9A646]/10 text-[#C9A646] shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
              }`}
            >
              {domain.label}
              {locked && <Lock className="h-3 w-3 opacity-60" />}
            </button>
          );
        })}
      </div>

      {/* ✅ החלפה: במקום המודל הישן שנסגר בכל קליק, מרנדרים את החיפוש החדש */}
      <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};