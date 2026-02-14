import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useMileageLogs, useCreateMileageLog, useDeleteMileageLog } from "@/hooks/use-mileage-logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMileageLogSchema, IRS_MILEAGE_RATE, type MileageLog } from "@shared/schema";
import { z } from "zod";
import { Plus, Loader2, Trash2, Car, MapPin, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTaxSummary } from "@/hooks/use-tax";
import { useVehicles } from "@/hooks/use-vehicles";

const formSchema = insertMileageLogSchema.extend({
  totalMiles: z.coerce.number().positive("Miles must be positive"),
  date: z.string().min(1, "Date is required"),
  startOdometer: z.coerce.number().min(0).optional().nullable(),
  endOdometer: z.coerce.number().min(0).optional().nullable(),
});

const businessPurposes = [
  "Shift Start to Shift End",
  "Fare to Airport",
  "Fare to Destination",
  "Between Rides (Repositioning)",
  "To/From Maintenance",
  "Other Business Purpose",
];

export default function MileagePage() {
  const { data: logs, isLoading } = useMileageLogs();
  const { data: summary } = useTaxSummary();
  const [formOpen, setFormOpen] = useState(false);

  const totalLoggedMiles = logs?.reduce((sum, log) => sum + Number(log.totalMiles), 0) || 0;
  const mileageDeduction = totalLoggedMiles * IRS_MILEAGE_RATE;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-mileage-title">Mileage Tracker</h1>
          <p className="text-muted-foreground">IRS-compliant contemporaneous mileage log (Publication 463).</p>
        </div>
        <MileageLogForm open={formOpen} onOpenChange={setFormOpen} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logged Miles</CardTitle>
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Car className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-total-logged-miles">
              {totalLoggedMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">miles from mileage log</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mileage Deduction</CardTitle>
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-mileage-deduction-value">
              ${mileageDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">at ${IRS_MILEAGE_RATE}/mi (IRS 2026 Standard Rate)</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-total-entries">
              {logs?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">mileage log entries</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Mileage Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No mileage entries yet</p>
              <p className="text-sm mt-1">Start logging your business miles to maximize your deduction.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((log) => (
                  <MileageLogRow key={log.id} log={log} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm mt-4">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-mileage-irs-notice">
            The IRS requires a contemporaneous record of business miles driven. Each entry should include the date, business purpose, and total miles. Odometer readings are recommended but not required. My Cab Tax USA uses the Standard Mileage Rate method (${IRS_MILEAGE_RATE}/mi for 2026) per IRS Publication 463. Drivers should cross-reference logs with their vehicle's odometer.
          </p>
        </CardContent>
      </Card>
    </Layout>
  );
}

function MileageLogRow({ log }: { log: MileageLog }) {
  const deleteMutation = useDeleteMileageLog();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background" data-testid={`row-mileage-${log.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{format(parseISO(log.date), "MMM d, yyyy")}</span>
          <Badge variant="secondary" className="text-xs no-default-active-elevate">{log.businessPurpose}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span>{Number(log.totalMiles).toLocaleString(undefined, { maximumFractionDigits: 1 })} miles</span>
          <span>${(Number(log.totalMiles) * IRS_MILEAGE_RATE).toFixed(2)} deduction</span>
          {log.startOdometer && log.endOdometer && (
            <span>Odometer: {Number(log.startOdometer).toLocaleString()} - {Number(log.endOdometer).toLocaleString()}</span>
          )}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-delete-mileage-${log.id}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mileage Entry</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this mileage record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(log.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MileageLogForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateMileageLog();
  const { data: vehicles } = useVehicles();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      businessPurpose: "Shift Start to Shift End",
      totalMiles: "" as any,
      startOdometer: null,
      endOdometer: null,
      vehicleId: null,
      tripState: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-mileage">
          <Plus className="mr-2 h-5 w-5" />
          Log Miles
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Business Miles</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input data-testid="input-mileage-date" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Purpose</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mileage-purpose">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessPurposes.map((purpose) => (
                        <SelectItem key={purpose} value={purpose}>
                          {purpose}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {vehicles && vehicles.length > 0 && (
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                      defaultValue={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-mileage-vehicle">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No vehicle assigned</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="totalMiles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Miles</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-mileage-total"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
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
                name="startOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Odometer</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-mileage-start-odo"
                        type="number"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Odometer</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-mileage-end-odo"
                        type="number"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tripState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trip State</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mileage-trip-state">
                        <SelectValue placeholder="State where trip occurred (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button data-testid="button-submit-mileage" type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Mileage
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
