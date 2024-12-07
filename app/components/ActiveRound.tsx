import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { gameRound, submission, user } from "~/server/db/schema";

export type RoundWithSubmissions = typeof gameRound.$inferSelect & {
    submissions: Array<typeof submission.$inferSelect & {
        player: typeof user.$inferSelect;
    }>;
};

interface ActiveRoundProps {
    round: RoundWithSubmissions;
}

export function ActiveRound({ round }: ActiveRoundProps) {
    return (
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
                        {round.target}
                    </div>
                </div>

                <div>
                    <div className="text-sm uppercase text-muted-foreground font-medium mb-3">
                        Available Numbers
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {round.numbers?.map((number, index) => (
                            <div
                                key={index}
                                className="aspect-square flex items-center justify-center bg-muted rounded-xl text-2xl font-mono font-semibold"
                            >
                                {number}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <h3 className="text-sm uppercase text-muted-foreground font-medium mb-3">
                        Submissions
                    </h3>
                    <div className="space-y-2">
                        {round.submissions.map((sub) => (
                            <div
                                key={sub.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                                <div>
                                    <p className="font-medium">{sub.player?.name ?? 'N/A'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {sub.number} ({sub.method})
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Score:</span>
                                    <span className="font-mono font-medium">{sub.score}</span>
                                </div>
                            </div>
                        ))}
                        {round.submissions.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                                No submissions yet
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 