import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubmitForm } from "./submit-form";

export default async function SubmitPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Submit a Model</h1>
        <p className="mt-2 text-muted-foreground">
          Submit a model for evaluation on the Open Writing Benchmark. Models
          will be queued and evaluated automatically.
        </p>
      </div>

      <SubmitForm />
    </div>
  );
}
