import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Aivora — AI avtomatlashtirish agentligi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public/images/logo/aivora-logo-full.png")
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080C",
          backgroundImage:
            "radial-gradient(circle at 50% 55%, rgba(109,74,232,0.35), rgba(8,8,12,0) 60%)",
        }}
      >
        <img src={logoSrc} width={620} height={457} />
      </div>
    ),
    size
  );
}
