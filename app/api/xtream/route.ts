import { NextResponse } from "next/server";
import { loadXtreamLiveData } from "@/lib/xtream";
import type { XtreamCredentials } from "@/types/iptv";

export const dynamic = "force-dynamic";

function sanitizeServer(server: string): string {
	return server.trim().replace(/\/+$/, "");
}

function isValidServer(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as Partial<XtreamCredentials>;

		const credentials: XtreamCredentials = {
			server: sanitizeServer(body.server || ""),
			username: body.username?.trim() || "",
			password: body.password?.trim() || "",
		};

		if (!credentials.server || !credentials.username || !credentials.password) {
			return NextResponse.json(
				{ error: "Missing server, username or password." },
				{ status: 400 },
			);
		}

		if (!isValidServer(credentials.server)) {
			return NextResponse.json({ error: "Invalid server URL." }, { status: 400 });
		}

		const data = await loadXtreamLiveData(credentials);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to login with Xtream.",
			},
			{ status: 500 },
		);
	}
}