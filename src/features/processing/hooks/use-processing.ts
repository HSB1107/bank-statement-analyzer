"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useReducer, useState } from "react";
import { useService } from "@/shared/lib/di-react";
import { type CaseId } from "@/shared/data/schemas/ids";
import { type ProcessingEvent, type ProcessingPlan, type StageStatus } from "../schemas/processing";
import { ProcessingServiceToken } from "../services/processing-service";

export function useProcessingPlan(caseId: CaseId) {
  const svc = useService(ProcessingServiceToken);
  return useQuery({ queryKey: ["processing", caseId, "plan"], queryFn: () => svc.getPlan(caseId) });
}

export interface RunState {
  stages: Record<number, { status: StageStatus; progress: number }>;
  elapsedSec: number;
  traces: { tag: string; text: string; id: number }[];
  done: boolean;
}

const initial: RunState = { stages: {}, elapsedSec: 0, traces: [], done: false };

function reducer(state: RunState, action: ProcessingEvent | { type: "reset" }): RunState {
  switch (action.type) {
    case "reset":
      return initial;
    case "stage":
      return {
        ...state,
        elapsedSec: action.elapsedSec,
        stages: { ...state.stages, [action.index]: { status: action.status, progress: action.progress } },
      };
    case "trace":
      return {
        ...state,
        traces: [
          ...state.traces.slice(-7),
          { tag: action.tag, text: action.text, id: state.traces.length + Date.now() },
        ],
      };
    case "done":
      return { ...state, elapsedSec: action.elapsedSec, done: true };
  }
}

/** Consumes the processing event stream (async iterator) into view state; restartable and cancellable. */
export function useProcessingRun(caseId: CaseId, plan: ProcessingPlan | undefined) {
  const svc = useService(ProcessingServiceToken);
  const [state, dispatch] = useReducer(reducer, initial);
  const [run, setRun] = useState({ id: 0, speed: 6 });
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!plan) return;
    const controller = new AbortController();
    const consume = async () => {
      try {
        for await (const e of svc.stream(caseId, { speed: run.speed, signal: controller.signal }))
          dispatch(e);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setError(e);
      }
    };
    void consume();
    return () => controller.abort();
  }, [svc, caseId, plan, run]);
  const restart = (speed: number = run.speed) => {
    dispatch({ type: "reset" });
    setError(null);
    setRun((r) => ({ id: r.id + 1, speed }));
  };
  return { state, error, speed: run.speed, restart };
}
