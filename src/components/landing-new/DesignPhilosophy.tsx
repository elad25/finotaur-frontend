const DesignPhilosophy = () => {
  return (
    <section id="about" className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0C0C0E] to-[#0a0a0a]" />
      
      {/* Gold Orbs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#D4BF8E]/[0.06] rounded-full blur-[120px]" />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 noise-texture opacity-30" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Quote */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              <span className="text-white">Design </span>
              <span className="text-[#C9A646]">Philosophy</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              FINOTAUR was built for professionals who value both performance and beauty.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Every pixel, chart, and interaction is designed for focus, confidence, and clarity.
            </p>
            
            {/* Quote Block */}
            <div className="relative pl-6 border-l-2 border-[#C9A646] py-4 mt-8">
              <p className="text-2xl md:text-3xl font-light italic leading-relaxed text-slate-300">
                "Data becomes powerful only when it's understood — that's where <span className="text-[#C9A646] font-semibold">Finotaur</span> shines."
              </p>
            </div>
          </div>

          {/* Right Side - Design Elements */}
          <div className="space-y-6">
            <div className="p-8 rounded-2xl relative overflow-hidden"
                 style={{
                   background: 'rgba(255, 255, 255, 0.03)',
                   backdropFilter: 'blur(8px)',
                   border: '1px solid rgba(255, 255, 255, 0.08)',
                   borderLeft: '4px solid #C9A646',
                   boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
                 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.05] via-transparent to-transparent" />
              <div className="relative">
                <h3 className="text-xl font-semibold mb-3 text-white">Precision by Design</h3>
                <p className="text-slate-400 leading-relaxed">
                  Clean lines, elegant typography, and intuitive navigation create an environment where you can focus on what matters — your trading decisions.
                </p>
              </div>
            </div>
            
            <div className="p-8 rounded-2xl relative overflow-hidden"
                 style={{
                   background: 'rgba(255, 255, 255, 0.03)',
                   backdropFilter: 'blur(8px)',
                   border: '1px solid rgba(255, 255, 255, 0.08)',
                   borderLeft: '4px solid rgba(201,166,70,0.6)',
                   boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
                 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.05] via-transparent to-transparent" />
              <div className="relative">
                <h3 className="text-xl font-semibold mb-3 text-white">Dark Luxury Aesthetic</h3>
                <p className="text-slate-400 leading-relaxed">
                  Inspired by Bloomberg terminals and luxury automotive design, our interface reduces eye strain while maintaining premium aesthetics.
                </p>
              </div>
            </div>
            
            <div className="p-8 rounded-2xl relative overflow-hidden"
                 style={{
                   background: 'rgba(255, 255, 255, 0.03)',
                   backdropFilter: 'blur(8px)',
                   border: '1px solid rgba(255, 255, 255, 0.08)',
                   borderLeft: '4px solid rgba(201,166,70,0.3)',
                   boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
                 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.05] via-transparent to-transparent" />
              <div className="relative">
                <h3 className="text-xl font-semibold mb-3 text-white">Data Clarity</h3>
                <p className="text-slate-400 leading-relaxed">
                  Advanced data visualization transforms complex trading metrics into actionable insights at a glance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DesignPhilosophy;