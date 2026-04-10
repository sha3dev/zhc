export interface Expert {
  createdAt: Date;
  id: number;
  key: string;
  name: string;
  subagentMd: string;
  updatedAt: Date;
}

export interface ExpertDetails extends Expert {
  manages: [];
}

export interface ExpertSummary {
  id: number;
  key: string;
  name: string;
}

export interface RegistryEntityMemorySummary {
  id: number;
  isCeo: boolean;
  kind: 'ceo' | 'specialist' | 'expert';
  key: string;
  modelCliId: string | null;
  model: string | null;
  name: string;
  role: string | null;
  status: 'ready' | 'not_ready' | 'suspended';
}

export interface RuntimeActor {
  id: number;
  isCeo: boolean;
  kind: 'ceo' | 'specialist' | 'expert';
  key: string;
  modelCliId: string | null;
  model: string | null;
  name: string;
  status: 'ready' | 'not_ready' | 'suspended';
  subagentMd: string;
}

export interface ExpertRecord {
  exp_created_at: Date;
  exp_id: number;
  exp_key: string;
  exp_name: string;
  exp_subagent_md: string;
  exp_updated_at: Date;
}
