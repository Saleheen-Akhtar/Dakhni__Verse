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
  const activeTab = params?.tab === 'expenses' ? 'expenses' : 'contributions';
  const page = params?.page ? Number(params.page) : 1;
  
  const [summaries, artists, activeData] = await Promise.all([
    getFinanceSummaries(),
    getArtistOptions(),
    activeTab === 'expenses'
      ? getExpenses({
          category: params?.category,
          page,
          pageSize: 25,
        })
      : getContributions({
          status: params?.status,
          page,
          pageSize: 25,
        }),
  ]);

  const contributions = activeTab === 'expenses' ? [] : activeData;
  const expenses = activeTab === 'expenses' ? activeData : [];

  return (
    <div className="space-y-6">
      <FinancePage 
        summaries={summaries} 
        contributions={contributions} 
        expenses={expenses} 
        artists={artists} 
        initialTab={activeTab}
        currentPage={page}
      />
    </div>
  );
}
