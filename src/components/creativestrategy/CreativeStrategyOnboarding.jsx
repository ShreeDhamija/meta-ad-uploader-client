// First-run walkthrough for the Creative Strategy area. Shown once per user
// (global settings flag `hasSeenCreativeStrategyOnboarding`, see
// CreativeStrategyLayout). It is intentionally unskippable: no close button,
// no Escape or backdrop dismissal — only Back / Next, and the last screen's
// button finishes it.
//
// To add artwork later, set `image` on a screen to an imported asset or URL,
// e.g. `import stagesImg from "@/assets/cs-onboarding-stages.webp"` then
// `image: stagesImg`. The frame is a fixed 4:3 box, so images never shift the
// layout (they are `object-cover`ed into it).
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const CREATIVE_STRATEGY_ONBOARDING_SCREENS = [
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "Your creative strategist, on autopilot",
    intro:
      "Creative Strategy turns your product page and your Meta ads into customer research, ad insights, ready-to-use copy and fresh ad ideas every week.",
    items: [
      { text: "This quick tour shows what you'll see, how it all gets made, and how to get better results." },
      { text: "It takes about two minutes. You'll only see it once." },
    ],
    image: null,
  },
  {
    id: "start",
    eyebrow: "Before anything else",
    title: "Two things to set up first",
    intro: "Everything else is built from these two, so do them before anything else.",
    items: [
      { label: "Connect your Meta ad account", text: "Your connected accounts show up in the Accounts tab.", tabs: ["brands"] },
      { label: "Add your product with its URL", text: "In the Products tab, click New Product and paste the product page link.", tabs: ["products"] },
      { label: "More ads, better insights", text: "Ads with real spend behind them give us much more to learn from." },
    ],
    image: null,
  },
  {
    id: "stages",
    eyebrow: "How it works",
    title: "What happens after you add a product",
    intro: "It all runs on its own and takes about 10–15 minutes. You can leave the page while it works.",
    items: [
      { label: "1. Read the product page", text: "Features, benefits, pain points, reviews, pricing, plus your brand colors, fonts and logo.", tabs: ["products"] },
      { label: "2. Research (5–10 min)", text: "We dig into your brand, real customer reviews, Reddit and forums, and your competitors.", tabs: ["research"] },
      { label: "3. Insights", text: "Your top Meta ads are broken down one by one, then reviewed together as a strategy audit.", tabs: ["intelligence"] },
      { label: "4. Copy and concepts", text: "Your copy Library and your first Weekly Strategy concepts are created side by side.", tabs: ["library", "weekly"] },
    ],
    footnote: "Insights need a connected Meta ad account.",
    image: null,
  },
  {
    id: "weekly-refresh",
    eyebrow: "Every Monday",
    title: "Fresh work lands each week",
    intro: "Every Monday at 9am (Sydney time), things update on their own:",
    items: [
      { text: "Your ads are analyzed again.", tabs: ["intelligence"] },
      { text: "What we know works for your brand is refreshed." },
      { text: "A new set of Weekly Strategy concepts is ready.", tabs: ["weekly"] },
      { text: "Your Monthly Review is rebuilt.", tabs: ["monthly"] },
    ],
    footnote:
      "Research does not refresh on its own. Run it again when your product, positioning or reviews change.",
    image: null,
  },
  {
    id: "data",
    eyebrow: "What you'll see",
    title: "The kind of data you'll get",
    items: [
      { label: "Your customers", text: "Personas, real customer quotes and the phrases they actually use.", tabs: ["research"] },
      { label: "Your market", text: "A picture of your competitors and how you compare.", tabs: ["research"] },
      { label: "Your ads", text: "A breakdown and grade for each ad, plus a strategy audit across all of them.", tabs: ["intelligence"] },
      {
        label: "New ideas",
        text: "Weekly concepts in five types: Iterations, Format Flips, Inspired, Big Swings and Net-new.",
        tabs: ["weekly"],
      },
      { label: "Ready to use", text: "Hooks, headlines, primary text, static ads, briefs, scripts and a monthly look back.", tabs: ["library", "generate", "monthly"] },
    ],
    image: null,
  },
  {
    id: "tabs-setup",
    eyebrow: "Tour of the tabs · 1 of 2",
    title: "Set up and understand",
    items: [
      { label: "Accounts", text: "Your connected Meta ad accounts.", tabs: ["brands"] },
      { label: "Products", text: "Add and edit the products we build strategy for.", tabs: ["products"] },
      { label: "Insights", text: "Each analyzed ad, with its hook, angle and why it works, plus the strategy audit.", tabs: ["intelligence"] },
      { label: "Monthly Review", text: "Each month's launched concepts, the winners, and what the winners had in common.", tabs: ["monthly"] },
      { label: "Research", text: "Personas, customer language, brand deep dive and competitors. Click Run Research to refresh it.", tabs: ["research"] },
    ],
    image: null,
  },
  {
    id: "tabs-create",
    eyebrow: "Tour of the tabs · 2 of 2",
    title: "Create and plan",
    items: [
      { label: "Library", text: "Hooks, Headlines and Primary Text written for each persona.", tabs: ["library"] },
      { label: "Generate", text: "Make static image ads, video scripts and creative briefs.", tabs: ["generate"] },
      { label: "Inspiration", text: "Upload ads you like and get versions adapted to your brand.", tabs: ["inspiration"] },
      { label: "Weekly Strategy", text: "This week's concept cards. Approve the ones you want to brief.", tabs: ["weekly"] },
      { label: "AI Models", text: "Pick your preferred models and compare their results.", tabs: ["models"] },
    ],
    image: null,
  },
  {
    id: "feedback",
    eyebrow: "Better results",
    title: "Teach it your taste",
    intro: "Your feedback shapes what you get next. A few clicks go a long way.",
    items: [
      { label: "Library", text: "Approve the copy you like and archive what you don't. New copy learns from both.", tabs: ["library"] },
      {
        label: "Weekly Strategy",
        text: "Approve or dismiss concepts. It remembers the last 4 weeks, so it won't repeat ideas or go back to ones you dismissed.",
        tabs: ["weekly"],
      },
      { label: "Generate", text: "Give static ads a thumbs up or down. Future statics take it into account.", tabs: ["generate"] },
      { label: "Inspiration", text: "Upload reference ads you love to get on-brand takes on them.", tabs: ["inspiration"] },
    ],
    image: null,
  },
  {
    id: "compound",
    eyebrow: "Better results",
    title: "It gets smarter over time",
    items: [
      {
        label: "Brand learnings build up",
        text: "Once you have about 8 or more ads with $250+ spend that have run for 7+ days, we start learning what works for your brand. Results keep improving from there.",
      },
      {
        label: "Keep research current",
        text: "Run Research again whenever your product, positioning or reviews change.",
        tabs: ["research"],
      },
      {
        label: "Start with the basics",
        text: "Connect Meta and add your product URL. Everything else follows.",
      },
    ],
    image: null,
  },
];

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const SPOTLIGHT_PAD = 5;

