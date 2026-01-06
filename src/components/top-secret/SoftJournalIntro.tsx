// src/components/top-secret/SoftJournalIntro.tsx
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const SoftJournalIntro = () => {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#12100A] to-[#0A0A0A]" />

      {/* Gold glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C9A646]/[0.08] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/3 w-[250px] h-[200px] bg-[#D4AF37]/[0.06] rounded-full blur-[80px]" />

      {/* Top border with gold */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-4 text-center"
        >
          <BookOpen className="w-5 h-5 text-slate-500" />
          <p className="text-slate-500 text-sm md:text-base">
            Execution matters too. That's why{' '}
            <span className="text-slate-400">FINOTAUR</span>{' '}
            also includes a professional trading journal.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SoftJournalIntro;
