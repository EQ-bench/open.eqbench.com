import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { LeaderboardWithPalette } from "@/components/leaderboard-with-palette";

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

async function getUserRole() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.users.findUnique({
    where: { auth_subject: session.user.id },
    select: { role: true },
  });

  return user?.role ?? null;
}

export default async function Home() {
  const [ratings, userRole] = await Promise.all([
    getLeaderboardData(),
    getUserRole(),
  ]);

  return (
    <div className="space-y-8">
      <LeaderboardWithPalette ratings={ratings} isAdmin={userRole === "admin"} />
    </div>
  );
}
