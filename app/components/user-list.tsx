"use client"

import useUsersStore from "~/state/users"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { useEffect } from "react"
import { toast } from "sonner"
export function UserList({ sessionId }: { sessionId: string }) {
    const players = useUsersStore((state) => state.users)
    const realtimeStatus = useUsersStore((state) => state.realtimeStatus)
    const lastSync = useUsersStore((state) => state.lastSync)
    const error = useUsersStore((state) => state.error)

    useEffect(() => {
        useUsersStore.getState().setSessionId(sessionId)
        return () => {
            useUsersStore.getState().cleanup()
        }
    }, [sessionId])

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Players
                    <Badge
                        onClick={() => {
                            useUsersStore.getState().fetchUsers();
                            toast.success('Refreshed players')
                        }}
                        variant={
                            realtimeStatus === 'connected' ? 'default' :
                                realtimeStatus === 'connecting' ? 'secondary' :
                                    realtimeStatus === 'error' ? 'destructive' :
                                        'outline'
                        }
                    >
                        {realtimeStatus}
                        {lastSync && ` • ${new Date(lastSync).toLocaleTimeString()}`}
                    </Badge>
                </CardTitle>
                {error && (
                    <div className="text-sm text-destructive">{error}</div>
                )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {players.map((player, index) => (
                    <div key={player.id}>
                        {index > 0 && <Separator className="mb-4" />}
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="font-medium">{player.name}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
} 