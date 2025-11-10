import { PageTemplate } from '@/components/PageTemplate';
import ReportsSECDocuments from '@/components/ReportsSECDocuments';

export default function StocksReports() {
  return (
    <PageTemplate
      title="Reports & PDFs"
      description="Research reports, financial statements, and analyst documents."
    >
      <ReportsSECDocuments />
    </PageTemplate>
  );
}
