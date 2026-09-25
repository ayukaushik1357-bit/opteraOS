export * from "./database";
export * from "./ai";

export type Status = string;

export type Department = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  departments: { name: string } | null;
};

export type DateRangePreset = "7d" | "30d" | "90d" | "6m" | "12m" | "ytd" | "all" | "custom";

export interface DateWindow {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}
