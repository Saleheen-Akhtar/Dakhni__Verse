import { requireRole } from '@/lib/auth/helpers';
import { getContributions, getExpenses, getArtistOptions, getFinanceSummaries } from '@/lib/queries/finance';
import { FinancePage } from '@/components/finance/finance-page';

export default async function FinanceRoute({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; status?: string; category?: string; page?: string }>;
}) {
  await requireRole(['Manager']);
  const params = await searchParams;
  
  const [summaries, contributions, expenses, artists] = await Promise.all([
    getFinanceSummaries(),
    getContributions({
      status: params?.status,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 50,
    }),
    getExpenses({
      category: params?.category,
      page: params?.page ? Number(params.page) : undefined,
      pageSize: 50,
    }),
    getArtistOptions(),
  ]);

  return (
    <div className="space-y-6">
      <FinancePage 
        summaries={summaries} 
        contributions={contributions} 
        expenses={expenses} 
        artists={artists} 
        initialTab={params?.tab || 'contributions'}
      />
    </div>
  );
}
