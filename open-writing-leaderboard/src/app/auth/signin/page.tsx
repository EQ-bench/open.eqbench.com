import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Sign in with your Hugging Face account to submit models for evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("huggingface", { redirectTo: "/" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 120 120"
                fill="currentColor"
              >
                <path d="M37.6 60c0-6.7 5.4-12.1 12.1-12.1s12.1 5.4 12.1 12.1-5.4 12.1-12.1 12.1S37.6 66.7 37.6 60zm32.7 0c0-6.7 5.4-12.1 12.1-12.1s12.1 5.4 12.1 12.1-5.4 12.1-12.1 12.1S70.3 66.7 70.3 60zM60 10c27.6 0 50 22.4 50 50s-22.4 50-50 50S10 87.6 10 60 32.4 10 60 10zm0 90c22.1 0 40-17.9 40-40S82.1 20 60 20 20 37.9 20 60s17.9 40 40 40z"/>
              </svg>
              Sign in with Hugging Face
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
