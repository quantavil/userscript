// ==UserScript==
// @name         Telegram Media Downloader
// @version      1.400
// @namespace    https://t.me/+mg8_ktxbN8UwOTdi
// @description  Download images, GIFs, videos, and voice messages on the Telegram webapp from private channels that disable downloading and restrict saving content
// @author       TG @TypTems (Enhanced by Claude)
// @license      GNU GPLv3
// @website      https://t.me/+mg8_ktxbN8UwOTdi
// @match        https://web.telegram.org/*
// @match        https://webk.telegram.org/*
// @match        https://webz.telegram.org/*
// @icon         https://img.icons8.com/color/452/telegram-app--v5.png
// @downloadURL https://update.greasyfork.org/scripts/551447/Telegram%20Media%20Downloader.user.js
// @updateURL https://update.greasyfork.org/scripts/551447/Telegram%20Media%20Downloader.meta.js
// ==/UserScript==

(function () {
  const logger = {
    info: (message, fileName = null) => {
      console.log(
        `[Tel Download] ${fileName ? `${fileName}: ` : ""}${message}`
      );
    },
    error: (message, fileName = null) => {
      console.error(
        `[Tel Download] ${fileName ? `${fileName}: ` : ""}${message}`
      );
    },
  };

  const DOWNLOAD_ICON = "\uE95E";
  const FORWARD_ICON = "\uE97A";
  const contentRangeRegex = /^bytes (\d+)-(\d+)\/(\d+)$/;
  const REFRESH_DELAY = 500;
  const TEL_DOWNLOAD_ATTR = "data-tel-download-id";
  const downloadStates = new Map(); // Track active downloads

  const hashCode = (s) => {
    var h = 0,
      l = s.length,
      i = 0;
    if (l > 0) {
      while (i < l) {
        h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
      }
    }
    return h >>> 0;
  };

  // Modern, minimal UI progress bar
  const createProgressBar = (videoId, fileName, onPauseResume) => {
    const container = document.getElementById(
      "tel-downloader-progress-bar-container"
    );

    const innerContainer = document.createElement("div");
    innerContainer.id = "tel-downloader-progress-" + videoId;
    innerContainer.className = "tel-progress-card";

    const header = document.createElement("div");
    header.className = "tel-progress-header";

    const fileInfo = document.createElement("div");
    fileInfo.className = "tel-progress-file-info";

    const fileIcon = document.createElement("div");
    fileIcon.className = "tel-progress-icon";
    fileIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;

    const fileName_el = document.createElement("div");
    fileName_el.className = "tel-progress-filename";
    fileName_el.textContent = fileName;

    // Pause/Resume button
    const pauseResumeButton = document.createElement("button");
    pauseResumeButton.className = "tel-progress-pause";
    pauseResumeButton.innerHTML = `
      <svg class="tel-pause-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      <svg class="tel-resume-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    `;
    pauseResumeButton.onclick = onPauseResume;

    const closeButton = document.createElement("button");
    closeButton.className = "tel-progress-close";
    closeButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.onclick = function () {
      // Cancel download if active
      const state = downloadStates.get(videoId);
      if (state && state.abortController) {
        state.abortController.abort();
        downloadStates.delete(videoId);
      }
      innerContainer.style.animation = "tel-slideOut 0.3s ease-out";
      setTimeout(() => {
        if (container.contains(innerContainer)) {
          container.removeChild(innerContainer);
        }
      }, 300);
    };

    fileInfo.appendChild(fileIcon);
    fileInfo.appendChild(fileName_el);
    header.appendChild(fileInfo);
    header.appendChild(pauseResumeButton);
    header.appendChild(closeButton);

    const progressContainer = document.createElement("div");
    progressContainer.className = "tel-progress-container";

    const progressBar = document.createElement("div");
    progressBar.className = "tel-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "tel-progress-fill";

    const progressText = document.createElement("div");
    progressText.className = "tel-progress-text";
    progressText.textContent = "0%";

    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);

    innerContainer.appendChild(header);
    innerContainer.appendChild(progressContainer);
    container.appendChild(innerContainer);

    // Trigger animation
    setTimeout(() => innerContainer.classList.add("tel-show"), 10);
  };

  const updateProgress = (videoId, fileName, progress) => {
    const innerContainer = document.getElementById(
      "tel-downloader-progress-" + videoId
    );
    if (!innerContainer) return;

    innerContainer.querySelector(".tel-progress-filename").textContent = fileName;
    innerContainer.querySelector(".tel-progress-text").textContent = progress + "%";
    innerContainer.querySelector(".tel-progress-fill").style.width = progress + "%";
  };

  const togglePauseState = (videoId, isPaused) => {
    const innerContainer = document.getElementById(
      "tel-downloader-progress-" + videoId
    );
    if (!innerContainer) return;

    const pauseIcon = innerContainer.querySelector(".tel-pause-icon");
    const resumeIcon = innerContainer.querySelector(".tel-resume-icon");
    const progressText = innerContainer.querySelector(".tel-progress-text");
    const currentProgress = innerContainer.querySelector(".tel-progress-fill").style.width;

    if (isPaused) {
      pauseIcon.style.display = "none";
      resumeIcon.style.display = "block";
      innerContainer.classList.add("tel-paused");
      progressText.textContent = `⏸ Paused (${currentProgress})`;
    } else {
      pauseIcon.style.display = "block";
      resumeIcon.style.display = "none";
      innerContainer.classList.remove("tel-paused");
    }
  };

  const completeProgress = (videoId) => {
    const innerContainer = document.getElementById(
      "tel-downloader-progress-" + videoId
    );
    if (!innerContainer) return;

    innerContainer.querySelector(".tel-progress-text").textContent = "✓ Complete";
    innerContainer.querySelector(".tel-progress-fill").style.width = "100%";
    innerContainer.querySelector(".tel-progress-fill").classList.add("tel-complete");

    // Hide pause button on completion
    const pauseBtn = innerContainer.querySelector(".tel-progress-pause");
    if (pauseBtn) pauseBtn.style.display = "none";

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (innerContainer.parentNode) {
        innerContainer.style.animation = "tel-slideOut 0.3s ease-out";
        setTimeout(() => {
          if (innerContainer.parentNode) {
            innerContainer.parentNode.removeChild(innerContainer);
          }
        }, 300);
      }
    }, 3000);
  };

  const AbortProgress = (videoId) => {
    const innerContainer = document.getElementById(
      "tel-downloader-progress-" + videoId
    );
    if (!innerContainer) return;

    innerContainer.querySelector(".tel-progress-text").textContent = "✗ Failed";
    innerContainer.querySelector(".tel-progress-fill").classList.add("tel-error");
    
    // Hide pause button on error
    const pauseBtn = innerContainer.querySelector(".tel-progress-pause");
    if (pauseBtn) pauseBtn.style.display = "none";
  };

  const showError = (message) => {
    const container = document.getElementById(
      "tel-downloader-progress-bar-container"
    );
    const errorId = "error-" + Date.now();
    const errorCard = document.createElement("div");
    errorCard.id = errorId;
    errorCard.className = "tel-progress-card tel-error-card";
    errorCard.innerHTML = `
      <div class="tel-progress-header">
        <div class="tel-progress-file-info">
          <div class="tel-progress-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="tel-progress-filename">${message}</div>
        </div>
        <button class="tel-progress-close" onclick="this.parentElement.parentElement.remove()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    container.appendChild(errorCard);
    setTimeout(() => errorCard.classList.add("tel-show"), 10);
    setTimeout(() => errorCard.remove(), 5000);
  };

  const tel_download_video = (url) => {
    let _blobs = [];
    let _next_offset = 0;
    let _total_size = null;
    let _file_extension = "mp4";
    let _writable = null;
    let _abortController = null;
    let _isPaused = false;

    const videoId =
      (Math.random() + 1).toString(36).substring(2, 10) +
      "_" +
      Date.now().toString();
    let fileName = hashCode(url).toString(36) + "." + _file_extension;

    try {
      const metadata = JSON.parse(
        decodeURIComponent(url.split("/")[url.split("/").length - 1])
      );
      if (metadata.fileName) {
        fileName = metadata.fileName;
      }
    } catch (e) {
      // Invalid JSON string, pass extracting fileName
    }
    logger.info(`URL: ${url}`, fileName);

    const fetchNextPart = () => {
      if (_isPaused) return;

      _abortController = new AbortController();
      downloadStates.set(videoId, {
        abortController: _abortController,
        isPaused: false,
        resume: resumeDownload
      });

      fetch(url, {
        method: "GET",
        headers: {
          Range: `bytes=${_next_offset}-`,
        },
        signal: _abortController.signal,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0",
      })
        .then((res) => {
          if (![200, 206].includes(res.status)) {
            throw new Error("Non 200/206 response was received: " + res.status);
          }
          const mime = res.headers.get("Content-Type").split(";")[0];
          if (!mime.startsWith("video/")) {
            throw new Error("Get non video response with MIME type " + mime);
          }
          _file_extension = mime.split("/")[1];
          fileName =
            fileName.substring(0, fileName.indexOf(".") + 1) + _file_extension;

          const match = res.headers
            .get("Content-Range")
            .match(contentRangeRegex);

          const startOffset = parseInt(match[1]);
          const endOffset = parseInt(match[2]);
          const totalSize = parseInt(match[3]);

          if (startOffset !== _next_offset) {
            logger.error("Gap detected between responses.", fileName);
            logger.info("Last offset: " + _next_offset, fileName);
            logger.info("New start offset " + match[1], fileName);
            throw "Gap detected between responses.";
          }
          if (_total_size && totalSize !== _total_size) {
            logger.error("Total size differs", fileName);
            throw "Total size differs";
          }

          _next_offset = endOffset + 1;
          _total_size = totalSize;

          logger.info(
            `Get response: ${res.headers.get(
              "Content-Length"
            )} bytes data from ${res.headers.get("Content-Range")}`,
            fileName
          );
          logger.info(
            `Progress: ${((_next_offset * 100) / _total_size).toFixed(0)}%`,
            fileName
          );
          updateProgress(
            videoId,
            fileName,
            ((_next_offset * 100) / _total_size).toFixed(0)
          );
          return res.blob();
        })
        .then((resBlob) => {
          if (_writable !== null) {
            return _writable.write(resBlob);
          } else {
            _blobs.push(resBlob);
          }
        })
        .then(() => {
          if (!_total_size) {
            throw new Error("_total_size is NULL");
          }

          if (_next_offset < _total_size && !_isPaused) {
            fetchNextPart();
          } else if (_next_offset >= _total_size) {
            if (_writable !== null) {
              _writable.close().then(() => {
                logger.info("Download finished", fileName);
              });
            } else {
              save();
            }
            completeProgress(videoId);
            downloadStates.delete(videoId);
          }
        })
        .catch((reason) => {
          if (reason.name === 'AbortError') {
            logger.info("Download paused", fileName);
            return;
          }
          logger.error(reason, fileName);
          AbortProgress(videoId);
          downloadStates.delete(videoId);
        });
    };

    const pauseDownload = () => {
      _isPaused = true;
      if (_abortController) {
        _abortController.abort();
      }
      const state = downloadStates.get(videoId);
      if (state) {
        state.isPaused = true;
      }
      togglePauseState(videoId, true);
      logger.info("Paused at offset: " + _next_offset, fileName);
    };

    const resumeDownload = () => {
      _isPaused = false;
      const state = downloadStates.get(videoId);
      if (state) {
        state.isPaused = false;
      }
      togglePauseState(videoId, false);
      logger.info("Resuming from offset: " + _next_offset, fileName);
      fetchNextPart();
    };

    const togglePause = () => {
      const state = downloadStates.get(videoId);
      if (!state) return;

      if (state.isPaused || _isPaused) {
        resumeDownload();
      } else {
        pauseDownload();
      }
    };

    const save = () => {
      logger.info("Finish downloading blobs", fileName);
      logger.info("Concatenating blobs and downloading...", fileName);

      const blob = new Blob(_blobs, { type: "video/mp4" });
      const blobUrl = window.URL.createObjectURL(blob);

      logger.info("Final blob size: " + blob.size + " bytes", fileName);

      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      logger.info("Download triggered", fileName);
    };

    const supportsFileSystemAccess =
      "showSaveFilePicker" in unsafeWindow &&
      (() => {
        try {
          return unsafeWindow.self === unsafeWindow.top;
        } catch {
          return false;
        }
      })();

    createProgressBar(videoId, fileName, togglePause);

    if (supportsFileSystemAccess) {
      unsafeWindow
        .showSaveFilePicker({
          suggestedName: fileName,
        })
        .then((handle) => {
          handle
            .createWritable()
            .then((writable) => {
              _writable = writable;
              fetchNextPart();
            })
            .catch((err) => {
              logger.error("createWritable error: " + err.message, fileName);
              AbortProgress(videoId);
              showError("Failed to create file: " + err.message);
            });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            logger.error("showSaveFilePicker error: " + err.message, fileName);
            showError("Save cancelled or failed");
          }
          // Remove progress bar if user cancelled
          const progressEl = document.getElementById("tel-downloader-progress-" + videoId);
          if (progressEl && progressEl.parentNode) {
            progressEl.parentNode.removeChild(progressEl);
          }
          downloadStates.delete(videoId);
        });
    } else {
      fetchNextPart();
    }
  };

  const tel_download_audio = (url) => {
    let _blobs = [];
    let _next_offset = 0;
    let _total_size = null;
    let _writable = null;
    let _abortController = null;
    let _isPaused = false;
    const fileName = hashCode(url).toString(36) + ".ogg";

    const audioId =
      (Math.random() + 1).toString(36).substring(2, 10) +
      "_" +
      Date.now().toString();

    const fetchNextPart = () => {
      if (_isPaused) return;

      _abortController = new AbortController();
      downloadStates.set(audioId, {
        abortController: _abortController,
        isPaused: false,
        resume: resumeDownload
      });

      fetch(url, {
        method: "GET",
        headers: {
          Range: `bytes=${_next_offset}-`,
        },
        signal: _abortController.signal,
      })
        .then((res) => {
          if (res.status !== 206 && res.status !== 200) {
            logger.error(
              "Non 200/206 response was received: " + res.status,
              fileName
            );
            throw new Error("Non 200/206 response: " + res.status);
          }

          const mime = res.headers.get("Content-Type").split(";")[0];
          if (!mime.startsWith("audio/")) {
            logger.error(
              "Get non audio response with MIME type " + mime,
              fileName
            );
            throw new Error("Get non audio response with MIME type " + mime);
          }

          try {
            const match = res.headers
              .get("Content-Range")
              .match(contentRangeRegex);

            const startOffset = parseInt(match[1]);
            const endOffset = parseInt(match[2]);
            const totalSize = parseInt(match[3]);

            if (startOffset !== _next_offset) {
              logger.error("Gap detected between responses.");
              logger.info("Last offset: " + _next_offset);
              logger.info("New start offset " + match[1]);
              throw new Error("Gap detected between responses.");
            }
            if (_total_size && totalSize !== _total_size) {
              logger.error("Total size differs");
              throw new Error("Total size differs");
            }

            _next_offset = endOffset + 1;
            _total_size = totalSize;

            updateProgress(
              audioId,
              fileName,
              ((_next_offset * 100) / _total_size).toFixed(0)
            );
          } finally {
            logger.info(
              `Get response: ${res.headers.get(
                "Content-Length"
              )} bytes data from ${res.headers.get("Content-Range")}`
            );
            return res.blob();
          }
        })
        .then((resBlob) => {
          if (_writable !== null) {
            return _writable.write(resBlob);
          } else {
            _blobs.push(resBlob);
          }
        })
        .then(() => {
          if (_next_offset < _total_size && !_isPaused) {
            fetchNextPart();
          } else if (_next_offset >= _total_size) {
            if (_writable !== null) {
              _writable.close().then(() => {
                logger.info("Download finished", fileName);
              });
            } else {
              save();
            }
            completeProgress(audioId);
            downloadStates.delete(audioId);
          }
        })
        .catch((reason) => {
          if (reason.name === 'AbortError') {
            logger.info("Download paused", fileName);
            return;
          }
          logger.error(reason, fileName);
          AbortProgress(audioId);
          downloadStates.delete(audioId);
        });
    };

    const pauseDownload = () => {
      _isPaused = true;
      if (_abortController) {
        _abortController.abort();
      }
      const state = downloadStates.get(audioId);
      if (state) {
        state.isPaused = true;
      }
      togglePauseState(audioId, true);
      logger.info("Paused at offset: " + _next_offset, fileName);
    };

    const resumeDownload = () => {
      _isPaused = false;
      const state = downloadStates.get(audioId);
      if (state) {
        state.isPaused = false;
      }
      togglePauseState(audioId, false);
      logger.info("Resuming from offset: " + _next_offset, fileName);
      fetchNextPart();
    };

    const togglePause = () => {
      const state = downloadStates.get(audioId);
      if (!state) return;

      if (state.isPaused || _isPaused) {
        resumeDownload();
      } else {
        pauseDownload();
      }
    };

    const save = () => {
      logger.info(
        "Finish downloading blobs. Concatenating blobs and downloading...",
        fileName
      );

      let blob = new Blob(_blobs, { type: "audio/ogg" });
      const blobUrl = window.URL.createObjectURL(blob);

      logger.info("Final blob size in bytes: " + blob.size, fileName);

      blob = 0;

      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      logger.info("Download triggered", fileName);
    };

    const supportsFileSystemAccess =
      "showSaveFilePicker" in unsafeWindow &&
      (() => {
        try {
          return unsafeWindow.self === unsafeWindow.top;
        } catch {
          return false;
        }
      })();

    createProgressBar(audioId, fileName, togglePause);

    if (supportsFileSystemAccess) {
      unsafeWindow
        .showSaveFilePicker({
          suggestedName: fileName,
        })
        .then((handle) => {
          handle
            .createWritable()
            .then((writable) => {
              _writable = writable;
              fetchNextPart();
            })
            .catch((err) => {
              logger.error("createWritable error: " + err.message, fileName);
              AbortProgress(audioId);
              showError("Failed to create file: " + err.message);
            });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            logger.error("showSaveFilePicker error: " + err.message, fileName);
            showError("Save cancelled or failed");
          }
          const progressEl = document.getElementById("tel-downloader-progress-" + audioId);
          if (progressEl && progressEl.parentNode) {
            progressEl.parentNode.removeChild(progressEl);
          }
          downloadStates.delete(audioId);
        });
    } else {
      fetchNextPart();
    }
  };

  const tel_download_image = (imageUrl) => {
    const fileName =
      (Math.random() + 1).toString(36).substring(2, 10) + ".jpeg";

    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = imageUrl;
    a.download = fileName;
    a.click();
    document.body.removeChild(a);

    logger.info("Download triggered", fileName);
  };

  logger.info("Initialized");

  const createDownloadButton = (className, iconHTML, onClick, url = null) => {
    const button = document.createElement("button");
    button.className = className + " tel-download";
    button.setAttribute(TEL_DOWNLOAD_ATTR, url || "");
    button.innerHTML = iconHTML;
    button.setAttribute("type", "button");
    button.setAttribute("title", "Download");
    button.setAttribute("aria-label", "Download");
    button.onclick = onClick;
    return button;
  };

  const shouldAddButton = (container, selector, url) => {
    const existingTelButton = container.querySelector(`.tel-download[${TEL_DOWNLOAD_ATTR}]`);
    const nativeButton = container.querySelector(selector);

    // Remove our button if native exists
    if (nativeButton && existingTelButton) {
      existingTelButton.remove();
      return false;
    }

    // Update if URL changed
    if (existingTelButton) {
      const currentUrl = existingTelButton.getAttribute(TEL_DOWNLOAD_ATTR);
      if (currentUrl !== url) {
        existingTelButton.remove();
        return true;
      }
      return false;
    }

    // Add if no buttons exist
    return !nativeButton;
  };

  // For webz /a/ webapp
  setInterval(() => {
    // Stories
    const storiesContainer = document.getElementById("StoryViewer");
    if (storiesContainer) {
      const storyHeader =
        storiesContainer.querySelector(".GrsJNw3y") ||
        storiesContainer.querySelector(".DropdownMenu")?.parentNode;

      if (storyHeader && !storyHeader.querySelector(".tel-download")) {
        const downloadIcon = document.createElement("i");
        downloadIcon.className = "icon icon-download";
        const button = createDownloadButton(
          "Button TkphaPyQ tiny translucent-white round",
          "",
          () => {
            const video = storiesContainer.querySelector("video");
            const videoSrc =
              video?.src ||
              video?.currentSrc ||
              video?.querySelector("source")?.src;
            if (videoSrc) {
              tel_download_video(videoSrc);
            } else {
              const images = storiesContainer.querySelectorAll("img.PVZ8TOWS");
              if (images.length > 0) {
                const imageSrc = images[images.length - 1]?.src;
                if (imageSrc) tel_download_image(imageSrc);
              }
            }
          }
        );
        button.appendChild(downloadIcon);
        storyHeader.insertBefore(
          button,
          storyHeader.querySelector("button")
        );
      }
    }

    const mediaContainer = document.querySelector(
      "#MediaViewer .MediaViewerSlide--active"
    );
    const mediaViewerActions = document.querySelector(
      "#MediaViewer .MediaViewerActions"
    );
    if (!mediaContainer || !mediaViewerActions) return;

    const videoPlayer = mediaContainer.querySelector(
      ".MediaViewerContent > .VideoPlayer"
    );
    const img = mediaContainer.querySelector(".MediaViewerContent > div > img");

    if (videoPlayer) {
      const videoUrl = videoPlayer.querySelector("video").currentSrc;
      const downloadIcon = document.createElement("i");
      downloadIcon.className = "icon icon-download";

      if (shouldAddButton(mediaViewerActions, 'button[title="Download"]:not(.tel-download)', videoUrl)) {
        const button = createDownloadButton(
          "Button smaller translucent-white round",
          "",
          () => tel_download_video(videoPlayer.querySelector("video").currentSrc),
          videoUrl
        );
        button.appendChild(downloadIcon.cloneNode(true));
        mediaViewerActions.prepend(button);
      }

      const controls = videoPlayer.querySelector(".VideoPlayerControls");
      if (controls) {
        const buttons = controls.querySelector(".buttons");
        if (shouldAddButton(buttons, 'button[title="Download"]:not(.tel-download)', videoUrl)) {
          const button = createDownloadButton(
            "Button smaller translucent-white round",
            "",
            () => tel_download_video(videoPlayer.querySelector("video").currentSrc),
            videoUrl
          );
          button.appendChild(downloadIcon.cloneNode(true));
          const spacer = buttons.querySelector(".spacer");
          spacer.after(button);
        }
      }
    } else if (img && img.src) {
      if (shouldAddButton(mediaViewerActions, 'button[title="Download"]:not(.tel-download)', img.src)) {
        const downloadIcon = document.createElement("i");
        downloadIcon.className = "icon icon-download";
        const button = createDownloadButton(
          "Button smaller translucent-white round",
          "",
          () => tel_download_image(img.src),
          img.src
        );
        button.appendChild(downloadIcon);
        mediaViewerActions.prepend(button);
      }
    }
  }, REFRESH_DELAY);

  // For webk /k/ webapp
  setInterval(() => {
    /* Voice Message or Circle Video */
    const pinnedAudio = document.body.querySelector(".pinned-audio");
    let dataMid;
    let downloadButtonPinnedAudio =
      document.body.querySelector("._tel_download_button_pinned_container") ||
      document.createElement("button");
    if (pinnedAudio) {
      dataMid = pinnedAudio.getAttribute("data-mid");
      downloadButtonPinnedAudio.className =
        "btn-icon tgico-download _tel_download_button_pinned_container";
      downloadButtonPinnedAudio.innerHTML = `<span class="tgico button-icon">${DOWNLOAD_ICON}</span>`;
    }
    const audioElements = document.body.querySelectorAll("audio-element");
    audioElements.forEach((audioElement) => {
      const bubble = audioElement.closest(".bubble");
      if (
        !bubble ||
        bubble.querySelector("._tel_download_button_pinned_container")
      ) {
        return;
      }
      if (
        dataMid &&
        downloadButtonPinnedAudio.getAttribute("data-mid") !== dataMid &&
        audioElement.getAttribute("data-mid") === dataMid
      ) {
        downloadButtonPinnedAudio.onclick = (e) => {
          e.stopPropagation();
          const link = audioElement.audio && audioElement.audio.getAttribute("src");
          const isAudio = audioElement.audio && audioElement.audio instanceof HTMLAudioElement;
          if (link) {
            if (isAudio) {
              tel_download_audio(link);
            } else {
              tel_download_video(link);
            }
          }
        };
        downloadButtonPinnedAudio.setAttribute("data-mid", dataMid);
        const link = audioElement.audio && audioElement.audio.getAttribute("src");
        if (link) {
          pinnedAudio
            .querySelector(".pinned-container-wrapper-utils")
            .appendChild(downloadButtonPinnedAudio);
        }
      }
    });

    // Stories
    const storiesContainer = document.getElementById("stories-viewer");
    if (storiesContainer) {
      const createStoryDownloadButton = () => {
        const downloadButton = document.createElement("button");
        downloadButton.className = "btn-icon rp tel-download";
        downloadButton.innerHTML = `<span class="tgico">${DOWNLOAD_ICON}</span><div class="c-ripple"></div>`;
        downloadButton.setAttribute("type", "button");
        downloadButton.setAttribute("title", "Download");
        downloadButton.setAttribute("aria-label", "Download");
        downloadButton.onclick = () => {
          const video = storiesContainer.querySelector("video.media-video");
          const videoSrc =
            video?.src ||
            video?.currentSrc ||
            video?.querySelector("source")?.src;
          if (videoSrc) {
            tel_download_video(videoSrc);
          } else {
            const imageSrc =
              storiesContainer.querySelector("img.media-photo")?.src;
            if (imageSrc) tel_download_image(imageSrc);
          }
        };
        return downloadButton;
      };

      const storyHeader = storiesContainer.querySelector(
        "[class^='_ViewerStoryHeaderRight']"
      );
      if (storyHeader && !storyHeader.querySelector(".tel-download")) {
        storyHeader.prepend(createStoryDownloadButton());
      }

      const storyFooter = storiesContainer.querySelector(
        "[class^='_ViewerStoryFooterRight']"
      );
      if (storyFooter && !storyFooter.querySelector(".tel-download")) {
        storyFooter.prepend(createStoryDownloadButton());
      }
    }

    const mediaContainer = document.querySelector(".media-viewer-whole");
    if (!mediaContainer) return;
    const mediaAspecter = mediaContainer.querySelector(
      ".media-viewer-movers .media-viewer-aspecter"
    );
    const mediaButtons = mediaContainer.querySelector(
      ".media-viewer-topbar .media-viewer-buttons"
    );
    if (!mediaAspecter || !mediaButtons) return;

    const hiddenButtons = mediaButtons.querySelectorAll("button.btn-icon.hide");
    let onDownload = null;
    for (const btn of hiddenButtons) {
      btn.classList.remove("hide");
      if (btn.textContent === FORWARD_ICON) {
        btn.classList.add("tgico-forward");
      }
      if (btn.textContent === DOWNLOAD_ICON) {
        btn.classList.add("tgico-download");
        onDownload = () => {
          btn.click();
        };
        logger.info("Using native download button");
      }
    }

    if (mediaAspecter.querySelector(".ckin__player")) {
      const controls = mediaAspecter.querySelector(
        ".default__controls.ckin__controls"
      );
      if (controls && !controls.querySelector(".tel-download")) {
        const brControls = controls.querySelector(
          ".bottom-controls .right-controls"
        );
        const videoSrc = mediaAspecter.querySelector("video").src;
        const downloadButton = createDownloadButton(
          "btn-icon default__button tgico-download",
          `<span class="tgico">${DOWNLOAD_ICON}</span>`,
          onDownload || (() => tel_download_video(videoSrc)),
          videoSrc
        );
        brControls.prepend(downloadButton);
      }
    } else if (
      mediaAspecter.querySelector("video") &&
      !mediaButtons.querySelector("button.btn-icon.tgico-download")
    ) {
      const videoSrc = mediaAspecter.querySelector("video").src;
      const downloadButton = createDownloadButton(
        "btn-icon tgico-download",
        `<span class="tgico button-icon">${DOWNLOAD_ICON}</span>`,
        onDownload || (() => tel_download_video(videoSrc)),
        videoSrc
      );
      mediaButtons.prepend(downloadButton);
    } else if (!mediaButtons.querySelector("button.btn-icon.tgico-download")) {
      if (
        !mediaAspecter.querySelector("img.thumbnail") ||
        !mediaAspecter.querySelector("img.thumbnail").src
      ) {
        return;
      }
      const imgSrc = mediaAspecter.querySelector("img.thumbnail").src;
      const downloadButton = createDownloadButton(
        "btn-icon tgico-download",
        `<span class="tgico button-icon">${DOWNLOAD_ICON}</span>`,
        onDownload || (() => tel_download_image(imgSrc)),
        imgSrc
      );
      mediaButtons.prepend(downloadButton);
    }
  }, REFRESH_DELAY);

  // Progress bar container and styles
  (function setupProgressBar() {
    const body = document.querySelector("body");

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      #tel-downloader-progress-bar-container {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: ${location.pathname.startsWith("/k/") ? 4 : 1600};
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 380px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .tel-progress-card {
        background: rgba(17, 17, 17, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tel-progress-card.tel-show {
        opacity: 1;
        transform: translateX(0);
      }

      .tel-error-card {
        background: rgba(220, 38, 38, 0.95);
        border-color: rgba(239, 68, 68, 0.3);
      }

      .tel-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 0.5rem;
      }

      .tel-progress-file-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        min-width: 0;
      }

      .tel-progress-icon {
        color: #60a5fa;
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }

      .tel-error-card .tel-progress-icon {
        color: #ffffff;
      }

      .tel-progress-filename {
        color: #e5e7eb;
        font-size: 0.875rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tel-progress-pause {
        background: transparent;
        border: none;
        color: #60a5fa;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .tel-progress-pause:hover {
        background: rgba(96, 165, 250, 0.1);
        color: #93c5fd;
      }

      .tel-progress-close {
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .tel-progress-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      .tel-progress-container {
        position: relative;
      }

      .tel-progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        overflow: hidden;
        position: relative;
      }

      .tel-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
        border-radius: 999px;
        transition: width 0.3s ease, background 0.3s ease;
        position: relative;
      }

      .tel-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: tel-shimmer 2s infinite;
      }

      .tel-progress-fill.tel-complete {
        background: linear-gradient(90deg, #10b981, #34d399);
      }

      .tel-progress-fill.tel-complete::after {
        animation: none;
      }

      .tel-progress-fill.tel-error {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }

      .tel-progress-fill.tel-error::after {
        animation: none;
      }

      .tel-progress-card.tel-paused .tel-progress-fill {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }

      .tel-progress-card.tel-paused .tel-progress-fill::after {
        animation: none;
      }

      .tel-progress-text {
        color: #9ca3af;
        font-size: 0.75rem;
        font-weight: 500;
        margin-top: 0.5rem;
        text-align: right;
      }

      @keyframes tel-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      @keyframes tel-slideOut {
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      @media (max-width: 480px) {
        #tel-downloader-progress-bar-container {
          left: 1rem;
          right: 1rem;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);

    // Add container
    const container = document.createElement("div");
    container.id = "tel-downloader-progress-bar-container";
    body.appendChild(container);
  })();

  logger.info("Completed script setup with pause/resume functionality");
})();