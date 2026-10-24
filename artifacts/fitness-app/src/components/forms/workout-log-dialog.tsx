import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Activity, Dumbbell } from "lucide-react";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  useCreateWorkout, 
  getListWorkoutsQueryKey, 
  getGetWorkoutStreakQueryKey,
  getGetProgressSummaryQueryKey
} from "@workspace/api-client-react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  type: z.string().min(2, "Type is required"),
  durationMins: z.coerce.number().min(1, "Must be at least 1 min").max(300).optional(),
  notes: z.string().optional(),
});

interface WorkoutLogDialogProps {
  defaultName?: string;
  isRest?: boolean;
}

export function WorkoutLogDialog({ defaultName, isRest }: WorkoutLogDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createWorkout = useCreateWorkout();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName || "",
      type: "Strength",
      durationMins: 45,
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createWorkout.mutate(
      {
        data: {
          name: values.name,
          type: values.type,
          durationMins: values.durationMins,
          notes: values.notes,
          loggedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWorkoutStreakQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProgressSummaryQueryKey() });
          setOpen(false);
          form.reset();
          toast({
            title: "Workout logged",
            description: "One step closer to the goal.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to log workout. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 gap-2 font-semibold">
          <Dumbbell className="mr-2 h-4 w-4" /> Log Workout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-tight text-xl">Log workout</DialogTitle>
          <DialogDescription>
            {isRest ? "It's a rest day, but active recovery is okay to log." : "Did you finish today's training? Let's log it."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground">Workout Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Die-Hard Leg Day" className="font-bold h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground">Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Strength">Strength</SelectItem>
                        <SelectItem value="Cardio">Cardio</SelectItem>
                        <SelectItem value="Active Recovery">Active Recovery</SelectItem>
                        <SelectItem value="Flexibility">Flexibility / Core</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="durationMins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground">Duration</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" className="font-bold pr-12 h-10" {...field} />
                        <div className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground">min</div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Pushed harder on squats, felt good."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full font-bold" disabled={createWorkout.isPending}>
                {createWorkout.isPending ? "Saving..." : "Save Workout"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
