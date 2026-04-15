import { NextResponse } from "next/server";
import { parseM3U } from "@/lib/m3u";

export const dynamic = "force-dynamic";

function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { url?: string };
		const url = body.url?.trim();

		if (!url) {
			return NextResponse.json({ error: "Missing playlist URL." }, { status: 400 });
		}

		if (!isValidHttpUrl(url)) {
			return NextResponse.json({ error: "Invalid playlist URL." }, { status: 400 });
		}

		const response = await fetch(url, {
			cache: "no-store",
			headers: {
				"User-Agent": "Mozilla/5.0 IPTV Player",
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Playlist request failed with status ${response.status}` },
				{ status: 502 },
			);
		}

		const text = await response.text();
		const parsed = parseM3U(text);

		return NextResponse.json(parsed);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to load playlist.",
			},
			{ status: 500 },
		);
	}
}