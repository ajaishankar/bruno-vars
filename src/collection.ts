import _ from "lodash";
import { observable, makeAutoObservable, configure } from "mobx";
import {
  Method,
  RequestConfig,
  VarConfig,
  CollectionConfig as CollectionConfig,
  Result,
  Session,
} from "./types";

configure({
  enforceActions: "never",
});

const REGEX_VAR = /"?{{\s*(\w+)\s*}}"?/g;

function parseVars(str: string) {
  const matches = [] as string[];
  let arr: RegExpExecArray | null;
  while ((arr = REGEX_VAR.exec(str)) != null) {
    matches.push(arr[1]);
  }
  return matches;
}

async function getResponse(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
      },
    });
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok ? "" : res.statusText,
      data: res.ok ? await res.json() : undefined,
    };
  } catch (e) {
    return { ok: false, error: String(e), status: 500 };
  }
}

export class Var {
  name = "";
  expr = "";
  value = undefined as any;
  error = "";
  unused = false;
  setBy = undefined as unknown as Request;
  get evalOrder() {
    return /\$res\b/.test(this.expr) ? "AFTER_RESPONSE" : "BEFORE_REQUEST";
  }

  constructor({ name, expr }: VarConfig) {
    makeAutoObservable(this);
    this.name = name;
    this.expr = expr;
  }

  // should not have side effect in a getter, but nvm just a demo
  private get fun() {
    this.error = "";
    this.expr = this.expr.trim();

    if (!this.expr.length) return;
    if (this.expr === "true") return () => true;
    if (this.expr === "false") return () => false;
    if (/^".*"$/.test(this.expr)) {
      const value = this.expr.replace(/^"|"$/g, "");
      return () => value;
    }

    const number = _.toNumber(this.expr);
    if (!isNaN(number)) return () => number;

    try {
      return new Function("_", "$res", `return (${this.expr});`);
    } catch (e) {
      this.error = String(e);
    }
  }

  eval(session: Session, res?: Result) {
    if (!this.expr.length) {
      this.value = session.getVar(this.name);
      return;
    }

    if (!this.fun) return;

    this.value = undefined;
    this.error = "";

    session.setVar(this.name, undefined);

    try {
      this.value = this.fun(_, res);
      session.setVar(this.name, this.value);
    } catch (e) {
      this.error = String(e);
    }
  }
}

export class Request {
  name = "";
  method = "GET" as Method;
  url = "";
  body = "";
  _vars = observable.array<Var>([]);

  constructor(private collection: Collection, data?: RequestConfig) {
    makeAutoObservable(this);
    if (data) this.init(data);
  }

  // should not have side effect in a getter, but nvm just a demo
  get vars() {
    const deps = parseVars(this.url).concat(parseVars(this.body));

    deps.forEach((name) => {
      if (this._vars.find((v) => v.name == name) == null) {
        this._vars.push(new Var({ name, expr: "" }));
      }
    });

    this._vars.forEach(($var) => {
      $var.unused =
        $var.evalOrder === "BEFORE_REQUEST" &&
        !deps.find((name) => name == $var.name);
    });

    this.updateVarSetters();

    return _.sortBy(
      this._vars,
      ($var) => ($var.evalOrder == "BEFORE_REQUEST" ? "0" : "1") + $var.name
    );
  }

  addVar($var: VarConfig) {
    this._vars.push(new Var($var));
  }

  removeVar($var: Var) {
    this._vars.remove($var);
  }

  init({ name, method, url, body, vars }: RequestConfig) {
    this.name = name;
    this.method = method ?? "";
    this.url = url ?? "";
    this.body = body ?? "";
    this._vars.replace((vars ?? []).map(($var) => new Var($var)));
    return this;
  }

  async execute(baseUrl: string): Promise<Result> {
    this.evaluateVars();
    const url = baseUrl + this.interpolate(this.url);
    const body = this.interpolate(this.body);
    const res = await getResponse(url, {
      method: this.method,
      body: body.trim().length > 0 ? body : undefined,
    });
    if (res != null) {
      this.evaluateVars(res);
    }
    return res;
  }

  private interpolate(str: string) {
    return str.replace(REGEX_VAR, (match) => {
      const name = match.replace(/["{}\s]/g, "");
      return JSON.stringify(this.collection.session.getVar(name));
    });
  }

  private evaluateVars(res?: Result) {
    this._vars.forEach(($var) => {
      if (res == null && $var.evalOrder === "BEFORE_REQUEST") {
        $var.eval(this.collection.session);
      } else if (res != null && $var.evalOrder === "AFTER_RESPONSE") {
        $var.eval(this.collection.session, res);
      }
    });
  }

  private updateVarSetters() {
    const prevReqs = _.takeWhile(
      this.collection.requests,
      (req) => req != this
    );

    const setters = _.chain(prevReqs)
      .flatMap((req) => req.vars.map((v) => ({ var: v, req })))
      .filter((r) => r.var.expr.trim().length > 0)
      .keyBy((r) => r.var.name)
      .value();

    this._vars.forEach(($var) => {
      if ($var.expr.trim().length === 0) {
        $var.setBy = setters[$var.name]?.req;
      }
    });
  }
}

export class Collection {
  name = "";
  baseUrl = "";
  requests = observable.array<Request>([]);
  message = "";
  session = {
    vars: observable.array<{ name: string; value: any }>([]),
    getVar(name: string) {
      return this.vars.find((v) => v.name === name)?.value; // todo: fallback to env
    },
    setVar(name: string, value: unknown) {
      let $var = this.vars.find((v) => v.name === name);
      if ($var == null) {
        this.vars.push(($var = { name, value }));
      } else {
        $var.value = value;
      }
    },
  };

  async run() {
    // clear session
    this.session.vars.replace([]);
    this.message = "";
    for (const req of this.requests) {
      this.message = `Running ${req.name}`;
      const res = await req.execute(this.baseUrl);
      if (!res.ok) {
        this.message = `${req.name} failed. ${res.error}`;
        break;
      }
    }
    this.message = "Collection ran successfully";
  }

  constructor(data?: CollectionConfig) {
    makeAutoObservable(this);
    if (data) this.init(data);
  }

  init({ name, baseUrl, requests }: CollectionConfig) {
    this.name = name ?? "";
    this.baseUrl = baseUrl ?? "";
    this.requests.replace(
      (requests ?? []).map((req) => new Request(this, req))
    );
  }
}
