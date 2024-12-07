import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '~/server/db'
import { gameSession, user, GameStage, gameRound } from '~/server/db/schema'
import useUsersStore from '~/state/users'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Calculator } from '~/components/players/Calculator'
import { supabase } from '~/lib/supabaseClient'

type LoaderData = {
    session: typeof gameSession.$inferSelect & {
        activeRound: typeof gameRound.$inferSelect | null
    }
    currentUser: typeof user.$inferSelect
}

export const Route = createFileRoute('/lobby/$sessionId/user/$userId/')({
    component: UserComponent,
    loader: async ({ params }): Promise<LoaderData> => {
        const { sessionId, userId } = params

        const session = await db.query.gameSession.findFirst({
            where: eq(gameSession.joinable_id, sessionId),
            with: {
                activeRound: true
            }
        })

        if (!session) {
            throw new Error('Session not found')
        }

        const currentUser = await db.query.user.findFirst({
            where: eq(user.id, userId),
        })

        if (!currentUser) {
            throw new Error('User not found')
        }

        return { session, currentUser }
    }
})

function UserComponent() {
    const { session: initialSession, currentUser } = Route.useLoaderData()
    const [session, setSession] = useState(initialSession)

    const {
        users,
        setSessionId,
        fetchUsers,
        realtimeStatus,
        error: usersError
    } = useUsersStore()

    useEffect(() => {
        setSessionId(session.id)

        // Subscribe to game session changes
        const gameSubscription = supabase
            .channel('game-session-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_session',
                    filter: `id=eq.${session.id}`
                },
                (payload) => {
                    const { new: newSession } = payload
                    if (newSession) {
                        // If stage changed or finished, reload the page
                        if (newSession.stage !== session.stage) {
                            if (newSession.stage === 'finished') {
                                window.location.href = `/lobby/${session.joinable_id}/finished`
                            } else {
                                window.location.reload()
                            }
                        }
                    }
                }
            )
            .subscribe()

        // Subscribe to round changes
        const roundSubscription = supabase
            .channel('round-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_round',
                    filter: `session_id=eq.${session.id}`
                },
                () => {
                    // Reload the page when round changes
                    window.location.reload()
                }
            )
            .subscribe()

        return () => {
            useUsersStore.getState().cleanup()
            gameSubscription.unsubscribe()
            roundSubscription.unsubscribe()
        }
    }, [session.id, session.stage, session.joinable_id])

    if (usersError) {
        toast.error(`Error syncing players: ${usersError}`)
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Players in Game</span>
                        <Badge
                            variant={
                                realtimeStatus === 'connected' ? 'default' :
                                    realtimeStatus === 'connecting' ? 'secondary' :
                                        realtimeStatus === 'error' ? 'destructive' :
                                            'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => fetchUsers()}
                        >
                            {realtimeStatus}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row flex-wrap gap-2">
                    {users.map((player) => (
                        <div
                            key={player.id}
                            className={`flex items-center justify-between p-3 w-fit rounded-lg ${player.id === currentUser.id
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'bg-muted/50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">
                                    {player.name}
                                    {player.id === currentUser.id && (
                                        <span className="ml-2 text-sm text-muted-foreground">
                                            (You)
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">
                            No other players have joined yet
                        </p>
                    )}
                </CardContent>
            </Card>

            {session.stage === 'lobby' && (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            Waiting for the game leader to start the game...
                        </p>
                    </CardContent>
                </Card>
            )}

            {session.stage === 'round' && session.activeRound && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Round</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="text-center">
                                <div className="text-sm uppercase text-muted-foreground font-medium mb-2">
                                    Target
                                </div>
                                <div className="text-6xl font-bold font-mono tracking-tight">
                                    {session.activeRound.target}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm uppercase text-muted-foreground font-medium mb-3">
                                    Available Numbers
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    {session.activeRound.numbers?.map((number, index) => (
                                        <div
                                            key={`${number}-${index}`}
                                            className="aspect-square flex items-center justify-center bg-muted rounded-xl text-2xl font-mono font-semibold"
                                        >
                                            {number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Calculator
                        numbers={session.activeRound.numbers || []}
                        target={session.activeRound.target || 0}
                        onSubmit={async (result: number, method: string) => {
                            // TODO: Implement submission
                            console.log({ result, method });
                        }}
                    />
                </div>
            )}
        </div>
    )
} 