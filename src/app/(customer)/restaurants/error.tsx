"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/primitives/empty";

export default function RestaurantError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto flex min-h-[70dvh] max-w-lg items-center px-4 pb-28">
      <Empty role="alert" className="home-feedback w-full">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UtensilsCrossed aria-hidden="true" /></EmptyMedia>
          <EmptyTitle><h1>We couldn’t load this page</h1></EmptyTitle>
          <EmptyDescription>Restaurant information is temporarily unavailable. Try again in a moment.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={reset} className="rounded-full">Try again</Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/home">Back to home</Link></Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
