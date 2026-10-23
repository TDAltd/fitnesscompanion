import { useState } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Scale } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateWeightLog, getListWeightLogsQueryKey, getGetProgressSummaryQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  weightKg: z.coerce.number().min(30, "Weight must be valid").max(200, "Weight must be valid"),
  notes: z.string().optional(),
});

interface WeightLogDialogProps {
  currentWeight?: number;
}

export function WeightLogDialog({ currentWeight }: WeightLogDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createWeightLog = useCreateWeightLog();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weightKg: currentWeight || 0,
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createWeightLog.mutate(
      {
        data: {
          weightKg: values.weightKg,
          notes: values.notes,
          loggedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeightLogsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProgressSummaryQueryKey() });
          setOpen(false);
          form.reset();
          toast({
            title: "Weight logged",
            description: "Keep pushing towards that 75kg goal.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to log weight. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 font-bold h-12 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
          <Scale className="mr-2 h-4 w-4" /> Log Weight
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tight text-xl">Log Weight</DialogTitle>
          <DialogDescription>
            Record your weight today. Morning weigh-ins (fasted) are most accurate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Weight (kg)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="number" step="0.1" className="font-mono text-lg font-bold pl-4 pr-12 h-12" {...field} />
                      <div className="absolute right-4 top-3 font-bold text-muted-foreground font-mono">kg</div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. After a heavy meal, feeling bloated..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-bold uppercase tracking-wider" disabled={createWeightLog.isPending}>
                {createWeightLog.isPending ? "Saving..." : "Save Log"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
