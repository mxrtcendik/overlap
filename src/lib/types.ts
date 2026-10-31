export type VoterView = { name: string; slots: string[]; yours: boolean };

export type PollView = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  voters: VoterView[];
};
