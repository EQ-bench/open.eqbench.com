import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { SubmissionLogs } from "@/components/submission-logs";
import { SubmissionDetails } from "@/components/submission-details";

interface SubmissionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const { id } = await params;

  const submission = await prisma.submissions.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      params: true,
      created_at: true,
      started_at: true,
      finished_at: true,
      error_msg: true,
      run_key: true,
    },
  });

  if (!submission) {
    notFound();
  }

  // Fetch run info if available
  let runInfo = null;
  if (submission.run_key) {
    runInfo = await prisma.runs.findUnique({
      where: { run_key: submission.run_key },
      select: {
        run_key: true,
        test_model: true,
        status: true,
        start_time: true,
        end_time: true,
        results: true,
      },
    });
  }

  // Serialize dates for client component
  const serializedSubmission = {
    ...submission,
    created_at: submission.created_at?.toISOString() || new Date().toISOString(),
    started_at: submission.started_at?.toISOString() || null,
    finished_at: submission.finished_at?.toISOString() || null,
    params: submission.params as {
      modelType?: string;
      modelId?: string;
      ggufUrl?: string;
    } | null,
  };

  const serializedRunInfo = runInfo
    ? {
        ...runInfo,
        start_time: runInfo.start_time?.toISOString() || null,
        end_time: runInfo.end_time?.toISOString() || null,
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/submissions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Submissions
          </Link>
        </Button>
      </div>

      {/* Client component that auto-refreshes */}
      <SubmissionDetails
        initialSubmission={serializedSubmission}
        initialRunInfo={serializedRunInfo}
      />

      {/* Run Logs */}
      <SubmissionLogs submissionId={id} initialStatus={submission.status} />

      {/* Share Link */}
      <ShareCard submissionId={id} />
    </div>
  );
}

async function ShareCard({ submissionId }: { submissionId: string }) {
  const headersList = await headers();
  const host = headersList.get("host") || "owl.eqbench.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const shareUrl = `${protocol}://${host}/submissions/${submissionId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share</CardTitle>
        <CardDescription>
          Share this link to let others view the status of this submission
        </CardDescription>
      </CardHeader>
      <CardContent>
        <code className="bg-muted px-3 py-2 rounded block text-sm">
          {shareUrl}
        </code>
      </CardContent>
    </Card>
  );
}
