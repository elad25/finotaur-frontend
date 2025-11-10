import { memo } from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
}

// 🚀 OPTIMIZATION: Memoized component to prevent unnecessary re-renders
const PageTitle = memo(({ title, subtitle }: PageTitleProps) => {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
});

PageTitle.displayName = 'PageTitle';

export default PageTitle;