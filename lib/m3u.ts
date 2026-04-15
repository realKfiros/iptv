import type { Category, Channel } from "@/types/iptv";

function normalizeLineEndings(value: string): string {
    return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function safeId(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function parseM3U(content: string): {
    categories: Category[];
    channels: Channel[];
} {
    const lines = normalizeLineEndings(content).split("\n");
    const channels: Channel[] = [];
    const categoryMap = new Map<string, Category>();

    let currentMeta: Partial<Channel> | null = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        if (line.startsWith("#EXTINF:")) {
            const name = line.split(",").pop()?.trim() || "Unknown Channel";
            const group = line.match(/group-title="([^"]+)"/)?.[1]?.trim();
            const logo = line.match(/tvg-logo="([^"]+)"/)?.[1]?.trim();

            currentMeta = {
                name,
                categoryName: group,
                categoryId: group ? safeId(group) : undefined,
                logo,
            };

            if (group && !categoryMap.has(group)) {
                categoryMap.set(group, {
                    id: safeId(group),
                    name: group,
                });
            }

            continue;
        }

        if (!line.startsWith("#") && currentMeta) {
            channels.push({
                id: `${currentMeta.name || "channel"}-${channels.length}`,
                name: currentMeta.name || "Unknown Channel",
                streamUrl: line,
                categoryId: currentMeta.categoryId,
                categoryName: currentMeta.categoryName,
                logo: currentMeta.logo,
            });

            currentMeta = null;
        }
    }

    return {
        categories: Array.from(categoryMap.values()),
        channels,
    };
}