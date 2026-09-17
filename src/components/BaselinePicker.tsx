"use client";

import { useEffect, useRef, useState } from "react";
import type { Vendor } from "@/lib/types";

/** 기준 업체 검색·선택 콤보박스 */
export default function BaselinePicker({
  vendors,
  baseline,
  onChoose,
}: {
  vendors: Vendor[];
  baseline: Vendor | null;
  onChoose: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sorted = [...vendors].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const matches = query.trim()
    ? sorted.filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()))
    : sorted;

  return (
    <div ref={rootRef} className="relative w-64">
      <label className="mb-1 block text-[11px] font-medium text-slate-400">기준 업체</label>
      <input
        value={open ? query : (baseline?.name ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="업체 검색…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">검색 결과 없음</li>
          ) : (
            matches.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => {
                    onChoose(v.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                    baseline?.id === v.id ? "font-semibold text-slate-900" : "text-slate-600"
                  }`}
                >
                  {v.name}
                  {baseline?.id === v.id && <span className="text-xs text-slate-400">현재 기준</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
