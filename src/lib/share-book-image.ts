import { Book, Page } from "@/lib/types"

export async function downloadComicPage(
  pages: Array<{ image: string; caption: string }>,
  title: string
): Promise<void> {
  const PANEL = 512
  const GAP = 4
  const PAD = 6
  const BOTTOM_W = PANEL * 2 + GAP
  const BOTTOM_H = Math.round(BOTTOM_W * (2 / 3))

  const canvasW = PAD + PANEL + GAP + PANEL + PAD
  const canvasH = PAD + PANEL + GAP + PANEL + GAP + BOTTOM_H + PAD

  const positions = [
    { x: PAD, y: PAD, w: PANEL, h: PANEL },
    { x: PAD + PANEL + GAP, y: PAD, w: PANEL, h: PANEL },
    { x: PAD, y: PAD + PANEL + GAP, w: PANEL, h: PANEL },
    { x: PAD + PANEL + GAP, y: PAD + PANEL + GAP, w: PANEL, h: PANEL },
    { x: PAD, y: PAD + PANEL * 2 + GAP * 2, w: BOTTOM_W, h: BOTTOM_H },
  ]

  const canvas = document.createElement("canvas")
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvasW, canvasH)

  for (let i = 0; i < 5; i++) {
    const { x, y, w, h } = positions[i]
    const page = pages[i]

    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(x, y, w, h)

    if (page?.image) {
      const img = await loadImage(page.image).catch(() => null)
      if (img) drawCover(ctx, img, x, y, w, h)
    }
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `${title || "my-comic"}.jpg`,
      })
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    "image/jpeg",
    0.9
  )
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height
  const destAspect = w / h
  let sx, sy, sw, sh

  if (imgAspect > destAspect) {
    sh = img.height
    sw = sh * destAspect
    sy = 0
    sx = (img.width - sw) / 2
  } else {
    sw = img.width
    sh = sw / destAspect
    sx = 0
    sy = (img.height - sh) / 2
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
}

/**
 * Combine all pages of a book into one tall PNG and invoke the
 * Web Share API (or fall back to a download).
 */
export async function shareBookAsImage(
  book: Book,
  opts: { showCaptions?: boolean; textColor?: string } = {}
): Promise<void> {
  /* ───────── Config ───────── */
  const PAGE_WIDTH = 800 // px (output width)
  const PADDING = 40 // horizontal padding for text
  const CAPTION_FONT = "16px sans-serif"
  const PAGE_NUM_FONT = "20px sans-serif"
  const PAGE_NUM_MARGIN = 20
  const CAPTION_MARGIN_BOTTOM = 10
  const TEXT_COLOR = opts.textColor ?? "#000"
  const SHOW_CAPTIONS = opts.showCaptions ?? true

  /* ─── 1. Pre-load & scale images ─── */
  const loadedPages: Array<
    Page & { img: HTMLImageElement | null; scale: number; imgHeight: number }
  > = await Promise.all(
    book.pages.map(async (p) => {
      if (!p.image) return { ...p, img: null, scale: 1, imgHeight: 0 }
      const img = await loadImage(p.image)
      const scale = PAGE_WIDTH / img.width
      return { ...p, img, scale, imgHeight: img.height * scale }
    })
  )

  /* ─── 2. Canvas sizing ─── */
  const totalHeight = loadedPages.reduce((sum, { imgHeight }) => sum + imgHeight, 0)

  const canvas = document.createElement("canvas")
  canvas.width = PAGE_WIDTH
  canvas.height = totalHeight
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D

  /* White background */
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, PAGE_WIDTH, totalHeight)

  /* ─── 3. Render each page ─── */
  let yOffset = 0
  loadedPages.forEach(({ img, imgHeight, caption }, pageIdx) => {
    // Draw scaled image
    if (img) ctx.drawImage(img, 0, yOffset, PAGE_WIDTH, imgHeight)

    // Page number
    ctx.font = PAGE_NUM_FONT
    ctx.fillStyle = TEXT_COLOR
    ctx.textAlign = "right"
    ctx.textBaseline = "top"
    ctx.fillText(String(pageIdx + 1), PAGE_WIDTH - PAGE_NUM_MARGIN, yOffset + PAGE_NUM_MARGIN)

    // Caption (bottom overlay)
    if (SHOW_CAPTIONS && caption) {
      ctx.font = CAPTION_FONT
      ctx.fillStyle = TEXT_COLOR
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      const maxCaptionWidth = PAGE_WIDTH - PADDING * 2
      const singleLine = truncateToFit(ctx, caption, maxCaptionWidth)
      ctx.fillText(singleLine, PADDING, yOffset + imgHeight - CAPTION_MARGIN_BOTTOM)
    }

    // Move y-cursor to start of next image (no extra gap)
    yOffset += imgHeight
  })

  /* ─── 4. Convert to PNG & share ─── */
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob conversion failed"))))
  )

  const file = new File([blob], `${book.title}.png`, { type: "image/png" })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      text: `Enjoy my Tiny Tales story "${book.title}"`,
      files: [file],
    })
  } else {
    /* Fallback: trigger download */
    const url = URL.createObjectURL(file)
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: file.name,
    })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/** Truncate `text` so it fits in `maxWidth`, appending “…” if needed. */
function truncateToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  let trimmed = text
  while (trimmed.length && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed.trim()}…`
}
