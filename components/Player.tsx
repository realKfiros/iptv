"use client";

import {useEffect, useRef} from "react";
import Hls from "hls.js";
import styled from "styled-components";

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

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) {
            return;
        }

        let hls: Hls | null = null;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src;
        } else if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
        } else {
            video.src = src;
        }

        video.play().catch(() => undefined);

        return () => {
            hls?.destroy();
        };
    }, [src]);

    return <Video ref={videoRef} controls playsInline/>;
}