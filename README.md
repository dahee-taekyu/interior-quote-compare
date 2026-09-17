# 인테리어 견적 비교 (Interior Quote Compare)

업체마다 양식이 다른 인테리어 견적서를 **표준 공정 기준**으로 정리해서 비교하는 웹 앱.

총액만 보면 싸 보이는 업체가 사실은 빠진 공정이 많은 업체인 경우가 흔하다.
이 앱은 공정별 포함/누락 상태를 추적하고, 누락 공정을 타 업체 평균가로 채운
**동일 조건 환산 총액**을 계산해서 진짜 비교가 가능하게 한다.

## 주요 기능

- **견적서 업로드 (AI 파싱)** — 견적서 PDF/사진을 올리면 Claude가 항목·금액을 추출하고 표준 공정에 자동 매핑. 시공사마다 다른 표현(샤시/창호/창호공사 등)을 의미 기준으로 번역하고, 확신 못 하는 항목은 표시해서 사용자가 검수·수정 후 확정

- **표준 공정 체계** — 철거, 샷시, 설비, 전기, 목공, 타일, 욕실, 주방, 도배, 바닥, 청소, 관리비 12개 기본 공정 + 커스텀 공정 추가
- **공정 상태 4단계** — `포함 / 미포함 / 타 항목에 포함 / 확인 필요`로 구분해 "빠진 것"과 "다른 항목에 녹아 있는 것"을 분리
- **비교 매트릭스** — 행=공정, 열=업체. 공정별 최저가 하이라이트, 미포함(추가금 위험) 경고
- **동일 조건 환산 총액** — 누락·미확인 공정을 다른 업체들의 평균가로 보정한 총액으로 공정한 비교
- **비용 구성 차트** — 업체별 공정 비용 스택 바 차트

## 기술 스택

- **Next.js 15** (App Router) + **TypeScript** — 프론트엔드 + API Route Handlers
- **Prisma + SQLite** — 별도 인프라 없는 로컬 DB (Postgres 전환 용이)
- **Tailwind CSS 4**
- **Recharts**
- **Claude API** (`@anthropic-ai/sdk`) — 견적서 파싱 (structured outputs + Zod)

## 실행

```bash
npm install
cp .env.example .env   # 견적서 업로드 기능을 쓰려면 ANTHROPIC_API_KEY 입력
npm run db:setup       # DB 스키마 생성 + 기본 공정 시드
npm run dev
```

http://localhost:3000 에서 확인.

## 데이터 모델

```
Category  표준 공정 (시드 12개 + 커스텀)
Vendor    업체 (부가세 포함 여부 등)
QuoteItem 업체 × 공정 견적 항목
          status: INCLUDED | EXCLUDED | BUNDLED | UNKNOWN
          amount, detail(자재 스펙), memo
```

### 보정 총액 계산 로직 (`src/lib/calc.ts`)

- `rawTotal` = 포함(INCLUDED) 항목 금액 합계
- `adjustedTotal` = rawTotal + Σ(미포함·미확인 공정의 타 업체 평균가)
- 타 항목 포함(BUNDLED)은 이미 다른 공정 금액에 반영된 것으로 보고 보정하지 않음

## 로드맵

- [x] 견적서 PDF/이미지 업로드 → AI 파싱 (Claude API)
- [ ] JSON export / import
- [ ] 공유 링크
