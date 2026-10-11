// ==UserScript==
// @name         ♟Super-chess-Bot
// @namespace    http://tampermonkey.net/
// @version      10.0.0
// @author       quantavil
// @description  Local Stockfish analysis and move automation for Chess.com, PyChess, and Lichess standard games
// @license      GPL-3.0-or-later
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @match        https://lichess.org/*
// @match        https://www.lichess.org/*
// @match        https://chess.com/*
// @match        https://www.chess.com/*
// @match        https://www.pychess.org/*
// @match        https://pychess.org/*
// @resource     stockfish.js    https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.js
// @resource     stockfish.wasm  https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.wasm
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        unsafeWindow
// @inject-into  page
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
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
	function makeEngineUci(position, move) {
		if ("from" in move && move.from === position.board.kingOf(position.turn)) {
			const rooks = position.castles.rook[position.turn];
			const side = move.to === rooks.a ? "a" : move.to === rooks.h ? "h" : void 0;
			if (side) return makeSquare(move.from) + makeSquare(kingCastlesTo(position.turn, side));
		}
		return makeUci(move);
	}
	function canonicalFen(fen) {
		if (typeof fen !== "string" || fen.trim().split(/\s+/).length !== 6) return null;
		try {
			const setup = parseFen(fen.trim());
			if (setup.isErr) return null;
			const position = Chess.fromSetup(setup.value);
			if (position.isErr) return null;
			return makeFen(position.value.toSetup());
		} catch {
			return null;
		}
	}
	function replaySanLine(startFen, sans) {
		const rootFen = canonicalFen(startFen);
		if (!rootFen) return void 0;
		try {
			const setup = parseFen(rootFen);
			if (setup.isErr) return void 0;
			const position = Chess.fromSetup(setup.value);
			if (position.isErr) return void 0;
			const moves = [];
			const fens = [rootFen];
			for (const san of sans) {
				if (typeof san !== "string" || !san.trim()) return void 0;
				const move = parseSan(position.value, san.trim());
				if (!move) return void 0;
				moves.push(makeEngineUci(position.value, move));
				position.value.play(move);
				const fen = makeFen(position.value.toSetup());
				if (!canonicalFen(fen)) return void 0;
				fens.push(fen);
			}
			return {
				history: {
					startFen: rootFen,
					moves
				},
				fens
			};
		} catch {
			return;
		}
	}
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
				moves.push(makeEngineUci(position.value, move));
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
	var DEFAULT_CONFIG = {
		lang: void 0,
		message: void 0,
		abortEarly: void 0,
		abortPipeEarly: void 0
	};
	function getGlobalConfig(config$1) {
		if (!config$1 && true) return DEFAULT_CONFIG;
		return {
			lang: config$1?.lang ?? void 0,
			message: config$1?.message,
			abortEarly: config$1?.abortEarly ?? void 0,
			abortPipeEarly: config$1?.abortPipeEarly ?? void 0
		};
	}
	function _stringify(input) {
		const type = typeof input;
		if (type === "string") return `"${input}"`;
		if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
		if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
		return type;
	}
	function _addIssue(context, label, dataset, config$1, other) {
		const input = other && "input" in other ? other.input : dataset.value;
		const expected = other?.expected ?? context.expects ?? null;
		const received = other?.received ?? _stringify(input);
		const issue = {
			kind: context.kind,
			type: context.type,
			input,
			expected,
			received,
			message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
			requirement: context.requirement,
			path: other?.path,
			issues: other?.issues,
			lang: config$1.lang,
			abortEarly: config$1.abortEarly,
			abortPipeEarly: config$1.abortPipeEarly
		};
		const isSchema = context.kind === "schema";
		const message$1 = other?.message ?? context.message ?? (context.reference, issue.lang, void 0) ?? (isSchema ? (issue.lang, void 0) : null) ?? config$1.message ?? (issue.lang, void 0);
		if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
		if (isSchema) dataset.typed = false;
		if (dataset.issues) dataset.issues.push(issue);
		else dataset.issues = [issue];
	}
	function _isSameValueZero(value1, value2) {
		return value1 === value2 || Number.isNaN(value1) && Number.isNaN(value2);
	}
	function _joinExpects(values$1, separator) {
		const list = [...new Set(values$1)];
		if (list.length > 1) return `(${list.join(` ${separator} `)})`;
		return list[0] ?? "never";
	}
	function _standardSchema(schema) {
		schema["~standard"] = {
			version: 1,
			vendor: "valibot",
			validate: (value$1) => schema["~run"]({ value: value$1 }, getGlobalConfig())
		};
		return schema;
	}
	function integer(message$1) {
		return {
			kind: "validation",
			type: "integer",
			reference: integer,
			async: false,
			expects: null,
			requirement: Number.isInteger,
			message: message$1,
			"~run"(dataset, config$1) {
				if (dataset.typed && !this.requirement(dataset.value)) _addIssue(this, "integer", dataset, config$1);
				return dataset;
			}
		};
	}
	function maxLength(requirement, message$1) {
		return {
			kind: "validation",
			type: "max_length",
			reference: maxLength,
			async: false,
			expects: `<=${requirement}`,
			requirement,
			message: message$1,
			"~run"(dataset, config$1) {
				if (dataset.typed && dataset.value.length > this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
				return dataset;
			}
		};
	}
	function maxValue(requirement, message$1) {
		return {
			kind: "validation",
			type: "max_value",
			reference: maxValue,
			async: false,
			expects: `<=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
			requirement,
			message: message$1,
			"~run"(dataset, config$1) {
				if (dataset.typed && !(dataset.value <= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value) });
				return dataset;
			}
		};
	}
	function minValue(requirement, message$1) {
		return {
			kind: "validation",
			type: "min_value",
			reference: minValue,
			async: false,
			expects: `>=${requirement instanceof Date ? requirement.toJSON() : _stringify(requirement)}`,
			requirement,
			message: message$1,
			"~run"(dataset, config$1) {
				if (dataset.typed && !(dataset.value >= this.requirement)) _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : _stringify(dataset.value) });
				return dataset;
			}
		};
	}
	function getFallback(schema, dataset, config$1) {
		return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
	}
	function getDefault(schema, dataset, config$1) {
		return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
	}
	function literal(literal_, message$1) {
		return _standardSchema({
			kind: "schema",
			type: "literal",
			reference: literal,
			expects: _stringify(literal_),
			async: false,
			literal: literal_,
			message: message$1,
			"~run"(dataset, config$1) {
				if (_isSameValueZero(dataset.value, this.literal)) dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function nullable(wrapped, default_) {
		return _standardSchema({
			kind: "schema",
			type: "nullable",
			reference: nullable,
			expects: `(${wrapped.expects} | null)`,
			async: false,
			wrapped,
			default: default_,
			"~run"(dataset, config$1) {
				if (dataset.value === null) {
					if (this.default !== void 0) dataset.value = getDefault(this, dataset, config$1);
					if (dataset.value === null) {
						dataset.typed = true;
						return dataset;
					}
				}
				return this.wrapped["~run"](dataset, config$1);
			}
		});
	}
	function number(message$1) {
		return _standardSchema({
			kind: "schema",
			type: "number",
			reference: number,
			expects: "number",
			async: false,
			message: message$1,
			"~run"(dataset, config$1) {
				if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function object(entries$1, message$1) {
		return _standardSchema({
			kind: "schema",
			type: "object",
			reference: object,
			expects: "Object",
			async: false,
			entries: entries$1,
			message: message$1,
			"~run"(dataset, config$1) {
				const input = dataset.value;
				if (input && typeof input === "object") {
					dataset.typed = true;
					dataset.value = {};
					for (const key in this.entries) {
						const valueSchema = this.entries[key];
						if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
							const value$1 = key in input ? input[key] : getDefault(valueSchema);
							const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
							if (valueDataset.issues) {
								const pathItem = {
									type: "object",
									origin: "value",
									input,
									key,
									value: value$1
								};
								for (const issue of valueDataset.issues) {
									if (issue.path) issue.path.unshift(pathItem);
									else issue.path = [pathItem];
									dataset.issues?.push(issue);
								}
								if (!dataset.issues) dataset.issues = valueDataset.issues;
								if (config$1.abortEarly) {
									dataset.typed = false;
									break;
								}
							}
							if (!valueDataset.typed) dataset.typed = false;
							dataset.value[key] = valueDataset.value;
						} else if (valueSchema.fallback !== void 0) dataset.value[key] = getFallback(valueSchema);
						else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
							_addIssue(this, "key", dataset, config$1, {
								input: void 0,
								expected: `"${key}"`,
								path: [{
									type: "object",
									origin: "key",
									input,
									key,
									value: input[key]
								}]
							});
							if (config$1.abortEarly) break;
						}
					}
				} else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function optional(wrapped, default_) {
		return _standardSchema({
			kind: "schema",
			type: "optional",
			reference: optional,
			expects: `(${wrapped.expects} | undefined)`,
			async: false,
			wrapped,
			default: default_,
			"~run"(dataset, config$1) {
				if (dataset.value === void 0) {
					if (this.default !== void 0) dataset.value = getDefault(this, dataset, config$1);
					if (dataset.value === void 0) {
						dataset.typed = true;
						return dataset;
					}
				}
				return this.wrapped["~run"](dataset, config$1);
			}
		});
	}
	function string(message$1) {
		return _standardSchema({
			kind: "schema",
			type: "string",
			reference: string,
			expects: "string",
			async: false,
			message: message$1,
			"~run"(dataset, config$1) {
				if (typeof dataset.value === "string") dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function _subIssues(datasets) {
		let issues;
		if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
		else issues = dataset.issues;
		return issues;
	}
	function union(options, message$1) {
		return _standardSchema({
			kind: "schema",
			type: "union",
			reference: union,
			expects: _joinExpects(options.map((option) => option.expects), "|"),
			async: false,
			options,
			message: message$1,
			"~run"(dataset, config$1) {
				let validDataset;
				let typedDatasets;
				let untypedDatasets;
				for (const schema of this.options) {
					const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
					if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
					else typedDatasets = [optionDataset];
					else {
						validDataset = optionDataset;
						break;
					}
					else if (untypedDatasets) untypedDatasets.push(optionDataset);
					else untypedDatasets = [optionDataset];
				}
				if (validDataset) return validDataset;
				if (typedDatasets) {
					if (typedDatasets.length === 1) return typedDatasets[0];
					_addIssue(this, "type", dataset, config$1, { issues: _subIssues(typedDatasets) });
					dataset.typed = true;
				} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
				else _addIssue(this, "type", dataset, config$1, { issues: _subIssues(untypedDatasets) });
				return dataset;
			}
		});
	}
	function pipe(...pipe$1) {
		return _standardSchema({
			...pipe$1[0],
			pipe: pipe$1,
			"~run"(dataset, config$1) {
				for (const item of pipe$1) if (item.kind !== "metadata") {
					if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
						dataset.typed = false;
						break;
					}
					if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
				}
				return dataset;
			}
		});
	}
	function safeParse(schema, input, config$1) {
		const dataset = schema["~run"]({ value: input }, getGlobalConfig(config$1));
		return {
			typed: dataset.typed,
			success: !dataset.issues,
			output: dataset.value,
			issues: dataset.issues
		};
	}
	var DEFAULT_SETTINGS = {
		hackEnabled: 0,
		botPower: 30,
		moveTime: 100,
		autoMove: 1,
		openingBook: 1,
		ponderEnabled: 1,
		menuPosition: null
	};
	var flagSchema = union([literal(0), literal(1)]);
	var integerInRange = (minimum, maximum) => pipe(number(), integer(), minValue(minimum), maxValue(maximum));
	var positionSchema = object({
		top: pipe(string(), maxLength(32)),
		left: pipe(string(), maxLength(32))
	});
	var savedSettingsSchema = object({
		hackEnabled: optional(flagSchema),
		botPower: optional(integerInRange(1, 30)),
		moveTime: optional(integerInRange(25, 1e4)),
		autoMove: optional(flagSchema),
		openingBook: optional(flagSchema),
		ponderEnabled: optional(flagSchema),
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
		return {
			...DEFAULT_SETTINGS,
			...result.output,
			hackEnabled: 0
		};
	}
	var activeSite$1 = null;
	function setActiveSite(site) {
		activeSite$1 = site;
	}
	function getActiveSite() {
		return activeSite$1;
	}
	function isObject$1(value) {
		return typeof value === "object" && value !== null || typeof value === "function";
	}
	var capturedController = null;
	var wrappedPrototypes = new WeakSet();
	var hookedRegistries = new WeakSet();
	function getCapturedChesscomController() {
		return capturedController ?? null;
	}
	function setCapturedChesscomController(controller) {
		if (!isObject$1(controller)) return;
		capturedController = controller;
	}
	function installChesscomControllerBridge(page, onController) {
		const notify = (controller) => {
			if (!isObject$1(controller)) return;
			capturedController = controller;
			try {
				onController(controller);
			} catch {}
		};
		const controllerFrom = (owner, result) => {
			if (isObject$1(result)) {
				const nested = Reflect.get(result, "game");
				if (isObject$1(nested)) return nested;
				if (typeof Reflect.get(result, "getFEN") === "function") return result;
			}
			return owner?.game ?? result;
		};
		const wrapPrototype = (proto) => {
			if (!isObject$1(proto) || wrappedPrototypes.has(proto)) return;
			wrappedPrototypes.add(proto);
			const originalInit = Reflect.get(proto, "init");
			if (typeof originalInit === "function") {
				const init = originalInit;
				try {
					Object.defineProperty(proto, "init", {
						configurable: true,
						writable: true,
						value(...args) {
							const result = Reflect.apply(init, this, args);
							try {
								notify(controllerFrom(this, result));
							} catch {}
							return result;
						}
					});
				} catch {}
			}
			const originalCreateGame = Reflect.get(proto, "createGame");
			if (typeof originalCreateGame === "function") {
				const createGame = originalCreateGame;
				try {
					Object.defineProperty(proto, "createGame", {
						configurable: true,
						writable: true,
						value(...args) {
							const result = Reflect.apply(createGame, this, args);
							try {
								notify(controllerFrom(this, result));
							} catch {}
							return result;
						}
					});
				} catch {}
			}
		};
		const wrapConstructor = (candidate) => {
			if (!isObject$1(candidate)) return;
			const prototype = Reflect.get(candidate, "prototype");
			if (isObject$1(prototype)) wrapPrototype(prototype);
		};
		try {
			const registry = page.customElements;
			if (registry && typeof registry.define === "function" && !hookedRegistries.has(registry)) {
				hookedRegistries.add(registry);
				const originalDefine = registry.define.bind(registry);
				try {
					registry.define = ((name, ctor, options) => {
						try {
							if (name === "wc-chess-board") wrapConstructor(ctor);
						} catch {}
						return originalDefine(name, ctor, options);
					});
				} catch {}
			}
		} catch {}
		try {
			wrapConstructor(page.customElements?.get?.("wc-chess-board"));
		} catch {}
		try {
			const boards = page.document?.querySelectorAll?.("wc-chess-board");
			if (boards) for (const board of Array.from(boards)) try {
				if (isObject$1(board?.game)) notify(board.game);
			} catch {}
		} catch {}
		return true;
	}
	function pageWindow() {
		return typeof unsafeWindow === "undefined" ? window : unsafeWindow;
	}
	function pageDocument() {
		return typeof unsafeWindow === "undefined" ? document : unsafeWindow.document;
	}
	function mutationElement(target) {
		return target.nodeType === 1 ? target : target.parentElement ?? null;
	}
	var PROMOTION_CHOOSER_STATE = "PomotionAreaShowing";
	var BOARD_SELECTOR$1 = "wc-chess-board, chess-board, .board";
	var cachedGame = null;
	var cachedGameTimestamp = 0;
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
	function getBoard(doc = pageDocument()) {
		const visible = (typeof doc.querySelectorAll === "function" ? Array.from(doc.querySelectorAll(BOARD_SELECTOR$1)) : [doc.querySelector(BOARD_SELECTOR$1)].filter((board) => !!board)).filter(isVisibleBoard);
		visible.sort((a, b) => Number(hasGameApi(b)) - Number(hasGameApi(a)) || boardArea(b) - boardArea(a));
		return visible[0] ?? null;
	}
	function getGame() {
		const captured = getCapturedChesscomController();
		if (captured && typeof captured.getFEN === "function") return captured;
		const now = Date.now();
		if (cachedGame && now - cachedGameTimestamp < 100) return cachedGame;
		cachedGame = getBoard(pageDocument())?.game || null;
		cachedGameTimestamp = now;
		return cachedGame;
	}
	var getFen = (game) => {
		try {
			return game?.getFEN ? game.getFEN() : null;
		} catch {
			return null;
		}
	};
	var CLOCK_SELECTOR = ".clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time, .clock-player-turn .move-time-content, .clock-player-turn.move-time-content";
	function getRemainingMs(doc) {
		const text = doc.querySelector(CLOCK_SELECTOR)?.textContent?.trim();
		if (!text) return null;
		let seconds;
		const minutesAndSeconds = /^(\d+):(\d{2}(?:\.\d+)?)$/.exec(text);
		if (minutesAndSeconds) {
			const minutes = Number(minutesAndSeconds[1]);
			const remainder = Number(minutesAndSeconds[2]);
			if (!Number.isFinite(minutes) || !Number.isFinite(remainder) || remainder >= 60) return null;
			seconds = minutes * 60 + remainder;
		} else if (/^\d+(?:\.\d+)?$/.test(text)) seconds = Number(text);
		else return null;
		return Number.isFinite(seconds) ? Math.round(seconds * 1e3) : null;
	}
	var getPlayerColor$1 = (game) => {
		try {
			return game?.getPlayingAs?.() === 2 ? "b" : "w";
		} catch {
			return "w";
		}
	};
	var getSideToMove = (game) => {
		try {
			const turn = game?.getTurn?.();
			if (turn === 1) return "w";
			if (turn === 2) return "b";
		} catch {}
		const fen = getFen(game);
		return fen ? fen.split(" ")[1] || null : null;
	};
	var getOrientation = (game) => {
		try {
			const options = game?.getOptions?.();
			if (options) {
				if (typeof options.flipped === "boolean") return options.flipped ? "black" : "white";
				if (typeof options.isWhiteOnBottom === "boolean") return options.isWhiteOnBottom ? "white" : "black";
			}
		} catch {}
		try {
			return game?.getPlayingAs?.() === 2 ? "black" : "white";
		} catch {
			return "white";
		}
	};
	function isBoardFlipped$1() {
		return getOrientation(getGame()) === "black";
	}
	function isLegalChesscomMove(game, from, to) {
		try {
			const checker = game?.isLegalMove;
			if (typeof checker !== "function") return false;
			return checker.call(game, {
				from,
				to
			}) === true;
		} catch {
			return false;
		}
	}
	function resetStuckPromotionWindow(game) {
		try {
			if (game?.getState?.() !== PROMOTION_CHOOSER_STATE) return;
			game?.getRenderer?.()?.closePromotionWindow?.();
		} catch {}
	}
	function invalidateGameCache() {
		cachedGame = null;
		cachedGameTimestamp = 0;
	}
	function debounce(fn, wait = 150) {
		let t = null;
		return (...args) => {
			if (t !== null) clearTimeout(t);
			t = setTimeout(() => fn(...args), wait);
		};
	}
	var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	function scoreToDisplay(score) {
		if (typeof score?.mate === "number" && score.mate !== 0) return `M${score.mate}`;
		if (typeof score?.cp === "number") return (score.cp / 100).toFixed(2);
		return "-";
	}
	function snapshot() {
		try {
			const read = getActiveSite()?.read();
			return read?.kind === "game" ? read.snapshot : null;
		} catch {
			return null;
		}
	}
	function getPlayerColor(...args) {
		if (args.length > 0) return getPlayerColor$1(args[0]);
		return snapshot()?.playerColor ?? getPlayerColor$1(getGame());
	}
	function isBoardFlipped() {
		const current = snapshot();
		return current ? current.orientation === "black" : isBoardFlipped$1();
	}
	function pa() {
		return getPlayerColor() === "b" ? 2 : 1;
	}
	var BotState = {
		hackEnabled: 0,
		botPower: 30,
		moveTime: 100,
		autoMove: 1,
		openingBook: 1,
		currentEvaluation: "-",
		bestMove: "-",
		principalVariation: "-",
		statusInfo: "Ready",
		recoveryAction: null,
		ponderEnabled: 1
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
					openingBook: BotState.openingBook,
					ponderEnabled: BotState.ponderEnabled,
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
	var boardCtx = null;
	var observedOrientation = null;
	var moveRevision = 0;
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
		evalBarWrap.style.cssText = "position:absolute;height:100%;width:14px;left:-22px;top:0;background:#111;z-index:50;overflow:hidden;pointer-events:none;border-radius:4px;border:1px solid rgba(255,255,255,0.2);box-sizing:border-box;";
		const whiteBar = document.createElement("div");
		whiteBar.id = "evaluationBarWhite";
		whiteBar.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:50%;background:#f0d9b5;";
		const blackBar = document.createElement("div");
		blackBar.id = "evaluationBarBlack";
		blackBar.style.cssText = "position:absolute;left:0;right:0;top:0;height:50%;background:#111;";
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
			notifyBoardInput(event);
		};
		const userInputEvents = typeof PointerEvent === "undefined" ? ["mousedown", "touchstart"] : ["pointerdown"];
		for (const eventName of userInputEvents) boardEl.addEventListener(eventName, cancelPendingOnUserAction, true);
		boardCtx = {
			boardEl,
			orientation: observedOrientation ?? (isBoardFlipped() ? "black" : "white"),
			drawingBoard,
			ctx,
			evalBarWrap,
			detachListeners() {
				for (const eventName of userInputEvents) boardEl.removeEventListener(eventName, cancelPendingOnUserAction, true);
				ro.disconnect();
				drawingBoard.remove();
				evalBarWrap.remove();
			}
		};
		if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
		attachMoveWatcher();
	}
	function setBoardOrientation(orientation) {
		observedOrientation = orientation;
		if (boardCtx) boardCtx.orientation = orientation;
	}
	function isAttachedBoardFlipped() {
		return boardCtx ? boardCtx.orientation === "black" : isBoardFlipped();
	}
	function detachFromBoard() {
		if (!boardCtx) return;
		try {
			boardCtx.detachListeners();
		} catch {}
		boardCtx = null;
	}
	function onBoardMutation(cb) {
		mutationListeners.add(cb);
		return () => mutationListeners.delete(cb);
	}
	function onBoardInput(cb) {
		boardInputListeners.add(cb);
		return () => boardInputListeners.delete(cb);
	}
	function notifyBoardInput(event) {
		if (!event.isTrusted) return;
		if ("button" in event && typeof event.button === "number" && event.button !== 0) return;
		cancelPendingMove();
		for (const listener of [...boardInputListeners]) listener();
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
		if (isAttachedBoardFlipped()) {
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
		const angle = Math.atan2(b.y - a.y, b.x - a.x);
		const headLength = Math.max(14, tile * .35);
		const headAngle = Math.PI / 6;
		ctx.beginPath();
		ctx.arc(a.x, a.y, Math.max(4, thickness * 1.2), 0, 2 * Math.PI);
		ctx.fillStyle = color;
		ctx.fill();
		const shaftEndX = b.x - headLength * .6 * Math.cos(angle);
		const shaftEndY = b.y - headLength * .6 * Math.sin(angle);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(shaftEndX, shaftEndY);
		ctx.lineWidth = Math.max(thickness, 4);
		ctx.strokeStyle = color;
		ctx.lineCap = "round";
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(b.x, b.y);
		ctx.lineTo(b.x - headLength * Math.cos(angle - headAngle), b.y - headLength * Math.sin(angle - headAngle));
		ctx.lineTo(b.x - headLength * .5 * Math.cos(angle), b.y - headLength * .5 * Math.sin(angle));
		ctx.lineTo(b.x - headLength * Math.cos(angle + headAngle), b.y - headLength * Math.sin(angle + headAngle));
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
	function confirmSiteMove(request, adapter, timeout = 1e3) {
		const expectedFen = canonicalFen(request.expectedFen);
		if (!expectedFen || request.expectedPly !== null && (!Number.isInteger(request.expectedPly) || request.expectedPly < 0)) return Promise.resolve(false);
		return new Promise((resolve) => {
			let done = false;
			let unsubscribe = null;
			let unsubscribeWhenReady = false;
			let timer;
			const finish = (accepted) => {
				if (done) return;
				done = true;
				if (unsubscribe) try {
					unsubscribe();
				} catch {}
				else unsubscribeWhenReady = true;
				request.signal.removeEventListener("abort", onAbort);
				if (timer) clearTimeout(timer);
				resolve(accepted);
			};
			const check = () => {
				if (done) return;
				let current;
				try {
					current = adapter.read();
				} catch (error) {
					console.error("Super Chess Bot: adapter read failed during move confirmation.", error);
					finish(false);
					return;
				}
				if (current.kind !== "game") return;
				if (current.snapshot.identity !== request.identity) {
					finish(false);
					return;
				}
				if (request.expectedPly !== null) {
					const confirmed = current.snapshot.confirmedFens?.[request.expectedPly];
					if (typeof confirmed !== "string") return;
					finish(canonicalFen(confirmed) === expectedFen);
					return;
				}
				if (canonicalFen(current.snapshot.fen) === expectedFen) finish(true);
			};
			const onAbort = () => {
				check();
				if (!done) finish(false);
			};
			try {
				unsubscribe = adapter.subscribe(check);
				if (unsubscribeWhenReady) {
					unsubscribe();
					unsubscribe = null;
				}
			} catch (error) {
				console.error("Super Chess Bot: adapter subscribe failed during move confirmation.", error);
				finish(false);
				return;
			}
			if (done) return;
			request.signal.addEventListener("abort", onAbort, { once: true });
			timer = setTimeout(() => finish(false), Math.max(0, timeout));
			check();
			if (request.signal.aborted && !done) onAbort();
		});
	}
	function cancelPendingMove() {
		moveRevision++;
	}
	function getMoveRevision() {
		return moveRevision;
	}
	function setStyleIfChanged(element, property, value) {
		if (element.style[property] !== value) element.style[property] = value;
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
		if (isAttachedBoardFlipped()) {
			setStyleIfChanged(blackBar, "bottom", "0");
			setStyleIfChanged(blackBar, "top", "auto");
			setStyleIfChanged(blackBar, "height", `${blackPercent}%`);
			setStyleIfChanged(whiteBar, "top", "0");
			setStyleIfChanged(whiteBar, "bottom", "auto");
			setStyleIfChanged(whiteBar, "height", `${whitePercent}%`);
		} else {
			setStyleIfChanged(whiteBar, "bottom", "0");
			setStyleIfChanged(whiteBar, "top", "auto");
			setStyleIfChanged(whiteBar, "height", `${whitePercent}%`);
			setStyleIfChanged(blackBar, "top", "0");
			setStyleIfChanged(blackBar, "bottom", "auto");
			setStyleIfChanged(blackBar, "height", `${blackPercent}%`);
		}
		const ourEval = (_playingAs === 2 ? "b" : _playingAs === 1 ? "w" : getPlayerColor()) === "w" ? score : -score;
		if (ourEval < -2) setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(255, 100, 100, 0.5)");
		else if (ourEval > 2) setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(100, 255, 100, 0.5)");
		else setStyleIfChanged(boardCtx.evalBarWrap, "borderColor", "rgba(255, 255, 255, 0.2)");
	}
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
					this.stopActiveSearch(job);
				}, job.timeLimit);
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
				const terminal = bestmove === "(none)";
				const common = {
					depth: job.info.depth,
					pv: job.info.pv,
					evaluation: job.info.evaluation,
					...job.info.nodes === void 0 ? {} : { nodes: job.info.nodes },
					...job.info.time === void 0 ? {} : { time: job.info.time }
				};
				job.resultValue = validBestMove(bestmove) ? {
					...common,
					success: true,
					bestmove
				} : {
					...common,
					success: false,
					bestmove: terminal ? "(none)" : ""
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
			if (!signal?.aborted) this.ponderSearch = null;
			return this.client.analyze(fen, depth, timeLimit, signal, history);
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
	function hasLegalMoves(fen) {
		try {
			const setup = parseFen(fen);
			if (setup.isErr) return null;
			const position = Chess.fromSetup(setup.value);
			if (position.isErr) return null;
			return position.value.hasDests();
		} catch {
			return null;
		}
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
	var DEFAULT_BRIDGE_ERROR$1 = "Chess.com board controller not captured. Enable synchronous page-context injection in your userscript manager, then reload.";
	var nextGameId = 0;
	var BOARD_SELECTOR = "wc-chess-board, chess-board, .board";
	var CLOCK_REGION_SELECTOR = ".clock-player-turn";
	var RESULT_SELECTOR = ".game-over-modal-content";
	function readFingerprint(result) {
		if (result.kind !== "game") return {
			identity: null,
			value: JSON.stringify([result.kind, result.reason])
		};
		const snapshot = result.snapshot;
		return {
			identity: snapshot.identity,
			value: JSON.stringify([
				snapshot.gameId,
				snapshot.fen,
				snapshot.playerColor,
				snapshot.sideToMove,
				snapshot.orientation,
				snapshot.phase,
				snapshot.inputReady,
				snapshot.remainingMs,
				snapshot.history?.startFen,
				snapshot.history?.moves,
				snapshot.confirmedFens
			])
		};
	}
	function closestOrSelf(element, selector) {
		return element.matches(selector) ? element : element.closest(selector);
	}
	function nodeContainsSelector(node, selector) {
		const element = mutationElement(node);
		return !!element && (element.matches(selector) || !!element.querySelector(selector));
	}
	function isRelevantMutation$1(records) {
		return records.some((record) => {
			const target = mutationElement(record.target);
			if (!target || target.closest("[data-gabibot-overlay], #menuWrap")) return false;
			const onBoard = !!closestOrSelf(target, BOARD_SELECTOR);
			const onClock = !!closestOrSelf(target, CLOCK_REGION_SELECTOR);
			const onResult = !!closestOrSelf(target, RESULT_SELECTOR);
			if (record.type === "attributes") {
				if (record.attributeName === "data-game-id") return onBoard;
				if (record.attributeName === "class") return onBoard || onClock || onResult;
				return false;
			}
			if (record.type === "characterData") return onClock || onResult;
			if (record.type !== "childList") return false;
			if (onClock || onResult) return true;
			return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some((node) => nodeContainsSelector(node, BOARD_SELECTOR) || nodeContainsSelector(node, ".clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time, .clock-player-turn .move-time-content, .clock-player-turn.move-time-content") || nodeContainsSelector(node, RESULT_SELECTOR));
		});
	}
	function createChesscomAdapter(page = pageWindow) {
		let currentBoard = null;
		let currentGame = null;
		let currentIdentity = null;
		let currentGameId = "";
		let controller = null;
		let bridgeInstalled = false;
		const read = () => {
			if (!ensureBridge()) return {
				kind: "ineligible",
				reason: "Chess.com controller hook is unavailable"
			};
			const doc = page().document;
			const board = getBoard(doc);
			if (!board) return {
				kind: "waiting",
				reason: "Waiting for board"
			};
			const liveGame = board.game ?? null;
			if (liveGame && typeof liveGame.getFEN === "function" && liveGame !== controller) {
				controller = liveGame;
				setCapturedChesscomController(liveGame);
			}
			const game = controller ?? liveGame;
			if (!game || typeof game.getFEN !== "function") return {
				kind: "waiting",
				reason: DEFAULT_BRIDGE_ERROR$1
			};
			const fen = getFen(game);
			if (!fen) return {
				kind: "ineligible",
				reason: "Chess.com position is unavailable"
			};
			const sideToMove = getSideToMove(game);
			if (sideToMove !== "w" && sideToMove !== "b") return {
				kind: "ineligible",
				reason: "Chess.com position is malformed"
			};
			const playingAs = game.getPlayingAs?.();
			if (playingAs !== 1 && playingAs !== 2) return {
				kind: "ineligible",
				reason: "Chess.com player color is unavailable"
			};
			const playerColor = playingAs === 2 ? "b" : "w";
			if (board !== currentBoard || game !== currentGame) {
				currentBoard = board;
				currentGame = game;
				currentIdentity = {};
				const declaredId = game.id ?? board.getAttribute("data-game-id");
				currentGameId = declaredId == null ? `chesscom-${++nextGameId}` : String(declaredId);
			}
			const orientation = getOrientation(game);
			const phase = game.isGameOver?.() || doc.querySelector(".game-over-modal-content") ? "finished" : "live";
			const controllerState = game.getState?.();
			const settled = controllerState === void 0 || controllerState === "Idle";
			const history = readPositionHistory(game, fen);
			const confirmedFensRaw = game.getHistoryFENs?.();
			const confirmedFens = Array.isArray(confirmedFensRaw) ? confirmedFensRaw.filter((item) => typeof item === "string") : void 0;
			return {
				kind: "game",
				snapshot: {
					identity: currentIdentity ?? {},
					gameId: currentGameId,
					board,
					fen,
					playerColor,
					sideToMove,
					orientation,
					phase,
					inputReady: phase === "live" && sideToMove === playerColor && settled,
					remainingMs: getRemainingMs(doc),
					...history ? { history } : {},
					...confirmedFens ? { confirmedFens } : {}
				}
			};
		};
		const fingerprint = (read) => read.kind === "game" ? JSON.stringify([
			read.snapshot.gameId,
			read.snapshot.fen,
			read.snapshot.playerColor,
			read.snapshot.sideToMove,
			read.snapshot.orientation,
			read.snapshot.phase,
			read.snapshot.inputReady,
			read.snapshot.history?.moves
		]) : JSON.stringify([read.kind, read.reason]);
		const notify = () => {
			const next = read();
			const nextFingerprint = fingerprint(next);
			if (next.kind === "game" && lastNotifiedIdentity !== next.snapshot.identity) {
				lastNotifiedIdentity = next.snapshot.identity;
				previousFingerprint = "";
			}
			if (nextFingerprint === previousFingerprint) return;
			previousFingerprint = nextFingerprint;
			for (const listener of [...listeners]) try {
				listener();
			} catch (error) {
				console.error("Super Chess Bot: site listener failed.", error);
			}
		};
		let lastNotifiedIdentity = null;
		let previousFingerprint = "";
		const listeners = new Set();
		const instrumentController = (captured) => {
			if (!captured || typeof captured !== "object") return;
			controller = captured;
			notify();
		};
		const ensureBridge = () => {
			if (bridgeInstalled) return true;
			try {
				bridgeInstalled = installChesscomControllerBridge(page(), instrumentController);
			} catch {
				bridgeInstalled = false;
			}
			return bridgeInstalled;
		};
		ensureBridge();
		return {
			id: "chesscom",
			capabilities: { input: "controller" },
			read: () => read(),
			subscribe(listener) {
				listeners.add(listener);
				let stopObserving = () => {};
				let observedGame = null;
				let moveListener = null;
				let queued = false;
				let active = true;
				const initial = read();
				let previous = readFingerprint(initial);
				previousFingerprint = fingerprint(initial);
				if (initial.kind === "game") lastNotifiedIdentity = initial.snapshot.identity;
				const detachGame = () => {
					if (observedGame && moveListener) observedGame.off?.("Move", moveListener);
					observedGame = null;
					moveListener = null;
				};
				const bind = (result) => {
					const game = result.kind === "game" ? currentGame : null;
					if (game === observedGame) return;
					detachGame();
					if (game && typeof game.on === "function" && typeof game.off === "function") {
						observedGame = game;
						moveListener = notifySubscribed;
						game.on("Move", moveListener);
					}
				};
				const notifySubscribed = () => {
					if (!active) return;
					const result = read();
					bind(result);
					const next = readFingerprint(result);
					if (next.identity === previous.identity && next.value === previous.value) return;
					previous = next;
					try {
						listener();
					} catch (error) {
						console.error("Super Chess Bot: site listener failed.", error);
					}
				};
				bind(initial);
				const doc = page().document;
				const Observer = page().MutationObserver;
				if (doc.body && Observer) {
					const observer = new Observer((records) => {
						if (!isRelevantMutation$1(records)) return;
						if (queued) return;
						queued = true;
						queueMicrotask(() => {
							queued = false;
							notifySubscribed();
						});
					});
					observer.observe(doc.body, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ["class", "data-game-id"],
						characterData: true
					});
					stopObserving = () => observer.disconnect();
				}
				return () => {
					active = false;
					listeners.delete(listener);
					stopObserving();
					detachGame();
				};
			},
			async submitMove(request) {
				if (request.signal.aborted || !request.isCurrent()) return false;
				if (currentGame) resetStuckPromotionWindow(currentGame);
				const current = read();
				if (current.kind !== "game" || current.snapshot.identity !== request.identity || canonicalFen(current.snapshot.fen) !== canonicalFen(request.fromFen) || !current.snapshot.inputReady) return false;
				const game = currentGame;
				if (!game || typeof game.move !== "function") return false;
				const uci = request.uci;
				if (typeof uci !== "string" || uci.length < 4) return false;
				const from = uci.slice(0, 2);
				const to = uci.slice(2, 4);
				const promotionChar = uci.length > 4 ? uci[4].toLowerCase() : "";
				const promotion = /^[qrbn]$/.test(promotionChar) ? promotionChar : void 0;
				if (!isLegalChesscomMove(game, from, to)) return false;
				if (request.signal.aborted || !request.isCurrent() || currentGame !== game) return false;
				try {
					return game.move({
						from,
						to,
						...promotion ? { promotion } : {}
					})?.type === "Move";
				} catch {
					return false;
				}
			},
			cancelInput() {}
		};
	}
	function isObject(value) {
		return typeof value === "object" && value !== null || typeof value === "function";
	}
	function installLichessControllerBridge(page, onController) {
		const hookedSites = new WeakSet();
		const hookedAssets = new WeakMap();
		const wrapAsset = (asset) => {
			if (!isObject(asset)) return asset;
			const cached = hookedAssets.get(asset);
			if (cached) return cached;
			const originalPageInitializer = Reflect.get(asset, "loadEsmPage");
			const roundInitializer = Reflect.get(asset, "loadEsm");
			if (typeof originalPageInitializer !== "function" || typeof roundInitializer !== "function") return asset;
			const wrappedAsset = Object.create(asset);
			const wrappedRoundInitializer = (name, ...args) => {
				const result = Reflect.apply(roundInitializer, asset, [name, ...args]);
				const options = args[0];
				const usesNpmModule = isObject(options) && Reflect.get(options, "npm") === true;
				if (name !== "round" || usesNpmModule) return result;
				return Promise.resolve(result).then((controller) => {
					try {
						onController(controller);
					} catch {}
					return controller;
				});
			};
			Object.defineProperty(wrappedAsset, "loadEsm", {
				configurable: true,
				enumerable: true,
				value: wrappedRoundInitializer
			});
			Object.defineProperty(wrappedAsset, "loadEsmPage", {
				configurable: true,
				enumerable: true,
				value(name, ...args) {
					if (name !== "round") return Reflect.apply(originalPageInitializer, asset, [name, ...args]);
					const initElement = page.document.getElementById("page-init-data");
					const initOptions = initElement ? JSON.parse(initElement.innerHTML) : void 0;
					initElement?.remove();
					return Reflect.apply(wrappedRoundInitializer, wrappedAsset, [name, { init: initOptions }]);
				}
			});
			hookedAssets.set(asset, wrappedAsset);
			return wrappedAsset;
		};
		const hookSite = (site) => {
			if (!isObject(site)) return false;
			if (hookedSites.has(site)) return true;
			let asset = wrapAsset(Reflect.get(site, "asset"));
			const descriptor = Object.getOwnPropertyDescriptor(site, "asset");
			if (descriptor?.configurable === false) {
				if (!descriptor.writable || !Reflect.set(site, "asset", asset)) return false;
				hookedSites.add(site);
				return true;
			}
			try {
				Object.defineProperty(site, "asset", {
					configurable: true,
					enumerable: descriptor?.enumerable ?? true,
					get: () => asset,
					set: (next) => {
						asset = wrapAsset(next);
					}
				});
				hookedSites.add(site);
				return true;
			} catch {
				return false;
			}
		};
		let currentSite;
		try {
			currentSite = Reflect.get(page, "site");
			const descriptor = Object.getOwnPropertyDescriptor(page, "site");
			if (descriptor?.configurable === false) return hookSite(currentSite);
			Object.defineProperty(page, "site", {
				configurable: true,
				enumerable: descriptor?.enumerable ?? true,
				get: () => currentSite,
				set: (next) => {
					currentSite = next;
					hookSite(next);
				}
			});
		} catch {
			return hookSite(currentSite);
		}
		if (currentSite !== void 0) hookSite(currentSite);
		return true;
	}
	var PROMOTION_ROLE$1 = {
		queen: "queen",
		rook: "rook",
		bishop: "bishop",
		knight: "knight"
	};
	var ORTHODOX_VARIANT_KEYS = new Set(["standard", "fromPosition"]);
	var DEFAULT_BRIDGE_ERROR = "Lichess round controller not captured. Enable synchronous page-context injection in your userscript manager, then reload.";
	function lichessColor(color) {
		return color === "w" ? "white" : "black";
	}
	function engineColor(color) {
		if (color === "white") return "w";
		if (color === "black") return "b";
		return null;
	}
	function visibleBoard(board) {
		try {
			if (!board.isConnected || board.getClientRects().length === 0) return false;
			const rect = board.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return false;
			const style = board.ownerDocument.defaultView?.getComputedStyle(board);
			return style?.display !== "none" && style?.visibility !== "hidden";
		} catch {
			return false;
		}
	}
	function stepFen(round, phase) {
		const lastPly = round.lastPly?.();
		const currentPly = phase === "replay" && Number.isInteger(round.ply) ? round.ply : lastPly;
		if (Number.isInteger(currentPly) && round.stepAt) try {
			const step = round.stepAt(currentPly);
			if (step && typeof step.fen === "string") return step;
		} catch {
			return null;
		}
		const steps = round.data?.steps;
		const step = steps?.[steps.length - 1];
		return step && typeof step.fen === "string" ? step : null;
	}
	function matchesStepFen(storedFen, expectedFen) {
		if (typeof storedFen !== "string") return false;
		const trimmed = storedFen.trim();
		const fullFen = canonicalFen(trimmed);
		if (fullFen) return fullFen === expectedFen;
		return !/\s/.test(trimmed) && trimmed === expectedFen.split(" ")[0];
	}
	function buildHistoryFor(data, selectedStep) {
		const steps = data.steps;
		if (!steps?.length || steps[0]?.ply !== 0) return void 0;
		const selectedIndex = steps.findIndex((step) => step.ply === selectedStep.ply);
		if (selectedIndex < 0) return void 0;
		const selectedSteps = steps.slice(0, selectedIndex + 1);
		if (selectedSteps.some((step, index) => step.ply !== index)) return void 0;
		const startFen = canonicalFen(selectedSteps[0]?.fen ?? "");
		if (!startFen) return void 0;
		const replay = replaySanLine(startFen, selectedSteps.slice(1).map((step) => step.san));
		if (!replay) return void 0;
		if (replay.fens.some((position, index) => !matchesStepFen(selectedSteps[index]?.fen, position))) return void 0;
		const fen = replay.fens.at(-1);
		if (!fen || !matchesStepFen(selectedStep.fen, fen)) return void 0;
		return {
			fen,
			history: replay.history,
			confirmedFens: replay.fens
		};
	}
	function createHistoryReader() {
		let cachedData = null;
		let cachedSteps;
		let cachedInput = "";
		let cachedResult;
		let hasCache = false;
		return (data, selectedStep) => {
			const steps = data.steps;
			const selectedIndex = steps?.findIndex((step) => step.ply === selectedStep.ply) ?? -1;
			const input = JSON.stringify([
				selectedStep.ply,
				selectedStep.fen,
				selectedIndex >= 0 ? steps?.slice(0, selectedIndex + 1).map((step) => [
					step.ply,
					step.fen,
					step.san
				]) : null
			]);
			if (hasCache && data === cachedData && steps === cachedSteps && input === cachedInput) return cachedResult;
			cachedData = data;
			cachedSteps = steps;
			cachedInput = input;
			cachedResult = buildHistoryFor(data, selectedStep);
			hasCache = true;
			return cachedResult;
		};
	}
	function moveDetails$1(request) {
		const sourceFen = canonicalFen(request.fromFen);
		const expectedFen = canonicalFen(request.expectedFen);
		if (!sourceFen || !expectedFen) return null;
		const setup = parseFen(sourceFen);
		if (setup.isErr) return null;
		const position = Chess.fromSetup(setup.value);
		if (position.isErr) return null;
		const move = parseUci(request.uci);
		if (!move || !("from" in move) || !position.value.isLegal(move)) return null;
		const normalized = normalizeMove(position.value, move);
		const from = makeSquare(move.from);
		const toCandidates = [...new Set([makeSquare(move.to), makeSquare(normalized.to)])];
		position.value.play(move);
		if (canonicalFen(makeFen(position.value.toSetup())) !== expectedFen) return null;
		const promotionRole = move.promotion ? PROMOTION_ROLE$1[move.promotion] : void 0;
		if (move.promotion && !promotionRole) return null;
		return {
			from,
			toCandidates,
			...promotionRole ? { promotionRole } : {}
		};
	}
	function wrapMethod(target, key, after) {
		const original = target[key];
		if (typeof original !== "function") return;
		try {
			target[key] = function(...args) {
				const result = Reflect.apply(original, this, args);
				queueMicrotask(after);
				return result;
			};
		} catch {}
	}
	function createLichessAdapter(page = pageWindow) {
		const currentPage = page();
		const listeners = new Set();
		let round = null;
		let lastRound = null;
		let lastGameId = null;
		let lastBoard = null;
		let identity = {};
		let previousFingerprint = "";
		const readHistory = createHistoryReader();
		const capture = () => {
			if (!round) return {
				kind: "waiting",
				reason: DEFAULT_BRIDGE_ERROR
			};
			try {
				const data = round.data;
				const game = data?.game;
				const player = data?.player;
				if (!data || !game || !player) return {
					kind: "waiting",
					reason: "Waiting for Lichess game state"
				};
				if (typeof game.variant?.key !== "string" || !ORTHODOX_VARIANT_KEYS.has(game.variant.key)) return {
					kind: "ineligible",
					reason: "Lichess standard chess is required"
				};
				if (player.spectator === true) return {
					kind: "ineligible",
					reason: "Lichess player round is required"
				};
				if (typeof game.id !== "string" || !game.id) return {
					kind: "waiting",
					reason: "Waiting for Lichess game identity"
				};
				const statusId = game.status?.id;
				if (typeof statusId !== "number" || !Number.isFinite(statusId)) return {
					kind: "waiting",
					reason: "Waiting for Lichess game status"
				};
				if (statusId < 20) return {
					kind: "waiting",
					reason: "Lichess game has not started"
				};
				const board = currentPage.document.querySelector(".round__app .cg-wrap");
				if (!board || !visibleBoard(board)) return {
					kind: "waiting",
					reason: "Waiting for Lichess chessboard"
				};
				const playerColor = engineColor(player.color);
				const orientation = round.chessground?.state?.orientation;
				if (!playerColor || orientation !== "white" && orientation !== "black") return {
					kind: "ineligible",
					reason: "Lichess player color or board orientation is unavailable"
				};
				const replaying = round.replaying?.() === true;
				const phase = statusId >= 25 ? "finished" : replaying ? "replay" : "live";
				if (phase === "live" && round.isPlaying?.() !== true) return {
					kind: "ineligible",
					reason: "Lichess player round is required"
				};
				const selectedStep = stepFen(round, phase);
				if (!selectedStep) return {
					kind: "ineligible",
					reason: "Lichess accepted FEN is unavailable"
				};
				const history = readHistory(data, selectedStep);
				const fen = canonicalFen(selectedStep.fen) ?? history?.fen ?? null;
				if (!fen) return {
					kind: "ineligible",
					reason: "Lichess accepted FEN is unavailable"
				};
				const sideToMove = fen.split(" ")[1];
				if (sideToMove !== "w" && sideToMove !== "b") return {
					kind: "ineligible",
					reason: "Lichess side to move is unavailable"
				};
				const gameId = game.id;
				if (round !== lastRound || gameId !== lastGameId || board !== lastBoard) {
					lastRound = round;
					lastGameId = gameId;
					lastBoard = board;
					identity = {};
				}
				const cgState = round.chessground?.state;
				const canMove = round.canMove?.() === true;
				const inputReady = phase === "live" && sideToMove === playerColor && canMove && cgState?.turnColor === lichessColor(playerColor) && cgState.movable?.color === lichessColor(playerColor) && !cgState.selected && !round.loading && !round.redirecting && !round.toSubmit;
				let remainingMs = null;
				try {
					const clock = round.clock?.millisOf?.(lichessColor(playerColor));
					if (typeof clock === "number" && Number.isFinite(clock) && clock >= 0) remainingMs = clock;
				} catch {}
				return {
					kind: "game",
					snapshot: {
						identity,
						gameId,
						board,
						fen,
						playerColor,
						sideToMove,
						orientation,
						phase,
						inputReady,
						remainingMs,
						...history ? {
							history: history.history,
							confirmedFens: history.confirmedFens
						} : {}
					}
				};
			} catch {
				return {
					kind: "waiting",
					reason: "Waiting for Lichess game state"
				};
			}
		};
		const fingerprint = (read) => read.kind === "game" ? JSON.stringify([
			read.snapshot.gameId,
			read.snapshot.fen,
			read.snapshot.playerColor,
			read.snapshot.orientation,
			read.snapshot.phase,
			read.snapshot.inputReady,
			read.snapshot.history?.moves
		]) : JSON.stringify([read.kind, read.reason]);
		const notify = () => {
			const next = capture();
			const nextFingerprint = fingerprint(next);
			if (next.kind === "game" && lastNotifiedIdentity !== next.snapshot.identity) {
				lastNotifiedIdentity = next.snapshot.identity;
				previousFingerprint = "";
			}
			if (nextFingerprint === previousFingerprint) return;
			previousFingerprint = nextFingerprint;
			for (const listener of [...listeners]) try {
				listener();
			} catch (error) {
				console.error("Super Chess Bot: Lichess listener failed.", error);
			}
		};
		let lastNotifiedIdentity = null;
		const instrumentRound = (controller) => {
			if (!controller || typeof controller !== "object") return;
			round = controller;
			const target = round;
			for (const method of [
				"jump",
				"flipNow",
				"reload"
			]) wrapMethod(target, method, notify);
			const handlers = round.socket?.handlers;
			if (handlers) for (const method of [
				"move",
				"drop",
				"endData",
				"reload"
			]) wrapMethod(handlers, method, notify);
			notify();
		};
		const bridgeInstalled = installLichessControllerBridge(currentPage, instrumentRound);
		return {
			id: "lichess",
			capabilities: { input: "controller" },
			read: () => bridgeInstalled ? capture() : {
				kind: "ineligible",
				reason: "Lichess round hook is unavailable"
			},
			subscribe(listener) {
				listeners.add(listener);
				const current = capture();
				previousFingerprint = fingerprint(current);
				if (current.kind === "game") lastNotifiedIdentity = current.snapshot.identity;
				return () => listeners.delete(listener);
			},
			async submitMove(request) {
				const current = capture();
				if (request.signal.aborted || request.isCurrent() !== true || current.kind !== "game" || current.snapshot.identity !== request.identity || canonicalFen(current.snapshot.fen) !== canonicalFen(request.fromFen) || !current.snapshot.inputReady) return false;
				const controller = round;
				const cgState = controller?.chessground?.state;
				const pluginMove = controller?.pluginMove;
				if (!controller || !cgState || typeof pluginMove !== "function") return false;
				const detail = moveDetails$1(request);
				if (!detail) return false;
				const destinations = cgState.movable?.dests?.get?.(detail.from);
				if (!destinations) return false;
				const legalDestinations = new Set(Array.from(destinations, String));
				const target = detail.toCandidates.find((candidate) => legalDestinations.has(candidate));
				if (!target) return false;
				if (request.signal.aborted || !request.isCurrent() || round !== controller) return false;
				try {
					pluginMove.call(controller, detail.from, target, detail.promotionRole, true);
					return true;
				} catch {
					return false;
				}
			},
			cancelInput() {}
		};
	}
	function dispatchPointerOrMouse(el, type, opts, usePointer) {
		if (!el) return;
		const mouseType = type.replace("pointer", "mouse");
		if (usePointer) try {
			el.dispatchEvent(new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				composed: true,
				...opts
			}));
			el.dispatchEvent(new MouseEvent(mouseType, {
				bubbles: true,
				cancelable: true,
				composed: true,
				...opts
			}));
			return;
		} catch {}
		el.dispatchEvent(new MouseEvent(mouseType, {
			bubbles: true,
			cancelable: true,
			composed: true,
			...opts
		}));
	}
	function createPointerOpts(x, y, buttons) {
		return {
			clientX: x,
			clientY: y,
			screenX: x + (typeof window !== "undefined" ? window.screenX || 0 : 0),
			screenY: y + (typeof window !== "undefined" ? window.screenY || 0 : 0),
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
	async function activateElement(element, getTargetAt, guard) {
		try {
			const rect = element.getBoundingClientRect();
			if (!rect.width || !rect.height) return false;
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;
			const target = getTargetAt(x, y);
			if (target !== element && !element.contains(target)) return false;
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
	}
	var STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
	var TERMINAL_RESULTS = new Set([
		"1-0",
		"0-1",
		"1/2-1/2"
	]);
	var cachedReplayKey = null;
	var cachedReplay;
	function colorValue(color) {
		if (color === "white") return "w";
		if (color === "black") return "b";
		return null;
	}
	function normalizedName(value) {
		return value?.trim().toLocaleLowerCase() || null;
	}
	function pathGameId(pathname) {
		const parts = pathname.split("/").filter(Boolean);
		return parts.length === 1 ? parts[0] : null;
	}
	function parseClock(clock) {
		if (clock.connecting || !clock.min || !clock.sec) return null;
		if (!/^\d{1,3}$/.test(clock.min) || !/^\d{1,2}(?:\.\d+)?$/.test(clock.sec)) return null;
		const minutes = Number(clock.min);
		const seconds = Number(clock.sec);
		if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
		return Math.round((minutes * 60 + seconds) * 1e3);
	}
	function unavailable(reason) {
		return {
			kind: "ineligible",
			reason
		};
	}
	function replayAcceptedHistory(startFen, sans) {
		const key = JSON.stringify([startFen, sans]);
		if (key === cachedReplayKey) return cachedReplay;
		cachedReplayKey = key;
		cachedReplay = replaySanLine(startFen, sans);
		return cachedReplay;
	}
	function parsePychessObservation(observation, identity) {
		const { metadata, board, state } = observation;
		if (!identity || typeof identity !== "object") return unavailable("PyChess game identity is unavailable");
		if (!metadata.isRoundView) return {
			kind: "waiting",
			reason: "Waiting for PyChess game"
		};
		const urlGameId = pathGameId(metadata.pathname);
		if (!metadata.gameId || !urlGameId || metadata.gameId !== urlGameId) return unavailable("PyChess game identity does not match the current URL");
		const username = normalizedName(metadata.username);
		const whitePlayer = normalizedName(metadata.whitePlayer);
		const blackPlayer = normalizedName(metadata.blackPlayer);
		if (!username || !whitePlayer || !blackPlayer || username !== whitePlayer && username !== blackPlayer) return unavailable("PyChess player identity is unavailable or conflicting");
		if (username === whitePlayer && username === blackPlayer) return unavailable("PyChess player identity is ambiguous");
		const playerColor = username === whitePlayer ? "w" : "b";
		if (metadata.variant?.trim().toLowerCase() !== "chess") return unavailable("PyChess chess variant required");
		if (!["false", "0"].includes(metadata.chess960?.trim().toLowerCase() ?? "")) return unavailable("PyChess Chess960 is not supported");
		if (!["false", "0"].includes(metadata.correspondence?.trim().toLowerCase() ?? "")) return unavailable("PyChess real-time game required");
		if (!board.element || !board.connected || !board.visible || !board.owned) return unavailable("PyChess board is disconnected, hidden, or not owned by this game");
		if (board.width !== 8 || board.height !== 8) return unavailable("PyChess board is not 8×8");
		const orientation = state.orientation;
		if (orientation !== "white" && orientation !== "black") return unavailable("PyChess board orientation is unavailable");
		if (!state.fen) return unavailable("PyChess accepted FEN is unavailable");
		const fen = canonicalFen(state.fen);
		if (!fen) return unavailable("PyChess accepted FEN is malformed");
		const sideField = fen.split(" ")[1];
		if (sideField !== "w" && sideField !== "b") return unavailable("PyChess side to move is unavailable");
		const sideToMove = sideField;
		const startFen = metadata.initialFen?.trim() || STANDARD_START_FEN;
		if (!canonicalFen(startFen)) return unavailable("PyChess initial FEN is malformed");
		const orderedMoves = [...observation.moves];
		if (orderedMoves.some((move, index) => move.ply !== index + 1 || !move.san.trim())) return unavailable("PyChess move history is truncated or noncontiguous");
		const replay = replayAcceptedHistory(startFen, orderedMoves.map((move) => move.san));
		if (!replay) return unavailable("PyChess move history contains invalid SAN");
		const activeMoves = orderedMoves.filter((move) => move.active);
		if (activeMoves.length > 1) return unavailable("PyChess active move selection is ambiguous");
		const activePly = activeMoves[0]?.ply ?? 0;
		if (activePly > orderedMoves.length) return unavailable("PyChess active move is outside the game history");
		if (replay.fens[activePly] !== fen) return {
			kind: "waiting",
			reason: "Waiting for PyChess position and move history to synchronize"
		};
		const renderedResult = observation.result.text?.trim() ?? "";
		const terminalResult = TERMINAL_RESULTS.has(renderedResult) || renderedResult === "*";
		const rawInitialStatus = metadata.status?.trim();
		const initialStatus = rawInitialStatus ? Number(rawInitialStatus) : NaN;
		const initialResult = metadata.initialResult?.trim() ?? "";
		const initialTerminal = Number.isInteger(initialStatus) && initialStatus >= 0 && TERMINAL_RESULTS.has(initialResult);
		const finished = observation.result.postgame && terminalResult || initialTerminal;
		const latestPly = orderedMoves.length;
		const phase = finished ? "finished" : activePly < latestPly ? "replay" : "live";
		const history = {
			...replay.history,
			moves: replay.history.moves.slice(0, activePly)
		};
		const movingColor = colorValue(state.turnColor);
		const movableColor = colorValue(state.movableColor);
		const displayedInSync = state.displayedPlacement === fen.split(" ")[0] && movingColor === sideToMove;
		const playerClockIndex = orientation === "white" ? playerColor === "w" ? 1 : 0 : playerColor === "w" ? 0 : 1;
		const playerClock = observation.clocks[playerClockIndex === 0 ? "clock0" : "clock1"];
		const remainingMs = parseClock(playerClock);
		const inputReady = phase === "live" && displayedInSync && sideToMove === playerColor && movableColor === playerColor && !playerClock.connecting;
		return {
			kind: "game",
			snapshot: {
				identity,
				gameId: metadata.gameId,
				board: board.element,
				fen,
				playerColor,
				sideToMove,
				orientation,
				phase,
				inputReady,
				remainingMs,
				history,
				confirmedFens: replay.fens
			}
		};
	}
	var PROMOTION_ROLE = {
		q: "q-piece",
		r: "r-piece",
		b: "b-piece",
		n: "n-piece"
	};
	var INPUT_TIMEOUT_MS = 1e3;
	function cleanFen(fen) {
		return canonicalFen(fen);
	}
	function moveDetails(request) {
		const sourceFen = cleanFen(request.fromFen);
		const expectedFen = cleanFen(request.expectedFen);
		if (!sourceFen || !expectedFen) return null;
		const setup = parseFen(sourceFen);
		if (setup.isErr) return null;
		const position = Chess.fromSetup(setup.value);
		if (position.isErr) return null;
		const move = parseUci(request.uci);
		if (!move || !("from" in move) || !position.value.isLegal(move)) return null;
		const normalized = normalizeMove(position.value, move);
		const from = makeSquare(move.from);
		const candidates = [...new Set([makeSquare(move.to), makeSquare(normalized.to)])];
		position.value.play(move);
		if (cleanFen(makeFen(position.value.toSetup())) !== expectedFen) return null;
		return {
			from,
			toCandidates: candidates,
			promotion: !!move.promotion
		};
	}
	function roleMatches(piece, role, color) {
		const roleClass = PROMOTION_ROLE[role];
		if (!roleClass) return false;
		const classList = piece.classList;
		return classList.contains(roleClass) && classList.contains(color);
	}
	function visible(element) {
		if (!element.isConnected || element.getClientRects().length === 0) return false;
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return false;
		const style = element.ownerDocument.defaultView?.getComputedStyle(element);
		return style?.display !== "none" && style?.visibility !== "hidden";
	}
	function isRelevantMutation(records) {
		return records.some((record) => {
			const target = mutationElement(record.target);
			if (!target || target.closest("[data-gabibot-overlay], #menuWrap")) return false;
			if (target.closest("#mainboard, #movelist, .btn-controls")) return true;
			if (record.type === "attributes" && record.attributeName === "class" && target.matches(".clock")) return true;
			if (record.type !== "childList") return false;
			return [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some((node) => {
				const element = mutationElement(node);
				return !!element && (element.matches(".round-app") || !!element.querySelector(".round-app, #mainboard, #movelist"));
			});
		});
	}
	function createPychessAdapter(page = pageWindow) {
		let lastGameId = null;
		let lastBoard = null;
		let lastCg = null;
		let identity = {};
		const capture = () => {
			const currentPage = page();
			const observation = collectPychessObservation(currentPage);
			bindTrustedBoard(observation.board.element);
			const cg = currentPage.cg ?? null;
			if (observation.metadata.gameId !== lastGameId || observation.board.element !== lastBoard || cg !== lastCg) {
				lastGameId = observation.metadata.gameId;
				lastBoard = observation.board.element;
				lastCg = cg;
				identity = {};
			}
			const read = parsePychessObservation(observation, identity);
			return {
				read,
				fingerprint: read.kind === "game" ? JSON.stringify([
					read.snapshot.gameId,
					read.snapshot.fen,
					read.snapshot.playerColor,
					read.snapshot.orientation,
					read.snapshot.phase,
					read.snapshot.inputReady,
					read.snapshot.history?.moves,
					read.snapshot.confirmedFens,
					observation.result.text,
					observation.result.postgame,
					observation.clocks.clock0.connecting,
					observation.clocks.clock1.connecting
				]) : JSON.stringify([
					read.kind,
					read.reason,
					observation.result.text,
					observation.result.postgame
				]),
				identity
			};
		};
		let watchedBoard = null;
		let trustedRevision = 0;
		let trustedEventNames = [];
		let pendingInput = null;
		const onTrustedInput = (event) => {
			if (!event.isTrusted) return;
			if ("button" in event && typeof event.button === "number" && event.button !== 0) return;
			trustedRevision++;
			const board = page().cg?.state?.dom?.elements?.board;
			const target = event.target;
			if (!board || !target || !board.contains(target)) notifyBoardInput(event);
		};
		const bindTrustedBoard = (board) => {
			const mainboard = board && typeof board.closest === "function" ? board.closest("#mainboard") : null;
			const candidate = board ? mainboard ?? board.parentElement ?? board : null;
			const inputRegion = candidate && typeof candidate.addEventListener === "function" && typeof candidate.removeEventListener === "function" ? candidate : null;
			if (inputRegion === watchedBoard) return;
			if (watchedBoard) for (const eventName of trustedEventNames) watchedBoard.removeEventListener(eventName, onTrustedInput, true);
			watchedBoard = inputRegion;
			trustedEventNames = [];
			if (!watchedBoard) return;
			trustedEventNames = page().PointerEvent ? ["pointerdown"] : ["mousedown", "touchstart"];
			for (const eventName of trustedEventNames) watchedBoard.addEventListener(eventName, onTrustedInput, true);
		};
		const releasePendingInput = (pending, cancelOwnedInput) => {
			if (pendingInput === pending) pendingInput = null;
			pending.request.signal.removeEventListener("abort", pending.onAbort);
			pending.cancelled = true;
			if (!cancelOwnedInput || pending.userRevision !== trustedRevision) return;
			const currentPage = page();
			if (pending.promotion && pending.chooser?.isConnected && currentPage.document.querySelector("#extension_choice") === pending.chooser) {
				pending.chooser.click();
				return;
			}
			if (pending.cg.state?.selectable?.selected === pending.from) pending.cg.selectSquare?.(null);
		};
		const isPendingCurrent = (pending, requireInputReady) => {
			try {
				if (pending.cancelled || pending.request.signal.aborted || pending.userRevision !== trustedRevision || page().cg !== pending.cg || pending.request.isCurrent() !== true) return false;
				const current = capture().read;
				if (current.kind !== "game" || current.snapshot.identity !== pending.request.identity || current.snapshot.board !== pending.board || cleanFen(current.snapshot.fen) !== cleanFen(pending.request.fromFen)) return false;
				if (!requireInputReady) return true;
				const color = current.snapshot.playerColor === "w" ? "white" : "black";
				return current.snapshot.inputReady && current.snapshot.sideToMove === current.snapshot.playerColor && pending.cg.state?.turnColor === color && pending.cg.state.movable?.color === color;
			} catch {
				return false;
			}
		};
		const isInputStillOwned = (pending) => {
			try {
				if (pending.cancelled || pending.request.signal.aborted || pending.userRevision !== trustedRevision || page().cg !== pending.cg) return false;
				const current = capture().read;
				return current.kind === "game" && current.snapshot.identity === pending.request.identity && current.snapshot.board === pending.board;
			} catch {
				return false;
			}
		};
		const cancelCurrentInput = () => {
			const pending = pendingInput;
			if (pending) releasePendingInput(pending, true);
		};
		const findPromotionChoice = (pending) => {
			const root = page().document.querySelector("#extension_choice");
			pending.chooser = root;
			if (!root?.isConnected || !visible(root)) return null;
			const requested = pending.request.uci.slice(-1).toLowerCase();
			const color = pending.playerColor === "w" ? "white" : "black";
			for (const piece of Array.from(root.querySelectorAll("square > piece"))) {
				const square = piece.parentElement;
				if (square && square.closest("#extension_choice") === root && roleMatches(piece, requested, color) && visible(square) && visible(piece)) return square;
			}
			return null;
		};
		const waitForPromotionChoice = async (pending) => {
			let elapsed = 0;
			while (elapsed < INPUT_TIMEOUT_MS) {
				if (!isInputStillOwned(pending)) {
					releasePendingInput(pending, true);
					return false;
				}
				const choice = findPromotionChoice(pending);
				if (choice) {
					const activated = await activateElement(choice, (x, y) => page().document.elementFromPoint(x, y) ?? choice, () => isInputStillOwned(pending));
					releasePendingInput(pending, !activated);
					return activated;
				}
				const delay = Math.min(16, INPUT_TIMEOUT_MS - elapsed);
				await new Promise((resolve) => setTimeout(resolve, delay));
				elapsed += delay;
			}
			releasePendingInput(pending, true);
			return false;
		};
		return {
			id: "pychess",
			capabilities: { input: "selection" },
			read: () => capture().read,
			subscribe(listener) {
				const currentPage = page();
				const body = currentPage.document.body;
				const Observer = currentPage.MutationObserver;
				if (!body || !Observer) return () => {};
				let active = true;
				let queued = false;
				let previous = capture();
				const observer = new Observer((records) => {
					if (!isRelevantMutation(records)) return;
					if (queued || !active) return;
					queued = true;
					queueMicrotask(() => {
						queued = false;
						if (!active) return;
						const next = capture();
						if (next.identity === previous.identity && next.fingerprint === previous.fingerprint) return;
						previous = next;
						try {
							listener();
						} catch (error) {
							console.error("Super Chess Bot: PyChess listener failed.", error);
						}
					});
				});
				observer.observe(body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["class", "data-ply"],
					characterData: true
				});
				return () => {
					active = false;
					observer.disconnect();
				};
			},
			async submitMove(request) {
				if (pendingInput) cancelCurrentInput();
				try {
					if (request.signal.aborted) return false;
					const initial = capture().read;
					const cg = page().cg;
					const state = cg?.state;
					const board = initial.kind === "game" ? initial.snapshot.board : null;
					if (initial.kind !== "game" || !board || initial.snapshot.identity !== request.identity || cleanFen(initial.snapshot.fen) !== cleanFen(request.fromFen) || !initial.snapshot.inputReady || !cg || !state || !cg.selectSquare || page().document.querySelector(".round-app #mainboard cg-board") !== board || state.dom?.elements?.board !== board || state.selectable?.selected) return false;
					const detail = moveDetails(request);
					if (!detail) return false;
					const destinations = state.movable?.dests?.get(detail.from);
					if (!destinations) return false;
					const legalDestinations = new Set(Array.from(destinations, String));
					const to = detail.toCandidates.find((target) => legalDestinations.has(target));
					if (!to) return false;
					if (detail.promotion && !state.stats) return false;
					const pending = {
						request,
						cg,
						board,
						from: detail.from,
						playerColor: initial.snapshot.playerColor,
						userRevision: trustedRevision,
						promotion: detail.promotion,
						chooser: null,
						cancelled: false,
						onAbort: () => {}
					};
					pending.onAbort = () => releasePendingInput(pending, true);
					pendingInput = pending;
					request.signal.addEventListener("abort", pending.onAbort, { once: true });
					if (!isPendingCurrent(pending, true)) {
						releasePendingInput(pending, true);
						return false;
					}
					cg.selectSquare(detail.from);
					if (state.selectable?.selected !== detail.from || !isPendingCurrent(pending, true)) {
						releasePendingInput(pending, true);
						return false;
					}
					const stats = state.stats;
					const hadCtrlKey = !!stats && Object.hasOwn(stats, "ctrlKey");
					const previousCtrlKey = stats?.ctrlKey;
					if (detail.promotion && stats) stats.ctrlKey = true;
					try {
						if (!isPendingCurrent(pending, true)) {
							releasePendingInput(pending, true);
							return false;
						}
						cg.selectSquare(to);
					} finally {
						if (detail.promotion && stats) {
							if (hadCtrlKey) stats.ctrlKey = previousCtrlKey;
							else delete stats.ctrlKey;
						}
					}
					if (!isInputStillOwned(pending)) {
						releasePendingInput(pending, true);
						return false;
					}
					if (!detail.promotion) {
						const expectedPlacement = cleanFen(request.expectedFen)?.split(" ")[0];
						const displayedPlacement = cg.getFen?.().trim().split(/\s+/)[0];
						const submitted = !!expectedPlacement && displayedPlacement === expectedPlacement;
						releasePendingInput(pending, !submitted);
						return submitted;
					}
					return await waitForPromotionChoice(pending);
				} catch {
					if (pendingInput) releasePendingInput(pendingInput, true);
					return false;
				}
			},
			cancelInput() {
				cancelCurrentInput();
			}
		};
	}
	function collectPychessObservation(page) {
		const doc = page.document;
		const body = doc.body;
		const cg = page.cg;
		const state = cg?.state;
		const board = doc.querySelector(".round-app #mainboard cg-board");
		const controllerBoard = state?.dom?.elements?.board ?? null;
		const dimensions = state?.dimensions;
		const directSquares = board?.querySelectorAll(":scope > square").length ?? 0;
		const width = Number.isInteger(dimensions?.width) ? dimensions?.width : directSquares === 64 ? 8 : 0;
		const height = Number.isInteger(dimensions?.height) ? dimensions?.height : directSquares === 64 ? 8 : 0;
		const style = board ? board.ownerDocument.defaultView?.getComputedStyle(board) : null;
		const rect = board?.getBoundingClientRect();
		const visible = !!board && style?.display !== "none" && style?.visibility !== "hidden" && (board.getClientRects?.().length ?? 0) > 0 && !!rect && rect.width > 0 && rect.height > 0;
		const moves = Array.from(doc.querySelectorAll("#movelist move[ply]")).flatMap((move) => {
			const ply = Number(move.getAttribute("ply"));
			const san = move.querySelector("san")?.textContent?.trim() ?? "";
			if (!Number.isInteger(ply) || ply < 1 || !san) return [];
			return [{
				ply,
				san,
				active: move.classList.contains("active")
			}];
		});
		const clock = (id) => {
			return {
				min: doc.querySelector(`#clock${id} .clock-time.min`)?.textContent?.trim() ?? null,
				sec: doc.querySelector(`#clock${id} .clock-time.sec`)?.textContent?.trim() ?? null,
				connecting: !!doc.querySelector(`#clock${id} .clock.connecting`)
			};
		};
		const renderedResult = doc.querySelector("#movelist .result")?.textContent?.trim() ?? null;
		const postgame = !!doc.querySelector(".btn-controls.after");
		const dataset = body.dataset;
		const orientation = state?.orientation ?? null;
		const turnColor = state?.turnColor ?? null;
		const movableColor = state?.movable?.color ?? null;
		const fen = state?.fen ?? null;
		const displayedPlacement = cg?.getFen?.() ?? (fen ? fen.split(" ")[0] : null);
		return {
			metadata: {
				isRoundView: dataset.view === "round" && !!doc.querySelector(".round-app"),
				pathname: page.location.pathname,
				gameId: dataset.gameid || null,
				username: dataset.username || null,
				whitePlayer: dataset.wplayer || null,
				blackPlayer: dataset.bplayer || null,
				variant: dataset.variant || null,
				chess960: dataset.chess960 || null,
				correspondence: dataset.corr || null,
				initialFen: dataset.initialfen ?? null,
				status: dataset.status ?? null,
				initialResult: dataset.result ?? null
			},
			board: {
				element: board,
				owned: !!board && board === controllerBoard,
				connected: !!board?.isConnected,
				visible,
				width,
				height
			},
			state: {
				fen,
				displayedPlacement,
				turnColor,
				movableColor,
				orientation
			},
			moves,
			result: {
				text: renderedResult,
				postgame
			},
			clocks: {
				clock0: clock(0),
				clock1: clock(1)
			}
		};
	}
	var activeSite;
	function selectSite(hostname, page) {
		if (hostname === "chess.com" || hostname === "www.chess.com") return createChesscomAdapter();
		if (hostname === "pychess.org" || hostname === "www.pychess.org") return createPychessAdapter();
		if (hostname === "lichess.org" || hostname === "www.lichess.org") return createLichessAdapter(page);
		return null;
	}
	function getSite() {
		if (activeSite === void 0) {
			activeSite = selectSite(pageWindow().location.hostname);
			setActiveSite(activeSite);
		}
		return activeSite;
	}
	function readSite() {
		return getSite()?.read() ?? {
			kind: "ineligible",
			reason: "Unsupported site"
		};
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
	var panel_default = ":host{--ink:#1b1a17;--well:#151411;--wood:#252420;--wood-raised:#302e28;--line:#3b3932;--paper:#efe9dc;--muted:#a8a193;--brass:#d9a94f;--sage:#8fb996;--brick:#d8826b;--serif:\"Iowan Old Style\", \"Palatino Linotype\", Palatino, \"Book Antiqua\", Georgia, serif;--sans:system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;--radius:14px;--radius-control:8px;--target:40px;--ease:cubic-bezier(.2, .7, .2, 1);all:initial;z-index:9999999;width:min(380px,100vw - 24px);color:var(--paper);--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;font:13px / 1.45 var(--sans);-webkit-font-smoothing:antialiased;position:fixed;inset:20px 20px auto auto}:host *,:host :before,:host :after{box-sizing:border-box}.panel button{font:inherit;color:inherit}.panel :is(button,input):focus-visible,.panel-log:focus-visible{outline:2px solid var(--brass);outline-offset:2px}.panel{border:1px solid var(--line);border-radius:var(--radius);background:var(--ink);overflow:hidden;box-shadow:0 16px 40px #0000006b}.panel-bar{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;align-items:center;gap:10px;min-height:60px;padding:8px 8px 8px 12px;display:flex}.panel[data-state=open] .panel-bar{border-bottom:1px solid var(--line)}:host(.dragging) .panel-bar{cursor:grabbing}.panel-mark{border-radius:var(--radius-control);background:var(--wood-raised);width:32px;height:32px;color:var(--brass);flex:none;place-items:center;display:grid}.panel-mark-icon{display:block}.panel-bar-text{flex-direction:column;flex:auto;gap:3px;min-width:0;display:flex}.panel-title{letter-spacing:-.005em;white-space:nowrap;flex-shrink:0;font-size:14px;font-weight:600}.panel-status,.panel-summary{min-width:0;color:var(--muted);align-items:center;gap:7px;font-size:12px;display:flex}.panel-status-text{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.panel-summary b{color:var(--paper);font:600 17px / 1 var(--serif)}.panel-summary>span:last-child{color:var(--brass);font-variant-numeric:tabular-nums}.panel-dot{background:var(--muted);border-radius:50%;flex:none;width:7px;height:7px}.panel[data-tone=ready] .panel-dot{background:var(--sage)}.panel[data-tone=working] .panel-dot{background:var(--sage);animation:panel-pulse 1.6s var(--ease) infinite}.panel[data-tone=paused] .panel-dot{background:var(--brass)}.panel[data-tone=error] .panel-dot{background:var(--brick)}.panel[data-tone=error] .panel-status{color:var(--brick)}.panel[data-tone=paused] .panel-status{color:var(--brass)}@keyframes panel-pulse{0%,to{box-shadow:0 0 #8fb99680}50%{box-shadow:0 0 0 5px #8fb99600}}.panel-icon{width:var(--target);height:var(--target);border:1px solid var(--line);border-radius:var(--radius-control);background:var(--wood);cursor:pointer;flex:none;place-items:center;display:grid}.panel-icon:hover{background:var(--wood-raised)}.panel-chevron{transition:transform .18s var(--ease)}.panel[data-state=collapsed] .panel-chevron{transform:rotate(180deg)}.panel-enable{min-height:var(--target);border:1px solid var(--line);background:var(--wood);cursor:pointer;border-radius:999px;flex:none;align-items:center;gap:8px;padding:0 10px 0 12px;font-size:12px;font-weight:500;display:inline-flex}.panel-enable:hover{background:var(--wood-raised)}.panel-enable-state{min-width:18px;color:var(--muted);font-variant-numeric:tabular-nums}.panel-enable[aria-pressed=true]{border-color:color-mix(in oklab, var(--sage) 55%, var(--line))}.panel-enable[aria-pressed=true] .panel-enable-state{color:var(--sage)}.panel-enable-wide{border-radius:var(--radius-control);justify-content:space-between;width:100%;padding:0 12px;font-size:13px}.panel-quick-enable{border:1px solid var(--line);background:var(--wood);min-height:32px;color:var(--muted);cursor:pointer;transition:background .14s var(--ease), border-color .14s var(--ease), color .14s var(--ease);border-radius:999px;flex:none;align-items:center;gap:6px;padding:0 6px 0 8px;font-size:11px;font-weight:500;display:inline-flex}.panel-quick-enable:hover{background:var(--wood-raised);color:var(--paper)}.panel-quick-state{min-width:16px;color:var(--muted);font-variant-numeric:tabular-nums;font-weight:600}.panel-quick-enable[aria-pressed=true]{border-color:color-mix(in oklab, var(--sage) 55%, var(--line));color:var(--sage)}.panel-quick-enable[aria-pressed=true] .panel-quick-state{color:var(--sage)}.panel-switch{flex:none;align-items:center;width:34px;height:20px;display:inline-flex;position:relative}.panel-switch-input{z-index:1;cursor:pointer;opacity:0;width:100%;height:100%;margin:0;position:absolute;inset:0}.panel-switch-track{background:var(--line);transition:background .16s var(--ease);border-radius:999px;position:absolute;inset:0}.panel-switch-knob{background:var(--muted);pointer-events:none;width:14px;height:14px;transition:transform .16s var(--ease), background .16s var(--ease);border-radius:50%;position:absolute;top:3px;left:3px}.panel-enable .panel-switch-knob,.panel-quick-enable .panel-switch-knob{background:var(--paper)}.panel-switch-input:checked~.panel-switch-track,.panel-enable[aria-pressed=true] .panel-switch-track,.panel-quick-enable[aria-pressed=true] .panel-switch-track{background:var(--sage)}.panel-switch-input:checked~.panel-switch-knob,.panel-enable[aria-pressed=true] .panel-switch-knob,.panel-quick-enable[aria-pressed=true] .panel-switch-knob{background:var(--ink);transform:translate(14px)}.panel-body{overscroll-behavior:contain;scrollbar-color:var(--line) transparent;scrollbar-width:thin;max-height:min(76vh,680px);animation:panel-rise .18s var(--ease);overflow:auto}@keyframes panel-rise{0%{opacity:0;transform:translateY(-4px)}}.panel-hero{padding:14px 16px}.panel-move-row{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.panel-move{overflow-wrap:anywhere;color:var(--paper);font:600 36px / 1.05 var(--serif);letter-spacing:.01em}.panel-score{color:var(--brass);font-variant-numeric:tabular-nums;font-size:18px;font-weight:600}.panel-line{color:var(--muted);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;margin:6px 0 0;font-size:12px;overflow:hidden}.panel-notice{border-radius:var(--radius-control);background:var(--wood);box-shadow:inset 0 0 0 1px var(--line);grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;font-size:12px;display:grid}.panel-notice p{margin:0}.panel-notice[data-kind=retry]{box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--brick) 60%, transparent)}.panel-notice[data-kind=resume]{box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--brass) 60%, transparent)}.panel-button{min-height:var(--target);border:1px solid var(--brass);border-radius:var(--radius-control);background:var(--brass);color:var(--ink);white-space:nowrap;cursor:pointer;padding:0 14px;font-size:13px;font-weight:600}.panel-button:hover{filter:brightness(1.06)}.panel-settings{border-top:1px solid var(--line);gap:2px;padding:12px 16px 16px;display:grid}.panel-toggles{margin-top:6px;display:grid}.panel-toggle{cursor:pointer;justify-content:space-between;align-items:center;gap:12px;min-height:44px;display:flex}.panel-note{color:var(--muted);margin:4px 0 0;font-size:12px}.panel-field{gap:6px;padding:8px 0 4px;display:grid}.panel-field-head{justify-content:space-between;align-items:baseline;gap:10px;display:flex}.panel-field-head output{font-variant-numeric:tabular-nums;font-weight:600}.panel-field-label{color:var(--muted);font-size:12px}.panel-range{appearance:none;cursor:pointer;width:100%;height:28px;accent-color:var(--brass);background:0 0;margin:0;display:block}.panel-range::-webkit-slider-runnable-track{background:var(--line);border-radius:999px;height:4px}.panel-range::-moz-range-track{background:var(--line);border-radius:999px;height:4px}.panel-range::-webkit-slider-thumb{appearance:none;border:2px solid var(--ink);background:var(--brass);border-radius:50%;width:20px;height:20px;margin-top:-8px}.panel-range::-moz-range-thumb{border:2px solid var(--ink);background:var(--brass);border-radius:50%;width:20px;height:20px}.panel-segmented{border-radius:var(--radius-control);background:var(--wood);grid-auto-columns:1fr;grid-auto-flow:column;gap:4px;padding:4px;display:grid}.panel-segment{min-height:var(--target);color:var(--muted);cursor:pointer;background:0 0;border:0;border-radius:6px;font-weight:500}.panel-segment[aria-pressed=true]{background:var(--wood-raised);box-shadow:inset 0 0 0 1px var(--line);color:var(--paper)}.panel-activity{border-top:1px solid var(--line);background:var(--well)}.panel-activity-head{justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:0 8px 0 16px;display:flex}.panel-disclosure{min-height:var(--target);cursor:pointer;background:0 0;border:0;align-items:center;gap:8px;padding:0;font-size:13px;font-weight:600;display:inline-flex}.panel-count{background:var(--wood-raised);min-width:24px;color:var(--muted);font-variant-numeric:tabular-nums;text-align:center;border-radius:999px;padding:2px 6px;font-size:11px}.panel-activity-actions{gap:4px;display:flex}.panel-icon-btn{border-radius:var(--radius-control);width:32px;height:32px;color:var(--muted);cursor:pointer;transition:background .14s var(--ease), color .14s var(--ease);background:0 0;border:0;justify-content:center;align-items:center;display:inline-flex}.panel-icon-btn:hover{background:var(--wood-raised);color:var(--paper)}.panel-icon-btn.is-success{color:var(--sage)}.panel-log{overscroll-behavior:contain;scrollbar-color:var(--line) transparent;scrollbar-width:thin;gap:6px;min-height:80px;max-height:240px;padding:2px 16px 14px;display:grid;overflow:auto}.panel-log-empty{color:var(--muted);margin:0;font-size:12px}.panel-log-entry{overflow-wrap:anywhere;grid-template-columns:44px minmax(0,1fr);gap:8px;margin:0;font-size:12px;line-height:1.45;display:grid}.panel-log-entry time{color:var(--muted);font-variant-numeric:tabular-nums}.log-text-info{color:var(--paper)}.log-text-status{color:var(--muted)}.log-text-move{color:var(--sage)}.log-text-warn{color:var(--brass)}.log-text-error{color:var(--brick)}.log-text-opponent{color:#cfc7b5}@media (pointer:coarse){:host{--target:48px}.panel-range::-webkit-slider-runnable-track{height:6px}.panel-range::-webkit-slider-thumb{width:28px;height:28px;margin-top:-11px}.panel-range::-moz-range-thumb{width:28px;height:28px}.panel-icon-btn{width:44px;height:44px}}@media (width<=560px){:host{width:100%;inset:auto 0 0!important}.panel{padding-bottom:env(safe-area-inset-bottom,0px);border-bottom:0;border-left:0;border-right:0;border-radius:16px 16px 0 0;box-shadow:0 -10px 30px #0000005c}.panel-bar{cursor:default;touch-action:manipulation;gap:8px;padding:8px 8px 8px 10px}.panel-body{-webkit-overflow-scrolling:touch;max-height:min(70vh,580px)}.panel-log{-webkit-overflow-scrolling:touch;max-height:180px}}@media (width<=380px){.panel-title{font-size:13px}.panel-quick-enable{gap:4px;padding:0 4px 0 6px}.panel-notice{grid-template-columns:1fr;gap:8px}}@media (prefers-reduced-motion:reduce){.panel *,.panel :before,.panel :after{transition-duration:1ms!important;animation-duration:1ms!important;animation-iteration-count:1!important}}";
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
	function getPanelCapabilityView(capabilities) {
		return { transportNote: capabilities?.input === "selection" ? "Moves use legal square selection on this site." : capabilities?.input === "controller" ? "Moves use the active game controller." : null };
	}
	var EDGE_MARGIN = 8;
	var DOCK_QUERY = "(max-width: 560px)";
	var COLLAPSED_KEY = "gabibot_panel_collapsed";
	var LOG_STICK_PX = 16;
	var COPY_FEEDBACK_MS = 1400;
	var EDITABLE_TAGS = new Set([
		"INPUT",
		"TEXTAREA",
		"SELECT"
	]);
	var readSettings = () => ({
		enabled: !!BotState.hackEnabled,
		autoMove: !!BotState.autoMove,
		openingBook: !!BotState.openingBook,
		ponder: !!BotState.ponderEnabled,
		depth: BotState.botPower,
		moveTimeMs: BotState.moveTime
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
	var logTextClass = {
		info: "log-text-info",
		status: "log-text-status",
		error: "log-text-error",
		warn: "log-text-warn",
		move: "log-text-move",
		opponent: "log-text-opponent"
	};
	function shallowEqual(a, b) {
		return Object.keys(b).every((key) => a[key] === b[key]);
	}
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
		const next = readSettings();
		if (shallowEqual(settingsSignal.value, next)) return;
		settingsSignal.value = next;
	}
	function updatePanelAnalysis(next) {
		if (shallowEqual(analysisSignal.value, next)) return;
		analysisSignal.value = next;
	}
	function writeBotState(key, value) {
		switch (key) {
			case "enabled":
				BotState.hackEnabled = value ? 1 : 0;
				break;
			case "autoMove":
				BotState.autoMove = value ? 1 : 0;
				break;
			case "openingBook":
				BotState.openingBook = value ? 1 : 0;
				break;
			case "ponder":
				BotState.ponderEnabled = value ? 1 : 0;
				break;
			case "depth":
				BotState.botPower = Number(value);
				break;
			case "moveTimeMs": BotState.moveTime = Number(value);
		}
	}
	function updatePanelSetting(key, value, actions) {
		settingsSignal.value = {
			...settingsSignal.value,
			[key]: value
		};
		writeBotState(key, value);
		Settings.save();
		if (key === "enabled") actions?.setEnabled?.(!!value);
		else actions?.refreshSettings?.();
	}
	function isEditableTarget(target) {
		if (!target || typeof target !== "object") return false;
		const element = target;
		return element.isContentEditable === true || EDITABLE_TAGS.has((element.tagName ?? "").toUpperCase());
	}
	function handlePanelKeyDown(event, actions = {}, toggleCollapsed) {
		if (isEditableTarget(event.composedPath ? event.composedPath()[0] : event.target)) return;
		if (event.key?.toLowerCase() === "b" && event.ctrlKey && !event.metaKey) {
			event.preventDefault?.();
			toggleCollapsed?.();
			return;
		}
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.code === "KeyE") {
			event.preventDefault?.();
			updatePanelSetting("enabled", !settingsSignal.value.enabled, actions);
		} else if (event.code === "KeyR" && analysisSignal.value.recoveryAction !== null) {
			event.preventDefault?.();
			actions.recover?.();
		}
	}
	function clampPosition(left, top, width, height) {
		const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
		const maxTop = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
		return {
			left: Math.min(Math.max(EDGE_MARGIN, left), maxLeft),
			top: Math.min(Math.max(EDGE_MARGIN, top), maxTop)
		};
	}
	function placeHost(host, left, top) {
		const nextLeft = `${left}px`;
		const nextTop = `${top}px`;
		if (host.style.left !== nextLeft) host.style.left = nextLeft;
		if (host.style.top !== nextTop) host.style.top = nextTop;
		if (host.style.right !== "auto") host.style.right = "auto";
	}
	function isDocked() {
		return typeof window.matchMedia === "function" && window.matchMedia(DOCK_QUERY).matches;
	}
	function readStoredCollapsed() {
		try {
			const value = localStorage.getItem(COLLAPSED_KEY);
			return value === null ? null : value === "1";
		} catch {
			return null;
		}
	}
	function storeCollapsed(collapsed) {
		try {
			localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
		} catch {}
	}
	function mountPanel(root, host, actions, capabilities) {
		G$1(u(Panel, {
			host,
			actions,
			capabilities
		}), root);
	}
	function formatBudget(milliseconds) {
		return milliseconds < 1e3 ? `${milliseconds} ms` : `${Number((milliseconds / 1e3).toFixed(2))} s`;
	}
	function displayValue(value) {
		return value && value !== "-" ? value : "—";
	}
	function hasLine(value) {
		return !!value && value !== "-" && value !== "Not available";
	}
	function statusTone(analysis, enabled) {
		if (analysis.recoveryAction === "retry") return "error";
		if (analysis.recoveryAction === "resume") return "paused";
		if (/error|failed|unavailable|not confirmed/i.test(analysis.status)) return "error";
		if (/loading|analyz|ponder|submitting|resuming/i.test(analysis.status)) return "working";
		return enabled ? "ready" : "idle";
	}
	function KnightIcon() {
		return u("svg", {
			class: "panel-mark-icon",
			viewBox: "0 0 45 45",
			width: "22",
			height: "22",
			fill: "none",
			stroke: "currentColor",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			children: [
				u("path", {
					d: "M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21",
					fill: "currentColor",
					stroke: "currentColor",
					"stroke-width": "1.5"
				}),
				u("path", {
					d: "M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12 0 0 1.89-1.9 2-3.5-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5l2 0s.78-1.99 2.5-3c1 0 1 3 1 3z",
					fill: "currentColor",
					stroke: "currentColor",
					"stroke-width": "1.5"
				}),
				u("circle", {
					cx: "15",
					cy: "14",
					r: "1.5",
					fill: "var(--ink)",
					stroke: "none"
				}),
				u("path", {
					d: "M14 39v2h24v-2",
					stroke: "currentColor",
					"stroke-width": "1.5"
				})
			]
		});
	}
	function PowerIcon() {
		return u("svg", {
			viewBox: "0 0 16 16",
			width: "12",
			height: "12",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.8",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			children: [u("path", { d: "M8 2v4.5" }), u("path", { d: "M4.2 4.5a5.5 5.5 0 1 0 7.6 0" })]
		});
	}
	function CopyIcon() {
		return u("svg", {
			viewBox: "0 0 16 16",
			width: "14",
			height: "14",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.6",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			children: [u("rect", {
				x: "5",
				y: "5",
				width: "8",
				height: "8",
				rx: "1.5"
			}), u("path", { d: "M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" })]
		});
	}
	function CheckIcon() {
		return u("svg", {
			viewBox: "0 0 16 16",
			width: "14",
			height: "14",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			children: u("path", { d: "M3.5 8.5l3 3 6-6" })
		});
	}
	function ClearIcon() {
		return u("svg", {
			viewBox: "0 0 16 16",
			width: "14",
			height: "14",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.5",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			"aria-hidden": "true",
			children: [
				u("path", { d: "M2.5 4.5h11" }),
				u("path", { d: "M6 2.5h4" }),
				u("path", { d: "M4.5 4.5l.8 8.4a1.2 1.2 0 0 0 1.2 1.1h3a1.2 1.2 0 0 0 1.2-1.1l.8-8.4" }),
				u("path", { d: "M7 7.5v3.5M9 7.5v3.5" })
			]
		});
	}
	function Chevron() {
		return u("svg", {
			class: "panel-chevron",
			viewBox: "0 0 16 16",
			width: "16",
			height: "16",
			"aria-hidden": "true",
			children: u("path", {
				d: "M4 6l4 4 4-4",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "1.75",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			})
		});
	}
	function QuickEnableButton({ enabled, onToggle }) {
		return u("button", {
			type: "button",
			class: "panel-quick-enable",
			"aria-pressed": enabled,
			"aria-label": enabled ? "Disable bot (E)" : "Enable bot (E)",
			title: enabled ? "Disable bot (E)" : "Enable bot (E)",
			onClick: () => onToggle(!enabled),
			children: [
				u(PowerIcon, {}),
				u("span", {
					class: "panel-quick-state",
					children: enabled ? "On" : "Off"
				}),
				u("span", {
					class: "panel-switch",
					"aria-hidden": "true",
					children: [u("span", { class: "panel-switch-track" }), u("span", { class: "panel-switch-knob" })]
				})
			]
		});
	}
	function EnableButton({ enabled, onToggle }) {
		return u("button", {
			type: "button",
			class: "panel-enable panel-enable-wide",
			"aria-pressed": enabled,
			"aria-label": enabled ? "Disable bot (E)" : "Enable bot (E)",
			title: enabled ? "Disable bot (E)" : "Enable bot (E)",
			onClick: () => onToggle(!enabled),
			children: [
				u("span", {
					class: "panel-enable-label",
					children: "Enable bot"
				}),
				u("span", {
					class: "panel-enable-state",
					children: enabled ? "On" : "Off"
				}),
				u("span", {
					class: "panel-switch",
					"aria-hidden": "true",
					children: [u("span", { class: "panel-switch-track" }), u("span", { class: "panel-switch-knob" })]
				})
			]
		});
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
						class: "panel-switch-knob",
						"aria-hidden": "true"
					})
				]
			})]
		});
	}
	function Slider({ id, label, value, min, max, step, format, onPreview, onCommit }) {
		return u("div", {
			class: "panel-field",
			children: [u("div", {
				class: "panel-field-head",
				children: [u("label", {
					htmlFor: id,
					children: label
				}), u("output", { children: format(value) })]
			}), u("input", {
				id,
				class: "panel-range",
				type: "range",
				min,
				max,
				step,
				value,
				"aria-valuetext": format(value),
				onInput: (event) => onPreview(Number(event.currentTarget.value)),
				onChange: (event) => onCommit(Number(event.currentTarget.value))
			})]
		});
	}
	function RecoveryNotice({ kind, onRecover }) {
		const resume = kind === "resume";
		return u("div", {
			class: "panel-notice",
			role: "alert",
			"data-kind": kind,
			children: [u("p", { children: resume ? "Board input paused the bot. Resume when you are ready." : "The last action did not finish. Retry this position." }), u("button", {
				type: "button",
				class: "panel-button",
				onClick: onRecover,
				children: resume ? "Resume bot" : "Retry position"
			})]
		});
	}
	function Panel({ host, actions, capabilities }) {
		const settings = settingsSignal.value;
		const analysis = analysisSignal.value;
		const logs = logsSignal.value;
		const capabilityView = getPanelCapabilityView(capabilities);
		const tone = statusTone(analysis, settings.enabled);
		const [collapsed, setCollapsed] = d$2(() => readStoredCollapsed() ?? isDocked());
		const [activityOpen, setActivityOpen] = d$2(() => !isDocked());
		const [copied, setCopied] = d$2(false);
		const logElement = T(null);
		const stickToBottom = T(true);
		const copyTimer = T(null);
		const toggleCollapsed = () => setCollapsed((value) => !value);
		const updateSetting = (key, value) => updatePanelSetting(key, value, actions);
		const previewSlider = (key, value) => {
			settingsSignal.value = {
				...settingsSignal.value,
				[key]: value
			};
		};
		A(() => {
			const handleKeyDown = (event) => handlePanelKeyDown(event, actions, () => setCollapsed((value) => !value));
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [actions]);
		A(() => storeCollapsed(collapsed), [collapsed]);
		A(() => {
			const keepOnScreen = () => {
				if (isDocked()) return;
				const rect = host.getBoundingClientRect();
				const next = clampPosition(rect.left, rect.top, rect.width, rect.height);
				placeHost(host, next.left, next.top);
			};
			const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(keepOnScreen);
			observer?.observe(host);
			window.addEventListener("resize", keepOnScreen);
			const frame = requestAnimationFrame(keepOnScreen);
			return () => {
				observer?.disconnect();
				window.removeEventListener("resize", keepOnScreen);
				cancelAnimationFrame(frame);
			};
		}, [host, collapsed]);
		A(() => () => {
			if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
		}, []);
		A(() => {
			if (logs.length === 0) stickToBottom.current = true;
			const log = logElement.current;
			if (activityOpen && log && stickToBottom.current) log.scrollTop = log.scrollHeight;
		}, [logs, activityOpen]);
		const beginDrag = (event) => {
			if (isDocked() || event.button !== 0 || event.target.closest("button, input, label, a")) return;
			event.preventDefault();
			const start = host.getBoundingClientRect();
			const originX = event.clientX;
			const originY = event.clientY;
			const drag = new AbortController();
			const finish = () => {
				drag.abort();
				host.classList.remove("dragging");
				Settings.save();
			};
			host.classList.add("dragging");
			window.addEventListener("pointermove", (pointer) => {
				const next = clampPosition(start.left + pointer.clientX - originX, start.top + pointer.clientY - originY, start.width, start.height);
				placeHost(host, next.left, next.top);
			}, { signal: drag.signal });
			for (const type of [
				"pointerup",
				"pointercancel",
				"blur"
			]) window.addEventListener(type, finish, {
				once: true,
				signal: drag.signal
			});
		};
		const copyLogs = async () => {
			const text = logs.map((entry) => `[${entry.time}] ${entry.text}`).join("\n");
			if (!text || !navigator.clipboard?.writeText) return;
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);
				if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => {
					copyTimer.current = null;
					setCopied(false);
				}, COPY_FEEDBACK_MS);
			} catch {
				setCopied(false);
			}
		};
		const move = displayValue(analysis.bestMove);
		const evaluation = displayValue(analysis.evaluation);
		const line = hasLine(analysis.principalVariation) ? analysis.principalVariation : "Waiting for a position";
		return u("aside", {
			class: "panel",
			"data-state": collapsed ? "collapsed" : "open",
			"data-tone": tone,
			"aria-label": "Super Chess Bot controls",
			children: [u("header", {
				class: "panel-bar",
				onPointerDown: beginDrag,
				children: [
					u("span", {
						class: "panel-mark",
						"aria-hidden": "true",
						children: u(KnightIcon, {})
					}),
					u("div", {
						class: "panel-bar-text",
						children: [u("strong", {
							class: "panel-title",
							children: "Super Chess Bot"
						}), collapsed ? u("span", {
							class: "panel-summary",
							children: [u("span", {
								class: "panel-dot",
								"aria-hidden": "true"
							}), move !== "—" ? u(M, { children: [u("b", { children: move }), u("span", { children: evaluation })] }) : u("span", {
								class: "panel-status-text",
								children: analysis.status || "Ready"
							})]
						}) : u("span", {
							class: "panel-status",
							title: analysis.status,
							children: [u("span", {
								class: "panel-dot",
								"aria-hidden": "true"
							}), u("span", {
								class: "panel-status-text",
								children: analysis.status || "Ready"
							})]
						})]
					}),
					collapsed && u(QuickEnableButton, {
						enabled: settings.enabled,
						onToggle: (next) => updateSetting("enabled", next)
					}),
					u("button", {
						type: "button",
						class: "panel-icon",
						"aria-expanded": !collapsed,
						"aria-controls": "panel-body",
						"aria-label": collapsed ? "Show panel" : "Hide panel",
						title: collapsed ? "Show panel (Ctrl+B)" : "Hide panel (Ctrl+B)",
						onClick: toggleCollapsed,
						children: u(Chevron, {})
					})
				]
			}), !collapsed && u("div", {
				class: "panel-body",
				id: "panel-body",
				children: [
					u("section", {
						class: "panel-hero",
						"aria-label": "Suggested move",
						children: [
							u("div", {
								class: "panel-move-row",
								children: [u("output", {
									class: "panel-move",
									"aria-label": "Suggested move",
									children: move
								}), u("output", {
									class: "panel-score",
									"aria-label": "Evaluation",
									children: evaluation
								})]
							}),
							u("p", {
								class: "panel-line",
								title: analysis.principalVariation,
								children: line
							}),
							analysis.recoveryAction && u(RecoveryNotice, {
								kind: analysis.recoveryAction,
								onRecover: () => actions.recover?.()
							})
						]
					}),
					u("section", {
						class: "panel-settings",
						"aria-label": "Bot settings",
						children: [
							u(EnableButton, {
								enabled: settings.enabled,
								onToggle: (next) => updateSetting("enabled", next)
							}),
							u("div", {
								class: "panel-toggles",
								children: [
									u(Toggle, {
										label: "Auto move",
										checked: settings.autoMove,
										onChange: (next) => updateSetting("autoMove", next)
									}),
									u(Toggle, {
										label: "Opening book",
										checked: settings.openingBook,
										onChange: (next) => updateSetting("openingBook", next)
									}),
									u(Toggle, {
										label: "Background ponder",
										checked: settings.ponder,
										onChange: (next) => updateSetting("ponder", next)
									})
								]
							}),
							capabilityView.transportNote && u("p", {
								class: "panel-note",
								children: capabilityView.transportNote
							}),
							u(Slider, {
								id: "bot-depth",
								label: "Depth cap",
								value: settings.depth,
								min: 1,
								max: 30,
								step: 1,
								format: String,
								onPreview: (value) => previewSlider("depth", value),
								onCommit: (value) => updateSetting("depth", value)
							}),
							u(Slider, {
								id: "move-budget",
								label: "Move time",
								value: settings.moveTimeMs,
								min: 25,
								max: 5e3,
								step: 25,
								format: formatBudget,
								onPreview: (value) => previewSlider("moveTimeMs", value),
								onCommit: (value) => updateSetting("moveTimeMs", value)
							})
						]
					}),
					u("section", {
						class: "panel-activity",
						"aria-label": "Activity log",
						children: [u("div", {
							class: "panel-activity-head",
							children: [u("button", {
								type: "button",
								class: "panel-disclosure",
								"aria-expanded": activityOpen,
								"aria-controls": "panel-log",
								onClick: () => setActivityOpen((value) => !value),
								children: ["Activity", u("span", {
									class: "panel-count",
									children: logs.length
								})]
							}), activityOpen && u("div", {
								class: "panel-activity-actions",
								children: [u("button", {
									type: "button",
									class: `panel-icon-btn ${copied ? "is-success" : ""}`,
									"aria-label": copied ? "Log copied to clipboard" : "Copy log",
									title: copied ? "Copied!" : "Copy log",
									onClick: copyLogs,
									children: copied ? u(CheckIcon, {}) : u(CopyIcon, {})
								}), u("button", {
									type: "button",
									class: "panel-icon-btn",
									"aria-label": "Clear log",
									title: "Clear log",
									onClick: () => actions.clearConsole?.(),
									children: u(ClearIcon, {})
								})]
							})]
						}), activityOpen && u("div", {
							id: "panel-log",
							ref: logElement,
							class: "panel-log",
							role: "log",
							"aria-label": "Engine activity",
							"aria-live": "off",
							tabIndex: 0,
							onScroll: () => {
								const log = logElement.current;
								if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < LOG_STICK_PX;
							},
							children: logs.length === 0 ? u("p", {
								class: "panel-log-empty",
								children: "Moves and engine updates will appear here."
							}) : logs.map((entry) => u("p", {
								class: `panel-log-entry ${logTextClass[entry.type]}`,
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
			const read = readSite();
			const fen = read.kind === "game" ? read.snapshot.fen : null;
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
	async function buildUI(actions = {}, capabilities) {
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
		}, capabilities);
	}
	function normalizeEpd(fen) {
		const parts = fen.trim().split(/\s+/);
		return parts.length >= 4 ? parts.slice(0, 4).join(" ") : fen;
	}
	var EPD_BOOK = {
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": [
			["e2e4", 70],
			["d2d4", 25],
			["c2c4", 5]
		],
		"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3": [
			["c7c5", 70],
			["e7e5", 20],
			["e7e6", 5],
			["c7c6", 5]
		],
		"rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3": [
			["g8f6", 70],
			["d7d5", 25],
			["c7c5", 5]
		],
		"rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3": [["e7e5", 75], ["g8f6", 25]],
		"rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -": [["d7d5", 70], ["g8f6", 30]],
		"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [["f2f4", 60], ["g1f3", 40]],
		"rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6": [["d2d4", 60], ["g1f3", 40]],
		"rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [["d2d4", 100]],
		"rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [["d2d4", 100]],
		"rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": [["c2c4", 90], ["g1f3", 10]],
		"rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": [["c2c4", 90], ["g1f3", 10]],
		"rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": [["b8c6", 85], ["g8f6", 15]],
		"rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3": [["e5f4", 80], ["d7d5", 20]],
		"rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": [
			["d7d6", 60],
			["b8c6", 30],
			["e7e6", 10]
		],
		"rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3": [["c5d4", 100]],
		"rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3": [["d7d5", 100]],
		"rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3": [["d7d5", 100]],
		"rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3": [
			["e7e6", 70],
			["c7c6", 20],
			["d5c4", 10]
		],
		"rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3": [
			["e7e6", 50],
			["g7g6", 30],
			["c7c5", 20]
		],
		"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": [
			["f1c4", 60],
			["f1b5", 25],
			["d2d4", 15]
		],
		"rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq -": [["g1f3", 80], ["f1c4", 20]],
		"rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": [["d2d4", 100]],
		"rnbqkbnr/pp1ppppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq -": [["c2c3", 80], ["g1f3", 20]],
		"rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -": [["b1c3", 60], ["e4e5", 40]],
		"rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -": [["b1c3", 60], ["e4e5", 40]],
		"rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -": [["b1c3", 70], ["g1f3", 30]],
		"rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -": [["b1c3", 70], ["g1f3", 30]],
		"rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -": [["b1c3", 80], ["g1f3", 20]],
		"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": [["f8c5", 60], ["g8f6", 40]],
		"r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": [["a7a6", 80], ["g8f6", 20]],
		"r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3": [["e5d4", 100]],
		"rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3": [["c5d4", 100]],
		"rnbqkbnr/pp1ppppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq -": [["d4c3", 80], ["d7d5", 20]],
		"rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -": [["g8f6", 80], ["c7c6", 20]],
		"rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -": [["f8b4", 70], ["d7d5", 30]],
		"rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -": [["d7d5", 50], ["f8g7", 50]]
	};
	function lookupBookMove(fen, rng = Math.random) {
		const candidates = EPD_BOOK[normalizeEpd(fen)];
		if (!candidates || candidates.length === 0) return null;
		const totalWeight = candidates.reduce((sum, [, w]) => sum + w, 0);
		let threshold = rng() * totalWeight;
		for (const [move, weight] of candidates) {
			threshold -= weight;
			if (threshold <= 0) return move;
		}
		return candidates[0][0];
	}
	var revision = 0;
	var active = null;
	var processed = null;
	var anticipatedPonder = null;
	var pendingConfirmation = null;
	var confirmationSettledListeners = new Set();
	function scoreForWhite(score, sideToMove) {
		if (sideToMove !== "b") return score;
		return {
			...typeof score.cp === "number" ? { cp: -score.cp } : {},
			...typeof score.mate === "number" ? { mate: -score.mate } : {}
		};
	}
	function matchingSnapshot(site, identity, fen) {
		const read = site.read();
		if (read.kind !== "game" || read.snapshot.identity !== identity || read.snapshot.fen !== fen || read.snapshot.phase !== "live") return null;
		return read.snapshot;
	}
	function isMoveConfirmationPending(identity) {
		return pendingConfirmation?.identity === identity && !pendingConfirmation.requestController.signal.aborted;
	}
	function onMoveConfirmationSettled(listener) {
		confirmationSettledListeners.add(listener);
		return () => confirmationSettledListeners.delete(listener);
	}
	function cancelAnalysis(preservePonderFen) {
		revision++;
		active?.abort();
		active = null;
		processed = null;
		if (pendingConfirmation) pendingConfirmation.requestController.abort();
		pendingConfirmation = null;
		if (!anticipatedPonder || anticipatedPonder.fromFen !== preservePonderFen) anticipatedPonder = null;
		cancelPonder(preservePonderFen);
		cancelPendingMove();
	}
	function searchBudget(snapshot) {
		const configured = Math.max(25, BotState.moveTime);
		if (snapshot.remainingMs === null) return configured;
		return Math.max(1, Math.floor(Math.min(configured, snapshot.remainingMs / 40) - 12));
	}
	function requestPly(snapshot) {
		return snapshot.history ? snapshot.history.moves.length + 1 : null;
	}
	function requestHistory(snapshot) {
		return snapshot.history ? {
			startFen: snapshot.history.startFen,
			moves: [...snapshot.history.moves]
		} : void 0;
	}
	async function scheduleAnalysis(kind, fen) {
		const site = getSite();
		if (!BotState.hackEnabled || !site) return;
		const read = site.read();
		if (read.kind !== "game") return;
		const snapshot = read.snapshot;
		if (snapshot.phase !== "live" || snapshot.fen !== fen) return;
		if (kind === "main" && snapshot.sideToMove !== snapshot.playerColor) return;
		if (kind === "main" && !snapshot.inputReady) return;
		if (processed?.kind === kind && processed.fen === fen && processed.identity === snapshot.identity) return;
		active?.abort();
		if (kind !== "main" && !BotState.ponderEnabled) {
			cancelPonder();
			anticipatedPonder = null;
			processed = {
				kind,
				fen,
				identity: snapshot.identity
			};
			return;
		}
		cancelPonder(fen);
		const id = ++revision;
		const ctrl = new AbortController();
		processed = {
			kind,
			fen,
			identity: snapshot.identity
		};
		const inputRevision = getMoveRevision();
		const identity = snapshot.identity;
		const positionIsCurrent = () => id === revision && !ctrl.signal.aborted && !!BotState.hackEnabled && !!matchingSnapshot(site, identity, fen);
		const current = () => positionIsCurrent() && inputRevision === getMoveRevision();
		if (!current()) return;
		active = ctrl;
		try {
			const started = performance.now();
			const budget = kind === "main" ? searchBudget(snapshot) : Math.max(25, BotState.moveTime);
			BotState.statusInfo = kind === "main" ? "Analyzing..." : "Pondering...";
			ui.updateDisplay(pa());
			const history = requestHistory(snapshot);
			const anticipated = anticipatedPonder;
			if (kind !== "main") {
				anticipatedPonder = null;
				if (anticipated?.fromFen === fen && ponderPosition(anticipated.targetFen, BotState.botPower, anticipated.history)) return;
			} else anticipatedPonder = null;
			const bookMove = kind === "main" && BotState.openingBook ? lookupBookMove(fen) : null;
			let result;
			let best = null;
			if (bookMove) {
				result = {
					success: true,
					bestmove: bookMove,
					depth: 99,
					pv: bookMove,
					evaluation: { cp: 20 }
				};
				best = {
					uci: bookMove,
					pv: bookMove,
					score: { cp: 20 }
				};
			} else {
				result = await getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);
				if (!current()) return;
				best = parseBestLine(result);
				if (!best) {
					if (result.bestmove === "(none)" && hasLegalMoves(fen) === false) {
						BotState.statusInfo = "Terminal position";
						ui.updateDisplay(pa());
						return;
					}
					throw new Error("Engine returned no legal move");
				}
			}
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
			const currentPosition = matchingSnapshot(site, identity, fen);
			const nextFen = predictFen(fen, best.uci);
			if (!nextFen || fen.split(" ")[1] !== snapshot.playerColor) throw new Error("Engine move failed position validation");
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
			BotState.currentEvaluation = bookMove ? "Book" : scoreToDisplay(scoreForWhite(best.score, snapshot.sideToMove));
			BotState.statusInfo = bookMove ? `Ready · Book · ${Math.round(performance.now() - started)} ms` : `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;
			clearArrows();
			drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), "rgba(100,255,100,0.7)", 3);
			ui.updateDisplay(pa());
			if (!BotState.autoMove || !current() || !currentPosition?.inputReady) return;
			const requestController = new AbortController();
			const abortRequest = () => requestController.abort();
			ctrl.signal.addEventListener("abort", abortRequest, { once: true });
			const moveRequest = {
				identity,
				fromFen: fen,
				uci: best.uci,
				expectedFen: nextFen,
				expectedPly: requestPly(snapshot),
				signal: requestController.signal,
				isCurrent: () => current() && matchingSnapshot(site, identity, fen)?.inputReady === true
			};
			pendingConfirmation = {
				identity,
				requestController
			};
			const confirmation = confirmSiteMove(moveRequest, site);
			let initiated = false;
			let accepted = false;
			try {
				initiated = await site.submitMove(moveRequest);
				if (!initiated) {
					requestController.abort();
					accepted = false;
				} else accepted = await confirmation;
			} finally {
				ctrl.signal.removeEventListener("abort", abortRequest);
				requestController.abort();
				if (pendingConfirmation?.requestController === requestController) {
					pendingConfirmation = null;
					for (const listener of [...confirmationSettledListeners]) try {
						listener();
					} catch (error) {
						console.error("Super Chess Bot: confirmation listener failed.", error);
					}
				}
			}
			if (accepted) {
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
					BotState.statusInfo = initiated ? "Move was not confirmed" : "Move input failed";
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
	function formatPhaseKey(snapshot, currentIdentity) {
		return `phase:${snapshot.identity === currentIdentity ? snapshot.phase : `${snapshot.gameId}:${snapshot.phase}`}`;
	}
	var BotController = class {
		isActive = false;
		lastFenSeen = "";
		cleanup = null;
		cleanupBoardInput = null;
		cleanupSite = null;
		cleanupConfirmation = null;
		interval = null;
		generation = 0;
		ready = false;
		waitingKey = null;
		identity = null;
		board = null;
		interruptedFen = null;
		previousInputReady = null;
		site = null;
		init() {
			if (this.cleanupSite) return;
			this.site = getSite();
			if (!this.site) return;
			this.cleanupConfirmation = onMoveConfirmationSettled(() => this.tick());
			this.cleanupSite = this.site.subscribe(() => {
				this.syncBoard();
				this.tick();
			});
			this.syncBoard();
		}
		syncBoard(read = readSite()) {
			if (read.kind !== "game") {
				if (this.board) attachToBoard(null);
				this.board = null;
				return;
			}
			const snapshot = read.snapshot;
			if (snapshot.board !== this.board) {
				attachToBoard(snapshot.board);
				this.board = snapshot.board;
			}
			setBoardOrientation(snapshot.orientation);
		}
		listenForLifecycle() {
			if (this.cleanup) return;
			this.cleanup = onBoardMutation(() => this.tick());
			this.cleanupBoardInput = onBoardInput(() => this.pauseForBoardInput());
			if (this.site?.id === "chesscom") startMoveWatcher();
			this.interval = setInterval(() => this.tick(), 1e3);
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
			this.init();
			if (!BotState.hackEnabled) {
				await warmEngine();
				return;
			}
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
				this.listenForLifecycle();
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
			this.cleanupSite?.();
			this.cleanupSite = null;
			this.cleanupConfirmation?.();
			this.cleanupConfirmation = null;
			stopMoveWatcher();
			cancelAnalysis();
			this.site?.cancelInput();
			clearArrows();
			if (this.board) attachToBoard(null);
			this.board = null;
			this.lastFenSeen = "";
			this.identity = null;
			this.waitingKey = null;
			this.interruptedFen = null;
			this.previousInputReady = null;
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
		cancelSiteWork() {
			cancelAnalysis();
			this.site?.cancelInput();
		}
		pauseForBoardInput() {
			if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
			const read = readSite();
			this.interruptedFen = read.kind === "game" ? read.snapshot.fen : "";
			this.cancelSiteWork();
			clearArrows();
			this.clearRecommendation();
			BotState.recoveryAction = "resume";
			BotState.statusInfo = "Paused after board interaction";
			ui.updateDisplay(pa());
		}
		clearForUnavailable(read) {
			const waitingKey = `${read.kind}:${read.reason}`;
			if (this.identity && isMoveConfirmationPending(this.identity)) return;
			if (this.waitingKey === waitingKey) return;
			this.waitingKey = waitingKey;
			this.cancelSiteWork();
			clearArrows();
			if (this.board) attachToBoard(null);
			this.board = null;
			this.lastFenSeen = "";
			this.interruptedFen = null;
			this.previousInputReady = null;
			this.clearRecommendation();
			BotState.recoveryAction = null;
			BotState.statusInfo = read.reason;
			ui.updateDisplay(pa());
		}
		handlePhase(snapshot) {
			if (snapshot.phase === "live") return false;
			const phaseKey = formatPhaseKey(snapshot, this.identity);
			if (this.waitingKey !== phaseKey) {
				this.waitingKey = phaseKey;
				this.cancelSiteWork();
				clearArrows();
				this.clearRecommendation();
				this.lastFenSeen = "";
				this.interruptedFen = null;
				this.previousInputReady = snapshot.inputReady;
				BotState.recoveryAction = null;
				BotState.statusInfo = snapshot.phase === "replay" ? "Replay mode" : "Game finished";
				ui.updateDisplay(pa());
			}
			return true;
		}
		tick() {
			if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
			const read = readSite();
			this.syncBoard(read);
			if (read.kind !== "game") {
				this.clearForUnavailable(read);
				return;
			}
			const snapshot = read.snapshot;
			if (snapshot.identity !== this.identity) {
				const hadIdentity = this.identity !== null;
				this.cancelSiteWork();
				if (hadIdentity) resetEngine();
				this.identity = snapshot.identity;
				this.lastFenSeen = "";
				this.waitingKey = null;
				this.interruptedFen = null;
				this.previousInputReady = null;
				this.clearRecommendation();
				BotState.recoveryAction = null;
				ui.clearConsole();
			}
			if (this.handlePhase(snapshot)) return;
			if (snapshot.identity === this.identity && snapshot.fen !== this.lastFenSeen && isMoveConfirmationPending(snapshot.identity)) return;
			this.waitingKey = null;
			const ourTurn = snapshot.sideToMove === snapshot.playerColor;
			const readinessRestored = this.previousInputReady === false && snapshot.inputReady && ourTurn;
			this.previousInputReady = snapshot.inputReady;
			if (readinessRestored && snapshot.sideToMove === snapshot.playerColor && snapshot.fen === this.lastFenSeen) cancelAnalysis(snapshot.fen);
			if (this.interruptedFen !== null) {
				if (!snapshot.fen || snapshot.fen === this.interruptedFen) return;
				this.interruptedFen = null;
				BotState.recoveryAction = null;
			}
			if (!snapshot.fen) return;
			const positionChanged = snapshot.fen !== this.lastFenSeen;
			if (!positionChanged && !readinessRestored) return;
			if (positionChanged) cancelAnalysis(snapshot.fen);
			clearArrows();
			this.clearRecommendation();
			this.lastFenSeen = snapshot.fen;
			BotState.recoveryAction = null;
			if (ourTurn && !snapshot.inputReady) {
				BotState.statusInfo = "Waiting for board";
				ui.updateDisplay(pa());
				return;
			}
			BotState.statusInfo = ourTurn ? "Analyzing..." : "Waiting for opponent";
			ui.updateDisplay(pa());
			scheduleAnalysis(ourTurn ? "main" : "ponder", snapshot.fen);
		}
	};
	var controller = new BotController();
	async function init() {
		const page = window;
		if (page.__GABIBOT_RUNNING__) return;
		page.__GABIBOT_RUNNING__ = true;
		try {
			BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);
			const site = getSite();
			await waitForDocumentBody();
			await buildUI({
				setEnabled: (enabled) => controller.setEnabled(enabled),
				refreshSettings: () => controller.refreshSettings(),
				recover: () => controller.recover()
			}, site?.capabilities);
			controller.init();
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
			if (!site) {
				BotState.statusInfo = "Unsupported site";
				ui.updateDisplay(pa());
				return;
			}
		} catch (error) {
			page.__GABIBOT_RUNNING__ = false;
			BotState.statusInfo = error instanceof Error ? error.message : "Initialization failed";
			BotState.recoveryAction = "retry";
			ui.updateDisplay(1);
		}
	}
	function waitForDocumentBody() {
		if (typeof document === "undefined" || document.body || document.readyState !== "loading") return Promise.resolve();
		return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
	}
	init();
})();
