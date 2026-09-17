import { requireRole } from '@/lib/auth/helpers';
import { getContributions, getExpenses, getFinanceSummaries, getArtistOptions } from '@/lib/queries/finance';
import { FinancePage } from '@/components/finance/finance-page';

export default async function FinanceRoute() {
  await requireRole(['Manager']);
  
  const [summaries, contributions, expenses, artists] = await Promise.all([
    getFinanceSummaries(),
    getContributions(),
    getExpenses(),
    getArtistOptions(),
  ]);

  return (
    <div className="space-y-6">
      <FinancePage 
        summaries={summaries} 
        contributions={contributions} 
        expenses={expenses} 
        artists={artists} 
      />
    </div>
  );
}
