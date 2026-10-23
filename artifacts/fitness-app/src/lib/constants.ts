export const WEEKLY_SCHEDULE = [
  { day: 0, label: "Sunday", workout: "Full rest", rest: true },
  { day: 1, label: "Monday", workout: "Lean Mean Aerobics (6:30pm) + 10 min arm circuit after", rest: false },
  { day: 2, label: "Tuesday", workout: "Leg Day Cardio Blast (6:30pm)", rest: false },
  { day: 3, label: "Wednesday", workout: "360 Core & Upper Body (6:30pm)", rest: false },
  { day: 4, label: "Thursday", workout: "REST or 30-min brisk walk", rest: true },
  { day: 5, label: "Friday", workout: "Die-Hard Leg Day (6:30pm)", rest: false },
  { day: 6, label: "Saturday", workout: "30-min fasted walk + 15-min home arm workout", rest: false },
];

export const FITNESS_PLANS = [
  {
    id: "workout",
    title: "Workout Structure",
    description: "6 days active, 1 day full rest",
    details: [
      "Mon: Lean Mean Aerobics + Arms",
      "Tue: Leg Day Cardio Blast",
      "Wed: 360 Core & Upper Body",
      "Thu: Active Recovery (Walk)",
      "Fri: Die-Hard Leg Day",
      "Sat: Fasted Walk + Home Arms",
      "Sun: Full Rest"
    ]
  },
  {
    id: "diet",
    title: "Diet Rules",
    description: "High protein, consistent caloric deficit",
    details: [
      "Zero biscuits or empty carbs",
      "Minimum 120g protein daily",
      "2-3L water minimum",
      "Caloric target: 1600-1800kcal depending on phase"
    ]
  },
  {
    id: "targets",
    title: "Body Targets",
    description: "90kg to 75kg in 90 days",
    details: [
      "Start: 90kg",
      "Goal: 75kg",
      "Pace: ~1.2kg per week",
      "Focus: Fat loss while preserving lean mass"
    ]
  },
  {
    id: "plateau",
    title: "Plateau Fix",
    description: "When weight stalls for 7+ days",
    details: [
      "1. Drop calories by 100",
      "2. Increase steps by 2,000",
      "3. Strict water compliance",
      "4. Ensure sleep > 7 hours"
    ]
  },
  {
    id: "phases",
    title: "90-Day Phases",
    description: "Progression over 3 months",
    details: [
      "Days 1-30: Habit building & rapid water weight loss",
      "Days 31-60: True fat burning & strength maintenance",
      "Days 61-90: Final push & metabolic adaptation"
    ]
  }
];
