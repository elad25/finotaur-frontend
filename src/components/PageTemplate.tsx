import { Card } from '@/components/ui/card';
import { useDomain } from '@/hooks/useDomain';

interface PageTemplateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export const PageTemplate = ({ title, description, children }: PageTemplateProps) => {
  const { activeDomain } = useDomain();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        {activeDomain.label} / {title}
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>

      {/* Content */}
      {children || (
        <Card className="rounded-2xl border-border bg-base-800 p-12 text-center shadow-premium">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-gold/10 p-4">
              <div className="h-full w-full rounded-full border-2 border-dashed border-gold/30" />
            </div>
            <h3 className="text-lg font-semibold text-muted-foreground">
              Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
