import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-8xl font-bold text-gold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/app" className="inline-block rounded-lg bg-gold px-6 py-3 text-base-900 font-medium transition-smooth hover:bg-gold-600">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
