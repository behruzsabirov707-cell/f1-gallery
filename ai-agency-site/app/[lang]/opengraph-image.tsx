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
          background: "#0a0c0f",
          backgroundImage:
            "radial-gradient(circle at 50% 55%, rgba(255,157,66,0.30), rgba(10,12,15,0) 60%)",
        }}
      >
        <img src={logoSrc} width={620} height={457} />
      </div>
    ),
    size
  );
}
