import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT = 15000;

function isValidUrl(url: string) {
	try {
		const u = new URL(url);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}

function resolveUrl(value: string, base: string) {
	try {
		return new URL(value, base).toString();
	} catch {
		return value;
	}
}

function buildProxyUrl(target: string, requestUrl: string) {
	const url = new URL(requestUrl);
	url.pathname = "/api/stream/proxy";
	url.search = "";
	url.searchParams.set("url", target);
	return url.toString();
}

function isM3U8Content(target: string, contentType: string) {
	const normalizedType = contentType.toLowerCase();
	return (
		target.toLowerCase().includes(".m3u8") ||
		normalizedType.includes("mpegurl") ||
		normalizedType.includes("vnd.apple.mpegurl")
	);
}

function rewriteM3U8(content: string, upstreamUrl: string, requestUrl: string) {
	return content
		.split(/\r?\n/)
		.map((line) => {
			const trimmed = line.trim();

			if (!trimmed) {
				return line;
			}

			if (trimmed.startsWith("#")) {
				const uriRegex = /URI="([^"]+)"/g;

				return line.replace(uriRegex, (_, uri: string) => {
					const absolute = resolveUrl(uri, upstreamUrl);
					const proxied = buildProxyUrl(absolute, requestUrl);
					return `URI="${proxied}"`;
				});
			}

			const absolute = resolveUrl(trimmed, upstreamUrl);
			return buildProxyUrl(absolute, requestUrl);
		})
		.join("\n");
}

async function fetchWithTimeout(url: string, init: RequestInit) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT);

	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}

function buildHeaders(req: Request, target: string) {
	const headers = new Headers();
	const targetUrl = new URL(target);

	headers.set(
		"User-Agent",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
	);
	headers.set("Accept", "*/*");
	headers.set("Origin", targetUrl.origin);
	headers.set("Referer", `${targetUrl.origin}/`);
	headers.set("Connection", "keep-alive");

	const range = req.headers.get("range");
	if (range) {
		headers.set("Range", range);
	}

	return headers;
}

export async function GET(req: Request) {
	try {
		const url = new URL(req.url);
		const target = url.searchParams.get("url")?.trim();

		if (!target || !isValidUrl(target)) {
			return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
		}

		const upstream = await fetchWithTimeout(target, {
			headers: buildHeaders(req, target),
			redirect: "follow",
			cache: "no-store",
		});

		if (!upstream.ok && upstream.status !== 206) {
			const bodyPreview = await upstream.text().catch(() => "");

			return NextResponse.json(
				{
					error: `Upstream ${upstream.status}`,
					target,
					bodyPreview: bodyPreview.slice(0, 500),
				},
				{ status: upstream.status },
			);
		}

		const contentType = upstream.headers.get("content-type") || "";
		const finalUrl = upstream.url || target;

		if (isM3U8Content(finalUrl, contentType)) {
			const text = await upstream.text();
			const rewritten = rewriteM3U8(text, finalUrl, req.url);

			return new Response(rewritten, {
				status: upstream.status,
				headers: {
					"Content-Type": "application/vnd.apple.mpegurl",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "no-store",
				},
			});
		}

		const headers = new Headers();
		headers.set("Access-Control-Allow-Origin", "*");
		headers.set("Cache-Control", "no-store");

		for (const h of [
			"content-type",
			"content-length",
			"content-range",
			"accept-ranges",
		]) {
			const v = upstream.headers.get(h);
			if (v) headers.set(h, v);
		}

		return new Response(upstream.body, {
			status: upstream.status,
			headers,
		});
	} catch (e) {
		return NextResponse.json(
			{
				error: e instanceof Error ? e.message : "Proxy failed",
			},
			{ status: 500 },
		);
	}
}