const SPEECH_CUES = /\b(says?|said|tells?|told|shouts?|shouted|yells?|yelled|asks?|asked|replies|replied|whispers?|whispered|calls?|called|screams?|screamed|announces?|announced)\b/i

const THOUGHT_CUES = /\b(thinks?|thought|thinking|wonders?|wondered|wondering|imagines?|imagined|imagining|dreams?|dreamed|dreaming|wishes?|wished|wishing|remembers?|remembered|hoping|hopes?)\b/i

function detectBubbles(caption: string): string[] {
  const instructions: string[] = []

  if (SPEECH_CUES.test(caption)) {
    instructions.push(
      "If a character is speaking, show their exact words inside a speech bubble — a white oval with a pointed tail coming from the speaker's mouth."
    )
  }

  if (THOUGHT_CUES.test(caption)) {
    instructions.push(
      "If a character is thinking, imagining, or dreaming, show the thought content inside a thought bubble — a white cloud shape with small circles leading from the character's head. The bubble can contain words or a small picture of what they are thinking about."
    )
  }

  return instructions
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  cartoon: "colorful, child-friendly comic strip style with bold black outlines, bright flat colors, and expressive cartoon characters",
  noir: "black and white noir comic style with heavy shadows, high contrast, dramatic lighting, and a moody atmospheric feel",
  manga: "manga style with clean expressive linework, large emotive eyes, dynamic panel composition, and Japanese comic aesthetics",
  indie: "indie graphic novel style with loose hand-drawn linework, muted earthy colors, and an intimate personal feel",
}

export function createImagePrompt(
  caption: string,
  previousCaptions: string[],
  pageIndex: number,
  characterStyle?: string,
  comicStyle: string = "cartoon"
): string {
  const lines: string[] = []

  if (characterStyle) {
    lines.push(`Character reference (keep these characters looking exactly like this in every panel): ${characterStyle}`)
  }

  if (previousCaptions.length > 0) {
    lines.push(
      "Previous panels — for character and setting reference ONLY. Do NOT redraw or repeat any of these scenes:"
    )
    previousCaptions.forEach((text, idx) => {
      const num = pageIndex - previousCaptions.length + idx + 1
      lines.push(`  Panel ${num}: ${text}`)
    })
  }

  lines.push(`Draw ONLY this new panel: ${caption}`)

  const bubbleInstructions = detectBubbles(caption)

  lines.push(
    [
      `Draw this as a single comic book panel in a ${STYLE_INSTRUCTIONS[comicStyle] ?? STYLE_INSTRUCTIONS.cartoon}.`,
      previousCaptions.length > 0 || characterStyle
        ? "Keep all characters looking EXACTLY the same as established — same face, hair color, clothing, and proportions. Draw ONLY the action described in the current panel above."
        : "Use simple, distinctive character designs with clear visual features that will be easy to keep consistent across panels.",
      ...bubbleInstructions,
      bubbleInstructions.length === 0
        ? "Do not include any text, speech bubbles, or captions in the image."
        : "Do not add any text outside of speech or thought bubbles.",
      "Do not include watermarks or any part of this prompt in the image.",
    ].join(" ")
  )

  return lines.join("\n")
}
