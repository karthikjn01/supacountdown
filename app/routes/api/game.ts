import { createServerFn } from '@tanstack/start'
import { db } from '~/server/db'
import { gameSession, user } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export const createGame = createServerFn({
    method: 'POST'
})
    .validator((input: { userName: string }) => input)
    .handler(async (ctx) => {
        const { userName } = ctx.data

        const result = await db.transaction(async (tx) => {
            // Create game session
            const [session] = await tx
                .insert(gameSession)
                .values({})
                .returning()

            // Create user as leader
            const [newUser] = await tx
                .insert(user)
                .values({
                    name: userName,
                    game_id: session.id
                })
                .returning()

            return {
                sessionId: session.joinable_id,
                userId: newUser.id
            }
        })

        return {
            redirect: `/lobby/${result.sessionId}/leader`
        }
    })

export const joinGame = createServerFn({
    method: 'POST'
})
    .validator((input: { userName: string, joinableId: string }) => input)
    .handler(async (ctx) => {
        const { userName, joinableId } = ctx.data

        const session = await db.query.gameSession.findFirst({
            where: eq(gameSession.joinable_id, joinableId)
        })

        if (!session) {
            throw new Error('Game not found')
        }

        if (session.stage !== 'lobby') {
            throw new Error('Game has already started')
        }

        const [newUser] = await db
            .insert(user)
            .values({
                name: userName,
                game_id: session.id
            })
            .returning()

        return {
            redirect: `/lobby/${joinableId}/user/${newUser.id}`
        }
    }) 