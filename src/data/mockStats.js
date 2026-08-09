/**
 * Mock dashboard statistics. Derived from the mock jobs but kept as a separate
 * file so the dashboard doesn't need to recalculate on every render.
 * Replace with real API aggregation when the backend is ready.
 */

export const DASHBOARD_STATS = {
  total: 15,
  wishlist: 4,
  applied: 4,
  interview: 3,
  offer: 2,
  rejected: 2,
}

/** Applications per day for the last 7 days (Mon → Sun). */
export const WEEKLY_TREND = [
  { day: 'Mon', count: 2 },
  { day: 'Tue', count: 1 },
  { day: 'Wed', count: 3 },
  { day: 'Thu', count: 0 },
  { day: 'Fri', count: 4 },
  { day: 'Sat', count: 1 },
  { day: 'Sun', count: 2 },
]

export const UPCOMING_INTERVIEWS = [
  {
    id: 'int-1',
    company: 'Stripe',
    companyIcon: '💳',
    position: 'Senior Frontend Engineer',
    date: '2026-08-14',
    time: '10:00 AM PST',
    type: 'On-site',
    notes: 'Final round with VP of Engineering',
  },
  {
    id: 'int-2',
    company: 'GitHub',
    companyIcon: '🐙',
    position: 'Staff Engineer, UI Platform',
    date: '2026-08-12',
    time: '2:00 PM PST',
    type: 'Video call',
    notes: 'System design interview',
  },
  {
    id: 'int-3',
    company: 'Shopify',
    companyIcon: '🛍️',
    position: 'Senior React Developer',
    date: '2026-08-16',
    time: '11:30 AM EST',
    type: 'Video call',
    notes: 'Panel round with team leads',
  },
]

export const RECENT_ACTIVITY = [
  {
    id: 'act-1',
    action: 'offer_received',
    description: 'Received offer from Tailwind Labs',
    company: 'Tailwind Labs',
    timestamp: '2026-08-08T14:30:00',
  },
  {
    id: 'act-2',
    action: 'status_change',
    description: 'Moved Shopify to interview stage',
    company: 'Shopify',
    timestamp: '2026-08-07T16:45:00',
  },
  {
    id: 'act-3',
    action: 'applied',
    description: 'Applied to Cloudflare',
    company: 'Cloudflare',
    timestamp: '2026-08-06T09:15:00',
  },
  {
    id: 'act-4',
    action: 'rejected',
    description: 'Rejected by Airbnb after final round',
    company: 'Airbnb',
    timestamp: '2026-08-05T11:00:00',
  },
  {
    id: 'act-5',
    action: 'applied',
    description: 'Applied to Atlassian via recruiter',
    company: 'Atlassian',
    timestamp: '2026-08-05T08:20:00',
  },
  {
    id: 'act-6',
    action: 'interview_scheduled',
    description: 'Interview scheduled with GitHub',
    company: 'GitHub',
    timestamp: '2026-08-04T15:10:00',
  },
  {
    id: 'act-7',
    action: 'offer_received',
    description: 'Received offer from Figma',
    company: 'Figma',
    timestamp: '2026-08-03T10:00:00',
  },
  {
    id: 'act-8',
    action: 'applied',
    description: 'Applied to Spotify',
    company: 'Spotify',
    timestamp: '2026-08-03T09:00:00',
  },
]
