import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { submissionstatus } from "@/generated/prisma/client";

function getStatusBadgeVariant(status: submissionstatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "SUCCEEDED":
      return "default";
    case "RUNNING":
    case "STARTING":
    case "QUEUED":
      return "secondary";
    case "FAILED":
    case "TIMEOUT":
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: submissionstatus): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "QUEUED":
      return "Queued";
    case "STARTING":
      return "Starting";
    case "RUNNING":
      return "Running";
    case "SUCCEEDED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "TIMEOUT":
      return "Timed Out";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getModelName(params: { modelType?: string; modelId?: string; ggufUrl?: string } | null): string {
  if (!params) return "Unknown";
  if (params.modelId) return params.modelId;
  if (params.ggufUrl) {
    // Extract filename from URL
    try {
      const url = new URL(params.ggufUrl);
      return url.pathname.split("/").pop() || params.ggufUrl;
    } catch {
      return params.ggufUrl;
    }
  }
  return "Unknown";
}

export default async function SubmissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Look up user by auth_subject to get their DB id
  const user = await prisma.users.findUnique({
    where: { auth_subject: session.user.id },
    select: { id: true },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const submissions = await prisma.submissions.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Submissions</h1>
          <p className="mt-2 text-muted-foreground">
            Track the status of your model submissions
          </p>
        </div>
        <Button asChild>
          <Link href="/submit">
            <Plus className="mr-2 h-4 w-4" />
            Submit Model
          </Link>
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Submissions Yet</CardTitle>
            <CardDescription>
              You haven&apos;t submitted any models for evaluation yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/submit">Submit Your First Model</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {getModelName(submission.params as { modelType?: string; modelId?: string; ggufUrl?: string })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(submission.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/submissions/${submission.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
