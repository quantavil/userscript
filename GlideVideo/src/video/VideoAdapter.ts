// src/video/VideoAdapter.ts

export interface VideoAdapter {
	shouldIgnoreVideo(video: HTMLVideoElement): boolean;
}

export class GenericAdapter implements VideoAdapter {
	public shouldIgnoreVideo(video: HTMLVideoElement): boolean {
		// Standard ad overlay classes and indicators
		return !!video.closest(
			'.ad-container, [class*="ad-unit"], [id*="ad-unit"], ' +
				'[class*="video-ad"], [class*="ad-player"], [class*="ad-overlay"], ' +
				'[id*="video-ad"], [id*="ad-player"]',
		);
	}
}

export class YoutubeAdapter extends GenericAdapter {
	public shouldIgnoreVideo(video: HTMLVideoElement): boolean {
		// YouTube-specific ad overlay classes
		if (video.closest(".video-ads, .ytp-ad-player-overlay")) return true;
		return super.shouldIgnoreVideo(video);
	}
}

export function getVideoAdapter(): VideoAdapter {
	const host =
		(typeof window !== "undefined" &&
			window.location &&
			window.location.hostname) ||
		"";
	if (host.includes("youtube.com") || host.includes("youtu.be")) {
		return new YoutubeAdapter();
	}
	return new GenericAdapter();
}
