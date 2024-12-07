// routes/api/hello.ts
import { createServerFn, json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { user } from '~/server/db/schema'

export const getUsers = createServerFn({
    method: 'GET',
})
    .validator((sessionId: string) => sessionId)
    .handler(async (ctx) => {
        const sessionId = ctx.data
        const users = await db.query.user.findMany({
            where: eq(user.game_id, sessionId),
        })
        return {
            users
        }
    })  
