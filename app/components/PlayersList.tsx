import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { user } from "~/server/db/schema";
import type { GameStage } from "~/server/db/schema";

interface PlayersListProps {
    players: Array<typeof user.$inferSelect>;
    onKickPlayer: (userId: string) => Promise<void>;
    isLoading: boolean;
    currentStage: GameStage;
}

export function PlayersList({
    players,
    onKickPlayer,
    isLoading,
    currentStage
}: PlayersListProps) {
    const canKickPlayers = currentStage !== 'finished';

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Players ({players.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {players.map((player) => (
                    <div
                        key={player.id}
                        className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50"
                    >
                        <span className="font-medium">{player.name}</span>
                        {canKickPlayers && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onKickPlayer(player.id)}
                                disabled={isLoading}
                            >
                                Kick
                            </Button>
                        )}
                    </div>
                ))}
                {players.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                        No players have joined yet
                    </p>
                )}
            </CardContent>
        </Card>
    );
} 