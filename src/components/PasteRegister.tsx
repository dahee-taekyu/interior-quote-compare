"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { ruleParse } from "@/lib/rule-parse";
import ReviewPanel, { EXCLUDE, type ReviewData } from "./ReviewPanel";

const JSON_EXAMPLE = `{
  "vendorName": "OO인테리어",
  "vatIncluded": true,
  "totalOnDocument": 42000000,
  "items": [
    {
      "rawText": "샤시공사(LX하우시스) 9,500,000",
      "detail": "이중창 교체",
      "amount": 9500000,
      "categoryKey": "windows",
      "confidence": "high",
      "note": null
    }
  ]
}`;

/** 견적서 텍스트 붙여넣기(규칙 기반, 무료) 또는 CLI AI가 만든 JSON 붙여넣기로 등록 */
export default function PasteRegister({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const validKeys = new Set(categories.map((c) => c.key));

  const analyze = () => {
    setError(null);
    setSavedMessage(null);
    const trimmed = text.trim();
    if (!trimmed) return;

    // JSON이면 (CLI AI 출력 등) 그대로 받아들이고, 아니면 규칙 기반 파싱
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed.items)) {
          setError("JSON에 items 배열이 없습니다. 아래 형식 안내를 참고하세요.");
          return;
        }
        setReview({
          vendorName: typeof parsed.vendorName === "string" ? parsed.vendorName : "",
          vatIncluded: parsed.vatIncluded !== false,
          totalOnDocument:
            typeof parsed.totalOnDocument === "number" ? parsed.totalOnDocument : null,
          items: parsed.items.map(
            (it: {
              rawText?: string;
              detail?: string | null;
              amount?: number | null;
              categoryKey?: string | null;
              confidence?: string;
              note?: string | null;
            }) => ({
              rawText: String(it.rawText ?? ""),
              detail: it.detail ?? "",
              amount: typeof it.amount === "number" ? it.amount : 0,
              categoryKey:
                it.categoryKey && validKeys.has(it.categoryKey)
                  ? it.categoryKey
                  : validKeys.has("etc")
                    ? "etc"
                    : EXCLUDE,
              confidence: ["high", "medium", "low"].includes(it.confidence ?? "")
                ? (it.confidence as "high" | "medium" | "low")
                : "medium",
              note:
                it.categoryKey && !validKeys.has(it.categoryKey)
                  ? `알 수 없는 공정 key "${it.categoryKey}" — 직접 선택해주세요`
                  : (it.note ?? null),
            })
          ),
        });
        return;
      } catch {
        setError("JSON 해석에 실패했습니다. 형식을 확인해주세요.");
        return;
      }
    }

    const parsed = ruleParse(trimmed);
    if (parsed.items.length === 0) {
      setError(
        "금액이 있는 항목을 찾지 못했습니다. 견적서의 항목·금액 부분을 그대로 붙여넣었는지 확인해주세요."
      );
      return;
    }
    setReview({
      vendorName: parsed.vendorName ?? "",
      vatIncluded: parsed.vatIncluded ?? true,
      totalOnDocument: parsed.totalOnDocument,
      items: parsed.items.map((it) => ({
        rawText: it.rawText,
        detail: it.detail ?? "",
        amount: it.amount ?? 0,
        categoryKey: it.categoryKey ?? (validKeys.has("etc") ? "etc" : EXCLUDE),
        confidence: it.confidence,
        note:
          it.categoryKey === null
            ? "표준 공정에 없어 '기타'로 분류했습니다 — 확인해주세요"
            : it.note,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">붙여넣기로 등록</h2>
        <p className="mt-1 text-sm text-slate-500">
          견적서 PDF에서 항목·금액 부분을 복사해 붙여넣으면 키워드 사전으로 공정을 자동 분류합니다.
          AI를 쓰지 않아 무료이고, 결과는 검수 화면에서 수정할 수 있습니다.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"예)\n철거 및 폐기물처리  1식  1,800,000\n샤시공사(이중창)  1식  9,500,000\n욕실공사  1식  3,900,000\n합계  15,200,000\n부가세 포함"}
          className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={analyze}
            disabled={!text.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            분석
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {savedMessage && <p className="text-sm text-emerald-700">{savedMessage}</p>}
        </div>

        <details className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium">
            CLI AI(Claude Code 등)로 파싱해서 붙여넣기 — JSON 형식 안내
          </summary>
          <p className="mt-2">
            견적서 파일을 CLI AI에 주고 아래 형식의 JSON으로 변환을 요청한 뒤, 결과를 이 입력창에
            붙여넣으면 검수 화면으로 바로 이어집니다. <code>categoryKey</code>는{" "}
            {categories.map((c) => c.key).join(", ")} 중 하나이거나 null입니다.
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
            {JSON_EXAMPLE}
          </pre>
        </details>
      </div>

      {review && (
        <ReviewPanel
          categories={categories}
          initial={review}
          onChanged={onChanged}
          onConfirmed={(msg) => {
            setReview(null);
            setText("");
            setSavedMessage(msg);
          }}
        />
      )}
    </div>
  );
}
