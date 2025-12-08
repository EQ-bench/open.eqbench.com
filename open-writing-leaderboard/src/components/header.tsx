import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { SubmitButton } from "./submit-button";
import { QueueMonitor } from "./queue-monitor";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex items-center space-x-3">
          <a href="https://eqbench.com" className="flex-shrink-0">
            <Image
              src="/eqbench_pixel_logo.png"
              alt="EQ-Bench Logo"
              width={32}
              height={32}
              className="h-8 w-8 min-w-8"
            />
          </a>
          <a href="/" className="text-xl font-bold tracking-tight">
            EQ-Bench Open Writing Leaderboard
          </a>
        </div>
        <nav className="ml-auto flex items-center space-x-4">
          <QueueMonitor />
          <ThemeToggle />
          <SubmitButton />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
