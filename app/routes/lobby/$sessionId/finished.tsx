import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { gameSession, user, gameRound, submission } from '~/server/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

type Player = typeof user.$inferSelect
type Round = typeof gameRound.$inferSelect & {
    submissions: Array<typeof submission.$inferSelect & {
        player: Player
    }>
}

interface PlayerScore {
    player: Player
    totalScore: number
    roundScores: Array<{
        roundNumber: number
        score: number
        target: number | null
        number: number | null
        method: string | null
    }>
}

interface LoaderData {
    session: typeof gameSession.$inferSelect
    players: PlayerScore[]
}

export const Route = createFileRoute('/lobby/$sessionId/finished')({
    component: FinishedGameComponent,
    loader: async ({ params }): Promise<LoaderData> => {
        const { sessionId } = params

        const session = await db.query.gameSession.findFirst({
            where: eq(gameSession.joinable_id, sessionId),
        })

        if (!session) {
            throw new Error('Session not found')
        }

        // Get all rounds with submissions for this session
        const rounds = await db.query.gameRound.findMany({
            where: eq(gameRound.session_id, session.id),
            with: {
                submissions: {
                    with: {
                        player: true
                    }
                }
            },
            orderBy: (gameRound, { asc }) => [asc(gameRound.created_at)]
        }) as Round[]

        // Calculate player scores
        const playerScoresMap = new Map<string, PlayerScore>()

        rounds.forEach((round, index) => {
            round.submissions.forEach(submission => {
                if (!submission.player) return

                if (!playerScoresMap.has(submission.player.id)) {
                    playerScoresMap.set(submission.player.id, {
                        player: submission.player,
                        totalScore: 0,
                        roundScores: []
                    })
                }

                const score = submission.score || 0
                const playerScore = playerScoresMap.get(submission.player.id)!
                playerScore.totalScore += score
                playerScore.roundScores.push({
                    roundNumber: index + 1,
                    score,
                    target: round.target,
                    number: submission.number,
                    method: submission.method
                })
            })
        })

        // Convert to array and sort by total score
        const sortedPlayers = Array.from(playerScoresMap.values())
            .sort((a, b) => b.totalScore - a.totalScore)

        return {
            session,
            players: sortedPlayers
        }
    }
})

function FinishedGameComponent() {
    const { players } = Route.useLoaderData()

    return (
        <div className="container mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Final Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {players.map((player, index) => (
                            <div key={player.player.id} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-bold">
                                            #{index + 1}
                                        </span>
                                        <span className="text-xl">
                                            {player.player.name}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold">
                                        {player.totalScore} points
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {player.roundScores.map((round) => (
                                        <Card key={round.roundNumber}>
                                            <CardHeader>
                                                <CardTitle className="text-sm">
                                                    Round {round.roundNumber}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>Target:</span>
                                                    <span>{round.target}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Result:</span>
                                                    <span>{round.number}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Score:</span>
                                                    <span>{round.score}</span>
                                                </div>
                                                {round.method && (
                                                    <div className="text-sm text-muted-foreground break-all">
                                                        {round.method}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 