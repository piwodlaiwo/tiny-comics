export function createImagePrompt(
  caption: string,
  previousCaptions: string[],
  pageIndex: number
): string {
  const lines: string[] = []

  if (previousCaptions.length > 0) {
    lines.push("Previous pages:")
    previousCaptions.forEach((text, idx) => {
      const num = pageIndex - previousCaptions.length + idx + 1
      lines.push(`${num}. ${text}`)
    })
    lines.push("Current page:")
  }

  lines.push(caption)
  lines.push(
    [
      "Create a vibrant cartoon-style illustration for young children.",
      "Maintain consistent characters, settings, and themes with earlier pages.",
      "Use bright, friendly colors and simple shapes.",
      "Do not include any text, watermarks, or parts of this prompt in the image."
    ].join(" ")
  )

  return lines.join("\n")
}
