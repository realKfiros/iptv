import type {
	Category,
	Channel,
	XtreamCategoryDto,
	XtreamCredentials,
	XtreamLiveStreamDto,
} from "@/types/iptv";

function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function buildXtreamPlayerApiUrl(
	credentials: XtreamCredentials,
	action?: string,
): string {
	const server = stripTrailingSlash(credentials.server);
	const url = new URL(`${server}/player_api.php`);
	url.searchParams.set("username", credentials.username);
	url.searchParams.set("password", credentials.password);

	if (action) {
		url.searchParams.set("action", action);
	}

	return url.toString();
}

export function buildXtreamLiveStreamUrl(
	credentials: XtreamCredentials,
	streamId: string | number,
	extension = "m3u8",
): string {
	const server = stripTrailingSlash(credentials.server);
	return `${server}/live/${credentials.username}/${credentials.password}/${streamId}.${extension}`;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export async function loadXtreamLiveData(credentials: XtreamCredentials): Promise<{
	categories: Category[];
	channels: Channel[];
}> {
	const [categoriesResponse, streamsResponse] = await Promise.all([
		fetchJson<XtreamCategoryDto[]>(buildXtreamPlayerApiUrl(credentials, "get_live_categories")),
		fetchJson<XtreamLiveStreamDto[]>(buildXtreamPlayerApiUrl(credentials, "get_live_streams")),
	]);

	const categories: Category[] = categoriesResponse.map((item) => ({
		id: String(item.category_id),
		name: item.category_name,
	}));

	const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));

	const channels: Channel[] = streamsResponse.map((item, index) => {
		const categoryId = item.category_id ? String(item.category_id) : undefined;

		return {
			id: String(item.stream_id ?? index),
			name: item.name,
			streamUrl: item.direct_source || buildXtreamLiveStreamUrl(credentials, item.stream_id),
			categoryId,
			categoryName: categoryId ? categoryNameMap.get(categoryId) : undefined,
			logo: item.stream_icon || undefined,
			raw: item,
		};
	});

	return {
		categories,
		channels,
	};
}