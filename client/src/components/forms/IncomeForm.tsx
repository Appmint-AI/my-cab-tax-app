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

const formSchema = insertIncomeSchema.extend({
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  miles: z.coerce.number().min(0).optional().default(0),
  platformFees: z.coerce.number().min(0).optional().default(0),
});

interface IncomeFormProps {
  initialData?: InsertIncome & { id: number; miles?: string | number | null; platformFees?: string | number | null };
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
      amount: initialData?.amount ?? ("" as any),
      source: initialData?.source ?? "Uber",
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description ?? "",
      miles: initialData?.miles ? Number(initialData.miles) : 0,
      platformFees: initialData?.platformFees ? Number(initialData.platformFees) : 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        amount: initialData.amount,
        source: initialData.source,
        date: new Date(initialData.date).toISOString().split('T')[0],
        description: initialData.description ?? "",
        miles: initialData.miles ? Number(initialData.miles) : 0,
        platformFees: initialData.platformFees ? Number(initialData.platformFees) : 0,
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
          <Button data-testid="button-add-income">
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
                  <FormLabel>Gross Earnings ($)</FormLabel>
                  <FormControl>
                    <Input 
                      data-testid="input-income-amount"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="miles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miles Driven</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-income-miles"
                        type="number" 
                        step="0.1" 
                        placeholder="0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platformFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform Fees ($)</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-income-fees"
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-income-source">
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
                    <Input data-testid="input-income-date" type="date" {...field} />
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
                    <Input data-testid="input-income-description" placeholder="Trip details, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button data-testid="button-submit-income" type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Record"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
