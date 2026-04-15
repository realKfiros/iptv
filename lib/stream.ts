export function buildStreamProxyUrl(streamUrl: string): string {
	return `/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
}