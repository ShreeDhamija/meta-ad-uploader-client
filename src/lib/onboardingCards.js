import PostIDImage from "@/assets/onboarding/PostID.webp"
import InstagramImage from "@/assets/onboarding/Instagram.webp"
import SplitAdDataImage from "@/assets/onboarding/SplitAdData.webp"
import AIGroupingImage from "@/assets/onboarding/AIGrouping.webp"
import JobQueueingImage from "@/assets/onboarding/JobQueueing.webp"
import AnalyticsPopup from "@/assets/onboarding/AnalyticsPopup.webp"

// Cards added on/before this date are treated as already-seen for users who
// completed legacy onboarding (hasSeenOnboarding=true). Only future cards
// (addedAt > WIZARD_LAUNCH_DATE) will be surfaced to existing users.
export const WIZARD_LAUNCH_DATE = "2026-05-06"

// Add a new card by appending an entry below with today's date as `addedAt`.
// New users see all cards. Existing users only see cards with
// addedAt > WIZARD_LAUNCH_DATE (i.e. genuinely new since launch).
//Date format is year-month-day
export const ONBOARDING_CARDS = [
    {
        id: "postId",
        title: "Post ID",
        image: PostIDImage,
        heading: "Post ID Scaling",
        body: "Scale winning ads by their Post ID across ad sets without losing social proof.",
        addedAt: "2026-05-06",
        existingUsersOnly: false,
    },
    {
        id: "igScaling",
        title: "Instagram Scaling",
        image: InstagramImage,
        heading: "Instagram Scaling",
        body: "Promote Organic Instagram Posts, Reels and tagged collab posts easily.",
        addedAt: "2026-05-06",
        existingUsersOnly: false,
    },
    {
        id: "splitAdData",
        title: "Split Ad Data",
        image: SplitAdDataImage,
        heading: "Split Ad Data Across Media Files",
        body: "Upload all your media once & split it into different ad sets with different naming, copy & other fields.",
        addedAt: "2026-05-06",
        existingUsersOnly: false,
    },
    {
        id: "aiGrouping",
        title: "AI Grouping",
        image: AIGroupingImage,
        heading: "AI Auto Grouping",
        body: "Automatically group statics of different aspect ratio that belong to the same ad",
        addedAt: "2026-05-06",
        existingUsersOnly: false,
    },
    {
        id: "jobQueueing",
        title: "Job Queueing",
        image: JobQueueingImage,
        heading: "Job Queueing",
        body: "Queue as many ad launches as you want without waiting for any single job to finish.",
        addedAt: "2026-05-06",
        existingUsersOnly: false,
    },
    {
        id: "analytics",
        title: "Analytics",
        image: AnalyticsPopup,
        heading: "Analytics & Recommendations",
        body: "Idenity Winning Creatives, Spend and CPA Anomaly Detection, Smart Budget Recommendations, Account Audits in Slack and more!",
        addedAt: "2026-06-02",
        existingUsersOnly: false,
        singleCardAction: {
            label: "Go to Analytics",
            path: "/analytics",
        },
    },
]

export const ONBOARDING_CARD_IDS = ONBOARDING_CARDS.map((c) => c.id)

// Maps legacy per-feature flags onto the new card IDs so existing users
// who already saw a feature popup don't see it again in the wizard.
export const LEGACY_FLAG_TO_CARD_ID = {
    hasSeenPowerupPopup: "splitAdData",
    hasSeenAnalyticsHomePopup: "analytics",
}
