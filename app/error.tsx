"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

/** Route-level failure: a calm, branded page with a retry and a way home, on the site's grid edge. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error.digest ? `Decignal error, digest ${error.digest}` : error);
  }, [error]);

  return (
    <main className="page-wrap flex min-h-svh flex-col py-7 md:py-9">
      <Link href="/" aria-label="Decignal home" className="self-start">
        <Logo />
      </Link>
      <div className="my-auto py-16">
        <p className="t-label">Error</p>
        <h1 className="t-display mt-4">
          Something went wrong.
          <span className="accent">Try again in a moment.</span>
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Back to the story
          </Link>
        </div>
      </div>
    </main>
  );
}
