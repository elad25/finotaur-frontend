import { PageTemplate } from '@/components/PageTemplate';
import { NewsList } from '@/components/markets/NewsList';

export default function CryptoNews() {
  return (
    <PageTemplate
      title="News"
      description="Latest headlines and market stories."
    >
      <div className="mt-4">
        <NewsList />
      </div>
    </PageTemplate>
  );
}
