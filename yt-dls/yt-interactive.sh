#!/bin/bash
set -o pipefail

# --- Configuration ---
MAX_FILENAME_LENGTH=200
OUTPUT_DIR="$HOME/Videos/"

# --- Dependency Check ---
for cmd in yt-dlp jq fzf column; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "❌ Error: '$cmd' is not installed."
        exit 1
    fi
done

# --- Cleanup Trap (Stops spinner on Ctrl+C) ---
cleanup() {
    [ -n "$SPIN_PID" ] && kill "$SPIN_PID" 2>/dev/null
    tput cnorm # Restore cursor
    exit 1
}
trap cleanup INT TERM

URL="$1"
[ -z "$URL" ] && { echo "Usage: $(basename "$0") <url>"; exit 1; }

# --- Helper: Spinner ---
start_spinner() {
    set +m
    tput civis # Hide cursor
    echo -n "$1 "
    { while : ; do for X in '⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏'; do echo -en "\b$X"; sleep 0.1; done; done & } 2>/dev/null
    SPIN_PID=$!
}

stop_spinner() {
    [ -n "$SPIN_PID" ] && kill "$SPIN_PID" &>/dev/null
    echo -en "\b✅\n"
    tput cnorm # Restore cursor
    set -m
}

# --- Playlist Handling ---
if [[ "$URL" == *"list="* ]]; then
    start_spinner " Playlist detected. Fetching list..."
    PLAYLIST_JSON=$(yt-dlp --flat-playlist -J "$URL")
    stop_spinner

    [ -z "$PLAYLIST_JSON" ] && { echo "❌ Failed to fetch playlist"; exit 1; }

    # Format: ID | Title | Duration
    VID_SELECT=$(echo "$PLAYLIST_JSON" | jq -r '
        .entries[] |
        (.duration // 0) as $d |
        (if $d >= 3600 then "\($d/3600|floor)h \($d/60%60|floor)m" elif $d >= 60 then "\($d/60|floor)m \($d%60|floor)s" else "\($d)s" end) as $dur |
        "\(.id)\t\(.title)\t\($dur)"
        ' | \
        { echo -e "ID\tTITLE\tDURATION"; cat; } | \
        column -t -s $'\t' | \
        fzf --prompt="Select Video ▶ " --header-lines=1 --reverse --no-info --height=80%
    ) || exit 1

    VID_ID_ONLY=$(echo "$VID_SELECT" | awk '{print $1}')
    [ -z "$VID_ID_ONLY" ] && exit 1

    URL="https://www.youtube.com/watch?v=$VID_ID_ONLY"
    echo -e "📌 Selected ID: \033[1;36m$VID_ID_ONLY\033[0m\n"
fi

# --- Metadata Fetch ---
start_spinner "⏳ Fetching video metadata..."
# Added --no-playlist to prevent accidental bulk fetch
JSON=$(yt-dlp --no-playlist -J "$URL")
stop_spinner
[ -z "$JSON" ] && { echo "❌ Failed to fetch metadata"; exit 1; }

TITLE=$(echo "$JSON" | jq -r '.title')
echo -e "📺 \033[1;37m$TITLE\033[0m\n"

# --- Select Video Stream ---
# FIX: Hidden sort column (Format: HEIGHT \t ID \t Display...)
VID_SELECTION=$(
    {
        echo -e "0\tID\tRES\tFPS\tEXT\tCODEC\tSIZE"
        echo "$JSON" | jq -r '
            (.formats | map(select(.vcodec != "none")) | max_by(.height // 0).format_id) as $best |
            .formats[]
            | select(.vcodec != "none")
            | select(.format_id | test("^sb") | not)
            | (.vcodec | split(".")[0] | if . == "avc1" then "H.264" elif . == "hev1" or . == "hvc1" then "H.265" elif . == "vp09" or . == "vp9" then "VP9" elif startswith("av01") then "AV1" else . end) as $nice_codec
            | "\(.height // 0)\t\(.format_id)\t\(if .format_id == $best then "⭐" else " " end) \(.height // 0)p\t\(.fps // 0)fps\t\(.ext)\t\($nice_codec)\t\(if (.filesize // .filesize_approx) then ((.filesize // .filesize_approx)/1048576 | floor | tostring + "MB") else "N/A" end)"
        ' | sort -t$'\t' -k1 -nr 
    } | cut -f2- | column -t -s $'\t' | \
    { cat; echo "none     (no video)"; } | \
    fzf --prompt="Video ▶ " --header-lines=1 --reverse --no-info --color="header:bold,prompt:blue" --height=40%
) || exit 1

VID_ID=$(echo "$VID_SELECTION" | awk '{print $1}')
[ -z "$VID_ID" ] && exit 1

# --- Select Audio Stream ---
AUD_SELECTION=$(
    {
        echo -e "ID\tBITRATE\tEXT\tCODEC"
        echo "$JSON" | jq -r '
            .formats[]
            | select(.acodec != "none")
            | select(.vcodec == "none") 
            | select(.format_id | test("^sb") | not)
            | "\(.format_id)\t\(.abr // 0)kbps\t\(.ext)\t\(.acodec // "unknown")"
        ' | sort -t$'\t' -k2 -nr
    } | column -t -s $'\t' | \
    { cat; echo "none     (no audio)"; } | \
    fzf --prompt="Audio ▶ " --header-lines=1 --reverse --no-info --color="header:bold,prompt:blue" --height=30%
) || exit 1

AUD_ID=$(echo "$AUD_SELECTION" | awk '{print $1}')
[ -z "$AUD_ID" ] && exit 1

if [ "$VID_ID" == "none" ] && [ "$AUD_ID" == "none" ]; then
    echo "❌ Nothing selected. Exiting."
    exit 1
fi

# --- Select Subtitles ---
SUB_ARGS=()
SUB_CODES="none"

SUB_LIST=$(echo "$JSON" | jq -r '
    (.subtitles // {} | to_entries[] | "\(.key)\t\(.value[0].name // .key) [Official]"),
    (.automatic_captions // {} | to_entries[] | "\(.key)\t\(.value[0].name // .key) [Auto]")
' | column -t -s $'\t')

if [ -n "$SUB_LIST" ]; then
    SUB_SELECTION=$(fzf -m \
        --prompt="Subs (Tab for Multi) ▶ " \
        --header="CODE      LANGUAGE" \
        --reverse --header-first --color="header:bold,prompt:blue" --no-info --height=30% \
        <<< "$SUB_LIST
none     (no subtitles)"
    ) || true

    SUB_CODES=$(echo "$SUB_SELECTION" | grep -v "none" | awk '{print $1}' | paste -sd "," -)
    if [ -n "$SUB_CODES" ]; then
        SUB_ARGS+=(--write-subs --write-auto-subs --sub-langs "$SUB_CODES")
        # Only embed if video exists
        [[ "$VID_ID" != "none" ]] && SUB_ARGS+=(--embed-subs)
    fi
fi

# --- Format Logic ---
MODE_ARGS=()
FINAL_EXT=""
YT_ID=$(echo "$JSON" | jq -r '.id')

if [ "$VID_ID" == "none" ]; then
    # Audio Only
    FORMAT_STR="$AUD_ID"
    AUD_FMT=$(echo -e "mp3\nm4a\nwav\nopus" | fzf --prompt="Audio Format ▶ " --reverse --height=20%) || exit 1
    MODE_ARGS=(-x --audio-format "$AUD_FMT")
    FINAL_EXT="$AUD_FMT"
elif [ "$AUD_ID" == "none" ]; then
    # Video Only
    FORMAT_STR="$VID_ID"
    CONTAINER=$(echo -e "mp4\nmkv\nwebm" | fzf --prompt="Container ▶ " --reverse --height=20%) || exit 1
    MODE_ARGS=(--remux-video "$CONTAINER")
    FINAL_EXT="$CONTAINER"
else
    # Video + Audio
    FORMAT_STR="$VID_ID+$AUD_ID"
    CONTAINER=$(echo -e "mkv\nmp4\nwebm" | fzf --prompt="Container ▶ " --reverse --height=20%) || exit 1
    MODE_ARGS=(--merge-output-format "$CONTAINER")
    FINAL_EXT="$CONTAINER"
fi

# --- Output Naming ---
mkdir -p "$OUTPUT_DIR"
SAFE_TITLE=$(echo "$TITLE" | tr -d '\n\r' | sed 's/[/\\:*?"<>|]/_/g')
[ ${#SAFE_TITLE} -gt $MAX_FILENAME_LENGTH ] && SAFE_TITLE="${SAFE_TITLE:0:$MAX_FILENAME_LENGTH}"

BASE_STEM="$SAFE_TITLE [$YT_ID]"
FINAL_STEM="$BASE_STEM"
COUNT=1

while [[ -f "$OUTPUT_DIR/$FINAL_STEM.$FINAL_EXT" ]]; do
    FINAL_STEM="$BASE_STEM ($COUNT)"
    ((COUNT++))
done

# --- Size Estimate ---
VID_SIZE=0
AUD_SIZE=0
if [ "$VID_ID" != "none" ]; then
    VID_SIZE=$(echo "$JSON" | jq -r --arg id "$VID_ID" '.formats[] | select(.format_id == $id) | ((.filesize // .filesize_approx) // 0)')
fi
if [ "$AUD_ID" != "none" ]; then
    AUD_SIZE=$(echo "$JSON" | jq -r --arg id "$AUD_ID" '.formats[] | select(.format_id == $id) | ((.filesize // .filesize_approx) // 0)')
fi
TOTAL_MB=$(( (VID_SIZE + AUD_SIZE) / 1048576 ))

# --- Summary & Execute ---
echo -e "\n\033[1;34m┌───────────────────────────────────────────────────┐\033[0m"
echo -e "\033[1;34m│\033[0m 📹 VideoFmt: $VID_ID"
echo -e "\033[1;34m│\033[0m 🔊 AudioFmt: $AUD_ID"
echo -e "\033[1;34m│\033[0m 💬 Subs:     ${SUB_CODES:-none}"
echo -e "\033[1;34m│\033[0m 📦 Size:     ~$TOTAL_MB MB"
echo -e "\033[1;34m│\033[0m 📂 Output:   $FINAL_STEM.$FINAL_EXT"
echo -e "\033[1;34m└───────────────────────────────────────────────────┘\033[0m\n"

read -rp "Proceed? [Y/n] " confirm
[[ "$confirm" =~ ^[Nn] ]] && { echo "Cancelled."; exit 0; }

echo "⬇️  Downloading..."
yt-dlp \
    -f "$FORMAT_STR" \
    "${SUB_ARGS[@]}" \
    "${MODE_ARGS[@]}" \
    -P "$OUTPUT_DIR" \
    -o "$FINAL_STEM.%(ext)s" \
    --progress \
    "$URL" && echo -e "\n✅ Done! Saved to $OUTPUT_DIR"