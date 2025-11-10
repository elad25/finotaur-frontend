import React from "react";

type NavCtx = {
  activeTop: string;
  setActiveTop: (slug: string) => void;
};

export const NavContext = React.createContext<NavCtx>({
  activeTop: "all-markets",
  setActiveTop: () => {},
});

export const NavProvider: React.FC<{
  initial?: string;
  children: React.ReactNode;
}> = ({ initial = "all-markets", children }) => {
  const [activeTop, setActiveTop] = React.useState(initial);
  return (
    <NavContext.Provider value={{ activeTop, setActiveTop }}>
      {children}
    </NavContext.Provider>
  );
};
