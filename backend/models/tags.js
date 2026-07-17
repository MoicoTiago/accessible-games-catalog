/**
 * Canonical tag catalog used for seeding, validation, and APIs.
 * Source of truth for the Search page filters.
 */
export const TAG_GROUPS = [
  {
    id: 'accessibility-categories',
    label: 'Accessibility Categories',
    tags: ['Vision', 'Hearing', 'Motor', 'Speech', 'Cognitive']
  },
  {
    id: 'vision',
    label: 'Vision Tags',
    tags: ['Colourblind Mode', 'High Contrast', 'Large Text', 'Screen Reader Friendly']
  },
  {
    id: 'hearing',
    label: 'Hearing Tags',
    tags: ['No Audio Needed', 'Captions', 'Visual Alerts']
  },
  {
    id: 'motor',
    label: 'Motor Tags',
    tags: ['One-Handed', 'Simple Controls', 'No Timed Inputs', 'No Precision Needed']
  },
  {
    id: 'speech',
    label: 'Speech Tags',
    tags: ['No Voice Required']
  },
  {
    id: 'cognitive',
    label: 'Cognitive Tags',
    tags: ['Simple UI', 'Clear Instructions', 'Tutorial Mode', 'Adjustable Difficulty']
  },
  {
    id: 'general-ui',
    label: 'General UI/Gameplay',
    tags: ['Tap Only', 'Hints Available', 'Low Cognitive Load']
  },
  {
    id: 'genres',
    label: 'Genres',
    tags: ['Action', 'Adventure', 'Puzzle', 'Strategy', 'Simulation', 'Casual', 'RPG', 'Platformer', 'Sports', 'Kids']
  }
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export default TAG_GROUPS;

