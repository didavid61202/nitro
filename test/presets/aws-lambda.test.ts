import { resolve } from "pathe";
import { describe } from "vitest";
import destr from "destr";
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from "aws-lambda";
import { setupTest, testNitro } from "../tests";

describe("nitro:preset:aws-lambda", async () => {
  const ctx = await setupTest("aws-lambda");
  // Lambda v1 paylod
  testNitro({ ...ctx, lambdaV1: true }, async () => {
    const { handler } = await import(resolve(ctx.outDir, "server/index.mjs"));
    return async ({ url: rawRelativeUrl, headers, method, body }) => {
      // creating new URL object to parse query easier
      const url = new URL(`https://example.com${rawRelativeUrl}`);
      const queryStringParameters = Object.fromEntries(
        url.searchParams.entries()
      );
      const event: Partial<APIGatewayProxyEvent> = {
        resource: "/my/path",
        path: url.pathname,
        headers: headers || {},
        httpMethod: method || "GET",
        queryStringParameters,
        body: body || "",
      };
      const res = await handler(event);
      return {
        data: destr(res.body),
        status: res.statusCode,
        headers: res.headers,
        cookies: res.cookies,
      };
    };
  });
  // Lambda v2 paylod
  testNitro(ctx, async () => {
    const { handler } = await import(resolve(ctx.outDir, "server/index.mjs"));
    return async ({ url: rawRelativeUrl, headers, method, body }) => {
      // creating new URL object to parse query easier
      const url = new URL(`https://example.com${rawRelativeUrl}`);
      const queryStringParameters = Object.fromEntries(
        url.searchParams.entries()
      );
      const event: Partial<APIGatewayProxyEventV2> = {
        rawPath: url.pathname,
        headers: headers || {},
        requestContext: {
          ...Object.fromEntries([
            ["accountId"],
            ["apiId"],
            ["domainName"],
            ["domainPrefix"],
          ]),
          http: {
            path: url.pathname,
            protocol: "http",
            ...Object.fromEntries([["userAgent"], ["sourceIp"]]),
            method: method || "GET",
          },
        },
        queryStringParameters,
        body: body || "",
      };
      const res = await handler(event);
      const resHeaders = { ...res.headers };
      if (res.cookies) {
        if (!resHeaders["set-cookie"]) {
          resHeaders["set-cookie"] = [];
        }
        if (!Array.isArray(resHeaders["set-cookie"])) {
          resHeaders["set-cookie"] = [resHeaders["set-cookie"]];
        }
        resHeaders["set-cookie"].push(...res.cookies);
      }
      return {
        data: destr(res.body),
        status: res.statusCode,
        headers: resHeaders,
      };
    };
  });
});
