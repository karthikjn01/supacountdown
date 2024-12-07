import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createServerFn } from "@tanstack/start";
import { toast } from "sonner";

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { gameSession, user } from "~/server/db/schema";

export async function joinGameFn(gamePin: string, playerName: string) {
  // Check if game exists
  const game = await db.query.gameSession.findFirst({
    where: eq(gameSession.joinable_id, gamePin),
  });

  if (!game) {
    return { error: "Game not found" };
  }

  // Create user
  const [u] = await db.insert(user)
    .values({
      name: playerName,
      game_id: game.id,
    })
    .returning();

  return { game_id: game.joinable_id, user_id: u.id };
}

export async function createGameFn() {
  // Create game
  const [game] = await db.insert(gameSession)
    .values({})
    .returning();

  return { game_id: game.joinable_id };
}

const createGame = createServerFn({
  method: 'POST',
}).handler(async () => {
  return await createGameFn();
});

const joinGame = createServerFn({
  method: 'POST',
})
  .validator((data: { gamePin: string, playerName: string }) => {
    //ensure the data has { gamePin, playerName }
    if (!data.gamePin || !data.playerName) {
      throw new Error("Invalid data");
    }

    return data;
  })
  .handler(async (ctx) => {
    const { gamePin, playerName } = ctx.data;
    return await joinGameFn(gamePin, playerName);
  });

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [gamePin, setGamePin] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  async function handleJoinGame() {
    setIsJoining(true);
    const { game_id, user_id, error } = await joinGame({ data: { gamePin, playerName } });
    if (error) {
      toast.error(error);
    } else {

      window.location.href = `/lobby/${game_id}?user_id=${user_id}`;
      // router.navigate({ to: `/lobby/${game_id}`, search: { user_id } });
    }
    setIsJoining(false);
  }

  async function handleCreateGame() {
    const { game_id } = await createGame();
    window.location.href = `/lobby/${game_id}?user_id=LEADER`;
    // router.navigate({ to: `/lobby/${game_id}`, search: { user_id: "LEADER" } });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to GameHub</h1>
          <p className="mt-2 text-muted-foreground">Join or create a new game session</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Join a Game</CardTitle>
              <CardDescription>Enter the 8-digit game PIN to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={8} value={gamePin} onChange={(e) => setGamePin(e)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                    <InputOTPSlot index={6} />
                    <InputOTPSlot index={7} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={!playerName.trim() || gamePin.length !== 8 || isJoining}
                onClick={handleJoinGame}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Game"
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create a Game</CardTitle>
              <CardDescription>Start a new game session</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" size="lg" onClick={handleCreateGame}>
                Create New Game
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}