"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import type { ParsedQuote } from "@/lib/parse-schema";
import { formatKRW } from "@/lib/calc";

const EXCLUDE = "__exclude__";

interface ReviewItem {
  rawText: string;
  detail: string;
  amount: number;
  categoryKey: string; // 표준 공정 key 또는 EXCLUDE
  confidence: "high" | "medium" | "low";
  note: string | null;
}

export default function UploadParse({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [totalOnDocument, setTotalOnDocument] = useState<number | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const parse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setSavedMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "분석에 실패했습니다.");
        return;
      }
      const parsed = body as ParsedQuote;
      setVendorName(parsed.vendorName ?? "");
      setVatIncluded(parsed.vatIncluded ?? true);
      setTotalOnDocument(parsed.totalOnDocument);
      setItems(
        parsed.items.map((it) => ({
          rawText: it.rawText,
          detail: it.detail ?? "",
          amount: it.amount ?? 0,
          categoryKey: it.categoryKey ?? EXCLUDE,
          confidence: it.confidence,
          note: it.note,
        }))
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (index: number, patch: Partial<ReviewItem>) => {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === index ? { ...it, ...patch } : it)) : prev
    );
  };

  const includedSum = (items ?? [])
    .filter((it) => it.categoryKey !== EXCLUDE)
    .reduce((a, it) => a + it.amount, 0);
  const mismatch =
    totalOnDocument !== null && Math.abs(includedSum - totalOnDocument) > 1000;

  const confirm = async () => {
    if (!items || !vendorName.trim()) return;
    // 업체 생성
    const vRes = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: vendorName.trim(), vatIncluded }),
    });
    const vendor = await vRes.json();

    // 같은 공정에 매핑된 항목들을 합산해서 저장
    const byCategory = new Map<string, { amount: number; details: string[] }>();
    for (const it of items) {
      if (it.categoryKey === EXCLUDE) continue;
      const entry = byCategory.get(it.categoryKey) ?? { amount: 0, details: [] };
      entry.amount += it.amount;
      entry.details.push(it.detail ? `${it.rawText} (${it.detail})` : it.rawText);
      byCategory.set(it.categoryKey, entry);
    }

    const payload = categories
      .filter((c) => byCategory.has(c.key))
      .map((c) => {
        const entry = byCategory.get(c.key)!;
        return {
          categoryId: c.id,
          status: "INCLUDED",
          amount: entry.amount,
          detail: entry.details.join(" / "),
          memo: "견적서 업로드로 등록",
        };
      });

    await fetch(`/api/vendors/${vendor.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });

    await onChanged();
    setItems(null);
    setFile(null);
    setSavedMessage(
      `"${vendorName.trim()}" 업체가 등록되었습니다. 견적서에 없는 공정은 '확인 필요' 상태이니 견적 입력 탭에서 미포함 여부를 확정하세요.`
    );
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">견적서 업로드</h2>
        <p className="mt-1 text-sm text-slate-500">
          견적서 PDF나 사진을 올리면 AI가 항목을 추출해서 표준 공정에 매핑합니다.
          결과를 검토·수정한 뒤 확정하면 업체가 등록됩니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            onClick={parse}
            disabled={!file || parsing}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {parsing ? "분석 중… (1분 정도 걸릴 수 있어요)" : "AI로 분석"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {savedMessage && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {savedMessage}
          </p>
        )}
      </div>

      {items && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">분석 결과 검수</h3>
          <p className="mt-1 text-sm text-slate-500">
            원문과 대조하면서 매핑이 맞는지 확인하세요. 빨간 표시 항목은 AI가 확신하지 못한 항목입니다.
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
                className={`grid grid-cols-1 items-center gap-2 rounded-lg border p-3 md:grid-cols-[1fr_140px_190px_90px] ${
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
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              반영 합계 <b className="text-slate-900">{formatKRW(includedSum)}</b>원
              {totalOnDocument !== null && (
                <span className={mismatch ? "ml-2 font-medium text-red-600" : "ml-2 text-slate-400"}>
                  · 견적서 표기 총액 {formatKRW(totalOnDocument)}원
                  {mismatch && " — 차이가 있어요, 항목을 확인하세요"}
                </span>
              )}
            </div>
            <button
              onClick={confirm}
              disabled={!vendorName.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              확정하고 업체 등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
