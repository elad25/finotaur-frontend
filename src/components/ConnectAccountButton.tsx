import { useLocation } from "react-router-dom";

type Props = {
  onClick?: () => void;           // אופציונלי – לחיבור עתידי (Cardcom/Stripe)
  to?: string;                    // אופציונלי – אם כרגע מפנים לדף הגדרות/חיבור
};

export default function ConnectAccountButton({ onClick, to }: Props) {
  const { pathname } = useLocation();
  const isDashboard =
    pathname === "/" ||
    pathname.startsWith("/dashboard");

  if (!isDashboard) return null;

  const Btn = (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
                 bg-black text-white hover:opacity-90 transition"
      aria-label="Connect your account"
    >
      CONNECT YOUR ACCOUNT
    </button>
  );

  if (to) {
    return (
      <a href={to} className="inline-block">
        {Btn}
      </a>
    );
  }
  return Btn;
}
