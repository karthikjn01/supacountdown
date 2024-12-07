import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import type { user, gameSession, GameStage } from '../server/db/schema'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Define types for our state
export type Player = typeof user.$inferSelect & {
    isConnected: boolean
    lastSeen?: Date
}

interface GameState {
    // Game session data
    sessionId: string | null
    joinableId: string | null
    stage: GameStage
    players: Player[]
    subscriptions: RealtimeChannel[] | null

    // Leader actions
    initializeGame: (sessionId: string) => Promise<void>
    startGame: () => Promise<void>
    updateGameStage: (stage: GameStage) => Promise<void>
    cleanup: () => void

    // Player management
    addPlayer: (player: Player) => void
    removePlayer: (playerId: string) => void
    updatePlayerConnection: (playerId: string, isConnected: boolean) => void
}

const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    sessionId: null,
    joinableId: null,
    stage: 'lobby',
    players: [],
    subscriptions: null,

    // Initialize the game and set up real-time subscriptions
    initializeGame: async (sessionId: string) => {
        set({ sessionId })

        // Initial fetch of players from the database
        const { data: players } = await supabase
            .from('user')
            .select('*')
            .eq('game_id', sessionId)

        if (players) {
            const playersWithConnection = players.map(player => ({
                ...player,
                isConnected: true,
                lastSeen: new Date()
            }))
            set({ players: playersWithConnection })
        }

        // Subscribe to user changes
        const userSubscription = supabase
            .channel('user-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user',
                    filter: `game_id=eq.${sessionId}`
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload

                    switch (eventType) {
                        case 'INSERT':
                            get().addPlayer({
                                ...newRecord as typeof user.$inferSelect,
                                isConnected: true,
                                lastSeen: new Date()
                            })
                            break
                        case 'DELETE':
                            if (oldRecord) {
                                get().removePlayer(oldRecord.id)
                            }
                            break
                        case 'UPDATE':
                            if (newRecord) {
                                set(state => ({
                                    players: state.players.map(player =>
                                        player.id === newRecord.id
                                            ? {
                                                ...player,
                                                ...newRecord,
                                                isConnected: true,
                                                lastSeen: new Date()
                                            }
                                            : player
                                    )
                                }))
                            }
                            break
                    }
                }
            )
            .subscribe()

        // Subscribe to game session changes
        const gameSubscription = supabase
            .channel('game-changes')
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
                        set({
                            stage: newRecord.stage as GameStage,
                            joinableId: newRecord.joinable_id
                        })
                    }
                }
            )
            .subscribe()

        // Store subscriptions for cleanup
        set({ subscriptions: [userSubscription, gameSubscription] })
    },

    cleanup: () => {
        const state = get()
        state.subscriptions?.forEach(subscription => {
            subscription.unsubscribe()
        })
        set({
            sessionId: null,
            joinableId: null,
            stage: 'lobby',
            players: [],
            subscriptions: null
        })
    },

    startGame: async () => {
        const { sessionId } = get()
        if (!sessionId) return

        await supabase
            .from('game_session')
            .update({ stage: 'round' })
            .eq('id', sessionId)
    },

    updateGameStage: async (stage: GameStage) => {
        const { sessionId } = get()
        if (!sessionId) return

        await supabase
            .from('game_session')
            .update({ stage })
            .eq('id', sessionId)
    },

    addPlayer: (player: Player) => {
        set(state => ({
            players: [...state.players, player]
        }))
    },

    removePlayer: (playerId: string) => {
        set(state => ({
            players: state.players.filter(p => p.id !== playerId)
        }))
    },

    updatePlayerConnection: (playerId: string, isConnected: boolean) => {
        set(state => ({
            players: state.players.map(player =>
                player.id === playerId
                    ? { ...player, isConnected, lastSeen: new Date() }
                    : player
            )
        }))
    },
}))

export default useGameStore
