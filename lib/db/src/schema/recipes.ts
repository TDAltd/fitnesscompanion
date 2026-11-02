import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Recipes added by an admin (typed in, uploaded from a spreadsheet or document, or synced from a
 * dietitian's Google Sheet). They sit alongside the built-in recipe library. Macros are per serving.
 */
export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Breakfast, Lunch, Dinner, Snack or Fruit */
  category: text("category").notNull().default("Lunch"),
  /** Nigerian, International or Any */
  cuisine: text("cuisine").notNull().default("Nigerian"),
  prepMins: integer("prep_mins"),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  /** Optional photo as a data URL (resized in the browser to about 100 KB), kept in the database so updates don't lose it */
  photo: text("photo"),
  hidden: boolean("hidden").notNull().default(false),
  /** manual, file, document or sheet */
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RecipeRow = typeof recipesTable.$inferSelect;
