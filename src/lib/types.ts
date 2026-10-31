export type VoterView = { name: string; slots: string[]; yours: boolean };

export type FinalTime = { start: string; end: string };

export type PollView = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  final: FinalTime | null;
  voters: VoterView[];
};
