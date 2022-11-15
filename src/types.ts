export type Method = "GET" | "POST" | "PUT" | "DELETE";

export type VarConfig = {
  name: string;
  expr: string;
};

export type RequestConfig = {
  name: string;
  method: Method;
  url: string;
  body?: string;
  vars?: VarConfig[];
};

export type CollectionConfig = {
  name: string;
  baseUrl?: string;
  requests: RequestConfig[];
};

export type Result = {
  ok: boolean;
  error: string;
  status: number;
  data?: unknown;
};

export type Session = {
  getVar(name: string): any;
  setVar(name: string, value: any): void;
};
