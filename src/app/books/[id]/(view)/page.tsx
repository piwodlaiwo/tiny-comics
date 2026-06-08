import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BookViewPage({ params }: Props) {
  const { id } = await params
  redirect(`/books/${id}/edit?page=0`)
}
