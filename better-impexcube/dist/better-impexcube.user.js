// ==UserScript==
// @name         Better ImpexCube
// @namespace    https://github.com/quantavil/userscript
// @version      1.2.0
// @description  Searchable dropdowns, smarter dates and RITC-specific DBK suggestions for ImpexCube
// @license      GPL-3.0-or-later
// @match        *://impexcube.in/*
// @match        *://*.impexcube.in/*
// @connect      impexcube.in
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
	"use strict";
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
	var format = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
	function parse(value) {
		const text = value.trim().toLowerCase();
		if (text === "today" || /^[+-]\d+$/.test(text)) {
			const result = new Date();
			if (text !== "today") result.setDate(result.getDate() + Number(text));
			return result;
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
    .impex-date-btn{cursor:pointer;background:#fff;border:1px solid #9baeb2;border-radius:3px;padding:2px 5px}
    .impex-date-btn:disabled{opacity:.5;cursor:not-allowed}
    .impex-date-input.invalid{outline:2px solid #b64b4b}
    .impex-calendar-popup{position:fixed;z-index:2147483000;width:238px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:8px;background:#fff;border:1px solid #c8d6df;border-radius:10px;box-shadow:0 12px 32px #1c3c512b;font:12px/1.4 system-ui,sans-serif;color:#203849;font-variant-numeric:tabular-nums}
    .impex-calendar-popup[hidden]{display:none}
    .impex-calendar-popup button{box-sizing:border-box;min-width:0;margin:0;border:0;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer;box-shadow:none;text-shadow:none}
    .impex-cal-header{display:grid;grid-template-columns:26px 26px minmax(0,1fr) 26px 26px;align-items:center;text-align:center}
    .impex-cal-title{font-weight:700;white-space:nowrap}
    .impex-calendar-popup .impex-cal-nav{width:26px;height:26px;padding:0;border-radius:4px;font-size:16px}
    .impex-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;margin:5px 0}
    .impex-cal-grid>span{display:grid;place-items:center;height:22px;color:#687d8a;font-size:11px;font-weight:600}
    .impex-calendar-popup .impex-cal-day{display:grid;place-items:center;width:100%;height:28px;padding:0;border-radius:4px}
    .impex-calendar-popup .impex-cal-day.other-month{color:#9baab2}
    .impex-calendar-popup .impex-cal-day.today:not(.selected){box-shadow:inset 0 0 0 1px #548a83;color:#176b62;font-weight:700}
    .impex-calendar-popup .impex-cal-day.selected{background:#217d72;color:#fff;font-weight:700}
    .impex-quick-btns{display:flex;justify-content:center;gap:6px;padding-top:5px;border-top:1px solid #e5ecef}
    .impex-calendar-popup .impex-quick-btn{padding:6px 9px;border-radius:4px;color:#176b62;font-weight:600}
    .impex-calendar-popup button:hover:not(.selected){background:#eaf4f2}
    .impex-calendar-popup button:focus-visible{outline:2px solid #217d72;outline-offset:1px}
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
			input.value = format(date);
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
			for (let i = 0; i < count; i++) {
				const date = new Date(year, month, i - first + 1), button = document.createElement("button");
				button.type = "button";
				button.className = "impex-cal-day";
				button.textContent = String(date.getDate());
				button.dataset.date = format(date);
				button.setAttribute("aria-label", format(date));
				if (date.getMonth() !== month) button.classList.add("other-month");
				if (format(date) === format(new Date())) button.classList.add("today");
				if (active && format(date) === format(parse(active.value) ?? new Date(1900, 0, 1))) button.classList.add("selected");
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
			render(parse(input.value) ?? new Date());
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
		document.addEventListener("pointerdown", (event) => {
			const target = event.target;
			if (active && !popup.contains(target) && target !== active && !(target instanceof Element && target.closest(".impex-date-btn"))) close();
		});
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
					if (!input.value.trim() || input.readOnly || input.disabled) return;
					const date = parse(input.value);
					if (date) {
						input.value = format(date);
						input.classList.remove("invalid");
					} else input.classList.add("invalid");
				};
				input.addEventListener("change", normalize, true);
				input.addEventListener("blur", normalize, true);
				input.addEventListener("keydown", (event) => {
					if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
					if (input.disabled || input.readOnly) return;
					const date = parse(input.value) ?? new Date();
					date.setDate(date.getDate() + (event.key === "ArrowUp" ? 1 : -1));
					input.value = format(date);
					input.dispatchEvent(new Event("input", { bubbles: true }));
					event.preventDefault();
				});
			});
			if (active && !active.isConnected) close();
		};
		scan();
		new MutationObserver((mutations) => {
			if (mutations.some((m) => [...m.addedNodes, ...m.removedNodes].some((node) => node instanceof Element && (node.matches("input") || node.querySelector("input"))))) scan();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	var n;
	var t;
	var i;
	var u$1;
	var f$1;
	var e;
	var o$1;
	var l;
	var c;
	var a$1;
	var h = Symbol.for("pv");
	var p = {};
	var v = [];
	var y = /^m(i|n|o|s|text|space)$/;
	var w = Array.isArray;
	var d = v.slice;
	var _ = Object.assign;
	function g(n) {
		n && n.parentNode && n.remove();
	}
	function m(r, i, u, f, e) {
		var o = {
			type: r,
			props: i,
			key: u,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: h,
			__v: e || ++t,
			__i: -1,
			__u: 0
		};
		return !e && n.vnode && n.vnode(o), o;
	}
	function M(n) {
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
	function C(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), C(n);
	}
	function j(t) {
		(8 & t.__g || (t.__g |= 8, i.push(t), f$1++)) && u$1 == n.debounceRendering || ((u$1 = n.debounceRendering) || queueMicrotask)(L);
	}
	function L() {
		var t, r, o, l, c, a, s, p, v;
		try {
			for (r = 1; i.length;) i.length > r && i.sort(e), t = i.shift(), r = i.length, 8 & t.__g && (l = void 0, c = void 0, a = (c = (o = t).__v).__e, s = [], p = [], (v = o.__P) && ((l = _({ constructor: h }, c)).__v = c.__v + 1, n.vnode && n.vnode(l), V(v, l, c, o.__n, v.namespaceURI, 32 & c.__u ? [a] : null, s, a || S(c), 32 & c.__u, p), l.__v = c.__v, l.__.__k[l.__i] = l, D(s, l, p), c.__ = c.__e = null, l.__e != a && C(l)));
		} finally {
			(f$1 = i.length) && (u$1 || queueMicrotask)(L);
		}
	}
	function H(n, t, r, i, u, f, e, o, l, c, a) {
		var s, h, y, w, d, _, g = i.__k || v, k = t.length;
		for (l = I(r, t, g, l, k), s = 0; s < k; s++) null != (y = r.__k[s]) && (h = ~y.__i && g[y.__i] || p, y.__i = s, _ = V(n, y, h, u, f, e, o, l, c, a), w = y.__e, (h.ref != y.ref || 8 & h.__u) && (h.ref && F(h.ref, null, y, h), y.ref && a.push(y.ref, y.__c || w, y)), d = d || w, 4 & y.__u ? (l = q(y, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), y.__u &= -21);
		return r.__e = d, l;
	}
	function I(n, t, r, i, u) {
		var f, e, o, l, c, a, s, p, v, y = r.length, d = y, _ = 0, g = 0, k = n.__k = Array(u);
		for (f = 0; f < u; f++) null != (e = t[f]) && "boolean" != typeof e && "function" != typeof e ? ("object" != typeof e || e.constructor === String ? e = k[f] = m(null, e) : w(e) ? e = k[f] = m(M, { children: e }) : e.constructor === h && e.__b ? e = k[f] = m(e.type, e.props, e.key, e.ref, e.__v) : k[f] = e, l = f + _, e.__ = n, e.__b = n.__b + 1, o = null, ~(c = e.__i = O(e, r, l, d)) && (d--, (o = r[c]) && (o.__u |= 2)), o && o.__v ? (e.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (u > y ? _-- : u < y && _++), "function" != typeof e.type && (e.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < u; f++) if ((e = k[f]) && 16 & e.__u) {
				for (_ = 0, p = a.length; _ < p;) a[v = _ + p >> 1] < e.__i ? _ = v + 1 : p = v;
				a[_] = e.__i, s[f] = _ + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (d) for (f = 0; f < y; f++) !(o = r[f]) || 2 & o.__u || (o.__e == i && (i = S(o)), G(o, o));
		return i;
	}
	function q(n, t, r, i) {
		var u, f, e, o;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = q(u[f], t, r, !1));
			return t;
		}
		for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), e = n.__e, o = t; o && 8 == o.nodeType;) o = o.nextSibling;
		for (e != o && (!i && r.moveBefore && e.parentNode ? r.moveBefore(e, t) : r.insertBefore(e, t || null)), t = e; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
		return t;
	}
	function O(n, t, r, i) {
		var u, f = n.key, e = n.type, o = t[r], l = o && !(2 & o.__u);
		if (null === o && null == f || l && f == o.key && e == o.type) return r;
		if (i > (l ? 1 : 0)) {
			for (u = r - 1; u >= 0; u--) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
			for (u = r + 1; u < t.length; u++) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
		}
		return -1;
	}
	function P(n, t, r) {
		r ??= "", "-" == t[0] ? n.setProperty(t, r) : n[t] = r;
	}
	function T(n, t, r, i, u) {
		var f, e;
		if ("style" == t) if ("string" == typeof r) n.style.cssText = r;
		else {
			if ("string" == typeof i && (n.style.cssText = i = ""), i) for (t in i) r && t in r || P(n.style, t);
			if (r) for (t in r) i && r[t] == i[t] || P(n.style, t, r[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = r, r && i || (e = a$1[t] || (a$1[t] = N(t)), (n.__a || (n.__a = {}))[t] = c, f = t != (t = t.replace(l, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), r ? n.addEventListener(t, e, f) : n.removeEventListener(t, e, f));
		else {
			if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == r ? "" : r;
				return;
			} catch (n) {}
			if ("function" == typeof r) return;
			null == r || !1 === r && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == r ? "" : r);
		}
	}
	function N(t) {
		return function(r) {
			var i = this.__e;
			if (i) {
				if (i = i[t], null == r[o$1]) r[o$1] = c++;
				else if (r[o$1] < this.__a[t]) return;
				return i(n.event ? n.event(r) : r);
			}
		};
	}
	function V(t, r, i, u, f, e, o, l, c, a) {
		var s, p, y, d, k, b, m, $, C, j, L, I, q, A, O, P, T, N, V = r.type;
		if (r.constructor !== h) return null;
		128 & i.__u && (c = 32 & i.__u, s = i.__c.__z) && (r.__u |= c, p = e = [], 8 == s.nodeType ? l = z(s, e) : e.push(s), l = e[0] || l), (s = n.__b) && s(r);
		n: if ("function" == typeof V) {
			y = o.length;
			try {
				if ($ = r.props, C = (s = V.prototype) && s.render, j = (s = V.contextType) && u[s.__c], L = s ? j ? j.props.value : s.__ : u, (d = i.__c) ? (r.__c = d, 2 & d.__g && (d.__g |= 1)) : (C ? r.__c = d = new V($, L) : (r.__c = d = new x($, L), d.constructor = V, d.render = J), j && j.sub(d), d.state || (d.state = {}), d.__n = u, d.__g |= 8, d.__h = [], d.__k = []), C && (d.__s || (d.__s = d.state), V.getDerivedStateFromProps && (d.__s == d.state && (d.__s = _({}, d.__s)), _(d.__s, V.getDerivedStateFromProps($, d.__s)))), k = d.props, b = d.state, d.__v = r, i.__c) {
					if ($ !== k && C && !V.getDerivedStateFromProps && d.componentWillReceiveProps && d.componentWillReceiveProps($, L), r.__v == i.__v && !(8 & d.__g) || !(4 & d.__g) && d.shouldComponentUpdate && !1 === d.shouldComponentUpdate($, d.__s, L)) {
						r.__v != i.__v && (d.props = $, d.state = d.__s, d.__g &= -9), r.__e = i.__e, r.__k = i.__k, r.__k.some(function(n) {
							n && (n.__ = r);
						}), v.push.apply(d.__h, d.__k), d.__k = [], d.__h.length && o.push(d), l = S(i);
						break n;
					}
					d.componentWillUpdate && d.componentWillUpdate($, d.__s, L), C && d.componentDidUpdate && d.__h.push(function() {
						d.componentDidUpdate(k, b, m);
					});
				} else C && !V.getDerivedStateFromProps && d.componentWillMount && d.componentWillMount(), C && d.componentDidMount && d.__h.push(d.componentDidMount);
				if (d.context = L, d.props = $, d.__P = t, d.__g &= -5, I = n.__r, q = 0, C) d.state = d.__s, d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), v.push.apply(d.__h, d.__k), d.__k = [];
				else do
					d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), d.state = d.__s;
				while (8 & d.__g && ++q < 25);
				d.state = d.__s, d.getChildContext && (u = _({}, u, d.getChildContext())), C && i.__c && d.getSnapshotBeforeUpdate && (m = d.getSnapshotBeforeUpdate(k, b)), A = s && s.type === M && null == s.key ? s.props.children : s, $.__P && (s = l, f = (t = $.__P).namespaceURI, c = e = null, i.props && i.props.__P != t && (i.__k.some(function(n) {
					n && G(n, n);
				}), i.__k = null), l = i.__k ? S(i, 0) : null), l = H(t, w(A) ? A : [A], r, i, u, f, e, o, l, c, a), $.__P && (r.__e = null, l = s), r.__u &= -161, p && p.some(g), d.__h.length && o.push(d), 1 & d.__g && (d.__g &= -4);
			} catch (t) {
				if (o.length = y, r.__v = null, c || e) if (t.then) {
					if (O = 0, r.__u |= 128 | c, e) {
						for (~(T = e.indexOf(l || void 0)) || (T = e.length); (N = e[T - 1]) && 8 == N.nodeType;) T--;
						for (; T < e.length; T++) if (N = e[T]) {
							if (e[T] = null, 8 == N.nodeType) {
								if (N.data.startsWith("$s")) O++ || (P = N);
								else if (O && N.data.startsWith("/$s") && !--O) break;
							} else if (!O) break;
						}
					}
					if (!P) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						P = l;
					}
					(s = z(P = r.__c.__z || (r.__c.__z = P))) ? (r.__e = P, l = s) : r.__e = l, l = l && l.nextSibling;
				} else e && e.some(g);
				else r.__e = i.__e;
				r.__k || (r.__k = i.__k || []), t.then || B(r), n.__e(t, r, i);
			}
		} else l = r.__e = E(i.__e, r, i, u, f, e, o, c, a, t);
		return (s = n.diffed) && s(r), l;
	}
	function z(n, t) {
		if (n && 8 == n.nodeType && n.data.startsWith("$s")) for (var r = 1; n = n.nextSibling;) {
			if (8 == n.nodeType) {
				if (n.data.startsWith("$s")) r++;
				else if (n.data.startsWith("/$s") && !--r) return n;
			}
			t && t.push(n);
		}
	}
	function B(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(B));
	}
	function D(t, r, i) {
		for (var u = 0; u < i.length;) F(i[u++], i[u++], i[u++]);
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
	function E(t, r, i, u, f, e, o, l, c, a) {
		var s, h, v, _, k, b, m, $, M, x = i.props || p, C = r.props, j = r.type;
		if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), e) {
			for (s = 0; s < e.length; s++) if ((k = e[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
				t = k, e[s] = null;
				break;
			}
		}
		if (!t) {
			if ($ = a.ownerDocument || document, !j) return $.createTextNode(C);
			t = $.createElementNS(f, j, C.is && C), l && (n.__m && n.__m(r, e), l = !1), e = null;
		}
		if (j) {
			if (a = "template" == j && t.content || t, e = "textarea" == j && null != C.defaultValue ? null : e && d.call(a.childNodes), !l && e) for (x = {}, s = 0; s < t.attributes.length; s++) x[(k = t.attributes[s]).name] = k.value;
			for (s in x) k = x[s], "dangerouslySetInnerHTML" == s ? v = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T(t, s, null, k, f);
			for (s in M = 1 & i.__u, C) k = C[s], "children" == s ? _ = k : "dangerouslySetInnerHTML" == s ? h = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(x[s] !== k || M && null != k) || T(t, s, k, x[s], f);
			h ? (l || v && (h.__html == v.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), r.__k = []) : (v && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && y.test(j)) && (f = "http://www.w3.org/1999/xhtml"), H(a, w(_) ? _ : [_], r, i, u, f, e, o, e ? e[0] : i.__k && S(i, 0), l, c), e && e.some(g)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T(t, s, b, x[s], f), s = "checked", null != m && m != t[s] && T(t, s, m, x[s], f));
		} else x === C || l && t.data == C || (t.data = C);
		return t;
	}
	function F(t, r, i, u) {
		try {
			"function" == typeof t ? r ? r.__x = t(r) || 1 : u && (u = u.__c || u.__e) && (r = u.__x) && (u.__x = null, "function" == typeof r ? r() : t(null)) : t.current = r;
		} catch (t) {
			n.__e(t, i);
		}
	}
	function G(t, r, i) {
		var u, f, e, o;
		if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || F(u, null, r, t), u = t.__c) {
			if (u.componentWillUnmount) try {
				u.componentWillUnmount();
			} catch (t) {
				n.__e(t, r);
			}
			u.__P = u.__n = null;
		}
		if (u = t.__k) for (o = 0; o < u.length; o++) u[o] && G(u[o], r, "function" != typeof t.type || i && !t.props.__P);
		!i && (u = t.__c) && (u = u.__z) && (f = z(u, e = [])) && (u == t.__e && e.some(g), g(f), g(u)), (u = t.__e) && (i || g(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
	}
	function J(n, t, r) {
		return this.constructor(n, r);
	}
	function K(t, r) {
		var i, u, f, e;
		n.__ && n.__(t, r), 9 == r.nodeType && (r = r.documentElement), u = (i = t && 32 & t.__u) ? null : r.__k, r.__k = m(M, { children: [t] }), f = [], e = [], V(r, r.__k, u || p, p, r.namespaceURI, u ? null : r.firstChild ? d.call(r.childNodes) : null, f, u ? u.__e : r.firstChild, i, e), D(f, r.__k, e), r.__k.props.children = null;
	}
	n = { __e: function(n, t, r, i) {
		for (var u, e, o; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
			u.__g |= 4;
			try {
				if ((o = (e = u.constructor) && e.getDerivedStateFromError) && u.setState(e.getDerivedStateFromError(n)), u.componentDidCatch && (u.componentDidCatch(n, i || {}), o = 1), o && 8 & u.__g) return void (u.__g |= 2);
			} catch (t) {
				n = t;
			}
		}
		throw f$1 = 0, n;
	} }, t = 0, x.prototype.setState = function(n, t) {
		var r = this.__s;
		r && r != this.state || (r = this.__s = _({}, this.state)), "function" == typeof n && (n = n(_({}, r), this.props)), n && (_(r, n), this.__v && (t && this.__k.push(t), j(this)));
	}, x.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), j(this));
	}, x.prototype.render = M, i = [], f$1 = 0, e = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, o$1 = Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a$1 = {};
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
		const getRitc = () => document.querySelector(ritcSelector)?.value.trim() ?? "";
		function close() {
			host.hidden = true;
			input.setAttribute("aria-expanded", "false");
			input.removeAttribute("aria-activedescendant");
			cleanup?.();
			cleanup = void 0;
		}
		function select(row) {
			if (input.disabled || getRitc() !== currentRitc) return close();
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
			K(a("div", {
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
		input.addEventListener("blur", () => window.setTimeout(close, 120));
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
			request++;
			close();
			K(null, host);
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
				list.textContent = "No matches found";
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
								elements.floating.style.width = `${Math.min(Math.max(rects.reference.width, 240), availableWidth)}px`;
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
		search.addEventListener("input", () => {
			active = -1;
			draw();
		});
		search.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close(true);
			} else if (event.key === "Tab") close(false);
			else if (event.key === "Enter") {
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
		document.addEventListener("pointerdown", outside);
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
    .bd-wrapper .bd-trigger{position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;margin:0;padding:0 20px 0 3px;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:#fff;border:1px solid #8da7c3;border-radius:2px;color:#111;cursor:pointer;line-height:normal;box-shadow:none}
    .bd-trigger:after{content:'▾';position:absolute;right:4px;top:50%;transform:translateY(-50%)}
    .bd-trigger:focus-visible,.bd-search:focus-visible{outline:2px solid #217d72;outline-offset:1px}
    .bd-wrapper .bd-trigger:disabled{background:#eee;color:#888;cursor:not-allowed}
    .bd-dropdown{position:fixed;z-index:2147483000;background:white;border:1px solid #b8cbd1;border-radius:5px;box-shadow:0 8px 24px #183c4a26;font:12px/1.35 system-ui;color:#192e3a;padding:4px;box-sizing:border-box}
    .bd-dropdown[hidden]{display:none}.bd-search{box-sizing:border-box;width:100%;padding:5px;border:1px solid #b8cbd1;border-radius:3px}.bd-options{max-height:200px;overflow:auto}.bd-option{display:flex;justify-content:space-between;gap:6px;padding:5px 6px;cursor:pointer}.bd-option:hover,.bd-highlighted{background:#e8f4f2}.bd-option[aria-disabled=true]{opacity:.5;cursor:not-allowed}.bd-option small{color:#526a72}
  `;
		document.head.append(style);
		const controls = new Map();
		const scan = () => {
			for (const [element, dispose] of controls) if (!element.isConnected) {
				dispose();
				controls.delete(element);
			}
			document.querySelectorAll("select").forEach((select) => {
				if (!controls.has(select) && !select.multiple && !(select.size > 1)) controls.set(select, enhance(select));
			});
		};
		scan();
		new MutationObserver((mutations) => {
			if (mutations.some((m) => [...m.addedNodes, ...m.removedNodes].some((node) => node instanceof Element && (node.matches("select") || node.querySelector("select"))))) scan();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function parseJobs(doc) {
		if (!doc.querySelector("#ContentPlaceHolder1_txtSearch")) throw new Error("Search session unavailable");
		const table = doc.querySelector("#ContentPlaceHolder1_gvJobNo");
		if (!table) return [];
		const headers = Array.from(table.querySelectorAll("th"), (th) => th.textContent?.trim().toLowerCase());
		const exporter = headers.indexOf("exportername");
		const sb = headers.indexOf("sb no");
		return Array.from(table.rows).flatMap((row) => {
			const job = row.querySelector(".jobnomenu")?.textContent?.trim();
			if (!job || !row.querySelector("a[href*=\"Select$\"]")) return [];
			return [{
				job,
				exporter: row.cells[exporter]?.textContent?.trim() ?? "",
				sb: row.cells[sb]?.textContent?.trim() ?? ""
			}];
		});
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
	function handoff() {
		if (!window.name.startsWith(prefix)) return false;
		let data;
		try {
			data = JSON.parse(window.name.slice(17));
		} catch {
			window.name = "";
			return false;
		}
		window.name = "";
		if (typeof data.job !== "string" || !data.job || data.job.length > 100) return false;
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
	async function search(query, signal) {
		const response = await fetch(searchPath, { signal });
		if (!response.ok) throw new Error("Search unavailable");
		const doc = new DOMParser().parseFromString(await response.text(), "text/html");
		const form = doc.querySelector("form");
		if (!form || !doc.querySelector("#ContentPlaceHolder1_txtSearch")) throw new Error("Search session unavailable");
		const jobs = new Map();
		let partial = false;
		for (const [field] of fields) {
			const data = new FormData(form);
			data.set("ctl00$ContentPlaceHolder1$ddlsearch", field);
			data.set("ctl00$ContentPlaceHolder1$txtSearch", query);
			data.set("ctl00$ContentPlaceHolder1$btnSearch", "Search");
			const result = await fetch(searchPath, {
				method: "POST",
				body: new URLSearchParams(data),
				signal
			});
			if (!result.ok) throw new Error("Search unavailable");
			const page = new DOMParser().parseFromString(await result.text(), "text/html");
			for (const job of parseJobs(page)) jobs.set(job.job, job);
			const table = page.querySelector("#ContentPlaceHolder1_gvJobNo");
			if (table && Array.from(table.querySelectorAll("a")).some((a) => /Page\$/.test(a.getAttribute("href") ?? ""))) partial = true;
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
		const input = document.createElement("input");
		input.type = "search";
		input.placeholder = "Search job, SB, exporter or consignee";
		input.setAttribute("aria-label", input.placeholder);
		input.autocomplete = "off";
		const results = document.createElement("div");
		results.className = "bic-job-results";
		results.hidden = true;
		results.setAttribute("aria-live", "polite");
		box.append(input, results);
		const more = document.createElement("button");
		more.type = "button";
		more.className = "bic-job-more";
		more.textContent = "Other search options";
		label.before(box, more);
		const original = [
			label,
			select.closest(".bd-wrapper") ?? select,
			native,
			button
		];
		original.forEach((element) => {
			element.hidden = true;
		});
		more.addEventListener("click", () => {
			const show = original[0]?.hidden;
			original.forEach((element) => {
				element.hidden = !show;
			});
			more.textContent = show ? "Hide other options" : "Other search options";
		});
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
		input.addEventListener("input", () => {
			clearTimeout(timer);
			controller?.abort();
			const current = ++generation;
			const query = input.value.trim();
			if (query.length < 2) {
				results.hidden = true;
				return;
			}
			message("Searching…");
			timer = setTimeout(() => {
				controller = new AbortController();
				search(query, controller.signal).then(({ jobs, partial }) => {
					if (current !== generation) return;
					results.replaceChildren();
					if (!jobs.length) {
						message("No matching jobs found.");
						return;
					}
					for (const job of jobs) {
						const row = document.createElement("div");
						row.className = "bic-job-result";
						const info = document.createElement("div");
						const title = document.createElement("strong");
						title.textContent = job.job;
						const details = document.createElement("small");
						details.textContent = [job.exporter, job.sb && `SB ${job.sb}`].filter(Boolean).join(" · ");
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
					if (partial) {
						const note = document.createElement("div");
						note.className = "bic-job-message";
						note.textContent = "Showing the first page for each search field. Refine your search for more results.";
						results.append(note);
					}
					results.hidden = false;
				}).catch((error) => {
					if (current === generation && !(error instanceof DOMException && error.name === "AbortError")) message("Search failed. Check your session and try again.");
				});
			}, 500);
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Escape") results.hidden = true;
			if (event.key === "Enter") event.preventDefault();
		});
		input.addEventListener("focus", () => {
			if (input.value.trim().length >= 2 && results.childNodes.length) results.hidden = false;
		});
		document.addEventListener("pointerdown", (event) => {
			if (!box.contains(event.target)) results.hidden = true;
		});
	}
	function installProductUi() {
		if (!/\/frmEProductMainPage\.aspx$/i.test(location.pathname)) return;
		const style = document.createElement("style");
		style.textContent = `
    .bic-product-table td{padding-top:4px;padding-bottom:4px}
    .bic-product-table tr:hover td,.bic-product-table tr:focus-within td{box-shadow:inset 0 0 0 999px #4079a21a}
    .bic-product-table a:focus-visible,.bic-product-table input:focus-visible{outline:2px solid #217d72;outline-offset:1px}
  `;
		document.head.append(style);
		const titled = new WeakSet();
		const showValue = (event) => {
			const field = event.target;
			if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.id.includes("tbProduct_") || field instanceof HTMLInputElement && field.type !== "text" || field.hasAttribute("title") && !titled.has(field)) return;
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
				const headings = [...table.querySelectorAll("th")].filter((cell) => cell.closest("table") === table).map((cell) => cell.textContent?.trim().toLowerCase());
				if (headings.includes("pro des") && headings.includes("ritc no")) table.classList.add("bic-product-table");
			});
		};
		scan();
		new MutationObserver((mutations) => {
			if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node instanceof Element && (node.matches("table, th") || node.querySelector("table, th"))))) scan();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	installJobSearch();
	installDropdowns();
	installDates();
	installDbk();
	installProductUi();
})();
