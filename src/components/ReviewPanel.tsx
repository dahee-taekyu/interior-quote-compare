"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { formatKRW } from "@/lib/calc";

export const EXCLUDE = "__exclude__";

export interface ReviewItem {
  rawText: string;
  detail: string;
  amount: number;
  categoryKey: string; // 표준 공정 key 또는 EXCLUDE
  confidence: "high" | "medium" | "low";
  note: string | null;
}

export interface ReviewData {
  vendorName: string;
  vatIncluded: boolean;
  totalOnDocument: number | null;
  items: ReviewItem[];
}

/** 파싱 결과(AI/규칙/JSON 공통)를 검수하고 확정하면 업체로 등록하는 패널 */
export default function ReviewPanel({
  categories,
  initial,
  onChanged,
  onConfirmed,
}: {
  categories: Category[];
  initial: ReviewData;
  onChanged: () => Promise<void>;
  onConfirmed: (message: string) => void;
}) {
  const [vendorName, setVendorName] = useState(initial.vendorName);
  const [vatIncluded, setVatIncluded] = useState(initial.vatIncluded);
  const [items, setItems] = useState<ReviewItem[]>(initial.items);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVendorName(initial.vendorName);
    setVatIncluded(initial.vatIncluded);
    setItems(initial.items);
  }, [initial]);

  const updateItem = (index: number, patch: Partial<ReviewItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const includedSum = items
    .filter((it) => it.categoryKey !== EXCLUDE)
    .reduce((a, it) => a + it.amount, 0);
  const mismatch =
    initial.totalOnDocument !== null &&
    Math.abs(includedSum - initial.totalOnDocument) > 1000;

  const confirm = async () => {
    if (!vendorName.trim() || saving) return;
    setSaving(true);
    try {
      const vRes = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vendorName.trim(), vatIncluded }),
      });
      const vendor = await vRes.json();

      // 각 파싱 항목을 세부항목(LineItem)으로 그대로 저장 — 원문 보존
      const idOf = new Map(categories.map((c) => [c.key, c.id]));
      const payload = items
        .filter((it) => it.categoryKey !== EXCLUDE && idOf.has(it.categoryKey))
        .map((it) => ({
          categoryId: idOf.get(it.categoryKey)!,
          name: it.detail ? `${it.rawText} (${it.detail})` : it.rawText,
          amount: it.amount,
          memo: "파싱으로 등록",
        }));

      await fetch(`/api/vendors/${vendor.id}/line-items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      await onChanged();
      onConfirmed(
        `"${vendorName.trim()}" 업체가 등록되었습니다. 견적서에 없는 공정은 '확인 필요' 상태이니 견적 입력 탭에서 미포함 여부를 확정하세요.`
      );
    } finally {
      setSaving(false);
    }
  };

  const confidenceBadge = (c: ReviewItem["confidence"]) =>
    c === "low" ? (
      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">확인 필요</span>
    ) : c === "medium" ? (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600">애매함</span>
    ) : (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">확실</span>
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold">분석 결과 검수</h3>
      <p className="mt-1 text-sm text-slate-500">
        원문과 대조하면서 매핑이 맞는지 확인하세요. 빨간 표시 항목은 자동 분류가 확실하지 않은 항목입니다.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="text-sm text-slate-600">
          업체명{" "}
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="ml-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="업체 이름"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={vatIncluded}
            onChange={(e) => setVatIncluded(e.target.checked)}
          />
          부가세 포함
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            className={`grid grid-cols-1 items-center gap-2 rounded-lg border p-3 md:grid-cols-[1fr_140px_190px_90px_32px] ${
              it.confidence === "low"
                ? "border-red-200 bg-red-50/40"
                : "border-slate-100 bg-slate-50/50"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{it.rawText}</p>
              {it.detail && <p className="text-xs text-slate-500">{it.detail}</p>}
              {it.note && <p className="mt-0.5 text-xs text-red-500">⚠ {it.note}</p>}
            </div>
            <input
              type="number"
              min={0}
              value={it.amount || ""}
              onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
              placeholder="금액(원)"
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm focus:border-slate-500 focus:outline-none"
            />
            <select
              value={it.categoryKey}
              onChange={(e) => updateItem(i, { categoryKey: e.target.value })}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
              <option value={EXCLUDE}>제외 (비교 대상 아님)</option>
            </select>
            <div className="text-right">{confidenceBadge(it.confidence)}</div>
            <button
              onClick={() => removeItem(i)}
              className="text-slate-300 transition hover:text-red-500"
              title="항목 삭제"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          반영 합계 <b className="text-slate-900">{formatKRW(includedSum)}</b>원
          {initial.totalOnDocument !== null && (
            <span className={mismatch ? "ml-2 font-medium text-red-600" : "ml-2 text-slate-400"}>
              · 견적서 표기 총액 {formatKRW(initial.totalOnDocument)}원
              {mismatch && " — 차이가 있어요, 항목을 확인하세요"}
            </span>
          )}
        </div>
        <button
          onClick={confirm}
          disabled={!vendorName.trim() || items.length === 0 || saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "등록 중…" : "확정하고 업체 등록"}
        </button>
      </div>
    </div>
  );
}
