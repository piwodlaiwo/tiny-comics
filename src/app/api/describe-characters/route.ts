import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const { imageUrl } = await req.json()

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 })
  }

  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return NextResponse.json({ error: "Invalid image format." }, { status: 400 })
  }
  const [, mimeType, base64] = match

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: base64,
              mimeType: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            },
            {
              type: "text",
              text: `You are helping a comic book artist keep character designs consistent across panels.

Look at this comic panel image and write a short character reference (2-3 sentences) describing the visual appearance of each character — their approximate age, hair color and style, skin tone, clothing colors and style, and any distinctive features. Be very specific about colors and visual details. Do not describe what they are doing, only how they look.

Start your response with "Characters:"`,
            },
          ],
        },
      ],
    })

    return NextResponse.json({ characterStyle: text.trim() })
  } catch (error) {
    console.error("/api/describe-characters error", error)
    return NextResponse.json({ error: "Failed to generate character description." }, { status: 500 })
  }
}
