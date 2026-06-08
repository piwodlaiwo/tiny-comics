"use client"

import { Loader2, ImagePlus, Download, ChevronDown } from "lucide-react"
import { useReducer, useState } from "react"
import { getInitialState, PageDraft, reducer } from "@/components/book-editor-state"
import { RecordButton } from "@/components/record-button"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { useMicrophone } from "@/hooks/useMicrophone"
import {
  asyncFailedToLoad,
  asyncLoaded,
  asyncLoading,
  getLoadingInfo,
  getValue,
  isLoading,
} from "@/lib/async-data"
import { createImagePrompt } from "@/lib/create-image-prompt"
import { resizeImage } from "@/lib/resize-image"
import { downloadComicPage } from "@/lib/share-book-image"
import { Book } from "@/lib/types"

type ComicStyle = "cartoon" | "noir" | "manga" | "indie"

const COMIC_STYLES: { value: ComicStyle; label: string }[] = [
  { value: "cartoon", label: "Cartoon" },
  { value: "noir", label: "Noir" },
  { value: "manga", label: "Manga" },
  { value: "indie", label: "Indie" },
]

export function BookEditor({ book, pageIndex = 0 }: { book: Book; pageIndex?: number }) {
  const [state, dispatch] = useReducer(reducer, getInitialState(book, pageIndex))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [characterStyle, setCharacterStyle] = useState<string>(book.characterStyle ?? "")
  const [comicStyle, setComicStyle] = useState<ComicStyle>("cartoon")

  const editingPage = editingIndex !== null ? state.pages[editingIndex] : null
  const isLoadingImage = editingPage ? getLoadingInfo(editingPage.image).isLoading : false
  const isLoadingTranscript = editingPage ? isLoading(editingPage.caption) : false
  const captionText = editingPage ? getValue(editingPage.caption, "") : ""
  const imageUrl = editingPage ? getValue(editingPage.image) : undefined

  const makePageUpdater = (idx: number) => (payload: Partial<PageDraft>, error?: string) =>
    dispatch({ type: "UPDATE_PAGE", pageIndex: idx, payload, error })

  const handleChangeCaption = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (editingIndex === null) return
    dispatch({
      type: "UPDATE_PAGE",
      pageIndex: editingIndex,
      payload: { caption: asyncLoaded(e.target.value) },
    })
  }

  const handleGenerateImage = async () => {
    if (editingIndex === null || captionText.trim().length === 0 || isLoadingImage) return
    const updatePage = makePageUpdater(editingIndex)
    updatePage({ image: asyncLoading() })

    try {
      const previousCaptions = state.pages
        .slice(0, editingIndex)
        .map((p) => getValue(p.caption, "").trim())
        .filter(Boolean)
        .slice(-3)

      const prompt = createImagePrompt(captionText, previousCaptions, editingIndex, characterStyle, comicStyle)
      const panel1Image = editingIndex > 0 ? getValue(state.pages[0].image) : undefined
      const referenceImageUrl = panel1Image?.startsWith("data:") ? panel1Image : undefined
      const size = editingIndex === 4 ? "1536x1024" : "1024x1024"
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImageUrl, size }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Image generation failed")
      const url = await resizeImage(data.url, 0.5)
      updatePage({ image: asyncLoaded(url) })

      // After panel 1 generates, look at the actual image to extract character descriptions
      if (editingIndex === 0 && !characterStyle) {
        fetch("/api/describe-characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        })
          .then((r) => r.json())
          .then(({ characterStyle: style }) => { if (style) setCharacterStyle(style) })
          .catch(() => {})
      }
    } catch (error) {
      console.error("Image generation fail", error)
      updatePage(
        { image: asyncFailedToLoad("Image generation failed") },
        "Image generation failed"
      )
    }
  }

  const { isRecording, toggleRecording } = useMicrophone({
    onAudioReady: async (blob) => {
      if (editingIndex === null) return
      const formData = new FormData()
      formData.append("file", blob, "recording.webm")
      const updatePage = makePageUpdater(editingIndex)
      updatePage({ caption: asyncLoading() })
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: formData })
        const json = await res.json()
        updatePage({ caption: asyncLoaded(json.transcript ?? "(No transcript available)") })
      } catch (error) {
        console.error("Transcription fail", error)
        updatePage(
          { caption: asyncFailedToLoad("Transcription failed") },
          "Transcription failed"
        )
      }
    },
  })

  const handleDownload = () => {
    const pages = state.pages.map((page) => ({
      image: getValue(page.image, ""),
      caption: getValue(page.caption, ""),
    }))
    downloadComicPage(pages, state.title)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {COMIC_STYLES.find((s) => s.value === comicStyle)?.label}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COMIC_STYLES.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => setComicStyle(s.value)}
                className={comicStyle === s.value ? "font-semibold" : ""}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Comic page — 2+2+1 panel layout */}
      <div className="bg-white border-4 border-black p-1 grid grid-cols-2 gap-1">
        {state.pages.slice(0, 4).map((page, idx) => {
          const isLocked = idx > 0 && !getValue(state.pages[idx - 1].image)
          return (
            <PanelButton
              key={page.id}
              page={page}
              index={idx}
              className="aspect-square"
              isLocked={isLocked}
              onClick={() => !isLocked && setEditingIndex(idx)}
            />
          )
        })}
        <PanelButton
          key={state.pages[4].id}
          page={state.pages[4]}
          index={4}
          className="col-span-2 aspect-[3/2]"
          imgClassName="object-cover"
          isLocked={!getValue(state.pages[3].image)}
          onClick={() => getValue(state.pages[3].image) && setEditingIndex(4)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-1 h-4 w-4" />
          Download comic
        </Button>
      </div>

      {/* Edit panel dialog */}
      <Dialog
        open={editingIndex !== null}
        onOpenChange={(open) => !open && setEditingIndex(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Panel {editingIndex !== null ? editingIndex + 1 : ""}</DialogTitle>
          </DialogHeader>

          {editingPage && (
            <div className="space-y-3">
              {/* Image preview */}
              <div
                className={`aspect-square rounded-lg border-2 border-dashed border-purple-200 bg-gray-50 overflow-hidden flex items-center justify-center ${
                  isLoadingImage ? "animate-pulse" : ""
                }`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={captionText}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImagePlus className="h-10 w-10 mx-auto mb-1" />
                    <p className="text-xs">
                      {isLoadingImage ? "Creating your picture..." : "Picture will appear here"}
                    </p>
                  </div>
                )}
              </div>

              <Textarea
                className="resize-none h-[90px] p-3 border-2 border-dashed border-purple-300 focus-visible:ring-purple-300/50 rounded-lg disabled:opacity-80"
                placeholder="What happens in this panel?"
                disabled={isRecording || isLoadingTranscript}
                onChange={handleChangeCaption}
                value={
                  isRecording
                    ? "I'm listening..."
                    : isLoadingTranscript
                    ? "Loading..."
                    : captionText
                }
              />

              <div className="flex justify-between gap-3">
                <RecordButton
                  isDisabled={isLoadingImage}
                  isLoading={isLoadingTranscript}
                  isRecording={isRecording}
                  onClick={toggleRecording}
                />
                <Button
                  onClick={handleGenerateImage}
                  disabled={!captionText.trim() || isLoadingImage}
                  variant="outline"
                >
                  {isLoadingImage ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-1 h-4 w-4" />
                      Generate image
                    </>
                  )}
                </Button>
              </div>

              {state.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                  {state.error}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PanelButton({
  page,
  index,
  className,
  imgClassName,
  isLocked = false,
  onClick,
}: {
  page: PageDraft
  index: number
  className?: string
  imgClassName?: string
  isLocked?: boolean
  onClick: () => void
}) {
  const panelImage = getValue(page.image)
  const panelCaption = getValue(page.caption, "")
  const { isLoading: isPanelLoading } = getLoadingInfo(page.image)

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`group border-2 border-black overflow-hidden flex flex-col transition-opacity ${
        isLocked ? "bg-gray-100 opacity-40 cursor-not-allowed" : "bg-gray-50 cursor-pointer"
      } ${className ?? ""}`}
    >
      <div
        className={`flex-1 flex items-center justify-center ${isPanelLoading ? "animate-pulse" : ""}`}
      >
        {panelImage ? (
          <img src={panelImage} alt={panelCaption} className={`w-full h-full ${imgClassName ?? "object-cover"}`} />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-300 group-hover:text-purple-400 transition-colors">
            <ImagePlus className="h-7 w-7" />
            <span className="text-xs font-medium">{index + 1}</span>
          </div>
        )}
      </div>
      {panelCaption && (
        <div className="bg-white border-t-2 border-black px-2 py-1 shrink-0">
          <p className="text-xs line-clamp-2 text-left">{panelCaption}</p>
        </div>
      )}
    </button>
  )
}
