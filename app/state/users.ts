import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import type { user } from '../server/db/schema'
import { getUsers } from '~/routes/api/$sessionId/users'

type User = typeof user.$inferSelect
type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'idle'

interface UsersState {
    users: User[]
    isLoading: boolean
    error: string | null
    sessionId: string | null
    realtimeStatus: RealtimeStatus
    lastSync: Date | null

    // Actions
    setSessionId: (sessionId: string) => void
    fetchUsers: () => Promise<void>
    startRealtimeSubscription: () => void
    cleanup: () => void
    setRealtimeStatus: (status: RealtimeStatus, error?: string) => void
}

const useUsersStore = create<UsersState>((set, get) => ({
    users: [],
    isLoading: false,
    error: null,
    sessionId: null,
    realtimeStatus: 'idle',
    lastSync: null,

    setRealtimeStatus: (status: RealtimeStatus, error?: string) => {
        set({
            realtimeStatus: status,
            error: error || null,
            lastSync: status === 'connected' ? new Date() : get().lastSync
        })
    },

    setSessionId: (sessionId: string) => {
        set({ sessionId })
        get().fetchUsers()
        get().startRealtimeSubscription()
    },

    fetchUsers: async () => {
        const { sessionId } = get()
        if (!sessionId) return

        set({ isLoading: true, error: null })

        try {
            const s = await getUsers({ data: sessionId })
            const users = s.users
            set({
                users,
                isLoading: false,
                lastSync: new Date()
            })
        } catch (error) {
            set({
                error: (error as Error).message,
                isLoading: false,
                realtimeStatus: 'error'
            })
        }
    },

    startRealtimeSubscription: () => {
        const { sessionId, cleanup, setRealtimeStatus } = get()
        if (!sessionId) return

        // Clean up any existing subscription
        cleanup()
        setRealtimeStatus('connecting')

        // Set up periodic refresh
        const refreshInterval = setInterval(() => {
            get().fetchUsers()
        }, 60000) // Refresh every minute

        // Set up realtime subscription
        const subscription = supabase
            .channel('users-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user',
                    filter: `game_id=eq.${sessionId}`
                },
                async (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload
                    console.log({ payload })

                    try {
                        switch (eventType) {
                            case 'INSERT':
                                set(state => ({
                                    users: [...state.users, newRecord as User],
                                    lastSync: new Date()
                                }))
                                break

                            case 'DELETE':
                                set(state => ({
                                    users: state.users.filter(user => user.id !== oldRecord?.id),
                                    lastSync: new Date()
                                }))
                                break

                            case 'UPDATE':
                                set(state => ({
                                    users: state.users.map(user =>
                                        user.id === newRecord?.id
                                            ? { ...user, ...newRecord as User }
                                            : user
                                    ),
                                    lastSync: new Date()
                                }))
                                break
                        }
                    } catch (error) {
                        setRealtimeStatus('error', (error as Error).message)
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected')
                } else if (status === 'CLOSED') {
                    setRealtimeStatus('disconnected')
                } else if (status === 'CHANNEL_ERROR') {
                    setRealtimeStatus('error', 'Channel error occurred')
                }
            })

        // Store cleanup function
        set({
            cleanup: () => {
                clearInterval(refreshInterval)
                subscription.unsubscribe()
                set({
                    realtimeStatus: 'idle',
                    lastSync: null
                })
            }
        })
    },

    cleanup: () => {
        // Initial empty cleanup function
    }
}))

export default useUsersStore
