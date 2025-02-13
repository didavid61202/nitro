import type { Handler } from "aws-lambda";
import "#internal/nitro/virtual/polyfill";
import { nitroApp } from "../app";
import { normalizeLambdaOutgoingBody } from "#internal/nitro/utils.lambda";

type StormkitEvent = {
  url: string; // e.g. /my/path, /my/path?with=query
  path: string;
  method: string;
  body?: string;
  query?: Record<string, Array<string>>;
  headers?: Record<string, string>;
  rawHeaders?: Array<string>;
};

type StormkitResponse = {
  headers?: Record<string, string>;
  body?: string;
  buffer?: string;
  statusCode: number;
  errorMessage?: string;
  errorStack?: string;
};

export const handler: Handler<StormkitEvent, StormkitResponse> =
  async function (event, context) {
    const response = await nitroApp.localCall({
      event,
      url: event.url,
      context,
      headers: event.headers,
      method: event.method || "GET",
      query: event.query,
      body: event.body,
    });

    const normalizedBody = await normalizeLambdaOutgoingBody(
      response.body,
      response.headers
    );

    return <StormkitResponse>{
      statusCode: response.status,
      headers: normalizeOutgoingHeaders(response.headers),
      [normalizedBody.type === "text" ? "body" : "buffer"]: normalizedBody.body,
    };
  };

function normalizeOutgoingHeaders(
  headers: Record<string, number | string | string[] | undefined>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [
      k,
      Array.isArray(v) ? v.join(",") : String(v),
    ])
  );
}
