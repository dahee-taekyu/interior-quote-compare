"use client";

import { useEffect, useState } from "react";
import type { Vendor } from "./types";

const BASELINE_KEY = "iqc-baseline-vendor";

/** 기준 업체 선택 (브라우저별로 기억) — 비교 화면들이 공유 */
export function useBaseline(vendors: Vendor[]) {
  const [baselineId, setBaselineId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(BASELINE_KEY));
      if (saved && vendors.some((v) => v.id === saved)) setBaselineId(saved);
      else if (vendors.length > 0) setBaselineId(vendors[0].id);
    } catch {
      if (vendors.length > 0) setBaselineId(vendors[0].id);
    }
  }, [vendors]);

  const chooseBaseline = (id: number) => {
    setBaselineId(id);
    try {
      localStorage.setItem(BASELINE_KEY, String(id));
    } catch {}
  };

  const baseline = vendors.find((v) => v.id === baselineId) ?? vendors[0] ?? null;

  // 기준 업체 맨 앞, 나머지는 가나다·abc 순
  const ordered = [...vendors].sort((a, b) => {
    if (baseline) {
      if (a.id === baseline.id) return -1;
      if (b.id === baseline.id) return 1;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  return { baseline, chooseBaseline, ordered };
}
