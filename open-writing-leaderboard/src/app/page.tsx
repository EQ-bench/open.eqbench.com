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
      <Leaderboard ratings={ratings} />
    </div>
  );
}