/** Sidebar tabs a screen talks about: every tab its bullets link to, in nav order. */
function screenTabs(screen) {
  return [...new Set((screen?.items || []).flatMap((item) => item.tabs || []))];
}

/**
 * Screen-space boxes of the sidebar nav buttons (CreativeStrategyLayout marks
 * them with data-cs-nav), re-measured on resize so the spotlight stays on them.
 */
function useNavRects(tabs) {
  const key = tabs.join(",");
  const [rects, setRects] = useState([]);
  useEffect(() => {
    const measure = () => {
      setRects(key ? key.split(",").map((tab) => {
        const element = document.querySelector(`[data-cs-nav="${tab}"]`);
        const box = element?.getBoundingClientRect();
        return box && box.width > 0 ? { tab, x: box.left, y: box.top, w: box.width, h: box.height } : null;
      }).filter(Boolean) : []);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [key]);
  return rects;
}

/** Dark overlay with lit cut-outs around the highlighted tabs and an arrow pointing at them. */
function Spotlight({ rects, focusTabs }) {
  const focused = focusTabs.length ? rects.filter((rect) => focusTabs.includes(rect.tab)) : rects;
  const target = focused.length ? focused : rects;
  const arrow = target.length ? {
    x: Math.max(...target.map((rect) => rect.x + rect.w)) + 14,
    y: (Math.min(...target.map((rect) => rect.y)) + Math.max(...target.map((rect) => rect.y + rect.h))) / 2,
  } : null;
  return (
    <>
      <svg className="cs-onboarding-spotlight" aria-hidden="true" width="100%" height="100%">
        <defs>
          <mask id="cs-onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {rects.map((rect) => (
              <rect key={rect.tab} x={rect.x - SPOTLIGHT_PAD} y={rect.y - SPOTLIGHT_PAD} width={rect.w + SPOTLIGHT_PAD * 2}
                height={rect.h + SPOTLIGHT_PAD * 2} rx="18" fill="black" className="cs-onboarding-spotlight__hole" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(12, 10, 9, 0.62)" mask="url(#cs-onboarding-mask)" />
        {rects.map((rect) => (
          <rect key={rect.tab} x={rect.x - SPOTLIGHT_PAD} y={rect.y - SPOTLIGHT_PAD} width={rect.w + SPOTLIGHT_PAD * 2}
            height={rect.h + SPOTLIGHT_PAD * 2} rx="18" fill="none"
            className={cn("cs-onboarding-spotlight__ring", target.includes(rect) && "is-focused")} />
        ))}
      </svg>
      {arrow && (
        <div className="cs-onboarding-arrow" style={{ left: arrow.x, top: arrow.y }} aria-hidden="true">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </div>
      )}
    </>
  );
}
Spotlight.propTypes = { rects: PropTypes.array.isRequired, focusTabs: PropTypes.array.isRequired };

export default function CreativeStrategyOnboarding({ onFinish, screens = CREATIVE_STRATEGY_ONBOARDING_SCREENS }) {
  const [index, setIndex] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null);
  const dialogRef = useRef(null);
  const nextRef = useRef(null);
  const total = screens.length;
  const screen = screens[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const rects = useNavRects(screenTabs(screen));
  const spotlit = rects.length > 0;
  useEffect(() => setHoveredItem(null), [index]);

  const goNext = useCallback(() => {
    if (isLast) onFinish();
    else setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onFinish, total]);
  const goBack = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Keep keyboard focus on the primary action as screens change.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  // Unskippable: swallow Escape (so nothing underneath reacts to it) and trap
  // Tab inside the dialog so the page behind can't be reached.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  if (!screen) return null;

  return (
    <div className={cn("cs-onboarding-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4", spotlit && "is-spotlit")}>
      <Spotlight rects={rects} focusTabs={hoveredItem?.tabs || []} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cs-onboarding-title"
        className="cs-onboarding relative flex max-h-[calc(100vh-32px)] w-[920px] max-w-full flex-col overflow-hidden"
      >
        {/* Step count + progress */}
        <div className="flex items-center justify-between gap-4 px-8 pt-7 max-md:px-5 max-md:pt-5">
          <span className="cs-onboarding__step" aria-live="polite">
            Step {index + 1} of {total}
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {screens.map((s, i) => (
              <span
                key={s.id}
                className={cn("cs-onboarding__dot", i === index && "is-active", i < index && "is-done")}
              />
            ))}
          </div>
        </div>

        {/* Body: text left, image right (stacked on small screens) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 max-md:px-5">
          <div key={screen.id} className="cs-onboarding__swap grid items-center gap-8 md:min-h-[420px] md:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div className="min-w-0 max-md:order-2">
              {screen.eyebrow && <p className="cs-onboarding__eyebrow">{screen.eyebrow}</p>}
              <h2 id="cs-onboarding-title" className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.03em] text-[var(--cs-ink)] max-md:text-[22px]">
                {screen.title}
              </h2>
              {screen.intro && <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{screen.intro}</p>}
              {screen.items?.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {screen.items.map((item, i) => (
                    <li
                      key={i}
                      onMouseEnter={() => item.tabs && setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={cn("flex gap-2.5 text-[14px] leading-snug text-neutral-700", item.tabs && "cs-onboarding__linked-item")}
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--cs-orange-ink)]" aria-hidden="true" />
                      <span>
                        {item.label && <span className="font-semibold text-[var(--cs-ink)]">{item.label}. </span>}
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {screen.footnote && <p className="cs-onboarding__note mt-5">{screen.footnote}</p>}
            </div>

            {/* Fixed 4:3 image frame — set `image` on the screen to fill it. */}
            <div className="cs-onboarding__media aspect-[4/3] w-full max-md:order-1" data-screen={screen.id}>
              {screen.image && <img src={screen.image} alt="" className="h-full w-full object-cover" />}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 border-t border-[rgba(108,52,3,0.16)] px-8 py-5 max-md:px-5">
          <button
            type="button"
            onClick={goBack}
            disabled={isFirst}
            className={cn("cs-onboarding__back", isFirst && "invisible")}
          >
            Back
          </button>
          <button ref={nextRef} type="button" onClick={goNext} className="cs-primary-button min-w-[140px]">
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

CreativeStrategyOnboarding.propTypes = {
  onFinish: PropTypes.func.isRequired,
  screens: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      eyebrow: PropTypes.string,
      title: PropTypes.string.isRequired,
      intro: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, text: PropTypes.string.isRequired, tabs: PropTypes.arrayOf(PropTypes.string) })),
      footnote: PropTypes.string,
      image: PropTypes.string,
    }),
  ),
};
