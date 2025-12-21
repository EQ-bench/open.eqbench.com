import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
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
import { Button } from "@/components/ui/button";
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
    try {
      const url = new URL(params.ggufUrl);
      return url.pathname.split("/").pop() || params.ggufUrl;
    } catch {
      return params.ggufUrl;
    }
  }
  return "Unknown";
}

export default async function AdminSubmissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verify user is admin
  const user = await prisma.users.findUnique({
    where: { auth_subject: session.user.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const submissions = await prisma.submissions.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      users: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All Submissions</h1>
        <p className="mt-2 text-muted-foreground">
          Admin view of all model submissions
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No submissions yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>User</TableHead>
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
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {submission.users?.email || submission.user_id}
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
