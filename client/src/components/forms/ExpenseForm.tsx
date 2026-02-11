import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, type InsertExpense } from "@shared/schema";
import { useCreateExpense, useUpdateExpense } from "@/hooks/use-expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";

const formSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
});

interface ExpenseFormProps {
  initialData?: InsertExpense & { id: number };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ExpenseForm({ initialData, open: controlledOpen, onOpenChange: setControlledOpen, trigger }: ExpenseFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount ?? "" as any,
      category: initialData?.category ?? "Car and Truck Expenses",
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description ?? "",
      receiptUrl: initialData?.receiptUrl ?? "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount,
        category: initialData.category,
        date: new Date(initialData.date).toISOString().split('T')[0],
        description: initialData.description ?? "",
        receiptUrl: initialData.receiptUrl ?? "",
      });
    }
  }, [initialData, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (initialData) {
      updateMutation.mutate(
        { id: initialData.id, ...values },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      });
    }
  };

  const categories = [
    "Car and Truck Expenses",
    "Commissions and Fees",
    "Insurance",
    "Interest",
    "Legal and Professional Services",
    "Office Expense",
    "Other Expenses",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !initialData && (
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-add-expense">
            <Plus className="mr-2 h-5 w-5" />
            Add Expense
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="text-lg font-medium" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Repair shop name, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Record Expense"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
