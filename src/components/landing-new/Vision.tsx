const Vision = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-8">
          The <span className="text-primary">FINOTAUR</span> Vision
        </h2>
        
        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
          Our mission is to redefine how traders interact with their data.
        </p>
        
        <p className="text-xl leading-relaxed mb-12">
          We believe in <span className="text-primary font-semibold">intelligence</span>, not luck. 
          <span className="text-primary font-semibold"> Precision</span>, not chaos.
        </p>

        {/* Quote */}
        <div className="relative">
          <div className="luxury-card p-12 border-t-4 border-primary">
            <p className="text-3xl md:text-4xl font-light italic leading-relaxed">
              "Trading mastery begins with self-awareness — <span className="text-primary font-semibold">Finotaur</span> gives you the mirror."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Vision;
