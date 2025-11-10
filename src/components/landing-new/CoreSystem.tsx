import { 
  LayoutDashboard, 
  Plus, 
  BookText, 
  Target, 
  BarChart3, 
  Calendar,
  MessageSquare,
  FileText,
  Users,
  GraduationCap,
  Headphones,
  Settings
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your personal command center. Get a full overview of your performance, key KPIs, and AI insights at a glance."
  },
  {
    icon: Plus,
    title: "Add Trade",
    description: "Quickly log trades with precision — auto-detect direction, calculate risk/reward, and attach notes or screenshots."
  },
  {
    icon: BookText,
    title: "Trades Journal",
    description: "A professional trading diary. Filter, tag, and review every trade. Identify patterns in your behavior and performance."
  },
  {
    icon: Target,
    title: "My Strategies",
    description: "Build, track, and optimize your trading strategies. Compare live results and discover what truly works."
  },
  {
    icon: BarChart3,
    title: "Statistics",
    description: "Deep performance analytics: Win rate, Profit Factor, Expectancy, Max Drawdown, Equity Curve, and more."
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "Organize your trading week with a smart calendar that links sessions, trades, and results."
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description: "Your personal trading assistant. Ask questions, analyze your data, and get insights powered by Finotaur AI."
  },
  {
    icon: FileText,
    title: "Scenarios & Plans",
    description: "Pre-plan trading days with scenario templates. Define conditions, key levels, and mental checklists."
  },
  {
    icon: Users,
    title: "Community Blog",
    description: "A shared space for traders to learn, share, and evolve together — powered by Finotaur's community engine."
  },
  {
    icon: GraduationCap,
    title: "Academy",
    description: "A structured learning environment with courses, guides, and live sessions to sharpen your trading edge."
  },
  {
    icon: Headphones,
    title: "Support",
    description: "Fast, professional help center and live chat. Always here to keep your trading smooth."
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Full control over your experience — commissions, accounts, timezones, and personal preferences."
  }
];

const CoreSystem = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Background matching the site theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
      
      {/* Gold Orbs */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-[#D4BF8E]/[0.06] rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">The Core </span>
            <span className="text-[#C9A646]">System</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Every feature designed for precision, every module built for performance
          </p>
        </div>

        {/* Features Grid with Enhanced Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Hover Gold Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Top Gold Line on Hover */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-start gap-4">
                {/* Icon with Gold Background */}
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                     style={{
                       background: 'rgba(201,166,70,0.15)',
                       border: '1px solid rgba(201,166,70,0.3)',
                       boxShadow: '0 4px 16px rgba(201,166,70,0.15)'
                     }}>
                  <feature.icon className="h-6 w-6 text-[#C9A646]" />
                </div>
                
                {/* Text Content */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-[#C9A646] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreSystem;