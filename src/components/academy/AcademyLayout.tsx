// src/components/academy/AcademyLayout.tsx
// The paper-notebook shell. Keeps the standard (dark) marketing Navbar +
// Footer for site continuity, but everything between them is the cream
// notebook surface. The `.academy-paper` scope confines the theme here.
import "@/styles/academy.css";
import Navbar from "@/components/landing-new/Navbar";
import Footer from "@/components/landing-new/Footer";

interface AcademyLayoutProps {
  children: React.ReactNode;
}

export function AcademyLayout({ children }: AcademyLayoutProps) {
  return (
    <div className="academy-paper">
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}
