export type VoterView = {
  name: string;
  note: string | null;
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
  final: FinalTime | null;
  voters: VoterView[];
};
