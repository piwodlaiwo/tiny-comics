import { openai } from "@ai-sdk/openai"
import { experimental_generateImage as generateImage } from "ai"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

async function generateWithReference(prompt: string, referenceImageUrl: string, size: string): Promise<string> {
  const match = referenceImageUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error("Invalid reference image format")
  const [, mimeType, base64] = match

  const imageBuffer = Buffer.from(base64, "base64")

  const formData = new FormData()
  formData.append("model", "gpt-image-1")
  formData.append("image", new Blob([imageBuffer], { type: mimeType }), "reference.png")
  formData.append("prompt", prompt)
  formData.append("size", size)

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? "Image edit API failed")
  }

  const data = await res.json()
  const item = data.data?.[0]
  if (!item) throw new Error("No image in edit response")

  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item.url) return item.url
  throw new Error("Unexpected response format from image edit API")
}

export async function POST(req: Request) {
  const { prompt, referenceImageUrl, size = "1024x1024" } = await req.json() as { prompt: string; referenceImageUrl?: string; size?: string }

  if (prompt == null || prompt.trim() === "") {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
  }

  try {
    let dataUrl: string

    if (referenceImageUrl) {
      dataUrl = await generateWithReference(prompt, referenceImageUrl, size)
    } else {
      const { image } = await generateImage({
        model: openai.image("gpt-image-1"),
        prompt,
        size: size as "1024x1024" | "1536x1024" | "1024x1536",
        providerOptions: { openai: { quality: "medium" } },
      })
      dataUrl = `data:${image.mimeType};base64,${image.base64}`
    }

    return NextResponse.json({ url: dataUrl }, { status: 200 })
  } catch (error) {
    console.error("/api/generate-image error", error)
    return NextResponse.json({ error: "Image generation failed." }, { status: 500 })
  }
}
