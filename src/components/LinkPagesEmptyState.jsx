import { Button } from "@/components/ui/button"

export default function LinkPagesEmptyState({
  message = "No pages found.",
  onClick,
  className = "",
}) {
  return (
    <div className={`px-4 py-5 text-center ${className}`}>
      <p className="mb-2 text-sm text-gray-500">{message}</p>
      <Button
        type="button"
        variant="link"
        onClick={onClick}
        className="h-auto p-0 text-xs font-medium text-black underline underline-offset-2 hover:text-gray-700"
      >
        Confirm Blip has access to pages to make ads
      </Button>
    </div>
  )
}
