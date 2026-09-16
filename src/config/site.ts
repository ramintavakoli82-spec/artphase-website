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
        items: [
          { label: 'Motor Control', href: '/engineering-notes' },
          { label: 'VFD & Drives', href: '/engineering-notes' },
          { label: 'Power Quality', href: '/engineering-notes' },
          { label: 'MCC & Control Panels', href: '/engineering-notes' },
          { label: 'Industrial Power', href: '/engineering-notes' },
        ],
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
          { label: 'Calculations', href: '/engineering-notes' },
          { label: 'References', href: '/engineering-notes' },
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
