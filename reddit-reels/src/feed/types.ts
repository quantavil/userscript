export type PostKind = 'video' | 'redgifs' | 'embed' | 'gallery' | 'image' | 'text' | 'link';

export interface VideoSource {
  /** Progressive mp4 with audio (Reddit "packaged media"), best first. */
  mp4: string[];
  /** HLS playlist (Reddit v.redd.it), used when no mp4 exists. */
  hls: string;
  poster: string;
  captions: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  kind: PostKind;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  comments: number;
  permalink: string;
  nsfw: boolean;
  /** Live <shreddit-post> in Reddit's page (for native voting); null if detached. */
  el: HTMLElement | null;
  video?: VideoSource;
  /** RedGifs id (lowercase). */
  redgifsId?: string;
  /** Third-party player URL (YouTube, Streamable). */
  embedUrl?: string;
  images?: string[];
  text?: string;
  linkUrl?: string;
  thumbnail?: string;
}
