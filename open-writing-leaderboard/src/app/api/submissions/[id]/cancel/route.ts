import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { auth_subject: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get submission
    const submission = await prisma.submissions.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        status: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify ownership
    if (submission.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only allow cancelling SUBMITTED status jobs
    if (submission.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Can only cancel submissions with SUBMITTED status" },
        { status: 400 }
      );
    }

    // Update status to CANCELLED
    await prisma.submissions.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling submission:", error);
    return NextResponse.json(
      { error: "Failed to cancel submission" },
      { status: 500 }
    );
  }
}
