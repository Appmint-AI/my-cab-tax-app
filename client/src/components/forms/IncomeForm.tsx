import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncomeSchema, type InsertIncome } from "@shared/schema";
import { useCreateIncome, useUpdateIncome } from "@/hooks/use-incomes";
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

// Extend schema for form to handle date as string first
const formSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
});

interface IncomeFormProps {
  initialData?: InsertIncome & { id: number };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function IncomeForm({ initialData, open: controlledOpen, onOpenChange: setControlledOpen, trigger }: IncomeFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData?.amount ?? "" as any,
      source: initialData?.source ?? "Uber",
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description ?? "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount,
        source: initialData.source,
        date: new Date(initialData.date).toISOString().split('T')[0],
        description: initialData.description ?? "",
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

  const sources = ["Uber", "Lyft", "Private", "Tips", "Cash", "Other"];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !initialData && (
        <DialogTrigger asChild>
          <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
            <Plus className="mr-2 h-5 w-5" />
            Add Income
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Income" : "Add New Income"}</DialogTitle>
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
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
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
                    <Input placeholder="Trip details, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Record"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
