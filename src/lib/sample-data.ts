import { Book } from "@/lib/types"

export const EXAMPLE_BOOK: Book = {
  id: "example",
  title: "The Tortoise and the Hare",
  pages: [
    {
      id: "page-1",
      caption: "The rabbit laughed at the tortoise. \"Do you ever get anywhere?\" The tortoise replied \"I'll race you!\"",
      image: "/example/a.jpg",
    },
    {
      id: "page-2",
      caption: "The rabbit sprinted ahead, laughing. The tortoise kept running steadily behind.",
      image: "/example/b.jpg",
    },
    {
      id: "page-3",
      caption: "The rabbit stopped to take a nap by the road. The tortoise kept walking, slow and steady.",
      image: "/example/c.jpg",
    },
  ],
  createdAt: Date.now(),
}
