import { requireRole } from '@/lib/auth/helpers';
import { getContributions, getExpenses, getArtistOptions } from '@/lib/queries/finance';
import { FinancePage } from '@/components/finance/finance-page';

export default async function FinanceRoute() {
  await requireRole(['Manager']);
  
  const [contributions, expenses, artists] = await Promise.all([
    getContributions(),
    getExpenses(),
    getArtistOptions(),
  ]);

  const confirmedContributions = (contributions || [])
    .filter((c: any) => c.status === 'Confirmed')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const pendingContributions = (contributions || [])
    .filter((c: any) => c.status === 'Pending')
    .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

  const totalExpenses = (expenses || [])
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const summaries = {
    confirmedContributions,
    pendingContributions,
    totalExpenses,
    availableFunds: confirmedContributions - totalExpenses,
  };

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
