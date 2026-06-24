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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const headline = searchParams.get("headline") || "Headline do post";
  const subtitle = searchParams.get("subtitle") || "";
  const dia = (searchParams.get("dia") || "segunda").toUpperCase();
  const handle = searchParams.get("handle") || "@perfil";
  const bg = searchParams.get("bg") || "";

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
            style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
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
            background:
              "linear-gradient(180deg, rgba(11,13,18,0.35) 0%, rgba(11,13,18,0) 35%, rgba(11,13,18,0.55) 70%, rgba(11,13,18,0.92) 100%)",
          }}
        />

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
            <div
              style={{
                display: "flex",
                fontFamily: "Mono",
                fontSize: 24,
                color: "#0b0d12",
                backgroundColor: "#5eead4",
                padding: "10px 20px",
                borderRadius: 999,
                letterSpacing: 2,
              }}
            >
              {dia}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                width: 96,
                height: 8,
                backgroundColor: "#5eead4",
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
