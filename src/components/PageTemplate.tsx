import { Card } from '@/components/ui/card';

interface PageTemplateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  /** When true, center the title and description text. Default: false. */
  centered?: boolean;
}

export const PageTemplate = ({ title, description, children, centered = false }: PageTemplateProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className={centered ? 'text-center' : undefined}>
        <h1 className={`text-3xl font-bold${centered ? ' mx-auto' : ''}`}>{title}</h1>
        <p className={`mt-1 text-muted-foreground${centered ? ' mx-auto' : ''}`}>{description}</p>
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
