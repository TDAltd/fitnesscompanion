import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withBase } from "@/lib/base-path";
import { InAppPreview } from "@/components/admin/marketing-admin";

type Message = { id: number; title: string; body: string; buttonLabel: string | null; buttonUrl: string | null };

const post = (id: number, action: "seen" | "click" | "dismiss") =>
  fetch(withBase(`/api/messages/${id}/${action}`), { method: "POST", credentials: "same-origin" }).catch(() => undefined);

/** An offer or news card from Admin → Marketing, until it's tapped or closed. */
export function InAppMessage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data } = useQuery({
    queryKey: ["in-app-message"],
    queryFn: async () => {
      const res = await fetch(withBase("/api/messages"), { credentials: "same-origin" });
      if (!res.ok) return null;
      return ((await res.json()) as { message: Message | null }).message;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) void post(data.id, "seen");
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;
  const hide = () => qc.setQueryData(["in-app-message"], null);
  return (
    <InAppPreview
      title={data.title}
      body={data.body}
      button={data.buttonLabel}
      onClose={() => {
        hide();
        void post(data.id, "dismiss");
      }}
      onButton={() => {
        hide();
        void post(data.id, "click");
        const u = data.buttonUrl || "/today";
        if (/^https?:\/\//i.test(u)) window.open(u, "_blank", "noopener");
        else navigate(u);
      }}
    />
  );
}
