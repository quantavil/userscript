// ==UserScript==
// @name         Better ImpexCube
// @namespace    https://github.com/quantavil/userscript
// @version      2.1.2
// @description  Job search, compact controls and RITC-specific DBK suggestions for ImpexCube
// @license      GPL-3.0-or-later
// @match        *://impexcube.in/*
// @match        *://*.impexcube.in/*
// @connect      impexcube.in
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	function watchDom(selector, scan) {
		scan();
		new MutationObserver((mutations) => {
			const relevant = (node) => node instanceof Element && (node.matches(selector) || node.querySelector(selector));
			if (mutations.some((m) => [...m.addedNodes, ...m.removedNodes].some(relevant))) scan();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function installAnnouncementDismiss() {
		const dismissed = new WeakSet();
		watchDom(".jconfirm", () => {
			for (const box of document.querySelectorAll(".jconfirm-box")) {
				const content = box.querySelector(".content");
				if (dismissed.has(box) || !content?.querySelector("img") || content.textContent?.trim() || box.querySelector("input, select, textarea, .buttons button")) continue;
				dismissed.add(box);
				box.querySelector(".closeIcon")?.click();
			}
		});
	}
	var path = "/frmswitchBranch.aspx";
	var storageKey = "better-impexcube-context";
	var prefix$3 = "better-impexcube-context:";
	var branchId = "#ContentPlaceHolder1_ddlbranch";
	var yearId = "#ContentPlaceHolder1_drFinancial";
	async function installContextSwitch() {
		if (location.hostname.toLowerCase() !== "export.impexcube.in") return;
		if (location.pathname.toLowerCase() === path.toLowerCase()) {
			let saved = "";
			try {
				saved = sessionStorage.getItem(storageKey) ?? "";
				sessionStorage.removeItem(storageKey);
			} catch {}
			if (!saved && window.name.startsWith(prefix$3)) {
				saved = window.name.slice(25);
				window.name = "";
			}
			if (!saved) return;
			try {
				const choice = JSON.parse(saved);
				if (!choice || typeof choice !== "object" || !("branch" in choice) || !("year" in choice) || typeof choice.branch !== "string" || typeof choice.year !== "string") return;
				const branch = document.querySelector(branchId);
				const year = document.querySelector(yearId);
				const go = document.querySelector("#ContentPlaceHolder1_btnGo");
				if (!branch || !year || !go || !Array.from(branch.options).some((o) => o.value === choice.branch && !o.disabled) || !Array.from(year.options).some((o) => o.value === choice.year && !o.disabled)) return;
				branch.value = choice.branch;
				year.value = choice.year;
				go.click();
			} catch {}
			return;
		}
		const branchLabel = document.querySelector("#lblBranchName");
		const yearLabel = document.querySelector("#lblFyear");
		if (!branchLabel || !yearLabel) return;
		try {
			const response = await fetch(path);
			if (!response.ok) return;
			const page = new DOMParser().parseFromString(await response.text(), "text/html");
			const branch = page.querySelector(branchId);
			const year = page.querySelector(yearId);
			if (!branch || !year) return;
			const branchText = branchLabel.textContent?.replace(/^\s*branch\s*:\s*/i, "").trim().toUpperCase();
			const yearText = yearLabel.textContent?.replace(/^\s*fin\.year\s*:\s*/i, "").trim();
			const currentBranch = Array.from(branch.options).find((o) => o.text.trim().toUpperCase() === branchText);
			const currentYear = Array.from(year.options).find((o) => o.text.trim() === yearText);
			if (!currentBranch || !currentYear) return;
			const controls = [branch, year].map((source, index) => {
				const select = document.createElement("select");
				select.className = "bic-context-select";
				select.setAttribute("aria-label", index ? "Financial year" : "Branch");
				for (const option of source.options) select.append(option.cloneNode(true));
				select.value = index ? currentYear.value : currentBranch.value;
				const label = document.createElement("label");
				label.className = "bic-context";
				label.append(index ? "Fin.Year : " : "Branch : ", select);
				return {
					label,
					select
				};
			});
			const change = () => {
				const payload = JSON.stringify({
					branch: controls[0].select.value,
					year: controls[1].select.value
				});
				try {
					sessionStorage.setItem(storageKey, payload);
				} catch {
					window.name = prefix$3 + payload;
				}
				location.assign(path);
			};
			for (const control of controls) control.select.addEventListener("change", change);
			branchLabel.before(controls[0].label);
			yearLabel.before(controls[1].label);
			branchLabel.style.display = "none";
			yearLabel.style.display = "none";
		} catch {}
	}
	var min = Math.min;
	var max = Math.max;
	var round = Math.round;
	var floor = Math.floor;
	var createCoords = (v) => ({
		x: v,
		y: v
	});
	var oppositeSideMap = {
		left: "right",
		right: "left",
		bottom: "top",
		top: "bottom"
	};
	function clamp(start, value, end) {
		return max(start, min(value, end));
	}
	function evaluate(value, param) {
		return typeof value === "function" ? value(param) : value;
	}
	function getSide(placement) {
		return placement.split("-")[0];
	}
	function getAlignment(placement) {
		return placement.split("-")[1];
	}
	function getOppositeAxis(axis) {
		return axis === "x" ? "y" : "x";
	}
	function getAxisLength(axis) {
		return axis === "y" ? "height" : "width";
	}
	function getSideAxis(placement) {
		const firstChar = placement[0];
		return firstChar === "t" || firstChar === "b" ? "y" : "x";
	}
	function getAlignmentAxis(placement) {
		return getOppositeAxis(getSideAxis(placement));
	}
	function getAlignmentSides(placement, rects, rtl) {
		if (rtl === void 0) rtl = false;
		const alignment = getAlignment(placement);
		const alignmentAxis = getAlignmentAxis(placement);
		const length = getAxisLength(alignmentAxis);
		let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
		if (rects.reference[length] > rects.floating[length]) mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
		return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
	}
	function getExpandedPlacements(placement) {
		const oppositePlacement = getOppositePlacement(placement);
		return [
			getOppositeAlignmentPlacement(placement),
			oppositePlacement,
			getOppositeAlignmentPlacement(oppositePlacement)
		];
	}
	function getOppositeAlignmentPlacement(placement) {
		return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
	}
	var lrPlacement = ["left", "right"];
	var rlPlacement = ["right", "left"];
	var tbPlacement = ["top", "bottom"];
	var btPlacement = ["bottom", "top"];
	function getSideList(side, isStart, rtl) {
		switch (side) {
			case "top":
			case "bottom":
				if (rtl) return isStart ? rlPlacement : lrPlacement;
				return isStart ? lrPlacement : rlPlacement;
			case "left":
			case "right": return isStart ? tbPlacement : btPlacement;
			default: return [];
		}
	}
	function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
		const alignment = getAlignment(placement);
		let list = getSideList(getSide(placement), direction === "start", rtl);
		if (alignment) {
			list = list.map((side) => side + "-" + alignment);
			if (flipAlignment) list = list.concat(list.map(getOppositeAlignmentPlacement));
		}
		return list;
	}
	function getOppositePlacement(placement) {
		const side = getSide(placement);
		return oppositeSideMap[side] + placement.slice(side.length);
	}
	function expandPaddingObject(padding) {
		var _padding$top, _padding$right, _padding$bottom, _padding$left;
		return {
			top: (_padding$top = padding.top) != null ? _padding$top : 0,
			right: (_padding$right = padding.right) != null ? _padding$right : 0,
			bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
			left: (_padding$left = padding.left) != null ? _padding$left : 0
		};
	}
	function getPaddingObject(padding) {
		return typeof padding !== "number" ? expandPaddingObject(padding) : {
			top: padding,
			right: padding,
			bottom: padding,
			left: padding
		};
	}
	function rectToClientRect(rect) {
		const { x, y, width, height } = rect;
		return {
			width,
			height,
			top: y,
			left: x,
			right: x + width,
			bottom: y + height,
			x,
			y
		};
	}
	function computeCoordsFromPlacement(_ref, placement, rtl) {
		let { reference, floating } = _ref;
		const sideAxis = getSideAxis(placement);
		const alignmentAxis = getAlignmentAxis(placement);
		const alignLength = getAxisLength(alignmentAxis);
		const side = getSide(placement);
		const isVertical = sideAxis === "y";
		const commonX = reference.x + reference.width / 2 - floating.width / 2;
		const commonY = reference.y + reference.height / 2 - floating.height / 2;
		const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
		let coords;
		switch (side) {
			case "top":
				coords = {
					x: commonX,
					y: reference.y - floating.height
				};
				break;
			case "bottom":
				coords = {
					x: commonX,
					y: reference.y + reference.height
				};
				break;
			case "right":
				coords = {
					x: reference.x + reference.width,
					y: commonY
				};
				break;
			case "left":
				coords = {
					x: reference.x - floating.width,
					y: commonY
				};
				break;
			default: coords = {
				x: reference.x,
				y: reference.y
			};
		}
		const alignment = getAlignment(placement);
		if (alignment) coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
		return coords;
	}
	async function detectOverflow(state, options) {
		var _await$platform$isEle;
		if (options === void 0) options = {};
		const { x, y, platform, rects, elements, strategy } = state;
		const { boundary = "clippingAncestors", rootBoundary = "viewport", elementContext = "floating", altBoundary = false, padding = 0 } = evaluate(options, state);
		const paddingObject = getPaddingObject(padding);
		const element = elements[altBoundary ? elementContext === "floating" ? "reference" : "floating" : elementContext];
		const clippingClientRect = rectToClientRect(await platform.getClippingRect({
			element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating)),
			boundary,
			rootBoundary,
			strategy
		}));
		const rect = elementContext === "floating" ? {
			x,
			y,
			width: rects.floating.width,
			height: rects.floating.height
		} : rects.reference;
		const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
		const offsetScale = await (platform.isElement == null ? void 0 : platform.isElement(offsetParent)) && await (platform.getScale == null ? void 0 : platform.getScale(offsetParent)) || {
			x: 1,
			y: 1
		};
		const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
			elements,
			rect,
			offsetParent,
			strategy
		}) : rect);
		return {
			top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
			bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
			left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
			right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
		};
	}
	var MAX_RESET_COUNT = 50;
	var computePosition$1 = async (reference, floating, config) => {
		const { placement = "bottom", strategy = "absolute", middleware = [], platform } = config;
		const platformWithDetectOverflow = platform.detectOverflow ? platform : {
			...platform,
			detectOverflow
		};
		const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
		let rects = await platform.getElementRects({
			reference,
			floating,
			strategy
		});
		let { x, y } = computeCoordsFromPlacement(rects, placement, rtl);
		let statefulPlacement = placement;
		let resetCount = 0;
		const middlewareData = {};
		for (let i = 0; i < middleware.length; i++) {
			const currentMiddleware = middleware[i];
			if (!currentMiddleware) continue;
			const { name, fn } = currentMiddleware;
			const { x: nextX, y: nextY, data, reset } = await fn({
				x,
				y,
				initialPlacement: placement,
				placement: statefulPlacement,
				strategy,
				middlewareData,
				rects,
				platform: platformWithDetectOverflow,
				elements: {
					reference,
					floating
				}
			});
			x = nextX != null ? nextX : x;
			y = nextY != null ? nextY : y;
			middlewareData[name] = {
				...middlewareData[name],
				...data
			};
			if (reset && resetCount < MAX_RESET_COUNT) {
				resetCount++;
				if (typeof reset === "object") {
					if (reset.placement) statefulPlacement = reset.placement;
					if (reset.rects) rects = reset.rects === true ? await platform.getElementRects({
						reference,
						floating,
						strategy
					}) : reset.rects;
					({x, y} = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
				}
				i = -1;
			}
		}
		return {
			x,
			y,
			placement: statefulPlacement,
			strategy,
			middlewareData
		};
	};
	var flip$1 = function(options) {
		if (options === void 0) options = {};
		return {
			name: "flip",
			options,
			async fn(state) {
				var _middlewareData$arrow, _middlewareData$flip;
				const { placement, middlewareData, rects, initialPlacement, platform, elements } = state;
				const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true, fallbackPlacements: specifiedFallbackPlacements, fallbackStrategy = "bestFit", fallbackAxisSideDirection = "none", flipAlignment = true, ...detectOverflowOptions } = evaluate(options, state);
				if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
				const side = getSide(placement);
				const initialSideAxis = getSideAxis(initialPlacement);
				const isBasePlacement = getSide(initialPlacement) === initialPlacement;
				const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
				const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
				const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
				if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
				const placements = [initialPlacement, ...fallbackPlacements];
				const overflow = await platform.detectOverflow(state, detectOverflowOptions);
				const overflows = [];
				let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
				if (checkMainAxis) overflows.push(overflow[side]);
				if (checkCrossAxis) {
					const sides = getAlignmentSides(placement, rects, rtl);
					overflows.push(overflow[sides[0]], overflow[sides[1]]);
				}
				overflowsData = [...overflowsData, {
					placement,
					overflows
				}];
				if (!overflows.every((side) => side <= 0)) {
					var _middlewareData$flip2, _overflowsData$filter;
					const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
					const nextPlacement = placements[nextIndex];
					if (nextPlacement) {
						if (!(checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false) || overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) return {
							data: {
								index: nextIndex,
								overflows: overflowsData
							},
							reset: { placement: nextPlacement }
						};
					}
					let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
					if (!resetPlacement) switch (fallbackStrategy) {
						case "bestFit": {
							var _overflowsData$filter2;
							const placement = (_overflowsData$filter2 = overflowsData.filter((d) => {
								if (hasFallbackAxisSideDirection) {
									const currentSideAxis = getSideAxis(d.placement);
									return currentSideAxis === initialSideAxis || currentSideAxis === "y";
								}
								return true;
							}).map((d) => [d.placement, d.overflows.filter((overflow) => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
							if (placement) resetPlacement = placement;
							break;
						}
						case "initialPlacement": resetPlacement = initialPlacement;
					}
					if (placement !== resetPlacement) return { reset: { placement: resetPlacement } };
				}
				return {};
			}
		};
	};
	var originSides = new Set(["left", "top"]);
	async function convertValueToCoords(state, options) {
		const { placement, platform, elements } = state;
		const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
		const side = getSide(placement);
		const alignment = getAlignment(placement);
		const isVertical = getSideAxis(placement) === "y";
		const mainAxisMulti = originSides.has(side) ? -1 : 1;
		const crossAxisMulti = rtl && isVertical ? -1 : 1;
		const rawValue = evaluate(options, state);
		let { mainAxis, crossAxis, alignmentAxis } = typeof rawValue === "number" ? {
			mainAxis: rawValue,
			crossAxis: 0,
			alignmentAxis: null
		} : {
			mainAxis: rawValue.mainAxis || 0,
			crossAxis: rawValue.crossAxis || 0,
			alignmentAxis: rawValue.alignmentAxis
		};
		if (alignment && typeof alignmentAxis === "number") crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
		return isVertical ? {
			x: crossAxis * crossAxisMulti,
			y: mainAxis * mainAxisMulti
		} : {
			x: mainAxis * mainAxisMulti,
			y: crossAxis * crossAxisMulti
		};
	}
	var offset$1 = function(options) {
		if (options === void 0) options = 0;
		return {
			name: "offset",
			options,
			async fn(state) {
				var _middlewareData$offse, _middlewareData$arrow;
				const { x, y, placement, middlewareData } = state;
				const diffCoords = await convertValueToCoords(state, options);
				if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
				return {
					x: x + diffCoords.x,
					y: y + diffCoords.y,
					data: {
						...diffCoords,
						placement
					}
				};
			}
		};
	};
	var shift$1 = function(options) {
		if (options === void 0) options = {};
		return {
			name: "shift",
			options,
			async fn(state) {
				const { x, y, placement, platform } = state;
				const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = false, limiter = { fn: (_ref) => {
					let { x, y } = _ref;
					return {
						x,
						y
					};
				} }, ...detectOverflowOptions } = evaluate(options, state);
				const coords = {
					x,
					y
				};
				const overflow = await platform.detectOverflow(state, detectOverflowOptions);
				const crossAxis = getSideAxis(placement);
				const mainAxis = getOppositeAxis(crossAxis);
				let mainAxisCoord = coords[mainAxis];
				let crossAxisCoord = coords[crossAxis];
				const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
				if (checkMainAxis) mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
				if (checkCrossAxis) crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
				const limitedCoords = limiter.fn({
					...state,
					[mainAxis]: mainAxisCoord,
					[crossAxis]: crossAxisCoord
				});
				return {
					...limitedCoords,
					data: {
						x: limitedCoords.x - x,
						y: limitedCoords.y - y,
						enabled: {
							[mainAxis]: checkMainAxis,
							[crossAxis]: checkCrossAxis
						}
					}
				};
			}
		};
	};
	var size$1 = function(options) {
		if (options === void 0) options = {};
		return {
			name: "size",
			options,
			async fn(state) {
				const { placement, rects, platform, elements } = state;
				const { apply = () => {}, ...detectOverflowOptions } = evaluate(options, state);
				const overflow = await platform.detectOverflow(state, detectOverflowOptions);
				const side = getSide(placement);
				const alignment = getAlignment(placement);
				const isYAxis = getSideAxis(placement) === "y";
				const { width, height } = rects.floating;
				let heightSide;
				let widthSide;
				if (side === "top" || side === "bottom") {
					heightSide = side;
					widthSide = alignment === (await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
				} else {
					widthSide = side;
					heightSide = alignment === "end" ? "top" : "bottom";
				}
				const maximumClippingHeight = height - overflow.top - overflow.bottom;
				const maximumClippingWidth = width - overflow.left - overflow.right;
				const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
				const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
				const shiftData = state.middlewareData.shift;
				const noShift = !shiftData;
				let availableHeight = overflowAvailableHeight;
				let availableWidth = overflowAvailableWidth;
				if (shiftData != null && shiftData.enabled.x) availableWidth = maximumClippingWidth;
				if (shiftData != null && shiftData.enabled.y) availableHeight = maximumClippingHeight;
				if (noShift && !alignment) {
					if (isYAxis) availableWidth = width - 2 * max(overflow.left, overflow.right);
					else availableHeight = height - 2 * max(overflow.top, overflow.bottom);
				}
				await apply({
					...state,
					availableWidth,
					availableHeight
				});
				const nextDimensions = await platform.getDimensions(elements.floating);
				if (width !== nextDimensions.width || height !== nextDimensions.height) return { reset: { rects: true } };
				return {};
			}
		};
	};
	function hasWindow() {
		return typeof window !== "undefined";
	}
	function getNodeName(node) {
		if (isNode(node)) return (node.nodeName || "").toLowerCase();
		return "#document";
	}
	function getWindow(node) {
		var _node$ownerDocument;
		return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
	}
	function getDocumentElement(node) {
		var _ref;
		return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
	}
	function isNode(value) {
		if (!hasWindow()) return false;
		return value instanceof Node || value instanceof getWindow(value).Node;
	}
	function isElement(value) {
		if (!hasWindow()) return false;
		return value instanceof Element || value instanceof getWindow(value).Element;
	}
	function isHTMLElement(value) {
		if (!hasWindow()) return false;
		return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
	}
	function isShadowRoot(value) {
		if (!hasWindow() || typeof ShadowRoot === "undefined") return false;
		return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
	}
	function isOverflowElement(element) {
		const { overflow, overflowX, overflowY, display } = getComputedStyle$1(element);
		return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
	}
	function isTableElement(element) {
		return /^(table|td|th)$/.test(getNodeName(element));
	}
	function isTopLayer(element) {
		try {
			if (element.matches(":popover-open")) return true;
		} catch (_e) {}
		try {
			return element.matches(":modal");
		} catch (_e) {
			return false;
		}
	}
	var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
	var containRe = /paint|layout|strict|content/;
	var isNotNone = (value) => !!value && value !== "none";
	var isWebKitValue;
	function isContainingBlock(elementOrCss) {
		const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;
		return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
	}
	function getContainingBlock(element) {
		let currentNode = getParentNode(element);
		while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
			if (isContainingBlock(currentNode)) return currentNode;
			else if (isTopLayer(currentNode)) return null;
			currentNode = getParentNode(currentNode);
		}
		return null;
	}
	function isWebKit() {
		if (isWebKitValue == null) isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
		return isWebKitValue;
	}
	function isLastTraversableNode(node) {
		return /^(html|body|#document)$/.test(getNodeName(node));
	}
	function getComputedStyle$1(element) {
		return getWindow(element).getComputedStyle(element);
	}
	function getNodeScroll(element) {
		if (isElement(element)) return {
			scrollLeft: element.scrollLeft,
			scrollTop: element.scrollTop
		};
		return {
			scrollLeft: element.scrollX,
			scrollTop: element.scrollY
		};
	}
	function getParentNode(node) {
		if (getNodeName(node) === "html") return node;
		const result = node.assignedSlot || node.parentNode || isShadowRoot(node) && node.host || getDocumentElement(node);
		return isShadowRoot(result) ? result.host : result;
	}
	function getNearestOverflowAncestor(node) {
		const parentNode = getParentNode(node);
		if (isLastTraversableNode(parentNode)) return (node.ownerDocument || node).body;
		if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) return parentNode;
		return getNearestOverflowAncestor(parentNode);
	}
	function getOverflowAncestors(node, list, traverseIframes) {
		var _node$ownerDocument2;
		if (list === void 0) list = [];
		if (traverseIframes === void 0) traverseIframes = true;
		const scrollableAncestor = getNearestOverflowAncestor(node);
		const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
		const win = getWindow(scrollableAncestor);
		if (isBody) {
			const frameElement = getFrameElement(win);
			return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
		} else return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
	}
	function getFrameElement(win) {
		return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
	}
	function getCssDimensions(element) {
		const css = getComputedStyle$1(element);
		let width = parseFloat(css.width) || 0;
		let height = parseFloat(css.height) || 0;
		const hasOffset = isHTMLElement(element);
		const offsetWidth = hasOffset ? element.offsetWidth : width;
		const offsetHeight = hasOffset ? element.offsetHeight : height;
		const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
		if (shouldFallback) {
			width = offsetWidth;
			height = offsetHeight;
		}
		return {
			width,
			height,
			$: shouldFallback
		};
	}
	function unwrapElement(element) {
		return !isElement(element) ? element.contextElement : element;
	}
	function getScale(element) {
		const domElement = unwrapElement(element);
		if (!isHTMLElement(domElement)) return createCoords(1);
		const rect = domElement.getBoundingClientRect();
		const { width, height, $ } = getCssDimensions(domElement);
		let x = ($ ? round(rect.width) : rect.width) / width;
		let y = ($ ? round(rect.height) : rect.height) / height;
		if (!x || !Number.isFinite(x)) x = 1;
		if (!y || !Number.isFinite(y)) y = 1;
		return {
			x,
			y
		};
	}
	var noOffsets = createCoords(0);
	function getVisualOffsets(element) {
		const win = getWindow(element);
		if (!isWebKit() || !win.visualViewport) return noOffsets;
		return {
			x: win.visualViewport.offsetLeft,
			y: win.visualViewport.offsetTop
		};
	}
	function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
		if (isFixed === void 0) isFixed = false;
		return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
	}
	function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
		if (includeScale === void 0) includeScale = false;
		if (isFixedStrategy === void 0) isFixedStrategy = false;
		const clientRect = element.getBoundingClientRect();
		const domElement = unwrapElement(element);
		let scale = createCoords(1);
		if (includeScale) {
			if (offsetParent) {
				if (isElement(offsetParent)) scale = getScale(offsetParent);
			} else scale = getScale(element);
		}
		const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
		let x = (clientRect.left + visualOffsets.x) / scale.x;
		let y = (clientRect.top + visualOffsets.y) / scale.y;
		let width = clientRect.width / scale.x;
		let height = clientRect.height / scale.y;
		if (domElement && offsetParent) {
			const win = getWindow(domElement);
			const offsetWin = isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
			let currentWin = win;
			let currentIFrame = getFrameElement(currentWin);
			while (currentIFrame && offsetWin !== currentWin) {
				const iframeScale = getScale(currentIFrame);
				const iframeRect = currentIFrame.getBoundingClientRect();
				const css = getComputedStyle$1(currentIFrame);
				const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
				const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
				x *= iframeScale.x;
				y *= iframeScale.y;
				width *= iframeScale.x;
				height *= iframeScale.y;
				x += left;
				y += top;
				currentWin = getWindow(currentIFrame);
				currentIFrame = getFrameElement(currentWin);
			}
		}
		return rectToClientRect({
			width,
			height,
			x,
			y
		});
	}
	function getWindowScrollBarX(element, rect) {
		const leftScroll = getNodeScroll(element).scrollLeft;
		if (!rect) return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
		return rect.left + leftScroll;
	}
	function getHTMLOffset(documentElement, scroll) {
		const htmlRect = documentElement.getBoundingClientRect();
		return {
			x: htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect),
			y: htmlRect.top + scroll.scrollTop
		};
	}
	function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
		let { elements, rect, offsetParent, strategy } = _ref;
		const isFixed = strategy === "fixed";
		const documentElement = getDocumentElement(offsetParent);
		const topLayer = elements ? isTopLayer(elements.floating) : false;
		if (offsetParent === documentElement || topLayer && isFixed) return rect;
		let scroll = {
			scrollLeft: 0,
			scrollTop: 0
		};
		let scale = createCoords(1);
		const offsets = createCoords(0);
		const isOffsetParentAnElement = isHTMLElement(offsetParent);
		if (isOffsetParentAnElement || !isFixed) {
			if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
			if (isOffsetParentAnElement) {
				const offsetRect = getBoundingClientRect(offsetParent);
				scale = getScale(offsetParent);
				offsets.x = offsetRect.x + offsetParent.clientLeft;
				offsets.y = offsetRect.y + offsetParent.clientTop;
			}
		}
		const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
		return {
			width: rect.width * scale.x,
			height: rect.height * scale.y,
			x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
			y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
		};
	}
	function getClientRects(element) {
		return element.getClientRects ? Array.from(element.getClientRects()) : [];
	}
	function getDocumentRect(html) {
		const scroll = getNodeScroll(html);
		const body = html.ownerDocument.body;
		const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
		const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
		let x = -scroll.scrollLeft + getWindowScrollBarX(html);
		const y = -scroll.scrollTop;
		if (getComputedStyle$1(body).direction === "rtl") x += max(html.clientWidth, body.clientWidth) - width;
		return {
			width,
			height,
			x,
			y
		};
	}
	var SCROLLBAR_MAX = 25;
	function getViewportRect(element, strategy, rootBoundary) {
		if (rootBoundary === void 0) rootBoundary = "viewport";
		const isLayoutViewport = rootBoundary === "layoutViewport";
		const win = getWindow(element);
		const html = getDocumentElement(element);
		const visualViewport = win.visualViewport;
		let width = html.clientWidth;
		let height = html.clientHeight;
		let x = 0;
		let y = 0;
		if (visualViewport) {
			const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
			if (isLayoutViewport) {
				if (!layoutRelativeClientCoords) {
					x = -visualViewport.offsetLeft;
					y = -visualViewport.offsetTop;
				}
			} else {
				width = visualViewport.width;
				height = visualViewport.height;
				if (layoutRelativeClientCoords) {
					x = visualViewport.offsetLeft;
					y = visualViewport.offsetTop;
				}
			}
		}
		if (getWindowScrollBarX(html) <= 0) {
			const doc = html.ownerDocument;
			const body = doc.body;
			const bodyStyles = getComputedStyle(body);
			const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
			const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
			const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
			if (gutter <= SCROLLBAR_MAX) width -= gutter;
		}
		return {
			width,
			height,
			x,
			y
		};
	}
	function getInnerBoundingClientRect(element, strategy) {
		const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
		const top = clientRect.top + element.clientTop;
		const left = clientRect.left + element.clientLeft;
		const scale = getScale(element);
		return {
			width: element.clientWidth * scale.x,
			height: element.clientHeight * scale.y,
			x: left * scale.x,
			y: top * scale.y
		};
	}
	function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
		let rect;
		if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") rect = getViewportRect(element, strategy, clippingAncestor);
		else if (clippingAncestor === "document") rect = getDocumentRect(getDocumentElement(element));
		else if (isElement(clippingAncestor)) rect = getInnerBoundingClientRect(clippingAncestor, strategy);
		else {
			const visualOffsets = getVisualOffsets(element);
			rect = {
				x: clippingAncestor.x - visualOffsets.x,
				y: clippingAncestor.y - visualOffsets.y,
				width: clippingAncestor.width,
				height: clippingAncestor.height
			};
		}
		return rectToClientRect(rect);
	}
	function getClippingElementAncestors(element, cache) {
		const cachedResult = cache.get(element);
		if (cachedResult) return cachedResult;
		let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
		let lastKeptComputedStyle = null;
		const elementIsFixed = getComputedStyle$1(element).position === "fixed";
		let currentNode = elementIsFixed ? getParentNode(element) : element;
		while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
			const computedStyle = getComputedStyle$1(currentNode);
			const currentNodeIsContaining = isContainingBlock(currentNode);
			const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
			if (!currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static")) result = result.filter((ancestor) => ancestor !== currentNode);
			else lastKeptComputedStyle = computedStyle;
			currentNode = getParentNode(currentNode);
		}
		cache.set(element, result);
		return result;
	}
	function getClippingRect(_ref) {
		let { element, boundary, rootBoundary, strategy } = _ref;
		const clippingAncestors = [...boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary), rootBoundary];
		const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
		let top = firstRect.top;
		let right = firstRect.right;
		let bottom = firstRect.bottom;
		let left = firstRect.left;
		for (let i = 1; i < clippingAncestors.length; i++) {
			const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
			top = max(rect.top, top);
			right = min(rect.right, right);
			bottom = min(rect.bottom, bottom);
			left = max(rect.left, left);
		}
		return {
			width: right - left,
			height: bottom - top,
			x: left,
			y: top
		};
	}
	function getDimensions(element) {
		const { width, height } = getCssDimensions(element);
		return {
			width,
			height
		};
	}
	function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
		const isOffsetParentAnElement = isHTMLElement(offsetParent);
		const documentElement = getDocumentElement(offsetParent);
		const isFixed = strategy === "fixed";
		const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
		let scroll = {
			scrollLeft: 0,
			scrollTop: 0
		};
		const offsets = createCoords(0);
		if (isOffsetParentAnElement || !isFixed) {
			if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
			if (isOffsetParentAnElement) {
				const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
				offsets.x = offsetRect.x + offsetParent.clientLeft;
				offsets.y = offsetRect.y + offsetParent.clientTop;
			}
		}
		if (!isOffsetParentAnElement && documentElement) offsets.x = getWindowScrollBarX(documentElement);
		const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
		return {
			x: rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x,
			y: rect.top + scroll.scrollTop - offsets.y - htmlOffset.y,
			width: rect.width,
			height: rect.height
		};
	}
	function isStaticPositioned(element) {
		return getComputedStyle$1(element).position === "static";
	}
	function getTrueOffsetParent(element, polyfill) {
		if (!isHTMLElement(element) || getComputedStyle$1(element).position === "fixed") return null;
		if (polyfill) return polyfill(element);
		let rawOffsetParent = element.offsetParent;
		if (getDocumentElement(element) === rawOffsetParent) rawOffsetParent = rawOffsetParent.ownerDocument.body;
		return rawOffsetParent;
	}
	function getOffsetParent(element, polyfill) {
		const win = getWindow(element);
		if (isTopLayer(element)) return win;
		if (!isHTMLElement(element)) {
			let svgOffsetParent = getParentNode(element);
			while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
				if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) return svgOffsetParent;
				svgOffsetParent = getParentNode(svgOffsetParent);
			}
			return win;
		}
		let offsetParent = getTrueOffsetParent(element, polyfill);
		while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) offsetParent = getTrueOffsetParent(offsetParent, polyfill);
		if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) return win;
		return offsetParent || getContainingBlock(element) || win;
	}
	var getElementRects = async function(data) {
		const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
		const getDimensionsFn = this.getDimensions;
		const floatingDimensions = await getDimensionsFn(data.floating);
		return {
			reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
			floating: {
				x: 0,
				y: 0,
				width: floatingDimensions.width,
				height: floatingDimensions.height
			}
		};
	};
	function isRTL(element) {
		return getComputedStyle$1(element).direction === "rtl";
	}
	var platform = {
		convertOffsetParentRelativeRectToViewportRelativeRect,
		getDocumentElement,
		getClippingRect,
		getOffsetParent,
		getElementRects,
		getClientRects,
		getDimensions,
		getScale,
		isElement,
		isRTL
	};
	function rectsAreEqual(a, b) {
		return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
	}
	function observeMove(element, onMove, ancestorResize) {
		let io = null;
		let timeoutId;
		const root = getDocumentElement(element);
		function cleanup() {
			var _io;
			clearTimeout(timeoutId);
			(_io = io) == null || _io.disconnect();
			io = null;
		}
		function refresh(skip, threshold) {
			if (skip === void 0) skip = false;
			if (threshold === void 0) threshold = 1;
			cleanup();
			const elementRectForRootMargin = element.getBoundingClientRect();
			const { left, top, width, height } = elementRectForRootMargin;
			if (!skip) onMove();
			if (!width || !height) return;
			const insetTop = floor(top);
			const insetRight = floor(root.clientWidth - (left + width));
			const insetBottom = floor(root.clientHeight - (top + height));
			const insetLeft = floor(left);
			const options = {
				rootMargin: -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px",
				threshold: max(0, min(1, threshold)) || 1
			};
			let isFirstUpdate = true;
			function handleObserve(entries) {
				const ratio = entries[0].intersectionRatio;
				if (!rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) return refresh();
				if (ratio !== threshold) {
					if (!isFirstUpdate) return refresh();
					if (!ratio) timeoutId = setTimeout(() => {
						refresh(false, 1e-7);
					}, 1e3);
					else refresh(false, ratio);
				}
				isFirstUpdate = false;
			}
			try {
				io = new IntersectionObserver(handleObserve, {
					...options,
					root: root.ownerDocument
				});
			} catch (_e) {
				io = new IntersectionObserver(handleObserve, options);
			}
			io.observe(element);
		}
		const win = getWindow(element);
		const handleResize = () => refresh(ancestorResize);
		win.addEventListener("resize", handleResize);
		refresh(true);
		return () => {
			win.removeEventListener("resize", handleResize);
			cleanup();
		};
	}
	function autoUpdate(reference, floating, update, options) {
		if (options === void 0) options = {};
		const { ancestorScroll = true, ancestorResize = true, elementResize = typeof ResizeObserver === "function", layoutShift = typeof IntersectionObserver === "function", animationFrame = false } = options;
		const referenceEl = unwrapElement(reference);
		const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
		ancestors.forEach((ancestor) => {
			ancestorScroll && ancestor.addEventListener("scroll", update);
			ancestorResize && ancestor.addEventListener("resize", update);
		});
		const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update, ancestorResize) : null;
		let reobserveFrame = -1;
		let resizeObserver = null;
		if (elementResize) {
			resizeObserver = new ResizeObserver((_ref) => {
				let [firstEntry] = _ref;
				if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
					resizeObserver.unobserve(floating);
					cancelAnimationFrame(reobserveFrame);
					reobserveFrame = requestAnimationFrame(() => {
						var _resizeObserver;
						(_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
					});
				}
				update();
			});
			if (referenceEl && !animationFrame) resizeObserver.observe(referenceEl);
			if (floating) resizeObserver.observe(floating);
		}
		let frameId;
		let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
		if (animationFrame) frameLoop();
		function frameLoop() {
			const nextRefRect = getBoundingClientRect(reference);
			if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) update();
			prevRefRect = nextRefRect;
			frameId = requestAnimationFrame(frameLoop);
		}
		update();
		return () => {
			var _resizeObserver2;
			ancestors.forEach((ancestor) => {
				ancestorScroll && ancestor.removeEventListener("scroll", update);
				ancestorResize && ancestor.removeEventListener("resize", update);
			});
			cleanupIo?.();
			(_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
			resizeObserver = null;
			if (animationFrame) cancelAnimationFrame(frameId);
		};
	}
	var offset = offset$1;
	var shift = shift$1;
	var flip = flip$1;
	var size = size$1;
	var computePosition = (reference, floating, options) => {
		const cache = new Map();
		const mergedOptions = options != null ? options : {};
		const platformWithCache = {
			...platform,
			...mergedOptions.platform,
			_c: cache
		};
		return computePosition$1(reference, floating, {
			...mergedOptions,
			platform: platformWithCache
		});
	};
	var months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	];
	var format$1 = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
	function parse$1(value) {
		const text = value.trim().toLowerCase();
		if (text === "today" || /^[+-]\d+$/.test(text)) {
			const result = new Date();
			result.setHours(0, 0, 0, 0);
			if (text !== "today") {
				const delta = Number(text);
				if (Math.abs(delta) > 36500) return null;
				result.setDate(result.getDate() + delta);
			}
			const y = result.getFullYear();
			return y >= 1900 && y <= 2100 && !Number.isNaN(result.getTime()) ? result : null;
		}
		let day, month, year;
		const compact = text.match(/^(\d{2})(\d{2})(\d{4})$/);
		const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
		const named = text.match(/^(\d{1,2})[\s./-]*([a-z]+)(?:[\s,./-]+(\d{2}|\d{4}))?$/);
		const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		const parts = compact || numeric;
		if (parts) {
			day = Number(parts[1]);
			month = Number(parts[2]) - 1;
			year = Number(parts[3]);
		} else if (named) {
			day = Number(named[1]);
			month = months.findIndex((m) => named[2]?.startsWith(m.toLowerCase()));
			if (month < 0) return null;
			year = named[3] ? Number(named[3]) : new Date().getFullYear();
		} else if (iso) {
			year = Number(iso[1]);
			month = Number(iso[2]) - 1;
			day = Number(iso[3]);
		} else return null;
		if (year < 100) year += year < 50 ? 2e3 : 1900;
		const result = new Date(year, month, day);
		return year >= 1900 && year <= 2100 && result.getFullYear() === year && result.getMonth() === month && result.getDate() === day ? result : null;
	}
	function installDates() {
		const style = document.createElement("style");
		style.textContent = `
    .impex-date-wrapper{display:inline-flex;align-items:center;gap:3px}
    .impex-date-btn{cursor:pointer;background:var(--bic-raised);border:1px solid var(--bic-border);border-radius:4px;padding:2px 6px;min-height:24px}
    .impex-date-btn:disabled{opacity:.5;cursor:not-allowed}
    .impex-date-input.invalid{outline:2px solid #f87171}
    .impex-calendar-popup{position:fixed;z-index:2147483000;width:238px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:8px;background:var(--bic-panel);border:1px solid var(--bic-border);border-radius:10px;box-shadow:0 12px 30px #0008;font:12px/1.4 system-ui,sans-serif;color:var(--bic-text);font-variant-numeric:tabular-nums}
    .impex-calendar-popup[hidden]{display:none}
    .impex-calendar-popup button{box-sizing:border-box;min-width:0;margin:0;border:0;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer;box-shadow:none;text-shadow:none}
    .impex-cal-header{display:grid;grid-template-columns:26px 26px minmax(0,1fr) 26px 26px;align-items:center;text-align:center}
    .impex-cal-title{font-weight:700;white-space:nowrap}
    .impex-calendar-popup .impex-cal-nav{width:26px;height:26px;padding:0;border-radius:4px;font-size:16px}
    .impex-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;margin:5px 0}
    .impex-cal-grid>span{display:grid;place-items:center;height:22px;color:var(--bic-muted);font-size:11px;font-weight:600}
    .impex-calendar-popup .impex-cal-day{display:grid;place-items:center;width:100%;height:28px;padding:0;border-radius:4px}
    .impex-calendar-popup .impex-cal-day.other-month{color:var(--bic-muted);opacity:.6}
    .impex-calendar-popup .impex-cal-day.today:not(.selected){box-shadow:inset 0 0 0 1px var(--bic-accent);color:var(--bic-accent);font-weight:700}
    .impex-calendar-popup .impex-cal-day.selected{background:var(--bic-accent);color:var(--bic-on-accent);font-weight:700}
    .impex-quick-btns{display:flex;justify-content:center;gap:6px;padding-top:5px;border-top:1px solid var(--bic-border)}
    .impex-calendar-popup .impex-quick-btn{padding:6px 9px;border-radius:4px;color:var(--bic-accent);font-weight:600}
    .impex-calendar-popup button:hover:not(.selected){background:var(--bic-raised)}
    .impex-calendar-popup button:focus-visible{outline:2px solid var(--bic-accent);outline-offset:1px}
  `;
		document.head.append(style);
		const popup = document.createElement("div");
		popup.className = "impex-calendar-popup";
		popup.hidden = true;
		document.body.append(popup);
		let active = null;
		let cleanup;
		const close = () => {
			popup.hidden = true;
			active = null;
			cleanup?.();
			cleanup = void 0;
		};
		const setDate = (date) => {
			if (!active || active.disabled || active.readOnly) return;
			const input = active;
			input.value = format$1(date);
			input.classList.remove("invalid");
			close();
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		};
		const render = (view) => {
			const year = view.getFullYear(), month = view.getMonth();
			popup.replaceChildren();
			const header = document.createElement("div");
			header.className = "impex-cal-header";
			for (const [label, action, delta] of [
				[
					"«",
					"prev-year",
					-12
				],
				[
					"‹",
					"prev-month",
					-1
				],
				[
					"›",
					"next-month",
					1
				],
				[
					"»",
					"next-year",
					12
				]
			]) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "impex-cal-nav";
				button.dataset.action = action;
				button.textContent = label;
				button.setAttribute("aria-label", action.replace("-", " "));
				button.addEventListener("click", () => render(new Date(year, month + delta, 1)));
				if (action === "next-month") {
					const title = document.createElement("span");
					title.className = "impex-cal-title";
					title.textContent = `${months[month]} ${year}`;
					header.append(title);
				}
				header.append(button);
			}
			const grid = document.createElement("div");
			grid.className = "impex-cal-grid";
			for (const day of [
				"Su",
				"Mo",
				"Tu",
				"We",
				"Th",
				"Fr",
				"Sa"
			]) {
				const label = document.createElement("span");
				label.textContent = day;
				grid.append(label);
			}
			const first = new Date(year, month, 1).getDay();
			const count = Math.ceil((first + new Date(year, month + 1, 0).getDate()) / 7) * 7;
			const selectedFormatted = active?.value ? format$1(parse$1(active.value) ?? new Date(1900, 0, 1)) : "";
			for (let i = 0; i < count; i++) {
				const date = new Date(year, month, i - first + 1), button = document.createElement("button");
				button.type = "button";
				button.className = "impex-cal-day";
				button.textContent = String(date.getDate());
				button.dataset.date = format$1(date);
				button.setAttribute("aria-label", format$1(date));
				if (date.getMonth() !== month) button.classList.add("other-month");
				if (format$1(date) === format$1(new Date())) button.classList.add("today");
				if (active && format$1(date) === selectedFormatted) button.classList.add("selected");
				button.addEventListener("click", () => setDate(date));
				grid.append(button);
			}
			const shortcuts = document.createElement("div");
			shortcuts.className = "impex-quick-btns";
			for (const [label, delta] of [["Today", 0], ["Yesterday", -1]]) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "impex-quick-btn";
				button.textContent = label;
				button.addEventListener("click", () => {
					const date = new Date();
					date.setDate(date.getDate() + delta);
					setDate(date);
				});
				shortcuts.append(button);
			}
			popup.append(header, grid, shortcuts);
		};
		const show = (input, button) => {
			if (input.disabled || input.readOnly) return;
			if (active === input && !popup.hidden) {
				close();
				return;
			}
			close();
			active = input;
			popup.hidden = false;
			render(parse$1(input.value) ?? new Date());
			cleanup = autoUpdate(button, popup, () => {
				computePosition(button, popup, {
					strategy: "fixed",
					placement: "bottom-start",
					middleware: [
						offset(4),
						flip(),
						shift({ padding: 8 })
					]
				}).then(({ x, y }) => Object.assign(popup.style, {
					left: `${x}px`,
					top: `${y}px`
				}));
			});
		};
		const outside = (event) => {
			const target = event.target;
			if (active && !popup.contains(target) && target !== active && !(target instanceof Element && target.closest(".impex-date-btn"))) close();
		};
		document.addEventListener("pointerdown", outside);
		document.addEventListener("focusin", outside);
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") close();
		});
		const controls = new WeakSet();
		const scan = () => {
			document.querySelectorAll("input").forEach((input) => {
				if (controls.has(input) || !["text", "date"].includes(input.type)) return;
				if (!/date/i.test(`${input.id} ${input.name} ${input.placeholder}`) && !input.classList.contains("hasDatepicker") && !input.getAttribute("onblur")?.includes("IsValidDate")) return;
				if (input.type === "date") return;
				controls.add(input);
				input.classList.add("impex-date-input");
				input.removeAttribute("maxlength");
				const wrapper = document.createElement("span");
				wrapper.className = "impex-date-wrapper";
				input.before(wrapper);
				wrapper.append(input);
				const button = document.createElement("button");
				button.type = "button";
				button.className = "impex-date-btn";
				button.textContent = "📅";
				button.setAttribute("aria-label", "Open calendar");
				wrapper.append(button);
				const sync = () => {
					button.disabled = input.disabled || input.readOnly;
					if (button.disabled && active === input) close();
				};
				new MutationObserver(sync).observe(input, {
					attributes: true,
					attributeFilter: ["disabled", "readonly"]
				});
				sync();
				button.addEventListener("click", () => show(input, button));
				const keyFilter = input.getAttribute("onkeypress") ?? "";
				if (/\b(?:isNumberDateKey|EnterDate)\s*\(/i.test(keyFilter)) input.addEventListener("keypress", (event) => {
					if (/^[a-z+ -]$/i.test(event.key)) event.stopImmediatePropagation();
				}, true);
				const normalize = () => {
					if (!input.value.trim()) {
						input.classList.remove("invalid");
						return;
					}
					if (input.readOnly || input.disabled) return;
					const date = parse$1(input.value);
					if (date) {
						input.value = format$1(date);
						input.classList.remove("invalid");
					} else input.classList.add("invalid");
				};
				input.addEventListener("change", normalize, true);
				input.addEventListener("blur", normalize, true);
				input.addEventListener("keydown", (event) => {
					if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
					if (input.disabled || input.readOnly) return;
					const date = parse$1(input.value) ?? new Date();
					date.setDate(date.getDate() + (event.key === "ArrowUp" ? 1 : -1));
					input.value = format$1(date);
					input.dispatchEvent(new Event("input", { bubbles: true }));
					input.dispatchEvent(new Event("change", { bubbles: true }));
					event.preventDefault();
				});
			});
			if (active && !active.isConnected) close();
		};
		watchDom("input", scan);
	}
	var n;
	var t;
	var u$1;
	var i;
	var f$1;
	var o$1;
	var e;
	var l;
	var c;
	var a$1;
	var h = Symbol.for("pv");
	var p = {};
	var y = [];
	var v = /^m(i|n|o|s|text|space)$/;
	var w = Array.isArray;
	var d = y.slice;
	var _ = Object.assign;
	function g(n) {
		n && n.parentNode && n.remove();
	}
	function m(r, u, i, f, o) {
		var e = {
			type: r,
			props: u,
			key: i,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: h,
			__v: o || ++t,
			__i: -1,
			__u: 0
		};
		return !o && n.vnode && n.vnode(e), e;
	}
	function $(n) {
		return n.children;
	}
	function x(n, t) {
		this.props = n, this.context = t, this.__g = 0;
	}
	function S(n, t) {
		if (null == t) return n.__ && S(n.__, n.__i + 1);
		for (var r; t < n.__k.length; t++) if ((r = n.__k[t]) && r.__e) return r.__e;
		return "function" != typeof n.type || n.props.__P ? null : S(n);
	}
	function C(t) {
		var r, u = t.__v, i = u.__e, f = [], o = [], e = t.__P;
		e && ((r = _({ constructor: h }, u)).__v = u.__v + 1, n.vnode && n.vnode(r), z(e, r, u, t.__n, e.namespaceURI, 32 & u.__u ? [i] : null, f, i || S(u), 32 & u.__u, o), r.__v = u.__v, r.__.__k[r.__i] = r, E(f, r, o), u.__ = u.__e = null, r.__e != i && j(r));
	}
	function j(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), j(n);
	}
	function L(t) {
		(8 & t.__g || (t.__g |= 8, u$1.push(t), f$1++)) && i == n.debounceRendering || ((i = n.debounceRendering) || queueMicrotask)(H);
	}
	function H() {
		try {
			for (var n, t = 1; u$1.length;) u$1.length > t && u$1.sort(o$1), n = u$1.shift(), t = u$1.length, 8 & n.__g && C(n);
		} finally {
			(f$1 = u$1.length) && (i || queueMicrotask)(H);
		}
	}
	function I(n, t, r, u, i, f, o, e, l, c, a) {
		var s, h, v, w, d, _, g = u.__k || y, k = t.length;
		for (l = q(r, t, g, l, k), s = 0; s < k; s++) null != (v = r.__k[s]) && (h = ~v.__i && g[v.__i] || p, v.__i = s, _ = z(n, v, h, i, f, o, e, l, c, a), w = v.__e, (h.ref != v.ref || 8 & h.__u) && (h.ref && G(h.ref, null, v, h), v.ref && a.push(v.ref, v.__c || w, v)), d = d || w, 4 & v.__u ? (l = A(v, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof v.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), v.__u &= -21);
		return r.__e = d, l;
	}
	function q(n, t, r, u, i) {
		var f, o, e, l, c, a, s, p, y, v = r.length, d = v, _ = 0, g = 0, k = n.__k = Array(i);
		for (f = 0; f < i; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor === String ? o = k[f] = m(null, o) : w(o) ? o = k[f] = m($, { children: o }) : o.constructor === h && o.__b ? o = k[f] = m(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = P(o, r, l, d)) && (d--, (e = r[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (i > v ? _-- : i < v && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < i; f++) if ((o = k[f]) && 16 & o.__u) {
				for (_ = 0, p = a.length; _ < p;) a[y = _ + p >> 1] < o.__i ? _ = y + 1 : p = y;
				a[_] = o.__i, s[f] = _ + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (d) for (f = 0; f < v; f++) !(e = r[f]) || 2 & e.__u || (e.__e == u && (u = S(e)), J(e, e));
		return u;
	}
	function A(n, t, r, u) {
		var i, f, o, e;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (i = n.__k) for (f = 0; f < i.length; f++) i[f] && (i[f].__ = n, t = A(i[f], t, r, !1));
			return t;
		}
		for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), o = n.__e, e = t; e && 8 == e.nodeType;) e = e.nextSibling;
		for (o != e && (!u && r.moveBefore && o.parentNode ? r.moveBefore(o, t) : r.insertBefore(o, t || null)), t = o; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
		return t;
	}
	function P(n, t, r, u) {
		var i, f = n.key, o = n.type, e = t[r], l = e && !(2 & e.__u);
		if (null === e && null == f || l && f == e.key && o == e.type) return r;
		if (u > (l ? 1 : 0)) {
			for (i = r - 1; i >= 0; i--) if ((e = t[i]) && !(2 & e.__u) && f == e.key && o == e.type) return i;
			for (i = r + 1; i < t.length; i++) if ((e = t[i]) && !(2 & e.__u) && f == e.key && o == e.type) return i;
		}
		return -1;
	}
	function T(n, t, r) {
		r ??= "", "-" == t[0] ? n.setProperty(t, r) : n[t] = r;
	}
	function N(n, t, r, u, i) {
		var f, o;
		if ("style" == t) if ("string" == typeof r) n.style.cssText = r;
		else {
			if ("string" == typeof u && (n.style.cssText = u = ""), u) for (t in u) r && t in r || T(n.style, t);
			if (r) for (t in r) u && r[t] == u[t] || T(n.style, t, r[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) "function" != typeof r && (r = null), "function" != typeof u && (u = null), (n.__e || (n.__e = {}))[t] = r, r && u || (o = a$1[t] || (a$1[t] = V(t)), (n.__a || (n.__a = {}))[t] = c, f = t != (t = t.replace(l, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), r ? n.addEventListener(t, o, f) : n.removeEventListener(t, o, f));
		else {
			if ("http://www.w3.org/2000/svg" == i) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == r ? "" : r;
				return;
			} catch (n) {}
			if ("function" == typeof r) return;
			null == r || !1 === r && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == r ? "" : r);
		}
	}
	function V(t) {
		return function(r) {
			var u = this.__e;
			if (u) {
				if (u = u[t], null == r[e]) r[e] = c++;
				else if (r[e] < this.__a[t]) return;
				return u(n.event ? n.event(r) : r);
			}
		};
	}
	function z(t, r, u, i, f, o, e, l, c, a) {
		var s, p, v, d, k, b, m, M, C, j, L, H, q, A, O, P, T, N, V = r.type;
		if (r.constructor !== h) return null;
		128 & u.__u && (c = 32 & u.__u, s = u.__c.__z) && (r.__u |= c, p = o = [], 8 == s.nodeType ? l = B(s, o) : o.push(s), l = o[0] || l), (s = n.__b) && s(r);
		n: if ("function" == typeof V) {
			v = e.length;
			try {
				if (M = r.props, C = (s = V.prototype) && s.render, j = (s = V.contextType) && i[s.__c], L = s ? j ? j.props.value : s.__ : i, (d = u.__c) ? (r.__c = d, 2 & d.__g && (d.__g |= 1)) : (C ? r.__c = d = new V(M, L) : (r.__c = d = new x(M, L), d.constructor = V, d.render = K), j && j.sub(d), d.state || (d.state = {}), d.__n = i, d.__g |= 8, d.__h = [], d.__k = []), C && (d.__s || (d.__s = d.state), V.getDerivedStateFromProps && (d.__s == d.state && (d.__s = _({}, d.__s)), _(d.__s, V.getDerivedStateFromProps(M, d.__s)))), k = d.props, b = d.state, d.__v = r, u.__c) {
					if (M !== k && C && !V.getDerivedStateFromProps && d.componentWillReceiveProps && d.componentWillReceiveProps(M, L), r.__v == u.__v && !(8 & d.__g) || !(4 & d.__g) && d.shouldComponentUpdate && !1 === d.shouldComponentUpdate(M, d.__s, L)) {
						r.__v != u.__v && (d.props = M, d.state = d.__s, d.__g &= -9), r.__e = u.__e, r.__k = u.__k, r.__k.some(function(n) {
							n && (n.__ = r);
						}), y.push.apply(d.__h, d.__k), d.__k = [], d.__h.length && e.push(d), l = S(u);
						break n;
					}
					d.componentWillUpdate && d.componentWillUpdate(M, d.__s, L), C && d.componentDidUpdate && d.__h.push(function() {
						d.componentDidUpdate(k, b, m);
					});
				} else C && !V.getDerivedStateFromProps && d.componentWillMount && d.componentWillMount(), C && d.componentDidMount && d.__h.push(d.componentDidMount);
				d.context = L, d.props = M, d.__P = t, d.__g &= -5, H = n.__r, q = C ? 25 : 0;
				do
					d.__g &= -9, H && H(r), s = d.render(d.props, d.state = d.__s, d.context);
				while (8 & d.__g && ++q < 25);
				C && (y.push.apply(d.__h, d.__k), d.__k = []), d.state = d.__s, d.getChildContext && (i = _({}, i, d.getChildContext())), C && u.__c && d.getSnapshotBeforeUpdate && (m = d.getSnapshotBeforeUpdate(k, b)), A = s && s.type === $ && null == s.key ? s.props.children : s, M.__P && (s = l, f = (t = M.__P).namespaceURI, c = o = null, u.props && u.props.__P != t && (u.__k.some(function(n) {
					n && J(n, n);
				}), u.__k = null), l = u.__k ? S(u, 0) : null), l = I(t, w(A) ? A : [A], r, u, i, f, o, e, l, c, a), M.__P && (r.__e = null, l = s), r.__u &= -161, p && p.some(g), d.__h.length && e.push(d), 1 & d.__g && (d.__g &= -4);
			} catch (t) {
				if (e.length = v, r.__v = null, c || o) if (t && t.then) {
					if (r.__u |= 128 | c, o) {
						for (~(T = o.indexOf(l || void 0)) || (T = o.length); (N = o[T - 1]) && 8 == N.nodeType;) T--;
						for (; T < o.length; T++) if (N = o[T]) if (o[T] = null, O) {
							if (N == P) break;
						} else {
							if (8 != N.nodeType) break;
							N.data.startsWith("$s") && (P = B(O = N));
						}
					}
					if (!O) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						O = l;
					}
					(s = B(O = r.__c.__z || (r.__c.__z = O))) ? (r.__e = O, l = s) : r.__e = l, l = l && l.nextSibling;
				} else o && o.some(g);
				else r.__e = u.__e;
				r.__k || (r.__k = u.__k || []), t && t.then || D(r), n.__e(t, r, u);
			}
		} else l = r.__e = F(u.__e, r, u, i, f, o, e, c, a, t);
		return (s = n.diffed) && s(r), l;
	}
	function B(n, t) {
		if (n && 8 == n.nodeType && n.data.startsWith("$s")) for (var r = 1; n = n.nextSibling;) {
			if (8 == n.nodeType) {
				if (n.data.startsWith("$s")) r++;
				else if (n.data.startsWith("/$s") && !--r) return n;
			}
			t && t.push(n);
		}
	}
	function D(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(D));
	}
	function E(t, r, u) {
		for (var i = 0; i < u.length;) G(u[i++], u[i++], u[i++]);
		n.__c && n.__c(r, t), t.some(function(r) {
			try {
				t = r.__h, r.__h = [], t.some(function(n) {
					n.call(r);
				});
			} catch (t) {
				n.__e(t, r.__v);
			}
		});
	}
	function F(t, r, u, i, f, o, e, l, c, a) {
		var s, h, y, _, k, b, m, M, $ = u.props || p, x = r.props, C = r.type;
		if ("svg" == C ? f = "http://www.w3.org/2000/svg" : "math" == C ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
			for (s = 0; s < o.length; s++) if ((k = o[s]) && (C ? k.localName == C : 3 == k.nodeType)) {
				t = k, o[s] = null;
				break;
			}
		}
		if (!t) {
			if (M = a.ownerDocument || document, !C) return M.createTextNode(x);
			t = M.createElementNS(f, C, x.is ? x : a), l && (n.__m && n.__m(r, o), l = !1), o = null;
		}
		if (C) {
			if (a = "template" == C && t.content || t, o = "textarea" == C && null != x.defaultValue ? null : o && d.call(a.childNodes), !l && o) for ($ = {}, s = 0; s < t.attributes.length; s++) $[(k = t.attributes[s]).name] = k.value;
			for (s in $) k = $[s], "dangerouslySetInnerHTML" == s ? y = k : "children" == s || s in x || "value" == s && "defaultValue" in x || "checked" == s && "defaultChecked" in x || N(t, s, null, k, f);
			for (s in x) k = x[s], "children" == s ? _ = k : "dangerouslySetInnerHTML" == s ? h = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || $[s] === k || N(t, s, k, $[s], f);
			h ? (l || y && (h.__html == y.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), r.__k = []) : (y && (t.textContent = ""), ("foreignObject" == C || "http://www.w3.org/1998/Math/MathML" == f && v.test(C)) && (f = "http://www.w3.org/1999/xhtml"), I(a, w(_) ? _ : [_], r, u, i, f, o, e, o ? o[0] : u.__k && S(u, 0), l, c), o && o.some(g)), l && "textarea" != C || (s = "value", "progress" == C && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != C || b) || N(t, s, b, $[s], f), s = "checked", null != m && m != t[s] && N(t, s, m, $[s], f));
		} else $ === x || l && t.data == x || (t.data = x);
		return t;
	}
	function G(t, r, u, i) {
		try {
			"function" == typeof t ? r ? r.__x = t(r) || 1 : i && (i = i.__c || i.__e) && (r = i.__x) && (i.__x = null, "function" == typeof r ? r() : t(null)) : t.current = r;
		} catch (t) {
			n.__e(t, u);
		}
	}
	function J(t, r, u) {
		var i, f, o, e;
		if (n.unmount && n.unmount(t), !(i = t.ref) || i.current && i.current != t.__e || G(i, null, r, t), i = t.__c) {
			if (i.componentWillUnmount) try {
				i.componentWillUnmount();
			} catch (t) {
				n.__e(t, r);
			}
			i.__P = i.__n = null;
		}
		if (i = t.__k) for (e = 0; e < i.length; e++) i[e] && J(i[e], r, "function" != typeof t.type || u && !t.props.__P);
		!u && (i = t.__c) && (i = i.__z) && (f = B(i, o = [])) && (i == t.__e && o.some(g), g(f), g(i)), u || g(t.__e), t.__e = t.__c = t.__ = null;
	}
	function K(n, t, r) {
		return this.constructor(n, r);
	}
	function Q(t, r) {
		var u, i, f, o;
		n.__ && n.__(t, r), 9 == r.nodeType && (r = r.documentElement), i = (u = t && 32 & t.__u) ? null : r.__k, r.__k = m($, { children: [t] }), f = [], o = [], z(r, r.__k, i || p, p, r.namespaceURI, i ? null : r.firstChild ? d.call(r.childNodes) : null, f, i ? i.__e : r.firstChild, u, o), E(f, r.__k, o), r.__k.props.children = null;
	}
	n = { __e: function(n, t, r, u) {
		for (var i, o, e; t = t.__;) if ((i = t.__c) && !(1 & i.__g)) {
			i.__g |= 4;
			try {
				if ((e = (o = i.constructor) && o.getDerivedStateFromError) && i.setState(o.getDerivedStateFromError(n)), i.componentDidCatch && (i.componentDidCatch(n, u || {}), e = 1), e && 8 & i.__g) return void (i.__g |= 2);
			} catch (t) {
				n = t;
			}
		}
		throw f$1 = 0, n;
	} }, t = 0, x.prototype.setState = function(n, t) {
		var r = this.__s;
		r && r != this.state || (r = this.__s = _({}, this.state)), "function" == typeof n && (n = n(_({}, r), this.props)), n && (_(r, n), this.__v && (t && this.__k.push(t), L(this)));
	}, x.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), L(this));
	}, x.prototype.render = $, u$1 = [], f$1 = 0, o$1 = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, e = Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a$1 = {};
	function parseDbkRows(value) {
		if (!Array.isArray(value)) throw new Error("Unexpected DBK response");
		return value.map((row) => {
			if (!row || typeof row !== "object" || !("ActualDBK_SERNo" in row) || typeof row.ActualDBK_SERNo !== "string" || !row.ActualDBK_SERNo.trim()) throw new Error("Unexpected DBK row");
			const item = row;
			return {
				code: row.ActualDBK_SERNo.trim(),
				description: String(item.ActualDBK_Desc ?? ""),
				rate: String(item.ActualDBKRate ?? "")
			};
		});
	}
	function filterDbk(rows, query) {
		const term = query.trim().toLowerCase();
		return rows.filter((row) => `${row.code} ${row.description}`.toLowerCase().includes(term));
	}
	async function lookupDbk(ritc, post) {
		if (!/^\d{8}$/.test(ritc)) throw new Error("Enter an 8-digit RITC number");
		return parseDbkRows(await post("https://impexcube.in/DutyStructureExport/FillDBK", JSON.stringify({
			RITC: ritc,
			Country: "null",
			Mode: "DBK"
		})));
	}
	var f = Symbol.for("pv");
	var o = 0;
	Array.isArray;
	function a(t, e, n$1, u, a, i) {
		e || (e = {});
		var c, l, p = e;
		if ("ref" in p && "function" != typeof t) for (l in p = {}, e) "ref" == l ? c = e[l] : p[l] = e[l];
		var s = {
			type: t,
			props: p,
			key: n$1,
			ref: c,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: f,
			__v: --o,
			__i: -1,
			__u: 0
		};
		return (a || i) && (s.__source = a, s.__self = i), n.vnode && n.vnode(s), s;
	}
	var cache = new Map();
	var attached = new Map();
	var dbkSelector = "input[id$=\"tbProduct_TabPanel1_txtDBKSchNo\"]";
	var ritcSelector = "input[id$=\"tbProduct_TabPanel1_txtRitccode\"]";
	function post(url, body) {
		return new Promise((resolve, reject) => GM_xmlhttpRequest({
			method: "POST",
			url,
			data: body,
			timeout: 15e3,
			headers: { "Content-Type": "application/json; charset=utf-8" },
			onload: (response) => {
				try {
					if (response.status < 200 || response.status >= 300) throw new Error("Request failed");
					resolve(JSON.parse(response.responseText));
				} catch (error) {
					reject(error);
				}
			},
			onerror: () => reject(new Error("Network error")),
			ontimeout: () => reject(new Error("Request timed out"))
		}));
	}
	function attach(input) {
		if (attached.has(input)) return;
		const host = document.createElement("div");
		host.className = "bic-dbk-popup";
		host.hidden = true;
		host.id = `bic-dbk-${Math.random().toString(36).slice(2)}`;
		document.body.append(host);
		input.setAttribute("aria-autocomplete", "list");
		input.setAttribute("aria-controls", host.id);
		input.setAttribute("aria-expanded", "false");
		let rows = [];
		let active = -1;
		let currentRitc = "";
		let state = "";
		let request = 0;
		let cleanup;
		let nativeDisposed = false;
		let selecting = false;
		let blurTimer;
		const getRitc = () => document.querySelector(ritcSelector)?.value.trim() ?? "";
		function close() {
			clearTimeout(blurTimer);
			blurTimer = void 0;
			host.hidden = true;
			input.setAttribute("aria-expanded", "false");
			input.removeAttribute("aria-activedescendant");
			cleanup?.();
			cleanup = void 0;
		}
		function select(row) {
			if (input.disabled || input.readOnly || getRitc() !== currentRitc) return close();
			input.value = row.code;
			close();
			selecting = true;
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
			selecting = false;
		}
		function draw() {
			if (host.hidden) return;
			const visible = filterDbk(rows, input.value);
			if (active >= visible.length) active = visible.length - 1;
			Q(a("div", {
				class: "bic-dbk-list",
				role: "listbox",
				"aria-label": "DBK schemes",
				children: state ? a("div", {
					class: "bic-dbk-message",
					role: "status",
					children: state
				}) : visible.length === 0 ? a("div", {
					class: "bic-dbk-message",
					role: "status",
					children: "No matching DBK schemes"
				}) : visible.map((row, index) => a("div", {
					id: `${host.id}-${index}`,
					role: "option",
					tabIndex: -1,
					"aria-selected": active === index,
					class: `bic-dbk-option ${active === index ? "is-active" : ""}`,
					onMouseDown: (event) => {
						event.preventDefault();
						select(row);
					},
					children: [
						a("span", {
							class: "bic-dbk-code",
							children: row.code
						}),
						a("span", {
							class: "bic-dbk-description",
							children: row.description
						}),
						a("span", {
							class: "bic-dbk-rate",
							children: row.rate ? `${row.rate}%` : ""
						})
					]
				}, row.code))
			}), host);
			if (active >= 0 && visible[active]) input.setAttribute("aria-activedescendant", `${host.id}-${active}`);
			else input.removeAttribute("aria-activedescendant");
		}
		async function refresh() {
			const ritc = getRitc();
			const serial = ++request;
			currentRitc = ritc;
			active = -1;
			rows = [];
			if (!/^\d{8}$/.test(ritc)) {
				state = "Enter an 8-digit RITC number first";
				draw();
				return;
			}
			const saved = cache.get(ritc);
			if (saved && saved.expires > Date.now()) {
				rows = saved.rows;
				state = "";
				draw();
				return;
			}
			state = "Loading DBK schemes…";
			draw();
			try {
				const found = await lookupDbk(ritc, post);
				if (serial !== request || getRitc() !== ritc || !input.isConnected) return;
				cache.set(ritc, {
					rows: found,
					expires: Date.now() + 3e5
				});
				rows = found;
				state = found.length ? "" : "No DBK schemes found for this RITC";
			} catch {
				if (serial !== request || getRitc() !== ritc) return;
				state = "Could not load DBK schemes. Reopen to retry.";
			}
			draw();
		}
		function open() {
			if (input.disabled || input.readOnly) return;
			clearTimeout(blurTimer);
			blurTimer = void 0;
			if (!nativeDisposed) {
				const id = input.id.replace(/txtDBKSchNo$/, "AutoCompleteExtender3");
				const behavior = unsafeWindow.$find?.(id);
				if (behavior) {
					behavior.dispose();
					nativeDisposed = true;
				}
			}
			host.hidden = false;
			input.setAttribute("aria-expanded", "true");
			if (!cleanup) cleanup = autoUpdate(input, host, () => {
				computePosition(input, host, {
					placement: "bottom-start",
					strategy: "fixed",
					middleware: [
						offset(4),
						flip(),
						shift({ padding: 8 }),
						size({
							padding: 8,
							apply({ availableWidth, rects, elements }) {
								elements.floating.style.width = `${Math.min(Math.max(rects.reference.width, 330), availableWidth)}px`;
							}
						})
					]
				}).then(({ x, y }) => {
					Object.assign(host.style, {
						left: `${x}px`,
						top: `${y}px`
					});
				});
			});
			refresh();
		}
		input.addEventListener("focus", open);
		input.addEventListener("input", () => {
			if (selecting) return;
			if (host.hidden) open();
			else if (getRitc() !== currentRitc) refresh();
			else {
				active = -1;
				draw();
			}
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				close();
				return;
			}
			if (event.key === "ArrowDown" && host.hidden) {
				event.preventDefault();
				open();
				return;
			}
			if (host.hidden) return;
			const visible = filterDbk(rows, input.value);
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				event.stopImmediatePropagation();
				active = Math.max(0, Math.min(visible.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
				draw();
				host.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
			} else if (event.key === "Enter" && active >= 0 && visible[active]) {
				event.preventDefault();
				event.stopImmediatePropagation();
				select(visible[active]);
			} else if (event.key === "Tab") close();
		});
		input.addEventListener("focus", open);
		input.addEventListener("blur", () => {
			blurTimer = setTimeout(close, 120);
		});
		const outside = (event) => {
			if (event.target !== input && !host.contains(event.target)) close();
		};
		const ritcChanged = (event) => {
			if (event.target instanceof Element && event.target.matches(ritcSelector) && !host.hidden) refresh();
		};
		document.addEventListener("pointerdown", outside);
		document.addEventListener("input", ritcChanged);
		document.addEventListener("change", ritcChanged);
		attached.set(input, () => {
			clearTimeout(blurTimer);
			request++;
			close();
			Q(null, host);
			host.remove();
			document.removeEventListener("pointerdown", outside);
			document.removeEventListener("input", ritcChanged);
			document.removeEventListener("change", ritcChanged);
		});
	}
	function installDbk() {
		const style = document.createElement("style");
		style.textContent = `.bic-dbk-popup{position:fixed;z-index:2147483000;font:13px/1.35 system-ui,sans-serif;color:#192e3a}.bic-dbk-popup[hidden]{display:none}.bic-dbk-list{max-height:250px;overflow:auto;background:#fff;border:1px solid #b8cbd1;border-radius:5px;box-shadow:0 8px 24px #183c4a26}.bic-dbk-option{display:grid;grid-template-columns:76px 1fr auto;gap:10px;padding:9px 10px;cursor:pointer;border-bottom:1px solid #edf2f3}.bic-dbk-option:hover,.bic-dbk-option.is-active{background:#e8f4f2}.bic-dbk-code{font-weight:700;color:#14574f;font-variant-numeric:tabular-nums}.bic-dbk-description{overflow-wrap:anywhere}.bic-dbk-rate{font-variant-numeric:tabular-nums;color:#49636b}.bic-dbk-message{padding:12px;color:#526a72}`;
		document.head.append(style);
		const scan = () => document.querySelectorAll(dbkSelector).forEach(attach);
		scan();
		new MutationObserver((mutations) => {
			for (const [input, dispose] of attached) if (!input.isConnected) {
				dispose();
				attached.delete(input);
			}
			if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node instanceof Element && (node.matches(dbkSelector) || node.querySelector(dbkSelector))))) scan();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function score(text, query) {
		text = text.toLocaleLowerCase();
		if (!query) return 1;
		if (text === query) return 100;
		if (text.startsWith(query)) return 80;
		if (text.includes(query)) return 60;
		let position = -1;
		for (const char of query) {
			position = text.indexOf(char, position + 1);
			if (position < 0) return 0;
		}
		return 10;
	}
	function enhance(select) {
		const previousTabIndex = select.getAttribute("tabindex");
		const previousAriaHidden = select.getAttribute("aria-hidden");
		const wrapper = document.createElement("span");
		wrapper.className = "bd-wrapper";
		wrapper.style.width = select.style.width || "";
		const trigger = document.createElement("button");
		trigger.type = "button";
		trigger.className = "bd-trigger";
		trigger.setAttribute("aria-haspopup", "listbox");
		trigger.setAttribute("aria-expanded", "false");
		select.before(wrapper);
		wrapper.append(select, trigger);
		select.classList.add("bd-enhanced");
		select.tabIndex = -1;
		select.setAttribute("aria-hidden", "true");
		const popup = document.createElement("div");
		popup.className = "bd-dropdown";
		popup.hidden = true;
		const search = document.createElement("input");
		search.type = "text";
		search.className = "bd-search";
		search.placeholder = "Type to search...";
		search.setAttribute("aria-label", "Search options");
		search.setAttribute("role", "combobox");
		search.setAttribute("aria-expanded", "true");
		search.setAttribute("aria-autocomplete", "list");
		const list = document.createElement("div");
		list.className = "bd-options";
		list.setAttribute("role", "listbox");
		list.id = `bic-options-${Math.random().toString(36).slice(2)}`;
		search.setAttribute("aria-controls", list.id);
		popup.append(search, list);
		document.body.append(popup);
		let options = [];
		let visible = [];
		let active = -1;
		let cleanup;
		let open = false;
		const sync = () => {
			options = Array.from(select.options, (element) => ({
				element,
				value: element.value,
				text: element.textContent?.trim() ?? "",
				disabled: element.disabled || element.parentElement?.tagName === "OPTGROUP" && element.parentElement.disabled
			}));
			trigger.textContent = select.selectedOptions[0]?.textContent?.trim() || "--Choose--";
			trigger.title = trigger.textContent;
			const label = select.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(" ") || select.getAttribute("aria-label")?.trim() || [...select.labels].map((item) => item.textContent?.trim()).filter(Boolean).join(" ");
			if (label) trigger.setAttribute("aria-label", `${label}: ${trigger.textContent}`);
			else trigger.removeAttribute("aria-label");
			trigger.disabled = select.matches(":disabled");
			wrapper.hidden = select.hidden || select.style.display === "none";
			wrapper.style.width = select.style.width || "";
			wrapper.classList.toggle("bd-sized", !!select.style.width);
			trigger.style.font = getComputedStyle(select).font;
			if (trigger.disabled && open) close(false);
		};
		const draw = () => {
			const query = search.value.trim().toLocaleLowerCase();
			visible = options.map((option, index) => ({
				option,
				index,
				rank: Math.max(score(option.text, query), score(option.value, query))
			})).filter((item) => item.rank > 0).sort((a, b) => b.rank - a.rank || a.index - b.index).map((item) => item.option);
			if (active < 0 || active >= visible.length || visible[active]?.disabled) active = visible.findIndex((item) => !item.disabled);
			list.replaceChildren();
			if (!visible.length) {
				const empty = document.createElement("div");
				empty.className = "bd-option";
				empty.setAttribute("role", "status");
				empty.textContent = "No matches found";
				list.append(empty);
				return;
			}
			visible.forEach((item, index) => {
				const row = document.createElement("div");
				row.className = `bd-option${index === active ? " bd-highlighted" : ""}`;
				row.id = `${list.id}-${index}`;
				row.setAttribute("role", "option");
				row.setAttribute("aria-selected", String(item.element.selected));
				row.setAttribute("aria-disabled", String(item.disabled));
				const text = document.createElement("span");
				text.textContent = item.text;
				row.append(text);
				if (item.value && item.value !== item.text && item.value.length <= 15) {
					const code = document.createElement("small");
					code.textContent = item.value;
					row.append(code);
				}
				row.addEventListener("mousedown", (event) => {
					event.preventDefault();
					choose(item);
				});
				list.append(row);
			});
			if (active >= 0) search.setAttribute("aria-activedescendant", `${list.id}-${active}`);
			else search.removeAttribute("aria-activedescendant");
		};
		const close = (focus) => {
			if (!open) return;
			open = false;
			popup.hidden = true;
			trigger.setAttribute("aria-expanded", "false");
			cleanup?.();
			cleanup = void 0;
			document.removeEventListener("pointerdown", outside);
			if (focus && trigger.isConnected && !trigger.disabled) trigger.focus();
		};
		const choose = (item) => {
			if (select.disabled || item.disabled || !item.element.isConnected) return;
			const changed = !item.element.selected;
			item.element.selected = true;
			close(true);
			sync();
			if (changed) {
				select.dispatchEvent(new Event("input", { bubbles: true }));
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		};
		const show = () => {
			sync();
			if (select.disabled) return;
			open = true;
			popup.hidden = false;
			trigger.setAttribute("aria-expanded", "true");
			search.value = "";
			active = -1;
			draw();
			document.addEventListener("pointerdown", outside);
			cleanup = autoUpdate(trigger, popup, () => {
				computePosition(trigger, popup, {
					strategy: "fixed",
					placement: "bottom-start",
					middleware: [
						offset(3),
						flip(),
						shift({ padding: 8 }),
						size({
							padding: 8,
							apply({ rects, availableWidth, elements }) {
								elements.floating.style.width = `${Math.min(Math.max(rects.reference.width, 180), 360, availableWidth)}px`;
							}
						})
					]
				}).then(({ x, y }) => Object.assign(popup.style, {
					left: `${x}px`,
					top: `${y}px`
				}));
			});
			search.focus();
		};
		trigger.addEventListener("click", () => open ? close(true) : show());
		trigger.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				if (!open) show();
			}
		});
		select.addEventListener("focus", () => {
			if (!trigger.disabled) trigger.focus();
		});
		search.addEventListener("input", () => {
			active = -1;
			draw();
		});
		search.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close(true);
			} else if (event.key === "Tab") {
				close(false);
				if (!trigger.disabled) trigger.focus();
			} else if (event.key === "Enter") {
				event.preventDefault();
				const item = visible[active];
				if (item) choose(item);
			} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				const direction = event.key === "ArrowDown" ? 1 : -1;
				let next = active + direction;
				while (next >= 0 && next < visible.length && visible[next]?.disabled) next += direction;
				if (next >= 0 && next < visible.length) active = next;
				draw();
				list.children[active]?.scrollIntoView({ block: "nearest" });
			}
		});
		const outside = (event) => {
			if (!wrapper.contains(event.target) && !popup.contains(event.target)) close(false);
		};
		const onChange = () => {
			sync();
			if (open) draw();
		};
		select.addEventListener("change", onChange);
		const observer = new MutationObserver(onChange);
		observer.observe(select, {
			attributes: true,
			childList: true,
			subtree: true,
			characterData: true
		});
		sync();
		return () => {
			observer.disconnect();
			cleanup?.();
			document.removeEventListener("pointerdown", outside);
			select.removeEventListener("change", onChange);
			wrapper.before(select);
			wrapper.remove();
			popup.remove();
			select.classList.remove("bd-enhanced");
			if (previousAriaHidden === null) select.removeAttribute("aria-hidden");
			else select.setAttribute("aria-hidden", previousAriaHidden);
			if (previousTabIndex === null) select.removeAttribute("tabindex");
			else select.setAttribute("tabindex", previousTabIndex);
		};
	}
	function installDropdowns() {
		const style = document.createElement("style");
		style.textContent = `
    .bd-wrapper[hidden]{display:none}
    .bd-wrapper{display:inline-block;position:relative;vertical-align:middle;max-width:100%}
    .bd-wrapper .bd-enhanced{visibility:hidden!important}
    .bd-wrapper.bd-sized .bd-enhanced{width:100%!important}
    .bd-wrapper .bd-trigger{position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;margin:0;padding:0 20px 0 3px;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:var(--bic-field);border:1px solid var(--bic-border);border-radius:4px;color:var(--bic-text);cursor:pointer;line-height:normal;box-shadow:none}
    .bd-trigger:after{content:'▾';position:absolute;right:4px;top:50%;transform:translateY(-50%)}
    .bd-trigger:focus-visible,.bd-search:focus-visible{outline:2px solid var(--bic-accent);outline-offset:1px}
    .bd-wrapper .bd-trigger:disabled{background:var(--bic-panel);color:var(--bic-muted);cursor:not-allowed}
    .bd-dropdown{position:fixed;z-index:2147483000;background:var(--bic-panel);border:1px solid var(--bic-border);border-radius:6px;box-shadow:0 12px 30px #0008;font:12px/1.4 system-ui;color:var(--bic-text);padding:3px;box-sizing:border-box}
    .bd-dropdown[hidden]{display:none}.bd-search{box-sizing:border-box;width:100%;padding:3px 4px;border:1px solid var(--bic-border);border-radius:4px;background:var(--bic-field);color:var(--bic-text)}.bd-options{max-height:150px;overflow:auto}.bd-option{display:flex;justify-content:space-between;gap:6px;padding:4px 6px;cursor:pointer}.bd-option:hover,.bd-highlighted{background:var(--bic-raised);color:var(--bic-accent)}.bd-option[aria-disabled=true]{opacity:.5;cursor:not-allowed}.bd-option small{color:var(--bic-muted)}
  `;
		document.head.append(style);
		const controls = new Map();
		const scan = () => {
			for (const [element, dispose] of controls) if (!element.isConnected) {
				dispose();
				controls.delete(element);
			}
			document.querySelectorAll("select").forEach((select) => {
				if (!controls.has(select) && !select.matches(".bic-context-select") && !select.multiple && !(select.size > 1)) controls.set(select, enhance(select));
			});
		};
		watchDom("select", scan);
	}
	var form_style_default = "#lblCompName,#lblName{color:var(--bic-text)}#lblUser{color:var(--bic-text)!important}tr:has(>.welcome){background:#242320!important}#menu_div,#navigation,#nav,#nav li a,#nav li ul a{opacity:1!important}#nav,#nav>li,#nav>li>a{color:var(--bic-text)!important;border-color:var(--bic-border)!important;background:#242320!important}#nav>li{position:relative!important}#nav>li>a{border-right:1px solid var(--bic-border)!important;font-family:system-ui,-apple-system,sans-serif!important}#nav>li:hover,#nav>li:hover>a{background:var(--bic-hover)!important}#nav li a:before,.nav li a:before{content:none!important;display:none!important}#nav li ul{z-index:1000!important;background:#252422!important;border:1px solid #45433d!important;border-radius:6px!important;width:max-content!important;min-width:175px!important;margin:0!important;padding:4px 0!important;box-shadow:0 10px 25px #0009!important}#nav>li>ul.first,#nav>li>ul{top:100%!important;left:0!important}#nav li ul li{float:none!important;clear:both!important;background:0 0!important;width:100%!important;display:block!important;position:relative!important}#nav li.hide,#nav li ul li.hide{display:none!important}#nav li ul li a{float:none!important;width:auto!important;color:var(--bic-text)!important;white-space:nowrap!important;background:0 0!important;border:none!important;justify-content:space-between!important;align-items:center!important;padding:7px 16px!important;font-family:system-ui,-apple-system,sans-serif!important;font-size:12px!important;display:flex!important}#nav li ul li:hover,#nav li ul li:hover>a,#nav li ul li a:hover,#nav li ul a:focus-visible{color:var(--bic-accent)!important;background:#473e31!important}#nav li ul li ul{z-index:1001!important;margin-left:2px!important;top:0!important;left:100%!important}#nav li ul li:has(>ul):not(.hide)>a:after{content:\"›\";color:var(--bic-muted);margin-left:14px;font-size:14px}#nav li ul li:hover:has(>ul)>a:after{color:var(--bic-accent)}.bic-context{white-space:nowrap;font:12px system-ui,sans-serif;color:var(--bic-muted)!important}.bic-context select{max-width:124px;min-height:24px;font:inherit;border:1px solid var(--bic-border);cursor:pointer;padding:2px 6px;background:var(--bic-raised)!important;color:var(--bic-text)!important}.bic-context option{background:var(--bic-raised)!important;color:var(--bic-text)!important}#ContentPlaceHolder1_tbProduct,#ContentPlaceHolder1_tbInvoice{color:var(--bic-text);font:14px/1.35 system-ui,sans-serif!important}#ContentPlaceHolder1_tbInvoice_header .ajax__tab_tab br{display:none}#ContentPlaceHolder1_tbProduct_TabSupportingdoc_Td84{font-size:0;text-align:left!important;background:0 0!important;padding:0 0 12px!important}#ContentPlaceHolder1_tbProduct_TabSupportingdoc_Label157{display:block;color:var(--bic-text)!important;font:700 18px/1.3 system-ui,sans-serif!important}#ContentPlaceHolder1_tbProduct .impex-date-input,#ContentPlaceHolder1_tbInvoice .impex-date-input{min-width:92px}input.stylebutton{cursor:pointer;min-width:max-content;min-height:30px;border:1px solid var(--bic-accent-edge)!important;background:var(--bic-accent)!important;color:var(--bic-on-accent)!important;box-shadow:none!important;text-shadow:none!important;border-radius:5px!important;padding:0 12px!important}input.stylebutton:hover{background:var(--bic-accent-hover)!important}td:has(>#ContentPlaceHolder1_btnExit){white-space:nowrap}td:has(>#ContentPlaceHolder1_btnExit)>input.stylebutton{min-height:34px;margin:2px 3px;background:var(--bic-raised)!important;border-color:var(--bic-border)!important;width:auto!important;color:var(--bic-text)!important;padding:0 13px!important;font:600 12px system-ui,sans-serif!important}td:has(>#ContentPlaceHolder1_btnExit)>input.stylebutton:hover{background:#454037!important;border-color:#8f7b5a!important}#ContentPlaceHolder1_tbProduct :is(td,div)[bgcolor],#ContentPlaceHolder1_tbInvoice :is(td,div)[bgcolor]{background-color:var(--bic-panel)!important}.impex-date-btn{background:#37342e!important;border-color:#666052!important}.bd-wrapper .bd-trigger{padding-left:7px;background:var(--bic-field)!important;border:1px solid var(--bic-field-edge)!important;color:var(--bic-text)!important;border-radius:5px!important}.bd-wrapper .bd-trigger:disabled{background:var(--bic-disabled)!important;color:var(--bic-disabled-text)!important}.bd-dropdown,.bic-dbk-list{box-shadow:0 12px 30px #0008;background:var(--bic-surface-2)!important;border-color:var(--bic-border-strong)!important;color:var(--bic-text)!important}.bd-dropdown .bd-search{color:var(--bic-text);border-color:var(--bic-border-strong);background:#191a19}.bd-option:hover,.bd-highlighted,.bic-dbk-option:hover,.bic-dbk-option.is-active{background:var(--bic-accent-wash)!important}.bd-option small,.bic-dbk-rate,.bic-dbk-message{color:#c9bda9!important}.bic-dbk-popup,.bic-dbk-code{color:#f0cf99!important}.impex-calendar-popup{background:var(--bic-surface-2)!important;border-color:var(--bic-border-strong)!important;color:var(--bic-text)!important}.impex-calendar-popup button:hover:not(.selected){background:var(--bic-accent-wash)!important}.impex-calendar-popup .impex-cal-day.selected{background:var(--bic-accent)!important;color:var(--bic-on-accent)!important}.impex-calendar-popup .impex-cal-day.today:not(.selected),.impex-calendar-popup .impex-quick-btn{color:#f0cf99!important}.impex-calendar-popup .impex-cal-grid>span{color:#c2b8a9}.impex-quick-btns{border-color:var(--bic-border-strong)}.bd-trigger:focus-visible,.bd-search:focus-visible,.impex-calendar-popup button:focus-visible{outline-color:var(--bic-accent)!important}#ContentPlaceHolder1_tbProduct_TabSupportingdoc_lblSDAmend{color:var(--bic-muted)!important}#ContentPlaceHolder1_txtJobNo,#ContentPlaceHolder1_ddlInvNo,#ContentPlaceHolder1_ddlPrdSNo{background:var(--bic-field);color:var(--bic-text);border:1px solid var(--bic-field-edge)}#ContentPlaceHolder1_btnGetJob{color:var(--bic-text);border:1px solid var(--bic-border-strong);background:#39352e}#ContentPlaceHolder1_tbInvoice table[bgcolor],#ContentPlaceHolder1_tbInvoice div[style*=F0F8FF]{background:var(--bic-panel)!important}#ContentPlaceHolder1_tbInvoice_TabPanel1_lblisAmend{color:var(--bic-muted)!important}#ContentPlaceHolder1_tbInvoice_TabPanel1_gvInvoiceDetails a{color:#efd0a0!important}#ContentPlaceHolder1_tbInvoice_TabPanel3 :is(#ContentPlaceHolder1_tbInvoice_TabPanel3_txtinvoicevalueINR,#ContentPlaceHolder1_tbInvoice_TabPanel3_txtproductamountINR,#ContentPlaceHolder1_tbInvoice_TabPanel3_txtfobvalueINR){min-width:105px!important}#ContentPlaceHolder1_tbProduct .bic-product-table{color:var(--bic-text);border:1px solid var(--bic-border)!important}#ContentPlaceHolder1_tbProduct .bic-product-table th{padding:8px 5px;font:600 12px/1.2 system-ui,sans-serif;background:var(--bic-head)!important;color:#e0d5c3!important;border:1px solid var(--bic-border)!important}#ContentPlaceHolder1_tbProduct .bic-product-table td{padding:6px 5px;border:1px solid var(--bic-border)!important;color:var(--bic-text)!important}#ContentPlaceHolder1_tbProduct .bic-product-table tr:nth-child(2n){background:#292825!important}#ContentPlaceHolder1_tbProduct .bic-product-table tr:nth-child(odd){background:#232320!important}#ContentPlaceHolder1_tbProduct .bic-product-table tr[style*=font-weight\\:bold]{background:#514532!important}#ContentPlaceHolder1_tbProduct .bic-product-table tr:last-child:not(:has(a)){background:#37352f!important}#ContentPlaceHolder1_tbProduct .bic-product-table a{color:#efd0a0!important}#ContentPlaceHolder1_tbProduct .bic-product-table tr:hover td,#ContentPlaceHolder1_tbProduct .bic-product-table tr:focus-within td{box-shadow:inset 0 0 0 999px #e4b97114}#ContentPlaceHolder1_tbProduct .bic-product-table :is(a,input):focus-visible{outline:2px solid var(--bic-accent);outline-offset:1px}";
	var public_style_default = ".top-bar,.site-navbar,nav.navbar[style*=\"337ab7\" i],footer[style*=\"337ab7\" i]{background:var(--bic-panel)!important;color:var(--bic-text)!important;border-color:var(--bic-border)!important;box-shadow:none!important}.site-navbar{border-bottom:1px solid var(--bic-border)!important}.top-bar a,.site-navbar .site-navigation .site-menu>li>a,.site-navbar .site-menu .nav-link,nav.navbar .nav-link{color:var(--bic-text)!important}.top-bar a:hover,.site-navbar .site-navigation .site-menu>li>a:hover,.site-navbar .site-navigation .site-menu .active,nav.navbar .nav-link:hover,nav.navbar .nav-link.active{color:var(--bic-accent)!important}.site-navbar .site-navigation .site-menu .has-children .dropdown{border-radius:0 0 8px 8px;background:var(--bic-raised)!important;border:1px solid var(--bic-border)!important;border-top:2px solid var(--bic-accent)!important;box-shadow:0 10px 25px #0009!important}.site-navbar .site-navigation .site-menu .has-children .dropdown a{color:var(--bic-text)!important}.site-menu .has-children .dropdown>li>a:hover,.site-menu .has-children .dropdown a.active{color:var(--bic-accent)!important;background:#473e31!important}.site-logo img{display:none!important}.site-logo a:after{content:\"IMPEX CUBE\";color:var(--bic-accent);letter-spacing:.12em;padding:6px 0;font:700 20px/1.4 system-ui,sans-serif;display:inline-block}nav.navbar .site-logo{padding:4px 8px}.top-bar .float-right,footer[style*=\"337ab7\" i],.benefits-image,.benefit-image,.scm-logo,.bg-overlay,#mainContent .slideshow{display:none!important}#mainContent>div:has(>.slideshow){display:none!important}:is(.about,.get-touch){color:var(--bic-accent)!important}:is(.scm-content,.get-content){color:var(--bic-muted)!important}.box{border:1px solid var(--bic-border);border-radius:12px;background:var(--bic-panel)!important;height:auto!important;margin-top:0!important}.listing,.listing li{color:var(--bic-text)!important}.listing strong{color:var(--bic-accent)}.col-md-3 hr{border:0;height:1px;background:var(--bic-border)!important}button.button{background:var(--bic-accent)!important;border:1px solid var(--bic-accent-edge)!important;color:var(--bic-on-accent)!important;border-radius:6px!important}button.button:hover{background:var(--bic-accent-hover)!important}.container-fluid>div[style*=\"background-color:#fff\" i]{max-width:560px;margin:0 auto;background:0 0!important}.container-fluid>div[style*=\"background-color:#fff\" i]>br{display:none}.container-fluid>div[style*=\"background-color:#fff\" i]>.row{justify-content:center;gap:24px;margin:0 0 24px}.container-fluid>div[style*=\"background-color:#fff\" i]>.row>[class*=col-]{flex:none;width:auto;max-width:none;padding:0}.container-fluid>div[style*=\"background-color:#fff\" i] a img{object-fit:contain;border:1px solid var(--bic-border);background:#fff;border-radius:14px;height:180px;padding:16px;transition:transform .15s,box-shadow .15s;width:180px!important}.container-fluid>div[style*=\"background-color:#fff\" i] a:is(:hover,:focus-visible) img{transform:translateY(-3px);box-shadow:0 10px 24px #0008}#mainContent{justify-content:center;align-items:center;min-height:420px;background:0 0!important;height:auto!important}#mainContent>.col-md-4{flex:none;width:min(100%,400px)}#mainContent .card{border-radius:12px;padding:24px 0;box-shadow:0 12px 30px #0006;background:var(--bic-panel)!important;color:var(--bic-text)!important;border:1px solid var(--bic-border)!important}#mainContent .card :is(label,h3,.form-label){color:var(--bic-text);display:block}#mainContent .card label{color:var(--bic-muted);margin-bottom:4px;font-size:13px}#mainContent .card :is(select,input.form-control){width:100%;min-height:38px;font-size:13px!important}#mainContent .card :is(.btn,input[type=submit],#btnGo){width:100%;min-height:38px;box-shadow:none;border-radius:6px;font-weight:600;border:1px solid var(--bic-accent-edge)!important;background:var(--bic-accent)!important;color:var(--bic-on-accent)!important}#mainContent .card :is(.btn,input[type=submit],#btnGo):hover{background:var(--bic-accent-hover)!important}#mainContent .card a{color:var(--bic-accent)!important}#mainContent .card ::placeholder{color:var(--bic-muted);opacity:.7}";
	var site_style_default = ":root{--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;--bic-on-accent:#241c11;--bic-accent-hover:#f0c98b;--bic-accent-edge:#c69b59;--bic-border-strong:#625d53;--bic-surface-2:#2b2a27;--bic-head:#35332e;--bic-accent-wash:#51432f;--bic-hover:#39362f;--bic-disabled:#26261f;--bic-disabled-text:#b8b2a6;--bic-danger:#f87171;--bic-bg:#171716;--bic-panel:#222220;--bic-raised:#2d2c29;--bic-field:#191a19;--bic-field-edge:#77725f;--bic-border:#45443e;--bic-text:#eeeae2;--bic-muted:#b8b2a6;--bic-accent:#e4b971}body{background:var(--bic-bg)!important;color:var(--bic-text)!important}.main,.page,.panel,.panel-body{color:var(--bic-text);background-color:#0000}input[type=text],input[type=password],input[type=number],select,textarea{box-sizing:border-box;border:1px solid var(--bic-field-edge);background:var(--bic-field);min-height:28px;color:var(--bic-text);border-radius:5px;padding:3px 7px;font:13px/1.3 system-ui,sans-serif}:is(input,select,textarea):disabled{background:var(--bic-disabled);color:var(--bic-disabled-text)}:is(input,select,textarea,button,a):focus-visible{outline:2px solid var(--bic-accent);outline-offset:2px}.main a{color:#efd0a0}.ajax__tab_header{border:1px solid var(--bic-border);background:#252421;border-bottom:0;padding:6px 8px}.ajax__tab_outer,.ajax__tab_inner{background:0 0!important;padding:0!important}.ajax__tab_tab{border-radius:5px;display:inline-block;height:auto!important;color:var(--bic-muted)!important;background:#302f2b!important;border:1px solid #45433d!important;margin:2px!important;padding:9px 11px!important;font:600 13px/1.25 system-ui,sans-serif!important}.ajax__tab_active .ajax__tab_tab{background:var(--bic-accent)!important;border-color:var(--bic-accent)!important;color:var(--bic-on-accent)!important}.ajax__tab_tab:hover{filter:brightness(1.13)}.ajax__tab_body{color:var(--bic-text);background:var(--bic-panel)!important;border:1px solid var(--bic-border)!important;padding:14px!important}table.table-wrapper,table[id*=_gv]{border:1px solid var(--bic-border)!important;color:var(--bic-text)!important}table.table-wrapper th,table[id*=_gv] th{padding:8px 5px;background:var(--bic-head)!important;color:#e0d5c3!important;border-color:var(--bic-border)!important}table.table-wrapper td,table[id*=_gv] td{border-color:var(--bic-border)!important;color:var(--bic-text)!important}table.table-wrapper tr:nth-child(2n),table[id*=_gv] tr:nth-child(2n){background:#292825!important}table.table-wrapper tr:nth-child(odd),table[id*=_gv] tr:nth-child(odd){background:#232320!important}table.table-wrapper a,table[id*=_gv] a{color:#efd0a0!important}:is(.completionList,.completionListProduct){box-shadow:0 12px 30px #0008;background:var(--bic-surface-2)!important;color:var(--bic-text)!important;border:1px solid var(--bic-border-strong)!important}:is(.completionList,.completionListProduct) :is(li,table,tbody,tr,td,th,div,span),.listItem{background:var(--bic-surface-2)!important;color:var(--bic-text)!important;border-color:var(--bic-border)!important}:is(.completionList,.completionListProduct) th{background:var(--bic-hover)!important;color:#e0d5c3!important}:is(.completionList,.completionListProduct) :is(li:hover,tr:hover,.highlightedListItem,.itemHighlighted),.highlightedListItem{background:var(--bic-accent-wash)!important;color:var(--bic-text)!important}:is(.completionList,.completionListProduct) :is(li:hover,tr:hover) :is(td,span){background:var(--bic-accent-wash)!important}:is(table,td,div)[bgcolor=white i],div.ajax__tab_container[style*=white i],div[style*=\\#F0F8FF i]{background-color:var(--bic-panel)!important}.actionmenu .dot{background-color:var(--bic-muted)!important}#ContentPlaceHolder1_txtPortdetails{background:var(--bic-field)!important;color:var(--bic-text)!important}.ui-autocomplete.ui-menu{box-shadow:0 12px 30px #0008;background:var(--bic-surface-2)!important;color:var(--bic-text)!important;border:1px solid var(--bic-border-strong)!important}.ui-autocomplete .ui-autocomplete-header{background:var(--bic-hover)!important;color:#e0d5c3!important;border-color:var(--bic-border)!important}.ui-autocomplete .ui-menu-item-wrapper{background:var(--bic-surface-2)!important;color:var(--bic-text)!important;border-color:var(--bic-border)!important}.ui-autocomplete .ui-menu-item-wrapper:is(:hover,.ui-state-active){background:var(--bic-accent-wash)!important;color:var(--bic-text)!important}.ajax__tab_body :is(div,fieldset,table,td)[style*=\\#ffffff i],.ajax__tab_body :is(div,fieldset,table,td)[style*=\"#fff;\" i],.ajax__tab_body :is(div,fieldset,table,td)[style*=\\#f0f8ff i],.ajax__tab_body :is(div,fieldset,table,td)[style*=\"background-color: white\" i]{background-color:var(--bic-panel)!important}.ajax__tab_body fieldset{color:var(--bic-text);border-color:var(--bic-border)!important}.ajax__tab_body legend{color:var(--bic-muted)}table:has(>tbody>tr>th){border-color:var(--bic-border)!important;color:var(--bic-text)!important}table:has(>tbody>tr>th)>tbody>tr>th{background:var(--bic-head)!important;color:#e0d5c3!important;border-color:var(--bic-border)!important}table:has(>tbody>tr>th)>tbody>tr>td{color:var(--bic-text)!important;border-color:var(--bic-border)!important}table:has(>tbody>tr>th)>tbody>tr:nth-child(2n){color:var(--bic-text)!important;background:#292825!important}table:has(>tbody>tr>th)>tbody>tr:nth-child(odd){color:var(--bic-text)!important;background:#232320!important}table:has(>tbody>tr>th)>tbody>tr[style*=font-weight\\:bold i]{background:#514532!important}:is(table:has(>tbody>tr>th)>tbody>tr>td[style*=background i],table:has(>tbody>tr>th)>tbody>tr>td[bgcolor]){background:0 0!important}table:has(>tbody>tr>th)>tbody>tr>td a{color:#efd0a0!important}input[type=text]:focus,textarea:focus{background-color:var(--bic-field)!important;color:var(--bic-text)!important;border-color:var(--bic-accent)!important}:is(input[type=text],input[type=password],input[type=number],input[type=search],textarea):focus-visible{outline:2px solid var(--bic-accent)!important;outline-offset:-2px!important}.impex-date-wrapper{vertical-align:middle!important;align-items:center!important;gap:4px!important;display:inline-flex!important}.impex-date-input{min-width:98px!important}:is(span,font,label,a,p)[style*=color\\:Red i],:is(span,font,label,a,p)[style*=\"color: Red\" i],:is(span,font,label,a,p)[style*=color\\:red i],font[color=red i]{color:#f87171!important}:is(span,font,label,a,p)[style*=color\\:Green i],:is(span,font,label,a,p)[style*=\"color: Green\" i],:is(span,font,label,a,p)[style*=color\\:green i]{color:#86efac!important}:is(span,font,label,a,p)[style*=color\\:Blue i],:is(span,font,label,a,p)[style*=\"color: Blue\" i],:is(span,font,label,a,p)[style*=color\\:blue i],:is(span,font,label,a,p)[style*=\"color:#0066FF\" i]{color:#7dd3fc!important}:is(span,font,label,p)[style*=color\\:Black i],:is(span,font,label,p)[style*=\"color: Black\" i],:is(span,font,label,p)[style*=color\\:black i]{color:var(--bic-text)!important}input:disabled,select:disabled,textarea:disabled,input[readonly],textarea[readonly],input.aspNetDisabled,select.aspNetDisabled{-webkit-text-fill-color:var(--bic-disabled-text);opacity:1;background-color:var(--bic-disabled)!important;color:var(--bic-disabled-text)!important}button.impex-date-btn:disabled{color:var(--bic-disabled-text);background:var(--bic-disabled)}button.impex-date-btn{min-height:24px}:is(span,font,label,a,p,td)[style*=\"color:#ff0000\" i],:is(span,font,label,a,p,td)[style*=\"color:#ff3300\" i],:is(span,font,label,a,p,td)[style*=\"color: #ff0000\" i],.style1007,a[href*=frmChangePassword i]{color:var(--bic-danger)!important}table[id*=GridViewJobHistory]{background:var(--bic-panel)!important;border-color:var(--bic-border)!important}table[id*=GridViewJobHistory] :is(td,th){color:var(--bic-text)!important;border-color:var(--bic-border)!important;background:0 0!important}textarea{font-size:12px}.panel:has(>.menubar,>.navbar){background:var(--bic-panel)!important;color:var(--bic-text)!important}.panel>:is(.menubar,.navbar){background:var(--bic-head)!important;color:var(--bic-text)!important}.panel>.panel-body{background:var(--bic-panel)!important;color:var(--bic-text)!important}table[id*=_gv]{background:var(--bic-panel)!important}.bic-job-results{background:var(--bic-surface-2)!important;color:var(--bic-text)!important;border-color:var(--bic-border-strong)!important;box-shadow:0 12px 30px #0008!important}.bic-job-result{border-color:var(--bic-border)!important}.bic-job-result:hover{background:var(--bic-hover)}.bic-job-result small,.bic-job-message{color:var(--bic-muted)!important}.bic-job-result button,.bic-job-more{color:var(--bic-text);border:1px solid var(--bic-border-strong);background:#454037;border-radius:4px;padding:4px 8px}.bic-job-result button:hover,.bic-job-more:hover{background:#67563c}.bic-job-result button:focus-visible,.bic-job-more:focus-visible{outline:2px solid var(--bic-accent);outline-offset:2px}input.masterbutton{border-radius:5px;background:var(--bic-accent)!important;color:var(--bic-on-accent)!important;border:1px solid var(--bic-accent-edge)!important;box-shadow:none!important}input.masterbutton:hover{background:var(--bic-accent-hover)!important}input.button_image1{cursor:pointer;background:var(--bic-accent)!important;color:var(--bic-on-accent)!important;border:1px solid var(--bic-accent-edge)!important;box-shadow:none!important;border-radius:4px!important}input.button_image1:hover{background:var(--bic-accent-hover)!important}div[id*=ReportViewer i][id*=_ctl13 i],.MSRS-RVC [id*=_ctl13 i],.MSRS-RVC [id*=ReportArea i],[id*=VisibleReportContent i]{background-color:var(--bic-surface-2)!important;padding:16px 0!important}div[id*=ReportViewer i] [id$=_oReportDiv i],.MSRS-RVC [id$=_oReportDiv i]{box-shadow:none!important;background-color:#0000!important}div[id*=ReportViewer i] [id$=_oReportDiv i]>table,.MSRS-RVC [id$=_oReportDiv i]>table{margin:0 auto!important}div[id*=ReportViewer i] [id$=_oReportCell i],.MSRS-RVC [id$=_oReportCell i]{color:#000!important;background-color:#fff!important;box-shadow:0 4px 24px #00000073!important}div[id*=ReportViewer i] [id$=_oReportCell i] :is(span,div,table,td,th,p,b,i,font),.MSRS-RVC [id$=_oReportCell i] :is(span,div,table,td,th,p,b,i,font){color:#000!important}.ToolBarBackground,.MenuBarBkGnd,div[id*=ReportViewer i][id*=_ctl09 i]{color:var(--bic-text)!important;background:#252421!important;border-bottom:1px solid #45443e!important}.ToolBarBackground input,.ToolBarBackground select,.MenuBarBkGnd input,.MenuBarBkGnd select{background:var(--bic-field)!important;color:var(--bic-text)!important;border:1px solid var(--bic-field-edge)!important}.ToolBarBackground .glyphui{filter:invert()brightness(1.5)!important}.ToolBarBackground :is(.DisabledButton,.aspNetDisabled) .glyphui{filter:invert()brightness(.6)!important;opacity:.5!important}.ToolBarBackground div:hover:not(.DisabledButton):not(.aspNetDisabled){background:var(--bic-hover)!important}img[src*=Blank\\.gif i]{display:none!important}table.auto-style68,table.auto-style68>tbody>tr>td{border:none!important}table.auto-style68>tbody>tr:first-child>td:first-child{width:350px!important}table:has(#ContentPlaceHolder1_ddlChecklistFormat)>tbody>tr>td:first-child{vertical-align:top!important;width:200px!important}.contextMenu{background:var(--bic-panel)!important;border:1px solid var(--bic-border-strong)!important;box-sizing:border-box!important;border-radius:6px!important;width:130px!important;padding:4px 0!important;box-shadow:0 12px 30px #0008!important}.contextMenu li{margin:0!important;padding:0!important}.contextMenu li a{color:var(--bic-text)!important;height:auto!important;padding:5px 12px 5px 30px!important;font:13px system-ui,sans-serif!important;display:block!important}.contextMenu li.hover a,.contextMenu li a:hover{background-color:var(--bic-accent-wash)!important;color:var(--bic-accent)!important}.contextMenu li.separator{border-top:1px solid var(--bic-border)!important;margin:3px 0!important}.contextMenu .bic-delete-menu a{color:#f87171!important}.contextMenu .bic-delete-menu.hover a,.contextMenu .bic-delete-menu a:hover{color:#fca5a5!important;background-color:#5a2323!important}.contextMenu .bic-delete-menu svg{stroke:currentColor!important}.dx-datagrid,.dx-datagrid-container,.dx-gridbase-container{background-color:var(--bic-panel)!important;color:var(--bic-text)!important;border-color:var(--bic-border)!important}.dx-datagrid-headers{background-color:var(--bic-head)!important;color:#e0d5c3!important;border-bottom:1px solid var(--bic-border)!important}.dx-datagrid-headers .dx-header-row,.dx-datagrid-headers th,.dx-datagrid-headers td{background:var(--bic-head)!important;color:#e0d5c3!important;border-color:var(--bic-border)!important}.dx-datagrid-headers .dx-datagrid-text-content{color:#e0d5c3!important}.dx-datagrid-rowsview{background-color:var(--bic-panel)!important;color:var(--bic-text)!important}.dx-datagrid-rowsview .dx-row,.dx-datagrid-rowsview td{border-color:var(--bic-border)!important;color:var(--bic-text)!important}.dx-datagrid-rowsview .dx-data-row:nth-child(2n){background-color:#292825!important}.dx-datagrid-rowsview .dx-data-row:nth-child(odd){background-color:#232320!important}.dx-datagrid-rowsview .dx-data-row:hover,.dx-datagrid-rowsview .dx-data-row:hover td{background-color:#3a3832!important}.dx-datagrid-header-panel,.dx-toolbar,.dx-toolbar-items-container{background-color:var(--bic-panel)!important;border-color:var(--bic-border)!important}.dx-pager{color:var(--bic-text)!important;border-top:1px solid var(--bic-border)!important;background-color:#252421!important}.dx-pager .dx-page,.dx-pager .dx-page-sizes .dx-page-size{color:var(--bic-text)!important}.dx-pager .dx-selection,.dx-pager .dx-page.dx-selection{background-color:var(--bic-accent)!important;color:var(--bic-on-accent)!important}.dx-button-mode-contained.dx-button-default,.btn-primary,button.btn-primary{background-color:var(--bic-accent)!important;border-color:var(--bic-accent-edge)!important;color:var(--bic-on-accent)!important}.btn-success,button.btn-success{color:#fff!important;background-color:#2d6a4f!important;border-color:#2d6a4f!important}@media print{body{color:#000!important;background:#fff!important}div[id*=ReportViewer i] [id$=_oReportCell i],.MSRS-RVC [id$=_oReportCell i]{box-shadow:none!important}}input:is([type=checkbox],[type=radio]){accent-color:var(--bic-accent)}:is(input,textarea)::placeholder{color:var(--bic-muted);opacity:.8}table[id*=_gv] tr:nth-child(2n),table.table-wrapper tr:nth-child(2n){background:#2c2b27!important}#dvDash{overflow:auto!important}.jconfirm .jconfirm-box{border:1px solid var(--bic-border);border-radius:10px;box-shadow:0 18px 48px #000a;background:var(--bic-panel)!important;color:var(--bic-text)!important}.jconfirm .jconfirm-box :is(.jconfirm-title,.jconfirm-content,.jconfirm-content *){color:var(--bic-text)!important;background:0 0!important}.jconfirm .jconfirm-box .jconfirm-buttons button{border-radius:5px;background:var(--bic-accent)!important;color:var(--bic-on-accent)!important}.jconfirm .jconfirm-box .jconfirm-buttons button:hover{background:var(--bic-accent-hover)!important}.jconfirm .closeIcon{color:var(--bic-muted)!important}:is(div,td,tr,table,fieldset)[style*=\"background-color:#A6D3FB\" i],:is(tr,td,table)[bgcolor=\\#F0F8FF i],:is(tr,td,table)[bgcolor=\\#A6D3FB i]{background:var(--bic-panel)!important}div[style*=\"background-color:#A6D3FB\" i] fieldset{border-radius:6px;border:1px solid var(--bic-border)!important}div[style*=\"background-color:#A6D3FB\" i] legend{padding:0 6px;color:var(--bic-accent)!important}#ContentPlaceHolder1_plPass[style*=\\#ffffff i]{background:var(--bic-panel)!important}div[style*=\"background-color: #FFFFFF\" i]:has(>iframe){background:var(--bic-panel)!important}input[type=file]{border-radius:4px;background:var(--bic-field)!important;color:var(--bic-text)!important;border:1px solid var(--bic-field-edge)!important}input[type=file]::file-selector-button{background:var(--bic-raised);color:var(--bic-text);border:1px solid var(--bic-border);cursor:pointer;border-radius:4px;margin-right:8px;padding:3px 10px}";
	function installFormStyle() {
		const style = document.createElement("style");
		style.textContent = [
			site_style_default,
			form_style_default,
			public_style_default
		].join("\n");
		(document.head ?? document.documentElement).append(style);
		const last = () => (document.head ?? document.documentElement).append(style);
		document.addEventListener("DOMContentLoaded", last, { once: true });
		window.addEventListener("load", last, { once: true });
	}
	var prefix$2 = "ContentPlaceHolder1_tbProduct_TabSupportingdoc_";
	var todayDate = () => {
		const parts = new Intl.DateTimeFormat("en-GB", {
			timeZone: "Asia/Kolkata",
			day: "2-digit",
			month: "2-digit",
			year: "numeric"
		}).formatToParts(new Date());
		return `${parts.find((p) => p.type === "day")?.value ?? "01"}/${parts.find((p) => p.type === "month")?.value ?? "01"}/${parts.find((p) => p.type === "year")?.value ?? "1970"}`;
	};
	function installInvoiceDate(load = async () => {
		const response = await fetch("/efrmInvoiceDetails.aspx?JobMode=Shipment", { credentials: "same-origin" });
		if (!response.ok || !new URL(response.url).pathname.toLowerCase().endsWith("/efrminvoicedetails.aspx")) throw new Error("Invoice page unavailable");
		return response.text();
	}, today = todayDate) {
		if (!/\/frmEProductMainPage\.aspx$/i.test(location.pathname)) return;
		const attempted = new WeakSet();
		const input = (id) => document.getElementById(id);
		const scan = () => {
			const issue = input(`${prefix$2}txtDocIssueDt`);
			const job = input("ContentPlaceHolder1_txtJobNo")?.value.trim();
			const invoice = document.getElementById("ContentPlaceHolder1_ddlInvNo")?.value.trim();
			const docNo = input(`${prefix$2}txtDocumentNo`);
			const irn = input(`${prefix$2}txtIRNNo`);
			const type = document.getElementById(`${prefix$2}ddldoctypecode`);
			if (!issue || attempted.has(issue) || !job || !invoice || !docNo || !irn || !type || issue.disabled || issue.readOnly || issue.value !== today() || docNo.value || irn.value || type.value) return;
			attempted.add(issue);
			let touched = false;
			issue.addEventListener("input", () => {
				touched = true;
			}, { once: true });
			load().then((html) => {
				const page = new DOMParser().parseFromString(html, "text/html");
				if (page.getElementById("ContentPlaceHolder1_txtJobNo")?.value.trim() !== job) return;
				const rows = [...page.querySelectorAll("#ContentPlaceHolder1_tbInvoice_TabPanel1_gvInvoiceDetails tr")];
				const headings = [...rows.shift()?.querySelectorAll("th") ?? []].map((cell) => cell.textContent?.trim().toLowerCase() ?? "");
				const invNoIndex = headings.findIndex((h) => /^inv\.?\s*no\.?$/i.test(h));
				const dateIndex = headings.findIndex((h) => /^date$/i.test(h));
				if (invNoIndex < 0 || dateIndex < 0) return;
				const matches = rows.filter((row) => row.cells[invNoIndex]?.textContent?.trim() === invoice);
				const date = matches.length === 1 ? matches[0]?.cells[dateIndex]?.textContent?.trim() : void 0;
				if (!date || !/^\d{2}\/\d{2}\/\d{4}$/.test(date) || touched || !issue.isConnected || issue.disabled || issue.readOnly || issue.value !== today() || docNo.value || irn.value || type.value || input("ContentPlaceHolder1_txtJobNo")?.value.trim() !== job || document.getElementById("ContentPlaceHolder1_ddlInvNo")?.value.trim() !== invoice) return;
				issue.value = date;
				issue.dispatchEvent(new Event("input", { bubbles: true }));
				issue.dispatchEvent(new Event("change", { bubbles: true }));
			}).catch(() => {});
		};
		scan();
		new MutationObserver(scan).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	var deletePath = "/frmDeleteJobNo.aspx";
	var prefix$1 = "better-impexcube-delete:";
	var jobPattern$1 = /^[A-Za-z0-9/_-]{1,100}$/;
	function openDelete(job) {
		const tab = window.open("", "_blank");
		if (!tab) return;
		tab.name = `${prefix$1}open:${job}`;
		tab.location.href = deletePath;
	}
	function confirmDelete(job, input, native) {
		const dialog = document.createElement("dialog");
		dialog.className = "bic-delete-dialog";
		dialog.innerHTML = `<h2>Delete job?</h2><p>This will delete <strong></strong>. Check the job details on this page before continuing.</p><label>Type the job number to confirm<input class="bic-delete-confirm-input" autocomplete="off" spellcheck="false"></label><div class="bic-delete-actions"><button type="button" class="bic-delete-cancel">Cancel</button><button type="button" class="bic-delete-confirm" disabled>Delete job</button></div>`;
		const title = dialog.querySelector("strong");
		const typed = dialog.querySelector("input");
		const confirm = dialog.querySelector(".bic-delete-confirm");
		if (!title || !typed || !confirm) return;
		title.textContent = job;
		const valid = () => typed.value.trim() === job && input.value.trim() === job;
		const update = () => {
			confirm.disabled = !valid();
		};
		typed.addEventListener("input", update);
		input.addEventListener("input", update);
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) dialog.close();
		});
		dialog.querySelector(".bic-delete-cancel")?.addEventListener("click", () => dialog.close());
		dialog.addEventListener("close", () => dialog.remove());
		confirm.addEventListener("click", () => {
			if (!valid()) return;
			confirm.disabled = true;
			native.click();
			update();
		});
		if (!document.querySelector("style.bic-delete-style")) {
			const style = document.createElement("style");
			style.className = "bic-delete-style";
			style.textContent = `.bic-delete-dialog{width:min(400px,calc(100% - 48px));border:1px solid #c8d1db;border-radius:8px;padding:20px;color:#1f2937;font:14px system-ui;box-shadow:0 12px 40px #0004}.bic-delete-dialog::backdrop{background:#0008}.bic-delete-dialog h2{font-size:18px;margin:0 0 12px}.bic-delete-dialog p{line-height:1.5}.bic-delete-dialog label{display:block;font-weight:600}.bic-delete-dialog input{box-sizing:border-box;display:block;width:100%;margin:7px 0 16px;padding:8px;border:1px solid #9baabb;border-radius:4px;font:inherit}.bic-delete-actions{display:flex;justify-content:flex-end;gap:8px}.bic-delete-actions button{padding:7px 12px;border:1px solid #aab5c0;border-radius:4px;cursor:pointer}.bic-delete-confirm{background:#b42318;color:white;border-color:#b42318!important}.bic-delete-confirm:disabled{opacity:.45;cursor:not-allowed}`;
			document.head.append(style);
		}
		document.body.append(dialog);
		dialog.showModal();
		typed.focus();
	}
	function installJobDelete(open = openDelete) {
		if (location.pathname.toLowerCase() === deletePath.toLowerCase() && window.name.startsWith(prefix$1)) {
			if (!(!document.referrer || document.referrer.startsWith(location.origin) || (() => {
				try {
					return Boolean(window.opener && window.opener.location.origin === location.origin);
				} catch {
					return false;
				}
			})())) return;
			const handoff = window.name.slice(24);
			window.name = "";
			const separator = handoff.indexOf(":");
			const phase = handoff.slice(0, separator);
			const job = handoff.slice(separator + 1);
			if (separator < 0 || !jobPattern$1.test(job)) return;
			const input = document.querySelector("#ContentPlaceHolder1_txtJobno");
			const go = document.querySelector("#ContentPlaceHolder1_btngo");
			const native = document.querySelector("#ContentPlaceHolder1_btnChangeFyear");
			if (phase === "open" && input && go && input.form) {
				input.value = job;
				window.name = `${prefix$1}loaded:${job}`;
				input.form.requestSubmit(go);
			} else if (phase === "loaded" && input?.value === job && native) confirmDelete(job, input, native);
			return;
		}
		if (location.pathname.toLowerCase() !== "/efrmjobdetails.aspx") return;
		const menu = document.querySelector("#myMenu");
		const grid = document.querySelector("#ContentPlaceHolder1_gvJobNo");
		if (!menu || !grid || menu.querySelector(".bic-delete-menu")) return;
		let job = "";
		const selectRow = (event) => {
			job = event.target.closest("tr")?.querySelector(".jobnomenu")?.textContent?.trim() ?? "";
		};
		grid.addEventListener("mousedown", selectRow, true);
		grid.addEventListener("contextmenu", selectRow, true);
		const item = document.createElement("li");
		item.innerHTML = "<a href=\"#\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6\"/></svg>Delete job</a>";
		const style = document.createElement("style");
		style.textContent = ".contextMenu .bic-delete-menu a{position:relative;background-image:none}.contextMenu .bic-delete-menu svg{position:absolute;left:5px;top:50%;transform:translateY(-50%)}";
		document.head.append(style);
		item.className = "bic-delete-menu";
		item.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (job) open(job);
		}, true);
		menu.append(item);
	}
	function isArray(value) {
		return !Array.isArray ? getTag(value) === "[object Array]" : Array.isArray(value);
	}
	function baseToString(value) {
		if (typeof value == "string") return value;
		if (typeof value === "bigint") return value.toString();
		const result = value + "";
		return result == "0" && 1 / value == -Infinity ? "-0" : result;
	}
	function toString(value) {
		return value == null ? "" : baseToString(value);
	}
	function isString(value) {
		return typeof value === "string";
	}
	function isNumber(value) {
		return typeof value === "number";
	}
	function isBoolean(value) {
		return value === true || value === false || isObjectLike(value) && getTag(value) == "[object Boolean]";
	}
	function isObject(value) {
		return typeof value === "object";
	}
	function isObjectLike(value) {
		return isObject(value) && value !== null;
	}
	function isDefined(value) {
		return value !== void 0 && value !== null;
	}
	function isBlank(value) {
		return !value.trim().length;
	}
	function getTag(value) {
		return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
	}
	var EXTENDED_SEARCH_UNAVAILABLE = "Extended search is not available";
	var LOGICAL_SEARCH_UNAVAILABLE = "Logical search is not available";
	var TOKEN_SEARCH_UNAVAILABLE = "Token search is not available";
	var INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
	var INVALID_DOC_INDEX = "Invalid doc index: must be a non-negative integer within the bounds of the docs array";
	var LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) => `Invalid value for key ${key}`;
	var PATTERN_LENGTH_TOO_LARGE = (max) => `Pattern length exceeds max of ${max}.`;
	var MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;
	var INVALID_KEY_WEIGHT_VALUE = (key) => `Property 'weight' in key '${key}' must be a positive integer`;
	var FUSE_MATCH_TOKEN_SEARCH_UNSUPPORTED = "Fuse.match does not support useTokenSearch: token search requires corpus-level statistics (df, fieldCount) that a one-off string comparison does not have. Use new Fuse(...).search(...) instead.";
	var hasOwn = Object.prototype.hasOwnProperty;
	var KeyStore = class {
		constructor(keys) {
			this._keys = [];
			this._keyMap = {};
			let totalWeight = 0;
			keys.forEach((key) => {
				const obj = createKey(key);
				this._keys.push(obj);
				this._keyMap[obj.id] = obj;
				totalWeight += obj.weight;
			});
			this._keys.forEach((key) => {
				key.weight /= totalWeight;
			});
		}
		get(keyId) {
			return this._keyMap[keyId];
		}
		keys() {
			return this._keys;
		}
		toJSON() {
			return JSON.stringify(this._keys);
		}
	};
	function createKey(key) {
		let path = null;
		let id = null;
		let src = null;
		let weight = 1;
		let getFn = null;
		if (isString(key) || isArray(key)) {
			src = key;
			path = createKeyPath(key);
			id = createKeyId(key);
		} else {
			if (!hasOwn.call(key, "name")) throw new Error(MISSING_KEY_PROPERTY("name"));
			const name = key.name;
			src = name;
			if (hasOwn.call(key, "weight") && key.weight !== void 0) {
				weight = key.weight;
				if (weight <= 0) throw new Error(INVALID_KEY_WEIGHT_VALUE(createKeyId(name)));
			}
			path = createKeyPath(name);
			id = createKeyId(name);
			getFn = key.getFn ?? null;
		}
		return {
			path,
			id,
			weight,
			src,
			getFn
		};
	}
	function createKeyPath(key) {
		return isArray(key) ? key : key.split(".");
	}
	function createKeyId(key) {
		return isArray(key) ? key.join(".") : key;
	}
	function get(obj, path) {
		const list = [];
		let arr = false;
		const deepGet = (obj, path, index, arrayIndex) => {
			if (!isDefined(obj)) return;
			if (!path[index]) list.push(arrayIndex !== void 0 ? {
				v: obj,
				i: arrayIndex
			} : obj);
			else {
				const value = obj[path[index]];
				if (!isDefined(value)) return;
				if (index === path.length - 1 && (isString(value) || isNumber(value) || isBoolean(value) || typeof value === "bigint")) list.push(arrayIndex !== void 0 ? {
					v: toString(value),
					i: arrayIndex
				} : toString(value));
				else if (isArray(value)) {
					arr = true;
					for (let i = 0, len = value.length; i < len; i += 1) deepGet(value[i], path, index + 1, i);
				} else if (path.length) deepGet(value, path, index + 1, arrayIndex);
			}
		};
		deepGet(obj, isString(path) ? path.split(".") : path, 0);
		return arr ? list : list[0];
	}
	var MatchOptions = {
		includeMatches: false,
		findAllMatches: false,
		minMatchCharLength: 1
	};
	var BasicOptions = {
		isCaseSensitive: false,
		ignoreDiacritics: false,
		includeScore: false,
		keys: [],
		shouldSort: true,
		sortFn: (a, b) => a.score === b.score ? a.idx < b.idx ? -1 : 1 : a.score < b.score ? -1 : 1
	};
	var FuzzyOptions = {
		location: 0,
		threshold: .6,
		distance: 100
	};
	var AdvancedOptions = {
		useExtendedSearch: false,
		useTokenSearch: false,
		tokenize: void 0,
		tokenMatch: "any",
		getFn: get,
		ignoreLocation: false,
		ignoreFieldNorm: false,
		fieldNormWeight: 1
	};
	var Config = Object.freeze({
		...BasicOptions,
		...MatchOptions,
		...FuzzyOptions,
		...AdvancedOptions
	});
	function isWordSeparator(code) {
		return code >= 9 && code <= 13 || code === 32 || code === 160;
	}
	function norm(weight = 1, mantissa = 3) {
		const cache = new Map();
		const m = Math.pow(10, mantissa);
		return {
			get(value) {
				let numTokens = 0;
				let inWord = false;
				for (let i = 0; i < value.length; i++) if (!isWordSeparator(value.charCodeAt(i))) {
					if (!inWord) {
						numTokens++;
						inWord = true;
					}
				} else inWord = false;
				if (numTokens === 0) numTokens = 1;
				if (cache.has(numTokens)) return cache.get(numTokens);
				const n = Math.round(m / Math.pow(numTokens, .5 * weight)) / m;
				cache.set(numTokens, n);
				return n;
			},
			clear() {
				cache.clear();
			}
		};
	}
	var FuseIndex = class {
		constructor({ getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
			this.norm = norm(fieldNormWeight, 3);
			this.getFn = getFn;
			this.isCreated = false;
			this.docs = [];
			this.keys = [];
			this._keysMap = {};
			this.setIndexRecords();
		}
		setSources(docs = []) {
			this.docs = docs;
		}
		setIndexRecords(records = []) {
			this.records = records;
		}
		setKeys(keys = []) {
			this.keys = keys;
			this._keysMap = {};
			keys.forEach((key, idx) => {
				this._keysMap[key.id] = idx;
			});
		}
		create() {
			if (this.isCreated || !this.docs.length) return;
			this.isCreated = true;
			const len = this.docs.length;
			this.records = new Array(len);
			let recordCount = 0;
			if (isString(this.docs[0])) for (let i = 0; i < len; i++) {
				const record = this._createStringRecord(this.docs[i], i);
				if (record) this.records[recordCount++] = record;
			}
			else for (let i = 0; i < len; i++) this.records[recordCount++] = this._createObjectRecord(this.docs[i], i);
			this.records.length = recordCount;
			this.norm.clear();
		}
		add(doc, docIndex) {
			if (!Number.isInteger(docIndex) || docIndex < 0) throw new Error(INVALID_DOC_INDEX);
			if (isString(doc)) {
				const record = this._createStringRecord(doc, docIndex);
				if (record) this.records.push(record);
				return record;
			}
			const record = this._createObjectRecord(doc, docIndex);
			this.records.push(record);
			return record;
		}
		removeAt(idx) {
			if (!Number.isInteger(idx) || idx < 0) throw new Error(INVALID_DOC_INDEX);
			for (let i = 0, len = this.records.length; i < len; i += 1) if (this.records[i].i === idx) {
				this.records.splice(i, 1);
				break;
			}
			for (let i = 0, len = this.records.length; i < len; i += 1) if (this.records[i].i > idx) this.records[i].i -= 1;
		}
		removeAll(indices) {
			const toRemove = new Set();
			for (const v of indices) if (Number.isInteger(v) && v >= 0) toRemove.add(v);
			if (toRemove.size === 0) return;
			this.records = this.records.filter((r) => !toRemove.has(r.i));
			const sorted = Array.from(toRemove).sort((a, b) => a - b);
			for (const record of this.records) {
				let lo = 0;
				let hi = sorted.length;
				while (lo < hi) {
					const mid = lo + hi >>> 1;
					if (sorted[mid] < record.i) lo = mid + 1;
					else hi = mid;
				}
				record.i -= lo;
			}
		}
		getValueForItemAtKeyId(item, keyId) {
			return item[this._keysMap[keyId]];
		}
		size() {
			return this.records.length;
		}
		_createStringRecord(doc, docIndex) {
			if (!isDefined(doc) || isBlank(doc)) return null;
			return {
				v: doc,
				i: docIndex,
				n: this.norm.get(doc)
			};
		}
		_createObjectRecord(doc, docIndex) {
			const record = {
				i: docIndex,
				$: {}
			};
			for (let keyIndex = 0, keyLen = this.keys.length; keyIndex < keyLen; keyIndex++) {
				const key = this.keys[keyIndex];
				const value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);
				if (!isDefined(value)) continue;
				if (isArray(value)) {
					const subRecords = [];
					for (let i = 0, len = value.length; i < len; i += 1) {
						const item = value[i];
						if (!isDefined(item)) continue;
						if (isString(item)) {
							if (!isBlank(item)) {
								const subRecord = {
									v: item,
									i,
									n: this.norm.get(item)
								};
								subRecords.push(subRecord);
							}
						} else if (isDefined(item.v)) {
							const text = isString(item.v) ? item.v : toString(item.v);
							if (!isBlank(text)) {
								const subRecord = {
									v: text,
									i: item.i,
									n: this.norm.get(text)
								};
								subRecords.push(subRecord);
							}
						}
					}
					record.$[keyIndex] = subRecords;
				} else if (isString(value) && !isBlank(value)) {
					const subRecord = {
						v: value,
						n: this.norm.get(value)
					};
					record.$[keyIndex] = subRecord;
				}
			}
			return record;
		}
		toJSON() {
			return {
				keys: this.keys.map(({ getFn, ...key }) => key),
				records: this.records
			};
		}
	};
	function createIndex(keys, docs, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
		const myIndex = new FuseIndex({
			getFn,
			fieldNormWeight
		});
		myIndex.setKeys(keys.map(createKey));
		myIndex.setSources(docs);
		myIndex.create();
		return myIndex;
	}
	function parseIndex(data, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
		const { keys, records } = data;
		const myIndex = new FuseIndex({
			getFn,
			fieldNormWeight
		});
		myIndex.setKeys(keys);
		myIndex.setIndexRecords(records);
		return myIndex;
	}
	function convertMaskToIndices(matchmask = [], minMatchCharLength = Config.minMatchCharLength) {
		const indices = [];
		let start = -1;
		let end = -1;
		let i = 0;
		for (let len = matchmask.length; i < len; i += 1) {
			const match = matchmask[i];
			if (match && start === -1) start = i;
			else if (!match && start !== -1) {
				end = i - 1;
				if (end - start + 1 >= minMatchCharLength) indices.push([start, end]);
				start = -1;
			}
		}
		if (matchmask[i - 1] && i - start >= minMatchCharLength) indices.push([start, i - 1]);
		return indices;
	}
	function search(text, pattern, patternAlphabet, { location = Config.location, distance = Config.distance, threshold = Config.threshold, findAllMatches = Config.findAllMatches, minMatchCharLength = Config.minMatchCharLength, includeMatches = Config.includeMatches, ignoreLocation = Config.ignoreLocation } = {}) {
		if (pattern.length > 32) throw new Error(PATTERN_LENGTH_TOO_LARGE(32));
		const patternLen = pattern.length;
		const textLen = text.length;
		const expectedLocation = Math.max(0, Math.min(location, textLen));
		let currentThreshold = threshold;
		let bestLocation = expectedLocation;
		const calcScore = (errors, currentLocation) => {
			const accuracy = errors / patternLen;
			if (ignoreLocation) return accuracy;
			const proximity = Math.abs(expectedLocation - currentLocation);
			if (!distance) return proximity ? 1 : accuracy;
			return accuracy + proximity / distance;
		};
		const computeMatches = minMatchCharLength > 1 || includeMatches;
		const matchMask = computeMatches ? Array(textLen) : [];
		let index;
		while ((index = text.indexOf(pattern, bestLocation)) > -1) {
			const score = calcScore(0, index);
			currentThreshold = Math.min(score, currentThreshold);
			bestLocation = index + patternLen;
			if (computeMatches) {
				let i = 0;
				while (i < patternLen) {
					matchMask[index + i] = 1;
					i += 1;
				}
			}
		}
		bestLocation = -1;
		let lastBitArr = [];
		let finalScore = 1;
		let bestErrors = 0;
		let binMax = patternLen + textLen;
		const mask = 1 << patternLen - 1;
		for (let i = 0; i < patternLen; i += 1) {
			let binMin = 0;
			let binMid = binMax;
			while (binMin < binMid) {
				if (calcScore(i, expectedLocation + binMid) <= currentThreshold) binMin = binMid;
				else binMax = binMid;
				binMid = Math.floor((binMax - binMin) / 2 + binMin);
			}
			binMax = binMid;
			let start = Math.max(1, expectedLocation - binMid + 1);
			const finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;
			const bitArr = Array(finish + 2);
			bitArr[finish + 1] = (1 << i) - 1;
			for (let j = finish; j >= start; j -= 1) {
				const currentLocation = j - 1;
				const charMatch = patternAlphabet[text[currentLocation]];
				bitArr[j] = (bitArr[j + 1] << 1 | 1) & charMatch;
				if (i) bitArr[j] |= (lastBitArr[j + 1] | lastBitArr[j]) << 1 | 1 | lastBitArr[j + 1];
				if (bitArr[j] & mask) {
					finalScore = calcScore(i, currentLocation);
					if (finalScore <= currentThreshold) {
						currentThreshold = finalScore;
						bestLocation = currentLocation;
						bestErrors = i;
						if (bestLocation <= expectedLocation) break;
						start = Math.max(1, 2 * expectedLocation - bestLocation);
					}
				}
			}
			if (calcScore(i + 1, expectedLocation) > currentThreshold) break;
			lastBitArr = bitArr;
		}
		if (computeMatches && bestLocation >= 0) {
			const matchEnd = Math.min(textLen - 1, bestLocation + patternLen - 1 + bestErrors);
			for (let k = bestLocation; k <= matchEnd; k += 1) if (patternAlphabet[text[k]]) matchMask[k] = 1;
		}
		const result = {
			isMatch: bestLocation >= 0,
			score: Math.max(.001, finalScore)
		};
		if (computeMatches) {
			const indices = convertMaskToIndices(matchMask, minMatchCharLength);
			if (!indices.length) result.isMatch = false;
			else if (includeMatches) result.indices = indices;
		}
		return result;
	}
	function createPatternAlphabet(pattern) {
		const mask = {};
		for (let i = 0, len = pattern.length; i < len; i += 1) {
			const char = pattern.charAt(i);
			mask[char] = (mask[char] || 0) | 1 << len - i - 1;
		}
		return mask;
	}
	function mergeIndices(indices) {
		if (indices.length <= 1) return indices;
		indices.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
		const merged = [indices[0]];
		for (let i = 1, len = indices.length; i < len; i += 1) {
			const last = merged[merged.length - 1];
			const curr = indices[i];
			if (curr[0] <= last[1] + 1) last[1] = Math.max(last[1], curr[1]);
			else merged.push(curr);
		}
		return merged;
	}
	var NON_DECOMPOSABLE_MAP = {
		"ł": "l",
		"Ł": "L",
		"đ": "d",
		"Đ": "D",
		"ø": "o",
		"Ø": "O",
		"ħ": "h",
		"Ħ": "H",
		"ŧ": "t",
		"Ŧ": "T",
		"ı": "i",
		"ß": "ss"
	};
	var NON_DECOMPOSABLE_RE = new RegExp("[" + Object.keys(NON_DECOMPOSABLE_MAP).join("") + "]", "g");
	var stripDiacritics = typeof String.prototype.normalize === "function" ? (str) => str.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, "").replace(NON_DECOMPOSABLE_RE, (ch) => NON_DECOMPOSABLE_MAP[ch]) : (str) => str;
	var BitapSearch = class {
		constructor(pattern, { location = Config.location, threshold = Config.threshold, distance = Config.distance, includeMatches = Config.includeMatches, findAllMatches = Config.findAllMatches, minMatchCharLength = Config.minMatchCharLength, isCaseSensitive = Config.isCaseSensitive, ignoreDiacritics = Config.ignoreDiacritics, ignoreLocation = Config.ignoreLocation } = {}) {
			this.options = {
				location,
				threshold,
				distance,
				includeMatches,
				findAllMatches,
				minMatchCharLength,
				isCaseSensitive,
				ignoreDiacritics,
				ignoreLocation
			};
			pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
			pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
			this.pattern = pattern;
			this.chunks = [];
			if (!this.pattern.length) return;
			const addChunk = (pattern, startIndex) => {
				this.chunks.push({
					pattern,
					alphabet: createPatternAlphabet(pattern),
					startIndex
				});
			};
			const len = this.pattern.length;
			if (len > 32) {
				let i = 0;
				const remainder = len % 32;
				const end = len - remainder;
				while (i < end) {
					addChunk(this.pattern.substr(i, 32), i);
					i += 32;
				}
				if (remainder) {
					const startIndex = len - 32;
					addChunk(this.pattern.substr(startIndex), startIndex);
				}
			} else addChunk(this.pattern, 0);
		}
		searchIn(text) {
			const { isCaseSensitive, ignoreDiacritics, includeMatches } = this.options;
			text = isCaseSensitive ? text : text.toLowerCase();
			text = ignoreDiacritics ? stripDiacritics(text) : text;
			if (this.pattern === text) {
				if (text.length < this.options.minMatchCharLength) return {
					isMatch: false,
					score: 1
				};
				const result = {
					isMatch: true,
					score: 0
				};
				if (includeMatches) result.indices = [[0, text.length - 1]];
				return result;
			}
			const { location, distance, threshold, findAllMatches, minMatchCharLength, ignoreLocation } = this.options;
			const allIndices = [];
			let totalScore = 0;
			let hasMatches = false;
			this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
				const { isMatch, score, indices } = search(text, pattern, alphabet, {
					location: location + startIndex,
					distance,
					threshold,
					findAllMatches,
					minMatchCharLength,
					includeMatches,
					ignoreLocation
				});
				if (isMatch) hasMatches = true;
				totalScore += score;
				if (isMatch && indices) allIndices.push(...indices);
			});
			const result = {
				isMatch: hasMatches,
				score: hasMatches ? totalScore / this.chunks.length : 1
			};
			if (hasMatches && includeMatches) result.indices = mergeIndices(allIndices);
			return result;
		}
	};
	var registeredSearchers = [];
	function register(...args) {
		registeredSearchers.push(...args);
	}
	function createSearcher(pattern, options) {
		for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
			const searcherClass = registeredSearchers[i];
			if (searcherClass.condition(pattern, options)) return new searcherClass(pattern, options);
		}
		return new BitapSearch(pattern, options);
	}
	var LogicalOperator = {
		AND: "$and",
		OR: "$or"
	};
	var KeyType = {
		PATH: "$path",
		PATTERN: "$val"
	};
	var isExpression = (query) => !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);
	var isPath = (query) => !!query[KeyType.PATH];
	var isLeaf = (query) => !isArray(query) && isObject(query) && !isExpression(query);
	var convertToExplicit = (query) => ({ [LogicalOperator.AND]: Object.keys(query).map((key) => ({ [key]: query[key] })) });
	function parse(query, options, { auto = true } = {}) {
		const next = (query) => {
			if (isString(query)) {
				const obj = {
					keyId: null,
					pattern: query
				};
				if (auto) obj.searcher = createSearcher(query, options);
				return obj;
			}
			const keys = Object.keys(query);
			const isQueryPath = isPath(query);
			if (!isQueryPath && keys.length > 1 && !isExpression(query)) return next(convertToExplicit(query));
			if (isLeaf(query)) {
				const key = isQueryPath ? query[KeyType.PATH] : keys[0];
				const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];
				if (!isString(pattern)) throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
				const obj = {
					keyId: createKeyId(key),
					pattern
				};
				if (auto) obj.searcher = createSearcher(pattern, options);
				return obj;
			}
			const node = {
				children: [],
				operator: keys[0]
			};
			keys.forEach((key) => {
				const value = query[key];
				if (isArray(value)) value.forEach((item) => {
					node.children.push(next(item));
				});
			});
			return node;
		};
		if (!isExpression(query)) query = convertToExplicit(query);
		return next(query);
	}
	function computeScoreSingle(matches, { ignoreFieldNorm = Config.ignoreFieldNorm }) {
		let totalScore = 1;
		matches.forEach(({ key, norm, score }) => {
			const weight = key ? key.weight : null;
			totalScore *= Math.pow(score === 0 && weight ? Number.EPSILON : score, (weight || 1) * (ignoreFieldNorm ? 1 : norm));
		});
		return totalScore;
	}
	function computeScore(results, { ignoreFieldNorm = Config.ignoreFieldNorm }) {
		results.forEach((result) => {
			result.score = computeScoreSingle(result.matches, { ignoreFieldNorm });
		});
	}
	var MaxHeap = class {
		constructor(limit, comparator) {
			this.limit = limit;
			this.heap = [];
			this.comparator = comparator;
		}
		get size() {
			return this.heap.length;
		}
		insert(item) {
			if (this.size < this.limit) {
				this.heap.push(item);
				this._bubbleUp(this.size - 1);
			} else if (this.comparator(item, this.heap[0]) < 0) {
				this.heap[0] = item;
				this._sinkDown(0);
			}
		}
		extractSorted() {
			return this.heap.sort(this.comparator);
		}
		_bubbleUp(i) {
			const heap = this.heap;
			while (i > 0) {
				const parent = i - 1 >> 1;
				if (this.comparator(heap[i], heap[parent]) <= 0) break;
				const tmp = heap[i];
				heap[i] = heap[parent];
				heap[parent] = tmp;
				i = parent;
			}
		}
		_sinkDown(i) {
			const heap = this.heap;
			const len = heap.length;
			let largest = i;
			do {
				i = largest;
				const left = 2 * i + 1;
				const right = 2 * i + 2;
				if (left < len && this.comparator(heap[left], heap[largest]) > 0) largest = left;
				if (right < len && this.comparator(heap[right], heap[largest]) > 0) largest = right;
				if (largest !== i) {
					const tmp = heap[i];
					heap[i] = heap[largest];
					heap[largest] = tmp;
				}
			} while (largest !== i);
		}
	};
	function formatMatches(result) {
		const matches = [];
		result.matches.forEach((match) => {
			if (!isDefined(match.indices) || !match.indices.length) return;
			const obj = {
				indices: match.indices,
				value: match.value
			};
			if (match.key) obj.key = match.key.id;
			if (match.idx > -1) obj.refIndex = match.idx;
			matches.push(obj);
		});
		return matches;
	}
	function format(results, docs, { includeMatches = Config.includeMatches, includeScore = Config.includeScore } = {}) {
		return results.map((result) => {
			const { idx } = result;
			const data = {
				item: docs[idx],
				refIndex: idx
			};
			if (includeMatches) data.matches = formatMatches(result);
			if (includeScore) data.score = result.score;
			return data;
		});
	}
	var DEFAULT_TOKEN = /[\p{L}\p{M}\p{N}_]+/gu;
	var warned = new WeakSet();
	function warnNonGlobal(regex) {
		if (!warned.has(regex)) {
			warned.add(regex);
			console.warn(`[Fuse] tokenize regex ${regex} lacks the global flag; only the first match per text will be returned. Add the 'g' flag.`);
		}
	}
	function resolveTokenize(tokenize) {
		if (typeof tokenize === "function") {
			let validated = false;
			return (text) => {
				const result = tokenize(text);
				if (!validated) {
					validated = true;
					if (!Array.isArray(result) || result.some((t) => typeof t !== "string")) throw new Error(`[Fuse] tokenize function must return string[]; received ${Array.isArray(result) ? "array containing non-strings" : typeof result}.`);
				}
				return result;
			};
		}
		if (tokenize instanceof RegExp) {
			if (!tokenize.global) warnNonGlobal(tokenize);
			return (text) => text.match(tokenize) || [];
		}
		return (text) => text.match(DEFAULT_TOKEN) || [];
	}
	function createAnalyzer({ isCaseSensitive = false, ignoreDiacritics = false, tokenize } = {}) {
		const tokenizeFn = resolveTokenize(tokenize);
		return { tokenize(text) {
			if (!isCaseSensitive) text = text.toLowerCase();
			if (ignoreDiacritics) text = stripDiacritics(text);
			return tokenizeFn(text);
		} };
	}
	function addField(index, text, docIdx, analyzer) {
		const tokens = analyzer.tokenize(text);
		if (!tokens.length) return;
		index.fieldCount++;
		index.docFieldCount.set(docIdx, (index.docFieldCount.get(docIdx) || 0) + 1);
		const distinctTerms = new Set(tokens);
		let perDocTerms = index.docTermFieldHits.get(docIdx);
		if (!perDocTerms) {
			perDocTerms = new Map();
			index.docTermFieldHits.set(docIdx, perDocTerms);
		}
		for (const term of distinctTerms) {
			perDocTerms.set(term, (perDocTerms.get(term) || 0) + 1);
			index.df.set(term, (index.df.get(term) || 0) + 1);
		}
	}
	function ingestRecord(index, record, keyCount, analyzer) {
		const { i: docIdx, v, $: fields } = record;
		if (v !== void 0) {
			addField(index, v, docIdx, analyzer);
			return;
		}
		if (!fields) return;
		for (let keyIdx = 0; keyIdx < keyCount; keyIdx++) {
			const value = fields[keyIdx];
			if (!value) continue;
			if (Array.isArray(value)) for (const sub of value) addField(index, sub.v, docIdx, analyzer);
			else addField(index, value.v, docIdx, analyzer);
		}
	}
	function buildInvertedIndex(records, keyCount, analyzer) {
		const index = {
			fieldCount: 0,
			df: new Map(),
			docFieldCount: new Map(),
			docTermFieldHits: new Map()
		};
		for (const record of records) ingestRecord(index, record, keyCount, analyzer);
		return index;
	}
	function addToInvertedIndex(index, record, keyCount, analyzer) {
		ingestRecord(index, record, keyCount, analyzer);
	}
	function removeFromInvertedIndex(index, docIdx) {
		const fieldCount = index.docFieldCount.get(docIdx);
		if (fieldCount === void 0) return;
		index.fieldCount -= fieldCount;
		index.docFieldCount.delete(docIdx);
		const perDocTerms = index.docTermFieldHits.get(docIdx);
		if (!perDocTerms) return;
		for (const [term, hits] of perDocTerms) {
			const next = (index.df.get(term) || 0) - hits;
			if (next <= 0) index.df.delete(term);
			else index.df.set(term, next);
		}
		index.docTermFieldHits.delete(docIdx);
	}
	function removeAndShiftInvertedIndex(index, removedIndices) {
		if (removedIndices.length === 0) return;
		const sorted = Array.from(new Set(removedIndices)).sort((a, b) => a - b);
		for (const idx of sorted) removeFromInvertedIndex(index, idx);
		const shift = (oldIdx) => {
			let lo = 0;
			let hi = sorted.length;
			while (lo < hi) {
				const mid = lo + hi >>> 1;
				if (sorted[mid] < oldIdx) lo = mid + 1;
				else hi = mid;
			}
			return oldIdx - lo;
		};
		const firstRemoved = sorted[0];
		const shiftedDocFieldCount = new Map();
		for (const [oldKey, count] of index.docFieldCount) shiftedDocFieldCount.set(oldKey > firstRemoved ? shift(oldKey) : oldKey, count);
		index.docFieldCount = shiftedDocFieldCount;
		const shiftedDocTermFieldHits = new Map();
		for (const [oldKey, terms] of index.docTermFieldHits) shiftedDocTermFieldHits.set(oldKey > firstRemoved ? shift(oldKey) : oldKey, terms);
		index.docTermFieldHits = shiftedDocTermFieldHits;
	}
	var Fuse = class {
		constructor(docs, options, index) {
			this.options = {
				...Config,
				...options
			};
			if (this.options.useExtendedSearch && true) throw new Error(EXTENDED_SEARCH_UNAVAILABLE);
			if (this.options.useTokenSearch && true) throw new Error(TOKEN_SEARCH_UNAVAILABLE);
			this._keyStore = new KeyStore(this.options.keys);
			this._docs = docs;
			this._myIndex = null;
			this._invertedIndex = null;
			this.setCollection(docs, index);
			this._lastQuery = null;
			this._lastSearcher = null;
		}
		_getSearcher(query) {
			if (this._lastQuery === query) return this._lastSearcher;
			const searcher = createSearcher(query, this._invertedIndex ? {
				...this.options,
				_invertedIndex: this._invertedIndex
			} : this.options);
			this._lastQuery = query;
			this._lastSearcher = searcher;
			return searcher;
		}
		setCollection(docs, index) {
			this._docs = docs;
			if (index && !(index instanceof FuseIndex)) throw new Error(INCORRECT_INDEX_TYPE);
			this._myIndex = index || createIndex(this.options.keys, this._docs, {
				getFn: this.options.getFn,
				fieldNormWeight: this.options.fieldNormWeight
			});
			if (this.options.useTokenSearch) {
				const analyzer = createAnalyzer({
					isCaseSensitive: this.options.isCaseSensitive,
					ignoreDiacritics: this.options.ignoreDiacritics,
					tokenize: this.options.tokenize
				});
				this._invertedIndex = buildInvertedIndex(this._myIndex.records, this._myIndex.keys.length, analyzer);
			}
			this._invalidateSearcherCache();
		}
		add(doc) {
			if (!isDefined(doc)) return;
			this._docs.push(doc);
			const record = this._myIndex.add(doc, this._docs.length - 1);
			if (this._invertedIndex && record) {
				const analyzer = createAnalyzer({
					isCaseSensitive: this.options.isCaseSensitive,
					ignoreDiacritics: this.options.ignoreDiacritics,
					tokenize: this.options.tokenize
				});
				addToInvertedIndex(this._invertedIndex, record, this._myIndex.keys.length, analyzer);
			}
			this._invalidateSearcherCache();
		}
		remove(predicate = () => false) {
			const results = [];
			const indicesToRemove = [];
			for (let i = 0, len = this._docs.length; i < len; i += 1) if (predicate(this._docs[i], i)) {
				results.push(this._docs[i]);
				indicesToRemove.push(i);
			}
			if (indicesToRemove.length) {
				if (this._invertedIndex) removeAndShiftInvertedIndex(this._invertedIndex, indicesToRemove);
				const toRemove = new Set(indicesToRemove);
				this._docs = this._docs.filter((_, i) => !toRemove.has(i));
				this._myIndex.removeAll(indicesToRemove);
				this._invalidateSearcherCache();
			}
			return results;
		}
		removeAt(idx) {
			if (!Number.isInteger(idx) || idx < 0 || idx >= this._docs.length) throw new Error(INVALID_DOC_INDEX);
			if (this._invertedIndex) removeAndShiftInvertedIndex(this._invertedIndex, [idx]);
			const doc = this._docs.splice(idx, 1)[0];
			this._myIndex.removeAt(idx);
			this._invalidateSearcherCache();
			return doc;
		}
		_invalidateSearcherCache() {
			this._lastQuery = null;
			this._lastSearcher = null;
		}
		getIndex() {
			return this._myIndex;
		}
		_normalizedKeys() {
			return this._myIndex.keys.map((key) => this._keyStore.get(key.id) || key);
		}
		search(query, options) {
			const { limit = -1 } = options || {};
			const { includeMatches, includeScore, shouldSort, sortFn, ignoreFieldNorm } = this.options;
			if (isString(query) && !query.trim()) {
				let docs = this._docs.map((item, idx) => ({
					item,
					refIndex: idx
				}));
				if (isNumber(limit) && limit > -1) docs = docs.slice(0, limit);
				return docs;
			}
			const useHeap = shouldSort && isNumber(limit) && limit > 0 && isString(query);
			const comparator = sortFn;
			const stable = (a, b) => comparator(a, b) || a.idx - b.idx;
			let results;
			if (useHeap) {
				const heap = new MaxHeap(limit, stable);
				if (isString(this._docs[0])) this._searchStringList(query, {
					heap,
					ignoreFieldNorm
				});
				else this._searchObjectList(query, {
					heap,
					ignoreFieldNorm
				});
				results = heap.extractSorted();
			} else {
				results = isString(query) ? isString(this._docs[0]) ? this._searchStringList(query) : this._searchObjectList(query) : this._searchLogical(query);
				computeScore(results, { ignoreFieldNorm });
				if (shouldSort) results.sort(isString(query) ? stable : comparator);
				if (isNumber(limit) && limit > -1) results = results.slice(0, limit);
			}
			return format(results, this._docs, {
				includeMatches,
				includeScore
			});
		}
		_searchStringList(query, { heap, ignoreFieldNorm } = {}) {
			const searcher = this._getSearcher(query);
			const requireAllTokens = this.options.useTokenSearch && this.options.tokenMatch === "all";
			const { records } = this._myIndex;
			const results = heap ? null : [];
			records.forEach(({ v: text, i: idx, n: norm }) => {
				if (!isDefined(text)) return;
				const searchResult = searcher.searchIn(text);
				if (searchResult.isMatch) {
					const match = {
						score: searchResult.score,
						value: text,
						norm,
						indices: searchResult.indices
					};
					if (requireAllTokens) {
						match.matchedMask = searchResult.matchedMask;
						match.matchedTerms = searchResult.matchedTerms;
						match.termCount = searchResult.termCount;
					}
					const matches = [match];
					if (!requireAllTokens || this._coversAllTokens(matches)) {
						const result = {
							item: text,
							idx,
							matches
						};
						if (heap) {
							result.score = computeScoreSingle(result.matches, { ignoreFieldNorm });
							heap.insert(result);
						} else results.push(result);
					}
				}
			});
			return results;
		}
		_searchLogical(query) {
			throw new Error(LOGICAL_SEARCH_UNAVAILABLE);
		}
		_searchObjectList(query, { heap, ignoreFieldNorm } = {}) {
			const searcher = this._getSearcher(query);
			const requireAllTokens = this.options.useTokenSearch && this.options.tokenMatch === "all";
			const { records } = this._myIndex;
			const keys = this._normalizedKeys();
			const results = heap ? null : [];
			records.forEach(({ $: item, i: idx }) => {
				if (!isDefined(item)) return;
				const matches = [];
				let anyKeyFailed = false;
				let hasInverse = false;
				keys.forEach((key, keyIndex) => {
					const keyMatches = this._findMatches({
						key,
						value: item[keyIndex],
						searcher
					});
					if (keyMatches.length) {
						matches.push(...keyMatches);
						if (keyMatches[0].hasInverse) hasInverse = true;
					} else anyKeyFailed = true;
				});
				if (hasInverse && anyKeyFailed) return;
				if (matches.length && (!requireAllTokens || this._coversAllTokens(matches))) {
					const result = {
						idx,
						item,
						matches
					};
					if (heap) {
						result.score = computeScoreSingle(result.matches, { ignoreFieldNorm });
						heap.insert(result);
					} else results.push(result);
				}
			});
			return results;
		}
		_findMatches({ key, value, searcher }) {
			if (!isDefined(value)) return [];
			const matches = [];
			if (isArray(value)) value.forEach(({ v: text, i: idx, n: norm }) => {
				if (!isDefined(text)) return;
				const searchResult = searcher.searchIn(text);
				if (searchResult.isMatch) {
					const match = {
						score: searchResult.score,
						key,
						value: text,
						idx,
						norm,
						indices: searchResult.indices,
						hasInverse: searchResult.hasInverse
					};
					if (searchResult.termCount !== void 0) {
						match.matchedMask = searchResult.matchedMask;
						match.matchedTerms = searchResult.matchedTerms;
						match.termCount = searchResult.termCount;
					}
					matches.push(match);
				}
			});
			else {
				const { v: text, n: norm } = value;
				const searchResult = searcher.searchIn(text);
				if (searchResult.isMatch) {
					const match = {
						score: searchResult.score,
						key,
						value: text,
						norm,
						indices: searchResult.indices,
						hasInverse: searchResult.hasInverse
					};
					if (searchResult.termCount !== void 0) {
						match.matchedMask = searchResult.matchedMask;
						match.matchedTerms = searchResult.matchedTerms;
						match.termCount = searchResult.termCount;
					}
					matches.push(match);
				}
			}
			return matches;
		}
		_coversAllTokens(matches) {
			const termCount = matches.length ? matches[0].termCount : void 0;
			if (termCount === void 0) return true;
			if (termCount <= 31) {
				let coverage = 0;
				for (let i = 0; i < matches.length; i++) coverage |= matches[i].matchedMask || 0;
				return coverage === 2 ** termCount - 1;
			}
			const coverage = new Set();
			for (let i = 0; i < matches.length; i++) {
				const terms = matches[i].matchedTerms;
				if (terms) for (const t of terms) coverage.add(t);
			}
			return coverage.size === termCount;
		}
	};
	Fuse.version = "7.5.0";
	Fuse.createIndex = createIndex;
	Fuse.parseIndex = parseIndex;
	Fuse.config = Config;
	Fuse.match = function(pattern, text, options) {
		if (options && options.useTokenSearch) throw new Error(FUSE_MATCH_TOKEN_SEARCH_UNSUPPORTED);
		return createSearcher(pattern, {
			...Config,
			...options
		}).searchIn(text);
	};
	Fuse.parseQuery = parse;
	Fuse.use = function(...plugins) {
		plugins.forEach((plugin) => register(plugin));
	};
	var entry_default = Fuse;
	function parseJobs(doc) {
		if (!doc.querySelector("#ContentPlaceHolder1_txtSearch")) throw new Error("Search session unavailable");
		const table = doc.querySelector("#ContentPlaceHolder1_gvJobNo");
		if (!table) return [];
		const headers = Array.from(table.querySelectorAll("th"), (th) => th.textContent?.trim().toLowerCase());
		const exporter = headers.findIndex((h) => /^(exporter|exporter\s*name)$/i.test(h ?? ""));
		const sb = headers.findIndex((h) => /^(sb\s*no\.?|sbno|shipping\s*bill\s*no\.?)$/i.test(h ?? ""));
		const consignee = headers.findIndex((header) => /^(consignee|consignee ?name)$/.test(header ?? ""));
		return Array.from(table.rows).flatMap((row) => {
			const job = row.querySelector(".jobnomenu")?.textContent?.trim();
			if (!job || !row.querySelector("a[href*=\"Select$\"]")) return [];
			return [{
				job,
				exporter: row.cells[exporter]?.textContent?.trim() ?? "",
				sb: row.cells[sb]?.textContent?.trim() ?? "",
				...consignee >= 0 ? { consignee: row.cells[consignee]?.textContent?.trim() ?? "" } : {}
			}];
		});
	}
	function nextPage(doc, page) {
		for (const link of doc.querySelectorAll("#ContentPlaceHolder1_gvJobNo a")) {
			const match = link.getAttribute("href")?.match(/^javascript:__doPostBack\('([^']*\$gvJobNo)',\s*'(Page\$\d+)'\)$/);
			if (match?.[1] && match[2] === `Page$${page}`) return {
				target: match[1],
				argument: match[2]
			};
		}
		return null;
	}
	function rankJobs(jobs, query, onlyMatches = false) {
		const matches = new entry_default(jobs, {
			keys: [
				"job",
				"sb",
				"exporter",
				"consignee"
			],
			threshold: .35,
			ignoreLocation: true
		}).search(query).map((result) => result.item);
		if (onlyMatches) return matches;
		const found = new Set(matches);
		return [...matches, ...jobs.filter((job) => !found.has(job))];
	}
	var searchPath = "/efrmJobDetails.aspx";
	var copyPath = "/frmCopyEJobDetails.aspx";
	var prefix = "better-impexcube:";
	var fields = [
		["a.JobNo", "Job number"],
		["a.SBNo", "SB number"],
		["b.ExporterName", "Exporter"],
		["b.Consignee", "Consignee"]
	];
	var jobPattern = /^[A-Za-z0-9/_-]{1,100}$/;
	function handoff() {
		if (!window.name.startsWith(prefix)) return false;
		if (!(!document.referrer || document.referrer.startsWith(location.origin) || (() => {
			try {
				return Boolean(window.opener && window.opener.location.origin === location.origin);
			} catch {
				return false;
			}
		})())) return false;
		let data;
		try {
			data = JSON.parse(window.name.slice(17));
		} catch {
			window.name = "";
			return false;
		}
		window.name = "";
		if (typeof data.job !== "string" || !jobPattern.test(data.job)) return false;
		if (data.action === "copy" && location.pathname.toLowerCase() === copyPath.toLowerCase()) {
			const input = document.querySelector("#ContentPlaceHolder1_txtJobNo");
			if (input) {
				input.value = data.job;
				input.dispatchEvent(new Event("input", { bubbles: true }));
				input.focus();
			}
			return false;
		}
		if (location.pathname.toLowerCase() !== searchPath.toLowerCase()) return false;
		if (data.action === "search") {
			const select = document.querySelector("#ContentPlaceHolder1_ddlsearch");
			const input = document.querySelector("#ContentPlaceHolder1_txtSearch");
			const button = document.querySelector("#ContentPlaceHolder1_btnSearch");
			if (select && input && button && select.form) {
				select.value = "a.JobNo";
				input.value = data.job;
				window.name = prefix + JSON.stringify({
					action: "select",
					job: data.job
				});
				select.form.requestSubmit(button);
				return true;
			}
		} else if (data.action === "select") {
			const link = Array.from(document.querySelectorAll("#ContentPlaceHolder1_gvJobNo tr")).find((r) => r.querySelector(".jobnomenu")?.textContent?.trim() === data.job)?.querySelector("a[href*=\"Select$\"]");
			if (link) {
				link.click();
				return true;
			}
		}
		return false;
	}
	function openJob(job, action) {
		const tab = window.open("", "_blank");
		if (!tab) return;
		tab.name = prefix + JSON.stringify({
			action,
			job
		});
		tab.location.href = action === "copy" ? copyPath : searchPath;
	}
	async function searchJobs(query, signal, pageLimit, progress) {
		const response = await fetch(searchPath, { signal });
		if (!response.ok) throw new Error("Search unavailable");
		const doc = new DOMParser().parseFromString(await response.text(), "text/html");
		const form = doc.querySelector("form");
		if (!form || !doc.querySelector("#ContentPlaceHolder1_txtSearch")) throw new Error("Search session unavailable");
		const jobs = new Map();
		let partial = false;
		for (const [field, label] of fields) {
			let data = new FormData(form);
			data.set("ctl00$ContentPlaceHolder1$ddlsearch", field);
			data.set("ctl00$ContentPlaceHolder1$txtSearch", query);
			data.set("ctl00$ContentPlaceHolder1$btnSearch", "Search");
			for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
				progress?.(label, pageNumber);
				const result = await fetch(searchPath, {
					method: "POST",
					body: new URLSearchParams(data),
					signal
				});
				if (!result.ok) throw new Error("Search unavailable");
				const page = new DOMParser().parseFromString(await result.text(), "text/html");
				for (const job of parseJobs(page)) {
					const previous = jobs.get(job.job);
					jobs.set(job.job, {
						...previous,
						...job,
						consignee: job.consignee || previous?.consignee
					});
				}
				const next = nextPage(page, pageNumber + 1);
				if (!next) break;
				if (pageNumber === pageLimit) {
					partial = true;
					break;
				}
				const nextForm = page.querySelector("form");
				if (!nextForm) throw new Error("Search session unavailable");
				data = new FormData(nextForm);
				data.set("__EVENTTARGET", next.target);
				data.set("__EVENTARGUMENT", next.argument);
			}
		}
		return {
			jobs: [...jobs.values()],
			partial
		};
	}
	function installJobSearch() {
		if (handoff()) return;
		if (location.pathname.toLowerCase() !== searchPath.toLowerCase()) return;
		const native = document.querySelector("#ContentPlaceHolder1_txtSearch");
		const select = document.querySelector("#ContentPlaceHolder1_ddlsearch");
		const button = document.querySelector("#ContentPlaceHolder1_btnSearch");
		const label = document.querySelector("#ContentPlaceHolder1_lblSearch");
		if (!native || !select || !button || !label || !native.parentElement) return;
		const style = document.createElement("style");
		style.textContent = `.bic-job-search{position:relative;display:inline-block;width:min(560px,75%);text-align:left;font:13px system-ui;vertical-align:middle}.bic-job-search input{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid #8da7c3;border-radius:4px;font:inherit}.bic-job-results{position:absolute;z-index:2147483000;left:0;right:0;top:100%;max-height:360px;overflow:auto;background:#fff;border:1px solid #b8cbd1;border-radius:4px;box-shadow:0 8px 24px #183c4a26;color:#192e3a}.bic-job-results[hidden]{display:none}.bic-job-result{display:flex;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #edf2f2}.bic-job-result div{flex:1;min-width:0;overflow-wrap:anywhere}.bic-job-result small{display:block;color:#526a72}.bic-job-result button,.bic-job-more{cursor:pointer;font:inherit}.bic-job-message{padding:10px;color:#526a72}.bic-job-more{margin:0 6px}`;
		document.head.append(style);
		const box = document.createElement("div");
		box.className = "bic-job-search";
		const input = native;
		input.placeholder = "Search job, SB, exporter or consignee";
		input.setAttribute("aria-label", "Search jobs");
		input.autocomplete = "off";
		input.style.width = "100%";
		const results = document.createElement("div");
		results.className = "bic-job-results";
		results.hidden = true;
		results.setAttribute("aria-live", "polite");
		input.before(box);
		box.append(input, results);
		if (!input.value.trim() && [...select.options].some((option) => option.value === "0")) select.value = "0";
		const combined = () => !select.value || select.value === "0";
		let timer;
		let controller;
		let generation = 0;
		const message = (text) => {
			results.replaceChildren();
			const p = document.createElement("div");
			p.className = "bic-job-message";
			p.textContent = text;
			results.append(p);
			results.hidden = false;
		};
		const runSearch = (query, current, pageLimit) => {
			controller?.abort();
			controller = new AbortController();
			const signal = controller.signal;
			message("Searching…");
			const progress = (field, page) => {
				if (current === generation) message(`Searching ${field}, page ${page}…`);
			};
			(async () => {
				let result = await searchJobs(query, signal, pageLimit, progress);
				let suggestions = false;
				if (!result.jobs.length && query.length >= 4) {
					result = await searchJobs(query.slice(0, 3), signal, pageLimit, progress);
					suggestions = true;
				}
				if (current !== generation) return;
				const jobs = rankJobs(result.jobs, query, suggestions);
				results.replaceChildren();
				if (!jobs.length) {
					message(result.partial ? "No matches in the pages checked." : "No matching jobs found.");
					if (!result.partial) return;
				}
				if (suggestions && jobs.length) {
					const note = document.createElement("div");
					note.className = "bic-job-message";
					note.textContent = "No exact matches. Possible close matches:";
					results.append(note);
				}
				for (const job of jobs) {
					const row = document.createElement("div");
					row.className = "bic-job-result";
					const info = document.createElement("div");
					const title = document.createElement("strong");
					title.textContent = job.job;
					const details = document.createElement("small");
					details.textContent = [
						job.exporter,
						job.consignee ? `Consignee: ${job.consignee}` : "",
						job.sb && `SB ${job.sb}`
					].filter(Boolean).join(" · ");
					info.append(title, details);
					const open = document.createElement("button");
					open.type = "button";
					open.textContent = "Open";
					open.addEventListener("click", () => openJob(job.job, "search"));
					const copy = document.createElement("button");
					copy.type = "button";
					copy.textContent = "Copy job";
					copy.addEventListener("click", () => openJob(job.job, "copy"));
					row.append(info, open, copy);
					results.append(row);
				}
				if (result.partial) {
					const note = document.createElement("div");
					note.className = "bic-job-message";
					note.textContent = `Showing up to ${pageLimit} pages per field. `;
					if (pageLimit < 12) {
						const load = document.createElement("button");
						load.type = "button";
						load.textContent = "Load more";
						load.addEventListener("click", () => {
							load.disabled = true;
							const nextGen = ++generation;
							runSearch(query, nextGen, pageLimit + 3);
						});
						note.append(load);
					} else note.append("Refine your search for more results.");
					results.append(note);
				}
				results.hidden = false;
			})().catch((error) => {
				if (current === generation && !(error instanceof DOMException && error.name === "AbortError")) message("Search failed. Check your session and try again.");
			});
		};
		const queueSearch = (immediate = false) => {
			clearTimeout(timer);
			controller?.abort();
			const current = ++generation;
			const query = input.value.trim();
			if (!combined() || query.length < 2) {
				results.hidden = true;
				return;
			}
			if (immediate) runSearch(query, current, 3);
			else timer = setTimeout(() => runSearch(query, current, 3), 500);
		};
		input.addEventListener("input", () => queueSearch());
		select.addEventListener("change", () => queueSearch());
		button.addEventListener("click", (event) => {
			if (combined()) {
				event.preventDefault();
				queueSearch(true);
			}
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Escape") results.hidden = true;
			if (event.key === "Enter" && combined()) {
				event.preventDefault();
				queueSearch(true);
			}
		});
		input.addEventListener("focus", () => {
			if (combined() && input.value.trim().length >= 2 && results.childNodes.length) results.hidden = false;
		});
		document.addEventListener("pointerdown", (event) => {
			if (!box.contains(event.target)) results.hidden = true;
		});
	}
	function currentFinancialYear(date = new Date()) {
		if (Number.isNaN(date.getTime())) return "";
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone: "Asia/Kolkata",
			year: "numeric",
			month: "numeric"
		}).formatToParts(date);
		const year = Number(parts.find((part) => part.type === "year")?.value);
		const start = Number(parts.find((part) => part.type === "month")?.value) >= 4 ? year : year - 1;
		return `${start}-${start + 1}`;
	}
	var defaulted = new WeakSet();
	function applyLoginDefaults(date) {
		const company = document.querySelector("#drCompany");
		const branch = document.querySelector("#drBranch");
		const year = document.querySelector("#drFinancial");
		const go = document.querySelector("#btnGo");
		if (!company || !branch || !year || !go?.form) return false;
		if (defaulted.has(company)) return true;
		defaulted.add(company);
		const desiredYear = currentFinancialYear(date);
		const find = (select, label) => {
			const options = Array.from(select.options).filter((option) => !option.disabled && option.value && option.text.trim().toUpperCase() === label);
			return options.length === 1 ? options[0] : void 0;
		};
		const desiredBranch = find(branch, "MORADABAD");
		const desiredYearOption = find(year, desiredYear);
		if (!desiredBranch || !desiredYearOption) return true;
		branch.value = desiredBranch.value;
		year.value = desiredYearOption.value;
		const companies = Array.from(company.options).filter((option) => !option.disabled && option.value && !/^--?\s*(choose|select)/i.test(option.text.trim()));
		if (companies.length !== 1) return true;
		company.value = companies[0].value;
		go.click();
		return true;
	}
	function installLoginDefaults(date = new Date()) {
		if (location.hostname.toLowerCase() !== "export.impexcube.in") return;
		applyLoginDefaults(date);
		new MutationObserver(() => {
			applyLoginDefaults(date);
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function installProductUi() {
		if (!/\/frmEProductMainPage\.aspx$/i.test(location.pathname)) return;
		const style = document.createElement("style");
		style.textContent = `
    .bic-product-table td{padding-top:4px;padding-bottom:4px}
  `;
		document.head.append(style);
		const titled = new WeakSet();
		const showValue = (event) => {
			const field = event.target;
			if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.id.includes("tbProduct_") || field instanceof HTMLInputElement && field.type !== "text" || Boolean(field.getAttribute("title")?.trim()) && !titled.has(field)) return;
			field.title = field.value;
			titled.add(field);
		};
		for (const type of [
			"focusin",
			"pointerover",
			"input",
			"change"
		]) document.addEventListener(type, showValue);
		document.addEventListener("keydown", (event) => {
			if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key !== "ArrowDown" && event.key !== "ArrowUp" || !(event.target instanceof Element) || event.target.tagName !== "A" || event.target.textContent?.trim().toLowerCase() !== "select") return;
			const table = event.target.closest(".bic-product-table");
			const row = event.target.closest("tr");
			if (!table || !row) return;
			const rows = [...table.rows];
			const direction = event.key === "ArrowDown" ? 1 : -1;
			for (let index = rows.indexOf(row) + direction; index >= 0 && index < rows.length; index += direction) {
				const link = Array.from(rows[index]?.querySelectorAll("a") ?? []).find((item) => item.textContent?.trim().toLowerCase() === "select");
				if (link) {
					event.preventDefault();
					link.focus();
					break;
				}
			}
		});
		const scan = () => {
			document.querySelectorAll("table:not(.bic-product-table)").forEach((table) => {
				const headings = [...table.querySelectorAll("th")].filter((cell) => cell.closest("table") === table).map((cell) => cell.textContent?.trim().toLowerCase().replace(/[^a-z0-9]/g, " ") ?? "");
				if (headings.some((h) => /\bpro\s*des\b/.test(h)) && headings.some((h) => /\britc\s*no\b/.test(h))) table.classList.add("bic-product-table");
			});
		};
		watchDom("table, tbody, tr, th", scan);
	}
	installFormStyle();
	function initialize() {
		installLoginDefaults();
		installAnnouncementDismiss();
		installContextSwitch();
		installJobDelete();
		installJobSearch();
		installDropdowns();
		installDates();
		installDbk();
		installProductUi();
		installInvoiceDate();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
	else initialize();
})();
