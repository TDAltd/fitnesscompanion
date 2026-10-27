/**
 * Turns an AI-style sentence into a short food name for lists:
 * "A mixed grill platter featuring various cuts of grill" → "Mixed grill platter".
 * Short, normal names pass through unchanged.
 */
export function tidyFoodName(raw: string): string {
  let n = raw.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "");
  if (n.length <= 40 && !/^(a|an|the|this|it is|this is|\d+ (plates?|bowls?|servings?|portions?|cups?) of)\s/i.test(n)) return n;
  n = n.replace(/^(this is|it is|it's|this looks like|looks like)\s+/i, "");
  n = n.replace(/^(a|an|the|some|one|\d+)\s+(plates?|bowls?|servings?|portions?|cups?)\s+of\s+/i, "");
  n = n.replace(/^(a|an|the|some|one)\s+/i, "");
  // Cut at the first descriptive clause
  n = n.split(/\s+(featuring|consisting|served|including|topped|garnished|that|which|along)\b|[,;:(]/i)[0];
  if (n.length > 40) n = n.slice(0, 40).replace(/\s+\S*$/, "");
  n = n.trim();
  return n ? n[0].toUpperCase() + n.slice(1) : raw.slice(0, 40);
}
