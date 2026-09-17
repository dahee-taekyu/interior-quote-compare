"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, Vendor } from "@/lib/types";
import { formatKRW } from "@/lib/calc";

// 검증된 카테고리 팔레트 (고정 순서, 순환 금지) + '기타'는 중립 회색
const SERIES_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
];
const OTHER_COLOR = "#898781";
const MAX_SERIES = SERIES_COLORS.length;

export default function CostChart({
  categories,
  vendors,
}: {
  categories: Category[];
  vendors: Vendor[];
}) {
  const { data, seriesNames } = useMemo(() => {
    // 전체 비중 기준으로 공정 정렬 → 상위 7개 + 나머지는 '기타'로 접기
    const totals = categories.map((c) => ({
      c,
      total: vendors.reduce((sum, v) => {
        const item = v.items.find(
          (i) => i.categoryId === c.id && i.status === "INCLUDED"
        );
        return sum + (item?.amount ?? 0);
      }, 0),
    }));
    const active = totals.filter((t) => t.total > 0);
    active.sort((a, b) => b.total - a.total);
    const top = active.slice(0, MAX_SERIES);
    const rest = active.slice(MAX_SERIES);

    const rows = vendors.map((v) => {
      const row: Record<string, string | number> = { name: v.name };
      for (const { c } of top) {
        const item = v.items.find(
          (i) => i.categoryId === c.id && i.status === "INCLUDED"
        );
        row[c.name] = item?.amount ?? 0;
      }
      if (rest.length > 0) {
        row["기타"] = rest.reduce((sum, { c }) => {
          const item = v.items.find(
            (i) => i.categoryId === c.id && i.status === "INCLUDED"
          );
          return sum + (item?.amount ?? 0);
        }, 0);
      }
      return row;
    });

    const names = top.map((t) => t.c.name);
    if (rest.length > 0) names.push("기타");
    return { data: rows, seriesNames: names };
  }, [categories, vendors]);

  if (vendors.length === 0 || seriesNames.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        차트를 그리려면 견적 데이터가 필요합니다. <b>견적 입력</b> 탭에서 금액을 입력하세요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">업체별 비용 구성</h2>
      <p className="mb-4 text-xs text-slate-500">
        견적서에 &lsquo;포함&rsquo;으로 명시된 공정만 집계합니다. 비중이 낮은 공정은 &lsquo;기타&rsquo;로 묶입니다.
      </p>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#52514e" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "#898781" }}
              tickFormatter={(v: number) =>
                v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만` : String(v)
              }
            />
            <Tooltip
              formatter={(value) => `${formatKRW(Number(value ?? 0))}원`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span style={{ color: "#52514e" }}>{value}</span>}
            />
            {seriesNames.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="cost"
                fill={name === "기타" ? OTHER_COLOR : SERIES_COLORS[i]}
                stroke="#ffffff"
                strokeWidth={2}
                maxBarSize={72}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
