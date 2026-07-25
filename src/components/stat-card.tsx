import type { Icon } from "@phosphor-icons/react";

export default function StatCard({
  label,
  value,
  icon: IconComp,
}: {
  label: string;
  value: string | number;
  icon: Icon;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 flex items-center gap-4 border border-border">
      <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
        <IconComp size={20} weight="fill" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  );
}
