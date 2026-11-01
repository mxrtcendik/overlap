import type { Metadata } from "next";
import { Missing } from "@/components/common/missing";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Missing title="Page not found">
      <p>There’s nothing at this address. If someone sent you a link, check that it was copied in full.</p>
    </Missing>
  );
}
