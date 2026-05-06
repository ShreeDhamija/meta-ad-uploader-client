import Powerup1 from "@/assets/Poweurp1.webp"
import AnalyticsPopup from "@/assets/AnalyticsPopup.webp"

// Add a new card by appending an entry below. The wizard will pick it up
// automatically. Only existing users with `id` not in `effectiveSeenIds`
// will be shown the new card.
export const ONBOARDING_CARDS = [
    {
        id: "postId",
        title: "Post ID",
        image: Powerup1,
        heading: "Post ID Scaling",
        body: "Scale winning organic or paid posts by their Post ID across ad sets without losing social proof.",
    },
    {
        id: "igScaling",
        title: "Instagram Scaling",
        image: Powerup1,
        heading: "Instagram Scaling",
        body: "You can upload all your media once and choose to split the media into different ad sets with different ad naming, copy and every other field available.",
    },
    {
        id: "splitAdData",
        title: "Split Ad Data",
        image: Powerup1,
        heading: "Split Ad Data Across Media Files",
        body: "Upload all your media once and split it into different ad sets with different ad naming, copy and every other field available.",
    },
    {
        id: "aiGrouping",
        title: "AI Grouping",
        image: Powerup1,
        heading: "AI Auto Grouping",
        body: "Group related creatives automatically. We detect variants of the same concept and pair them so your ads stay tidy.",
    },
    {
        id: "jobQueueing",
        title: "Job Queueing",
        image: Powerup1,
        heading: "Job Queueing",
        body: "Queue as many ad launches as you want without waiting for any single job to finish.",
    },
    {
        id: "analytics",
        title: "Analytics",
        image: AnalyticsPopup,
        heading: "Introducing Analytics",
        body: "We took the playbook behind $3M/month in ad spend and put it in your hands. Review recommendations and apply them in one click.",
    },
]

export const ONBOARDING_CARD_IDS = ONBOARDING_CARDS.map((c) => c.id)

// Maps legacy per-feature flags onto the new card IDs so existing users
// who already saw a feature popup don't see it again in the wizard.
export const LEGACY_FLAG_TO_CARD_ID = {
    hasSeenPowerupPopup: "splitAdData",
    hasSeenAnalyticsHomePopup: "analytics",
}
