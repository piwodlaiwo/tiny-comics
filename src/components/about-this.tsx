import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function AboutThis() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <CircleHelp />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>About</DialogTitle>
        <DialogDescription asChild>
          <div>
            <div className="mb-3">
              Tiny Comics is a simple and fun comic strip maker. Speak your idea for each panel, and
              OpenAI turns those words into pictures. The prompts ensure continuity in character
              style.
            </div>
            <div className="mb-3">
              You can select a different comic strip style. Nothing is uploaded or shared. All images
              are AI generated, live in the browser, and die on refresh. Save your comic strip page
              with the Download button.
            </div>
            <div className="flex gap-2 text-xs text-black">
              <a
                href="https://github.com/piwodlaiwo/tiny-comics"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Code on GitHub
              </a>

              <span>{"//"}</span>

              <a
                href="https://github.com/brendansudol/tiny-tales"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Inspired by Tiny Tales
              </a>
            </div>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
