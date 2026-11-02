/**
 * Food cautions from the health answers in setup.
 * - Pregnancy: foods usually advised against are left out of suggestions and labelled in search.
 * - Diabetes: very sugary foods and drinks are left out of suggestions (still searchable).
 * Nothing is blocked: people can always log what they actually ate.
 */

const PREGNANCY_AVOID =
  /\b(beer|wine|palm wine|stout|alcohol|spirits?|gin|whisk(?:e)?y|liver|fura|nono|unpasteuri[sz]ed|raw milk|wara|sushi|raw fish|shark|swordfish|marlin|king mackerel)\b/i;

const PREGNANCY_CARE: [RegExp, string][] = [
  [/\bfried egg\b|\bsoft[- ]boiled\b|\brunny\b/i, "Cook the yolk until firm"],
  [/\btuna\b/i, "Fine in moderation: up to 4 tins a week"],
  [/\b(tea|coffee|energy drink)\b/i, "Keep caffeine under 200 mg a day"],
];

const HIGH_SUGAR =
  /\b(puff-puff|chin chin|doughnuts?|donuts?|biscuits?|cookies?|ice cream|sweets|candy|chocolate|soft drinks?|soda|coke|fanta|malt drink|juice|zobo|kunu|sugar)\b/i;

export type Caution = { hide: boolean; note: string | null };

export function foodCaution(name: string, flags: readonly string[] | null | undefined, ingredients: string[] = []): Caution {
  const f = new Set(flags ?? []);
  const text = `${name} ${ingredients.join(" ")}`;
  if (f.has("pregnant")) {
    if (PREGNANCY_AVOID.test(text)) return { hide: true, note: "Usually avoided in pregnancy" };
    const care = PREGNANCY_CARE.find(([re]) => re.test(text));
    if (care) return { hide: false, note: care[1] };
  }
  if (f.has("diabetes") && HIGH_SUGAR.test(text)) return { hide: true, note: "High in sugar" };
  if (f.has("breastfeeding") && /\b(beer|wine|palm wine|stout|alcohol|spirits?|gin)\b/i.test(text)) {
    return { hide: true, note: "Alcohol passes into breast milk" };
  }
  return { hide: false, note: null };
}
