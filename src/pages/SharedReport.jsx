import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Download, Loader2 } from "lucide-react"
import { AuditReportTitle, AuditReportView, AUDIT_ANIMATION_STYLES } from "@/components/settings/analytics/AdAccountAudit"
import {
  DiagnosticReportTitle, DiagnosticReportView, DIAGNOSTIC_ANIMATION_STYLES,
} from "@/components/settings/analytics/AdAccountDiagnostic"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const FONT = "'Inter Tight', system-ui, sans-serif"
const LINE = "#E7E9EE"
const PAPER_2 = "#F8F9FB"

// Public, read-only view of an audit / diagnostic report shared from the
// analytics dashboard (ReportShareMenu): the report exactly as rendered in
// the app's dialog, as a white card on the app's dotted background.
export default function SharedReport() {
  const { token } = useParams()
  const [shared, setShared] = useState(null)
  const [error, setError] = useState("")
  const [preparingPdf, setPreparingPdf] = useState(false)
  const [pdfError, setPdfError] = useState("")
  const cardRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/api/reports/shared/${encodeURIComponent(token)}`)
      .then(r => r.json().then(body => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return
        if (!ok) throw new Error(body.error || "This report is no longer available")
        setShared(body)
      })
      .catch(err => { if (!cancelled) setError(err.message || "This report is no longer available") })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (shared) document.title = `${shared.accountName || "Ad account"} · ${shared.type === "audit" ? "Ad Account Audit" : "Diagnostic Report"}`
  }, [shared])

  const handleDownloadPdf = async () => {
    if (preparingPdf) return
    setPreparingPdf(true)
    setPdfError("")
    try {
      await Promise.all([
        document.fonts.ready,
        ...Array.from(cardRef.current?.querySelectorAll("img") || [], (image) => image.decode().catch(() => {})),
      ])
      window.print()
    } catch (printError) {
      setPdfError(printError.message || "Could not open the print dialog. Please try again.")
    } finally {
      setPreparingPdf(false)
    }
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Report unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    )
  }

  if (!shared) {
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-gray-500" /></main>
  }

  const { type, accountName, snapshot } = shared
  const isAudit = type === "audit"

  return (
    <>
      <style>{`
        ${isAudit ? AUDIT_ANIMATION_STYLES : DIAGNOSTIC_ANIMATION_STYLES}
        @media print {
          @page { size: A3 portrait; margin: 10mm; }
          html, body, #root { background: white !important; }
          .shared-report-screen-only { display: none !important; }
          .shared-report-page { padding: 0 !important; min-height: 0 !important; }
          .shared-report-card { border: 0 !important; border-radius: 0 !important; }
          .shared-report-card * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .shared-report-body > div > div { break-inside: avoid; }
        }
      `}</style>
      <main className="shared-report-page min-h-screen px-4 py-10 sm:px-6" style={{ fontFamily: FONT }}>
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="shared-report-screen-only mb-4 flex items-center justify-end gap-3">
            {pdfError && <p role="alert" className="text-sm text-red-600">{pdfError}</p>}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={preparingPdf}
              title="Choose Save as PDF in the print dialog"
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-xs hover:shadow-sm disabled:cursor-wait disabled:opacity-45"
            >
              {preparingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {preparingPdf ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>

          <div
            ref={cardRef}
            className="shared-report-card overflow-hidden bg-white"
            style={{ borderRadius: 24, border: `1px solid ${LINE}` }}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              {isAudit ? (
                <AuditReportTitle
                  accountName={accountName}
                  reportDate={snapshot.reportDate}
                  kpiType={snapshot.kpiType}
                  kpiTarget={snapshot.kpiTarget}
                  conversionEvent={snapshot.conversionEvent}
                />
              ) : (
                <DiagnosticReportTitle accountName={accountName} reportDate={snapshot.reportDate} report={snapshot.report} />
              )}
            </div>
            <div className="shared-report-body" style={{ padding: 28, background: PAPER_2, fontFamily: FONT }}>
              {isAudit ? (
                <AuditReportView
                  report={snapshot.report}
                  kpiType={snapshot.kpiType}
                  kpiTarget={snapshot.kpiTarget}
                  opportunitiesText={snapshot.opportunitiesText}
                  oppsError={snapshot.oppsError}
                />
              ) : (
                <DiagnosticReportView
                  report={snapshot.report}
                  kpiType={snapshot.kpiType}
                  conversionEvent={snapshot.conversionEvent}
                  perfSummaries={snapshot.perfSummaries || {}}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
