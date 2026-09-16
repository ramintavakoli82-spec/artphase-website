export const engineeringNoteCategories = [
  {
    label: 'Motor Control',
    slug: 'motor-control',
    contentCategories: ['VFDs & Motors'],
  },
  {
    label: 'VFD & Drives',
    slug: 'vfd-drives',
    contentCategories: ['VFDs & Motors', 'VFDs & Harmonics'],
  },
  {
    label: 'Power Quality',
    slug: 'power-quality',
    contentCategories: ['VFDs & Harmonics'],
  },
  {
    label: 'MCC & Control Panels',
    slug: 'mcc-control-panels',
    contentCategories: [],
  },
  {
    label: 'Industrial Power',
    slug: 'industrial-power',
    contentCategories: [],
  },
] as const;

export const siteConfig = {
  author: 'ARTPHASE',
  title: 'ARTPHASE',
  shortTitle: 'Engineering Notes',

  tagline:
    'Practical investigations in motor control, VFDs, power quality and industrial electrical design.',

  description:
    'A collection of practical engineering notes, investigations, calculations and design observations developed from real-world industrial electrical engineering experience.',

  domain: 'https://artphase.ca',

  analytics: {
    provider: 'Umami Cloud',
    websiteId: '4b095ae7-19cd-4af6-bb36-a3403195cd0b',
    scriptUrl: 'https://cloud.umami.is/script.js',
    domains: ['artphase.ca', 'www.artphase.ca'],
  },

  navigation: {
    home: { label: 'Home', href: '/' },
    sections: [
      {
        label: 'Engineering Notes',
        items: engineeringNoteCategories.map(({ label, slug }) => ({
          label,
          href: `/engineering-notes/?category=${slug}`,
          category: slug,
        })),
      },
      {
        label: 'Engineering Tools',
        items: [
          { label: 'Drive System Analyzer' },
          { label: 'Thermal Analyzer' },
          { label: 'Future Tools' },
        ],
      },
      {
        label: 'Resources',
        items: [
          { label: 'Calculations' },
          { label: 'References' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
      },
    ],
  },

  footerNavigation: [
    { label: 'Engineering Notes', href: '/engineering-notes' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy', href: '/privacy' },
  ],

  social: {
    linkedin: '',
  },
};
