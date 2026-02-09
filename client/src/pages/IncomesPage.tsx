import { Layout } from "@/components/Layout";
import { useIncomes, useDeleteIncome } from "@/hooks/use-incomes";
import { IncomeForm } from "@/components/forms/IncomeForm";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { MoreVertical, Search, Trash2, Pencil, Wallet } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function IncomesPage() {
  const { data: incomes, isLoading } = useIncomes();
  const deleteMutation = useDeleteIncome();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredIncomes = incomes?.filter(i => 
    i.source.toLowerCase().includes(search.toLowerCase()) || 
    (i.description && i.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Income Logs</h1>
          <p className="text-muted-foreground">Track your earnings from different sources.</p>
        </div>
        <IncomeForm />
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search incomes..." 
              className="pl-9 bg-background" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredIncomes?.length || 0} records found
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredIncomes && filteredIncomes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncomes.map((income) => (
                  <TableRow key={income.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {format(new Date(income.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        {income.source}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {income.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-green-600">
                      +${Number(income.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(income.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if(confirm('Are you sure you want to delete this income record?')) {
                                deleteMutation.mutate(income.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Editing Form Dialog */}
                      {editingId === income.id && (
                        <IncomeForm 
                          initialData={income} 
                          open={true} 
                          onOpenChange={(open) => !open && setEditingId(null)} 
                          trigger={<span className="hidden"></span>}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium text-foreground">No income records found</p>
            <p className="mb-4">Start tracking your earnings today.</p>
            <IncomeForm />
          </div>
        )}
      </Card>
    </Layout>
  );
}
