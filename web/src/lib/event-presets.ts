import type { EventType } from "@/types";

/**
 * Per event-type accent colour presets.
 */
export const EVENT_ACCENT: Record<EventType, string> = {
  wedding:   "#B76E79", // rose-gold
  trip:      "#FF6B4A", // sunset orange
  party:     "#FF3CAC", // vibrant pink
  birthday:  "#FFB703", // golden yellow
  family:    "#7FB77E", // gentle green
  college:   "#6C63FF", // indigo
  corporate: "#2B4C6F", // navy
};

/**
 * Default moment names seeded automatically when an event is created.
 */
export const EVENT_DEFAULT_MOMENTS: Record<EventType, string[]> = {
  wedding:   ["Haldi", "Mehendi", "Sangeet", "Wedding", "Reception"],
  trip:      ["Day 1", "Day 2", "Day 3"],
  party:     ["Arrival", "Party", "Afterparty"],
  birthday:  ["Arrival", "Cake Cutting", "Party"],
  family:    ["Morning", "Evening", "Dinner"],
  college:   ["Day 1", "Day 2", "Day 3", "Farewell"],
  corporate: ["Registration", "Sessions", "Networking", "Dinner"],
};
