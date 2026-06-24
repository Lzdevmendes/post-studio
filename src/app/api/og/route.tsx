import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

const W = 1080;
const H = 1350;

const fontDir = join(process.cwd(), "src/assets/fonts");
const interRegular = readFileSync(join(fontDir, "Inter-Regular.ttf"));
const interBlack = readFileSync(join(fontDir, "Inter-Black.ttf"));
const mono = readFileSync(join(fontDir, "JetBrainsMono-Bold.ttf"));

// O Pollinations gera a imagem sob demanda e pode levar 10-30s. Em vez de
// deixar o Satori buscar a URL "ao vivo" (que falhava na maioria das vezes e
// deixava o post sem fundo), baixamos aqui no servidor com algumas tentativas
// e devolvemos a imagem embutida como data URI — aí o fundo é garantido.
async function loadBg(url: string): Promise<string | null> {
  // Motores que devolvem bytes já mandam um data URI pronto — usa direto.
  if (url.startsWith("data:")) return url;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const type = res.headers.get("content-type") || "";
      if (res.ok && type.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 2048) {
          return `data:${type};base64,${buf.toString("base64")}`;
        }
      }
    } catch {
      // rede instável — tenta de novo
    }
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  return null;
}

type Tpl = "padrao" | "centro" | "citacao";

const accent = "#5eead4";

function overlay(tpl: Tpl) {
  if (tpl === "centro")
    return "linear-gradient(180deg, rgba(11,13,18,0.55) 0%, rgba(11,13,18,0.78) 100%)";
  if (tpl === "citacao")
    return "linear-gradient(90deg, rgba(11,13,18,0.88) 0%, rgba(11,13,18,0.6) 55%, rgba(11,13,18,0.42) 100%)";
  return "linear-gradient(180deg, rgba(11,13,18,0.35) 0%, rgba(11,13,18,0) 35%, rgba(11,13,18,0.55) 70%, rgba(11,13,18,0.92) 100%)";
}

function chip(dia: string) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Mono",
        fontSize: 24,
        color: "#0b0d12",
        backgroundColor: accent,
        padding: "10px 20px",
        borderRadius: 999,
        letterSpacing: 2,
      }}
    >
      {dia}
    </div>
  );
}

function handleTag(handle: string) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Mono",
        fontSize: 30,
        color: "#e6e8ee",
        letterSpacing: 1,
      }}
    >
      {handle}
    </div>
  );
}

function content(
  tpl: Tpl,
  headline: string,
  subtitle: string,
  dia: string,
  handle: string,
) {
  if (tpl === "centro") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: W,
          height: H,
          position: "relative",
          padding: 80,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", marginBottom: 32 }}>{chip(dia)}</div>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 8,
            backgroundColor: accent,
            borderRadius: 4,
            marginBottom: 32,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "InterBlack",
            fontSize: 80,
            lineHeight: 1.05,
            color: "#ffffff",
            letterSpacing: -1.5,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          {headline}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 36,
              lineHeight: 1.3,
              color: "#c3c8d4",
              marginTop: 28,
              textAlign: "center",
              maxWidth: 820,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 0,
            width: W,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {handleTag(handle)}
        </div>
      </div>
    );
  }

  if (tpl === "citacao") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: W,
          height: H,
          position: "relative",
          padding: 80,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "InterBlack",
            fontSize: 200,
            lineHeight: 0.8,
            color: accent,
            marginBottom: 8,
          }}
        >
          &ldquo;
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "InterBlack",
            fontSize: 76,
            lineHeight: 1.1,
            color: "#ffffff",
            letterSpacing: -1,
            maxWidth: 860,
          }}
        >
          {headline}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 36,
              lineHeight: 1.3,
              color: "#c3c8d4",
              marginTop: 28,
              maxWidth: 780,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            left: 80,
            width: W - 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {handleTag(handle)}
          {chip(dia)}
        </div>
      </div>
    );
  }

  // padrao
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: H,
        position: "relative",
        padding: 72,
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {handleTag(handle)}
        {chip(dia)}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 8,
            backgroundColor: accent,
            borderRadius: 4,
            marginBottom: 28,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "InterBlack",
            fontSize: 84,
            lineHeight: 1.04,
            color: "#ffffff",
            letterSpacing: -1.5,
          }}
        >
          {headline}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 38,
              lineHeight: 1.3,
              color: "#aeb4c2",
              marginTop: 28,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ArtParams = {
  headline: string;
  subtitle: string;
  dia: string;
  handle: string;
  bg: string;
  tpl: string;
};

async function render(params: ArtParams) {
  const headline = params.headline || "Headline do post";
  const subtitle = params.subtitle || "";
  const dia = (params.dia || "segunda").toUpperCase();
  const handle = params.handle || "@perfil";
  const tpl: Tpl = ["padrao", "centro", "citacao"].includes(params.tpl)
    ? (params.tpl as Tpl)
    : "padrao";

  const bg = params.bg ? await loadBg(params.bg) : null;

  return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: W,
            height: H,
            position: "relative",
            fontFamily: "Inter",
            backgroundColor: "#0b0d12",
          }}
        >
          {bg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg}
              width={W}
              height={H}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                objectFit: "cover",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              display: "flex",
              background: overlay(tpl),
            }}
          />

          {content(tpl, headline, subtitle, dia, handle)}
        </div>
      ),
      {
        width: W,
        height: H,
        fonts: [
          { name: "Inter", data: interRegular, weight: 400, style: "normal" },
          { name: "InterBlack", data: interBlack, weight: 900, style: "normal" },
          { name: "Mono", data: mono, weight: 700, style: "normal" },
        ],
      },
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await render({
      headline: searchParams.get("headline") || "",
      subtitle: searchParams.get("subtitle") || "",
      dia: searchParams.get("dia") || "",
      handle: searchParams.get("handle") || "",
      bg: searchParams.get("bg") || "",
      tpl: searchParams.get("tpl") || "padrao",
    });
  } catch (e) {
    return new Response(`Falha ao gerar a arte: ${(e as Error).message}`, {
      status: 500,
    });
  }
}

// POST recebe o fundo no corpo (data URI dos motores que devolvem bytes, ou
// uma URL) — assim não estoura o limite de tamanho da query string do GET.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    return await render({
      headline: body.headline || "",
      subtitle: body.subtitle || "",
      dia: body.dia || "",
      handle: body.handle || "",
      bg: body.bg || "",
      tpl: body.tpl || "padrao",
    });
  } catch (e) {
    return new Response(`Falha ao gerar a arte: ${(e as Error).message}`, {
      status: 500,
    });
  }
}
