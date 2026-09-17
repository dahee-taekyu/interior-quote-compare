import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { ParsedQuoteSchema } from "@/lib/parse-schema";

export const maxDuration = 300;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file이 필요합니다" }, { status: 400 });
  }
  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: "파일이 30MB를 초과합니다" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf";
  if (!isPdf && !IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `지원하지 않는 형식입니다: ${file.type}. PDF 또는 이미지(PNG/JPG/WEBP)를 올려주세요.` },
      { status: 400 }
    );
  }

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  const categoryList = categories.map((c) => `- ${c.key}: ${c.name}`).join("\n");

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
          data,
        },
      };

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "Anthropic API 키가 설정되지 않았습니다. .env에 ANTHROPIC_API_KEY를 넣고 서버를 재시작하세요." },
      { status: 500 }
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: `당신은 한국 인테리어 견적서 분석 전문가입니다. 견적서(PDF 또는 이미지)를 읽고 모든 항목을 추출한 뒤, 각 항목을 아래 표준 공정 체계에 매핑합니다.

표준 공정 목록 (key: 이름):
${categoryList}

규칙:
- 견적서의 모든 금액 항목을 빠짐없이 추출합니다. rawText에는 견적서에 적힌 표현을 그대로 보존합니다.
- 시공사마다 공정 표현이 다릅니다 (예: 샤시/창호/창호공사 → windows, 도장/페인트 → wallpaper 계열, UBR/욕실공사 → bathroom). 의미 기준으로 매핑하세요.
- 어느 표준 공정에도 명확히 해당하지 않는 시공 항목(예: 붙박이장, 에어컨, 커튼)은 "etc"(기타)로 매핑하고 note에 내용을 적습니다. 견적 항목이 아닌 것(할인, 조정액 등)만 categoryKey를 null로 둡니다.
- 표현이 모호하거나 여러 공정에 걸치는 항목은 confidence를 "low"로 하고 note에 확인할 점을 적습니다.
- 금액은 원 단위 숫자로 변환합니다 (예: "1,200,000" → 1200000, "120만" → 1200000).
- 부가세 포함 여부와 견적서에 적힌 총액도 찾아서 기록합니다. 명시가 없으면 null.`,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: "이 견적서를 분석해주세요." }],
        },
      ],
      output_config: { format: zodOutputFormat(ParsedQuoteSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "견적서 분석 결과를 해석하지 못했습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }
    return NextResponse.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Anthropic API 키가 없거나 잘못되었습니다. .env에 ANTHROPIC_API_KEY를 설정하고 서버를 재시작하세요." },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API 오류 (${error.status}): ${error.message}` },
        { status: 502 }
      );
    }
    throw error;
  }
}
