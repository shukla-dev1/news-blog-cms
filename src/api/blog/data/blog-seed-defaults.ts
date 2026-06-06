import type { BlogCronJobKey } from '../../blog-cron-job/services/blog-cron-job';

export const DEFAULT_TRENDING_TOPIC_SEEDS = [
  {
    topicId: 'heatwave-power-2026',
    title: 'Severe heatwave and power crisis',
    keyDetails:
      'Temperatures hit 45–48°C in North and Central India, record power demand, widespread outages and water shortages.',
    whyHot:
      'Immediate national crisis affecting daily life, economy, and public health.',
    suggestedAngles: [
      { angle: 'Impact on informal workers in urban areas' },
      { angle: 'Failing urban infrastructure and grid capacity' },
      { angle: 'Public health risks and heatstroke prevention' },
    ],
    isActive: true,
    region: 'IN',
    sortOrder: 0,
  },
  {
    topicId: 'cockroach-janta-party',
    title: 'The Cockroach Janta Party movement',
    keyDetails:
      'Satirical online movement with 22M+ Instagram followers; debates on free speech and youth political dissent.',
    whyHot:
      "Unique digital-age expression of frustration among India's youth on unemployment and governance.",
    suggestedAngles: [
      { angle: 'Gen Z satire as political commentary' },
      { angle: 'Free speech vs platform moderation in India' },
      { angle: 'Youth unemployment and economic anxiety' },
    ],
    isActive: true,
    region: 'IN',
    sortOrder: 1,
  },
  {
    topicId: 'ipl-2026-playoffs',
    title: 'IPL 2026 playoffs fever',
    keyDetails:
      'IPL at peak; Royal Challengers Bengaluru in the final; Vaibhav Sooryavanshi breakout sensation.',
    whyHot: "India's biggest sporting event dominates entertainment and social media.",
    suggestedAngles: [
      { angle: 'Vaibhav Sooryavanshi and the next generation of stars' },
      { angle: "RCB's road to the final — fan culture and narrative" },
      { angle: 'What IPL 2026 means for Indian cricket economics' },
    ],
    isActive: true,
    region: 'IN',
    sortOrder: 2,
  },
  {
    topicId: 'stray-dog-debate',
    title: 'Stray dog menace and public safety debate',
    keyDetails:
      'Hyderabad airport dog video reignited debate; ~52 million stray dogs nationally; Supreme Court involvement.',
    whyHot:
      'Persistent public safety vs animal rights dilemma involving municipalities and courts.',
    suggestedAngles: [
      { angle: 'Municipal policy and sterilization programmes' },
      { angle: 'Legal mandates and Supreme Court stance explained' },
      { angle: 'Community safety vs humane animal management' },
    ],
    isActive: true,
    region: 'IN',
    sortOrder: 3,
  },
] as const;

export interface CronJobSeed {
  jobKey: BlogCronJobKey;
  label: string;
  enabled: boolean;
  cronRule: string;
  timezone: string;
  topic?: string;
  publishImmediately?: boolean;
  delayHours?: number;
  minIntervalHours?: number;
  blogAuthorSlug?: string;
  breadcrumbName?: string;
  categoryName?: string;
}

export const DEFAULT_CRON_JOB_SEEDS: CronJobSeed[] = [
  {
    jobKey: 'publish_scheduled',
    label: 'Publish scheduled blogs',
    enabled: true,
    cronRule: '*/1 * * * *',
    timezone: 'Asia/Kolkata',
  },
  {
    jobKey: 'generate_basic',
    label: 'Basic AI blog generate',
    enabled: false,
    cronRule: '0 9 * * 1',
    timezone: 'Asia/Kolkata',
    topic: '',
    publishImmediately: false,
    delayHours: 0,
  },
  {
    jobKey: 'generate_enhanced',
    label: 'Enhanced trending blog generate',
    enabled: false,
    cronRule: '0 9 * * 1',
    timezone: 'Asia/Kolkata',
    publishImmediately: false,
    delayHours: 24,
    minIntervalHours: 72,
  },
  {
    jobKey: 'generate_quick',
    label: 'Quick on-demand blog generate',
    enabled: false,
    cronRule: '* * * * *',
    timezone: 'Asia/Kolkata',
    publishImmediately: false,
    delayHours: 0,
    minIntervalHours: 0,
  },
];
