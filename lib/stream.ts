export function buildStreamProxyUrl(streamUrl: string): string {
	return `/api/stream?url=${encodeURIComponent(streamUrl)}`;
}