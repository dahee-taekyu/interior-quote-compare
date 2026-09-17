import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인테리어 견적 비교",
  description: "업체별 인테리어 견적을 표준 공정 기준으로 비교하고, 누락 항목을 보정한 동일 조건 총액을 계산합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
