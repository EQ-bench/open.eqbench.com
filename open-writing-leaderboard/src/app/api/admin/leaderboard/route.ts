import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE: Remove a model from the leaderboard and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.users.findUnique({
      where: { auth_subject: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get("model");

    if (!modelName) {
      return NextResponse.json(
        { error: "Model name is required" },
        { status: 400 }
      );
    }

    // Find all successful runs for this model
    const runs = await prisma.runs.findMany({
      where: {
        test_model: modelName,
        status: "succeeded",
      },
      select: { run_key: true },
    });

    const runKeys = runs.map((r) => r.run_key);

    // Delete in order to respect foreign key constraints
    // Using a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete judge_results for tasks in these runs
      if (runKeys.length > 0) {
        await tx.judge_results.deleteMany({
          where: {
            tasks: {
              run_key: { in: runKeys },
            },
          },
        });

        // 2. Delete tasks for these runs
        await tx.tasks.deleteMany({
          where: { run_key: { in: runKeys } },
        });

        // 3. Delete run_logs for these runs
        await tx.run_logs.deleteMany({
          where: { run_key: { in: runKeys } },
        });

        // 4. Delete elo_comparisons for these runs
        await tx.elo_comparisons.deleteMany({
          where: { run_key: { in: runKeys } },
        });

        // 5. Delete the runs themselves
        await tx.runs.deleteMany({
          where: { run_key: { in: runKeys } },
        });
      }

      // 6. Delete elo_comparisons that reference this model (even if no run_key)
      await tx.elo_comparisons.deleteMany({
        where: {
          OR: [{ model_a: modelName }, { model_b: modelName }],
        },
      });

      // 7. Delete the elo_rating entry
      await tx.elo_ratings.delete({
        where: { model_name: modelName },
      });

      // 8. Log the deletion event
      await tx.event_log.create({
        data: {
          event_type: "leaderboard_entry_deleted",
          user_id: user.id,
          details: {
            model_name: modelName,
            runs_deleted: runKeys.length,
            deleted_by: session.user.id,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${modelName} and ${runKeys.length} associated run(s)`,
    });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete leaderboard entry" },
      { status: 500 }
    );
  }
}
