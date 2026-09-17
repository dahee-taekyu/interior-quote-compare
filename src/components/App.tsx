"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, Vendor } from "@/lib/types";
import ComparisonMatrix from "./ComparisonMatrix";
import VendorEditor from "./VendorEditor";
import CostChart from "./CostChart";
import UploadParse from "./UploadParse";

type Tab = "matrix" | "upload" | "edit" | "chart";

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tab, setTab] = useState<Tab>("matrix");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cRes, vRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/vendors"),
    ]);
    setCategories(await cRes.json());
    setVendors(await vRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "matrix", label: "비교 매트릭스" },
    { key: "upload", label: "견적서 업로드" },
    { key: "edit", label: "견적 입력" },
    { key: "chart", label: "비용 구성 차트" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">인테리어 견적 비교</h1>
        <p className="mt-1 text-sm text-slate-500">
          업체별 견적을 표준 공정 기준으로 정리하고, 누락 공정을 타 업체 평균가로 채운{" "}
          <span className="font-medium text-slate-700">동일 조건 환산 총액</span>으로 비교합니다.
        </p>
      </header>

      <nav className="mb-6 flex gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : tab === "matrix" ? (
        <ComparisonMatrix categories={categories} vendors={vendors} />
      ) : tab === "upload" ? (
        <UploadParse categories={categories} onChanged={reload} />
      ) : tab === "edit" ? (
        <VendorEditor categories={categories} vendors={vendors} onChanged={reload} />
      ) : (
        <CostChart categories={categories} vendors={vendors} />
      )}
    </div>
  );
}
