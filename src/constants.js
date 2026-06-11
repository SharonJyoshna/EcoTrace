/**
 * constants.js
 * Central store for emission factors, colour palette, and static data.
 * Sources:
 *  - BEIS UK Greenhouse Gas Conversion Factors 2023
 *  - IPCC AR6 (food lifecycle data)
 *  - Our World in Data carbon footprint database
 */

"use strict";

/* ------------------------------------------------------------------
   Emission factors (kg CO₂e per unit unless noted)
   ------------------------------------------------------------------ */
const EMISSION_FACTORS = Object.freeze({
  transport: {
    car_petrol:            0.21,   // kg CO₂e / km
    car_diesel:            0.17,
    car_electric:          0.05,
    motorcycle:            0.11,
    bus:                   0.089,
    train:                 0.041,
    flight_domestic:       0.255,  // per km (one-way)
    flight_international:  0.195,  // per km (one-way)
  },
  energy: {
    electricity:  0.233,  // kg CO₂e / kWh  (UK grid 2023)
    natural_gas:  2.04,   // kg CO₂e / m³
    lpg:          1.63,
    coal:         2.42,
    solar:        0,
    wind:         0,
  },
  food: {
    beef:        27.0,   // kg CO₂e / kg food
    lamb:        39.2,
    pork:        12.1,
    chicken:      6.9,
    fish:         6.1,
    dairy:        3.2,
    eggs:         4.8,
    vegetables:   2.0,
    fruits:       1.1,
    vegan:        1.5,
  },
  lifestyle: {
    new_clothing:     10,    // kg CO₂e / item
    streaming_hour:   0.036, // kg CO₂e / hr
    smartphone_year:  70,    // kg CO₂e / device / yr (embodied)
    laptop_year:      300,
    flight_holiday:   1.5,   // tCO₂e / return long-haul
  },
});

/* ------------------------------------------------------------------
   Category colours (used consistently across charts & UI)
   ------------------------------------------------------------------ */
const CATEGORY_COLORS = Object.freeze({
  transport: "#639922",
  energy:    "#1D9E75",
  food:      "#BA7517",
  lifestyle: "#D85A30",
});

/* ------------------------------------------------------------------
   Category icons
   ------------------------------------------------------------------ */
const CATEGORY_ICONS = Object.freeze({
  transport: "🚗",
  energy:    "⚡",
  food:      "🍽️",
  lifestyle: "🛍️",
});

/* ------------------------------------------------------------------
   Benchmark values (tCO₂e per person per year)
   ------------------------------------------------------------------ */
const BENCHMARKS = Object.freeze({
  world_average:  4.7,
  uk_average:     5.4,
  eu_average:     6.8,
  india_average:  1.9,
  paris_2030:     2.3,   // target per capita for 1.5 °C pathway
  net_zero_2050:  0.0,
});

/* ------------------------------------------------------------------
   Action catalogue — each entry is fully self-contained
   ------------------------------------------------------------------ */
