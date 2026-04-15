"use client";

import {useEffect, useMemo, useRef} from "react";
import Hls from "hls.js";
import styled from "styled-components";
import {buildStreamProxyUrl} from "@/lib/stream";

const Video = styled.video`
    width: 100%;
    height: 100%;
    background: #000;
    border-radius: 16px;
`;

type Props = {
	src: string;
};

export default function Player({src}: Props) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const proxiedSrc = useMemo(() => buildStreamProxyUrl(src), [src]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !proxiedSrc) {
			return;
		}

		let hls: Hls | null = null;

		if (video.canPlayType("application/vnd.apple.mpegurl")) {
			video.src = proxiedSrc;
		} else if (Hls.isSupported()) {
			hls = new Hls();
			hls.loadSource(proxiedSrc);
			hls.attachMedia(video);
		} else {
			video.src = proxiedSrc;
		}

		video.play().catch(() => undefined);

		return () => {
			hls?.destroy();
		};
	}, [proxiedSrc]);

	return <Video ref={videoRef} controls playsInline/>;
}