import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function buildProxyUrl(targetUrl: string, requestUrl: string): string {
	const base = new URL(requestUrl);
	base.pathname = "/api/stream";
	base.search = "";
	base.searchParams.set("url", targetUrl);
	return base.toString();
}

function resolveUrl(value: string, upstreamUrl: string): string {
	try {
		return new URL(value, upstreamUrl).toString();
	} catch {
		return value;
	}
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
				const uriMatch = line.match(/URI="([^"]+)"/);

				if (uriMatch?.[1]) {
					const absoluteUri = resolveUrl(uriMatch[1], upstreamUrl);
					const proxiedUri = buildProxyUrl(absoluteUri, requestUrl);

					return line.replace(`URI="${uriMatch[1]}"`, `URI="${proxiedUri}"`);
				}

				return line;
			}

			const absoluteUrl = resolveUrl(trimmed, upstreamUrl);
			return buildProxyUrl(absoluteUrl, requestUrl);
		})
		.join("\n");
}

function copyHeaderIfPresent(from: Headers, to: Headers, name: string): void {
	const value = from.get(name);
	if (value) {
		to.set(name, value);
	}
}

export async function GET(request: Request): Promise<Response> {
	try {
		const url = new URL(request.url);
		const target = url.searchParams.get("url")?.trim();

		if (!target) {
			return NextResponse.json({ error: "Missing stream URL." }, { status: 400 });
		}

		if (!isValidHttpUrl(target)) {
			return NextResponse.json({ error: "Invalid stream URL." }, { status: 400 });
		}

		const upstreamHeaders = new Headers();
		const targetUrl = new URL(target);

		upstreamHeaders.set(
			"User-Agent",
			request.headers.get("User-Agent") || "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:25.0) Gecko/20100101 Firefox/25.0",
		);
		upstreamHeaders.set("Accept", "*/*");
		upstreamHeaders.set("Referer", `${targetUrl.origin}/`);
		upstreamHeaders.set("Origin", targetUrl.origin);

		const upstream = await fetch(target, {
			method: "GET",
			headers: upstreamHeaders,
			cache: "no-store",
			redirect: "follow",
		});

		if (!upstream.ok && upstream.status !== 206) {
			const body = await upstream.text().catch(() => "");

			console.error(`Upstream request failed with status ${upstream.status}: ${body.slice(0, 500)}`);

			return NextResponse.json(
				{
					error: `Upstream returned ${upstream.status}`,
					upstreamStatus: upstream.status,
					bodyPreview: body.slice(0, 500),
					target,
				},
				{ status: upstream.status },
			);
		}

		const contentType = upstream.headers.get("content-type") || "";
		const isM3U8 =
			target.toLowerCase().includes(".m3u8") ||
			contentType.includes("application/vnd.apple.mpegurl") ||
			contentType.includes("application/x-mpegURL") ||
			contentType.includes("audio/mpegurl");

		if (isM3U8) {
			const text = await upstream.text();
			const rewritten = rewriteM3U8(text, upstream.url || target, request.url);

			const headers = new Headers();
			headers.set("Content-Type", "application/vnd.apple.mpegurl");
			headers.set("Cache-Control", "no-store");
			headers.set("Access-Control-Allow-Origin", "*");

			copyHeaderIfPresent(upstream.headers, headers, "etag");
			copyHeaderIfPresent(upstream.headers, headers, "last-modified");

			return new Response(rewritten, {
				status: upstream.status,
				headers,
			});
		}

		const headers = new Headers();
		headers.set("Cache-Control", "no-store");
		headers.set("Access-Control-Allow-Origin", "*");

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
		console.error("[stream] handler failed", error);

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to proxy stream.",
			},
			{ status: 500 },
		);
	}
}