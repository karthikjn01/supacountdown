import { createServerFn } from '@tanstack/start'
import { and, eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { user, gameSession, gameRound, type GameStage } from '~/server/db/schema'

export const kickPlayer = createServerFn({
    method: 'POST'
})
    .validator((input: { sessionId: string, userId: string }) => input)
    .handler(async (ctx) => {
        const { sessionId, userId } = ctx.data

        await db.transaction(async (tx) => {
            // Delete the user
            await tx
                .delete(user)
                .where(and(eq(user.id, userId), eq(user.game_id, sessionId)))

            // Check if there are any remaining players
            const remainingPlayers = await tx.query.user.findMany({
                where: eq(user.game_id, sessionId)
            })

            // If no players left, mark game as finished
            if (remainingPlayers.length === 0) {
                await tx
                    .update(gameSession)
                    .set({ stage: 'finished' })
                    .where(eq(gameSession.id, sessionId))
            }
        })

        return { success: true }
    })

export const updateGameStage = createServerFn({
    method: 'POST'
})
    .validator((input: { sessionId: string, stage: GameStage }) => input)
    .handler(async (ctx) => {
        const { sessionId, stage } = ctx.data

        // Use a transaction to ensure both updates happen together
        await db.transaction(async (tx) => {
            await tx
                .update(gameSession)
                .set({ stage })
                .where(eq(gameSession.id, sessionId))
        })

        return { success: true }
    })

export const createRound = createServerFn({
    method: 'POST'
})
    .validator((input: { sessionId: string, numbers: number[], target: number }) => input)
    .handler(async (ctx) => {
        const { sessionId, numbers, target } = ctx.data

        // Use a transaction to ensure both the round creation and session update happen together
        const round = await db.transaction(async (tx) => {
            // Create new round
            const [newRound] = await tx
                .insert(gameRound)
                .values({
                    session_id: sessionId,
                    numbers,
                    target,
                    stage: 'round'
                })
                .returning()

            // Update session with new round
            await tx
                .update(gameSession)
                .set({
                    active_round_id: newRound.id,
                    stage: 'round'
                })
                .where(eq(gameSession.id, sessionId))

            return newRound
        })

        return { round }
    })

export const finishRound = createServerFn({
    method: 'POST'
})
    .validator((input: { sessionId: string }) => input)
    .handler(async (ctx) => {
        const { sessionId } = ctx.data

        await db.transaction(async (tx) => {
            // Update current round to results stage
            await tx
                .update(gameRound)
                .set({ stage: 'results' })
                .where(
                    and(
                        eq(gameRound.session_id, sessionId),
                        eq(gameRound.stage, 'round')
                    )
                )

            // Update session stage
            await tx
                .update(gameSession)
                .set({ stage: 'results' })
                .where(eq(gameSession.id, sessionId))
        })

        return { success: true }
    })

export const finishGame = createServerFn({
    method: 'POST'
})
    .validator((input: { sessionId: string }) => input)
    .handler(async (ctx) => {
        const { sessionId } = ctx.data

        await db.transaction(async (tx) => {
            // Mark game as finished
            await tx
                .update(gameSession)
                .set({ stage: 'finished' })
                .where(eq(gameSession.id, sessionId))

            // Mark all active rounds as finished
            await tx
                .update(gameRound)
                .set({ stage: 'results' })
                .where(and(
                    eq(gameRound.session_id, sessionId),
                    eq(gameRound.stage, 'round')
                ))
        })

        return { success: true }
    }) 