"use client";

import { CheckCircle2, Users } from "lucide-react";
import type { Membership } from "@/lib/types";

export function ParticipantSelector({
  participants,
  value,
  disabledIds = [],
  onChange,
}: {
  participants: Membership[];
  value: string[];
  disabledIds?: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="participant-grid" role="group" aria-label="Participantes da ação">
      {participants.map((member) => {
        const selected = value.includes(member.id);
        const disabled = disabledIds.includes(member.id);
        return (
          <button
            type="button"
            key={member.id}
            className={`participant-chip ${selected ? "selected" : ""}`}
            aria-pressed={selected}
            disabled={disabled}
            title={disabled ? "Este participante não pode pontuar nesta ação." : undefined}
            onClick={() =>
              onChange(
                selected ? value.filter((id) => id !== member.id) : [...value, member.id],
              )
            }
          >
            <span><Users size={15} /></span>
            <div>
              <strong>{member.user?.name ?? member.name ?? "Participante"}</strong>
              <small>{member.role === "MANAGER" ? "Líder" : "Participante"}</small>
            </div>
            {selected ? <CheckCircle2 size={17} /> : null}
          </button>
        );
      })}
    </div>
  );
}