const ACTIONS_CATALOGUE = Object.freeze([
  { id: 1,  category: "transport", title: "Use public transport twice a week",         description: "Replace 2 car trips per week with bus or train.",                                              saving: 0.30, effort: "low",    impact: "high"   },
  { id: 2,  category: "transport", title: "Walk or cycle for trips under 2 km",         description: "Short car trips pollute disproportionately — cold engines burn more fuel.",                   saving: 0.20, effort: "low",    impact: "medium" },
  { id: 3,  category: "transport", title: "Try one car-free month",                     description: "Challenge yourself to avoid the car for a full month.",                                        saving: 0.15, effort: "medium", impact: "medium" },
  { id: 4,  category: "energy",    title: "Switch to a renewable energy tariff",        description: "Many suppliers offer 100% renewable electricity at no premium.",                               saving: 0.50, effort: "low",    impact: "high"   },
  { id: 5,  category: "energy",    title: "Install a smart thermostat",                 description: "Reduces heating bills by 10–15% and cuts gas use significantly.",                             saving: 0.30, effort: "medium", impact: "high"   },
  { id: 6,  category: "energy",    title: "Replace all bulbs with LEDs",                description: "LED bulbs use 75% less energy than traditional incandescents.",                               saving: 0.10, effort: "low",    impact: "low"    },
  { id: 7,  category: "food",      title: "Go meat-free one day a week",                description: "Cutting beef and lamb consumption is one of the highest-impact dietary changes.",             saving: 0.50, effort: "low",    impact: "high"   },
  { id: 8,  category: "food",      title: "Reduce food waste",                          description: "Plan meals weekly, use leftovers, and compost scraps.",                                       saving: 0.20, effort: "medium", impact: "medium" },
  { id: 9,  category: "food",      title: "Choose local and seasonal produce",          description: "Imported out-of-season produce has a much higher carbon footprint.",                          saving: 0.15, effort: "low",    impact: "medium" },
  { id: 10, category: "lifestyle", title: "Buy second-hand clothing",                   description: "Fast fashion has a huge environmental cost — second-hand reduces this dramatically.",         saving: 0.20, effort: "low",    impact: "medium" },
  { id: 11, category: "lifestyle", title: "Repair rather than replace electronics",     description: "Extending the life of electronics and appliances saves significant embodied carbon.",         saving: 0.30, effort: "medium", impact: "high"   },
  { id: 12, category: "lifestyle", title: "Reduce streaming to standard definition",    description: "HD streaming uses 3× more data than SD — small habit, meaningful over time.",                saving: 0.05, effort: "low",    impact: "low"    },
]);

/* ------------------------------------------------------------------
   Learn articles
   ------------------------------------------------------------------ */
const LEARN_ARTICLES = Object.freeze([
  {
    id: "what-is-carbon-footprint",
    title: "What is a carbon footprint?",
    icon: "🌍",
    readTime: "3 min",
    content: "A carbon footprint is the total amount of greenhouse gases — primarily carbon dioxide and methane — generated by our actions. The average global carbon footprint is around 4.7 tonnes of CO₂ equivalent per person per year. To avoid the worst impacts of climate change, we need to reduce this to under 2 tonnes by 2050.",
  },
  {
    id: "why-transport-matters",
    title: "Why transport matters",
    icon: "🚗",
    readTime: "4 min",
    content: "Transport accounts for about 27% of global CO₂ emissions. Private cars are the biggest contributor, with aviation a close second. Switching to electric vehicles, public transport, cycling, or walking can dramatically cut your personal footprint. A return flight from London to New York emits roughly 1.7 tonnes of CO₂ per passenger.",
  },
  {
    id: "food-and-climate",
    title: "Food and the climate",
    icon: "🍽️",
    readTime: "5 min",
    content: "The global food system is responsible for about 26% of greenhouse gas emissions. Beef and lamb have the highest footprint — producing 1 kg of beef emits around 60 kg of CO₂ equivalent, compared to just 1.6 kg for vegetables. Choosing a plant-rich diet is one of the most impactful personal changes you can make.",
  },
  {
    id: "home-energy",
    title: "Home energy and heating",
    icon: "⚡",
    readTime: "4 min",
    content: "Heating and cooling homes accounts for around 13% of UK greenhouse gas emissions. Switching to a heat pump, improving insulation, and moving to a renewable electricity tariff are among the most effective actions. The average UK home emits about 2.4 tonnes of CO₂ from energy use annually.",
  },
  {
    id: "carbon-offsets",
    title: "Understanding carbon offsets",
    icon: "🌱",
    readTime: "4 min",
    content: "Carbon offsets allow you to compensate for unavoidable emissions by funding projects that reduce CO₂ elsewhere — like reforestation or renewable energy. However, they should not replace direct reductions. Look for certified offsets (Gold Standard, VCS) and treat offsetting as a supplement, not a substitute.",
  },
  {
    id: "paris-target",
    title: "The 1.5°C target explained",
    icon: "🌡️",
    readTime: "5 min",
    content: "The Paris Agreement set a goal of limiting global warming to 1.5°C above pre-industrial levels. Each additional 0.5°C dramatically increases the risk of extreme weather, sea level rise, and ecosystem collapse. To stay within 1.5°C, global emissions need to reach net zero by around 2050.",
  },
]);