import { action, computed, makeObservable, observable, runInAction } from "mobx";
import type { Category, Channel, SourceType, XtreamCredentials } from "@/types/iptv";

class IPTVStore {
	@observable private _sourceType: SourceType = "playlist";
	@observable categories: Category[] = [];
	@observable channels: Channel[] = [];
	@observable selectedCategoryId = "all";
	@observable selectedChannel: Channel | null = null;
	@observable loading = false;
	@observable error = "";
	@observable playlistUrl = "";
	@observable search = "";
	@observable categorySearch = "";
	@observable xtreamCredentials: XtreamCredentials = {
		server: "",
		username: "",
		password: "",
	};

	constructor() {
		makeObservable(this);
	}

	@action.bound
	setSourceType(sourceType: SourceType): void {
		this._sourceType = sourceType;
		this.error = "";
	}

	@computed
	get sourceType(): SourceType {
		return this._sourceType;
	}

	@action.bound
	setPlaylistUrl(value: string): void {
		this.playlistUrl = value;
	}

	@action.bound
	setSearch(value: string): void {
		this.search = value;
	}

	@action.bound
	setCategorySearch(value: string): void {
		this.categorySearch = value;
	}

	@action.bound
	setSelectedCategoryId(value: string): void {
		this.selectedCategoryId = value;
	}

	@action.bound
	selectChannel(channel: Channel): void {
		this.selectedChannel = channel;
	}

	@action.bound
	setXtreamField<K extends keyof XtreamCredentials>(key: K, value: XtreamCredentials[K]): void {
		this.xtreamCredentials[key] = value;
	}

	@computed
	get filteredChannels(): Channel[] {
		const search = this.search.trim().toLowerCase();

		return this.channels.filter((channel) => {
			const matchesCategory =
				this.selectedCategoryId === "all" || channel.categoryId === this.selectedCategoryId;

			const matchesSearch =
				!search || channel.name.toLowerCase().includes(search);

			return matchesCategory && matchesSearch;
		});
	}

	@computed
	get visibleCategories(): Category[] {
		const search = this.categorySearch.trim().toLowerCase();
		const categories = [{ id: "all", name: "All" }, ...this.categories];

		if (!search) {
			return categories;
		}

		return categories.filter((category) =>
			category.name.toLowerCase().includes(search),
		);
	}

	@action.bound
	async loadFromPlaylistUrl(): Promise<void> {
		if (!this.playlistUrl.trim()) {
			this.error = "Please enter a playlist URL.";
			return;
		}

		this.loading = true;
		this.error = "";

		try {
			const response = await fetch("/api/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: this.playlistUrl,
				}),
			});

			const data = (await response.json()) as {
				categories?: Category[];
				channels?: Channel[];
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error || "Failed to load playlist.");
			}

			runInAction(() => {
				this.categories = data.categories || [];
				this.channels = data.channels || [];
				this.selectedCategoryId = "all";
				this.search = "";
				this.categorySearch = "";
				this.selectedChannel = data.channels?.[0] || null;
			});
		} catch (error) {
			runInAction(() => {
				this.error = error instanceof Error ? error.message : "Failed to load playlist.";
			});
		} finally {
			runInAction(() => {
				this.loading = false;
			});
		}
	}

	@action.bound
	async loadFromXtream(): Promise<void> {
		const { server, username, password } = this.xtreamCredentials;

		if (!server.trim() || !username.trim() || !password.trim()) {
			this.error = "Please fill server, username and password.";
			return;
		}

		this.loading = true;
		this.error = "";

		try {
			const response = await fetch("/api/xtream", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(this.xtreamCredentials),
			});

			const data = (await response.json()) as {
				categories?: Category[];
				channels?: Channel[];
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error || "Failed to login with Xtream.");
			}

			runInAction(() => {
				this.categories = data.categories || [];
				this.channels = data.channels || [];
				this.selectedCategoryId = "all";
				this.search = "";
				this.categorySearch = "";
				this.selectedChannel = data.channels?.[0] || null;
			});
		} catch (error) {
			runInAction(() => {
				this.error = error instanceof Error ? error.message : "Failed to login with Xtream.";
			});
		} finally {
			runInAction(() => {
				this.loading = false;
			});
		}
	}
}

const iptvStore = new IPTVStore();
export default iptvStore;