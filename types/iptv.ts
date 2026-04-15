export type SourceType = "playlist" | "xtream";

export type Category = {
	id: string;
	name: string;
};

export type Channel = {
	id: string;
	name: string;
	streamUrl: string;
	categoryId?: string;
	categoryName?: string;
	logo?: string;
	raw?: unknown;
};

export type XtreamCredentials = {
	server: string;
	username: string;
	password: string;
};

export type XtreamCategoryDto = {
	category_id: string;
	category_name: string;
	parent_id?: number;
};

export type XtreamLiveStreamDto = {
	num?: number;
	name: string;
	stream_type?: string;
	stream_id: number | string;
	stream_icon?: string;
	epg_channel_id?: string;
	added?: string;
	category_id?: string | number;
	custom_sid?: string;
	tv_archive?: number;
	direct_source?: string;
	tv_archive_duration?: number;
};