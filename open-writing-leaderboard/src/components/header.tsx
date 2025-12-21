import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { SubmitButton } from "./submit-button";
import { QueueMonitor } from "./queue-monitor";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUserRole() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.users.findUnique({
    where: { auth_subject: session.user.id },
    select: { role: true },
  });

  return user?.role ?? null;
}

export async function Header() {
  const userRole = await getUserRole();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex items-center space-x-3">
          <a href="/" className="flex-shrink-0">
            <Image
              src="/eqbench_pixel_logo.png"
              alt="EQ-Bench Logo"
              width={32}
              height={32}
              className="h-8 w-8 min-w-8"
            />
          </a>
          <div className="flex items-center text-xl font-bold tracking-tight">
            <a
              href="https://eqbench.com"
              className="transition-all hover:underline hover:decoration-muted-foreground/50 hover:underline-offset-4"
            >
              <span className="hidden sm:inline">EQ-Bench</span>
              <span className="sm:hidden">EQ Bench</span>
            </a>
            <span className="mx-2 text-muted-foreground">›</span>
            <a
              href="/"
              className="transition-all hover:underline hover:decoration-muted-foreground/50 hover:underline-offset-4 text-sm sm:text-xl"
            >
              Open Writing Leaderboard
            </a>
          </div>
        </div>
        <nav className="ml-auto flex items-center space-x-4">
          <QueueMonitor />
          <ThemeToggle />
          <SubmitButton />
          <UserMenu isAdmin={userRole === "admin"} />
        </nav>
      </div>
    </header>
  );
}
