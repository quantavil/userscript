// ==UserScript==
// @name         ♟Super-chess-Bot
// @namespace    http://tampermonkey.net/
// @version      10.0.0
// @author       quantavil
// @description  Local Stockfish analysis and move automation for Chess.com computer games
// @license      GPL-3.0-or-later
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @match        https://www.chess.com/play/computer*
// @match        https://www.chess.com/game/*
// @match        https://www.chess.com/play/online*
// @resource     stockfish.js    https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.js
// @resource     stockfish.wasm  https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.wasm
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        unsafeWindow
// ==/UserScript==

(function() {
	"use strict";
	var pieceNames = {
		q: "queen",
		r: "rook",
		b: "bishop",
		n: "knight"
	};
	function pieceFromToken(token) {
		const value = token.toLowerCase();
		if (value === "q" || value === "r" || value === "b" || value === "n") return value;
		if (/^[wb][qrbn]$/.test(value)) return value[1];
		return Object.entries(pieceNames).find(([, name]) => name === value)?.[0] ?? null;
	}
	function promotionPieceFromLabel(label) {
		if (typeof label !== "string") return null;
		const tokens = label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
		const pieces = new Set(tokens.map(pieceFromToken).filter((piece) => piece !== null));
		return pieces.size === 1 ? pieces.values().next().value ?? null : null;
	}
	function findPromotionOption(options, requested) {
		const piece = promotionPieceFromLabel(requested);
		if (!piece) return null;
		for (const option of options) {
			const className = typeof option.className === "string" ? option.className : option.className?.baseVal;
			if ([
				option.dataset?.piece,
				option.dataset?.pieceType,
				option.dataset?.testElement,
				option.getAttribute?.("data-piece"),
				option.getAttribute?.("data-piece-type"),
				option.getAttribute?.("data-test-element"),
				option.getAttribute?.("aria-label"),
				option.getAttribute?.("title"),
				className,
				option.textContent
			].some((label) => promotionPieceFromLabel(label) === piece)) return option;
		}
		return null;
	}
	function jsonStringifyReplacer(_, value) {
		if (typeof value === "bigint") return value.toString();
		return value;
	}
	var Cached = class {
		constructor(getter) {
			this._getter = getter;
			this._value = void 0;
		}
		get value() {
			const getter = this._getter;
			if (getter !== void 0) {
				this._value = getter();
				this._getter = void 0;
			}
			return this._value;
		}
	};
	function cached(getter) {
		return new Cached(getter);
	}
	function nullish(input) {
		return input === null || input === void 0;
	}
	function cleanRegex(source) {
		const start = source.startsWith("^") ? 1 : 0;
		const end = source.endsWith("$") ? source.length - 1 : source.length;
		return source.slice(start, end);
	}
	function assignProp(target, prop, value) {
		Object.defineProperty(target, prop, {
			value,
			writable: true,
			enumerable: true,
			configurable: true
		});
	}
	var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
	function isObject(data) {
		return typeof data === "object" && data !== null && !Array.isArray(data);
	}
	function escapeRegex(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	function clone(inst, def, params) {
		const cl = new inst._zod.constr(def ?? inst._zod.def);
		if (!def || params?.parent) cl._zod.parent = inst;
		return cl;
	}
	function normalizeParams(_params) {
		const params = _params;
		if (!params) return {};
		if (typeof params === "string") return { error: () => params };
		if (params?.message !== void 0) {
			if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
			params.error = params.message;
		}
		delete params.message;
		if (typeof params.error === "string") return {
			...params,
			error: () => params.error
		};
		return params;
	}
	function optionalKeys(shape) {
		return Object.keys(shape).filter((k) => {
			return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
		});
	}
	var NUMBER_FORMAT_RANGES = (() => ({
		safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
		int32: [-2147483648, 2147483647],
		uint32: [0, 4294967295],
		float32: [-34028234663852886e22, 34028234663852886e22],
		float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
	}))();
	function aborted(x, startIndex = 0) {
		if (x.aborted === true) return true;
		for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
		return false;
	}
	function explicitlyAborted(x, startIndex = 0) {
		if (x.aborted === true) return true;
		for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
		return false;
	}
	function prefixIssues(path, issues) {
		return issues.map((iss) => {
			var _a;
			(_a = iss).path ?? (_a.path = []);
			iss.path.unshift(path);
			return iss;
		});
	}
	function unwrapMessage(message) {
		return typeof message === "string" ? message : message?.message;
	}
	function attachSchema(issues, start, inst) {
		var _a;
		for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
	}
	function finalizeIssue(iss, ctx, config) {
		var _a;
		const traits = iss.inst?._zod?.traits;
		if (traits?.has("$ZodType")) {
			if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
			else iss.schema = iss.inst;
		}
		const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
		const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
		const full = {};
		for (const k of Object.keys(iss)) {
			if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__") continue;
			full[k] = iss[k];
		}
		full.path ?? (full.path = []);
		full.message = message;
		if (ctx?.reportInput) full.input = iss.input;
		return full;
	}
	var highSurrogate = /[\uD800-\uDBFF]/;
	function codePointLength(str) {
		const units = str.length;
		if (!highSurrogate.test(str)) return units;
		let count = units;
		for (let i = 0; i < units - 1; i++) if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
			count--;
			i++;
		}
		return count;
	}
	function getLengthableOrigin(input) {
		if (Array.isArray(input)) return "array";
		if (typeof input === "string") return "string";
		return "unknown";
	}
	function members(proto, table) {
		for (const key in table) {
			const desc = Object.getOwnPropertyDescriptor(table, key);
			if (desc.get) Object.defineProperty(proto, key, {
				...desc,
				enumerable: false
			});
			else defineBound(proto, key, desc.value);
		}
	}
	function own(inst, key, value, enumerable = true) {
		Object.defineProperty(inst, key, {
			configurable: true,
			writable: true,
			enumerable,
			value
		});
		return value;
	}
	function hide(inst, key, value) {
		return own(inst, key, value, false);
	}
	function defineBound(proto, key, fn) {
		Object.defineProperty(proto, key, {
			configurable: true,
			get() {
				return this == null ? fn : own(this, key, fn.bind(this));
			},
			set(value) {
				own(this, key, value);
			}
		});
	}
	function claim(inst, sentinel) {
		const proto = Object.getPrototypeOf(inst);
		return sentinel in proto ? void 0 : proto;
	}
	var installing;
	var broke = false;
	var breaker = {
		configurable: true,
		get() {
			broke = true;
		}
	};
	function defineLazyInternal(inst, key, compute) {
		const proto = Object.getPrototypeOf(inst._zod);
		if (key in proto && installing !== inst._zod) {
			installing = void 0;
			return;
		}
		installing = inst._zod;
		Object.defineProperty(proto, key, {
			configurable: true,
			get() {
				Object.defineProperty(this, key, breaker);
				const outer = broke;
				broke = false;
				try {
					const value = compute(this);
					if (broke) delete this[key];
					else Object.defineProperty(this, key, {
						configurable: true,
						writable: true,
						value
					});
					broke = broke || outer;
					return value;
				} catch (err) {
					delete this[key];
					broke = broke || outer;
					throw err;
				}
			},
			set(value) {
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					value
				});
			}
		});
	}
	function installLazyProp(inst, key, make, enumerable) {
		const proto = claim(inst, key);
		if (!proto) return;
		Object.defineProperty(proto, key, {
			configurable: true,
			get() {
				const desc = {
					configurable: true,
					writable: true,
					enumerable,
					value: void 0
				};
				Object.defineProperty(this, key, desc);
				desc.value = make(this);
				Object.defineProperty(this, key, desc);
				return desc.value;
			},
			set(value) {
				Object.defineProperty(this, key, {
					configurable: true,
					writable: true,
					enumerable,
					value
				});
			}
		});
	}
	var _a;
	var _zodDesc = {
		value: void 0,
		enumerable: false
	};
	var _E = "captureStackTrace" in Error ? Error : null;
	function newError(Definition) {
		const E = _E;
		if (E) {
			const saved = E.stackTraceLimit;
			if (typeof saved === "number") {
				try {
					E.stackTraceLimit = 0;
				} catch {
					_E = null;
					return new Definition();
				}
				try {
					return new Definition();
				} finally {
					E.stackTraceLimit = saved;
				}
			}
		}
		return new Definition();
	}
	function $constructor(name, initializer, proto, params) {
		const zodProto = {};
		function Internals(def) {
			this.def = def;
			this.constr = _;
			this.traits = new Set();
		}
		Internals.prototype = zodProto;
		const protoMembers = proto;
		const initialized = protoMembers && new WeakSet();
		function init(inst, def) {
			if (!inst._zod) {
				_zodDesc.value = new Internals(def);
				try {
					Object.defineProperty(inst, "_zod", _zodDesc);
				} finally {
					_zodDesc.value = void 0;
				}
			} else if (inst._zod.traits.has(name)) return;
			inst._zod.traits.add(name);
			initializer(inst, def);
			if (initialized) {
				const own = Object.getPrototypeOf(inst);
				const ctorProto = inst._zod.constr.prototype;
				let up = own;
				while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
				const target = up ?? own;
				if (!initialized.has(target)) {
					initialized.add(target);
					members(target, protoMembers);
				}
			}
			const proto = _.prototype;
			for (const k in proto) {
				if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
				if (!(k in inst)) inst[k] = proto[k].bind(inst);
			}
		}
		const Parent = params?.Parent ?? Object;
		class Definition extends Parent {}
		Object.defineProperty(Definition, "name", { value: name });
		function _(def) {
			const inst = params?.Parent ? newError(Definition) : this;
			init(inst, def);
			const deferred = inst._zod.deferred;
			if (deferred) {
				for (const fn of deferred) fn();
				inst._zod.deferred = void 0;
			}
			const pp = globalThis.__zod_globalConfig?.postProcessor;
			if (pp) pp(inst);
			return inst;
		}
		Object.defineProperty(_, "init", { value: init });
		Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
			if (params?.Parent && inst instanceof params.Parent) return true;
			return inst?._zod?.traits?.has(name);
		} });
		Object.defineProperty(_, "name", { value: name });
		return _;
	}
	var $ZodAsyncError = class extends Error {
		constructor() {
			super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
		}
	};
	(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
	var globalConfig = globalThis.__zod_globalConfig;
	function config(newConfig) {
		if (newConfig) Object.assign(globalConfig, newConfig);
		return globalConfig;
	}
	function _getMessage() {
		const internals = this._zod;
		internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
		return internals.message;
	}
	function _setMessage(value) {
		this._zod.message = value;
	}
	var _messageDesc = {
		get: _getMessage,
		set: _setMessage,
		enumerable: true,
		configurable: true
	};
	var _issuesDesc = {
		value: void 0,
		enumerable: false
	};
	var _installedToString = new WeakSet([Object.prototype, Error.prototype]);
	var initializer = (inst, def) => {
		inst.name = "$ZodError";
		_issuesDesc.value = def;
		Object.defineProperty(inst, "issues", _issuesDesc);
		_issuesDesc.value = void 0;
		Object.defineProperty(inst, "message", _messageDesc);
		const proto = Object.getPrototypeOf(inst);
		if (!_installedToString.has(proto)) {
			_installedToString.add(proto);
			Object.defineProperty(proto, "toString", {
				configurable: true,
				enumerable: false,
				get() {
					const value = () => this.message;
					Object.defineProperty(this, "toString", {
						value,
						configurable: true,
						writable: true
					});
					return value;
				},
				set(value) {
					Object.defineProperty(this, "toString", {
						value,
						configurable: true,
						writable: true
					});
				}
			});
		}
	};
	$constructor("$ZodError", initializer);
	var $ZodRealError = $constructor("$ZodError", initializer, void 0, { Parent: Error });
	var _parse = (_Err) => {
		const fn = (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee ?? fn);
				throw e;
			}
			return result.value;
		};
		return fn;
	};
	var parse = _parse($ZodRealError);
	var _parseAsync = (_Err) => {
		const fn = async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee ?? fn);
				throw e;
			}
			return result.value;
		};
		return fn;
	};
	var parseAsync = _parseAsync($ZodRealError);
	var _safeParse = (_Err) => (schema, value, _ctx) => {
		const ctx = _ctx ? {
			..._ctx,
			async: false
		} : { async: false };
		const result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) throw new $ZodAsyncError();
		return result.issues.length ? failure(_Err, result.issues, ctx) : {
			success: true,
			data: result.value
		};
	};
	var safeParse = _safeParse($ZodRealError);
	function failure(Err, issues, ctx) {
		let error;
		return {
			success: false,
			get error() {
				if (!error) {
					error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
					issues = void 0;
					ctx = void 0;
				}
				return error;
			},
			set error(e) {
				error = e;
				issues = void 0;
				ctx = void 0;
			}
		};
	}
	var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
		const ctx = _ctx ? {
			..._ctx,
			async: true
		} : { async: true };
		let result = schema._zod.run({
			value,
			issues: []
		}, ctx);
		if (result instanceof Promise) result = await result;
		return result.issues.length ? failure(_Err, result.issues, ctx) : {
			success: true,
			data: result.value
		};
	};
	var safeParseAsync = _safeParseAsync($ZodRealError);
	var anyString = /^[\s\S]{0,}$/;
	var number$1 = /^-?\d+(?:\.\d+)?$/;
	var $ZodCheck = $constructor("$ZodCheck", (inst, def) => {
		var _a;
		inst._zod ?? (inst._zod = {});
		inst._zod.def = def;
		(_a = inst._zod).onattach ?? (_a.onattach = []);
	});
	var _whenHasLength = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	};
	var numericOriginMap = {
		number: "number",
		bigint: "bigint",
		object: "date"
	};
	var $ZodCheckLessThan = $constructor("$ZodCheckLessThan", (inst, def) => {
		$ZodCheck.init(inst, def);
		const origin = numericOriginMap[typeof def.value];
		inst._zod.check = (payload) => {
			if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
			payload.issues.push({
				origin: numericOriginMap[typeof payload.value] ?? origin,
				code: "too_big",
				maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
				input: payload.value,
				inclusive: def.inclusive,
				inst,
				continue: !def.abort
			});
		};
	});
	var $ZodCheckGreaterThan = $constructor("$ZodCheckGreaterThan", (inst, def) => {
		$ZodCheck.init(inst, def);
		const origin = numericOriginMap[typeof def.value];
		inst._zod.check = (payload) => {
			if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
			payload.issues.push({
				origin: numericOriginMap[typeof payload.value] ?? origin,
				code: "too_small",
				minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
				input: payload.value,
				inclusive: def.inclusive,
				inst,
				continue: !def.abort
			});
		};
	});
	var $ZodCheckNumberFormat = $constructor("$ZodCheckNumberFormat", (inst, def) => {
		$ZodCheck.init(inst, def);
		def.format = def.format || "float64";
		const isInt = def.format?.includes("int");
		const origin = isInt ? "int" : "number";
		const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
		inst._zod.check = (payload) => {
			const input = payload.value;
			if (isInt) {
				if (!Number.isInteger(input)) {
					payload.issues.push({
						expected: origin,
						format: def.format,
						code: "invalid_type",
						continue: false,
						input,
						inst
					});
					return;
				}
				if (!Number.isSafeInteger(input)) {
					if (input > 0) payload.issues.push({
						input,
						code: "too_big",
						maximum: Number.MAX_SAFE_INTEGER,
						note: "Integers must be within the safe integer range.",
						inst,
						origin,
						inclusive: true,
						continue: !def.abort
					});
					else payload.issues.push({
						input,
						code: "too_small",
						minimum: Number.MIN_SAFE_INTEGER,
						note: "Integers must be within the safe integer range.",
						inst,
						origin,
						inclusive: true,
						continue: !def.abort
					});
					return;
				}
			}
			if (input < minimum) payload.issues.push({
				origin: "number",
				input,
				code: "too_small",
				minimum,
				inclusive: true,
				inst,
				continue: !def.abort
			});
			if (input > maximum) payload.issues.push({
				origin: "number",
				input,
				code: "too_big",
				maximum,
				inclusive: true,
				inst,
				continue: !def.abort
			});
		};
	});
	var $ZodCheckMaxLength = $constructor("$ZodCheckMaxLength", (inst, def) => {
		var _a;
		$ZodCheck.init(inst, def);
		(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
		inst._zod.check = (payload) => {
			const input = payload.value;
			const units = input.length;
			if ((typeof input === "string" && units > def.maximum ? codePointLength(input) : units) <= def.maximum) return;
			const origin = getLengthableOrigin(input);
			payload.issues.push({
				origin,
				code: "too_big",
				maximum: def.maximum,
				inclusive: true,
				input,
				inst,
				continue: !def.abort
			});
		};
	});
	var version = {
		major: 4,
		minor: 6,
		patch: 5
	};
	var $ZodType = $constructor("$ZodType", (inst, def) => {
		var _a;
		inst ?? (inst = {});
		inst._zod.def = def;
		inst._zod.bag = inst._zod.bag || {};
		inst._zod.version = version;
		const defChecks = inst._zod.def.checks;
		const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
		for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
		if (checks.length === 0) {
			(_a = inst._zod).deferred ?? (_a.deferred = []);
			inst._zod.deferred?.push(() => {
				inst._zod.run = inst._zod.parse;
			});
		} else {
			const runChecks = (payload, checks, ctx) => {
				if (payload.memo) return payload;
				let isAborted = aborted(payload);
				let asyncResult;
				for (const ch of checks) {
					if (ch._zod.def.when) {
						if (explicitlyAborted(payload)) continue;
						if (!ch._zod.def.when(payload)) continue;
					} else if (isAborted) continue;
					const currLen = payload.issues.length;
					const _ = ch._zod.check(payload);
					if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
					if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
						await _;
						if (payload.issues.length === currLen) return;
						attachSchema(payload.issues, currLen, inst);
						if (!isAborted) isAborted = aborted(payload, currLen);
					});
					else {
						if (payload.issues.length === currLen) continue;
						attachSchema(payload.issues, currLen, inst);
						if (!isAborted) isAborted = aborted(payload, currLen);
					}
				}
				if (asyncResult) return asyncResult.then(() => {
					return payload;
				});
				return payload;
			};
			const handleCanaryResult = (canary, payload, ctx) => {
				if (aborted(canary)) {
					canary.aborted = true;
					return canary;
				}
				const checkResult = runChecks(payload, checks, ctx);
				if (checkResult instanceof Promise) {
					if (ctx.async === false) throw new $ZodAsyncError();
					return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
				}
				return inst._zod.parse(checkResult, ctx);
			};
			inst._zod.run = (payload, ctx) => {
				if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
				if (ctx.direction === "backward") {
					const canary = inst._zod.parse({
						value: payload.value,
						issues: []
					}, {
						...ctx,
						skipChecks: true
					});
					if (canary instanceof Promise) return canary.then((canary) => {
						return handleCanaryResult(canary, payload, ctx);
					});
					return handleCanaryResult(canary, payload, ctx);
				}
				const result = inst._zod.parse(payload, ctx);
				if (result instanceof Promise) {
					if (ctx.async === false) throw new $ZodAsyncError();
					return result.then((result) => runChecks(result, checks, ctx));
				}
				return runChecks(result, checks, ctx);
			};
		}
	}, {
		get "~standard"() {
			return hide(this, "~standard", standardProps(this));
		},
		set "~standard"(value) {
			own(this, "~standard", value);
		}
	});
	var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
	async function validateAsync(inst, value) {
		const ctx = { async: true };
		return toStandardResult(await inst._zod.run({
			value,
			issues: []
		}, ctx), ctx);
	}
	function standardProps(inst) {
		return {
			validate: (value) => {
				const ctx = { async: false };
				try {
					const r = inst._zod.run({
						value,
						issues: []
					}, ctx);
					if (!(r instanceof Promise)) return toStandardResult(r, ctx);
				} catch (_) {}
				return validateAsync(inst, value);
			},
			vendor: "zod",
			version: 1
		};
	}
	var $ZodString = $constructor("$ZodString", (inst, def) => {
		$ZodType.init(inst, def);
		inst._zod.pattern = def.pattern ?? anyString;
		inst._zod.parse = (payload, _) => {
			if (def.coerce) try {
				payload.value = String(payload.value);
			} catch (_) {}
			if (typeof payload.value === "string") return payload;
			payload.issues.push({
				expected: "string",
				code: "invalid_type",
				input: payload.value,
				inst
			});
			return payload;
		};
	});
	var $ZodNumber = $constructor("$ZodNumber", (inst, def) => {
		$ZodType.init(inst, def);
		inst._zod.pattern = number$1;
		inst._zod.parse = (payload, _ctx) => {
			if (def.coerce) try {
				payload.value = Number(payload.value);
			} catch (_) {}
			const input = payload.value;
			if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
			const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
			payload.issues.push({
				expected: "number",
				code: "invalid_type",
				input,
				inst,
				...received ? { received } : {}
			});
			return payload;
		};
	});
	var $ZodNumberFormat = $constructor("$ZodNumberFormat", (inst, def) => {
		$ZodCheckNumberFormat.init(inst, def);
		$ZodNumber.init(inst, def);
	});
	function handlePropertyResult(result, final, key, input, optin, optout) {
		const isPresent = key in input;
		const isOptionalOut = optout === "optional";
		if (!isPresent && isOptionalOut && optin === "optional") return;
		if (result.issues.length) {
			if (optin !== void 0 && isOptionalOut && !isPresent) return;
			final.issues.push(...prefixIssues(key, result.issues));
		}
		if (!isPresent && optin === void 0) {
			if (!result.issues.length) final.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: void 0,
				path: [key]
			});
			return;
		}
		if (result.value === void 0) {
			if (isPresent || optin === "defaulted" && !isOptionalOut) final.value[key] = void 0;
		} else final.value[key] = result.value;
	}
	var NO_SYMBOL_KEYS = [];
	function normalizeDef(def) {
		const keys = Object.keys(def.shape);
		const ownSymbols = Object.getOwnPropertySymbols(def.shape);
		const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
		const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
		for (const k of allKeys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
		const okeys = optionalKeys(def.shape);
		return {
			...def,
			allKeys,
			symbolKeys,
			keySet: new Set(keys),
			numKeys: keys.length,
			optionalKeys: new Set(okeys)
		};
	}
	function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
		const unrecognized = [];
		const keySet = def.keySet;
		const _catchall = def.catchall._zod;
		const t = _catchall.def.type;
		const optin = _catchall.optin;
		const optout = _catchall.optout;
		let seen = 0;
		for (const key in input) {
			if (abortEarly && payload.issues.length !== seen) {
				if (aborted(payload, seen)) break;
				seen = payload.issues.length;
			}
			if (keySet.has(key)) continue;
			if (key === "__proto__") {
				if (t === "never") unrecognized.push(key);
				continue;
			}
			if (t === "never") {
				unrecognized.push(key);
				continue;
			}
			const r = _catchall.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
			else handlePropertyResult(r, payload, key, input, optin, optout);
		}
		if (unrecognized.length) payload.issues.push({
			code: "unrecognized_keys",
			keys: unrecognized,
			input,
			inst,
			continue: true
		});
		if (!proms.length) return payload;
		return Promise.all(proms).then(() => {
			return payload;
		});
	}
	var $ZodObject = $constructor("$ZodObject", (inst, def) => {
		$ZodType.init(inst, def);
		const desc = Object.getOwnPropertyDescriptor(def, "shape");
		const sh = desc?.get ? desc.get.raw : def.shape ?? {};
		if (sh) {
			const get = () => {
				const newSh = { ...sh };
				Object.defineProperty(def, "shape", { value: newSh });
				get.raw = newSh;
				return newSh;
			};
			get.raw = sh;
			Object.defineProperty(def, "shape", { get });
		}
		const _normalized = cached(() => normalizeDef(def));
		defineLazyInternal(inst, "propValues", (zod) => {
			const shape = zod.def.shape;
			const propValues = {};
			for (const key in shape) {
				const field = shape[key]._zod;
				if (field.values) {
					if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, new Set());
					for (const v of field.values) propValues[key].add(v);
					if (field.optin !== void 0) propValues[key].add(void 0);
				}
			}
			return propValues;
		});
		const isObject$2 = isObject;
		const catchall = def.catchall;
		let value;
		const memo = globalConfig.memoizer;
		memo?.attach(inst);
		inst._zod.parse = (payload, ctx) => {
			value ?? (value = _normalized.value);
			const input = payload.value;
			if (!isObject$2(input)) {
				payload.issues.push({
					expected: "object",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			}
			payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
			const proms = [];
			const shape = value.shape;
			const abortEarly = ctx?.abortEarly;
			let seen = payload.issues.length;
			for (const key of value.allKeys) {
				if (abortEarly && payload.issues.length !== seen) {
					if (aborted(payload, seen)) break;
					seen = payload.issues.length;
				}
				if (key === "__proto__") continue;
				const el = shape[key];
				const optin = el._zod.optin;
				const optout = el._zod.optout;
				const r = el._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
				else handlePropertyResult(r, payload, key, input, optin, optout);
			}
			if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
			return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
		};
	});
	function handleUnionResults(results, final, inst, ctx) {
		for (const result of results) if (result.issues.length === 0) {
			final.value = result.value;
			return final;
		}
		const nonaborted = results.filter((r) => !aborted(r));
		if (nonaborted.length === 1) {
			final.value = nonaborted[0].value;
			return nonaborted[0];
		}
		final.issues.push({
			code: "invalid_union",
			input: final.value,
			inst,
			errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
		});
		return final;
	}
	var $ZodUnion = $constructor("$ZodUnion", (inst, def) => {
		$ZodType.init(inst, def);
		defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
		defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
		defineLazyInternal(inst, "values", (zod) => {
			if (zod.def.options.every((o) => o._zod.values)) return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
		});
		defineLazyInternal(inst, "pattern", (zod) => {
			if (zod.def.options.every((o) => o._zod.pattern)) {
				const patterns = zod.def.options.map((o) => o._zod.pattern);
				return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
			}
		});
		const first = def.options.length === 1 ? def.options[0]._zod.run : null;
		inst._zod.parse = (payload, ctx) => {
			if (first) return first(payload, ctx);
			let async = false;
			const results = [];
			for (const option of def.options) {
				const result = option._zod.run({
					value: payload.value,
					issues: []
				}, ctx);
				if (result instanceof Promise) {
					results.push(result);
					async = true;
				} else {
					if (result.issues.length === 0) return result;
					results.push(result);
				}
			}
			if (!async) return handleUnionResults(results, payload, inst, ctx);
			return Promise.all(results).then((results) => {
				return handleUnionResults(results, payload, inst, ctx);
			});
		};
	});
	var $ZodLiteral = $constructor("$ZodLiteral", (inst, def) => {
		$ZodType.init(inst, def);
		const values = new Set(def.values);
		inst._zod.values = values;
		defineLazyInternal(inst, "pattern", (zod) => {
			const vals = zod.def.values;
			return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
		});
		inst._zod.parse = (payload, _ctx) => {
			const input = payload.value;
			if (values.has(input)) return payload;
			payload.issues.push({
				code: "invalid_value",
				values: def.values,
				input,
				inst
			});
			return payload;
		};
	});
	function handleOptionalResult(payload, result) {
		payload.value = result.issues.length ? void 0 : result.value;
		return payload;
	}
	var $ZodOptional = $constructor("$ZodOptional", (inst, def) => {
		$ZodType.init(inst, def);
		defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
		inst._zod.optout = "optional";
		defineLazyInternal(inst, "values", (zod) => {
			const values = zod.def.innerType._zod.values;
			return values ? new Set([...values, void 0]) : void 0;
		});
		defineLazyInternal(inst, "pattern", (zod) => {
			const pattern = zod.def.innerType._zod.pattern;
			return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
		});
		inst._zod.parse = (payload, ctx) => {
			if (payload.value === void 0) {
				if (def.innerType._zod.optin !== "defaulted") return payload;
				const result = def.innerType._zod.run({
					value: payload.value,
					issues: []
				}, ctx);
				if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
				return handleOptionalResult(payload, result);
			}
			return def.innerType._zod.run(payload, ctx);
		};
	});
	var $ZodNullable = $constructor("$ZodNullable", (inst, def) => {
		$ZodType.init(inst, def);
		defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
		defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
		defineLazyInternal(inst, "pattern", (zod) => {
			const pattern = zod.def.innerType._zod.pattern;
			return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
		});
		defineLazyInternal(inst, "values", (zod) => {
			return zod.def.innerType._zod.values ? new Set([...zod.def.innerType._zod.values, null]) : void 0;
		});
		inst._zod.parse = (payload, ctx) => {
			if (payload.value === null) return payload;
			return def.innerType._zod.run(payload, ctx);
		};
	});
	function snapshotChecks(def) {
		if (def.checks) def.checks = [...def.checks];
		return def;
	}
	function _string(Class, params) {
		return new Class(snapshotChecks({
			type: "string",
			...normalizeParams(params)
		}));
	}
	function _number(Class, params) {
		return new Class(snapshotChecks({
			type: "number",
			checks: [],
			...normalizeParams(params)
		}));
	}
	function _int(Class, params) {
		return new Class({
			type: "number",
			check: "number_format",
			abort: false,
			format: "safeint",
			...normalizeParams(params)
		});
	}
	function _lte(value, params) {
		return new $ZodCheckLessThan({
			check: "less_than",
			...normalizeParams(params),
			value,
			inclusive: true
		});
	}
	function _gte(value, params) {
		return new $ZodCheckGreaterThan({
			check: "greater_than",
			...normalizeParams(params),
			value,
			inclusive: true
		});
	}
	function _maxLength(maximum, params) {
		return new $ZodCheckMaxLength({
			check: "max_length",
			...normalizeParams(params),
			maximum
		});
	}
	var ZodMiniType = $constructor("ZodMiniType", (inst, def) => {
		if (!inst._zod) throw new Error("Uninitialized schema in ZodMiniType.");
		$ZodType.init(inst, def);
		inst.def = def;
		inst.type = def.type;
	}, {
		get with() {
			return this.check;
		},
		set with(value) {
			own(this, "with", value);
		},
		parse(data, params) {
			return parse(this, data, params, { callee: this.parse });
		},
		parseAsync(data, params) {
			return parseAsync(this, data, params, { callee: this.parseAsync });
		},
		safeParse(data, params) {
			return safeParse(this, data, params);
		},
		safeParseAsync(data, params) {
			return safeParseAsync(this, data, params);
		},
		check(...checks) {
			const def = this.def;
			return this.clone({
				...def,
				checks: [...def.checks ?? [], ...checks.map((ch) => typeof ch === "function" ? { _zod: {
					check: ch,
					def: { check: "custom" },
					onattach: []
				} } : ch)]
			}, { parent: true });
		},
		clone(_def, params) {
			return clone(this, _def, params);
		},
		brand() {
			return this;
		},
		register(reg, meta) {
			reg.add(this, meta);
			return this;
		},
		apply(fn, ...args) {
			return args.length === 0 ? fn(this) : fn(this, ...args);
		}
	});
	var ZodMiniString = $constructor("ZodMiniString", (inst, def) => {
		$ZodString.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function string(params) {
		return _string(ZodMiniString, params);
	}
	var ZodMiniNumber = $constructor("ZodMiniNumber", (inst, def) => {
		$ZodNumber.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function number(params) {
		return _number(ZodMiniNumber, params);
	}
	var ZodMiniNumberFormat = $constructor("ZodMiniNumberFormat", (inst, def) => {
		$ZodNumberFormat.init(inst, def);
		ZodMiniNumber.init(inst, def);
	});
	function int(params) {
		return _int(ZodMiniNumberFormat, params);
	}
	var ZodMiniObject = $constructor("ZodMiniObject", (inst, def) => {
		$ZodObject.init(inst, def);
		ZodMiniType.init(inst, def);
		installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
	});
	function object(shape, params) {
		return new ZodMiniObject({
			type: "object",
			shape: shape ?? {},
			...normalizeParams(params)
		});
	}
	var ZodMiniUnion = $constructor("ZodMiniUnion", (inst, def) => {
		$ZodUnion.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function union(options, params) {
		return new ZodMiniUnion({
			type: "union",
			options,
			...normalizeParams(params)
		});
	}
	var ZodMiniLiteral = $constructor("ZodMiniLiteral", (inst, def) => {
		$ZodLiteral.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function literal(value, params) {
		return new ZodMiniLiteral({
			type: "literal",
			values: Array.isArray(value) ? value : [value],
			...normalizeParams(params)
		});
	}
	var ZodMiniOptional = $constructor("ZodMiniOptional", (inst, def) => {
		$ZodOptional.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function optional(innerType) {
		return new ZodMiniOptional({
			type: "optional",
			innerType
		});
	}
	var ZodMiniNullable = $constructor("ZodMiniNullable", (inst, def) => {
		$ZodNullable.init(inst, def);
		ZodMiniType.init(inst, def);
	});
	function nullable(innerType) {
		return new ZodMiniNullable({
			type: "nullable",
			innerType
		});
	}
	var DEFAULT_SETTINGS = {
		hackEnabled: 0,
		botPower: 30,
		moveTime: 100,
		autoMove: 1,
		ponderEnabled: 1,
		autoRematch: 0,
		moveMethod: "click",
		menuPosition: null
	};
	var flagSchema = union([literal(0), literal(1)]);
	var integerInRange = (minimum, maximum) => number().check(int(), _gte(minimum), _lte(maximum));
	var positionSchema = object({
		top: string().check(_maxLength(32)),
		left: string().check(_maxLength(32))
	});
	var savedSettingsSchema = object({
		hackEnabled: optional(flagSchema),
		botPower: optional(integerInRange(1, 30)),
		moveTime: optional(integerInRange(100, 1e4)),
		autoMove: optional(flagSchema),
		ponderEnabled: optional(flagSchema),
		premoveEnabled: optional(flagSchema),
		autoRematch: optional(flagSchema),
		moveMethod: optional(union([literal("click"), literal("drag")])),
		menuPosition: optional(nullable(positionSchema))
	});
	function loadSettings(serialized) {
		if (serialized === null) return { ...DEFAULT_SETTINGS };
		let saved;
		try {
			saved = JSON.parse(serialized);
		} catch {
			return { ...DEFAULT_SETTINGS };
		}
		const result = safeParse(savedSettingsSchema, saved);
		if (!result.success) return { ...DEFAULT_SETTINGS };
		const { premoveEnabled, ...currentSettings } = result.data;
		return {
			...DEFAULT_SETTINGS,
			...currentSettings,
			ponderEnabled: currentSettings.ponderEnabled ?? premoveEnabled ?? DEFAULT_SETTINGS.ponderEnabled,
			hackEnabled: 0
		};
	}
	function debounce(fn, wait = 150) {
		let t = null;
		return (...args) => {
			if (t !== null) clearTimeout(t);
			t = setTimeout(() => fn(...args), wait);
		};
	}
	var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	async function waitForElement(selector, timeout = 15e3) {
		return new Promise((resolve, reject) => {
			const existing = document.querySelector(selector);
			if (existing) return resolve(existing);
			let timeoutId;
			const obs = new MutationObserver(() => {
				const el = document.querySelector(selector);
				if (el) {
					clearTimeout(timeoutId);
					obs.disconnect();
					resolve(el);
				}
			});
			obs.observe(document.body, {
				childList: true,
				subtree: true
			});
			timeoutId = setTimeout(() => {
				obs.disconnect();
				reject(new Error(`Element ${selector} not found within ${timeout}ms`));
			}, timeout);
		});
	}
	function scoreToDisplay(score) {
		if (typeof score?.mate === "number" && score.mate !== 0) return `M${score.mate}`;
		if (typeof score?.cp === "number") return (score.cp / 100).toFixed(2);
		return "-";
	}
	var BotState = {
		hackEnabled: 0,
		botPower: 30,
		moveTime: 100,
		autoMove: 1,
		currentEvaluation: "-",
		bestMove: "-",
		principalVariation: "-",
		statusInfo: "Ready",
		recoveryAction: null,
		ponderEnabled: 1,
		autoRematch: 0,
		moveMethod: "click"
	};
	var Settings = {
		save: debounce(() => {
			try {
				const menuWrap = document.querySelector("#menuWrap");
				const settings = {
					hackEnabled: BotState.hackEnabled,
					botPower: BotState.botPower,
					moveTime: BotState.moveTime,
					autoMove: BotState.autoMove,
					ponderEnabled: BotState.ponderEnabled,
					autoRematch: BotState.autoRematch,
					moveMethod: BotState.moveMethod,
					menuPosition: menuWrap ? {
						top: menuWrap.style.top,
						left: menuWrap.style.left
					} : null
				};
				localStorage.setItem("gabibot_settings", JSON.stringify(settings));
			} catch (e) {
				console.warn("Failed to save settings:", e);
			}
		}, 200),
		load() {
			try {
				const saved = localStorage.getItem("gabibot_settings");
				if (!saved) {
					BotState.hackEnabled = 0;
					return null;
				}
				const settings = loadSettings(saved);
				Object.assign(BotState, settings, { hackEnabled: 0 });
				return settings;
			} catch {
				Object.assign(BotState, DEFAULT_SETTINGS, { hackEnabled: 0 });
				return { ...DEFAULT_SETTINGS };
			}
		}
	};
	var BOARD_SELECTOR = "wc-chess-board, chess-board, .board";
	function pageDocument() {
		return typeof unsafeWindow === "undefined" ? document : unsafeWindow.document;
	}
	function hasGameApi(board) {
		return typeof board.game?.getFEN === "function";
	}
	function isVisibleBoard(board) {
		try {
			const style = (board.ownerDocument?.defaultView)?.getComputedStyle(board) ?? (typeof getComputedStyle === "function" ? getComputedStyle(board) : null);
			if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") return false;
			if (typeof board.getClientRects === "function" && board.getClientRects().length === 0) return false;
			const rect = board.getBoundingClientRect?.();
			return !rect || rect.width > 0 && rect.height > 0;
		} catch {
			return false;
		}
	}
	function boardArea(board) {
		const rect = board.getBoundingClientRect?.();
		return rect ? rect.width * rect.height : 0;
	}
	var cachedGame = null;
	var cachedGameTimestamp = 0;
	function getBoard(doc = pageDocument()) {
		const visible = (typeof doc.querySelectorAll === "function" ? Array.from(doc.querySelectorAll(BOARD_SELECTOR)) : [doc.querySelector(BOARD_SELECTOR)].filter((board) => !!board)).filter(isVisibleBoard);
		visible.sort((a, b) => Number(hasGameApi(b)) - Number(hasGameApi(a)) || boardArea(b) - boardArea(a));
		return visible[0] ?? null;
	}
	var getGame = () => {
		const now = Date.now();
		if (cachedGame && now - cachedGameTimestamp < 100) return cachedGame;
		cachedGame = getBoard(pageDocument())?.game || null;
		cachedGameTimestamp = now;
		return cachedGame;
	};
	var getFen = (game) => {
		try {
			return game?.getFEN ? game.getFEN() : null;
		} catch {
			return null;
		}
	};
	var getPlayerColor = (game) => {
		try {
			return game?.getPlayingAs?.() === 2 ? "b" : "w";
		} catch {
			return "w";
		}
	};
	var getSideToMove = (game) => {
		const fen = getFen(game);
		return fen ? fen.split(" ")[1] || null : null;
	};
	var isPlayersTurn = (game) => {
		return getPlayerColor(game) === getSideToMove(game);
	};
	var pa = () => getGame()?.getPlayingAs?.() ?? 1;
	function isBoardFlipped() {
		const el = getBoard();
		let flipped = false;
		try {
			const attr = el?.getAttribute?.("orientation");
			if (attr === "black") flipped = true;
			else if (attr === "white") flipped = false;
			else if (el?.classList?.contains("flipped")) flipped = true;
			else if (getGame()?.getPlayingAs?.() === 2) flipped = true;
		} catch {}
		return flipped;
	}
	function invalidateGameCache() {
		cachedGame = null;
		cachedGameTimestamp = 0;
	}
	var boardCtx = null;
	var domObserver = null;
	var moveRevision = 0;
	var moveExecutionActive = false;
	var pendingMoveConfirmations = new Set();
	var boardInputListeners = new Set();
	var boardMoveObserver = null;
	var mutationListeners = new Set();
	var unsubscribeGame = null;
	var watcherRevision = 0;
	var moveWatcherRequested = false;
	function clearMoveWatcher() {
		watcherRevision++;
		unsubscribeGame?.();
		unsubscribeGame = null;
		boardMoveObserver?.disconnect();
		boardMoveObserver = null;
	}
	function isBotOwnedNode(node) {
		const candidate = node;
		return !!(typeof candidate.closest === "function" ? candidate : candidate.parentElement)?.closest?.("[data-gabibot-overlay], #menuWrap");
	}
	function isBotOwnedMutation(record) {
		if (isBotOwnedNode(record.target)) return true;
		if (record.type !== "childList") return false;
		const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
		return changedNodes.length > 0 && changedNodes.every(isBotOwnedNode);
	}
	function notifyMutationListeners() {
		invalidateGameCache();
		for (const callback of [...mutationListeners]) try {
			callback();
		} catch (error) {
			console.error("GabiBot: Board mutation listener failed.", error);
		}
	}
	function attachMoveWatcher() {
		if (!moveWatcherRequested) return;
		const board = getBoard();
		if (!board) return;
		const game = getGame();
		const revision = watcherRevision;
		const notify = () => {
			if (revision !== watcherRevision) return;
			notifyMutationListeners();
		};
		if (typeof game?.on === "function" && typeof game?.off === "function") {
			game.on("Move", notify);
			const off = game.off.bind(game);
			unsubscribeGame = () => off("Move", notify);
		}
		let queued = false;
		boardMoveObserver = new MutationObserver((records) => {
			if (!records.some((record) => !isBotOwnedMutation(record))) return;
			if (queued) return;
			queued = true;
			queueMicrotask(() => {
				queued = false;
				notify();
			});
		});
		boardMoveObserver.observe(board, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [
				"class",
				"style",
				"data-piece"
			]
		});
	}
	function attachToBoard(boardEl) {
		invalidateGameCache();
		detachFromBoard();
		clearMoveWatcher();
		if (!boardEl) return;
		if (getComputedStyle(boardEl).position === "static") boardEl.style.position = "relative";
		const drawingBoard = document.createElement("canvas");
		drawingBoard.id = "arrowCanvas";
		drawingBoard.setAttribute("data-gabibot-overlay", "");
		drawingBoard.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:100;";
		const ctx = drawingBoard.getContext("2d");
		if (!ctx) {
			console.error("GabiBot: Failed to get 2D context.");
			return;
		}
		const evalBarWrap = document.createElement("div");
		evalBarWrap.id = "evaluationBarWrap";
		evalBarWrap.setAttribute("data-gabibot-overlay", "");
		evalBarWrap.style.cssText = "position:absolute;height:100%;width:14px;left:-22px;top:0;background:#111;z-index:50;overflow:hidden;pointer-events:none;border-radius:4px;";
		const whiteBar = document.createElement("div");
		whiteBar.id = "evaluationBarWhite";
		whiteBar.style.cssText = "position:absolute;top:0;left:0;right:0;height:50%;background:#f0d9b5;";
		const blackBar = document.createElement("div");
		blackBar.id = "evaluationBarBlack";
		blackBar.style.cssText = "position:absolute;bottom:0;left:0;right:0;height:50%;background:#111;";
		evalBarWrap.appendChild(whiteBar);
		evalBarWrap.appendChild(blackBar);
		boardEl.appendChild(evalBarWrap);
		boardEl.appendChild(drawingBoard);
		const resizeCanvas = () => {
			const rect = boardEl.getBoundingClientRect();
			drawingBoard.width = rect.width;
			drawingBoard.height = rect.height;
		};
		resizeCanvas();
		const ro = new ResizeObserver(resizeCanvas);
		ro.observe(boardEl);
		const cancelPendingOnUserAction = (event) => {
			if (!event.isTrusted) return;
			cancelPendingMove();
			boardInputListeners.forEach((listener) => {
				listener();
			});
		};
		const userInputEvents = typeof PointerEvent === "undefined" ? ["mousedown", "touchstart"] : ["pointerdown"];
		for (const eventName of userInputEvents) boardEl.addEventListener(eventName, cancelPendingOnUserAction, true);
		boardCtx = {
			boardEl,
			drawingBoard,
			ctx,
			evalBarWrap,
			detachListeners() {
				for (const eventName of userInputEvents) try {
					boardEl.removeEventListener(eventName, cancelPendingOnUserAction, true);
				} catch {}
				try {
					ro.disconnect();
				} catch {}
				try {
					drawingBoard.remove();
				} catch {}
				try {
					evalBarWrap.remove();
				} catch {}
			}
		};
		if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
		attachMoveWatcher();
	}
	function detachFromBoard() {
		if (!boardCtx) return;
		try {
			boardCtx.detachListeners();
		} catch {}
		boardCtx = null;
	}
	function startDomBoardWatcher() {
		if (domObserver) try {
			domObserver.disconnect();
		} catch {}
		const syncBoard = debounce(() => {
			const newBoard = getBoard();
			if (!newBoard) {
				if (boardCtx) attachToBoard(null);
				else clearMoveWatcher();
				return;
			}
			if (!boardCtx || boardCtx.boardEl !== newBoard) attachToBoard(newBoard);
		}, 200);
		domObserver = new MutationObserver((records) => {
			if (records.some((record) => !isBotOwnedMutation(record))) syncBoard();
		});
		domObserver.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [
				"class",
				"style",
				"hidden"
			]
		});
	}
	function onBoardMutation(cb) {
		mutationListeners.add(cb);
		return () => mutationListeners.delete(cb);
	}
	function onBoardInput(cb) {
		boardInputListeners.add(cb);
		return () => boardInputListeners.delete(cb);
	}
	function startMoveWatcher() {
		moveWatcherRequested = true;
		clearMoveWatcher();
		attachMoveWatcher();
	}
	function stopMoveWatcher() {
		moveWatcherRequested = false;
		clearMoveWatcher();
	}
	function clearArrows() {
		if (!boardCtx) return;
		const { drawingBoard, ctx } = boardCtx;
		ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height);
	}
	function getSquareCenterClientXY(square) {
		if (!boardCtx || !square || square.length < 2) return null;
		const file = "abcdefgh".indexOf(square[0]);
		const rank = parseInt(square[1], 10);
		if (file < 0 || Number.isNaN(rank)) return null;
		const rect = boardCtx.boardEl.getBoundingClientRect();
		const size = Math.min(rect.width, rect.height);
		const tile = size / 8;
		const offsetX = rect.left + (rect.width - size) / 2;
		const offsetY = rect.top + (rect.height - size) / 2;
		let x = file, y = 8 - rank;
		if (isBoardFlipped()) {
			x = 7 - x;
			y = 7 - y;
		}
		const result = {
			x: offsetX + (x + .5) * tile,
			y: offsetY + (y + .5) * tile
		};
		if (Number.isNaN(result.x) || Number.isNaN(result.y)) {
			console.warn(`GabiBot: Invalid coordinates for square ${square}. Board size: ${rect.width}x${rect.height}`);
			return null;
		}
		return result;
	}
	function getSquareCenterCanvasXY(square) {
		if (!boardCtx || !square || square.length < 2) return null;
		const p = getSquareCenterClientXY(square);
		if (!p) return null;
		const rect = boardCtx.boardEl.getBoundingClientRect();
		return {
			x: p.x - rect.left,
			y: p.y - rect.top
		};
	}
	function drawArrow(uciFrom, uciTo, color, thickness) {
		if (!boardCtx || !uciFrom || !uciTo || uciFrom.length < 2 || uciTo.length < 2) return;
		const { drawingBoard, ctx } = boardCtx;
		const a = getSquareCenterCanvasXY(uciFrom);
		const b = getSquareCenterCanvasXY(uciTo);
		if (!a || !b) return;
		const tile = Math.min(drawingBoard.width, drawingBoard.height) / 8;
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.lineWidth = thickness;
		ctx.strokeStyle = color;
		ctx.lineCap = "round";
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(a.x, a.y, tile / 7, 0, 2 * Math.PI);
		ctx.fillStyle = color.replace("0.7", "0.3");
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(b.x, b.y, tile / 5, 0, 2 * Math.PI);
		ctx.fillStyle = color.replace("0.7", "0.5");
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	function dispatchPointerOrMouse(el, type, opts, usePointer) {
		if (!el) return;
		if (usePointer) try {
			el.dispatchEvent(new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				composed: true,
				...opts
			}));
			return;
		} catch {}
		el.dispatchEvent(new MouseEvent(type.replace("pointer", "mouse"), {
			bubbles: true,
			cancelable: true,
			composed: true,
			...opts
		}));
	}
	function getTargetAt(x, y) {
		return document.elementFromPoint(x, y) || boardCtx?.boardEl || document.body;
	}
	function getMoveCoordinates(from, to) {
		const a = getSquareCenterClientXY(from);
		const b = getSquareCenterClientXY(to);
		if (!a || !b) return null;
		return {
			a,
			b
		};
	}
	function createPointerOpts(x, y, buttons) {
		return {
			clientX: x,
			clientY: y,
			buttons,
			pointerId: 1,
			pointerType: "mouse",
			isPrimary: true,
			bubbles: true,
			cancelable: true,
			composed: true
		};
	}
	function pressAt(el, x, y, usePointer) {
		dispatchPointerOrMouse(el, usePointer ? "pointerdown" : "mousedown", createPointerOpts(x, y, 1), usePointer);
	}
	function releaseAt(el, x, y, usePointer) {
		dispatchPointerOrMouse(el, usePointer ? "pointerup" : "mouseup", createPointerOpts(x, y, 0), usePointer);
	}
	function clickAt(el, x, y) {
		el.dispatchEvent(new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			composed: true,
			clientX: x,
			clientY: y
		}));
	}
	async function simulateClickMove(from, to, guard = () => true) {
		const coords = getMoveCoordinates(from, to);
		if (!coords || !guard()) return false;
		const { a, b } = coords;
		const usePointer = !!window.PointerEvent;
		const startEl = getTargetAt(a.x, a.y);
		const endEl = getTargetAt(b.x, b.y);
		pressAt(startEl, a.x, a.y, usePointer);
		await sleep(2);
		releaseAt(startEl, a.x, a.y, usePointer);
		clickAt(startEl, a.x, a.y);
		await sleep(4);
		if (!guard()) return false;
		pressAt(endEl, b.x, b.y, usePointer);
		await sleep(2);
		releaseAt(endEl, b.x, b.y, usePointer);
		clickAt(endEl, b.x, b.y);
		return true;
	}
	async function simulateDragMove(from, to, guard = () => true) {
		const coords = getMoveCoordinates(from, to);
		if (!coords || !guard()) return false;
		const { a, b } = coords;
		const usePointer = !!window.PointerEvent;
		const startEl = getTargetAt(a.x, a.y);
		pressAt(startEl, a.x, a.y, usePointer);
		await sleep(4);
		const steps = 2;
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			const mx = a.x + (b.x - a.x) * t;
			const my = a.y + (b.y - a.y) * t;
			const stepTarget = getTargetAt(mx, my);
			const moveOpts = createPointerOpts(mx, my, 1);
			dispatchPointerOrMouse(stepTarget, usePointer ? "pointermove" : "mousemove", moveOpts, usePointer);
			await sleep(4);
		}
		if (!guard()) {
			releaseAt(startEl, a.x, a.y, usePointer);
			return false;
		}
		releaseAt(getTargetAt(b.x, b.y), b.x, b.y, usePointer);
		return true;
	}
	async function waitForFenChange(prevFen, timeout = 1e3, expectedFen, signal) {
		return new Promise((resolve) => {
			if (signal?.aborted) {
				resolve(false);
				return;
			}
			let done = false;
			let unsubscribe = () => {};
			let frame;
			let timer;
			const finish = (accepted) => {
				if (done) return;
				done = true;
				unsubscribe();
				signal?.removeEventListener("abort", onAbort);
				if (timer) clearTimeout(timer);
				if (frame !== void 0) cancelAnimationFrame(frame);
				resolve(accepted);
			};
			const check = () => {
				const fen = getFen(getGame());
				if (fen && fen !== prevFen) finish(!expectedFen || fen.split(" ").filter((_, i) => i !== 3).join(" ") === expectedFen.split(" ").filter((_, i) => i !== 3).join(" "));
			};
			const onAbort = () => {
				check();
				if (!done) finish(false);
			};
			signal?.addEventListener("abort", onAbort, { once: true });
			unsubscribe = onBoardMutation(check);
			timer = setTimeout(() => finish(false), timeout);
			const poll = () => {
				check();
				if (!done) frame = requestAnimationFrame(poll);
			};
			poll();
		});
	}
	async function maybeSelectPromotion(prefer = "q", guard = () => true) {
		if (!/^[qrbn]$/i.test(prefer)) return false;
		const getCandidates = () => Array.from(document.querySelectorAll("[data-test-element*=\"promotion\"], [class*=\"promotion\"] [class*=\"piece\"], [class*=\"promotion\"] button, .promotion-piece")).filter((el) => {
			const option = el;
			if (option.getClientRects().length === 0) return false;
			const style = getComputedStyle(option);
			return style.display !== "none" && style.visibility !== "hidden";
		});
		const tryClick = async (el) => {
			try {
				const rect = el.getBoundingClientRect();
				if (!rect.width || !rect.height) return false;
				const x = rect.left + rect.width / 2;
				const y = rect.top + rect.height / 2;
				const target = getTargetAt(x, y);
				if (target !== el && !el.contains(target)) return false;
				const usePointer = !!window.PointerEvent;
				pressAt(target, x, y, usePointer);
				await sleep(2);
				if (!guard()) {
					releaseAt(target, x, y, usePointer);
					return false;
				}
				releaseAt(target, x, y, usePointer);
				clickAt(target, x, y);
				return true;
			} catch {
				return false;
			}
		};
		const start = Date.now();
		while (Date.now() - start < 1e3) {
			if (!guard()) return false;
			const match = findPromotionOption(getCandidates(), prefer);
			if (match && guard() && await tryClick(match)) return true;
			await sleep(60);
		}
		return false;
	}
	function cancelPendingMove() {
		moveRevision++;
		for (const controller of pendingMoveConfirmations) controller.abort();
		pendingMoveConfirmations.clear();
	}
	function getMoveRevision() {
		return moveRevision;
	}
	function setStyleIfChanged(element, property, value) {
		if (element.style[property] !== value) element.style[property] = value;
	}
	async function executeMove(from, to, analysisFen, promotionChar, _depth, _tickCallback, expectedFen) {
		if (moveExecutionActive) return false;
		const revision = moveRevision;
		const game = getGame();
		if (!BotState.hackEnabled || !BotState.autoMove || !game || !isPlayersTurn(game) || getFen(game) !== analysisFen) return false;
		moveExecutionActive = true;
		const confirmationController = new AbortController();
		pendingMoveConfirmations.add(confirmationController);
		const guard = () => revision === moveRevision && !!BotState.hackEnabled && !!BotState.autoMove && getFen(getGame()) === analysisFen;
		let confirmation;
		try {
			BotState.statusInfo = "Submitting move...";
			BotState.onUpdateDisplay?.(pa());
			confirmation = waitForFenChange(analysisFen, 1e3, expectedFen, confirmationController.signal);
			if (!(BotState.moveMethod === "drag" ? await simulateDragMove(from, to, guard) : await simulateClickMove(from, to, guard))) return false;
			if (promotionChar && guard() && !await maybeSelectPromotion(promotionChar, guard)) return false;
			const accepted = await confirmation;
			if (revision === moveRevision) {
				BotState.statusInfo = accepted ? "Move confirmed" : "Move not confirmed; waiting for position change";
				BotState.onUpdateDisplay?.(pa());
			}
			return accepted;
		} finally {
			confirmationController.abort();
			pendingMoveConfirmations.delete(confirmationController);
			moveExecutionActive = false;
			if (revision === moveRevision && BotState.statusInfo === "Submitting move...") {
				BotState.statusInfo = "Move input failed";
				BotState.onUpdateDisplay?.(pa());
			}
		}
	}
	function updateEvaluationBar(evaluation, _playingAs) {
		if (!boardCtx) return;
		const whiteBar = boardCtx.evalBarWrap.querySelector("#evaluationBarWhite");
		const blackBar = boardCtx.evalBarWrap.querySelector("#evaluationBarBlack");
		if (!whiteBar || !blackBar) return;
		let score = 0;
		if (typeof evaluation === "string") {
			if (evaluation === "-" || evaluation === "Error") {
				setStyleIfChanged(whiteBar, "height", "50%");
				setStyleIfChanged(blackBar, "height", "50%");
				return;
			}
			if (evaluation.includes("M")) score = parseInt(evaluation.replace("M", "").replace("+", ""), 10) > 0 ? 10 : -10;
			else score = parseFloat(evaluation);
		} else score = evaluation;
		if (Number.isNaN(score)) {
			setStyleIfChanged(whiteBar, "height", "50%");
			setStyleIfChanged(blackBar, "height", "50%");
			return;
		}
		const maxScore = 5;
		const whitePercent = 50 + Math.max(-5, Math.min(maxScore, score)) / maxScore * 50;
		const blackPercent = 100 - whitePercent;
		setStyleIfChanged(whiteBar, "height", `${whitePercent}%`);
		setStyleIfChanged(blackBar, "height", `${blackPercent}%`);
		const ourEval = getPlayerColor(getGame()) === "w" ? score : -score;
		if (ourEval < -2) setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(255, 100, 100, 0.5)");
		else if (ourEval > 2) setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(100, 255, 100, 0.5)");
		else setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(255, 255, 255, 0.2)");
	}
	var _Result = class {
		unwrap(ok, err) {
			const r = this._chain((value) => Result.ok(ok ? ok(value) : value), (error) => err ? Result.ok(err(error)) : Result.err(error));
			if (r.isErr) throw r.error;
			return r.value;
		}
		map(ok, err) {
			return this._chain((value) => Result.ok(ok(value)), (error) => Result.err(err ? err(error) : error));
		}
		chain(ok, err) {
			return this._chain(ok, err !== null && err !== void 0 ? err : ((error) => Result.err(error)));
		}
	};
	var _Ok = class extends _Result {
		constructor(value) {
			super();
			this.value = value;
			this.isOk = true;
			this.isErr = false;
		}
		_chain(ok, _err) {
			return ok(this.value);
		}
	};
	var _Err = class extends _Result {
		constructor(error) {
			super();
			this.error = error;
			this.isOk = false;
			this.isErr = true;
		}
		_chain(_ok, err) {
			return err(this.error);
		}
	};
	var Result;
	(function(Result) {
		function ok(value) {
			return new _Ok(value);
		}
		Result.ok = ok;
		function err(error) {
			return new _Err(error || new Error());
		}
		Result.err = err;
		function all(obj) {
			if (Array.isArray(obj)) {
				const res = [];
				for (let i = 0; i < obj.length; i++) {
					const item = obj[i];
					if (item.isErr) return item;
					res.push(item.value);
				}
				return Result.ok(res);
			}
			const res = {};
			const keys = Object.keys(obj);
			for (let i = 0; i < keys.length; i++) {
				const item = obj[keys[i]];
				if (item.isErr) return item;
				res[keys[i]] = item.value;
			}
			return Result.ok(res);
		}
		Result.all = all;
	})(Result || (Result = {}));
	var popcnt32 = (n) => {
		n = n - (n >>> 1 & 1431655765);
		n = (n & 858993459) + (n >>> 2 & 858993459);
		return Math.imul(n + (n >>> 4) & 252645135, 16843009) >> 24;
	};
	var bswap32 = (n) => {
		n = n >>> 8 & 16711935 | (n & 16711935) << 8;
		return n >>> 16 & 65535 | (n & 65535) << 16;
	};
	var rbit32 = (n) => {
		n = n >>> 1 & 1431655765 | (n & 1431655765) << 1;
		n = n >>> 2 & 858993459 | (n & 858993459) << 2;
		n = n >>> 4 & 252645135 | (n & 252645135) << 4;
		return bswap32(n);
	};
	var SquareSet = class SquareSet {
		constructor(lo, hi) {
			this.lo = lo | 0;
			this.hi = hi | 0;
		}
		static fromSquare(square) {
			return square >= 32 ? new SquareSet(0, 1 << square - 32) : new SquareSet(1 << square, 0);
		}
		static fromRank(rank) {
			return new SquareSet(255, 0).shl64(8 * rank);
		}
		static fromFile(file) {
			return new SquareSet(16843009 << file, 16843009 << file);
		}
		static empty() {
			return new SquareSet(0, 0);
		}
		static full() {
			return new SquareSet(4294967295, 4294967295);
		}
		static corners() {
			return new SquareSet(129, 2164260864);
		}
		static center() {
			return new SquareSet(402653184, 24);
		}
		static backranks() {
			return new SquareSet(255, 4278190080);
		}
		static backrank(color) {
			return color === "white" ? new SquareSet(255, 0) : new SquareSet(0, 4278190080);
		}
		static lightSquares() {
			return new SquareSet(1437226410, 1437226410);
		}
		static darkSquares() {
			return new SquareSet(2857740885, 2857740885);
		}
		complement() {
			return new SquareSet(~this.lo, ~this.hi);
		}
		xor(other) {
			return new SquareSet(this.lo ^ other.lo, this.hi ^ other.hi);
		}
		union(other) {
			return new SquareSet(this.lo | other.lo, this.hi | other.hi);
		}
		intersect(other) {
			return new SquareSet(this.lo & other.lo, this.hi & other.hi);
		}
		diff(other) {
			return new SquareSet(this.lo & ~other.lo, this.hi & ~other.hi);
		}
		intersects(other) {
			return this.intersect(other).nonEmpty();
		}
		isDisjoint(other) {
			return this.intersect(other).isEmpty();
		}
		supersetOf(other) {
			return other.diff(this).isEmpty();
		}
		subsetOf(other) {
			return this.diff(other).isEmpty();
		}
		shr64(shift) {
			if (shift >= 64) return SquareSet.empty();
			if (shift >= 32) return new SquareSet(this.hi >>> shift - 32, 0);
			if (shift > 0) return new SquareSet(this.lo >>> shift ^ this.hi << 32 - shift, this.hi >>> shift);
			return this;
		}
		shl64(shift) {
			if (shift >= 64) return SquareSet.empty();
			if (shift >= 32) return new SquareSet(0, this.lo << shift - 32);
			if (shift > 0) return new SquareSet(this.lo << shift, this.hi << shift ^ this.lo >>> 32 - shift);
			return this;
		}
		bswap64() {
			return new SquareSet(bswap32(this.hi), bswap32(this.lo));
		}
		rbit64() {
			return new SquareSet(rbit32(this.hi), rbit32(this.lo));
		}
		minus64(other) {
			const lo = this.lo - other.lo;
			const c = (lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1) >>> 31;
			return new SquareSet(lo, this.hi - (other.hi + c));
		}
		equals(other) {
			return this.lo === other.lo && this.hi === other.hi;
		}
		size() {
			return popcnt32(this.lo) + popcnt32(this.hi);
		}
		isEmpty() {
			return this.lo === 0 && this.hi === 0;
		}
		nonEmpty() {
			return this.lo !== 0 || this.hi !== 0;
		}
		has(square) {
			return (square >= 32 ? this.hi & 1 << square - 32 : this.lo & 1 << square) !== 0;
		}
		set(square, on) {
			return on ? this.with(square) : this.without(square);
		}
		with(square) {
			return square >= 32 ? new SquareSet(this.lo, this.hi | 1 << square - 32) : new SquareSet(this.lo | 1 << square, this.hi);
		}
		without(square) {
			return square >= 32 ? new SquareSet(this.lo, this.hi & ~(1 << square - 32)) : new SquareSet(this.lo & ~(1 << square), this.hi);
		}
		toggle(square) {
			return square >= 32 ? new SquareSet(this.lo, this.hi ^ 1 << square - 32) : new SquareSet(this.lo ^ 1 << square, this.hi);
		}
		last() {
			if (this.hi !== 0) return 63 - Math.clz32(this.hi);
			if (this.lo !== 0) return 31 - Math.clz32(this.lo);
		}
		first() {
			if (this.lo !== 0) return 31 - Math.clz32(this.lo & -this.lo);
			if (this.hi !== 0) return 63 - Math.clz32(this.hi & -this.hi);
		}
		withoutFirst() {
			if (this.lo !== 0) return new SquareSet(this.lo & this.lo - 1, this.hi);
			return new SquareSet(0, this.hi & this.hi - 1);
		}
		moreThanOne() {
			return this.hi !== 0 && this.lo !== 0 || (this.lo & this.lo - 1) !== 0 || (this.hi & this.hi - 1) !== 0;
		}
		singleSquare() {
			return this.moreThanOne() ? void 0 : this.last();
		}
		*[Symbol.iterator]() {
			let lo = this.lo;
			let hi = this.hi;
			while (lo !== 0) {
				const idx = 31 - Math.clz32(lo & -lo);
				lo ^= 1 << idx;
				yield idx;
			}
			while (hi !== 0) {
				const idx = 31 - Math.clz32(hi & -hi);
				hi ^= 1 << idx;
				yield 32 + idx;
			}
		}
		*reversed() {
			let lo = this.lo;
			let hi = this.hi;
			while (hi !== 0) {
				const idx = 31 - Math.clz32(hi);
				hi ^= 1 << idx;
				yield 32 + idx;
			}
			while (lo !== 0) {
				const idx = 31 - Math.clz32(lo);
				lo ^= 1 << idx;
				yield idx;
			}
		}
	};
	var FILE_NAMES = [
		"a",
		"b",
		"c",
		"d",
		"e",
		"f",
		"g",
		"h"
	];
	var RANK_NAMES = [
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8"
	];
	var COLORS = ["white", "black"];
	var ROLES = [
		"pawn",
		"knight",
		"bishop",
		"rook",
		"queen",
		"king"
	];
	var CASTLING_SIDES = ["a", "h"];
	var isDrop = (v) => "role" in v;
	var defined = (v) => v !== void 0;
	var opposite = (color) => color === "white" ? "black" : "white";
	var squareRank = (square) => square >> 3;
	var squareFile = (square) => square & 7;
	var squareFromCoords = (file, rank) => 0 <= file && file < 8 && 0 <= rank && rank < 8 ? file + 8 * rank : void 0;
	var roleToChar = (role) => {
		switch (role) {
			case "pawn": return "p";
			case "knight": return "n";
			case "bishop": return "b";
			case "rook": return "r";
			case "queen": return "q";
			case "king": return "k";
		}
	};
	function charToRole(ch) {
		switch (ch.toLowerCase()) {
			case "p": return "pawn";
			case "n": return "knight";
			case "b": return "bishop";
			case "r": return "rook";
			case "q": return "queen";
			case "k": return "king";
			default: return;
		}
	}
	function parseSquare(str) {
		if (str.length !== 2) return;
		return squareFromCoords(str.charCodeAt(0) - "a".charCodeAt(0), str.charCodeAt(1) - "1".charCodeAt(0));
	}
	var makeSquare = (square) => FILE_NAMES[squareFile(square)] + RANK_NAMES[squareRank(square)];
	var parseUci = (str) => {
		if (str[1] === "@" && str.length === 4) {
			const role = charToRole(str[0]);
			const to = parseSquare(str.slice(2));
			if (role && defined(to)) return {
				role,
				to
			};
		} else if (str.length === 4 || str.length === 5) {
			const from = parseSquare(str.slice(0, 2));
			const to = parseSquare(str.slice(2, 4));
			let promotion;
			if (str.length === 5) {
				promotion = charToRole(str[4]);
				if (!promotion) return;
			}
			if (defined(from) && defined(to)) return {
				from,
				to,
				promotion
			};
		}
	};
	var makeUci = (move) => isDrop(move) ? `${roleToChar(move.role).toUpperCase()}@${makeSquare(move.to)}` : makeSquare(move.from) + makeSquare(move.to) + (move.promotion ? roleToChar(move.promotion) : "");
	var kingCastlesTo = (color, side) => color === "white" ? side === "a" ? 2 : 6 : side === "a" ? 58 : 62;
	var rookCastlesTo = (color, side) => color === "white" ? side === "a" ? 3 : 5 : side === "a" ? 59 : 61;
	var computeRange = (square, deltas) => {
		let range = SquareSet.empty();
		for (const delta of deltas) {
			const sq = square + delta;
			if (0 <= sq && sq < 64 && Math.abs(squareFile(square) - squareFile(sq)) <= 2) range = range.with(sq);
		}
		return range;
	};
	var tabulate = (f) => {
		const table = [];
		for (let square = 0; square < 64; square++) table[square] = f(square);
		return table;
	};
	var KING_ATTACKS = tabulate((sq) => computeRange(sq, [
		-9,
		-8,
		-7,
		-1,
		1,
		7,
		8,
		9
	]));
	var KNIGHT_ATTACKS = tabulate((sq) => computeRange(sq, [
		-17,
		-15,
		-10,
		-6,
		6,
		10,
		15,
		17
	]));
	var PAWN_ATTACKS = {
		white: tabulate((sq) => computeRange(sq, [7, 9])),
		black: tabulate((sq) => computeRange(sq, [-7, -9]))
	};
	var kingAttacks = (square) => KING_ATTACKS[square];
	var knightAttacks = (square) => KNIGHT_ATTACKS[square];
	var pawnAttacks = (color, square) => PAWN_ATTACKS[color][square];
	var FILE_RANGE = tabulate((sq) => SquareSet.fromFile(squareFile(sq)).without(sq));
	var RANK_RANGE = tabulate((sq) => SquareSet.fromRank(squareRank(sq)).without(sq));
	var DIAG_RANGE = tabulate((sq) => {
		const diag = new SquareSet(134480385, 2151686160);
		const shift = 8 * (squareRank(sq) - squareFile(sq));
		return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
	});
	var ANTI_DIAG_RANGE = tabulate((sq) => {
		const diag = new SquareSet(270549120, 16909320);
		const shift = 8 * (squareRank(sq) + squareFile(sq) - 7);
		return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
	});
	var hyperbola = (sq, range, occupied) => {
		const o = range.intersect(occupied);
		const fwd = o.minus64(SquareSet.fromSquare(sq));
		const rev = o.bswap64().minus64(SquareSet.fromSquare(56 ^ sq));
		return fwd.xor(rev.bswap64()).intersect(range);
	};
	var rankAttacks = (sq, occupied) => {
		const range = RANK_RANGE[sq];
		const o = range.intersect(occupied);
		const fwd = o.minus64(SquareSet.fromSquare(sq));
		const rev = o.rbit64().minus64(SquareSet.fromSquare(63 - sq));
		return fwd.xor(rev.rbit64()).intersect(range);
	};
	var bishopAttacks = (square, occupied) => {
		return hyperbola(square, DIAG_RANGE[square], occupied).xor(hyperbola(square, ANTI_DIAG_RANGE[square], occupied));
	};
	var rookAttacks = (square, occupied) => hyperbola(square, FILE_RANGE[square], occupied).xor(rankAttacks(square, occupied));
	var queenAttacks = (square, occupied) => bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
	var attacks = (piece, square, occupied) => {
		switch (piece.role) {
			case "pawn": return pawnAttacks(piece.color, square);
			case "knight": return knightAttacks(square);
			case "bishop": return bishopAttacks(square, occupied);
			case "rook": return rookAttacks(square, occupied);
			case "queen": return queenAttacks(square, occupied);
			case "king": return kingAttacks(square);
		}
	};
	var ray = (a, b) => {
		const other = SquareSet.fromSquare(b);
		if (RANK_RANGE[a].intersects(other)) return RANK_RANGE[a].with(a);
		if (ANTI_DIAG_RANGE[a].intersects(other)) return ANTI_DIAG_RANGE[a].with(a);
		if (DIAG_RANGE[a].intersects(other)) return DIAG_RANGE[a].with(a);
		if (FILE_RANGE[a].intersects(other)) return FILE_RANGE[a].with(a);
		return SquareSet.empty();
	};
	var between = (a, b) => ray(a, b).intersect(SquareSet.full().shl64(a).xor(SquareSet.full().shl64(b))).withoutFirst();
	var Board = class Board {
		constructor() {}
		static default() {
			const board = new Board();
			board.reset();
			return board;
		}
		reset() {
			this.occupied = new SquareSet(65535, 4294901760);
			this.promoted = SquareSet.empty();
			this.white = new SquareSet(65535, 0);
			this.black = new SquareSet(0, 4294901760);
			this.pawn = new SquareSet(65280, 16711680);
			this.knight = new SquareSet(66, 1107296256);
			this.bishop = new SquareSet(36, 603979776);
			this.rook = new SquareSet(129, 2164260864);
			this.queen = new SquareSet(8, 134217728);
			this.king = new SquareSet(16, 268435456);
		}
		static empty() {
			const board = new Board();
			board.clear();
			return board;
		}
		clear() {
			this.occupied = SquareSet.empty();
			this.promoted = SquareSet.empty();
			for (const color of COLORS) this[color] = SquareSet.empty();
			for (const role of ROLES) this[role] = SquareSet.empty();
		}
		clone() {
			const board = new Board();
			board.occupied = this.occupied;
			board.promoted = this.promoted;
			for (const color of COLORS) board[color] = this[color];
			for (const role of ROLES) board[role] = this[role];
			return board;
		}
		getColor(square) {
			if (this.white.has(square)) return "white";
			if (this.black.has(square)) return "black";
		}
		getRole(square) {
			for (const role of ROLES) if (this[role].has(square)) return role;
		}
		get(square) {
			const color = this.getColor(square);
			if (!color) return;
			return {
				color,
				role: this.getRole(square),
				promoted: this.promoted.has(square)
			};
		}
		take(square) {
			const piece = this.get(square);
			if (piece) {
				this.occupied = this.occupied.without(square);
				this[piece.color] = this[piece.color].without(square);
				this[piece.role] = this[piece.role].without(square);
				if (piece.promoted) this.promoted = this.promoted.without(square);
			}
			return piece;
		}
		set(square, piece) {
			const old = this.take(square);
			this.occupied = this.occupied.with(square);
			this[piece.color] = this[piece.color].with(square);
			this[piece.role] = this[piece.role].with(square);
			if (piece.promoted) this.promoted = this.promoted.with(square);
			return old;
		}
		has(square) {
			return this.occupied.has(square);
		}
		*[Symbol.iterator]() {
			for (const square of this.occupied) yield [square, this.get(square)];
		}
		pieces(color, role) {
			return this[color].intersect(this[role]);
		}
		rooksAndQueens() {
			return this.rook.union(this.queen);
		}
		bishopsAndQueens() {
			return this.bishop.union(this.queen);
		}
		steppers() {
			return this.knight.union(this.pawn).union(this.king);
		}
		sliders() {
			return this.bishop.union(this.rook).union(this.queen);
		}
		kingOf(color) {
			return this.pieces(color, "king").singleSquare();
		}
	};
	var IllegalSetup;
	(function(IllegalSetup) {
		IllegalSetup["Empty"] = "ERR_EMPTY";
		IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
		IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
		IllegalSetup["Kings"] = "ERR_KINGS";
		IllegalSetup["Variant"] = "ERR_VARIANT";
	})(IllegalSetup || (IllegalSetup = {}));
	var PositionError = class extends Error {};
	var attacksTo = (square, attacker, board, occupied) => board[attacker].intersect(rookAttacks(square, occupied).intersect(board.rooksAndQueens()).union(bishopAttacks(square, occupied).intersect(board.bishopsAndQueens())).union(knightAttacks(square).intersect(board.knight)).union(kingAttacks(square).intersect(board.king)).union(pawnAttacks(opposite(attacker), square).intersect(board.pawn)));
	var Castles = class Castles {
		constructor() {}
		static default() {
			const castles = new Castles();
			castles.castlingRights = SquareSet.corners();
			castles.rook = {
				white: {
					a: 0,
					h: 7
				},
				black: {
					a: 56,
					h: 63
				}
			};
			castles.path = {
				white: {
					a: new SquareSet(14, 0),
					h: new SquareSet(96, 0)
				},
				black: {
					a: new SquareSet(0, 234881024),
					h: new SquareSet(0, 1610612736)
				}
			};
			return castles;
		}
		static empty() {
			const castles = new Castles();
			castles.castlingRights = SquareSet.empty();
			castles.rook = {
				white: {
					a: void 0,
					h: void 0
				},
				black: {
					a: void 0,
					h: void 0
				}
			};
			castles.path = {
				white: {
					a: SquareSet.empty(),
					h: SquareSet.empty()
				},
				black: {
					a: SquareSet.empty(),
					h: SquareSet.empty()
				}
			};
			return castles;
		}
		clone() {
			const castles = new Castles();
			castles.castlingRights = this.castlingRights;
			castles.rook = {
				white: {
					a: this.rook.white.a,
					h: this.rook.white.h
				},
				black: {
					a: this.rook.black.a,
					h: this.rook.black.h
				}
			};
			castles.path = {
				white: {
					a: this.path.white.a,
					h: this.path.white.h
				},
				black: {
					a: this.path.black.a,
					h: this.path.black.h
				}
			};
			return castles;
		}
		add(color, side, king, rook) {
			const kingTo = kingCastlesTo(color, side);
			const rookTo = rookCastlesTo(color, side);
			this.castlingRights = this.castlingRights.with(rook);
			this.rook[color][side] = rook;
			this.path[color][side] = between(rook, rookTo).with(rookTo).union(between(king, kingTo).with(kingTo)).without(king).without(rook);
		}
		static fromSetup(setup) {
			const castles = Castles.empty();
			const rooks = setup.castlingRights.intersect(setup.board.rook);
			for (const color of COLORS) {
				const backrank = SquareSet.backrank(color);
				const king = setup.board.kingOf(color);
				if (!defined(king) || !backrank.has(king)) continue;
				const side = rooks.intersect(setup.board[color]).intersect(backrank);
				const aSide = side.first();
				if (defined(aSide) && aSide < king) castles.add(color, "a", king, aSide);
				const hSide = side.last();
				if (defined(hSide) && king < hSide) castles.add(color, "h", king, hSide);
			}
			return castles;
		}
		discardRook(square) {
			if (this.castlingRights.has(square)) {
				this.castlingRights = this.castlingRights.without(square);
				for (const color of COLORS) for (const side of CASTLING_SIDES) if (this.rook[color][side] === square) this.rook[color][side] = void 0;
			}
		}
		discardColor(color) {
			this.castlingRights = this.castlingRights.diff(SquareSet.backrank(color));
			this.rook[color].a = void 0;
			this.rook[color].h = void 0;
		}
	};
	var Position = class {
		constructor(rules) {
			this.rules = rules;
		}
		reset() {
			this.board = Board.default();
			this.pockets = void 0;
			this.turn = "white";
			this.castles = Castles.default();
			this.epSquare = void 0;
			this.remainingChecks = void 0;
			this.halfmoves = 0;
			this.fullmoves = 1;
		}
		setupUnchecked(setup) {
			this.board = setup.board.clone();
			this.board.promoted = SquareSet.empty();
			this.pockets = void 0;
			this.turn = setup.turn;
			this.castles = Castles.fromSetup(setup);
			this.epSquare = validEpSquare(this, setup.epSquare);
			this.remainingChecks = void 0;
			this.halfmoves = setup.halfmoves;
			this.fullmoves = setup.fullmoves;
		}
		kingAttackers(square, attacker, occupied) {
			return attacksTo(square, attacker, this.board, occupied);
		}
		playCaptureAt(square, captured) {
			this.halfmoves = 0;
			if (captured.role === "rook") this.castles.discardRook(square);
			if (this.pockets) this.pockets[opposite(captured.color)][captured.promoted ? "pawn" : captured.role]++;
		}
		ctx() {
			const variantEnd = this.isVariantEnd();
			const king = this.board.kingOf(this.turn);
			if (!defined(king)) return {
				king,
				blockers: SquareSet.empty(),
				checkers: SquareSet.empty(),
				variantEnd,
				mustCapture: false
			};
			const snipers = rookAttacks(king, SquareSet.empty()).intersect(this.board.rooksAndQueens()).union(bishopAttacks(king, SquareSet.empty()).intersect(this.board.bishopsAndQueens())).intersect(this.board[opposite(this.turn)]);
			let blockers = SquareSet.empty();
			for (const sniper of snipers) {
				const b = between(king, sniper).intersect(this.board.occupied);
				if (!b.moreThanOne()) blockers = blockers.union(b);
			}
			const checkers = this.kingAttackers(king, opposite(this.turn), this.board.occupied);
			return {
				king,
				blockers,
				checkers,
				variantEnd,
				mustCapture: false
			};
		}
		clone() {
			var _a, _b;
			const pos = new this.constructor();
			pos.board = this.board.clone();
			pos.pockets = (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone();
			pos.turn = this.turn;
			pos.castles = this.castles.clone();
			pos.epSquare = this.epSquare;
			pos.remainingChecks = (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone();
			pos.halfmoves = this.halfmoves;
			pos.fullmoves = this.fullmoves;
			return pos;
		}
		validate() {
			if (this.board.occupied.isEmpty()) return Result.err(new PositionError(IllegalSetup.Empty));
			if (this.board.king.size() !== 2) return Result.err(new PositionError(IllegalSetup.Kings));
			if (!defined(this.board.kingOf(this.turn))) return Result.err(new PositionError(IllegalSetup.Kings));
			const otherKing = this.board.kingOf(opposite(this.turn));
			if (!defined(otherKing)) return Result.err(new PositionError(IllegalSetup.Kings));
			if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) return Result.err(new PositionError(IllegalSetup.OppositeCheck));
			if (SquareSet.backranks().intersects(this.board.pawn)) return Result.err(new PositionError(IllegalSetup.PawnsOnBackrank));
			return Result.ok(void 0);
		}
		dropDests(_ctx) {
			return SquareSet.empty();
		}
		dests(square, ctx) {
			ctx = ctx || this.ctx();
			if (ctx.variantEnd) return SquareSet.empty();
			const piece = this.board.get(square);
			if (!piece || piece.color !== this.turn) return SquareSet.empty();
			let pseudo, legal;
			if (piece.role === "pawn") {
				pseudo = pawnAttacks(this.turn, square).intersect(this.board[opposite(this.turn)]);
				const delta = this.turn === "white" ? 8 : -8;
				const step = square + delta;
				if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
					pseudo = pseudo.with(step);
					const canDoubleStep = this.turn === "white" ? square < 16 : square >= 48;
					const doubleStep = step + delta;
					if (canDoubleStep && !this.board.occupied.has(doubleStep)) pseudo = pseudo.with(doubleStep);
				}
				if (defined(this.epSquare) && canCaptureEp(this, square, ctx)) legal = SquareSet.fromSquare(this.epSquare);
			} else if (piece.role === "bishop") pseudo = bishopAttacks(square, this.board.occupied);
			else if (piece.role === "knight") pseudo = knightAttacks(square);
			else if (piece.role === "rook") pseudo = rookAttacks(square, this.board.occupied);
			else if (piece.role === "queen") pseudo = queenAttacks(square, this.board.occupied);
			else pseudo = kingAttacks(square);
			pseudo = pseudo.diff(this.board[this.turn]);
			if (defined(ctx.king)) {
				if (piece.role === "king") {
					const occ = this.board.occupied.without(square);
					for (const to of pseudo) if (this.kingAttackers(to, opposite(this.turn), occ).nonEmpty()) pseudo = pseudo.without(to);
					return pseudo.union(castlingDest(this, "a", ctx)).union(castlingDest(this, "h", ctx));
				}
				if (ctx.checkers.nonEmpty()) {
					const checker = ctx.checkers.singleSquare();
					if (!defined(checker)) return SquareSet.empty();
					pseudo = pseudo.intersect(between(checker, ctx.king).with(checker));
				}
				if (ctx.blockers.has(square)) pseudo = pseudo.intersect(ray(square, ctx.king));
			}
			if (legal) pseudo = pseudo.union(legal);
			return pseudo;
		}
		isVariantEnd() {
			return false;
		}
		variantOutcome(_ctx) {}
		hasInsufficientMaterial(color) {
			if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty()) return false;
			if (this.board[color].intersects(this.board.knight)) return this.board[color].size() <= 2 && this.board[opposite(color)].diff(this.board.king).diff(this.board.queen).isEmpty();
			if (this.board[color].intersects(this.board.bishop)) return (!this.board.bishop.intersects(SquareSet.darkSquares()) || !this.board.bishop.intersects(SquareSet.lightSquares())) && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
			return true;
		}
		toSetup() {
			var _a, _b;
			return {
				board: this.board.clone(),
				pockets: (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone(),
				turn: this.turn,
				castlingRights: this.castles.castlingRights,
				epSquare: legalEpSquare(this),
				remainingChecks: (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone(),
				halfmoves: Math.min(this.halfmoves, 150),
				fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999)
			};
		}
		isInsufficientMaterial() {
			return COLORS.every((color) => this.hasInsufficientMaterial(color));
		}
		hasDests(ctx) {
			ctx = ctx || this.ctx();
			for (const square of this.board[this.turn]) if (this.dests(square, ctx).nonEmpty()) return true;
			return this.dropDests(ctx).nonEmpty();
		}
		isLegal(move, ctx) {
			if (isDrop(move)) {
				if (!this.pockets || this.pockets[this.turn][move.role] <= 0) return false;
				if (move.role === "pawn" && SquareSet.backranks().has(move.to)) return false;
				return this.dropDests(ctx).has(move.to);
			} else {
				if (move.promotion === "pawn") return false;
				if (move.promotion === "king" && this.rules !== "antichess") return false;
				if (!!move.promotion !== (this.board.pawn.has(move.from) && SquareSet.backranks().has(move.to))) return false;
				const dests = this.dests(move.from, ctx);
				return dests.has(move.to) || dests.has(normalizeMove(this, move).to);
			}
		}
		isCheck() {
			const king = this.board.kingOf(this.turn);
			return defined(king) && this.kingAttackers(king, opposite(this.turn), this.board.occupied).nonEmpty();
		}
		isEnd(ctx) {
			if (ctx ? ctx.variantEnd : this.isVariantEnd()) return true;
			return this.isInsufficientMaterial() || !this.hasDests(ctx);
		}
		isCheckmate(ctx) {
			ctx = ctx || this.ctx();
			return !ctx.variantEnd && ctx.checkers.nonEmpty() && !this.hasDests(ctx);
		}
		isStalemate(ctx) {
			ctx = ctx || this.ctx();
			return !ctx.variantEnd && ctx.checkers.isEmpty() && !this.hasDests(ctx);
		}
		outcome(ctx) {
			const variantOutcome = this.variantOutcome(ctx);
			if (variantOutcome) return variantOutcome;
			ctx = ctx || this.ctx();
			if (this.isCheckmate(ctx)) return { winner: opposite(this.turn) };
			else if (this.isInsufficientMaterial() || this.isStalemate(ctx)) return { winner: void 0 };
			else return;
		}
		allDests(ctx) {
			ctx = ctx || this.ctx();
			const d = new Map();
			if (ctx.variantEnd) return d;
			for (const square of this.board[this.turn]) d.set(square, this.dests(square, ctx));
			return d;
		}
		play(move) {
			const turn = this.turn;
			const epSquare = this.epSquare;
			const castling = castlingSide(this, move);
			this.epSquare = void 0;
			this.halfmoves += 1;
			if (turn === "black") this.fullmoves += 1;
			this.turn = opposite(turn);
			if (isDrop(move)) {
				this.board.set(move.to, {
					role: move.role,
					color: turn
				});
				if (this.pockets) this.pockets[turn][move.role]--;
				if (move.role === "pawn") this.halfmoves = 0;
			} else {
				const piece = this.board.take(move.from);
				if (!piece) return;
				let epCapture;
				if (piece.role === "pawn") {
					this.halfmoves = 0;
					if (move.to === epSquare) epCapture = this.board.take(move.to + (turn === "white" ? -8 : 8));
					const delta = move.from - move.to;
					if (Math.abs(delta) === 16 && 8 <= move.from && move.from <= 55) this.epSquare = move.from + move.to >> 1;
					if (move.promotion) {
						piece.role = move.promotion;
						piece.promoted = !!this.pockets;
					}
				} else if (piece.role === "rook") this.castles.discardRook(move.from);
				else if (piece.role === "king") {
					if (castling) {
						const rookFrom = this.castles.rook[turn][castling];
						if (defined(rookFrom)) {
							const rook = this.board.take(rookFrom);
							this.board.set(kingCastlesTo(turn, castling), piece);
							if (rook) this.board.set(rookCastlesTo(turn, castling), rook);
						}
					}
					this.castles.discardColor(turn);
				}
				if (!castling) {
					const capture = this.board.set(move.to, piece) || epCapture;
					if (capture) this.playCaptureAt(move.to, capture);
				}
			}
			if (this.remainingChecks) {
				if (this.isCheck()) this.remainingChecks[turn] = Math.max(this.remainingChecks[turn] - 1, 0);
			}
		}
	};
	var Chess = class extends Position {
		constructor() {
			super("chess");
		}
		static default() {
			const pos = new this();
			pos.reset();
			return pos;
		}
		static fromSetup(setup) {
			const pos = new this();
			pos.setupUnchecked(setup);
			return pos.validate().map((_) => pos);
		}
		clone() {
			return super.clone();
		}
	};
	var validEpSquare = (pos, square) => {
		if (!defined(square)) return;
		const epRank = pos.turn === "white" ? 5 : 2;
		const forward = pos.turn === "white" ? 8 : -8;
		if (squareRank(square) !== epRank) return;
		if (pos.board.occupied.has(square + forward)) return;
		const pawn = square - forward;
		if (!pos.board.pawn.has(pawn) || !pos.board[opposite(pos.turn)].has(pawn)) return;
		return square;
	};
	var legalEpSquare = (pos) => {
		if (!defined(pos.epSquare)) return;
		const ctx = pos.ctx();
		const candidates = pos.board.pieces(pos.turn, "pawn").intersect(pawnAttacks(opposite(pos.turn), pos.epSquare));
		for (const candidate of candidates) if (pos.dests(candidate, ctx).has(pos.epSquare)) return pos.epSquare;
	};
	var canCaptureEp = (pos, pawnFrom, ctx) => {
		if (!defined(pos.epSquare)) return false;
		if (!pawnAttacks(pos.turn, pawnFrom).has(pos.epSquare)) return false;
		if (!defined(ctx.king)) return true;
		const delta = pos.turn === "white" ? 8 : -8;
		const captured = pos.epSquare - delta;
		return pos.kingAttackers(ctx.king, opposite(pos.turn), pos.board.occupied.toggle(pawnFrom).toggle(captured).with(pos.epSquare)).without(captured).isEmpty();
	};
	var castlingDest = (pos, side, ctx) => {
		if (!defined(ctx.king) || ctx.checkers.nonEmpty()) return SquareSet.empty();
		const rook = pos.castles.rook[pos.turn][side];
		if (!defined(rook)) return SquareSet.empty();
		if (pos.castles.path[pos.turn][side].intersects(pos.board.occupied)) return SquareSet.empty();
		const kingTo = kingCastlesTo(pos.turn, side);
		const kingPath = between(ctx.king, kingTo);
		const occ = pos.board.occupied.without(ctx.king);
		for (const sq of kingPath) if (pos.kingAttackers(sq, opposite(pos.turn), occ).nonEmpty()) return SquareSet.empty();
		const rookTo = rookCastlesTo(pos.turn, side);
		const after = pos.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
		if (pos.kingAttackers(kingTo, opposite(pos.turn), after).nonEmpty()) return SquareSet.empty();
		return SquareSet.fromSquare(rook);
	};
	var castlingSide = (pos, move) => {
		if (isDrop(move)) return;
		const delta = move.to - move.from;
		if (Math.abs(delta) !== 2 && !pos.board[pos.turn].has(move.to)) return;
		if (!pos.board.king.has(move.from)) return;
		return delta > 0 ? "h" : "a";
	};
	var normalizeMove = (pos, move) => {
		const side = castlingSide(pos, move);
		if (!side) return move;
		const rookFrom = pos.castles.rook[pos.turn][side];
		return {
			from: move.from,
			to: defined(rookFrom) ? rookFrom : move.to
		};
	};
	var MaterialSide = class MaterialSide {
		constructor() {}
		static empty() {
			const m = new MaterialSide();
			for (const role of ROLES) m[role] = 0;
			return m;
		}
		static fromBoard(board, color) {
			const m = new MaterialSide();
			for (const role of ROLES) m[role] = board.pieces(color, role).size();
			return m;
		}
		clone() {
			const m = new MaterialSide();
			for (const role of ROLES) m[role] = this[role];
			return m;
		}
		equals(other) {
			return ROLES.every((role) => this[role] === other[role]);
		}
		add(other) {
			const m = new MaterialSide();
			for (const role of ROLES) m[role] = this[role] + other[role];
			return m;
		}
		subtract(other) {
			const m = new MaterialSide();
			for (const role of ROLES) m[role] = this[role] - other[role];
			return m;
		}
		nonEmpty() {
			return ROLES.some((role) => this[role] > 0);
		}
		isEmpty() {
			return !this.nonEmpty();
		}
		hasPawns() {
			return this.pawn > 0;
		}
		hasNonPawns() {
			return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.queen > 0 || this.king > 0;
		}
		size() {
			return this.pawn + this.knight + this.bishop + this.rook + this.queen + this.king;
		}
	};
	var Material = class Material {
		constructor(white, black) {
			this.white = white;
			this.black = black;
		}
		static empty() {
			return new Material(MaterialSide.empty(), MaterialSide.empty());
		}
		static fromBoard(board) {
			return new Material(MaterialSide.fromBoard(board, "white"), MaterialSide.fromBoard(board, "black"));
		}
		clone() {
			return new Material(this.white.clone(), this.black.clone());
		}
		equals(other) {
			return this.white.equals(other.white) && this.black.equals(other.black);
		}
		add(other) {
			return new Material(this.white.add(other.white), this.black.add(other.black));
		}
		subtract(other) {
			return new Material(this.white.subtract(other.white), this.black.subtract(other.black));
		}
		count(role) {
			return this.white[role] + this.black[role];
		}
		size() {
			return this.white.size() + this.black.size();
		}
		isEmpty() {
			return this.white.isEmpty() && this.black.isEmpty();
		}
		nonEmpty() {
			return !this.isEmpty();
		}
		hasPawns() {
			return this.white.hasPawns() || this.black.hasPawns();
		}
		hasNonPawns() {
			return this.white.hasNonPawns() || this.black.hasNonPawns();
		}
	};
	var RemainingChecks = class RemainingChecks {
		constructor(white, black) {
			this.white = white;
			this.black = black;
		}
		static default() {
			return new RemainingChecks(3, 3);
		}
		clone() {
			return new RemainingChecks(this.white, this.black);
		}
		equals(other) {
			return this.white === other.white && this.black === other.black;
		}
	};
	var InvalidFen;
	(function(InvalidFen) {
		InvalidFen["Fen"] = "ERR_FEN";
		InvalidFen["Board"] = "ERR_BOARD";
		InvalidFen["Pockets"] = "ERR_POCKETS";
		InvalidFen["Turn"] = "ERR_TURN";
		InvalidFen["Castling"] = "ERR_CASTLING";
		InvalidFen["EpSquare"] = "ERR_EP_SQUARE";
		InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
		InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
		InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
	})(InvalidFen || (InvalidFen = {}));
	var FenError = class extends Error {};
	var nthIndexOf = (haystack, needle, n) => {
		let index = haystack.indexOf(needle);
		while (n-- > 0) {
			if (index === -1) break;
			index = haystack.indexOf(needle, index + needle.length);
		}
		return index;
	};
	var parseSmallUint = (str) => /^\d{1,4}$/.test(str) ? parseInt(str, 10) : void 0;
	var charToPiece = (ch) => {
		const role = charToRole(ch);
		return role && {
			role,
			color: ch.toLowerCase() === ch ? "black" : "white"
		};
	};
	var parseBoardFen = (boardPart) => {
		const board = Board.empty();
		let rank = 7;
		let file = 0;
		for (let i = 0; i < boardPart.length; i++) {
			const c = boardPart[i];
			if (c === "/" && file === 8) {
				file = 0;
				rank--;
			} else {
				const step = parseInt(c, 10);
				if (step > 0) file += step;
				else {
					if (file >= 8 || rank < 0) return Result.err(new FenError(InvalidFen.Board));
					const square = file + rank * 8;
					const piece = charToPiece(c);
					if (!piece) return Result.err(new FenError(InvalidFen.Board));
					if (boardPart[i + 1] === "~") {
						piece.promoted = true;
						i++;
					}
					board.set(square, piece);
					file++;
				}
			}
		}
		if (rank !== 0 || file !== 8) return Result.err(new FenError(InvalidFen.Board));
		return Result.ok(board);
	};
	var parsePockets = (pocketPart) => {
		if (pocketPart.length > 64) return Result.err(new FenError(InvalidFen.Pockets));
		const pockets = Material.empty();
		for (const c of pocketPart) {
			const piece = charToPiece(c);
			if (!piece) return Result.err(new FenError(InvalidFen.Pockets));
			pockets[piece.color][piece.role]++;
		}
		return Result.ok(pockets);
	};
	var parseCastlingFen = (board, castlingPart) => {
		let castlingRights = SquareSet.empty();
		if (castlingPart === "-") return Result.ok(castlingRights);
		for (const c of castlingPart) {
			const lower = c.toLowerCase();
			const color = c === lower ? "black" : "white";
			const rank = color === "white" ? 0 : 7;
			if ("a" <= lower && lower <= "h") castlingRights = castlingRights.with(squareFromCoords(lower.charCodeAt(0) - "a".charCodeAt(0), rank));
			else if (lower === "k" || lower === "q") {
				const rooksAndKings = board[color].intersect(SquareSet.backrank(color)).intersect(board.rook.union(board.king));
				const candidate = lower === "k" ? rooksAndKings.last() : rooksAndKings.first();
				castlingRights = castlingRights.with(defined(candidate) && board.rook.has(candidate) ? candidate : squareFromCoords(lower === "k" ? 7 : 0, rank));
			} else return Result.err(new FenError(InvalidFen.Castling));
		}
		if (COLORS.some((color) => SquareSet.backrank(color).intersect(castlingRights).size() > 2)) return Result.err(new FenError(InvalidFen.Castling));
		return Result.ok(castlingRights);
	};
	var parseRemainingChecks = (part) => {
		const parts = part.split("+");
		if (parts.length === 3 && parts[0] === "") {
			const white = parseSmallUint(parts[1]);
			const black = parseSmallUint(parts[2]);
			if (!defined(white) || white > 3 || !defined(black) || black > 3) return Result.err(new FenError(InvalidFen.RemainingChecks));
			return Result.ok(new RemainingChecks(3 - white, 3 - black));
		} else if (parts.length === 2) {
			const white = parseSmallUint(parts[0]);
			const black = parseSmallUint(parts[1]);
			if (!defined(white) || white > 3 || !defined(black) || black > 3) return Result.err(new FenError(InvalidFen.RemainingChecks));
			return Result.ok(new RemainingChecks(white, black));
		} else return Result.err(new FenError(InvalidFen.RemainingChecks));
	};
	var parseFen = (fen) => {
		const parts = fen.split(/[\s_]+/);
		const boardPart = parts.shift();
		let board;
		let pockets = Result.ok(void 0);
		if (boardPart.endsWith("]")) {
			const pocketStart = boardPart.indexOf("[");
			if (pocketStart === -1) return Result.err(new FenError(InvalidFen.Fen));
			board = parseBoardFen(boardPart.slice(0, pocketStart));
			pockets = parsePockets(boardPart.slice(pocketStart + 1, -1));
		} else {
			const pocketStart = nthIndexOf(boardPart, "/", 7);
			if (pocketStart === -1) board = parseBoardFen(boardPart);
			else {
				board = parseBoardFen(boardPart.slice(0, pocketStart));
				pockets = parsePockets(boardPart.slice(pocketStart + 1));
			}
		}
		let turn;
		const turnPart = parts.shift();
		if (!defined(turnPart) || turnPart === "w") turn = "white";
		else if (turnPart === "b") turn = "black";
		else return Result.err(new FenError(InvalidFen.Turn));
		return board.chain((board) => {
			const castlingPart = parts.shift();
			const castlingRights = defined(castlingPart) ? parseCastlingFen(board, castlingPart) : Result.ok(SquareSet.empty());
			const epPart = parts.shift();
			let epSquare;
			if (defined(epPart) && epPart !== "-") {
				epSquare = parseSquare(epPart);
				if (!defined(epSquare)) return Result.err(new FenError(InvalidFen.EpSquare));
			}
			let halfmovePart = parts.shift();
			let earlyRemainingChecks;
			if (defined(halfmovePart) && halfmovePart.includes("+")) {
				earlyRemainingChecks = parseRemainingChecks(halfmovePart);
				halfmovePart = parts.shift();
			}
			const halfmoves = defined(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
			if (!defined(halfmoves)) return Result.err(new FenError(InvalidFen.Halfmoves));
			const fullmovesPart = parts.shift();
			const fullmoves = defined(fullmovesPart) ? parseSmallUint(fullmovesPart) : 1;
			if (!defined(fullmoves)) return Result.err(new FenError(InvalidFen.Fullmoves));
			const remainingChecksPart = parts.shift();
			let remainingChecks = Result.ok(void 0);
			if (defined(remainingChecksPart)) {
				if (defined(earlyRemainingChecks)) return Result.err(new FenError(InvalidFen.RemainingChecks));
				remainingChecks = parseRemainingChecks(remainingChecksPart);
			} else if (defined(earlyRemainingChecks)) remainingChecks = earlyRemainingChecks;
			if (parts.length > 0) return Result.err(new FenError(InvalidFen.Fen));
			return pockets.chain((pockets) => castlingRights.chain((castlingRights) => remainingChecks.map((remainingChecks) => {
				return {
					board,
					pockets,
					turn,
					castlingRights,
					remainingChecks,
					epSquare,
					halfmoves,
					fullmoves: Math.max(1, fullmoves)
				};
			})));
		});
	};
	var makePiece = (piece) => {
		let r = roleToChar(piece.role);
		if (piece.color === "white") r = r.toUpperCase();
		if (piece.promoted) r += "~";
		return r;
	};
	var makeBoardFen = (board) => {
		let fen = "";
		let empty = 0;
		for (let rank = 7; rank >= 0; rank--) for (let file = 0; file < 8; file++) {
			const square = file + rank * 8;
			const piece = board.get(square);
			if (!piece) empty++;
			else {
				if (empty > 0) {
					fen += empty;
					empty = 0;
				}
				fen += makePiece(piece);
			}
			if (file === 7) {
				if (empty > 0) {
					fen += empty;
					empty = 0;
				}
				if (rank !== 0) fen += "/";
			}
		}
		return fen;
	};
	var makePocket = (material) => ROLES.map((role) => roleToChar(role).repeat(material[role])).join("");
	var makePockets = (pocket) => makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
	var makeCastlingFen = (board, castlingRights) => {
		let fen = "";
		for (const color of COLORS) {
			const backrank = SquareSet.backrank(color);
			let king = board.kingOf(color);
			if (defined(king) && !backrank.has(king)) king = void 0;
			const candidates = board.pieces(color, "rook").intersect(backrank);
			for (const rook of castlingRights.intersect(backrank).reversed()) if (rook === candidates.first() && defined(king) && rook < king) fen += color === "white" ? "Q" : "q";
			else if (rook === candidates.last() && defined(king) && king < rook) fen += color === "white" ? "K" : "k";
			else {
				const file = FILE_NAMES[squareFile(rook)];
				fen += color === "white" ? file.toUpperCase() : file;
			}
		}
		return fen || "-";
	};
	var makeRemainingChecks = (checks) => `${checks.white}+${checks.black}`;
	var makeFen = (setup, opts) => [
		makeBoardFen(setup.board) + (setup.pockets ? `[${makePockets(setup.pockets)}]` : ""),
		setup.turn[0],
		makeCastlingFen(setup.board, setup.castlingRights),
		defined(setup.epSquare) ? makeSquare(setup.epSquare) : "-",
		...setup.remainingChecks ? [makeRemainingChecks(setup.remainingChecks)] : [],
		...(opts === null || opts === void 0 ? void 0 : opts.epd) ? [] : [Math.max(0, Math.min(setup.halfmoves, 9999)), Math.max(1, Math.min(setup.fullmoves, 9999))]
	].join(" ");
	var PONDER_REUSE_DEPTH = 12;
	function deferred() {
		let resolve;
		let reject;
		return {
			promise: new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			}),
			resolve,
			reject
		};
	}
	function abortError() {
		return new DOMException("Analysis aborted", "AbortError");
	}
	function asError(reason) {
		if (reason instanceof Error) return reason;
		return new Error(typeof reason === "string" ? reason : "Stockfish worker failed");
	}
	function safeTimeout(callback, delay) {
		const timer = setTimeout(callback, delay);
		timer.unref?.();
		return timer;
	}
	function withTimeout(promise, timeoutMs, label) {
		return new Promise((resolve, reject) => {
			const timer = safeTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
			promise.then((value) => {
				clearTimeout(timer);
				resolve(value);
			}, (error) => {
				clearTimeout(timer);
				reject(error);
			});
		});
	}
	function tokenValue(tokens, name) {
		const index = tokens.indexOf(name);
		return index >= 0 ? tokens[index + 1] : void 0;
	}
	function finiteInteger(raw) {
		if (raw === void 0 || !/^-?\d+$/.test(raw)) return void 0;
		const value = Number(raw);
		return Number.isSafeInteger(value) ? value : void 0;
	}
	function parseInfo(line, previous) {
		const tokens = line.trim().split(/\s+/);
		if (tokens[0] !== "info" || tokens[1] === "string") return previous;
		const depth = finiteInteger(tokenValue(tokens, "depth")) ?? previous.depth;
		const cpIndex = tokens.indexOf("cp");
		const mateIndex = tokens.indexOf("mate");
		let evaluation = previous.evaluation;
		if (cpIndex >= 0) {
			const cp = finiteInteger(tokens[cpIndex + 1]);
			if (cp !== void 0) evaluation = { cp };
		} else if (mateIndex >= 0) {
			const mate = finiteInteger(tokens[mateIndex + 1]);
			if (mate !== void 0) evaluation = { mate };
		}
		const pvIndex = tokens.indexOf("pv");
		return {
			depth,
			pv: pvIndex >= 0 ? tokens.slice(pvIndex + 1).join(" ") : previous.pv,
			evaluation,
			nodes: finiteInteger(tokenValue(tokens, "nodes")) ?? previous.nodes,
			time: finiteInteger(tokenValue(tokens, "time")) ?? previous.time
		};
	}
	function positionCommand(fen, history) {
		if (history && typeof history.startFen === "string" && history.startFen.length > 0 && !/[\r\n]/.test(history.startFen) && Array.isArray(history.moves) && history.moves.every((move) => /^[a-h][1-8][a-h][1-8][nbrq]?$/.test(move))) {
			const moves = history.moves.join(" ");
			return `position fen ${history.startFen}${moves ? ` moves ${moves}` : ""}`;
		}
		return `position fen ${fen}`;
	}
	function validBestMove(move) {
		return /^[a-h][1-8][a-h][1-8][nbrq]?$/.test(move);
	}
	var UciClient = class {
		workerFactory;
		worker = null;
		ready = false;
		readyPromise = null;
		uciWaiter = null;
		readyWaiter = null;
		active = null;
		ponderJob = null;
		completedPonder = null;
		queue = [];
		pumping = false;
		resetRequested = false;
		initTimeoutMs;
		searchTimeoutSlackMs;
		stopTimeoutMs;
		constructor(workerFactory, options = {}) {
			this.workerFactory = workerFactory;
			this.initTimeoutMs = options.initTimeoutMs ?? 25e3;
			this.searchTimeoutSlackMs = options.searchTimeoutSlackMs ?? 3e3;
			this.stopTimeoutMs = options.stopTimeoutMs ?? 2e3;
		}
		get busy() {
			return this.pumping || this.queue.length > 0 || this.active !== null;
		}
		async warm() {
			await this.ensureReady();
		}
		analyze(fen, depth, timeLimit, signal, history) {
			if (signal?.aborted) return Promise.reject(abortError());
			if (!fen || /[\r\n]/.test(fen)) return Promise.reject(new Error("A valid position FEN is required"));
			const positionKey = positionCommand(fen, history);
			const requestedDepth = Math.max(1, Math.min(100, Math.floor(depth) || 1));
			const completedPonder = this.completedPonder;
			this.completedPonder = null;
			if (completedPonder?.positionKey === positionKey && completedPonder.depth === requestedDepth && completedPonder.result.success) return Promise.resolve(completedPonder.result);
			const ponderJob = this.ponderJob;
			if (ponderJob) {
				if (ponderJob.positionKey === positionKey && ponderJob.depth === requestedDepth) {
					this.promotePonder(ponderJob, timeLimit, signal);
					return ponderJob.promise;
				}
				this.cancelPonder();
			}
			return this.enqueue(fen, depth, timeLimit, signal, history, false);
		}
		ponder(fen, depth, signal, history) {
			if (signal?.aborted || !fen || /[\r\n]/.test(fen) || this.busy || this.ponderJob) return null;
			this.completedPonder = null;
			return this.enqueue(fen, depth, 1, signal, history, true);
		}
		cancelPonder(preserveFen) {
			const job = this.ponderJob;
			if (!job) {
				if (preserveFen === void 0 || this.completedPonder?.fen !== preserveFen) this.completedPonder = null;
				return;
			}
			if (preserveFen !== void 0 && job.fen === preserveFen) return;
			this.ponderJob = null;
			this.completedPonder = null;
			this.abortJob(job);
		}
		enqueue(fen, depth, timeLimit, signal, history, pondering) {
			let resolve;
			let reject;
			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});
			const job = {
				fen,
				positionKey: positionCommand(fen, history),
				depth: Math.max(1, Math.min(100, Math.floor(depth) || 1)),
				timeLimit: Math.max(1, Math.min(12e4, Math.floor(timeLimit) || 1)),
				history,
				pondering,
				promise,
				signal,
				resolve,
				reject,
				settled: false,
				searchStarted: false,
				stopSent: false,
				info: {
					depth: 0,
					pv: "",
					evaluation: {}
				}
			};
			if (signal) this.attachAbort(job, signal);
			this.queue.push(job);
			if (pondering) this.ponderJob = job;
			this.drain();
			return promise;
		}
		attachAbort(job, signal) {
			job.signal = signal;
			job.onAbort = () => this.abortJob(job);
			signal.addEventListener("abort", job.onAbort, { once: true });
		}
		promotePonder(job, timeLimit, signal) {
			if (job.onAbort) job.signal?.removeEventListener("abort", job.onAbort);
			job.onAbort = void 0;
			job.signal = void 0;
			job.timeLimit = Math.max(1, Math.min(12e4, Math.floor(timeLimit) || 1));
			job.pondering = false;
			this.ponderJob = null;
			if (signal) this.attachAbort(job, signal);
			if (signal?.aborted) {
				this.abortJob(job);
				return;
			}
			if (this.active !== job || !job.searchStarted || job.resultValue) return;
			if (job.info.depth >= PONDER_REUSE_DEPTH) {
				this.stopActiveSearch(job);
				return;
			}
			try {
				this.send("ponderhit");
				job.searchTimer = safeTimeout(() => {
					job.timeoutReason = new Error(`Stockfish search exceeded ${job.timeLimit + this.searchTimeoutSlackMs} ms`);
					this.stopActiveSearch(job);
				}, job.timeLimit + this.searchTimeoutSlackMs);
			} catch (error) {
				job.result?.reject(error);
				this.destroyWorker();
			}
		}
		cancelAll(reason = abortError()) {
			this.completedPonder = null;
			const queued = this.queue.splice(0);
			for (const job of queued) {
				job.abortReason = reason;
				this.rejectJob(job, reason);
				this.cleanupJob(job);
			}
			if (this.active) {
				this.active.abortReason = reason;
				this.rejectJob(this.active, reason);
				if (this.active.searchStarted && !this.active.resultValue) this.stopActiveSearch(this.active);
			}
			this.ponderJob = null;
		}
		reset() {
			this.cancelAll(new Error("Engine reset"));
			if (!this.worker) return;
			this.resetRequested = true;
			this.drain();
		}
		abortJob(job) {
			const reason = abortError();
			job.abortReason = reason;
			this.rejectJob(job, reason);
			if (this.active === job) {
				if (job.searchStarted && !job.resultValue) this.stopActiveSearch(job);
				return;
			}
			const index = this.queue.indexOf(job);
			if (index >= 0) {
				this.queue.splice(index, 1);
				this.cleanupJob(job);
			}
		}
		rejectJob(job, reason) {
			if (job.settled) return;
			job.settled = true;
			job.reject(reason);
		}
		resolveJob(job, result) {
			if (job.settled) return;
			job.settled = true;
			job.resolve(result);
		}
		cleanupJob(job) {
			if (job.onAbort) job.signal?.removeEventListener("abort", job.onAbort);
			if (job.searchTimer) clearTimeout(job.searchTimer);
			if (job.stopTimer) clearTimeout(job.stopTimer);
		}
		async drain() {
			if (this.pumping) return;
			this.pumping = true;
			try {
				while (this.resetRequested || this.queue.length > 0) {
					if (this.resetRequested) {
						await this.performReset();
						continue;
					}
					const job = this.queue.shift();
					if (!job) continue;
					if (job.abortReason || job.signal?.aborted) {
						this.rejectJob(job, job.abortReason ?? abortError());
						this.cleanupJob(job);
						continue;
					}
					this.active = job;
					try {
						await this.ensureReady();
						if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
						const result = await this.runSearch(job);
						if (job.timeoutReason) throw job.timeoutReason;
						if (job.abortReason || job.signal?.aborted) throw job.abortReason ?? abortError();
						if (job.pondering && result.success) this.completedPonder = {
							fen: job.fen,
							positionKey: job.positionKey,
							depth: job.depth,
							result
						};
						this.resolveJob(job, result);
					} catch (error) {
						this.rejectJob(job, error);
					} finally {
						this.cleanupJob(job);
						if (this.ponderJob === job) this.ponderJob = null;
						if (this.active === job) this.active = null;
					}
				}
			} catch (error) {
				const reason = asError(error);
				for (const job of this.queue.splice(0)) {
					this.rejectJob(job, reason);
					this.cleanupJob(job);
				}
				this.resetRequested = false;
			} finally {
				this.pumping = false;
				if (this.resetRequested || this.queue.length > 0) this.drain();
			}
		}
		async performReset() {
			if (!this.worker) {
				this.resetRequested = false;
				return;
			}
			await this.ensureReady();
			const waiter = deferred();
			this.readyWaiter = waiter;
			try {
				this.send("ucinewgame");
				this.send("isready");
				await withTimeout(waiter.promise, this.initTimeoutMs, "Stockfish reset");
				this.resetRequested = false;
			} catch (error) {
				this.destroyWorker();
				throw error;
			} finally {
				if (this.readyWaiter === waiter) this.readyWaiter = null;
			}
		}
		async ensureReady() {
			if (this.ready) return;
			if (this.readyPromise) return this.readyPromise;
			const readyPromise = this.initialize();
			this.readyPromise = readyPromise;
			try {
				await readyPromise;
			} finally {
				if (this.readyPromise === readyPromise) this.readyPromise = null;
			}
		}
		async initialize() {
			if (!this.worker) {
				const setupController = new AbortController();
				let worker;
				try {
					worker = await withTimeout(Promise.resolve().then(() => this.workerFactory(setupController.signal)), this.initTimeoutMs, "Stockfish worker setup");
				} catch (error) {
					setupController.abort();
					throw error;
				}
				worker.onmessage = (event) => this.handleMessage(String(event.data));
				worker.onerror = (event) => this.handleError(event.error ?? new Error(event.message || "Stockfish worker error"));
				this.worker = worker;
			}
			const uci = deferred();
			this.uciWaiter = uci;
			this.send("uci");
			try {
				await withTimeout(uci.promise, this.initTimeoutMs, "Stockfish UCI initialization");
			} catch (error) {
				this.destroyWorker();
				throw error;
			} finally {
				if (this.uciWaiter === uci) this.uciWaiter = null;
			}
			const ready = deferred();
			this.readyWaiter = ready;
			this.send("isready");
			try {
				await withTimeout(ready.promise, this.initTimeoutMs, "Stockfish readiness");
				this.ready = true;
			} catch (error) {
				this.destroyWorker();
				throw error;
			} finally {
				if (this.readyWaiter === ready) this.readyWaiter = null;
			}
		}
		async runSearch(job) {
			const result = deferred();
			job.result = result;
			const timeLimit = job.timeLimit;
			this.send(positionCommand(job.fen, job.history));
			job.searchStarted = true;
			if (job.pondering) {
				this.send(`go ponder depth ${job.depth}`);
				try {
					return await result.promise;
				} catch (error) {
					if (job.stopSent) this.destroyWorker();
					throw error;
				}
			}
			job.searchTimer = safeTimeout(() => {
				job.timeoutReason = new Error(`Stockfish search exceeded ${timeLimit + this.searchTimeoutSlackMs} ms`);
				this.stopActiveSearch(job);
			}, timeLimit + this.searchTimeoutSlackMs);
			this.send(`go depth ${job.depth} movetime ${timeLimit}`);
			try {
				return await result.promise;
			} catch (error) {
				if (job.stopSent) this.destroyWorker();
				throw error;
			}
		}
		stopActiveSearch(job) {
			if (job.stopSent || this.active !== job) return;
			job.stopSent = true;
			if (job.searchTimer) clearTimeout(job.searchTimer);
			try {
				this.send("stop");
			} catch (error) {
				job.result?.reject(error);
				this.destroyWorker();
				return;
			}
			job.stopTimer = safeTimeout(() => {
				if (this.active !== job) return;
				const reason = job.abortReason ?? job.timeoutReason ?? new Error("Stockfish did not return bestmove after stop");
				job.result?.reject(reason);
				this.destroyWorker();
			}, this.stopTimeoutMs);
		}
		handleMessage(line) {
			const message = line.trim();
			if (!message) return;
			if (message === "uciok") {
				this.uciWaiter?.resolve();
				return;
			}
			if (message === "readyok") {
				this.readyWaiter?.resolve();
				return;
			}
			const job = this.active;
			if (!job?.searchStarted) return;
			if (message.startsWith("info ")) {
				job.info = parseInfo(message, job.info);
				return;
			}
			if (message.startsWith("bestmove ")) {
				if (job.searchTimer) clearTimeout(job.searchTimer);
				if (job.stopTimer) clearTimeout(job.stopTimer);
				const bestmove = message.split(/\s+/)[1] ?? "";
				job.resultValue = {
					success: validBestMove(bestmove),
					depth: job.info.depth,
					bestmove: validBestMove(bestmove) ? bestmove : "",
					pv: job.info.pv,
					evaluation: job.info.evaluation,
					...job.info.nodes === void 0 ? {} : { nodes: job.info.nodes },
					...job.info.time === void 0 ? {} : { time: job.info.time }
				};
				job.result?.resolve(job.resultValue);
			}
		}
		handleError(reason) {
			const error = asError(reason);
			this.uciWaiter?.reject(error);
			this.readyWaiter?.reject(error);
			this.active?.result?.reject(error);
			this.destroyWorker();
		}
		send(command) {
			if (!this.worker) throw new Error("Stockfish worker is unavailable");
			this.worker.postMessage(command);
		}
		destroyWorker() {
			this.completedPonder = null;
			const worker = this.worker;
			this.worker = null;
			this.ready = false;
			this.readyPromise = null;
			if (!worker) return;
			worker.onmessage = null;
			worker.onerror = null;
			try {
				worker.terminate();
			} catch {}
		}
	};
	var ResourceWorker = class {
		worker;
		objectUrls;
		constructor(worker, objectUrls) {
			this.worker = worker;
			this.objectUrls = objectUrls;
		}
		get onmessage() {
			return this.worker.onmessage;
		}
		set onmessage(handler) {
			this.worker.onmessage = handler;
		}
		get onerror() {
			return this.worker.onerror;
		}
		set onerror(handler) {
			this.worker.onerror = handler;
		}
		postMessage(command) {
			this.worker.postMessage(command);
		}
		terminate() {
			this.worker.terminate();
			for (const objectUrl of this.objectUrls) URL.revokeObjectURL(objectUrl);
		}
	};
	async function createStockfishWorker(signal) {
		if (typeof Worker === "undefined") throw new Error("Stockfish requires browser Web Worker support");
		if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") throw new Error("Stockfish worker resources are unavailable in this browser");
		if (typeof GM_getResourceText !== "function" || typeof GM_getResourceURL !== "function") throw new Error("Stockfish resources are missing; check userscript @resource permissions");
		const source = GM_getResourceText("stockfish.js");
		const wasmUrl = GM_getResourceURL("stockfish.wasm");
		if (typeof source !== "string" || source.length === 0 || typeof wasmUrl !== "string" || wasmUrl.length === 0) throw new Error("Stockfish JavaScript or WASM resource could not be loaded");
		let wasmObjectUrl;
		let workerObjectUrl;
		try {
			const response = await fetch(wasmUrl, { signal });
			if (!response.ok) throw new Error(`WASM resource request failed with status ${response.status}`);
			const wasm = await response.arrayBuffer();
			if (signal.aborted) throw new DOMException("Worker setup aborted", "AbortError");
			wasmObjectUrl = URL.createObjectURL(new Blob([wasm], { type: "application/wasm" }));
			workerObjectUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
			const workerUrl = `${workerObjectUrl}#${encodeURIComponent(wasmObjectUrl)}`;
			return new ResourceWorker(new Worker(workerUrl), [workerObjectUrl, wasmObjectUrl]);
		} catch (error) {
			if (workerObjectUrl) URL.revokeObjectURL(workerObjectUrl);
			if (wasmObjectUrl) URL.revokeObjectURL(wasmObjectUrl);
			const detail = error instanceof Error ? `: ${error.message}` : "";
			throw new Error(`Stockfish worker could not start${detail}`);
		}
	}
	var EngineWorkerClient = class {
		client = new UciClient(createStockfishWorker);
		ponderSearch = null;
		warm() {
			return this.client.warm();
		}
		analyze(fen, depth, timeLimit, signal, history) {
			if (signal?.aborted) return this.client.analyze(fen, depth, timeLimit, signal, history);
			const result = this.client.analyze(fen, depth, timeLimit, signal, history);
			this.ponderSearch = null;
			return result;
		}
		ponder(fen, depth, history) {
			if (!fen || this.client.busy || this.ponderSearch) return false;
			const controller = new AbortController();
			const promise = this.client.ponder(fen, depth, controller.signal, history);
			if (!promise) return false;
			const search = {
				fen,
				controller
			};
			this.ponderSearch = search;
			promise.catch(() => {}).finally(() => {
				if (this.ponderSearch === search) this.ponderSearch = null;
			});
			return true;
		}
		cancelPonder(preserveFen) {
			const search = this.ponderSearch;
			if (search && preserveFen !== void 0 && search.fen === preserveFen) return;
			this.ponderSearch = null;
			search?.controller.abort();
			this.client.cancelPonder(preserveFen);
		}
		reset() {
			this.cancelPonder();
			this.client.reset();
		}
	};
	var engineWorker = new EngineWorkerClient();
	function warmEngine() {
		return engineWorker.warm();
	}
	function resetEngine() {
		engineWorker.reset();
	}
	function getAnalysis(fen, depth, timeLimit, signal, history) {
		return engineWorker.analyze(fen, depth, timeLimit, signal, history);
	}
	function ponderPosition(fen, depth, history) {
		return engineWorker.ponder(fen, depth, history);
	}
	function cancelPonder(preserveFen) {
		engineWorker.cancelPonder(preserveFen);
	}
	function predictFen(fen, uci) {
		try {
			const setup = parseFen(fen);
			if (setup.isErr) return null;
			const position = Chess.fromSetup(setup.value);
			if (position.isErr) return null;
			const move = parseUci(uci);
			if (!move || !position.value.isLegal(move)) return null;
			position.value.play(move);
			const nextSetup = position.value.toSetup();
			nextSetup.epSquare = position.value.epSquare;
			return makeFen(nextSetup);
		} catch {
			return null;
		}
	}
	function parseBestLine(data) {
		if (!data || typeof data !== "object") return null;
		const result = data;
		const uci = typeof result.bestmove === "string" ? result.bestmove.trim() : "";
		if (!result.success || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) return null;
		const score = {};
		if (typeof result.evaluation?.cp === "number" && Number.isFinite(result.evaluation.cp)) score.cp = result.evaluation.cp;
		else if (typeof result.evaluation?.mate === "number" && Number.isFinite(result.evaluation.mate)) score.mate = result.evaluation.mate;
		return {
			uci,
			pv: typeof result.pv === "string" && result.pv.trim() ? result.pv.trim() : uci,
			score
		};
	}
	var makeSanWithoutSuffix = (pos, move) => {
		let san = "";
		if (isDrop(move)) {
			if (move.role !== "pawn") san = roleToChar(move.role).toUpperCase();
			san += "@" + makeSquare(move.to);
		} else {
			const role = pos.board.getRole(move.from);
			if (!role) return "--";
			if (role === "king" && (pos.board[pos.turn].has(move.to) || Math.abs(move.to - move.from) === 2)) san = move.to > move.from ? "O-O" : "O-O-O";
			else {
				const capture = pos.board.occupied.has(move.to) || role === "pawn" && squareFile(move.from) !== squareFile(move.to);
				if (role !== "pawn") {
					san = roleToChar(role).toUpperCase();
					let others;
					if (role === "king") others = kingAttacks(move.to).intersect(pos.board.king);
					else if (role === "queen") others = queenAttacks(move.to, pos.board.occupied).intersect(pos.board.queen);
					else if (role === "rook") others = rookAttacks(move.to, pos.board.occupied).intersect(pos.board.rook);
					else if (role === "bishop") others = bishopAttacks(move.to, pos.board.occupied).intersect(pos.board.bishop);
					else others = knightAttacks(move.to).intersect(pos.board.knight);
					others = others.intersect(pos.board[pos.turn]).without(move.from);
					if (others.nonEmpty()) {
						const ctx = pos.ctx();
						for (const from of others) if (!pos.dests(from, ctx).has(move.to)) others = others.without(from);
						if (others.nonEmpty()) {
							let row = false;
							let column = others.intersects(SquareSet.fromRank(squareRank(move.from)));
							if (others.intersects(SquareSet.fromFile(squareFile(move.from)))) row = true;
							else column = true;
							if (column) san += FILE_NAMES[squareFile(move.from)];
							if (row) san += RANK_NAMES[squareRank(move.from)];
						}
					}
				} else if (capture) san = FILE_NAMES[squareFile(move.from)];
				if (capture) san += "x";
				san += makeSquare(move.to);
				if (move.promotion) san += "=" + roleToChar(move.promotion).toUpperCase();
			}
		}
		return san;
	};
	var makeSanAndPlay = (pos, move) => {
		var _a;
		const san = makeSanWithoutSuffix(pos, move);
		pos.play(move);
		if ((_a = pos.outcome()) === null || _a === void 0 ? void 0 : _a.winner) return san + "#";
		if (pos.isCheck()) return san + "+";
		return san;
	};
	var parseSan = (pos, san) => {
		const ctx = pos.ctx();
		const match = san.match(/^([NBRQK])?([a-h])?([1-8])?[-x]?([a-h][1-8])(?:=?([nbrqkNBRQK]))?[+#]?$/);
		if (!match) {
			let castlingSide;
			if (san === "O-O" || san === "O-O+" || san === "O-O#") castlingSide = "h";
			else if (san === "O-O-O" || san === "O-O-O+" || san === "O-O-O#") castlingSide = "a";
			if (castlingSide) {
				const rook = pos.castles.rook[pos.turn][castlingSide];
				if (!defined(ctx.king) || !defined(rook) || !pos.dests(ctx.king, ctx).has(rook)) return;
				return {
					from: ctx.king,
					to: rook
				};
			}
			const match = san.match(/^([pnbrqkPNBRQK])?@([a-h][1-8])[+#]?$/);
			if (!match) return;
			const move = {
				role: match[1] ? charToRole(match[1]) : "pawn",
				to: parseSquare(match[2])
			};
			return pos.isLegal(move, ctx) ? move : void 0;
		}
		const role = match[1] ? charToRole(match[1]) : "pawn";
		const to = parseSquare(match[4]);
		const promotion = match[5] ? charToRole(match[5]) : void 0;
		if (!!promotion !== (role === "pawn" && SquareSet.backranks().has(to))) return;
		if (promotion === "king" && pos.rules !== "antichess") return;
		let candidates = pos.board.pieces(pos.turn, role);
		if (role === "pawn" && !match[2]) candidates = candidates.intersect(SquareSet.fromFile(squareFile(to)));
		else if (match[2]) candidates = candidates.intersect(SquareSet.fromFile(match[2].charCodeAt(0) - "a".charCodeAt(0)));
		if (match[3]) candidates = candidates.intersect(SquareSet.fromRank(match[3].charCodeAt(0) - "1".charCodeAt(0)));
		const pawnAdvance = role === "pawn" ? SquareSet.fromFile(squareFile(to)) : SquareSet.empty();
		candidates = candidates.intersect(pawnAdvance.union(attacks({
			color: opposite(pos.turn),
			role
		}, to, pos.board.occupied)));
		let from;
		for (const candidate of candidates) if (pos.dests(candidate, ctx).has(to)) {
			if (defined(from)) return;
			from = candidate;
		}
		if (!defined(from)) return;
		return {
			from,
			to,
			promotion
		};
	};
	var comparable = (fen) => fen.split(" ").filter((_, i) => i !== 3).join(" ");
	function readPositionHistory(game, currentFen) {
		try {
			const fens = game.getHistoryFENs?.();
			const sans = game.getHistorySANs?.();
			if (!Array.isArray(fens) || !Array.isArray(sans) || typeof fens[0] !== "string") return void 0;
			const setup = parseFen(fens[0]);
			if (setup.isErr) return void 0;
			const position = Chess.fromSetup(setup.value);
			if (position.isErr) return void 0;
			const moves = [];
			for (const san of sans) {
				if (!san) continue;
				if (typeof san !== "string") return void 0;
				const move = parseSan(position.value, san);
				if (!move) return void 0;
				moves.push(makeUci(move));
				position.value.play(move);
				if (comparable(makeFen(position.value.toSetup())) === comparable(currentFen)) return {
					startFen: fens[0],
					moves
				};
			}
			if (comparable(fens[0]) === comparable(currentFen)) return {
				startFen: fens[0],
				moves: []
			};
			return;
		} catch {
			return;
		}
	}
	function positionFromFen(fen) {
		const setup = parseFen(fen);
		if (setup.isErr) return null;
		const position = Chess.fromSetup(setup.value);
		return position.isOk ? position.value : null;
	}
	function asUci(move) {
		if (typeof move === "string") return move;
		if (!move || typeof move !== "object") return null;
		const value = move;
		if (typeof value.uci === "string") return value.uci;
		if (typeof value.from === "string" && typeof value.to === "string") {
			const promotion = value.promo ?? value.promotion;
			return value.from + value.to + (typeof promotion === "string" ? promotion : "");
		}
		return null;
	}
	function uciToSan(fen, input) {
		if (!input) return "";
		const uci = asUci(input);
		if (!uci || uci.length < 4) return input;
		const position = positionFromFen(fen);
		const move = parseUci(uci);
		if (!position || !move || !position.isLegal(move)) return uci;
		return makeSanAndPlay(position, move);
	}
	function formatMove(fen, uci) {
		const position = positionFromFen(fen);
		const san = uciToSan(fen, uci);
		const moveNumber = position?.fullmoves ?? (Number.parseInt(fen.split(/\s+/)[5] ?? "", 10) || 1);
		const whiteToMove = position ? position.turn === "white" : fen.split(/\s+/)[1] === "w";
		const sanText = typeof san === "string" ? san : String(san ?? "");
		return whiteToMove ? `${moveNumber}. ${sanText}` : `${moveNumber}... ${sanText}`;
	}
	var panel_default = "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */\n@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial}}}@layer theme{:root,:host{--font-sans:-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;--font-serif:ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif;--font-mono:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;--spacing:.25rem;--font-weight-normal:400;--font-weight-semibold:600;--radius-lg:.5rem;--ease-out:cubic-bezier(.16, 1, .3, 1);--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--color-panel:oklch(22% .025 160);--color-panel-header:oklch(25.5% .03 158);--color-panel-card:oklch(27.5% .03 158);--color-panel-border:oklch(40.5% .025 158);--color-panel-line:oklch(34% .022 158);--color-panel-muted:oklch(73% .022 157);--color-panel-text:oklch(94% .015 140);--color-panel-accent:oklch(84% .105 126);--color-panel-console:oklch(19% .02 158);--color-panel-control:oklch(25.5% .022 158);--color-panel-control-hover:oklch(32% .028 157);--color-panel-good:oklch(83% .105 126);--color-panel-warning:oklch(82% .105 82);--color-panel-error:oklch(78% .11 35);--color-panel-opponent:oklch(79% .07 73);--color-panel-shadow:oklch(8% .01 158/.48);--dur-short:.16s}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", \"Noto Sans\", Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring:where(:not(iframe)){outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.visible{visibility:visible}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.static{position:static}.inset-0{inset:0}.top-1{top:var(--spacing)}.left-0{left:0}.isolate{isolation:isolate}.z-10{z-index:10}.float-left{float:left}.container{width:100%}@media (width>=40rem){.container{max-width:40rem}}@media (width>=48rem){.container{max-width:48rem}}@media (width>=64rem){.container{max-width:64rem}}@media (width>=80rem){.container{max-width:80rem}}@media (width>=96rem){.container{max-width:96rem}}.m-0{margin:0}.mt-1{margin-top:var(--spacing)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mt-px{margin-top:1px}.mb-1{margin-bottom:var(--spacing)}.block{display:block}.contents{display:contents}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-flex{display:inline-flex}.table{display:table}.size-1{width:var(--spacing);height:var(--spacing)}.size-7{width:calc(var(--spacing) * 7);height:calc(var(--spacing) * 7)}.h-4{height:calc(var(--spacing) * 4)}.h-full{height:100%}.max-h-28{max-height:calc(var(--spacing) * 28)}.min-h-8{min-height:calc(var(--spacing) * 8)}.min-h-11{min-height:calc(var(--spacing) * 11)}.w-0{width:0}.w-full{width:100%}.min-w-0{min-width:0}.flex-1{flex:1}.flex-shrink{flex-shrink:1}.shrink-0{flex-shrink:0}.-translate-y-1{--tw-translate-y:calc(var(--spacing) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}.cursor-pointer{cursor:pointer}.resize{resize:both}.appearance-none{appearance:none}.flex-col{flex-direction:column}.place-items-center{place-items:center}.items-baseline{align-items:baseline}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-0{gap:0}.gap-1{gap:var(--spacing)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-3{gap:calc(var(--spacing) * 3)}.gap-px{gap:1px}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-auto{overflow:auto}.overflow-hidden{overflow:hidden}.rounded{border-radius:.25rem}.rounded-full{border-radius:2147483647px}.rounded-lg{border-radius:var(--radius-lg)}.rounded-r{border-top-right-radius:.25rem;border-bottom-right-radius:.25rem}.border{border-style:var(--tw-border-style);border-width:1px}.border-0{border-style:var(--tw-border-style);border-width:0}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-panel-border{border-color:var(--color-panel-border)}.border-panel-line{border-color:var(--color-panel-line)}.border-transparent{border-color:#0000}.bg-panel{background-color:var(--color-panel)}.bg-panel-accent{background-color:var(--color-panel-accent)}.bg-panel-card{background-color:var(--color-panel-card)}.bg-panel-console{background-color:var(--color-panel-console)}.bg-panel-header{background-color:var(--color-panel-header)}.bg-transparent{background-color:#0000}.p-0{padding:0}.px-1{padding-inline:var(--spacing)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-3{padding-inline:calc(var(--spacing) * 3)}.py-1{padding-block:var(--spacing)}.pb-2{padding-bottom:calc(var(--spacing) * 2)}.font-mono{font-family:var(--font-mono)}.font-serif{font-family:var(--font-serif)}.leading-none{--tw-leading:1;line-height:1}.font-normal{--tw-font-weight:var(--font-weight-normal);font-weight:var(--font-weight-normal)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.text-panel-muted{color:var(--color-panel-muted)}.text-panel-text{color:var(--color-panel-text)}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)}.opacity-0{opacity:0}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.backdrop-filter{-webkit-backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.select-none{-webkit-user-select:none;user-select:none}}:host{all:initial;z-index:9999999;width:min(336px,100vw - 16px);color:var(--color-panel-text);--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;font-family:var(--font-sans);-webkit-font-smoothing:antialiased;font-size:13px;line-height:1.4;display:block;position:fixed;inset:20px 20px auto auto}:host *,:host :before,:host :after{box-sizing:border-box}:host button,:host input{font:inherit}.panel-shell{border:1px solid var(--color-panel-border);background:var(--color-panel);box-shadow:0 14px 38px var(--color-panel-shadow), 0 2px 8px var(--color-panel-shadow);border-radius:14px;overflow:hidden}.panel-header{border-bottom:1px solid var(--color-panel-line);background:var(--color-panel-header);cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;align-items:center;gap:10px;min-height:58px;padding:9px 10px;display:flex}:host(.dragging) .panel-header{cursor:grabbing}.panel-brandmark{border:1px solid var(--color-panel-border);background:var(--color-panel-card);width:30px;height:30px;color:var(--color-panel-accent);border-radius:8px;flex:none;place-items:center;font-family:Georgia,serif;font-size:21px;line-height:1;display:grid}.panel-brand{flex-direction:column;flex:auto;gap:1px;min-width:0;display:flex}.panel-title{color:var(--color-panel-text);letter-spacing:.01em;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:650;overflow:hidden}.panel-state{min-width:0;color:var(--color-panel-muted);align-items:center;gap:7px;font-size:11px;display:flex}.panel-state-text{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.panel-state-dot{background:var(--color-panel-muted);border-radius:50%;flex:none;width:7px;height:7px}.panel-state[data-tone=working] .panel-state-dot,.panel-state[data-tone=ready] .panel-state-dot{background:var(--color-panel-good);box-shadow:0 0 0 3px #b6d48829}@supports (color:color-mix(in lab, red, red)){.panel-state[data-tone=working] .panel-state-dot,.panel-state[data-tone=ready] .panel-state-dot{box-shadow:0 0 0 3px color-mix(in oklab, var(--color-panel-good) 16%, transparent)}}.panel-state[data-tone=paused] .panel-state-dot,.panel-state[data-tone=paused] .panel-state-text{color:var(--color-panel-warning)}.panel-state[data-tone=paused] .panel-state-dot{background:var(--color-panel-warning)}.panel-state[data-tone=error] .panel-state-dot,.panel-state[data-tone=error] .panel-state-text{color:var(--color-panel-error)}.panel-state[data-tone=error] .panel-state-dot{background:var(--color-panel-error)}.panel-icon-button,.panel-action-button,.panel-quiet-button,.panel-segment{border:1px solid var(--color-panel-border);color:var(--color-panel-text);cursor:pointer;transition:transform var(--dur-short) var(--ease-out)}.panel-icon-button{background:var(--color-panel-control);border-radius:8px;flex:none;place-items:center;width:40px;height:40px;font-size:18px;line-height:1;display:grid}.panel-icon-button:hover,.panel-quiet-button:hover,.panel-segment:hover{border-color:var(--color-panel-muted);background:var(--color-panel-control-hover)}.panel-action-button{border-color:var(--color-panel-accent);background:var(--color-panel-accent);min-height:40px;color:var(--color-panel);border-radius:7px;flex:none;padding:0 10px;font-size:11px;font-weight:700}.panel-action-button:hover{border-color:var(--color-panel-text);background:var(--color-panel-text)}.panel-quiet-button{border-color:var(--color-panel-line);background:var(--color-panel-control);min-width:42px;min-height:30px;color:var(--color-panel-muted);border-radius:6px;padding:2px 7px;font-size:10px;font-weight:500}.panel-icon-button:focus-visible,.panel-action-button:focus-visible,.panel-quiet-button:focus-visible,.panel-segment:focus-visible,.panel-range:focus-visible{outline:2px solid var(--color-panel-accent);outline-offset:3px}.panel-icon-button:active,.panel-action-button:active,.panel-quiet-button:active,.panel-segment:active{transform:translateY(1px)}.panel-icon-button:disabled,.panel-action-button:disabled,.panel-quiet-button:disabled,.panel-segment:disabled{cursor:not-allowed;opacity:.55}.panel-scroll{overscroll-behavior:contain;scrollbar-color:var(--color-panel-border) var(--color-panel-console);scrollbar-width:thin;max-height:min(78vh,720px);overflow:auto}.panel-analysis{border:1px solid var(--color-panel-line);background:var(--color-panel-card);border-radius:9px;margin:10px 10px 4px;padding:10px 11px 9px 13px;position:relative}.panel-analysis:before{background:var(--color-panel-accent);content:\"\";border-radius:0 3px 3px 0;width:2px;position:absolute;inset:9px auto 9px 0}.panel-analysis-heading,.panel-setting-heading,.panel-activity-heading{justify-content:space-between;align-items:center;gap:10px;display:flex}.panel-eyebrow,.panel-setting-heading,.panel-method legend{color:var(--color-panel-muted);font-size:11px}.panel-evaluation,.panel-setting-heading output{color:var(--color-panel-accent);font-variant-numeric:tabular-nums;font-size:11px;font-weight:650}.panel-best-move{color:var(--color-panel-text);font-family:var(--font-mono);font-variant-numeric:tabular-nums;letter-spacing:.035em;margin-top:1px;font-size:24px;font-weight:650;line-height:1.25}.panel-line{color:var(--color-panel-muted);font-family:var(--font-mono);text-overflow:ellipsis;white-space:nowrap;margin-top:4px;font-size:10px;overflow:hidden}.panel-recovery{border-top:1px solid var(--color-panel-line);color:var(--color-panel-muted);grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;margin-top:9px;padding-top:9px;font-size:11px;display:grid}.panel-recovery[data-kind=resume]{color:var(--color-panel-warning)}.panel-recovery[data-kind=retry]{color:var(--color-panel-error)}.panel-controls{padding:6px 14px 12px}.panel-section-heading{color:var(--color-panel-muted);letter-spacing:.075em;text-transform:uppercase;margin:1px 0 3px;font-size:10px;font-weight:700}.panel-toggle-list{gap:0;display:grid}.panel-toggle{min-height:44px;color:var(--color-panel-text);cursor:pointer;justify-content:space-between;align-items:center;gap:12px;font-size:12px;display:flex}.panel-switch{flex:none;justify-content:center;align-items:center;width:44px;height:38px;display:inline-flex;position:relative}.panel-switch-input{z-index:1;cursor:pointer;opacity:0;width:100%;height:100%;margin:0;position:absolute;inset:0}.panel-switch-track{border:1px solid var(--color-panel-border);background:var(--color-panel-control-hover);border-radius:999px;width:34px;height:19px}.panel-switch-thumb{background:var(--color-panel-muted);width:13px;height:13px;box-shadow:0 1px 2px var(--color-panel-shadow);pointer-events:none;transition:transform var(--dur-short) var(--ease-out);border-radius:50%;position:absolute;top:50%;left:7px;transform:translateY(-50%)}.panel-switch-input:checked~.panel-switch-track{border-color:var(--color-panel-good);background:#7b9260}@supports (color:color-mix(in lab, red, red)){.panel-switch-input:checked~.panel-switch-track{background:color-mix(in oklab, var(--color-panel-good) 62%, var(--color-panel-control))}}.panel-switch-input:checked~.panel-switch-thumb{background:var(--color-panel-text);transform:translate(15px,-50%)}.panel-switch-input:focus-visible~.panel-switch-track{outline:2px solid var(--color-panel-accent);outline-offset:3px}.panel-switch-input:disabled~.panel-switch-track,.panel-switch-input:disabled~.panel-switch-thumb{cursor:not-allowed;opacity:.55}.panel-slider{padding-top:8px}.panel-range{appearance:none;cursor:pointer;width:100%;height:27px;accent-color:var(--color-panel-accent);background:0 0;margin:0;display:block}.panel-range::-webkit-slider-runnable-track{background:var(--color-panel-border);border-radius:3px;height:3px}.panel-range::-moz-range-track{background:var(--color-panel-border);border-radius:3px;height:3px}.panel-range::-webkit-slider-thumb{appearance:none;border:2px solid var(--color-panel);background:var(--color-panel-accent);width:13px;height:13px;box-shadow:0 0 0 1px var(--color-panel-muted);border-radius:50%;margin-top:-5px}.panel-range::-moz-range-thumb{border:2px solid var(--color-panel);background:var(--color-panel-accent);width:13px;height:13px;box-shadow:0 0 0 1px var(--color-panel-muted);border-radius:50%}.panel-method{border:0;justify-content:space-between;align-items:center;gap:10px;min-width:0;margin:7px 0 0;padding:0;display:flex}.panel-method legend{float:left;padding:0}.panel-segmented{border:1px solid var(--color-panel-line);background:var(--color-panel-console);border-radius:7px;flex:none;gap:3px;padding:3px;display:flex}.panel-segment{min-width:52px;min-height:38px;color:var(--color-panel-muted);background:0 0;border-color:#0000;border-radius:5px;padding:3px 8px;font-size:11px}.panel-segment[aria-pressed=true]{border-color:var(--color-panel-border);background:var(--color-panel-control-hover);color:var(--color-panel-text)}.panel-activity{border-top:1px solid var(--color-panel-line);background:var(--color-panel-console)}.panel-activity-heading{min-height:34px;color:var(--color-panel-muted);padding:3px 11px;font-size:11px;font-weight:650}.panel-activity-actions{gap:5px;display:flex}.panel-log{overscroll-behavior:contain;scrollbar-color:var(--color-panel-border) var(--color-panel-console);scrollbar-width:thin;flex-direction:column;gap:3px;min-height:54px;max-height:128px;padding:5px 11px 10px;display:flex;overflow:auto}.panel-log:focus-visible{outline:2px solid var(--color-panel-accent);outline-offset:-2px}.panel-log-empty{color:var(--color-panel-muted);opacity:.78;margin:0;font-size:10px;line-height:1.5}.panel-log-entry{overflow-wrap:anywhere;grid-template-columns:48px minmax(0,1fr);gap:7px;margin:0;font-size:10px;line-height:1.45;display:grid}.panel-log-entry time{color:var(--color-panel-muted);font-variant-numeric:tabular-nums;opacity:.78}.log-text-info,.log-text-move{color:var(--color-panel-good)}.log-text-status{color:var(--color-panel-muted)}.log-text-error{color:var(--color-panel-error)}.log-text-warn{color:var(--color-panel-warning)}.log-text-opponent{color:var(--color-panel-opponent)}@media (width<=360px){.panel-analysis{margin-left:8px;margin-right:8px}.panel-controls{padding-left:11px;padding-right:11px}.panel-method{gap:5px}.panel-method legend{font-size:10px}}@media (prefers-reduced-motion:reduce){.panel-icon-button,.panel-action-button,.panel-quiet-button,.panel-segment,.panel-switch-track,.panel-switch-thumb{transition-duration:1ms}}@property --tw-translate-x{syntax:\"*\";inherits:false;initial-value:0}@property --tw-translate-y{syntax:\"*\";inherits:false;initial-value:0}@property --tw-translate-z{syntax:\"*\";inherits:false;initial-value:0}@property --tw-rotate-x{syntax:\"*\";inherits:false}@property --tw-rotate-y{syntax:\"*\";inherits:false}@property --tw-rotate-z{syntax:\"*\";inherits:false}@property --tw-skew-x{syntax:\"*\";inherits:false}@property --tw-skew-y{syntax:\"*\";inherits:false}@property --tw-border-style{syntax:\"*\";inherits:false;initial-value:solid}@property --tw-leading{syntax:\"*\";inherits:false}@property --tw-font-weight{syntax:\"*\";inherits:false}@property --tw-ordinal{syntax:\"*\";inherits:false}@property --tw-slashed-zero{syntax:\"*\";inherits:false}@property --tw-numeric-figure{syntax:\"*\";inherits:false}@property --tw-numeric-spacing{syntax:\"*\";inherits:false}@property --tw-numeric-fraction{syntax:\"*\";inherits:false}@property --tw-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:\"*\";inherits:false}@property --tw-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:\"*\";inherits:false}@property --tw-inset-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:\"*\";inherits:false}@property --tw-ring-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:\"*\";inherits:false}@property --tw-inset-ring-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:\"*\";inherits:false}@property --tw-ring-offset-width{syntax:\"<length>\";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:\"*\";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:\"*\";inherits:false;initial-value:solid}@property --tw-blur{syntax:\"*\";inherits:false}@property --tw-brightness{syntax:\"*\";inherits:false}@property --tw-contrast{syntax:\"*\";inherits:false}@property --tw-grayscale{syntax:\"*\";inherits:false}@property --tw-hue-rotate{syntax:\"*\";inherits:false}@property --tw-invert{syntax:\"*\";inherits:false}@property --tw-opacity{syntax:\"*\";inherits:false}@property --tw-saturate{syntax:\"*\";inherits:false}@property --tw-sepia{syntax:\"*\";inherits:false}@property --tw-drop-shadow{syntax:\"*\";inherits:false}@property --tw-drop-shadow-color{syntax:\"*\";inherits:false}@property --tw-drop-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:\"*\";inherits:false}@property --tw-backdrop-blur{syntax:\"*\";inherits:false}@property --tw-backdrop-brightness{syntax:\"*\";inherits:false}@property --tw-backdrop-contrast{syntax:\"*\";inherits:false}@property --tw-backdrop-grayscale{syntax:\"*\";inherits:false}@property --tw-backdrop-hue-rotate{syntax:\"*\";inherits:false}@property --tw-backdrop-invert{syntax:\"*\";inherits:false}@property --tw-backdrop-opacity{syntax:\"*\";inherits:false}@property --tw-backdrop-saturate{syntax:\"*\";inherits:false}@property --tw-backdrop-sepia{syntax:\"*\";inherits:false}";
	var n$1;
	var t$2;
	var i$2;
	var r$2;
	var u$3;
	var f$3;
	var o$3;
	var e$2;
	var l$3;
	var c$2;
	var a$2;
	var h$3 = {};
	var p$3 = [];
	var v$2 = /^m(i|n|o|s|text|space)$/;
	var y$3 = Array.isArray;
	var d$3 = p$3.slice;
	var w$2 = Object.assign;
	function _$3(n) {
		n && n.parentNode && n.remove();
	}
	function b$3(i, r, u, f, o) {
		var e = {
			type: i,
			props: r,
			key: u,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: o || ++t$2,
			__i: -1,
			__u: 0
		};
		return !o && n$1.vnode && n$1.vnode(e), e;
	}
	function M(n) {
		return n.children;
	}
	function $(n, t) {
		this.props = n, this.context = t, this.__g = 0;
	}
	function x$2(n, t) {
		if (null == t) return n.__ ? x$2(n.__, n.__i + 1) : null;
		for (var i; t < n.__k.length; t++) if ((i = n.__k[t]) && i.__e) return i.__e;
		return "function" != typeof n.type || n.props.__P ? null : x$2(n);
	}
	function S$1(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), S$1(n);
	}
	function C$1(t) {
		(8 & t.__g || !(t.__g |= 8) || !r$2.push(t) || f$3++) && u$3 == n$1.debounceRendering || ((u$3 = n$1.debounceRendering) || queueMicrotask)(j$1);
	}
	function j$1() {
		var t, i, u, e, l, c, a, s, h;
		try {
			for (i = 1; r$2.length;) r$2.length > i && r$2.sort(o$3), t = r$2.shift(), i = r$2.length, 8 & t.__g && (e = void 0, l = void 0, c = (l = (u = t).__v).__e, a = [], s = [], (h = u.__P) && ((e = w$2({ constructor: void 0 }, l)).__v = l.__v + 1, n$1.vnode && n$1.vnode(e), N(h, e, l, u.__n, h.namespaceURI, 32 & l.__u ? [c] : null, a, c || x$2(l), 32 & l.__u, s), e.__v = l.__v, e.__.__k[e.__i] = e, z$1(a, e, s), l.__ = l.__e = null, e.__e != c && S$1(e)));
		} finally {
			r$2.length = f$3 = 0;
		}
	}
	function L(n, t, i, r, u, f, o, e, l, c, a) {
		var s, v, y, d, w, _, g = r.__k || p$3, k = t.length;
		for (l = H(i, t, g, l, k), s = 0; s < k; s++) null != (y = i.__k[s]) && (v = ~y.__i && g[y.__i] || h$3, y.__i = s, _ = N(n, y, v, u, f, o, e, l, c, a), d = y.__e, (v.ref != y.ref || 8 & v.__u) && (v.ref && D$1(v.ref, null, y, v), y.ref && a.push(y.ref, y.__c || d, y)), w = w || d, 4 & y.__u ? (l = I(y, l, n, !v.__v), v.__e && (v.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : d && (l = d.nextSibling), y.__u &= -7);
		return i.__e = w, l;
	}
	function H(n, t, i, r, u) {
		var f, o, e, l, c, a, s, h, p, v, d = i.length, w = d, _ = 0, g = !1, k = n.__k = Array(u);
		for (f = 0; f < u; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor == String ? o = k[f] = b$3(null, o) : y$3(o) ? o = k[f] = b$3(M, { children: o }) : void 0 === o.constructor && o.__b ? o = k[f] = b$3(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = O(o, i, l, w)) && (w--, (e = i[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 2, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = !0)) : (~c || (u > d ? _-- : u < d && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < u; f++) if ((o = k[f]) && 2 & o.__u) {
				for (h = 0, p = a.length; h < p;) a[v = h + p >> 1] < o.__i ? h = v + 1 : p = v;
				a[h] = o.__i, s[f] = h + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (w) for (f = 0; f < d; f++) !(e = i[f]) || 2 & e.__u || (e.__e == r && (r = x$2(e)), E$2(e, e));
		return r;
	}
	function I(n, t, i, r) {
		var u, f, o;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = I(u[f], t, i, !1));
			return t;
		}
		for (t && !t.parentNode && (t = x$2(n)) && !t.parentNode && (t = null), o = t; o && 8 == o.nodeType;) o = o.nextSibling;
		for (n.__e != o && (!r && i.moveBefore && n.__e.parentNode ? i.moveBefore(n.__e, t) : i.insertBefore(n.__e, t || null)), t = n.__e; (t = t && t.nextSibling) && 8 == t.nodeType;);
		return t;
	}
	function O(n, t, i, r) {
		var u, f, o, e = n.key, l = n.type, c = t[i], a = c && !(2 & c.__u);
		if (null === c && null == e || a && e == c.key && l == c.type) return i;
		if (r > (a ? 1 : 0)) {
			for (u = i - 1, f = i + 1; u >= 0 || f < t.length;) if ((c = t[o = u >= 0 ? u-- : f++]) && !(2 & c.__u) && e == c.key && l == c.type) return o;
		}
		return -1;
	}
	function P(n, t, i) {
		i ??= "", "-" == t[0] ? n.setProperty(t, i) : n[t] = i;
	}
	function T$1(n, t, i, r, u) {
		var f, o;
		n: if ("style" == t) if ("string" == typeof i) n.style.cssText = i;
		else {
			if ("string" == typeof r && (n.style.cssText = r = ""), r) for (t in r) i && t in i || P(n.style, t, "");
			if (i) for (t in i) r && i[t] == r[t] || P(n.style, t, i[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = i, i && r || (o = a$2[t] || (a$2[t] = q$1(t)), (n.__a || (n.__a = {}))[t] = c$2, f = t != (t = t.replace(l$3, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), i ? n.addEventListener(t, o, f) : n.removeEventListener(t, o, f));
		else {
			if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == i ? "" : i;
				break n;
			} catch (n) {}
			"function" == typeof i || (null == i || !1 === i && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == i ? "" : i));
		}
	}
	function q$1(t) {
		return function(i) {
			if (this.__e) {
				var r = this.__e[t];
				if (null == i[e$2]) i[e$2] = c$2++;
				else if (i[e$2] < this.__a[t]) return;
				return r(n$1.event ? n$1.event(i) : i);
			}
		};
	}
	function N(t, i, r, u, f, o, e, l, c, a) {
		var s, h, v, d, g, k, b, m, S, C, j, H, I, A, O, P, T, q, N, z, D = i.type;
		if (void 0 !== i.constructor) return null;
		if (128 & r.__u && (c = 32 & r.__u, s = r.__c.__z)) {
			if (i.__u |= c, h = o = [], 8 == s.nodeType) for (v = 1, d = s.nextSibling; d; d = d.nextSibling) {
				if (8 == d.nodeType) {
					if (d.data.startsWith("$s")) v++;
					else if (d.data.startsWith("/$s") && !--v) break;
				}
				o.push(d);
			}
			else o.push(s);
			l = o[0];
		}
		(s = n$1.__b) && s(i);
		n: if ("function" == typeof D) {
			g = e.length;
			try {
				if (C = i.props, j = (s = D.prototype) && s.render, H = (s = D.contextType) && u[s.__c], I = s ? H ? H.props.value : s.__ : u, r.__c ? 2 & (k = i.__c = r.__c).__g && (k.__g |= 1) : (j ? i.__c = k = new D(C, I) : (i.__c = k = new $(C, I), k.constructor = D, k.render = F$1), H && H.sub(k), k.state || (k.state = {}), k.__n = u, k.__g |= 8, k.__h = [], k.__k = []), j && (k.__s || (k.__s = k.state), D.getDerivedStateFromProps && (k.__s == k.state && (k.__s = w$2({}, k.__s)), w$2(k.__s, D.getDerivedStateFromProps(C, k.__s)))), b = k.props, m = k.state, k.__v = i, r.__c) {
					if (j && !D.getDerivedStateFromProps && C !== b && k.componentWillReceiveProps && k.componentWillReceiveProps(C, I), i.__v == r.__v && !(8 & k.__g) || !(4 & k.__g) && k.shouldComponentUpdate && !1 === k.shouldComponentUpdate(C, k.__s, I)) {
						i.__v != r.__v && (k.props = C, k.state = k.__s, k.__g &= -9), i.__e = r.__e, i.__k = r.__k, i.__k.some(function(n) {
							n && (n.__ = i);
						}), p$3.push.apply(k.__h, k.__k), k.__k = [], k.__h.length && e.push(k), l = x$2(r);
						break n;
					}
					k.componentWillUpdate && k.componentWillUpdate(C, k.__s, I), j && k.componentDidUpdate && k.__h.push(function() {
						k.componentDidUpdate(b, m, S);
					});
				} else j && !D.getDerivedStateFromProps && k.componentWillMount && k.componentWillMount(), j && k.componentDidMount && k.__h.push(k.componentDidMount);
				if (k.context = I, k.props = C, k.__P = t, k.__g &= -5, A = n$1.__r, O = 0, j) k.state = k.__s, k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), p$3.push.apply(k.__h, k.__k), k.__k = [];
				else do
					k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), k.state = k.__s;
				while (8 & k.__g && ++O < 25);
				k.state = k.__s, k.getChildContext && (u = w$2({}, u, k.getChildContext())), j && r.__c && k.getSnapshotBeforeUpdate && (S = k.getSnapshotBeforeUpdate(b, m)), P = s && s.type === M && null == s.key ? s.props.children : s, C.__P && (s = l, f = (t = C.__P).namespaceURI, c = o = null, r.props && r.props.__P != t && (r.__k.some(function(n) {
					n && E$2(n, n);
				}), r.__k = null), l = r.__k ? x$2(r, 0) : null), l = L(t, y$3(P) ? P : [P], i, r, u, f, o, e, l, c, a), C.__P && (i.__e = null, l = s), i.__u &= -161, 128 & r.__u && (k.__z = null), h && h.some(_$3), k.__h.length && e.push(k), 1 & k.__g && (k.__g &= -4);
			} catch (t) {
				if (e.length = g, i.__v = null, c || o) if (t.then) {
					if (T = 0, i.__u |= c ? 160 : 128, o) {
						for (~(N = o.indexOf(l || void 0)) || (N = o.length); (z = o[N - 1]) && 8 == z.nodeType;) N--;
						for (; N < o.length; N++) if (z = o[N]) {
							if (o[N] = null, 8 == z.nodeType) {
								if (z.data.startsWith("$s")) T++ || (q = z);
								else if (T && z.data.startsWith("/$s") && !--T) {
									l = z;
									break;
								}
							} else if (!T) break;
						}
					}
					if (!q) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						q = l;
					}
					i.__c.__z || (i.__c.__z = q), i.__e = l;
				} else o && o.some(_$3);
				else i.__e = r.__e;
				i.__k || (i.__k = r.__k || []), t.then || V(i), n$1.__e(t, i, r);
			}
		} else l = i.__e = B$1(r.__e, i, r, u, f, o, e, c, a, t);
		return (s = n$1.diffed) && s(i), 128 & i.__u ? void 0 : l;
	}
	function V(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(V));
	}
	function z$1(t, i, r) {
		for (var u = 0; u < r.length;) D$1(r[u++], r[u++], r[u++]);
		n$1.__c && n$1.__c(i, t), t.some(function(i) {
			try {
				t = i.__h, i.__h = [], t.some(function(n) {
					n.call(i);
				});
			} catch (t) {
				n$1.__e(t, i.__v);
			}
		});
	}
	function B$1(t, i, r, u, f, o, e, l, c, a) {
		var s, p, w, g, k, b, m, M, $, S = r.props || h$3, C = i.props, j = i.type;
		if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
			for (s = 0; s < o.length; s++) if ((k = o[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
				t = k, o[s] = null;
				break;
			}
		}
		if (!t) {
			if (M = a.ownerDocument || document, !j) return M.createTextNode(C);
			t = M.createElementNS(f, j, C.is && C), l && (n$1.__m && n$1.__m(i, o), l = !1), o = null;
		}
		if (j) {
			if (a = "template" == j ? t.content : t, o = "textarea" == j && null != C.defaultValue ? null : o && d$3.call(a.childNodes), !l && o) for (S = {}, s = 0; s < t.attributes.length; s++) S[(k = t.attributes[s]).name] = k.value;
			for (s in S) k = S[s], "dangerouslySetInnerHTML" == s ? w = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T$1(t, s, null, k, f);
			for (s in $ = 1 & r.__u, C) k = C[s], "children" == s ? g = k : "dangerouslySetInnerHTML" == s ? p = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(S[s] !== k || $ && null != k) || T$1(t, s, k, S[s], f);
			p ? (l || w && (p.__html == w.__html || p.__html == t.innerHTML) || (t.innerHTML = p.__html), i.__k = []) : (w && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && v$2.test(j)) && (f = "http://www.w3.org/1999/xhtml"), L(a, y$3(g) ? g : [g], i, r, u, f, o, e, o ? o[0] : r.__k && x$2(r, 0), l, c), o && o.some(_$3)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T$1(t, s, b, S[s], f), s = "checked", null != m && m != t[s] && T$1(t, s, m, S[s], f));
		} else S === C || l && t.data == C || (t.data = C);
		return t;
	}
	function D$1(t, i, r, u) {
		try {
			"function" == typeof t ? i ? i.__x = t(i) || 1 : u && (u = u.__c || u.__e) && (i = u.__x) && (u.__x = null, "function" == typeof i ? i() : t(null)) : t.current = i;
		} catch (t) {
			n$1.__e(t, r);
		}
	}
	function E$2(t, i, r) {
		var u, f;
		if (n$1.unmount && n$1.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || D$1(u, null, i, t), u = t.__c) {
			if (u.componentWillUnmount) try {
				u.componentWillUnmount();
			} catch (t) {
				n$1.__e(t, i);
			}
			u.__P = u.__n = null;
		}
		if (u = t.__k) for (f = 0; f < u.length; f++) u[f] && E$2(u[f], i, "function" != typeof t.type || r && !t.props.__P);
		(u = t.__e) && (r || _$3(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
	}
	function F$1(n, t, i) {
		return this.constructor(n, i);
	}
	function G$1(t, i) {
		var r, u, f, o;
		n$1.__ && n$1.__(t, i), 9 == i.nodeType && (i = i.documentElement), u = (r = t && 32 & t.__u) ? null : i.__k, i.__k = b$3(M, { children: [t] }), f = [], o = [], N(i, i.__k, u || h$3, h$3, i.namespaceURI, u ? null : i.firstChild ? d$3.call(i.childNodes) : null, f, u ? u.__e : i.firstChild, r, o), z$1(f, i.__k, o), i.__k.props.children = null;
	}
	n$1 = { __e: function(n, t, i, r) {
		for (var u, o, e; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
			u.__g |= 4;
			try {
				if ((o = u.constructor) && o.getDerivedStateFromError && (u.setState(o.getDerivedStateFromError(n)), e = 8 & u.__g), u.componentDidCatch && (u.componentDidCatch(n, r || {}), e = 8 & u.__g), e) return void (u.__g |= 2);
			} catch (t) {
				n = t, e = 0;
			}
		}
		throw f$3 = 0, n;
	} }, t$2 = 0, i$2 = function(n) {
		return null != n && void 0 === n.constructor;
	}, $.prototype.setState = function(n, t) {
		var i = this.__s;
		i && i != this.state || (i = this.__s = w$2({}, this.state)), "function" == typeof n && (n = n(w$2({}, i), this.props)), n && (w$2(i, n), this.__v && (t && this.__k.push(t), C$1(this)));
	}, $.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), C$1(this));
	}, $.prototype.render = M, r$2 = [], f$3 = 0, o$3 = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, e$2 = Symbol(), l$3 = /(PointerCapture)$|Capture$/i, c$2 = 0, a$2 = {};
	var t$1;
	var r$1;
	var u$2;
	var i$1;
	var o$2 = Object.is;
	var f$2 = 0;
	var c$1 = [];
	var e$1 = [];
	var a$1 = n$1;
	var v$1 = a$1.__b;
	var l$2 = a$1.__r;
	var m$1 = a$1.diffed;
	var s$1 = a$1.__c;
	var h$2 = a$1.unmount;
	var p$2 = a$1.__;
	function y$2(n, t) {
		a$1.__h && a$1.__h(r$1, n, f$2 || t), f$2 = 0;
		var u = r$1.__H || (r$1.__H = {
			__: [],
			__h: []
		});
		return n >= u.__.length && u.__.push({}), u.__[n];
	}
	function d$2(n) {
		return f$2 = 1, _$2(G, n);
	}
	function _$2(n, u, i) {
		var f = y$2(t$1++, 2);
		if (f.t = n, !f.__c && (f.__ = [i ? i(u) : G(void 0, u), function(n) {
			var t = f.__N ? f.__N[0] : f.__[0], r = f.t(t, n);
			o$2(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
		}], f.__c = r$1, !r$1.__f)) {
			r$1.__f = !0;
			var c = r$1.shouldComponentUpdate;
			r$1.shouldComponentUpdate = function(n, t, r) {
				var u = this.__H;
				if (!u) return !0;
				var i = !1, f = this.props != n;
				if (u.__.some(function(n) {
					n.__N && (i = !0, o$2(n.__[0], n.__N[0]) || (f = !0));
				}), c) {
					var e = c.call(this, n, t, r);
					return i ? e || f : e;
				}
				return !i || f;
			};
		}
		return f.__;
	}
	function A(n, u) {
		var i = y$2(t$1++, 3);
		!a$1.__s && E$1(i.__H, u) && (i.__P = !0, i.__ = n, i.u = u, r$1.__H.__h.push(i));
	}
	function T(n) {
		return f$2 = 5, b$2(function() {
			return { current: n };
		}, []);
	}
	function b$2(n, r) {
		var u = y$2(t$1++, 7);
		return E$1(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
	}
	function g$2() {
		var n;
		do {
			for (; n = e$1.shift();) try {
				C(n);
			} catch (t) {
				a$1.__e(t, { __: (n = n.__P) && n.__v });
			}
			for (; n = c$1.shift();) {
				var t = n.__H;
				if (n.__P && t) try {
					t.__h.some(C), t.__h.some(D), t.__h = [];
				} catch (r) {
					t.__h = [], a$1.__e(r, n.__v);
				}
			}
		} while (e$1.length);
	}
	a$1.__b = function(n) {
		r$1 = null, v$1 && v$1(n);
	}, a$1.__ = function(n, t) {
		n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p$2 && p$2(n, t);
	}, a$1.__r = function(n) {
		l$2 && l$2(n), t$1 = 0;
		var i = (r$1 = n.__c).__H;
		i && (u$2 == r$1 ? r$1.__h = [] : (i.__h.some(C), i.__h.some(D), t$1 = 0), i.__h = [], i.__.some(function(n) {
			n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
		})), u$2 = r$1;
	}, a$1.diffed = function(n) {
		m$1 && m$1(n);
		var t = n.__c;
		t && t.__H && (t.__H.__h.length && B(c$1.push(t)), t.__H.__.some(function(n) {
			n.u && (n.__H = n.u);
		})), u$2 = r$1 = null;
	}, a$1.__c = function(n, t) {
		t.some(function(n) {
			try {
				n.__h.some(C), n.__h = n.__h.filter(function(n) {
					return !n.__ || D(n);
				});
			} catch (r) {
				t.some(function(n) {
					n.__h && (n.__h = []);
				}), t = [], a$1.__e(r, n.__v);
			}
		}), s$1 && s$1(n, t);
	}, a$1.unmount = function(n) {
		h$2 && h$2(n);
		var t, r, u = n.__c;
		u && u.__H && (u.__H.__.some(function(u) {
			try {
				if (u.__P && u.__c) {
					if (void 0 === r) {
						for (r = n.__; r && (!r.__c || !r.__c.__P);) r = r.__;
						r = r && r.__c;
					}
					u.__P = r, B(e$1.push(u));
				} else C(u);
			} catch (n) {
				t = n;
			}
		}), u.__H = void 0, t && a$1.__e(t, u.__v));
	};
	var k = "function" == typeof requestAnimationFrame;
	function z(n) {
		var t, r = function() {
			clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
		}, u = setTimeout(r, 35);
		k && (t = requestAnimationFrame(r));
	}
	function B(n) {
		1 != n && i$1 == a$1.requestAnimationFrame || ((i$1 = a$1.requestAnimationFrame) || z)(g$2);
	}
	function C(n) {
		var t = r$1, u = n.__c;
		"function" == typeof u && (n.__c = void 0, u()), r$1 = t;
	}
	function D(n) {
		var t = r$1;
		n.__c = n.__(), r$1 = t;
	}
	function E$1(n, t) {
		return !n || n.length != t.length || t.some(function(t, r) {
			return !o$2(t, n[r]);
		});
	}
	function G(n, t) {
		return "function" == typeof t ? t(n) : t;
	}
	var i = Symbol.for("preact-signals");
	function t() {
		if (!(v > 1)) {
			var i, t = !1;
			(function() {
				var i = c;
				c = void 0;
				while (void 0 !== i) {
					var t = i.S;
					if (t.v === i.v) {
						for (var n = t.t; void 0 !== n; n = n.x) if (n.i === i.i) n.i = t.i;
					}
					i = i.o;
				}
			})();
			while (void 0 !== h$1) {
				var n = h$1;
				h$1 = void 0;
				s++;
				while (void 0 !== n) {
					var r = n.u;
					n.u = void 0;
					n.f &= -3;
					if (!(8 & n.f) && w$1(n)) try {
						n.c();
					} catch (n) {
						if (!t) {
							i = n;
							t = !0;
						}
					}
					n = r;
				}
			}
			s = 0;
			v--;
			if (t) throw i;
		} else v--;
	}
	function n(i) {
		if (v > 0) return i();
		e = ++u$1;
		v++;
		try {
			return i();
		} finally {
			t();
		}
	}
	var r;
	var o$1 = void 0;
	function f$1(i) {
		var t = o$1, n = r;
		o$1 = void 0;
		r = void 0;
		try {
			return i();
		} finally {
			o$1 = t;
			r = n;
		}
	}
	var h$1 = void 0;
	var v = 0;
	var s = 0;
	var u$1 = 0;
	var e = 0;
	var c = void 0;
	var d$1 = 0;
	function a(i) {
		if (void 0 !== o$1) {
			var t = i.n;
			if (void 0 === t || t.t !== o$1) {
				t = {
					i: 0,
					S: i,
					p: o$1.s,
					n: void 0,
					t: o$1,
					e: void 0,
					x: void 0,
					r: t
				};
				if (void 0 !== o$1.s) o$1.s.n = t;
				o$1.s = t;
				i.n = t;
				if (32 & o$1.f) i.S(t);
				return t;
			} else if (-1 === t.i) {
				t.i = 0;
				if (void 0 !== t.n) {
					t.n.p = t.p;
					if (void 0 !== t.p) t.p.n = t.n;
					t.p = o$1.s;
					t.n = void 0;
					o$1.s.n = t;
					o$1.s = t;
				}
				return t;
			}
		}
	}
	function l$1(i, t) {
		this.v = i;
		this.i = 0;
		this.n = void 0;
		this.t = void 0;
		this.l = 0;
		this.W = null == t ? void 0 : t.watched;
		this.Z = null == t ? void 0 : t.unwatched;
		this.name = null == t ? void 0 : t.name;
	}
	l$1.prototype.brand = i;
	l$1.prototype.h = function() {
		return !0;
	};
	l$1.prototype.S = function(i) {
		var t = this, n = this.t;
		if (n !== i && void 0 === i.e) {
			i.x = n;
			this.t = i;
			if (void 0 !== n) n.e = i;
			else f$1(function() {
				var i;
				null == (i = t.W) || i.call(t);
			});
		}
	};
	l$1.prototype.U = function(i) {
		var t = this;
		if (void 0 !== this.t) {
			var n = i.e, r = i.x;
			if (void 0 !== n) {
				n.x = r;
				i.e = void 0;
			}
			if (void 0 !== r) {
				r.e = n;
				i.x = void 0;
			}
			if (i === this.t) {
				this.t = r;
				if (void 0 === r) f$1(function() {
					var i;
					null == (i = t.Z) || i.call(t);
				});
			}
		}
	};
	l$1.prototype.subscribe = function(i) {
		var t = this;
		return j(function() {
			var n = t.value;
			f$1(function() {
				return i(n);
			});
		}, { name: "sub" });
	};
	l$1.prototype.valueOf = function() {
		return this.value;
	};
	l$1.prototype.toString = function() {
		return this.value + "";
	};
	l$1.prototype.toJSON = function() {
		return this.value;
	};
	l$1.prototype.peek = function() {
		var i = this;
		return f$1(function() {
			return i.value;
		});
	};
	Object.defineProperty(l$1.prototype, "value", {
		get: function() {
			var i = a(this);
			if (void 0 !== i) i.i = this.i;
			return this.v;
		},
		set: function(i) {
			if (i !== this.v) {
				if (s > 100) throw new Error("Cycle detected");
				(function(i) {
					if (0 !== v && 0 === s) {
						if (i.l !== e) {
							i.l = e;
							c = {
								S: i,
								v: i.v,
								i: i.i,
								o: c
							};
						}
					}
				})(this);
				this.v = i;
				this.i++;
				d$1++;
				v++;
				try {
					for (var n = this.t; void 0 !== n; n = n.x) n.t.N();
				} finally {
					t();
				}
			}
		}
	});
	function y$1(i, t) {
		return new l$1(i, t);
	}
	function w$1(i) {
		for (var t = i.s; void 0 !== t; t = t.n) if (t.S.i !== t.i || !t.S.h() || t.S.i !== t.i) return !0;
		return !1;
	}
	function _$1(i) {
		for (var t = i.s; void 0 !== t; t = t.n) {
			var n = t.S.n;
			if (void 0 !== n) t.r = n;
			t.S.n = t;
			t.i = -1;
			if (void 0 === t.n) {
				i.s = t;
				break;
			}
		}
	}
	function b$1(i) {
		var t = i.s, n = void 0;
		while (void 0 !== t) {
			var r = t.p;
			if (-1 === t.i) {
				t.S.U(t);
				if (void 0 !== r) r.n = t.n;
				if (void 0 !== t.n) t.n.p = r;
			} else n = t;
			t.S.n = t.r;
			if (void 0 !== t.r) t.r = void 0;
			t = r;
		}
		i.s = n;
	}
	function p$1(i, t) {
		l$1.call(this, void 0, t);
		this.x = i;
		this.s = void 0;
		this.g = d$1 - 1;
		this.f = 4;
	}
	p$1.prototype = new l$1();
	p$1.prototype.h = function() {
		this.f &= -3;
		if (1 & this.f) return !1;
		if (32 == (36 & this.f)) return !0;
		this.f &= -5;
		if (this.g === d$1) return !0;
		this.g = d$1;
		this.f |= 1;
		if (this.i > 0 && !w$1(this)) {
			this.f &= -2;
			return !0;
		}
		var i = o$1;
		try {
			_$1(this);
			o$1 = this;
			var t = this.x();
			if (16 & this.f || this.v !== t || 0 === this.i) {
				this.v = t;
				this.f &= -17;
				this.i++;
			}
		} catch (i) {
			this.v = i;
			this.f |= 16;
			this.i++;
		}
		o$1 = i;
		b$1(this);
		this.f &= -2;
		return !0;
	};
	p$1.prototype.S = function(i) {
		if (void 0 === this.t) {
			this.f |= 36;
			for (var t = this.s; void 0 !== t; t = t.n) t.S.S(t);
		}
		l$1.prototype.S.call(this, i);
	};
	p$1.prototype.U = function(i) {
		if (void 0 !== this.t) {
			l$1.prototype.U.call(this, i);
			if (void 0 === this.t) {
				this.f &= -33;
				for (var t = this.s; void 0 !== t; t = t.n) t.S.U(t);
			}
		}
	};
	p$1.prototype.N = function() {
		if (!(2 & this.f)) {
			this.f |= 6;
			for (var i = this.t; void 0 !== i; i = i.x) i.t.N();
		}
	};
	Object.defineProperty(p$1.prototype, "value", { get: function() {
		if (1 & this.f) throw new Error("Cycle detected");
		var i = a(this);
		this.h();
		if (void 0 !== i) i.i = this.i;
		if (16 & this.f) throw this.v;
		return this.v;
	} });
	function g$1(i, t) {
		return new p$1(i, t);
	}
	function S(i) {
		var n = i.m;
		i.m = void 0;
		if ("function" == typeof n) {
			v++;
			var r = o$1;
			o$1 = void 0;
			try {
				n();
			} catch (t) {
				i.f &= -2;
				i.f |= 8;
				m(i);
				throw t;
			} finally {
				o$1 = r;
				t();
			}
		}
	}
	function m(i) {
		for (var t = i.s; void 0 !== t; t = t.n) t.S.U(t);
		i.x = void 0;
		i.s = void 0;
		S(i);
	}
	function x$1(i) {
		if (o$1 !== this) throw new Error("Out-of-order effect");
		b$1(this);
		o$1 = i;
		this.f &= -2;
		if (8 & this.f) m(this);
		t();
	}
	function E(i, t) {
		this.x = i;
		this.m = void 0;
		this.s = void 0;
		this.u = void 0;
		this.f = 32;
		this.name = null == t ? void 0 : t.name;
		if (r) r.push(this);
	}
	E.prototype.c = function() {
		var i = this.S();
		try {
			if (8 & this.f) return;
			if (void 0 === this.x) return;
			var t = this.x();
			if ("function" == typeof t) this.m = t;
		} finally {
			i();
		}
	};
	E.prototype.S = function() {
		if (1 & this.f) throw new Error("Cycle detected");
		this.f |= 1;
		this.f &= -9;
		S(this);
		_$1(this);
		v++;
		var i = o$1;
		o$1 = this;
		return x$1.bind(this, i);
	};
	E.prototype.N = function() {
		if (!(2 & this.f)) {
			this.f |= 2;
			this.u = h$1;
			h$1 = this;
		}
	};
	E.prototype.d = function() {
		this.f |= 8;
		if (!(1 & this.f)) m(this);
	};
	E.prototype.dispose = function() {
		this.d();
	};
	function j(i, t) {
		var n = new E(i, t);
		try {
			n.c();
		} catch (i) {
			n.d();
			throw i;
		}
		var r = n.d.bind(n);
		r[Symbol.dispose] = r;
		return r;
	}
	var l;
	var d;
	var p = "undefined" != typeof window && !!window.__PREACT_SIGNALS_DEVTOOLS__;
	var _ = [];
	j(function() {
		l = this.N;
	})();
	function g(i, r) {
		n$1[i] = r.bind(null, n$1[i] || function() {});
	}
	function b(i) {
		if (d) {
			var n = d;
			d = void 0;
			n();
		}
		d = i && i.S();
	}
	function y(i) {
		var n = this, t = i.data, f = useSignal(t);
		f.name = "ReactiveDom";
		f.value = t;
		var e = b$2(function() {
			var i = n, t = n.__v;
			while (t = t.__) if (t.__c) {
				t.__c.__$f |= 4;
				break;
			}
			var o = g$1(function() {
				var i = f.value.value;
				return 0 === i ? 0 : !0 === i ? "" : i || "";
			}), e = g$1(function() {
				return !Array.isArray(o.value) && !i$2(o.value);
			}), a = j(function() {
				this.N = F;
				if (e.value) {
					var n = o.value;
					if (i.__v && i.__v.__e && 3 === i.__v.__e.nodeType) i.__v.__e.data = n;
				}
			}), v = n.__$u.d;
			n.__$u.d = function() {
				a();
				v.call(this);
			};
			return [e, o];
		}, []), a = e[0], v = e[1];
		return a.value ? v.peek() : v.value;
	}
	y.displayName = "ReactiveTextNode";
	Object.defineProperties(l$1.prototype, {
		constructor: {
			configurable: !0,
			value: void 0
		},
		type: {
			configurable: !0,
			value: y
		},
		props: {
			configurable: !0,
			get: function() {
				var i = this;
				return { data: { get value() {
					return i.value;
				} } };
			}
		},
		__b: {
			configurable: !0,
			value: 1
		}
	});
	g("__b", function(i, n) {
		b();
		if ("string" == typeof n.type) {
			var r, t = n.props;
			for (var o in t) if ("children" !== o) {
				var f = t[o];
				if (f instanceof l$1) {
					if (!r) n.__np = r = {};
					r[o] = f;
					t[o] = f.peek();
				}
			}
		}
		i(n);
	});
	g("__r", function(i, n) {
		i(n);
		if (n.type !== M) {
			b();
			var r, o = n.__c;
			if (o) {
				o.__$f &= -2;
				if (void 0 === (r = o.__$u)) o.__$u = r = function(i, n) {
					var r;
					j(function() {
						r = this;
					}, { name: n });
					r.c = i;
					return r;
				}(function(i) {
					return function() {
						var n;
						if (p) null == (n = this.y) || n.call(this);
						i.__$f |= 1;
						i.setState({});
					};
				}(o), "function" == typeof n.type ? n.type.displayName || n.type.name : "");
			}
			b(r);
		}
	});
	g("__e", function(i, n, r, t) {
		b();
		i(n, r, t);
	});
	g("diffed", function(i, n) {
		b();
		var r;
		if ("string" == typeof n.type && (r = n.__e)) {
			var t = n.__np, o = n.props, f = r.U;
			if (f) for (var e in f) {
				var u = f[e];
				if (!(void 0 === u || t && e in t)) {
					u.d();
					f[e] = void 0;
				}
			}
			if (t) {
				if (!f) {
					f = {};
					r.U = f;
				}
				for (var a in t) {
					var c = f[a], v = t[a];
					if (void 0 === c) {
						c = w(r, a, v, o);
						f[a] = c;
					} else c.o(v, o);
				}
			}
		}
		i(n);
	});
	function w(i, n, r, t) {
		var o = n in i && void 0 === i.ownerSVGElement, f = y$1(r);
		return {
			o: function(i, n) {
				f.value = i;
				t = n;
			},
			d: j(function() {
				this.N = F;
				var r = f.value.value;
				if (t[n] !== r) {
					t[n] = r;
					if (o) i[n] = r;
					else if (null != r && (!1 !== r || "-" === n[4])) i.setAttribute(n, r);
					else i.removeAttribute(n);
				}
			})
		};
	}
	g("unmount", function(i, n) {
		if ("string" == typeof n.type) {
			var r = n.__e;
			if (r) {
				var t = r.U;
				if (t) {
					r.U = void 0;
					for (var o in t) {
						var f = t[o];
						if (f) f.d();
					}
				}
			}
			var e = n.__np;
			if (e) {
				var u = n.props;
				for (var a in e) u[a] = e[a];
			}
			n.__np = void 0;
		} else {
			var c = n.__c;
			if (c) {
				c.__$f |= 8;
				var v = c.__$u;
				if (v) {
					c.__$u = void 0;
					v.d();
				}
			}
		}
		i(n);
	});
	g("__h", function(i, n, r, t) {
		if (t < 3) n.__$f |= 2;
		i(n, r, t);
	});
	$.prototype.shouldComponentUpdate = function(i, n) {
		if (this.__R) return !0;
		var r = this.__$u, t = r && void 0 !== r.s;
		for (var o in n) return !0;
		if (this.__f || "boolean" == typeof this.u && !0 === this.u) {
			var f = 2 & this.__$f;
			if (!(t || f || 4 & this.__$f)) return !0;
			if (1 & this.__$f) return !0;
		} else {
			if (!(t || 4 & this.__$f)) return !0;
			if (3 & this.__$f) return !0;
		}
		for (var e in i) if ("__source" !== e && i[e] !== this.props[e]) return !0;
		for (var u in this.props) if (!(u in i)) return !0;
		return !1;
	};
	function useSignal(i, n) {
		return b$2(function() {
			return y$1(i, n);
		}, []);
	}
	var q = function(i) {
		queueMicrotask(function() {
			queueMicrotask(i);
		});
	};
	function x() {
		n(function() {
			var i;
			while (i = _.shift()) l.call(i);
		});
	}
	function F() {
		if (1 === _.push(this)) (n$1.requestAnimationFrame || q)(x);
	}
	var o = 0;
	Array.isArray;
	function u(t, e, n, f, u, i) {
		e || (e = {});
		var a, c, l = e;
		if ("ref" in l && "function" != typeof t) for (c in l = {}, e) "ref" == c ? a = e[c] : l[c] = e[c];
		var p = {
			type: t,
			props: l,
			key: n,
			ref: a,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --o,
			__i: -1,
			__u: 0
		};
		return (u || i) && (p.__source = u, p.__self = i), n$1.vnode && n$1.vnode(p), p;
	}
	var readSettings = () => ({
		enabled: !!BotState.hackEnabled,
		autoMove: !!BotState.autoMove,
		ponder: !!BotState.ponderEnabled,
		autoRematch: !!BotState.autoRematch,
		depth: BotState.botPower,
		moveTimeMs: BotState.moveTime,
		moveMethod: BotState.moveMethod
	});
	var settingsSignal = y$1(readSettings());
	var analysisSignal = y$1({
		status: BotState.statusInfo,
		evaluation: BotState.currentEvaluation,
		bestMove: BotState.bestMove,
		principalVariation: BotState.principalVariation,
		recoveryAction: BotState.recoveryAction
	});
	var logsSignal = y$1([]);
	var nextLogId = 0;
	var logTextColor = {
		info: "log-text-info",
		status: "log-text-status",
		error: "log-text-error",
		warn: "log-text-warn",
		move: "log-text-move",
		opponent: "log-text-opponent"
	};
	function appendPanelLog(text, type = "info") {
		const entry = {
			id: ++nextLogId,
			text,
			type,
			time: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23"
			})
		};
		logsSignal.value = [...logsSignal.value, entry].slice(-100);
	}
	function clearPanelLogs() {
		logsSignal.value = [];
	}
	function syncPanelSettings() {
		const current = settingsSignal.value;
		const next = readSettings();
		if (current.enabled === next.enabled && current.autoMove === next.autoMove && current.ponder === next.ponder && current.autoRematch === next.autoRematch && current.depth === next.depth && current.moveTimeMs === next.moveTimeMs && current.moveMethod === next.moveMethod) return;
		settingsSignal.value = next;
	}
	function updatePanelAnalysis(next) {
		const current = analysisSignal.value;
		if (current.status === next.status && current.evaluation === next.evaluation && current.bestMove === next.bestMove && current.principalVariation === next.principalVariation && current.recoveryAction === next.recoveryAction) return;
		analysisSignal.value = next;
	}
	function mountPanel(root, host, actions) {
		G$1(u(Panel, {
			host,
			actions
		}), root);
	}
	function formatBudget(milliseconds) {
		return milliseconds >= 1e3 ? `${(milliseconds / 1e3).toFixed(milliseconds % 1e3 === 0 ? 0 : 1)} s` : `${milliseconds} ms`;
	}
	function statusTone(analysis, enabled) {
		if (analysis.recoveryAction === "retry") return "error";
		if (analysis.recoveryAction === "resume") return "paused";
		if (/error|failed|unavailable|not confirmed/i.test(analysis.status)) return "error";
		if (/loading|analyz|ponder|submitting|resuming/i.test(analysis.status)) return "working";
		return enabled ? "ready" : "idle";
	}
	function Toggle({ label, checked, onChange }) {
		return u("label", {
			class: "panel-toggle",
			children: [u("span", { children: label }), u("span", {
				class: "panel-switch",
				children: [
					u("input", {
						class: "panel-switch-input",
						type: "checkbox",
						checked,
						"aria-label": label,
						onChange: (event) => onChange(event.currentTarget.checked)
					}),
					u("span", {
						class: "panel-switch-track",
						"aria-hidden": "true"
					}),
					u("span", {
						class: "panel-switch-thumb",
						"aria-hidden": "true"
					})
				]
			})]
		});
	}
	function Panel({ host, actions }) {
		const settings = settingsSignal.value;
		const analysis = analysisSignal.value;
		const logs = logsSignal.value;
		const [minimized, setMinimized] = d$2(false);
		const [copied, setCopied] = d$2(false);
		const logElement = T(null);
		const stickToBottom = T(true);
		const copyTimer = T(null);
		A(() => {
			const handleKeyDown = (event) => {
				const target = event.composedPath()[0];
				if (event.key.toLowerCase() === "b" && event.ctrlKey && !event.metaKey && !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable)) {
					event.preventDefault();
					setMinimized((value) => !value);
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, []);
		A(() => {
			const clampToViewport = () => {
				const rect = host.getBoundingClientRect();
				const margin = 8;
				const left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin));
				const top = Math.max(margin, Math.min(rect.top, window.innerHeight - rect.height - margin));
				host.style.left = `${left}px`;
				host.style.right = "auto";
				host.style.top = `${top}px`;
			};
			const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(clampToViewport);
			observer?.observe(host);
			window.addEventListener("resize", clampToViewport);
			const frame = requestAnimationFrame(clampToViewport);
			return () => {
				observer?.disconnect();
				window.removeEventListener("resize", clampToViewport);
				cancelAnimationFrame(frame);
			};
		}, [host, minimized]);
		A(() => () => {
			if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
		}, []);
		A(() => {
			const log = logElement.current;
			if (logs.length === 0) {
				stickToBottom.current = true;
				return;
			}
			if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
		}, [logs]);
		const updateSetting = (key, value) => {
			const next = {
				...settingsSignal.value,
				[key]: value
			};
			switch (key) {
				case "enabled":
					BotState.hackEnabled = value ? 1 : 0;
					break;
				case "autoMove":
					BotState.autoMove = value ? 1 : 0;
					break;
				case "ponder":
					BotState.ponderEnabled = value ? 1 : 0;
					break;
				case "autoRematch":
					BotState.autoRematch = value ? 1 : 0;
					break;
				case "depth":
					BotState.botPower = Number(value);
					break;
				case "moveTimeMs":
					BotState.moveTime = Number(value);
					break;
				case "moveMethod": BotState.moveMethod = value;
			}
			settingsSignal.value = next;
			Settings.save();
			if (key === "enabled") actions.setEnabled?.(!!value);
			else actions.refreshSettings?.();
		};
		const beginDrag = (event) => {
			if (event.button !== 0 || event.target.closest("button, input, a")) return;
			event.preventDefault();
			const start = host.getBoundingClientRect();
			const originX = event.clientX;
			const originY = event.clientY;
			let finished = false;
			const maxLeft = () => Math.max(8, window.innerWidth - start.width - 8);
			const maxTop = () => Math.max(8, window.innerHeight - start.height - 8);
			const move = (pointerEvent) => {
				const left = Math.min(Math.max(8, start.left + pointerEvent.clientX - originX), maxLeft());
				const top = Math.min(Math.max(8, start.top + pointerEvent.clientY - originY), maxTop());
				host.style.left = `${left}px`;
				host.style.right = "auto";
				host.style.top = `${top}px`;
			};
			const finish = () => {
				if (finished) return;
				finished = true;
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", finish);
				window.removeEventListener("pointercancel", finish);
				window.removeEventListener("blur", finish);
				host.classList.remove("dragging");
				Settings.save();
			};
			host.classList.add("dragging");
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", finish, { once: true });
			window.addEventListener("pointercancel", finish, { once: true });
			window.addEventListener("blur", finish, { once: true });
		};
		const copyLogs = async () => {
			const text = logsSignal.value.map((log) => `[${log.time}] ${log.text}`).join("\n");
			if (!text || !navigator.clipboard?.writeText) return;
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);
				if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => {
					copyTimer.current = null;
					setCopied(false);
				}, 1400);
			} catch {
				setCopied(false);
			}
		};
		const tone = statusTone(analysis, settings.enabled);
		const canRecover = analysis.recoveryAction !== null;
		return u("aside", {
			class: "panel-shell",
			"aria-label": "Super Chess Bot controls",
			children: [u("header", {
				class: "panel-header",
				onPointerDown: beginDrag,
				children: [
					u("span", {
						class: "panel-brandmark",
						"aria-hidden": "true",
						children: "♞"
					}),
					u("div", {
						class: "panel-brand",
						children: [u("strong", {
							class: "panel-title",
							children: "Super Chess Bot"
						}), u("span", {
							class: "panel-state",
							"data-tone": tone,
							role: "status",
							"aria-live": "polite",
							title: analysis.status,
							children: [u("i", {
								class: "panel-state-dot",
								"aria-hidden": "true"
							}), u("span", {
								class: "panel-state-text",
								children: analysis.status || "Ready"
							})]
						})]
					}),
					u("button", {
						class: "panel-icon-button",
						type: "button",
						"aria-label": minimized ? "Expand panel" : "Minimize panel",
						"aria-expanded": !minimized,
						title: "Minimize or expand (Ctrl+B)",
						onClick: () => setMinimized((value) => !value),
						children: u("span", {
							"aria-hidden": "true",
							children: minimized ? "+" : "−"
						})
					})
				]
			}), !minimized && u("div", {
				class: "panel-scroll",
				children: [
					u("section", {
						class: "panel-analysis",
						"aria-label": "Suggested move",
						children: [
							u("div", {
								class: "panel-analysis-heading",
								children: [u("span", {
									class: "panel-eyebrow",
									children: "Suggested move"
								}), u("output", {
									class: "panel-evaluation",
									"aria-label": `Evaluation ${analysis.evaluation || "unknown"}`,
									children: analysis.evaluation && analysis.evaluation !== "-" ? analysis.evaluation : "—"
								})]
							}),
							u("div", {
								class: "panel-best-move",
								children: analysis.bestMove && analysis.bestMove !== "-" ? analysis.bestMove : "—"
							}),
							u("div", {
								class: "panel-line",
								title: analysis.principalVariation,
								children: analysis.principalVariation && analysis.principalVariation !== "-" && analysis.principalVariation !== "Not available" ? `Line · ${analysis.principalVariation}` : "Waiting for a position"
							}),
							canRecover && u("div", {
								class: "panel-recovery",
								"data-kind": analysis.recoveryAction,
								children: [u("span", { children: analysis.recoveryAction === "resume" ? "Board input paused the bot. Resume when you are ready." : "The last action did not finish. Retry this position." }), u("button", {
									class: "panel-action-button",
									type: "button",
									onClick: () => actions.recover?.(),
									children: analysis.recoveryAction === "resume" ? "Resume bot" : "Retry"
								})]
							})
						]
					}),
					u("section", {
						class: "panel-controls",
						"aria-label": "Bot settings",
						children: [
							u("div", {
								class: "panel-section-heading",
								children: "Automation"
							}),
							u("div", {
								class: "panel-toggle-list",
								children: [
									u(Toggle, {
										label: "Enable bot",
										checked: settings.enabled,
										onChange: (checked) => updateSetting("enabled", checked)
									}),
									u(Toggle, {
										label: "Auto move",
										checked: settings.autoMove,
										onChange: (checked) => updateSetting("autoMove", checked)
									}),
									u(Toggle, {
										label: "Background ponder",
										checked: settings.ponder,
										onChange: (checked) => updateSetting("ponder", checked)
									}),
									u(Toggle, {
										label: "Auto rematch",
										checked: settings.autoRematch,
										onChange: (checked) => updateSetting("autoRematch", checked)
									})
								]
							}),
							u("div", {
								class: "panel-slider",
								children: [u("div", {
									class: "panel-setting-heading",
									children: [u("label", {
										htmlFor: "bot-depth",
										children: "Depth cap"
									}), u("output", { children: settings.depth })]
								}), u("input", {
									id: "bot-depth",
									class: "panel-range",
									type: "range",
									min: "1",
									max: "30",
									step: "1",
									value: settings.depth,
									"aria-label": "Maximum search depth",
									onInput: (event) => updateSetting("depth", Number(event.currentTarget.value))
								})]
							}),
							u("div", {
								class: "panel-slider",
								children: [u("div", {
									class: "panel-setting-heading",
									children: [u("label", {
										htmlFor: "move-budget",
										children: "Move time"
									}), u("output", { children: formatBudget(settings.moveTimeMs) })]
								}), u("input", {
									id: "move-budget",
									class: "panel-range",
									type: "range",
									min: "100",
									max: "5000",
									step: "100",
									value: settings.moveTimeMs,
									"aria-label": "Move time budget in milliseconds",
									onInput: (event) => updateSetting("moveTimeMs", Number(event.currentTarget.value))
								})]
							}),
							u("fieldset", {
								class: "panel-method",
								children: [u("legend", { children: "Move input method" }), u("div", {
									class: "panel-segmented",
									children: [u("button", {
										class: "panel-segment",
										type: "button",
										"aria-pressed": settings.moveMethod === "click",
										onClick: () => updateSetting("moveMethod", "click"),
										children: "Click"
									}), u("button", {
										class: "panel-segment",
										type: "button",
										"aria-pressed": settings.moveMethod === "drag",
										onClick: () => updateSetting("moveMethod", "drag"),
										children: "Drag"
									})]
								})]
							})
						]
					}),
					u("section", {
						class: "panel-activity",
						"aria-label": "Activity log",
						children: [u("div", {
							class: "panel-activity-heading",
							children: [u("span", { children: "Activity" }), u("div", {
								class: "panel-activity-actions",
								children: [u("button", {
									class: "panel-quiet-button",
									type: "button",
									"aria-label": copied ? "Log copied" : "Copy log",
									onClick: copyLogs,
									children: copied ? "Copied" : "Copy"
								}), u("button", {
									class: "panel-quiet-button",
									type: "button",
									"aria-label": "Clear log",
									onClick: () => actions.clearConsole?.(),
									children: "Clear"
								})]
							})]
						}), u("div", {
							ref: logElement,
							class: "panel-log",
							role: "log",
							"aria-label": "Engine activity",
							"aria-live": "off",
							tabIndex: 0,
							onScroll: () => {
								const log = logElement.current;
								if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 16;
							},
							children: logs.length === 0 ? u("p", {
								class: "panel-log-empty",
								children: "Moves and engine updates will appear here."
							}) : logs.map((entry) => u("p", {
								class: `panel-log-entry ${logTextColor[entry.type]}`,
								children: [u("time", { children: entry.time }), u("span", { children: entry.text })]
							}, entry.id))
						})]
					})
				]
			})]
		});
	}
	function isRoutineStatus(status) {
		return /^(?:Bot disabled|Preparing Stockfish|Loading Stockfish|Analyzing|Pondering|Submitting move|Move confirmed|Waiting for opponent|Waiting for board|Ready ·|Resuming\.\.\.)/.test(status);
	}
	function isErrorStatus(status) {
		return /error|failed|not confirmed|unavailable|crashed/i.test(status);
	}
	var ui = {
		menuWrap: null,
		lastStatus: "",
		lastBestMove: "",
		log(msg, type = "info") {
			appendPanelLog(msg, type);
		},
		clearConsole() {
			clearPanelLogs();
			this.lastStatus = "";
			this.lastBestMove = "";
		},
		updateDisplay(playingAs) {
			syncPanelSettings();
			const fen = getFen(getGame());
			const san = fen && BotState.bestMove !== "-" ? uciToSan(fen, BotState.bestMove) : BotState.bestMove;
			const suggestedMove = typeof san === "string" ? san : BotState.bestMove;
			if (BotState.statusInfo !== this.lastStatus) {
				if (!isRoutineStatus(BotState.statusInfo)) {
					const type = BotState.recoveryAction === "retry" || isErrorStatus(BotState.statusInfo) ? "error" : "status";
					this.log(BotState.statusInfo, type);
				}
				this.lastStatus = BotState.statusInfo;
			}
			if (BotState.bestMove !== "-" && BotState.bestMove !== this.lastBestMove) {
				const pv = BotState.principalVariation;
				const line = pv && pv !== "-" && pv !== "Not available" ? ` | PV: ${pv}` : ` | Best: ${BotState.bestMove}`;
				this.log(`Eval: ${BotState.currentEvaluation}${line}`, "info");
				this.lastBestMove = BotState.bestMove;
			}
			updatePanelAnalysis({
				status: BotState.statusInfo,
				evaluation: BotState.currentEvaluation,
				bestMove: suggestedMove,
				principalVariation: BotState.principalVariation,
				recoveryAction: BotState.recoveryAction
			});
			updateEvaluationBar(BotState.currentEvaluation, playingAs);
		}
	};
	async function buildUI(actions = {}) {
		if (ui.menuWrap) return;
		const host = document.createElement("div");
		host.id = "menuWrap";
		host.setAttribute("aria-label", "Super Chess Bot panel");
		host.style.top = "20px";
		host.style.right = "20px";
		const saved = Settings.load();
		syncPanelSettings();
		if (saved?.menuPosition) {
			host.style.top = saved.menuPosition.top || "20px";
			host.style.left = saved.menuPosition.left || "";
			host.style.right = saved.menuPosition.left ? "auto" : "20px";
		}
		const shadowRoot = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = panel_default;
		const appRoot = document.createElement("div");
		appRoot.id = "panelRoot";
		shadowRoot.append(style, appRoot);
		document.body.appendChild(host);
		ui.menuWrap = host;
		mountPanel(appRoot, host, {
			...actions,
			clearConsole: () => ui.clearConsole()
		});
	}
	var revision = 0;
	var active = null;
	var processed = "";
	var anticipatedPonder = null;
	function scoreForWhite(score, sideToMove) {
		if (sideToMove !== "b") return score;
		return {
			...typeof score.cp === "number" ? { cp: -score.cp } : {},
			...typeof score.mate === "number" ? { mate: -score.mate } : {}
		};
	}
	function cancelAnalysis(preservePonderFen) {
		revision++;
		active?.abort();
		active = null;
		processed = "";
		if (!anticipatedPonder || anticipatedPonder.fromFen !== preservePonderFen) anticipatedPonder = null;
		cancelPonder(preservePonderFen);
		cancelPendingMove();
	}
	function searchBudget() {
		const configured = Math.max(10, BotState.moveTime);
		const clock = document.querySelector(".clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time")?.textContent?.trim();
		let remaining = Infinity;
		if (clock && /^\d+:\d{2}(?:\.\d+)?$/.test(clock)) {
			const [minutes, seconds] = clock.split(":").map(Number);
			remaining = (minutes * 60 + seconds) * 1e3;
		}
		return Math.max(1, Math.floor(Math.min(configured, remaining / 40) - 12));
	}
	async function scheduleAnalysis(kind, fen) {
		const key = `${kind}:${fen}`;
		if (!BotState.hackEnabled || key === processed) return;
		const game = getGame();
		if (!game) return;
		active?.abort();
		if (kind !== "main" && !BotState.ponderEnabled) {
			cancelPonder();
			anticipatedPonder = null;
			processed = key;
			return;
		}
		cancelPonder(fen);
		const id = ++revision;
		const ctrl = new AbortController();
		active = ctrl;
		processed = key;
		const inputRevision = getMoveRevision();
		const positionIsCurrent = () => id === revision && !ctrl.signal.aborted && !!BotState.hackEnabled && getGame() === game && getFen(game) === fen;
		const current = () => positionIsCurrent() && inputRevision === getMoveRevision();
		if (!current()) return;
		try {
			const started = performance.now();
			const budget = searchBudget();
			BotState.statusInfo = kind === "main" ? "Analyzing..." : "Pondering...";
			ui.updateDisplay(pa());
			const history = readPositionHistory(game, fen);
			const anticipated = anticipatedPonder;
			if (kind !== "main" && anticipated?.fromFen === fen) {
				anticipatedPonder = null;
				if (ponderPosition(anticipated.targetFen, BotState.botPower, anticipated.history)) return;
			} else if (kind === "main") anticipatedPonder = null;
			const result = await getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);
			if (!current()) return;
			const best = parseBestLine(result);
			if (!best) throw new Error("Engine returned no legal move");
			if (kind !== "main") {
				const predicted = predictFen(fen, best.uci);
				if (predicted) {
					const predictedHistory = history ? {
						...history,
						moves: [...history.moves, best.uci]
					} : void 0;
					ponderPosition(predicted, BotState.botPower, predictedHistory);
				}
				return;
			}
			const nextFen = predictFen(fen, best.uci);
			if (!nextFen || fen.split(" ")[1] !== getPlayerColor(game)) throw new Error("Engine move failed position validation");
			const pvMoves = best.pv.split(/\s+/);
			const predictedReply = pvMoves[0] === best.uci ? pvMoves[1] : void 0;
			const targetFen = predictedReply ? predictFen(nextFen, predictedReply) : null;
			if (BotState.ponderEnabled && targetFen) anticipatedPonder = {
				fromFen: nextFen,
				targetFen,
				...history ? { history: {
					...history,
					moves: [
						...history.moves,
						best.uci,
						predictedReply
					]
				} } : {}
			};
			BotState.bestMove = best.uci;
			BotState.principalVariation = best.pv;
			BotState.currentEvaluation = scoreToDisplay(scoreForWhite(best.score, fen.split(" ")[1]));
			BotState.statusInfo = `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;
			clearArrows();
			drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), "rgba(100,255,100,0.7)", 3);
			ui.updateDisplay(pa());
			if (!BotState.autoMove || !current()) return;
			if (await executeMove(best.uci.slice(0, 2), best.uci.slice(2, 4), fen, best.uci[4], result.depth, void 0, nextFen)) {
				BotState.recoveryAction = null;
				ui.log(formatMove(fen, best.uci), "move");
			} else if (positionIsCurrent()) {
				anticipatedPonder = null;
				clearArrows();
				BotState.bestMove = "-";
				BotState.currentEvaluation = "-";
				BotState.principalVariation = "-";
				if (inputRevision !== getMoveRevision()) {
					BotState.recoveryAction = "resume";
					BotState.statusInfo = "Paused after board interaction";
				} else {
					BotState.recoveryAction = "retry";
					if (!/^Move (?:input failed|not confirmed)/i.test(BotState.statusInfo)) BotState.statusInfo = "Move was not confirmed";
				}
				ui.updateDisplay(pa());
			}
		} catch (error) {
			if (!current() || ctrl.signal.aborted) return;
			clearArrows();
			BotState.bestMove = "-";
			BotState.currentEvaluation = "-";
			BotState.principalVariation = "-";
			BotState.recoveryAction = "retry";
			BotState.statusInfo = error instanceof Error ? error.message : "Engine failed";
			ui.updateDisplay(pa());
		} finally {
			if (active === ctrl) active = null;
		}
	}
	var BotController = class {
		isActive = false;
		lastFenSeen = "";
		game = null;
		cleanup = null;
		cleanupBoardInput = null;
		interval = null;
		generation = 0;
		ready = false;
		rematchAttempted = false;
		waitingForBoard = false;
		interruptedFen = null;
		domWatcherStarted = false;
		init() {
			if (this.domWatcherStarted) return;
			this.domWatcherStarted = true;
			startDomBoardWatcher();
		}
		setEnabled(enabled) {
			BotState.hackEnabled = Number(enabled);
			Settings.save();
			if (enabled) {
				this.init();
				this.start();
			} else this.stop();
		}
		async start() {
			if (this.isActive) return;
			this.isActive = true;
			const generation = ++this.generation;
			BotState.statusInfo = "Loading Stockfish...";
			ui.updateDisplay(pa());
			try {
				await warmEngine();
				if (!this.isActive || generation !== this.generation || !BotState.hackEnabled) return;
				this.ready = true;
				BotState.recoveryAction = null;
				this.cleanup = onBoardMutation(() => this.tick());
				this.cleanupBoardInput = onBoardInput(() => this.pauseForBoardInput());
				startMoveWatcher();
				this.interval = setInterval(() => this.tick(), 1e3);
				this.tick();
			} catch (error) {
				if (generation !== this.generation) return;
				this.stop();
				BotState.hackEnabled = 0;
				BotState.statusInfo = error instanceof Error ? error.message : "Could not initialize Stockfish";
				BotState.recoveryAction = "retry";
				ui.updateDisplay(pa());
			}
		}
		stop() {
			this.generation++;
			this.isActive = false;
			this.ready = false;
			if (this.interval) clearInterval(this.interval);
			this.interval = null;
			this.cleanup?.();
			this.cleanup = null;
			this.cleanupBoardInput?.();
			this.cleanupBoardInput = null;
			stopMoveWatcher();
			cancelAnalysis();
			clearArrows();
			this.lastFenSeen = "";
			this.game = null;
			this.waitingForBoard = false;
			this.interruptedFen = null;
			this.clearRecommendation();
			BotState.recoveryAction = null;
			BotState.statusInfo = "Bot disabled";
			ui.updateDisplay(pa());
		}
		clearRecommendation() {
			BotState.bestMove = "-";
			BotState.currentEvaluation = "-";
			BotState.principalVariation = "-";
		}
		refreshSettings() {
			cancelAnalysis();
			if (BotState.recoveryAction === "retry") BotState.recoveryAction = null;
			this.lastFenSeen = "";
			this.tick();
		}
		recover() {
			const action = BotState.recoveryAction;
			if (!action) return;
			if (action === "retry") resetEngine();
			this.interruptedFen = null;
			this.lastFenSeen = "";
			BotState.recoveryAction = null;
			BotState.statusInfo = "Resuming...";
			ui.updateDisplay(pa());
			if (!this.isActive) {
				BotState.hackEnabled = 1;
				Settings.save();
				this.init();
				this.start();
				return;
			}
			this.tick();
		}
		pauseForBoardInput() {
			if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
			invalidateGameCache();
			this.interruptedFen = getFen(getGame()) ?? "";
			cancelAnalysis();
			clearArrows();
			this.clearRecommendation();
			BotState.recoveryAction = "resume";
			BotState.statusInfo = "Paused after board interaction";
			ui.updateDisplay(pa());
		}
		tick() {
			if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
			invalidateGameCache();
			const game = getGame();
			if (!game) {
				if (this.waitingForBoard) return;
				this.waitingForBoard = true;
				cancelAnalysis();
				clearArrows();
				this.lastFenSeen = "";
				this.game = null;
				this.interruptedFen = null;
				this.clearRecommendation();
				BotState.recoveryAction = null;
				BotState.statusInfo = "Waiting for board";
				ui.updateDisplay(pa());
				return;
			}
			this.waitingForBoard = false;
			if (game !== this.game) {
				cancelAnalysis();
				resetEngine();
				this.game = game;
				this.lastFenSeen = "";
				this.rematchAttempted = false;
				this.interruptedFen = null;
				this.clearRecommendation();
				BotState.recoveryAction = null;
				startMoveWatcher();
				ui.clearConsole();
			}
			if (game.isGameOver?.() || document.querySelector(".game-over-modal-content")) {
				cancelAnalysis();
				clearArrows();
				this.clearRecommendation();
				this.interruptedFen = null;
				BotState.recoveryAction = null;
				BotState.statusInfo = "Game finished";
				ui.updateDisplay(pa());
				if (BotState.autoRematch && !this.rematchAttempted) {
					const button = document.querySelector("[data-cy=\"sidebar-game-over-rematch-button\"], [data-cy=\"game-over-modal-rematch-button\"]");
					if (button) {
						button.click();
						this.rematchAttempted = true;
					}
				}
				return;
			}
			this.rematchAttempted = false;
			const fen = getFen(game);
			if (this.interruptedFen !== null) {
				if (!fen || fen === this.interruptedFen) return;
				this.interruptedFen = null;
				BotState.recoveryAction = null;
			}
			if (!fen || fen === this.lastFenSeen) return;
			cancelAnalysis(fen);
			clearArrows();
			this.clearRecommendation();
			this.lastFenSeen = fen;
			BotState.recoveryAction = null;
			const ourTurn = isPlayersTurn(game);
			BotState.statusInfo = ourTurn ? "Analyzing..." : "Waiting for opponent";
			ui.updateDisplay(pa());
			scheduleAnalysis(ourTurn ? "main" : "ponder", fen);
		}
	};
	var controller = new BotController();
	async function init() {
		const page = window;
		if (page.__GABIBOT_RUNNING__) return;
		page.__GABIBOT_RUNNING__ = true;
		try {
			BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);
			await buildUI({
				setEnabled: (enabled) => controller.setEnabled(enabled),
				refreshSettings: () => controller.refreshSettings(),
				recover: () => controller.recover()
			});
			if (!BotState.hackEnabled) {
				BotState.statusInfo = "Preparing Stockfish...";
				ui.updateDisplay(pa());
			}
			warmEngine().then(() => {
				if (BotState.hackEnabled) return;
				BotState.statusInfo = "Ready";
				ui.updateDisplay(pa());
			}, (error) => {
				if (BotState.hackEnabled) return;
				BotState.statusInfo = error instanceof Error ? `Stockfish warmup failed: ${error.message}` : "Stockfish warmup failed";
				ui.updateDisplay(pa());
			});
			await waitForElement("wc-chess-board, chess-board, .board");
			const board = getBoard();
			if (board) attachToBoard(board);
			controller.init();
		} catch (error) {
			page.__GABIBOT_RUNNING__ = false;
			BotState.statusInfo = error instanceof Error ? error.message : "Initialization failed";
			BotState.recoveryAction = "retry";
			ui.updateDisplay(1);
		}
	}
	init();
})();
