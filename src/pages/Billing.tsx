import { Navigate } from "react-router-dom";

// Legacy Stripe-era manual card-entry checkout page — superseded by Whop
// checkout + the app-granted 14-day trial at signup. No longer collects
// payment details directly; redirect to the canonical in-app pricing page.
const Billing = () => {
  return <Navigate to="/app/upgrade" replace />;
};

export default Billing;
