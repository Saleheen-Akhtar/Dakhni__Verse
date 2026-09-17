"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { EXPENSE_CATEGORIES } from '@/lib/utils/constants';
import { createContribution, createExpense } from '@/lib/queries/finance';
import { contributionSchema, expenseSchema } from '@/lib/validation/finance';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

export function FinancePage({
  summaries,
  contributions,
  expenses,
  artists,
  initialTab = 'contributions',
  currentPage = 1,
  pageSize = 50,
}: {
  summaries: {
    confirmedContributions: number;
    totalExpenses: number;
    pendingContributions: number;
    availableFunds: number;
  };
  contributions: any[];
  expenses: any[];
  artists: any[];
  initialTab?: string;
  currentPage?: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAddContributionOpen, setIsAddContributionOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    params.delete('page');
    router.push(`/finance?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    router.push(`/finance?${params.toString()}`);
  };

  const availableFunds = summaries.availableFunds ?? (summaries.confirmedContributions - summaries.totalExpenses);

  const contributionForm = useForm({
    resolver: zodResolver(contributionSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], status: 'Pending', amount: 0 }
  });

  const expenseForm = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], amount: 0 }
  });

  const onAddContribution = async (data: any) => {
    try {
      await createContribution(data);
      toast({ title: 'Contribution recorded' });
      setIsAddContributionOpen(false);
      contributionForm.reset();
      router.refresh();
    } catch (err) {
      toast({ title: 'Error recording contribution', variant: 'destructive' });
    }
  };

  const onAddExpense = async (data: any) => {
    try {
      await createExpense(data);
      toast({ title: 'Expense recorded' });
      setIsAddExpenseOpen(false);
      expenseForm.reset();
      router.refresh();
    } catch (err) {
      toast({ title: 'Error recording expense', variant: 'destructive' });
    }
  };

  const contribColumns = [
    { header: 'Date', accessorKey: 'date', cell: ({ row }: any) => formatDate(row.original.date) },
    { header: 'Person', accessorKey: 'person.name', cell: ({ row }: any) => row.original.person?.name || '-' },
    { header: 'Amount', accessorKey: 'amount', cell: ({ row }: any) => formatCurrency(row.original.amount) },
    { header: 'Purpose', accessorKey: 'purpose' },
    { 
      header: 'Status', 
      accessorKey: 'status', 
      cell: ({ row }: any) => <Badge variant={row.original.status === 'Confirmed' ? 'success' : row.original.status === 'Pending' ? 'warning' : 'secondary'}>{row.original.status}</Badge> 
    }
  ];

  const expenseColumns = [
    { header: 'Date', accessorKey: 'date', cell: ({ row }: any) => formatDate(row.original.date) },
    { header: 'Category', accessorKey: 'category' },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Amount', accessorKey: 'amount', cell: ({ row }: any) => formatCurrency(row.original.amount) },
    { header: 'Paid By', accessorKey: 'paid_by' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-heading">Finance Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-secondary-text">Available Funds</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-heading">{formatCurrency(availableFunds)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-secondary-text">Confirmed Contributions</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-green-600">{formatCurrency(summaries.confirmedContributions)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-secondary-text">Pending Contributions</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-amber-600">{formatCurrency(summaries.pendingContributions)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-secondary-text">Total Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-primary-red">{formatCurrency(summaries.totalExpenses)}</p></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={isAddContributionOpen} onOpenChange={setIsAddContributionOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Contribution</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Contribution</DialogTitle></DialogHeader>
                <Form {...contributionForm}>
                  <form onSubmit={contributionForm.handleSubmit(onAddContribution)} className="space-y-4">
                    <FormField control={contributionForm.control} name="person_id" render={({ field }) => (
                      <FormItem><FormLabel>Person</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
                        <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={contributionForm.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount (₹) *</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={contributionForm.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={contributionForm.control} name="purpose" render={({ field }) => (
                      <FormItem><FormLabel>Purpose</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={contributionForm.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {['Planned', 'Pending', 'Confirmed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={contributionForm.formState.isSubmitting}>Save Contribution</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {contributions.length === 0 ? (
            <EmptyState title="No contributions recorded" description="Add contributions to track incoming funds." />
          ) : (
            <DataTable 
              columns={contribColumns} 
              data={contributions} 
              serverPagination={{
                currentPage: currentPage || 1,
                pageSize: pageSize || 50,
                onPageChange: handlePageChange,
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(onAddExpense)} className="space-y-4">
                    <FormField control={expenseForm.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={expenseForm.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={expenseForm.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount (₹) *</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={expenseForm.control} name="paid_by" render={({ field }) => (
                      <FormItem><FormLabel>Paid By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={expenseForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={expenseForm.formState.isSubmitting}>Save Expense</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {expenses.length === 0 ? (
            <EmptyState title="No expenses recorded" description="Add expenses to track studio costs." />
          ) : (
            <DataTable 
              columns={expenseColumns} 
              data={expenses} 
              serverPagination={{
                currentPage: currentPage || 1,
                pageSize: pageSize || 50,
                onPageChange: handlePageChange,
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
