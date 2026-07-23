import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeRound,
  summarize,
  affordableStock,
  type SimContent,
  type RoundOutcome,
} from "@/lib/sim";
import { mulberry32, seedFromString } from "@/lib/rng";
import type { ResultPayload } from "@/framework/api/schemas";

// MINI_SIM renderer (PRD §8.1) → `metrics` result. Multi-round: set price + stock
// each round, cash carries over, demand falls with price. Reports the metrics
// payload up to the shell only when the run is complete.
export function MiniSimRenderer({
  content,
  activityId,
  onChange,
}: {
  content: SimContent;
  activityId: string;
  onChange: (result: ResultPayload | null) => void;
}) {
  const rng = useRef(mulberry32(seedFromString(activityId)));
  const [cash, setCash] = useState(content.startingCash);
  const [round, setRound] = useState(1);
  const [price, setPrice] = useState(content.price.default);
  const [stock, setStock] = useState(content.stock.default);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const [done, setDone] = useState(false);

  const maxStock = Math.min(content.stock.max, affordableStock(content, cash));
  const clampedStock = Math.min(stock, maxStock);
  const projectedCost = clampedStock * content.unitCost;
  const cur = (n: number) => `${content.currency}${n}`;

  useEffect(() => {
    onChange(null); // not submittable until the run finishes
  }, [onChange]);

  function sellDay() {
    const weatherMultiplier = 0.7 + rng.current() * 0.65; // 0.70 – 1.35
    const outcome = computeRound(
      content,
      round,
      { price, stock: clampedStock },
      cash,
      weatherMultiplier,
    );
    const nextOutcomes = [...outcomes, outcome];
    setOutcomes(nextOutcomes);
    setCash(outcome.cashAfter);

    if (round >= content.rounds || outcome.cashAfter <= 0) {
      setDone(true);
      const summary = summarize(content, nextOutcomes);
      onChange({ metrics: { values: summary.values, decisionLog: summary.decisionLog } });
    } else {
      setRound(round + 1);
      setStock(Math.min(content.stock.default, affordableStock(content, outcome.cashAfter)));
    }
  }

  const lastOutcome = outcomes[outcomes.length - 1];

  const summaryView = useMemo(() => {
    if (!done) return null;
    const s = summarize(content, outcomes);
    return (
      <div className="rounded-xl border border-line bg-surface-2 p-4 text-center">
        <p className="text-sm text-muted">The stand is closed. Here's how you did:</p>
        <p className="mt-2 text-2xl font-semibold text-text">
          {cur(s.values.finalCash)}{" "}
          <span className="text-sm font-normal text-muted">in the till</span>
        </p>
        <p className={"mt-1 text-sm " + (s.values.profit >= 0 ? "text-success" : "text-danger")}>
          {s.values.profit >= 0 ? "+" : ""}
          {cur(s.values.profit)} vs. your ₹{content.startingCash} start · {s.values.unitsSold} sold
          {s.values.wentBankrupt && " · went broke"}
        </p>
        <p className="mt-3 text-xs text-muted">Submit to have the backend score your run.</p>
      </div>
    );
  }, [done, outcomes, content]);

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted">{content.intro}</p>

      {/* Meters */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
        <Meter
          label={content.roundLabel}
          value={`${Math.min(round, content.rounds)} / ${content.rounds}`}
        />
        <Meter label="Till" value={cur(cash)} accent={cash <= 0 ? "danger" : "coin"} />
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted">Weather</p>
          <p className="text-sm text-text">
            {content.weather[(round - 1) % content.weather.length]}
          </p>
        </div>
      </div>

      {lastOutcome && (
        <p className="mt-2 text-center text-xs text-muted">
          {content.roundLabel} {lastOutcome.round}: sold {lastOutcome.sales} of {lastOutcome.stock}{" "}
          at {cur(lastOutcome.price)} → {lastOutcome.profit >= 0 ? "+" : ""}
          {cur(lastOutcome.profit)}
        </p>
      )}

      {summaryView ?? (
        <div className="mt-4 space-y-4">
          <Slider
            label={`Price per cup: ${cur(price)}`}
            min={content.price.min}
            max={content.price.max}
            step={content.price.step}
            value={price}
            onChange={setPrice}
          />
          <div>
            <Slider
              label={`Buy stock: ${clampedStock} cups (cost ${cur(projectedCost)})`}
              min={content.stock.min}
              max={Math.max(content.stock.min, maxStock)}
              step={content.stock.step}
              value={clampedStock}
              onChange={setStock}
            />
            <p className="mt-1 text-xs text-muted">
              You can afford up to {maxStock} cups today. Unsold stock is money spent.
            </p>
          </div>
          <button
            onClick={sellDay}
            className="w-full rounded-lg bg-accent/90 py-2.5 font-medium text-ink transition hover:brightness-110"
          >
            Open the stand — sell {content.roundLabel} {round}
          </button>
        </div>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "coin" | "danger";
}) {
  const color = accent === "danger" ? "text-danger" : accent === "coin" ? "text-coin" : "text-text";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={"text-lg font-semibold tabular-nums " + color}>{value}</p>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-text">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-gold"
      />
    </label>
  );
}
