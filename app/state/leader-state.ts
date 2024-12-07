import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import type { gameSession, GameStage, gameRound } from '../server/db/schema'
import { createRound, kickPlayer, updateGameStage, finishRound, finishGame } from '~/routes/api/$sessionId/leader'
import { useNavigate } from '@tanstack/react-router'

type GameSession = typeof gameSession.$inferSelect
type GameRound = typeof gameRound.$inferSelect

interface LeaderState {
    // State
    sessionId: string | null
    currentStage: GameStage
    currentRound: GameRound | null
    error: string | null
    isLoading: boolean

    // Actions
    setSessionId: (sessionId: string, initialStage: GameStage) => void
    kickUser: (userId: string) => Promise<void>
    startGame: (numbers: number[], target: number) => Promise<void>
    cleanup: () => void
    finishRound: () => Promise<void>
    finishGame: () => Promise<void>
}

const useLeaderStore = create<LeaderState>((set, get) => ({
    sessionId: null,
    currentStage: 'lobby',
    currentRound: null,
    error: null,
    isLoading: false,

    setSessionId: (sessionId: string, initialStage: GameStage) => {
        set({ sessionId, currentStage: initialStage })

        // Subscribe to game session changes
        const sessionSubscription = supabase
            .channel('game-session-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_session',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const { new: newRecord } = payload
                    if (newRecord) {
                        set({ currentStage: newRecord.stage as GameStage })
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
                    filter: `session_id=eq.${sessionId}`
                },
                (payload) => {
                    const { eventType, new: newRecord } = payload
                    if (eventType === 'INSERT' || eventType === 'UPDATE') {
                        set({ currentRound: newRecord as GameRound })
                    }
                }
            )
            .subscribe()

        // Store cleanup function
        set(state => ({
            ...state,
            cleanup: () => {
                sessionSubscription.unsubscribe()
                roundSubscription.unsubscribe()
                set({
                    sessionId: null,
                    currentStage: 'lobby',
                    currentRound: null
                })
            }
        }))
    },

    kickUser: async (userId: string) => {
        const { sessionId } = get()
        if (!sessionId) return

        set({ isLoading: true, error: null })

        try {
            await kickPlayer({ data: { sessionId, userId } })
        } catch (error) {
            set({ error: (error as Error).message })
        } finally {
            set({ isLoading: false })
        }
    },

    startGame: async (numbers: number[], target: number) => {
        const { sessionId } = get()
        if (!sessionId) return

        set({ isLoading: true, error: null })

        try {
            // First update game stage
            await updateGameStage({ data: { sessionId, stage: 'round' } })

            // Then create the round with the provided numbers and target
            await createRound({ data: { sessionId, numbers, target } })

            set({ currentStage: 'round' })
        } catch (error) {
            set({ error: (error as Error).message })
        } finally {
            set({ isLoading: false })
        }
    },

    finishRound: async () => {
        const { sessionId } = get()
        if (!sessionId) return

        set({ isLoading: true, error: null })

        try {
            await finishRound({ data: { sessionId } })
            set({ currentStage: 'results' })
        } catch (error) {
            set({ error: (error as Error).message })
        } finally {
            set({ isLoading: false })
        }
    },

    finishGame: async () => {
        const { sessionId } = get()
        if (!sessionId) return

        set({ isLoading: true, error: null })

        try {
            await finishGame({ data: { sessionId } })
            set({ currentStage: 'finished' })
        } catch (error) {
            set({ error: (error as Error).message })
        } finally {
            set({ isLoading: false })
        }
    },

    cleanup: () => {
        // Initial empty cleanup function
    }
}))

export default useLeaderStore
