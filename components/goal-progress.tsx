import { formatNumber } from "@/lib/utils";

export function GoalProgress({
  label,
  current,
  target,
  kind = "pontos",
}: {
  label: string;
  current: number;
  target: number;
  kind?: string;
}) {
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="goal-progress">
      <div className="goal-progress-head">
        <div>
          <strong>{label}</strong>
          <span>
            {formatNumber(current)} de {formatNumber(target)} {kind}
          </span>
        </div>
        <b>{progress}%</b>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
