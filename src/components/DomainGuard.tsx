import { Navigate, useLocation } from 'react-router-dom';
import { domains } from '@/constants/nav';
import { ReactNode } from 'react';

interface DomainGuardProps {
  children: ReactNode;
  domainId: string;
}

/**
 * Route guard that checks if a domain is locked
 * If locked, redirects to journal/overview
 * If unlocked, renders the children
 */
export const DomainGuard = ({ children, domainId }: DomainGuardProps) => {
  const location = useLocation();
  const domain = domains[domainId];

  // If domain is locked, redirect to journal
  if (domain?.locked) {
    console.log(`🔒 Domain "${domainId}" is locked. Redirecting to journal...`);
    return <Navigate to="/app/journal/overview" replace state={{ from: location }} />;
  }

  // Domain is unlocked, render the page
  return <>{children}</>;
};