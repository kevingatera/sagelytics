"use client";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form"> & { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email below to login
        </p>
      </div>
      <form {...props} className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="ml-auto text-sm hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
      <div className="relative text-center text-sm">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="mr-2 h-4 w-4"
          >
            <path
              fill="#4285F4"
              d="M21.35 11.1h-9.18v2.84h5.23c-.23 1.27-.94 2.33-1.99 3.04v2.54h3.22c1.88-1.73 2.97-4.28 2.97-7.43s-1.08-5.7-2.97-7.43z"
            />
            <path
              fill="#34A853"
              d="M11.17 21.66c2.68 0 4.93-.89 6.57-2.41l-3.22-2.54c-.89.6-2.03.95-3.35.95-2.57 0-4.74-1.74-5.52-4.08H2.42v2.56c1.63 3.21 4.99 5.42 8.75 5.42z"
            />
            <path
              fill="#FBBC05"
              d="M5.65 13.07c-.2-.59-.32-1.22-.32-1.87s.12-1.28.32-1.87V7.77H2.42A9.993 9.993 0 0 0 2 11.2c0 1.64.39 3.2 1.18 4.43l3.47-2.56z"
            />
            <path
              fill="#EA4335"
              d="M11.17 5.29c1.45 0 2.75.5 3.77 1.48l2.82-2.82C15.09 2.32 13.03 1.2 11.17 1.2 7.41 1.2 4.05 3.41 2.42 7.2l3.47 2.56c.78-2.34 3-4.08 5.28-4.08z"
            />
          </svg>
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("github")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="mr-2 h-4 w-4"
          >
            <path
              d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
                0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73
                1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.304-5.466-1.337-5.466-5.93
                0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.522.105-3.176 0 0 1.005-.322 3.3 1.23a11.52 11.52 0 013 .405c1.02-.007 2.04-.093 3-.405
                2.28-1.552 3.285-1.23 3.285-1.23.645 1.654.24 2.874.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.81 1.114.81 2.244
                0 1.62-.015 2.924-.015 3.322 0 .315.21.69.825.57C20.565 21.795 24 17.303 24 12c0-6.627-5.373-12-12-12z"
              fill="currentColor"
            />
          </svg>
          Continue with GitHub
        </Button>
      </div>
      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/register" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  );
} 