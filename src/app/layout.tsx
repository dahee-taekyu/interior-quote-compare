import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "인테리어 견적 비교",
  description: "업체별 인테리어 견적을 표준 공사 기준으로 정리하고, 공정·세부항목·총액을 비교합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
