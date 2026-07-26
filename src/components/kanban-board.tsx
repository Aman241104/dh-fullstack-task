"use client";

import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { Lead, LeadStatus, Profile } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

const COLUMN_STYLES: Record<LeadStatus, string> = {
  new: "border-t-blue-400",
  contacted: "border-t-violet-400",
  qualified: "border-t-amber-400",
  won: "border-t-emerald-400",
  lost: "border-t-neutral-300",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function DraggableCard({
  lead,
  assignedName,
  onSelect,
}: {
  lead: Lead;
  assignedName: string;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={`bg-card border border-border rounded-xl p-3 mb-2 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
          {initials(lead.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.company || "—"}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground truncate">{assignedName}</p>
      {lead.possible_duplicate && (
        <span className="inline-block mt-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
          possible duplicate
        </span>
      )}
    </div>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: LeadStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] bg-card-muted rounded-2xl p-3 border-t-4 ${COLUMN_STYLES[status]} ${isOver ? "ring-2 ring-accent/30" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1 capitalize">
        {status}
      </p>
      {children}
    </div>
  );
}

export default function KanbanBoard({
  leads,
  profileById,
  onStatusChange,
  onSelectLead,
}: {
  leads: Lead[];
  profileById: Record<string, Profile>;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onSelectLead: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.status !== newStatus) {
      onStatusChange(lead.id, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUSES.map((status) => (
          <DroppableColumn key={status} status={status}>
            {leads
              .filter((l) => l.status === status)
              .map((lead) => (
                <DraggableCard
                  key={lead.id}
                  lead={lead}
                  assignedName={
                    lead.assigned_to ? profileById[lead.assigned_to]?.name ?? "—" : "Unassigned"
                  }
                  onSelect={() => onSelectLead(lead.id)}
                />
              ))}
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
}
