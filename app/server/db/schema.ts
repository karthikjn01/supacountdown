import { relations, sql } from "drizzle-orm";
import { AnyPgColumn, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string', }).defaultNow().notNull().$onUpdate(() => sql`now()`),
  name: text(),
  avatar_url: text(),
  game_id: uuid("game_id").references(() => gameSession.id),
});

export const userRelations = relations(user, ({ one, many }) => ({
  game: one(gameSession, {
    fields: [user.game_id],
    references: [gameSession.id],
  }),
  submissions: many(submission),
  rounds: many(gameRound),
}));

export type GameStage = "lobby" | "round" | "results" | "finished";

export const gameSession = pgTable("game_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string', }).defaultNow().notNull().$onUpdate(() => sql`now()`),
  joinable_id: text("joinable_id")
    .notNull()
    .unique()
    .default(
      sql`floor(random() * (99999999-10000000+1) + 10000000)::text`
    ),
  stage: text("stage").$type<GameStage>().default("lobby"),
  active_round_id: uuid("active_round_id").references((): AnyPgColumn => gameRound.id),
});

export const gameSessionRelations = relations(gameSession, ({ many, one }) => ({
  rounds: many(gameRound),
  players: many(user),
  activeRound: one(gameRound, {
    fields: [gameSession.active_round_id],
    references: [gameRound.id],
  }),
}));

export const submission = pgTable("submission", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string', }).defaultNow().notNull().$onUpdate(() => sql`now()`),
  round_id: uuid("round_id").references(() => gameRound.id),
  player_id: uuid("player_id").references(() => user.id),
  number: integer("number"),
  method: text("method"),
  score: integer("score"),
});

export const submissionRelations = relations(submission, ({ one }) => ({
  round: one(gameRound, {
    fields: [submission.round_id],
    references: [gameRound.id],
  }),
  player: one(user, {
    fields: [submission.player_id],
    references: [user.id],
  }),
}));

// a table to handle game rounds.
export const gameRound = pgTable("game_round", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string', }).defaultNow().notNull().$onUpdate(() => sql`now()`),
  //the session that the round belongs to. references the game_session table.
  session_id: uuid("session_id").references(() => gameSession.id),
  //the stage of the round.
  stage: text("stage").$type<"round" | "results">().default("round"),
  // a list of generated numbers for the round.
  numbers: integer("numbers").array(),
  //target number for the round.
  target: integer("target"),
});

export const gameRoundRelations = relations(gameRound, ({ many, one }) => ({
  submissions: many(submission),
  session: one(gameSession, {
    fields: [gameRound.session_id],
    references: [gameSession.id],
  }),
}));
