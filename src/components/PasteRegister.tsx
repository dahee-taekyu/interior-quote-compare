"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";
import { ruleParse } from "@/lib/rule-parse";
import ReviewPanel, { EXCLUDE, type ReviewData } from "./ReviewPanel";

/** 사용자가 자기 AI(ChatGPT·Claude·Gemini 등)에 견적서와 함께 붙여넣을 프롬프트 */
function buildAiPrompt(categories: Category[]): string {
  const categoryList = categories.map((c) => `- ${c.key}: ${c.name}`).join("\n");
  return `당신은 한국 인테리어 견적서 분석 전문가입니다. 함께 제공하는 견적서(파일 또는 텍스트)를 읽고 모든 항목을 추출한 뒤, 아래 표준 공정 체계에 매핑해서 JSON으로만 답하세요.

표준 공정 목록 (categoryKey: 이름):
${categoryList}

규칙:
- 견적서의 모든 금액 항목을 빠짐없이 추출하고, rawText에는 견적서에 적힌 표현을 그대로 보존합니다.
- 시공사마다 공정 표현이 다릅니다 (예: 샤시/샷시/창호 → windows, 도장/페인트 → wallpaper, UBR/욕실공사 → bathroom). 의미 기준으로 매핑하세요.
- 표준 공정에 명확히 해당하지 않는 시공 항목(붙박이장, 에어컨 등)은 "etc"로, 견적 항목이 아닌 것(할인·조정액 등)은 categoryKey를 null로 둡니다.
- 표현이 모호하거나 여러 공정에 걸치면 confidence를 "low"로 하고 note에 확인할 점을 적습니다.
- 금액은 원 단위 숫자로 변환합니다 ("1,200,000" → 1200000, "120만" → 1200000).
- 부가세 포함 여부(vatIncluded)와 견적서에 적힌 총액(totalOnDocument)도 찾고, 명시가 없으면 null.
- 소계·합계 줄은 items에 넣지 않습니다.

출력은 아래 형식의 JSON 하나만, 코드블록이나 설명 없이:
{
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
}

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
  const [copied, setCopied] = useState(false);

  const validKeys = new Set(categories.map((c) => c.key));
  const aiPrompt = buildAiPrompt(categories);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 사용자가 pre 블록에서 직접 복사
    }
  };

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
            내 AI로 파싱하기 — 프롬프트 복사해서 쓰세요 (ChatGPT·Claude·Gemini 등)
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>
              아래 <b>프롬프트 복사</b> 버튼을 누르세요.
            </li>
            <li>
              쓰시는 AI 채팅에 프롬프트를 붙여넣고, <b>견적서 파일(또는 텍스트)을 함께</b>{" "}
              첨부해서 보내세요.
            </li>
            <li>AI가 돌려준 JSON을 통째로 복사해서 위 입력창에 붙여넣고 분석을 누르세요.</li>
          </ol>
          <button
            onClick={copyPrompt}
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            {copied ? "복사됨 ✓" : "프롬프트 복사"}
          </button>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
            {aiPrompt}
          </pre>
          <p className="mt-2 text-xs text-slate-400">
            공정을 추가·삭제하면 프롬프트의 공정 목록도 자동으로 반영됩니다.
          </p>
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
