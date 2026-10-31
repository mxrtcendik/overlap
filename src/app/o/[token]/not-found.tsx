import { Missing } from "@/components/missing";
import { ForgetMissingPoll } from "@/components/my-polls";

export default function OwnerLinkNotFound() {
  return (
    <Missing title="This secret link doesn’t work">
      <ForgetMissingPoll />
      <p>
        It doesn’t match any poll. The poll may have been deleted or expired 30 days after its last day, or the link
        was copied only in part.
      </p>
      <p>Secret links can’t be recovered, so if the poll still exists, its public link keeps working.</p>
    </Missing>
  );
}
