import { createFileRoute, redirect, useSearch } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';
import { db } from '~/server/db';
import { gameSession } from '~/server/db/schema';
import { UserList } from '~/components/user-list';

export const Route = createFileRoute('/lobby/$sessionId/')({
    loader: async ({ params }) => {
        const session = await db.query.gameSession.findFirst({
            where: eq(gameSession.joinable_id, params.sessionId),
            with: {
                players: true,
            }
        });

        if (!session) {
            throw redirect({
                to: '/',
                search: {
                    error: 'Session not found'
                }
            });
        }

        return session;
    },
    component: RouteComponent,
});

function RouteComponent() {
    const gameSession = Route.useLoaderData();

    const search = useSearch({ from: Route.id });

    console.log({ search });



    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Game Lobby</h1>
            <pre className="bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(gameSession, null, 2)}
            </pre>
            <UserList sessionId={gameSession.id} />
        </div>
    );
}