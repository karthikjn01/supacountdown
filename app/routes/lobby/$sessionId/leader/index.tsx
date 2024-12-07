import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '~/server/db';
import { gameSession, user, gameRound, submission, GameStage } from '~/server/db/schema';
import useLeaderStore from '~/state/leader-state';
import useUsersStore from '~/state/users';
import { ActiveRound } from '~/components/ActiveRound';
import { ControlPanel } from '~/components/ControlPanel';
import { PlayersList } from '~/components/PlayersList';
import type { RoundWithSubmissions } from '~/components/ActiveRound';

type LoaderData = typeof gameSession.$inferSelect & {
  activeRound: (typeof gameRound.$inferSelect & {
    submissions: Array<typeof submission.$inferSelect & {
      player: typeof user.$inferSelect
    }>
  }) | null
}

export const Route = createFileRoute('/lobby/$sessionId/leader/')({
  component: LeaderComponent,
  loader: async ({ params }): Promise<LoaderData> => {
    const { sessionId } = params

    const session = await db.query.gameSession.findFirst({
      where: eq(gameSession.joinable_id, sessionId),
      with: {
        activeRound: {
          with: {
            submissions: {
              with: {
                player: true
              }
            }
          }
        }
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    return session as LoaderData
  }
})

function LeaderComponent() {
  const session = Route.useLoaderData()

  const {
    setSessionId: setLeaderSessionId,
    kickUser,
    startGame,
    currentStage,
    isLoading,
    finishRound,
    finishGame
  } = useLeaderStore()

  const {
    users,
    setSessionId: setUsersSessionId,
    fetchUsers,
    realtimeStatus,
    error: usersError
  } = useUsersStore()

  useEffect(() => {
    setLeaderSessionId(session.id, session.stage as GameStage)
    setUsersSessionId(session.id)

    // Redirect to finished page if game is finished
    if (session.stage === 'finished') {
      window.location.href = `/lobby/${session.joinable_id}/finished`
    }

    return () => {
      useLeaderStore.getState().cleanup()
      useUsersStore.getState().cleanup()
    }
  }, [session.id, session.stage, session.joinable_id])

  const handleKickPlayer = async (userId: string) => {
    await kickUser(userId)
    toast.success('Player kicked')
    window.location.reload()
  }

  const handleStartRound = async (numbers: number[], target: number) => {
    await startGame(numbers, target)
    toast.success('Round started')
    window.location.reload()
  }

  const handleFinishRound = async () => {
    await finishRound()
    toast.success('Round finished')
    window.location.reload()
  }

  const handleFinishGame = async () => {
    await finishGame()
    toast.success('Game finished')
    window.location.href = `/lobby/${session.joinable_id}/finished`;
  }

  const handleRefreshPlayers = async () => {
    await fetchUsers()
    toast.success('Players list refreshed')
  }

  if (usersError) {
    toast.error(`Error syncing players: ${usersError}`)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-row gap-4 w-full justify-stretch">
        <ControlPanel
          onStartRound={handleStartRound}
          onFinishRound={handleFinishRound}
          onFinishGame={handleFinishGame}
          onRefreshPlayers={handleRefreshPlayers}
          currentStage={currentStage}
          isLoading={isLoading}
          playerCount={users.length}
          sessionId={session.joinable_id}
          realtimeStatus={realtimeStatus}
        />

        <PlayersList
          players={users}
          onKickPlayer={handleKickPlayer}
          isLoading={isLoading}
          currentStage={currentStage}
        />
      </div>

      {session.activeRound && (
        <ActiveRound round={session.activeRound as RoundWithSubmissions} />
      )}
    </div>
  )
}
