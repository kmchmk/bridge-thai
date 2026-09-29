import { SignIn } from "@clerk/nextjs";

// Own sign-in page so Clerk never falls back to the hosted Account Portal
// (accounts.<domain>), which can't exist on a *.vercel.app domain.
export default function SignInPage() {
  return (
    <div className="flex justify-center pt-4 sm:pt-10">
      <SignIn />
    </div>
  );
}
