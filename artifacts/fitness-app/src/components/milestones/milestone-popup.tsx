import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shareMilestone, useMarkSeen, useMilestones, type Milestone } from "@/lib/milestones";

/**
 * Celebrates newly reached milestones, one at a time, once each.
 * Checks again whenever the page changes or the person logs something.
 */
export function MilestonePopup() {
  const [location] = useLocation();
  const qc = useQueryClient();
  const { data } = useMilestones();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const markSeen = useMarkSeen();
  const { toast } = useToast();
  const [current, setCurrent] = useState<Milestone | null>(null);

  // Re-check on navigation and after anything is logged
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["milestones"] });
  }, [location, qc]);
  useEffect(
    () =>
      qc.getMutationCache().subscribe((e) => {
        if (e.type === "updated" && e.mutation.state.status === "success" && !String(e.mutation.options.mutationKey ?? "").includes("milestone")) {
          void qc.invalidateQueries({ queryKey: ["milestones"] });
        }
      }),
    [qc],
  );

  useEffect(() => {
    if (current || !data?.unseen.length) return;
    const next = data.milestones.find((m) => m.key === data.unseen[0]);
    if (next) setCurrent(next);
  }, [data, current]);

  const close = () => {
    if (current) markSeen.mutate([current.key]);
    setCurrent(null);
  };

  const first = profile?.name?.trim().split(/\s+/)[0];
  return (
    <Dialog open={Boolean(current)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm text-center" data-testid="milestone-popup">
        {current && (
          <>
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sage to-dusk/40 text-5xl" aria-hidden>
              {current.icon}
            </div>
            <DialogHeader className="space-y-2 text-center sm:text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Milestone reached</p>
              <DialogTitle className="font-display text-2xl font-medium">{current.title}</DialogTitle>
              <DialogDescription className="text-base">{current.line}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                className="h-11 w-full gap-2"
                onClick={async () => {
                  const r = await shareMilestone(current, first);
                  if (r === "downloaded") toast({ title: "Card saved", description: "Post it wherever you like." });
                }}
                data-testid="button-share-milestone"
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button variant="ghost" className="h-11 w-full" onClick={close}>
                Keep going
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
