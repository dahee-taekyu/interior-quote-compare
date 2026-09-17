"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, ItemDraft, ItemStatus, Vendor } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { formatKRW } from "@/lib/calc";

const STATUS_OPTIONS: ItemStatus[] = ["INCLUDED", "EXCLUDED", "BUNDLED", "UNKNOWN"];

export default function VendorEditor({
  categories,
  vendors,
  onChanged,
}: {
  categories: Category[];
  vendors: Vendor[];
  onChanged: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(vendors[0]?.id ?? null);
  const [newVendorName, setNewVendorName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [drafts, setDrafts] = useState<ItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId]
  );

  // 선택 업체가 바뀌면 draft를 서버 데이터로 초기화
  useEffect(() => {
    if (!selected) {
      setDrafts([]);
      return;
    }
    setDrafts(
      categories.map((c) => {
        const item = selected.items.find((i) => i.categoryId === c.id);
        return {
          categoryId: c.id,
          status: (item?.status ?? "UNKNOWN") as ItemStatus,
          amount: item?.amount ?? 0,
          detail: item?.detail ?? "",
          memo: item?.memo ?? "",
        };
      })
    );
    setSavedAt(null);
  }, [selected, categories]);

  const updateDraft = (categoryId: number, patch: Partial<ItemDraft>) => {
    setDrafts((ds) =>
      ds.map((d) => (d.categoryId === categoryId ? { ...d, ...patch } : d))
    );
  };

  const addVendor = async () => {
    const name = newVendorName.trim();
    if (!name) return;
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const vendor = await res.json();
    setNewVendorName("");
    await onChanged();
    setSelectedId(vendor.id);
  };

  const deleteVendor = async (id: number) => {
    if (!confirm("이 업체와 견적 데이터를 삭제할까요?")) return;
    await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await onChanged();
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNewCategoryName("");
    await onChanged();
  };

  const toggleVat = async () => {
    if (!selected) return;
    await fetch(`/api/vendors/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vatIncluded: !selected.vatIncluded }),
    });
    await onChanged();
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/vendors/${selected.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: drafts }),
    });
    await onChanged();
    setSaving(false);
    setSavedAt(Date.now());
  };

  const draftTotal = drafts
    .filter((d) => d.status === "INCLUDED")
    .reduce((a, d) => a + d.amount, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* 업체 목록 */}
      <aside className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">업체</h2>
          <ul className="space-y-1">
            {vendors.map((v) => (
              <li key={v.id} className="group flex items-center gap-1">
                <button
                  onClick={() => setSelectedId(v.id)}
                  className={`flex-1 rounded-md px-3 py-2 text-left text-sm transition ${
                    selectedId === v.id
                      ? "bg-slate-900 font-medium text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {v.name}
                </button>
                <button
                  onClick={() => deleteVendor(v.id)}
                  className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  title="삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-1.5">
            <input
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVendor()}
              placeholder="업체 이름"
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              onClick={addVendor}
              className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              추가
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">공정 추가</h2>
          <div className="flex gap-1.5">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="예: 붙박이장"
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              onClick={addCategory}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              추가
            </button>
          </div>
        </div>
      </aside>

      {/* 견적 입력 폼 */}
      {selected ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{selected.name} 견적</h2>
              <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={selected.vatIncluded}
                  onChange={toggleVat}
                />
                부가세 포함 견적
              </label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                포함 합계 <b className="text-slate-900">{formatKRW(draftTotal)}</b>원
              </span>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
              {savedAt && <span className="text-xs text-emerald-600">저장됨</span>}
            </div>
          </div>

          <div className="space-y-2">
            {categories.map((c) => {
              const d = drafts.find((x) => x.categoryId === c.id);
              if (!d) return null;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 md:grid-cols-[180px_150px_130px_1fr]"
                >
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  <select
                    value={d.status}
                    onChange={(e) =>
                      updateDraft(c.id, { status: e.target.value as ItemStatus })
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={d.amount || ""}
                    onChange={(e) => updateDraft(c.id, { amount: Number(e.target.value) })}
                    disabled={d.status !== "INCLUDED"}
                    placeholder="금액(원)"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <input
                    value={d.detail}
                    onChange={(e) => updateDraft(c.id, { detail: e.target.value })}
                    placeholder="포함 내역·자재 스펙 (예: LX지인 마루, 국산 도기)"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          왼쪽에서 업체를 추가하거나 선택하세요.
        </div>
      )}
    </div>
  );
}
