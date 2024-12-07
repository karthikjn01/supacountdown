import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { GameStage } from "~/server/db/schema";
import { findSolutions } from "~/lib/countdown-smarts";
import { Badge } from "~/components/ui/badge";

interface ControlPanelProps {
    onStartRound: (numbers: number[], target: number) => Promise<void>;
    onFinishRound: () => Promise<void>;
    onFinishGame: () => Promise<void>;
    onRefreshPlayers: () => Promise<void>;
    currentStage: GameStage;
    isLoading: boolean;
    playerCount: number;
    sessionId: string;
    realtimeStatus: string;
}

function generateRoundNumbers() {
    const smallNumbers = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 9) + 1
    );

    const largeNumbers = [10, 25, 50, 75, 100];
    const selectedLargeNumbers = Array.from({ length: 2 }, () => {
        const randomIndex = Math.floor(Math.random() * largeNumbers.length);
        const number = largeNumbers[randomIndex];
        largeNumbers.splice(randomIndex, 1);
        return number;
    });

    return [...smallNumbers, ...selectedLargeNumbers].sort(() => Math.random() - 0.5);
}

function generateTarget(numbers: number[]): number {
    const solver = findSolutions(numbers);
    const analysis = solver.analyzeAllSolutions();

    const reasonableTargets = analysis.allTargets.filter(t =>
        t.numberOfPaths >= 2 && t.numberOfPaths <= 10 &&
        t.averageDifficulty >= 3 && t.averageDifficulty <= 8
    );

    if (reasonableTargets.length === 0) {
        return analysis.allTargets[
            Math.floor(Math.random() * analysis.allTargets.length)
        ].target;
    }

    return reasonableTargets[
        Math.floor(Math.random() * reasonableTargets.length)
    ].target;
}

export function ControlPanel({
    onStartRound,
    onFinishRound,
    onFinishGame,
    onRefreshPlayers,
    currentStage,
    isLoading,
    playerCount,
    sessionId,
    realtimeStatus
}: ControlPanelProps) {
    const canStartRound = (currentStage === 'lobby' || currentStage === 'results') && playerCount > 0;
    const canFinishRound = currentStage === 'round';
    const canFinishGame = currentStage === 'results';
    const isGameFinished = currentStage === 'finished';

    const handleStartRound = async () => {
        if (!canStartRound) return;
        const numbers = generateRoundNumbers();
        const target = generateTarget(numbers);
        await onStartRound(numbers, target);
    };

    const handleViewResults = () => {
        window.location.href = `/lobby/${sessionId}/finished`;
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Game Control Panel</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefreshPlayers}
                            disabled={isLoading}
                        >
                            <Badge variant={
                                realtimeStatus === 'connected' ? 'default' :
                                    realtimeStatus === 'connecting' ? 'secondary' :
                                        realtimeStatus === 'error' ? 'destructive' :
                                            'outline'
                            }>
                                {realtimeStatus}
                            </Badge>
                            Refresh Players
                        </Button>
                        <span className="text-sm font-normal text-muted-foreground">
                            Stage: {currentStage}
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                    {canStartRound && (
                        <Button
                            onClick={handleStartRound}
                            disabled={isLoading || playerCount === 0}
                        >
                            {currentStage === 'results' ? 'Next Round' : 'Start Round'}
                        </Button>
                    )}
                    {canFinishRound && (
                        <Button
                            onClick={onFinishRound}
                            disabled={isLoading}
                            variant="secondary"
                        >
                            Finish Round
                        </Button>
                    )}
                    {canFinishGame && (
                        <Button
                            onClick={onFinishGame}
                            disabled={isLoading}
                            variant="destructive"
                        >
                            End Game
                        </Button>
                    )}
                    {isGameFinished && (
                        <Button
                            onClick={handleViewResults}
                            variant="outline"
                        >
                            View Final Results
                        </Button>
                    )}
                </div>
                {isGameFinished && (
                    <p className="text-sm text-muted-foreground">
                        Game has ended. View the final results to see how everyone did.
                    </p>
                )}
                {!isGameFinished && playerCount === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Waiting for players to join...
                    </p>
                )}
                {!canStartRound && !canFinishRound && !canFinishGame && !isGameFinished && (
                    <p className="text-sm text-muted-foreground">
                        Waiting for current round to finish...
                    </p>
                )}
            </CardContent>
        </Card>
    );
} 