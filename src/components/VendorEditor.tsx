"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, ItemStatus, Vendor } from "@/lib/types";
import { applyVendorMeta, formatKRW } from "@/lib/calc";

interface Row {
  name: string;
  spec: string;
  unit: string;
  qty: string; // 입력 편의를 위해 문자열로 관리
  unitPrice: string;
  amount: number;
  isOption: boolean;
  isTemplate: boolean;
}

function toRow(partial: Partial<Row>): Row {
  return {
    name: "",
    spec: "",
    unit: "",
    qty: "",
    unitPrice: "",
    amount: 0,
    isOption: false,
    isTemplate: false,
    ...partial,
  };
}

// 공정별 입력 초안: 기본 세부항목 행 + 저장된 커스텀 행
function buildDrafts(vendor: Vendor | null, categories: Category[]) {
  const map = new Map<number, Row[]>();
  for (const c of categories) {
    const saved = vendor?.lineItems.filter((li) => li.categoryId === c.id) ?? [];
    const rows: Row[] = c.templates.map((t) => {
      const s = saved.find((x) => x.name === t.name);
      return toRow({
        name: t.name,
        spec: s?.spec ?? "",
        unit: s?.unit ?? "",
        qty: s?.qty != null ? String(s.qty) : "",
        unitPrice: s?.unitPrice != null ? String(s.unitPrice) : "",
        amount: s?.amount ?? 0,
        isOption: s?.isOption ?? false,
        isTemplate: true,
      });
    });
    for (const s of saved) {
      if (!c.templates.some((t) => t.name === s.name)) {
        rows.push(
          toRow({
            name: s.name,
            spec: s.spec ?? "",
            unit: s.unit ?? "",
            qty: s.qty != null ? String(s.qty) : "",
            unitPrice: s.unitPrice != null ? String(s.unitPrice) : "",
            amount: s.amount,
            isOption: s.isOption,
          })
        );
      }
    }
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

  // 업체를 "전환"할 때만 초안을 서버 데이터로 재구성한다.
  // selected 객체 자체를 의존성으로 쓰면 메타 저장 등으로 목록이 리로드될 때마다
  // 작성 중인 세부항목 수정분이 서버 값으로 되돌아간다.
  useEffect(() => {
    setDrafts(buildDrafts(selected, categories));
    setStatuses(buildStatuses(selected, categories));
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, categories]);

  const setRow = (categoryId: number, index: number, patch: Partial<Row>) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const rows = [...(next.get(categoryId) ?? [])];
      const merged = { ...rows[index], ...patch };
      // 단가×수량이 둘 다 있으면 금액 자동 계산
      const qty = Number(merged.qty);
      const unitPrice = Number(merged.unitPrice);
      if (
        (patch.qty !== undefined || patch.unitPrice !== undefined) &&
        qty > 0 &&
        unitPrice > 0
      ) {
        merged.amount = Math.round(qty * unitPrice);
      }
      rows[index] = merged;
      next.set(categoryId, rows);
      return next;
    });
    setSavedAt(null);
  };

  const addRow = (categoryId: number) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(categoryId, [...(next.get(categoryId) ?? []), toRow({})]);
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
    (drafts.get(categoryId) ?? [])
      .filter((r) => !r.isOption)
      .reduce((a, r) => a + r.amount, 0);
  const allSubtotal = categories.reduce((a, c) => a + subtotal(c.id), 0);
  const totals = selected ? applyVendorMeta(selected, allSubtotal) : null;

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

  const patchVendor = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    // 값이 실제로 바뀐 경우에만 저장 (blur마다 불필요한 리로드 방지)
    const current: Record<string, unknown> = {
      pyeong: selected.pyeong,
      overheadPercent: selected.overheadPercent,
      overheadLabel: selected.overheadLabel,
      adjustment: selected.adjustment,
      periodDays: selected.periodDays,
      vatIncluded: selected.vatIncluded,
    };
    const changed = Object.entries(patch).some(([k, v]) => {
      const before = current[k];
      if (typeof before === "number" || before === null || before === undefined) {
        const num = v === "" || v === null || v === undefined ? null : Number(v);
        return (before ?? null) !== (num ?? null) && !(before === 0 && num === null);
      }
      return before !== v;
    });
    if (!changed) return;
    await fetch(`/api/vendors/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await onChanged();
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const lineItems = categories.flatMap((c) =>
      (drafts.get(c.id) ?? [])
        .filter((r) => r.name.trim() && (r.amount > 0 || r.isOption))
        .map((r) => ({
          categoryId: c.id,
          name: r.name.trim(),
          spec: r.spec,
          unit: r.unit,
          qty: r.qty ? Number(r.qty) : undefined,
          unitPrice: r.unitPrice ? Number(r.unitPrice) : undefined,
          amount: r.amount,
          isOption: r.isOption,
        }))
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

  const metaInput =
    "w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm focus:border-slate-500 focus:outline-none";

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
              placeholder="예: 홈네트워크"
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
        <section className="min-w-0 space-y-4">
          {/* 상단 저장 바 + 견적서 메타 */}
          <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <div className="flex items-center gap-4">
                {totals && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      공급가 {formatKRW(totals.subtotal)}
                      {totals.overhead > 0 &&
                        ` + ${selected.overheadLabel ?? "이윤"} ${formatKRW(totals.overhead)}`}
                      {totals.vat > 0 && ` + VAT ${formatKRW(totals.vat)}`}
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      총 {formatKRW(totals.grandTotal)}원
                    </p>
                  </div>
                )}
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
            {/* key로 업체 전환 시 비제어 입력(defaultValue)을 새 값으로 리마운트 */}
            <div
              key={selected.id}
              className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600"
            >
              <label className="flex items-center gap-1.5">
                평형
                <input
                  type="number"
                  defaultValue={selected.pyeong ?? ""}
                  onBlur={(e) => patchVendor({ pyeong: e.target.value })}
                  className={metaInput}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  defaultValue={selected.overheadLabel ?? ""}
                  onBlur={(e) => patchVendor({ overheadLabel: e.target.value })}
                  placeholder="이윤/공과잡비"
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                />
                <input
                  type="number"
                  step={0.5}
                  defaultValue={selected.overheadPercent ?? ""}
                  onBlur={(e) => patchVendor({ overheadPercent: e.target.value })}
                  className={metaInput}
                />
                %
              </label>
              <label className="flex items-center gap-1.5">
                단수조정
                <input
                  type="number"
                  defaultValue={selected.adjustment || ""}
                  onBlur={(e) => patchVendor({ adjustment: e.target.value })}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm focus:border-slate-500 focus:outline-none"
                />
                원
              </label>
              <label className="flex items-center gap-1.5">
                공사기간
                <input
                  type="number"
                  defaultValue={selected.periodDays ?? ""}
                  onBlur={(e) => patchVendor({ periodDays: e.target.value })}
                  className={metaInput}
                />
                일
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={selected.vatIncluded}
                  onChange={(e) => patchVendor({ vatIncluded: e.target.checked })}
                />
                항목 금액에 부가세 포함
              </label>
            </div>
          </div>

          {/* 열 헤더 안내 */}
          <div className="hidden gap-2 px-6 text-[11px] font-medium text-slate-400 xl:grid xl:grid-cols-[170px_1fr_64px_64px_90px_100px_44px_24px]">
            <span>품명</span>
            <span>규격</span>
            <span className="text-right">단위</span>
            <span className="text-right">수량</span>
            <span className="text-right">단가</span>
            <span className="text-right">금액</span>
            <span className="text-center">옵션</span>
            <span />
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
                  {rows.map((row, i) => {
                    const cell =
                      "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50";
                    return (
                      <div
                        key={i}
                        className={`grid grid-cols-2 items-center gap-2 xl:grid-cols-[170px_1fr_64px_64px_90px_100px_44px_24px] ${
                          row.isOption ? "opacity-60" : ""
                        }`}
                      >
                        {row.isTemplate ? (
                          <span className="truncate text-sm text-slate-600" title={row.name}>
                            {row.name}
                          </span>
                        ) : (
                          <input
                            value={row.name}
                            onChange={(e) => setRow(c.id, i, { name: e.target.value })}
                            placeholder="품명"
                            className={cell}
                          />
                        )}
                        <input
                          value={row.spec}
                          onChange={(e) => setRow(c.id, i, { spec: e.target.value })}
                          placeholder="규격·브랜드 (예: LX장판 2.2T)"
                          className={cell}
                        />
                        <input
                          value={row.unit}
                          onChange={(e) => setRow(c.id, i, { unit: e.target.value })}
                          placeholder="단위"
                          className={`${cell} text-right`}
                        />
                        <input
                          type="number"
                          min={0}
                          value={row.qty}
                          onChange={(e) => setRow(c.id, i, { qty: e.target.value })}
                          placeholder="수량"
                          className={`${cell} text-right`}
                        />
                        <input
                          type="number"
                          min={0}
                          value={row.unitPrice}
                          onChange={(e) => setRow(c.id, i, { unitPrice: e.target.value })}
                          placeholder="단가"
                          className={`${cell} text-right`}
                        />
                        <input
                          type="number"
                          min={0}
                          value={row.amount || ""}
                          onChange={(e) => setRow(c.id, i, { amount: Number(e.target.value) })}
                          placeholder="금액"
                          className={`${cell} text-right font-medium`}
                        />
                        <label
                          className="flex items-center justify-center"
                          title="미정·별도·직접구매 등 합계 제외"
                        >
                          <input
                            type="checkbox"
                            checked={row.isOption}
                            onChange={(e) => setRow(c.id, i, { isOption: e.target.checked })}
                          />
                        </label>
                        {!row.isTemplate ? (
                          <button
                            onClick={() => removeRow(c.id, i)}
                            className="text-slate-300 transition hover:text-red-500"
                            title="행 삭제"
                          >
                            ✕
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
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
