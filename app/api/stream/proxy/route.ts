import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REQUEST_TIMEOUT_MS = 15000;
const PROXY_PATH = "/api/stream/proxy";

function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function resolveUrl(value: string, upstreamUrl: string): string {
	try {
		return new URL(value, upstreamUrl).toString();
	} catch {
		return value;
	}
}

function isAlreadyProxied(value: string, requestUrl: string): boolean {
	try {
		const url = new URL(value, requestUrl);
		return url.pathname === PROXY_PATH && url.searchParams.has("url");
	} catch {
		return false;
	}
}

function buildProxyUrl(target: string, requestUrl: string, referer?: string): string {
	const url = new URL(requestUrl);
	url.pathname = PROXY_PATH;
	url.search = "";
	url.searchParams.set("url", target);

	if (referer) {
		url.searchParams.set("referer", referer);
	}

	return url.toString();
}

function isProbablyM3U8(target: string, contentType: string): boolean {
	const normalized = contentType.toLowerCase();

	return (
		target.toLowerCase().includes(".m3u8") ||
		normalized.includes("application/vnd.apple.mpegurl") ||
		normalized.includes("application/x-mpegurl") ||
		normalized.includes("audio/mpegurl")
	);
}

function rewriteM3U8(content: string, upstreamUrl: string, requestUrl: string): string {
	return content
		.split(/\r?\n/)
		.map((line) => {
			const trimmed = line.trim();

			if (!trimmed) {
				return line;
			}

			if (trimmed.startsWith("#")) {
				return line.replace(/URI="([^"]+)"/g, (_, uri: string) => {
					if (isAlreadyProxied(uri, requestUrl)) {
						return `URI="${uri}"`;
					}

					const absoluteUri = resolveUrl(uri, upstreamUrl);
					const proxiedUri = buildProxyUrl(absoluteUri, requestUrl, upstreamUrl);

					return `URI="${proxiedUri}"`;
				});
			}

			if (isAlreadyProxied(trimmed, requestUrl)) {
				return trimmed;
			}

			const absoluteUrl = resolveUrl(trimmed, upstreamUrl);
			return buildProxyUrl(absoluteUrl, requestUrl, upstreamUrl);
		})
		.join("\n");
}

function copyHeaderIfPresent(source: Headers, target: Headers, name: string): void {
	const value = source.get(name);
	if (value) {
		target.set(name, value);
	}
}

function buildUpstreamHeaders(
	request: Request,
	target: string,
	refererParam?: string | null,
): Headers {
	const headers = new Headers();
	const targetUrl = new URL(target);

	let referer = `${targetUrl.origin}/`;

	if (refererParam?.trim()) {
		try {
			referer = decodeURIComponent(refererParam.trim());
		} catch {
			referer = refererParam.trim();
		}
	}

	headers.set(
		"User-Agent",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
	);
	headers.set("Accept", request.headers.get("accept") || "*/*");
	headers.set(
		"Accept-Language",
		request.headers.get("accept-language") || "en-US,en;q=0.9",
	);
	headers.set("Origin", targetUrl.origin);
	headers.set("Referer", referer);
	headers.set("Connection", "keep-alive");

	const range = request.headers.get("range");
	const ifRange = request.headers.get("if-range");
	const acceptEncoding = request.headers.get("accept-encoding");

	if (range) {
		headers.set("Range", range);
	}

	if (ifRange) {
		headers.set("If-Range", ifRange);
	}

	if (acceptEncoding) {
		headers.set("Accept-Encoding", acceptEncoding);
	}

	return headers;
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchUpstream(
	request: Request,
	target: string,
	refererParam?: string | null,
): Promise<Response> {
	let upstream = await fetchWithTimeout(
		target,
		{
			method: "GET",
			headers: buildUpstreamHeaders(request, target, refererParam),
			redirect: "follow",
			cache: "no-store",
		},
		REQUEST_TIMEOUT_MS,
	);

	if (upstream.status === 403 && refererParam) {
		const retryHeaders = buildUpstreamHeaders(request, target, null);
		retryHeaders.delete("Referer");

		upstream = await fetchWithTimeout(
			target,
			{
				method: "GET",
				headers: retryHeaders,
				redirect: "follow",
				cache: "no-store",
			},
			REQUEST_TIMEOUT_MS,
		);
	}

	return upstream;
}

function buildCorsHeaders(): Headers {
	const headers = new Headers();
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
	headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Range, If-Range, Accept, Accept-Language, Accept-Encoding",
	);
	headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
	return headers;
}

export async function OPTIONS(): Promise<Response> {
	return new Response(null, {
		status: 204,
		headers: buildCorsHeaders(),
	});
}

export async function GET(request: Request): Promise<Response> {
	try {
		const requestUrl = new URL(request.url);
		const target = requestUrl.searchParams.get("url")?.trim();
		const refererParam = requestUrl.searchParams.get("referer");

		if (!target) {
			return NextResponse.json({ error: "Missing stream URL." }, { status: 400 });
		}

		if (!isValidHttpUrl(target)) {
			return NextResponse.json({ error: "Invalid stream URL." }, { status: 400 });
		}

		const upstream = await fetchUpstream(request, target, refererParam);

		if (!upstream.ok && upstream.status !== 206) {
			const bodyPreview = await upstream.text().catch(() => "");

			return NextResponse.json(
				{
					error: `Upstream returned ${upstream.status}`,
					upstreamStatus: upstream.status,
					bodyPreview: bodyPreview.slice(0, 500),
					target,
					finalUrl: upstream.url || target,
				},
				{ status: upstream.status },
			);
		}

		const contentType = upstream.headers.get("content-type") || "";
		const finalUrl = upstream.url || target;

		if (isProbablyM3U8(finalUrl, contentType)) {
			const manifest = await upstream.text();
			const rewritten = rewriteM3U8(manifest, finalUrl, request.url);

			const headers = buildCorsHeaders();
			headers.set("Content-Type", "application/vnd.apple.mpegurl");
			headers.set("Cache-Control", "no-store");

			copyHeaderIfPresent(upstream.headers, headers, "etag");
			copyHeaderIfPresent(upstream.headers, headers, "last-modified");

			return new Response(rewritten, {
				status: upstream.status,
				headers,
			});
		}

		const headers = buildCorsHeaders();
		headers.set("Cache-Control", "no-store");

		copyHeaderIfPresent(upstream.headers, headers, "content-type");
		copyHeaderIfPresent(upstream.headers, headers, "content-length");
		copyHeaderIfPresent(upstream.headers, headers, "content-range");
		copyHeaderIfPresent(upstream.headers, headers, "accept-ranges");
		copyHeaderIfPresent(upstream.headers, headers, "etag");
		copyHeaderIfPresent(upstream.headers, headers, "last-modified");

		return new Response(upstream.body, {
			status: upstream.status,
			headers,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to proxy stream.";

		const isAbort =
			error instanceof Error &&
			(error.name === "AbortError" || message.toLowerCase().includes("aborted"));

		return NextResponse.json(
			{
				error: isAbort ? "Upstream request timed out." : message,
			},
			{ status: isAbort ? 504 : 500 },
		);
	}
}