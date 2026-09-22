"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, Vendor } from "@/lib/types";
import CompareOverview from "./CompareOverview";
import CategoryCompare from "./CategoryCompare";
import VendorEditor from "./VendorEditor";
import CostChart from "./CostChart";
import UploadParse from "./UploadParse";
import PasteRegister from "./PasteRegister";

type View =
  | { kind: "overview" }
  | { kind: "chart" }
  | { kind: "category"; id: number }
  | { kind: "edit" }
  | { kind: "paste" }
  | { kind: "upload" };

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cRes, vRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/vendors"),
    ]);
    setCategories(await cRes.json());
    const vendorList: Vendor[] = await vRes.json();
    setVendors(vendorList);
    // 첫 방문(데이터 없음)은 입력부터, 데이터가 있으면 전체 비교부터
    setView((prev) => prev ?? { kind: vendorList.length === 0 ? "edit" : "overview" });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const navButton = (
    label: string,
    active: boolean,
    onClick: () => void,
    options?: { small?: boolean }
  ) => (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 text-left transition ${
        options?.small ? "py-1.5 text-[13px]" : "py-2 text-sm font-medium"
      } ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  const v = view ?? { kind: "overview" as const };

  return (
    <div className="flex min-h-screen">
      {/* 좌측 내비게이션 */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 px-4 py-6">
        <h1 className="px-3 text-base font-bold text-slate-900">인테리어 견적 비교</h1>
        <p className="mt-1 px-3 text-[11px] leading-relaxed text-slate-400">
          업체별 견적을 표준 공사 기준으로 정리해 비교합니다
        </p>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
          <div>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              비교
            </p>
            {navButton("전체 비교", v.kind === "overview", () => setView({ kind: "overview" }))}
            {navButton("비용 구성 차트", v.kind === "chart", () => setView({ kind: "chart" }))}
          </div>

          <div>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              공정별 비교
            </p>
            <div className="space-y-0.5">
              {categories.map((c) => (
                <div key={c.id}>
                  {navButton(
                    c.name,
                    v.kind === "category" && v.id === c.id,
                    () => setView({ kind: "category", id: c.id }),
                    { small: true }
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              등록
            </p>
            {navButton("견적 입력", v.kind === "edit", () => setView({ kind: "edit" }))}
            {navButton("붙여넣기", v.kind === "paste", () => setView({ kind: "paste" }))}
            {navButton("AI 파싱", v.kind === "upload", () => setView({ kind: "upload" }))}
          </div>
        </nav>

        <p className="px-3 text-[11px] text-slate-300">
          업체 {vendors.length} · 공정 {categories.length}
        </p>
      </aside>

      {/* 컨텐츠 영역 */}
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-7xl">
        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중…</p>
        ) : v.kind === "overview" ? (
          <CompareOverview
            categories={categories}
            vendors={vendors}
            onOpenCategory={(id) => setView({ kind: "category", id })}
          />
        ) : v.kind === "category" ? (
          (() => {
            const category = categories.find((c) => c.id === v.id);
            return category ? (
              <CategoryCompare category={category} vendors={vendors} />
            ) : null;
          })()
        ) : v.kind === "paste" ? (
          <PasteRegister categories={categories} onChanged={reload} />
        ) : v.kind === "upload" ? (
          <UploadParse categories={categories} onChanged={reload} />
        ) : v.kind === "edit" ? (
          <VendorEditor categories={categories} vendors={vendors} onChanged={reload} />
        ) : (
          <CostChart categories={categories} vendors={vendors} />
        )}
        </div>
      </main>
    </div>
  );
}
