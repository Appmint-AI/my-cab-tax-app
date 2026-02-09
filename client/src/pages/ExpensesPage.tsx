import { Layout } from "@/components/Layout";
import { useExpenses, useDeleteExpense } from "@/hooks/use-expenses";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
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
import { MoreVertical, Search, Trash2, Pencil, Receipt } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesPage() {
  const { data: expenses, isLoading } = useExpenses();
  const deleteMutation = useDeleteExpense();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredExpenses = expenses?.filter(e => 
    e.category.toLowerCase().includes(search.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Expenses</h1>
          <p className="text-muted-foreground">Manage and track your deductible expenses.</p>
        </div>
        <ExpenseForm />
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-9 bg-background" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredExpenses?.length || 0} records found
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredExpenses && filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono">
                      ${Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(expense.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if(confirm('Are you sure you want to delete this expense?')) {
                                deleteMutation.mutate(expense.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Editing Form Dialog */}
                      {editingId === expense.id && (
                        <ExpenseForm 
                          initialData={expense} 
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
              <Receipt className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium text-foreground">No expenses found</p>
            <p className="mb-4">Get started by adding your first business expense.</p>
            <ExpenseForm />
          </div>
        )}
      </Card>
    </Layout>
  );
}
