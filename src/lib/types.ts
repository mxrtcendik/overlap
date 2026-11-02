export type VoterView = {
  name: string;
  note: string | null;
  required: boolean;
  zone: string | null;
  email?: string | null;
  slots: string[];
  maybe: string[];
  yours: boolean;
  ref?: string;
};

export type FinalTime = { start: string; end: string };

export type PollView = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  closesAt: string;
  deadline: string | null;
  kind: "dates" | "weekly" | "options";
  options: { start: string; end: string }[] | null;
  zone: string | null;
  duration: number | null;
  notifyEmail?: string | null;
  lastEnd: string;
  final: FinalTime | null;
  place: string | null;
  voters: VoterView[];
};
