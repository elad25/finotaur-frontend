import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary";
};

const GOLD = "#C9A646";

export default function GoldButton({
  children,
  loading,
  variant = "primary",
  className = "",
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center px-5 py-3 rounded-full font-semibold transition-transform duration-150 focus:outline-none";
  const styles =
    variant === "primary"
      ? {
          background: `linear-gradient(180deg, ${GOLD}, #b6923e)`,
          color: "#151515",
          boxShadow: "0 10px 24px rgba(201,166,70,0.18)",
        }
      : {
          background: "transparent",
          color: "#E8E8E8",
          boxShadow: "none",
          border: `1px solid ${GOLD}55`,
        };

  return (
    <button
      {...rest}
      className={`${base} ${className}`}
      style={styles as React.CSSProperties}
      disabled={loading || rest.disabled}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {loading && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
      )}
      {children}
    </button>
  );
}
