import {action, computed, makeObservable, observable, runInAction} from "mobx";
import type {Category, Channel, SourceType, XtreamCredentials} from "@/types/iptv";
import {parseM3U} from "@/lib/m3u";
import {loadXtreamLiveData} from "@/lib/xtream";

class IPTVStore {
	@observable private _sourceType: SourceType = "playlist";
	@observable categories: Category[] = [];
	@observable channels: Channel[] = [];
	@observable selectedCategoryId = "all";
	@observable selectedChannel: Channel | null = null;
	loading = false;
	@observable error = "";
	@observable playlistUrl = "";
	@observable xtreamCredentials: XtreamCredentials = {
		server: "",
		username: "",
		password: "",
	};

	constructor() {
		makeObservable(this);
	}

	set sourceType(sourceType: SourceType) {
		this._sourceType = sourceType;
		this.error = "";
	}

	@computed
	get sourceType(): SourceType {
		return this._sourceType;
	}

	@action.bound
	setXtreamField<K extends keyof XtreamCredentials>(key: K, value: XtreamCredentials[K]): void {
		this.xtreamCredentials[key] = value;
	}

	@computed
	get filteredChannels(): Channel[] {
		if (this.selectedCategoryId === "all") {
			return this.channels;
		}

		return this.channels.filter((channel) => channel.categoryId === this.selectedCategoryId);
	}

	@computed
	get visibleCategories(): Category[] {
		return [{id: "all", name: "All"}, ...this.categories];
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