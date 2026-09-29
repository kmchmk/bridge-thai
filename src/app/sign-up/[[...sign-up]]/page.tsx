import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center pt-4 sm:pt-10">
      <SignUp />
    </div>
  );
}
