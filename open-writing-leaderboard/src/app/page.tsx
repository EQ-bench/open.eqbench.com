import { prisma } from "@/lib/db";
import { Leaderboard } from "@/components/leaderboard";

export const dynamic = "force-dynamic";

async function getLeaderboardData() {
  const ratings = await prisma.elo_ratings.findMany({
    orderBy: {
      elo: "desc",
    },
    select: {
      model_name: true,
      elo: true,
      elo_norm: true,
      ci_low: true,
      ci_high: true,
    },
  });

  return ratings;
}

export default async function Home() {
  const ratings = await getLeaderboardData();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Open Writing Leaderboard</h1>
        <p className="text-muted-foreground">
          Creative writing benchmark results ranked by ELO score.
        </p>
      </div>

      <Leaderboard ratings={ratings} />
    </div>
  );
}
