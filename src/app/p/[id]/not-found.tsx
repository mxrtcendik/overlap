import { Missing } from "@/components/missing";
import { ForgetMissingPoll } from "@/components/my-polls";

export default function PollNotFound() {
  return (
    <Missing title="This poll doesn’t exist" action={{ href: "/", label: "Create a poll" }}>
      <ForgetMissingPoll />
      <p>Its owner may have deleted it, or it expired 30 days after its last day.</p>
      <p>If you were sent this link, check that it was copied in full.</p>
    </Missing>
  );
}
