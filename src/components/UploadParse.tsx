"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import type { ParsedQuote } from "@/lib/parse-schema";
import ReviewPanel, { EXCLUDE, type ReviewData } from "./ReviewPanel";

/** 견적서 파일(PDF/이미지)을 AI로 파싱해서 등록 — 선택 기능, API 키 필요 */
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
  const [review, setReview] = useState<ReviewData | null>(null);
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
      setReview({
        vendorName: parsed.vendorName ?? "",
        vatIncluded: parsed.vatIncluded ?? true,
        totalOnDocument: parsed.totalOnDocument,
        items: parsed.items.map((it) => ({
          rawText: it.rawText,
          detail: it.detail ?? "",
          amount: it.amount ?? 0,
          categoryKey: it.categoryKey ?? EXCLUDE,
          confidence: it.confidence,
          note: it.note,
        })),
      });
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI 파싱 (선택 기능)</h2>
          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">
            API 키 필요
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          견적서 PDF나 사진을 올리면 Claude가 항목을 추출해서 표준 공정에 매핑합니다. 서버에{" "}
          <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY</code>가 설정된 경우에만
          동작합니다. 키가 없다면 <b>붙여넣기 등록</b> 탭을 이용하세요 (무료).
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

      {review && (
        <ReviewPanel
          categories={categories}
          initial={review}
          onChanged={onChanged}
          onConfirmed={(msg) => {
            setReview(null);
            setFile(null);
            setSavedMessage(msg);
          }}
        />
      )}
    </div>
  );
}
