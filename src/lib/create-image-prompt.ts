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
    "Create a colorful illustration for this children's story. Keep the art style consistent across pages. Do not include any text or captions."
  )

  return lines.join("\n")
}
