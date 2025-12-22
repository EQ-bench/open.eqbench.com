"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function SubmitButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Plus className="h-4 w-4" />
        Submit
      </Button>
    );
  }

  if (!session?.user) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2 opacity-50 cursor-not-allowed"
        title="Sign in to submit a model"
      >
        <Plus className="h-4 w-4" />
        Submit
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" asChild className="gap-2">
      <Link href="/submit">
        <Plus className="h-4 w-4" />
        Submit
      </Link>
    </Button>
  );
}
