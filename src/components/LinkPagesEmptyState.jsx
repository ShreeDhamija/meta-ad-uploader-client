import { Button } from "@/components/ui/button"

export default function LinkPagesEmptyState({
  label = "pages",
  onClick,
  className = "",
}) {
  return (
    <div className={`px-4 py-5 text-center ${className}`}>
      <p className="text-sm text-gray-500">
        No {label} found.{" "}
        <button
          type="button"
          onClick={onClick}
          className="font-medium text-black underline underline-offset-2 hover:text-gray-700"
        >
          Click to link more pages
        </button>
      </p>
      <Button
        type="button"
        variant="link"
        onClick={onClick}
        className="mt-2 h-auto p-0 text-xs font-medium text-black underline underline-offset-2 hover:text-gray-700"
      >
        Confirm Blip has access to pages to make ads
      </Button>
    </div>
  )
}
