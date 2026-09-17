"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, ItemStatus, Vendor } from "@/lib/types";
import { formatKRW } from "@/lib/calc";

interface Row {
  name: string;
  amount: number;
  isTemplate: boolean;
}

// 공정별 입력 초안: 기본 세부항목 행 + 저장된 커스텀 행
function buildDrafts(vendor: Vendor | null, categories: Category[]) {
  const map = new Map<number, Row[]>();
  for (const c of categories) {
    const saved = vendor?.lineItems.filter((li) => li.categoryId === c.id) ?? [];
    const savedNames = new Set(saved.map((s) => s.name));
    const rows: Row[] = c.templates.map((t) => ({
      name: t.name,
      amount: saved.find((s) => s.name === t.name)?.amount ?? 0,
      isTemplate: true,
    }));
    for (const s of saved) {
      if (!c.templates.some((t) => t.name === s.name)) {
        rows.push({ name: s.name, amount: s.amount, isTemplate: false });
      }
    }
    void savedNames;
    map.set(c.id, rows);
  }
  return map;
}

function buildStatuses(vendor: Vendor | null, categories: Category[]) {
  const map = new Map<number, ItemStatus>();
  for (const c of categories) {
    const item = vendor?.items.find((i) => i.categoryId === c.id);
    map.set(c.id, (item?.status as ItemStatus) ?? "UNKNOWN");
  }
  return map;
}

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
  const [drafts, setDrafts] = useState<Map<number, Row[]>>(new Map());
  const [statuses, setStatuses] = useState<Map<number, ItemStatus>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId]
  );

  useEffect(() => {
    setDrafts(buildDrafts(selected, categories));
    setStatuses(buildStatuses(selected, categories));
    setSavedAt(null);
  }, [selected, categories]);

  const setRow = (categoryId: number, index: number, patch: Partial<Row>) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const rows = [...(next.get(categoryId) ?? [])];
      rows[index] = { ...rows[index], ...patch };
      next.set(categoryId, rows);
      return next;
    });
    setSavedAt(null);
  };

  const addRow = (categoryId: number) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(categoryId, [
        ...(next.get(categoryId) ?? []),
        { name: "", amount: 0, isTemplate: false },
      ]);
      return next;
    });
  };

  const removeRow = (categoryId: number, index: number) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const rows = [...(next.get(categoryId) ?? [])];
      rows.splice(index, 1);
      next.set(categoryId, rows);
      return next;
    });
    setSavedAt(null);
  };

  const setStatus = (categoryId: number, status: ItemStatus) => {
    setStatuses((prev) => new Map(prev).set(categoryId, status));
    setSavedAt(null);
  };

  const subtotal = (categoryId: number) =>
    (drafts.get(categoryId) ?? []).reduce((a, r) => a + r.amount, 0);
  const total = categories.reduce((a, c) => a + subtotal(c.id), 0);

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

  const deleteCategory = async (id: number, name: string) => {
    const affected = vendors.reduce(
      (n, v) => n + v.lineItems.filter((li) => li.categoryId === id).length,
      0
    );
    const warning =
      affected > 0
        ? `"${name}" 공정을 삭제할까요?\n이 공정에 입력된 세부항목 ${affected}개도 함께 삭제됩니다.`
        : `"${name}" 공정을 삭제할까요?`;
    if (!confirm(warning)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
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
    const lineItems = categories.flatMap((c) =>
      (drafts.get(c.id) ?? [])
        .filter((r) => r.name.trim() && r.amount > 0)
        .map((r) => ({ categoryId: c.id, name: r.name.trim(), amount: r.amount }))
    );
    const statusItems = categories
      .filter((c) => subtotal(c.id) === 0)
      .map((c) => ({ categoryId: c.id, status: statuses.get(c.id) ?? "UNKNOWN" }));

    await fetch(`/api/vendors/${selected.id}/line-items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lineItems }),
    });
    await fetch(`/api/vendors/${selected.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: statusItems }),
    });
    await onChanged();
    setSaving(false);
    setSavedAt(Date.now());
  };

  const STATUS_CHIPS: { value: ItemStatus; label: string }[] = [
    { value: "UNKNOWN", label: "확인 필요" },
    { value: "EXCLUDED", label: "미포함" },
    { value: "BUNDLED", label: "다른 공정에 묶임" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* 사이드바 */}
      <aside className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">업체</h2>
          <ul className="space-y-1">
            {[...vendors].sort((a, b) => a.name.localeCompare(b.name, "ko")).map((v) => (
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
          <h2 className="mb-3 text-sm font-semibold text-slate-700">공정 관리</h2>
          <ul className="mb-3 space-y-0.5">
            {categories.map((c) => (
              <li
                key={c.id}
                className="group flex items-center justify-between rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => deleteCategory(c.id, c.name)}
                  className="rounded p-0.5 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  title="공정 삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
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

      {/* 견적 입력 */}
      {selected ? (
        <section className="space-y-4">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <label className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={selected.vatIncluded} onChange={toggleVat} />
                부가세 포함 견적
              </label>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">입력 합계</p>
                <p className="text-xl font-bold text-slate-900">{formatKRW(total)}원</p>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
              {savedAt && <span className="text-xs font-medium text-emerald-600">저장됨 ✓</span>}
            </div>
          </div>

          {categories.map((c) => {
            const rows = drafts.get(c.id) ?? [];
            const sub = subtotal(c.id);
            const status = statuses.get(c.id) ?? "UNKNOWN";
            return (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">{c.name}</h3>
                  {sub > 0 ? (
                    <span className="text-base font-bold text-slate-900">{formatKRW(sub)}원</span>
                  ) : (
                    <div className="flex gap-1">
                      {STATUS_CHIPS.map((chip) => (
                        <button
                          key={chip.value}
                          onClick={() => setStatus(c.id, chip.value)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            status === chip.value
                              ? chip.value === "EXCLUDED"
                                ? "bg-red-100 text-red-700"
                                : chip.value === "BUNDLED"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {row.isTemplate ? (
                        <span className="w-44 shrink-0 text-sm text-slate-600">{row.name}</span>
                      ) : (
                        <input
                          value={row.name}
                          onChange={(e) => setRow(c.id, i, { name: e.target.value })}
                          placeholder="세부항목 이름"
                          className="w-44 shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={row.amount || ""}
                        onChange={(e) => setRow(c.id, i, { amount: Number(e.target.value) })}
                        placeholder="금액(원)"
                        className="w-36 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-sm focus:border-slate-500 focus:outline-none"
                      />
                      {!row.isTemplate && (
                        <button
                          onClick={() => removeRow(c.id, i)}
                          className="text-slate-300 transition hover:text-red-500"
                          title="행 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addRow(c.id)}
                  className="mt-2 text-sm font-medium text-slate-400 transition hover:text-slate-700"
                >
                  + 세부항목 추가
                </button>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          <p>왼쪽에서 업체를 추가하고 공정별 견적을 입력하세요.</p>
          <p className="mt-2 text-xs text-slate-400">
            직접 입력이 번거로우면 <b>붙여넣기</b>(견적서 텍스트 복사, 무료)나{" "}
            <b>AI 파싱</b>(파일 업로드, API 키 필요)으로 자동으로 채울 수도 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
