// ==UserScript==
// @name         Form Genie
// @namespace    https://github.com/quantavil/userscript/form-genie
// @version      1.6.0
// @author       quantavil
// @description  Privacy-first, AI-powered auto form filler for desktop & mobile. Instantly fills complex application forms, job portals, and exam sites (IBPS, NTA, SSC, UPSC) using smart teach rules, heuristics, and optional Gemini AI.
// @license      GPL-3.0-or-later
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        http://*/*
// @match        https://*/*
// @connect      generativelanguage.googleapis.com
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var SKIP_INPUT_TYPES = new Set([
		"password",
		"hidden",
		"submit",
		"button",
		"reset",
		"image",
		"file",
		"search"
	]);
	var CAPTCHA_HINT = /captcha|\botp\b|one[\s_-]?time|verif(y|ication)\s*code|security\s*code/i;
	function isVisible(el) {
		if (el.hidden) return false;
		let node = el;
		while (node) {
			const style = getComputedStyle(node);
			if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
			node = node.parentElement;
		}
		return true;
	}
	function looksLikeCaptcha(el) {
		const hay = [
			el.getAttribute("name"),
			el.getAttribute("id"),
			el.getAttribute("placeholder"),
			el.getAttribute("aria-label"),
			el.getAttribute("autocomplete")
		].filter(Boolean).join(" ");
		return CAPTCHA_HINT.test(hay);
	}
	function collectControls(root) {
		const out = [];
		root.querySelectorAll("input, textarea, select").forEach((c) => out.push(c));
		root.querySelectorAll("*").forEach((node) => {
			const sr = node.shadowRoot;
			if (sr) out.push(...collectControls(sr));
		});
		return out;
	}
	function scan(root = document) {
		const controls = collectControls(root);
		const units = [];
		const radioGroups = new Map();
		const checkGroups = new Map();
		let anonSeq = 0;
		for (const el of controls) {
			if (!isVisible(el)) continue;
			if (looksLikeCaptcha(el)) continue;
			const tag = el.tagName.toLowerCase();
			const disabled = el.disabled;
			if (tag === "select") {
				units.push({
					type: "select",
					el,
					group: []
				});
				continue;
			}
			if (disabled || el.readOnly) continue;
			if (tag === "textarea") {
				units.push({
					type: "textarea",
					el,
					group: []
				});
				continue;
			}
			const input = el;
			const t = (input.type || "text").toLowerCase();
			if (SKIP_INPUT_TYPES.has(t)) continue;
			if (t === "radio" || t === "checkbox") {
				const map = t === "radio" ? radioGroups : checkGroups;
				const gkey = input.name || `__anon_${input.id || anonSeq++}`;
				if (!map.has(gkey)) map.set(gkey, []);
				map.get(gkey).push(input);
				continue;
			}
			const type = t === "email" || t === "tel" || t === "number" || t === "date" ? t : "text";
			units.push({
				type,
				el: input,
				group: []
			});
		}
		for (const [, members] of radioGroups) units.push({
			type: "radio",
			el: members[0],
			group: members
		});
		for (const [, members] of checkGroups) units.push({
			type: "checkbox",
			el: members[0],
			group: members
		});
		return units;
	}
	var STOP = new Set([
		"the",
		"a",
		"an",
		"of",
		"your",
		"please",
		"enter",
		"select",
		"field",
		"is"
	]);
	function normalize(s) {
		return s.toLowerCase().replace(/[*():.,/\\|#\-_]+/g, " ").replace(/\s+/g, " ").trim();
	}
	function tokenize(s) {
		return normalize(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
	}
	function labelText(el) {
		const parts = [];
		const id = el.getAttribute("id");
		const root = el.getRootNode();
		if (id) {
			const lbl = root.querySelector?.(`label[for="${cssEscape(id)}"]`);
			if (lbl) parts.push(lbl.textContent ?? "");
		}
		const wrap = el.closest("label");
		if (wrap) parts.push(ownText(wrap));
		const aria = el.getAttribute("aria-label");
		if (aria) parts.push(aria);
		const labelledby = el.getAttribute("aria-labelledby");
		if (labelledby) for (const rid of labelledby.split(/\s+/)) {
			const ref = root.querySelector?.(`#${cssEscape(rid)}`);
			if (ref) parts.push(ref.textContent ?? "");
		}
		return parts.join(" ");
	}
	function ownText(el) {
		let out = "";
		el.childNodes.forEach((n) => {
			if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
		});
		return out;
	}
	var NEARBY_MAX = 120;
	function nearbyText(el) {
		const cell = el.closest("td, th");
		if (cell) {
			let prev = cell.previousElementSibling;
			while (prev) {
				const t = (prev.textContent ?? "").trim();
				if (t) return t.slice(0, NEARBY_MAX);
				prev = prev.previousElementSibling;
			}
			const first = cell.closest("tr")?.querySelector("td, th");
			if (first && first !== cell) {
				const t = (first.textContent ?? "").trim();
				if (t) return t.slice(0, NEARBY_MAX);
			}
		}
		let node = el;
		for (let depth = 0; depth < 3 && node; depth++) {
			let sib = node.previousSibling;
			while (sib) {
				const t = (sib.textContent ?? "").trim();
				if (t) return t.slice(0, NEARBY_MAX);
				sib = sib.previousSibling;
			}
			node = node.parentElement;
		}
		return "";
	}
	function optionsOf(unit) {
		if (unit.type === "select") {
			const sel = unit.el;
			return Array.from(sel.options).map((o) => `${o.text} ${o.value}`.trim()).filter((t) => t && !/^(select|choose|--)/i.test(t));
		}
		if (unit.type === "radio" || unit.type === "checkbox") return unit.group.map((m) => radioLabel(m)).filter(Boolean);
		return [];
	}
	function radioLabel(input) {
		const id = input.getAttribute("id");
		const root = input.getRootNode();
		if (id) {
			const lbl = root.querySelector?.(`label[for="${cssEscape(id)}"]`);
			if (lbl?.textContent?.trim()) return lbl.textContent.trim();
		}
		const wrap = input.closest("label");
		if (wrap) {
			const t = ownText(wrap).trim();
			if (t) return t;
		}
		const next = input.nextElementSibling;
		if (next?.textContent?.trim()) return next.textContent.trim();
		const sib = input.nextSibling;
		if (sib?.textContent?.trim()) return sib.textContent.trim();
		return input.value || "";
	}
	function cssEscape(s) {
		if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
		return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
	}
	var CAPTCHA_TEXT = /captcha|\botp\b|one time password|verification code|security code|word in the textbox|as in the image|image code/;
	function isCaptchaLike(d) {
		return CAPTCHA_TEXT.test(d.text);
	}
	function describe(unit) {
		const el = unit.el;
		const name = el.getAttribute("name") ?? "";
		const id = el.getAttribute("id") ?? "";
		const bits = [
			labelText(el),
			el.getAttribute("placeholder") ?? "",
			el.getAttribute("title") ?? "",
			name,
			id,
			nearbyText(el)
		];
		const text = normalize(bits.join(" "));
		const tokens = Array.from(new Set(bits.flatMap((b) => tokenize(b))));
		const maxAttr = el.getAttribute("maxlength");
		return {
			unit,
			text,
			tokens,
			options: optionsOf(unit),
			maxlength: maxAttr ? parseInt(maxAttr, 10) : null,
			pattern: el.getAttribute("pattern"),
			inputType: el.type ?? unit.type,
			name,
			id
		};
	}
	var SYNONYMS = {
		"personal.firstName": [
			"first name",
			"given name",
			"fname",
			"pratham naam"
		],
		"personal.middleName": ["middle name", "mname"],
		"personal.lastName": [
			"last name",
			"surname",
			"family name",
			"lname",
			"upnaam"
		],
		"personal.fullName": [
			"candidate name",
			"full name",
			"applicant name",
			"name of candidate",
			"naam",
			"name of applicant",
			"student name"
		],
		"personal.dob": [
			"date of birth",
			"dob",
			"birth date",
			"birthdate",
			"janm tithi",
			"date birth"
		],
		"personal.gender": [
			"gender",
			"sex",
			"ling"
		],
		"personal.category": [
			"category",
			"caste category",
			"social category",
			"reservation category",
			"varg",
			"community"
		],
		"personal.nationality": [
			"nationality",
			"citizenship",
			"rashtriyata"
		],
		"personal.religion": ["religion", "dharm"],
		"personal.maritalStatus": [
			"marital status",
			"married",
			"vaivahik"
		],
		"personal.bloodGroup": [
			"blood group",
			"blood",
			"rakt samuh"
		],
		"personal.identificationMark1": [
			"identification mark",
			"visible mark",
			"pehchan chinh",
			"identification mark 1"
		],
		"personal.identificationMark2": ["identification mark 2", "second identification mark"],
		"personal.nameChanged": [
			"have you ever changed your name",
			"ever changed your name",
			"changed your name",
			"name change",
			"changed name",
			"namechanged"
		],
		"personal.isPwd": [
			"person with benchmark disability",
			"person with disability",
			"pwbd",
			"pwd",
			"benchmark disability",
			"differently abled",
			"handicapped",
			"disabled",
			"disability of 40"
		],
		"personal.isExServiceman": [
			"ex serviceman",
			"ex servicemen",
			"esm",
			"are you an ex serviceman",
			"ex service"
		],
		"personal.isMinority": [
			"religious minority",
			"minority community",
			"religious minority community",
			"minority"
		],
		"personal.isGovtEmployee": [
			"serving in govt",
			"govt employee",
			"public sector undertakings",
			"serving in govt quasi govt",
			"psu employee",
			"bank employee"
		],
		"family.fatherName": [
			"father name",
			"father's name",
			"fathers name",
			"pita ka naam",
			"pita name",
			"father husband name"
		],
		"family.motherName": [
			"mother name",
			"mother's name",
			"mothers name",
			"mata ka naam",
			"mata name"
		],
		"family.guardianName": [
			"guardian name",
			"guardian's name",
			"sanrakshak"
		],
		"family.hasTwin": [
			"twin",
			"triplet",
			"twin brother sister",
			"quadruplet",
			"twin triplet quadruplet"
		],
		"contact.email": [
			"email",
			"e mail",
			"email address",
			"email id",
			"e mail id"
		],
		"contact.altEmail": [
			"alternate email",
			"alternative email",
			"secondary email"
		],
		"contact.mobile": [
			"mobile",
			"mobile number",
			"phone",
			"phone number",
			"contact number",
			"cell",
			"mobile no",
			"contact no"
		],
		"contact.altMobile": [
			"alternate mobile",
			"alternative mobile",
			"secondary mobile",
			"landline",
			"alternate number",
			"alternative number",
			"alternate contact number"
		],
		"contact.mobileBelongsTo": [
			"mobile number belongs to",
			"mobile belongs to",
			"confirm that the mobile number belongs to",
			"phone belongs to"
		],
		"address.permanent.line1": [
			"permanent address",
			"address line 1",
			"address line",
			"permanent address line 1",
			"house no",
			"street",
			"address"
		],
		"address.permanent.line2": [
			"permanent address line 2",
			"address line 2",
			"locality",
			"area"
		],
		"address.permanent.city": [
			"city",
			"town",
			"village",
			"city town village",
			"shahar"
		],
		"address.permanent.district": ["district", "zila"],
		"address.permanent.state": ["state", "rajya"],
		"address.permanent.pincode": [
			"pincode",
			"pin code",
			"postal code",
			"zip",
			"zip code",
			"pin"
		],
		"address.permanent.country": ["country", "desh"],
		"address.correspondence.sameAsPermanent": ["same as permanent", "same as above"],
		"address.correspondence.line1": [
			"correspondence address",
			"communication address",
			"present address",
			"mailing address",
			"current address",
			"correspondence address line 1"
		],
		"address.correspondence.line2": ["correspondence address line 2", "communication address line 2"],
		"address.correspondence.city": [
			"correspondence city",
			"communication city",
			"present city"
		],
		"address.correspondence.district": ["correspondence district", "communication district"],
		"address.correspondence.state": [
			"correspondence state",
			"communication state",
			"present state"
		],
		"address.correspondence.pincode": [
			"correspondence pincode",
			"communication pincode",
			"present pincode"
		],
		"address.correspondence.country": ["correspondence country", "communication country"],
		"address.gstInvoicingAddress": [
			"address for gst invoicing",
			"gst invoicing",
			"gst address",
			"invoicing address",
			"choose the address for gst"
		],
		"ids.aadhaar": [
			"aadhaar",
			"aadhar",
			"aadhaar number",
			"uid",
			"uidai"
		],
		"ids.pan": [
			"pan",
			"pan number",
			"pan card",
			"permanent account number"
		],
		"ids.voterId": [
			"voter id",
			"epic",
			"election card",
			"voter card"
		],
		"ids.drivingLicence": [
			"driving licence",
			"driving license",
			"dl number",
			"licence number"
		],
		"ids.passport": [
			"passport",
			"passport number",
			"passport no"
		]
	};
	function eduSyn(id, human) {
		SYNONYMS[`education.${id}.board`] = [
			`${human} board`,
			`${human} university`,
			`${human} board university`
		];
		SYNONYMS[`education.${id}.rollNo`] = [
			`${human} roll number`,
			`${human} roll no`,
			`${human} registration number`
		];
		SYNONYMS[`education.${id}.passingYear`] = [
			`${human} passing year`,
			`${human} year of passing`,
			`${human} year`
		];
		SYNONYMS[`education.${id}.percentage`] = [
			`${human} percentage`,
			`${human} marks`,
			`${human} percent`,
			`${human} aggregate`
		];
		SYNONYMS[`education.${id}.cgpa`] = [
			`${human} cgpa`,
			`${human} gpa`,
			`${human} grade`
		];
		SYNONYMS[`education.${id}.subjectStream`] = [
			`${human} stream`,
			`${human} subject`,
			`${human} branch`,
			`${human} specialization`
		];
	}
	eduSyn("tenth", "10th");
	SYNONYMS["education.tenth.board"].push("matriculation board", "secondary board", "ssc board", "class 10 board");
	eduSyn("twelfth", "12th");
	SYNONYMS["education.twelfth.board"].push("intermediate board", "higher secondary board", "hsc board", "class 12 board");
	eduSyn("graduation", "graduation");
	SYNONYMS["education.graduation.board"].push("degree university", "bachelor university", "ug university");
	eduSyn("postgrad", "post graduation");
	SYNONYMS["education.postgrad.board"].push("pg university", "master university");
	var INDIAN_STATES = [
		"andhra pradesh",
		"arunachal pradesh",
		"assam",
		"bihar",
		"chhattisgarh",
		"goa",
		"gujarat",
		"haryana",
		"himachal pradesh",
		"jharkhand",
		"karnataka",
		"kerala",
		"madhya pradesh",
		"maharashtra",
		"manipur",
		"meghalaya",
		"mizoram",
		"nagaland",
		"odisha",
		"punjab",
		"rajasthan",
		"sikkim",
		"tamil nadu",
		"telangana",
		"tripura",
		"uttar pradesh",
		"uttarakhand",
		"west bengal",
		"delhi",
		"jammu and kashmir",
		"ladakh",
		"puducherry",
		"chandigarh"
	];
	var AUTO_ID = /(\d{4,}|[0-9a-f]{8}-[0-9a-f]{4}|__|ctl\d+|ember\d+|react-|:r[0-9a-z]+:)/i;
	function hash(s) {
		let h = 5381;
		for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i) | 0;
		return (h >>> 0).toString(36);
	}
	function fingerprintOf(d) {
		if (d.name) return `n:${d.name}`;
		if (d.id && !AUTO_ID.test(d.id)) return `i:${d.id}`;
		return `h:${hash(d.text + "|" + d.inputType)}`;
	}
	var SECTIONS = [
		{
			id: "personal",
			title: "Personal",
			fields: [
				{
					key: "personal.firstName",
					label: "First name",
					kind: "text"
				},
				{
					key: "personal.middleName",
					label: "Middle name",
					kind: "text"
				},
				{
					key: "personal.lastName",
					label: "Last name",
					kind: "text"
				},
				{
					key: "personal.fullName",
					label: "Full name",
					kind: "text"
				},
				{
					key: "personal.dob",
					label: "Date of birth",
					kind: "date"
				},
				{
					key: "personal.gender",
					label: "Gender",
					kind: "select",
					options: [
						"Male",
						"Female",
						"Transgender"
					]
				},
				{
					key: "personal.category",
					label: "Category",
					kind: "select",
					options: [
						"General",
						"OBC",
						"SC",
						"ST",
						"EWS"
					]
				},
				{
					key: "personal.nationality",
					label: "Nationality",
					kind: "text"
				},
				{
					key: "personal.religion",
					label: "Religion",
					kind: "text"
				},
				{
					key: "personal.maritalStatus",
					label: "Marital status",
					kind: "select",
					options: [
						"Single",
						"Married",
						"Divorced",
						"Widowed"
					]
				},
				{
					key: "personal.bloodGroup",
					label: "Blood group",
					kind: "select",
					options: [
						"A+",
						"A-",
						"B+",
						"B-",
						"AB+",
						"AB-",
						"O+",
						"O-"
					]
				},
				{
					key: "personal.identificationMark1",
					label: "Identification mark 1",
					kind: "text"
				},
				{
					key: "personal.identificationMark2",
					label: "Identification mark 2",
					kind: "text"
				},
				{
					key: "personal.nameChanged",
					label: "Have you ever changed name",
					kind: "select",
					options: ["Yes", "No"]
				},
				{
					key: "personal.isPwd",
					label: "Person with Benchmark Disability (PwBD)",
					kind: "select",
					options: ["Yes", "No"]
				},
				{
					key: "personal.isExServiceman",
					label: "Ex-Serviceman status",
					kind: "select",
					options: ["Yes", "No"]
				},
				{
					key: "personal.isMinority",
					label: "Religious minority community",
					kind: "select",
					options: ["Yes", "No"]
				},
				{
					key: "personal.isGovtEmployee",
					label: "Serving in Govt / PSU / Bank",
					kind: "select",
					options: ["Yes", "No"]
				}
			]
		},
		{
			id: "family",
			title: "Family",
			fields: [
				{
					key: "family.fatherName",
					label: "Father's name",
					kind: "text"
				},
				{
					key: "family.motherName",
					label: "Mother's name",
					kind: "text"
				},
				{
					key: "family.guardianName",
					label: "Guardian's name",
					kind: "text"
				},
				{
					key: "family.hasTwin",
					label: "Twin / Triplet brother or sister",
					kind: "select",
					options: ["Yes", "No"]
				}
			]
		},
		{
			id: "contact",
			title: "Contact",
			fields: [
				{
					key: "contact.email",
					label: "Email",
					kind: "email"
				},
				{
					key: "contact.altEmail",
					label: "Alternate email",
					kind: "email"
				},
				{
					key: "contact.mobile",
					label: "Mobile",
					kind: "tel"
				},
				{
					key: "contact.altMobile",
					label: "Alternate mobile",
					kind: "tel"
				},
				{
					key: "contact.mobileBelongsTo",
					label: "Mobile number belongs to",
					kind: "select",
					options: ["Self", "Parents/Relatives"]
				}
			]
		},
		{
			id: "permanent",
			title: "Permanent address",
			fields: [
				{
					key: "address.permanent.line1",
					label: "Address line 1",
					kind: "text"
				},
				{
					key: "address.permanent.line2",
					label: "Address line 2",
					kind: "text"
				},
				{
					key: "address.permanent.city",
					label: "City / Town / Village",
					kind: "text"
				},
				{
					key: "address.permanent.district",
					label: "District",
					kind: "text"
				},
				{
					key: "address.permanent.state",
					label: "State",
					kind: "text"
				},
				{
					key: "address.permanent.pincode",
					label: "PIN code",
					kind: "text"
				},
				{
					key: "address.permanent.country",
					label: "Country",
					kind: "text"
				}
			]
		},
		{
			id: "correspondence",
			title: "Correspondence address",
			fields: [
				{
					key: "address.correspondence.sameAsPermanent",
					label: "Same as permanent",
					kind: "select",
					options: ["Yes", "No"]
				},
				{
					key: "address.correspondence.line1",
					label: "Address line 1",
					kind: "text"
				},
				{
					key: "address.correspondence.line2",
					label: "Address line 2",
					kind: "text"
				},
				{
					key: "address.correspondence.city",
					label: "City / Town / Village",
					kind: "text"
				},
				{
					key: "address.correspondence.district",
					label: "District",
					kind: "text"
				},
				{
					key: "address.correspondence.state",
					label: "State",
					kind: "text"
				},
				{
					key: "address.correspondence.pincode",
					label: "PIN code",
					kind: "text"
				},
				{
					key: "address.correspondence.country",
					label: "Country",
					kind: "text"
				},
				{
					key: "address.gstInvoicingAddress",
					label: "Address for GST Invoicing",
					kind: "select",
					options: ["Correspondence Address", "Permanent Address"]
				}
			]
		},
		...educationSection("tenth", "10th / Matriculation"),
		...educationSection("twelfth", "12th / Intermediate"),
		...educationSection("graduation", "Graduation"),
		...educationSection("postgrad", "Post-graduation"),
		{
			id: "ids",
			title: "Identity documents",
			fields: [
				{
					key: "ids.aadhaar",
					label: "Aadhaar number",
					kind: "text",
					sensitive: true
				},
				{
					key: "ids.pan",
					label: "PAN",
					kind: "text",
					sensitive: true
				},
				{
					key: "ids.voterId",
					label: "Voter ID",
					kind: "text",
					sensitive: true
				},
				{
					key: "ids.drivingLicence",
					label: "Driving licence",
					kind: "text",
					sensitive: true
				},
				{
					key: "ids.passport",
					label: "Passport number",
					kind: "text",
					sensitive: true
				}
			]
		}
	];
	function educationSection(id, title) {
		return [{
			id: `edu-${id}`,
			title,
			fields: [
				{
					key: `education.${id}.board`,
					label: "Board / University",
					kind: "text"
				},
				{
					key: `education.${id}.rollNo`,
					label: "Roll number",
					kind: "text"
				},
				{
					key: `education.${id}.passingYear`,
					label: "Passing year",
					kind: "number"
				},
				{
					key: `education.${id}.percentage`,
					label: "Percentage",
					kind: "number"
				},
				{
					key: `education.${id}.cgpa`,
					label: "CGPA",
					kind: "number"
				},
				{
					key: `education.${id}.subjectStream`,
					label: "Subject / Stream",
					kind: "text"
				}
			]
		}];
	}
	var FIELD_CATALOG = Object.fromEntries(SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]));
	var ALL_KEYS = Object.keys(FIELD_CATALOG);
	function emptyProfile() {
		return {
			v: 1,
			data: {}
		};
	}
	var customFieldsCallback = null;
	function setCustomFieldsCallback(cb) {
		customFieldsCallback = cb;
	}
	function registerCustomFields(customFields) {
		const existingIdx = SECTIONS.findIndex((s) => s.id === "custom");
		if (!customFields.length) {
			if (existingIdx >= 0) SECTIONS.splice(existingIdx, 1);
		} else if (existingIdx >= 0) SECTIONS[existingIdx].fields = customFields;
		else SECTIONS.push({
			id: "custom",
			title: "Custom fields",
			fields: customFields
		});
		const newCatalog = Object.fromEntries(SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]));
		for (const k of Object.keys(FIELD_CATALOG)) delete FIELD_CATALOG[k];
		Object.assign(FIELD_CATALOG, newCatalog);
		ALL_KEYS.length = 0;
		ALL_KEYS.push(...Object.keys(FIELD_CATALOG));
		if (customFieldsCallback) customFieldsCallback(customFields);
	}
	var SYN_TOKENS = {};
	function rebuildSynTokens() {
		for (const k of Object.keys(SYN_TOKENS)) delete SYN_TOKENS[k];
		for (const [key, phrases] of Object.entries(SYNONYMS)) SYN_TOKENS[key] = phrases.map((p) => ({
			phrase: normalize(p),
			tokens: tokenize(p)
		}));
	}
	rebuildSynTokens();
	setCustomFieldsCallback((customFields) => {
		for (const k of Object.keys(SYNONYMS)) if (k.startsWith("custom.")) delete SYNONYMS[k];
		for (const f of customFields) SYNONYMS[f.key] = [f.label];
		rebuildSynTokens();
	});
	function scoreHeuristic(d) {
		let best = null;
		const fieldSet = new Set(d.tokens);
		for (const [key, entries] of Object.entries(SYN_TOKENS)) {
			let keyScore = 0;
			for (const { phrase, tokens } of entries) {
				if (!tokens.length) continue;
				const coverage = tokens.filter((t) => fieldSet.has(t)).length / tokens.length;
				let s = 0;
				if (d.text.includes(phrase) && phrase.length > 2) s = .95;
				else if (coverage === 1) s = tokens.length >= 2 ? .85 : .8;
				else s = coverage * .7;
				if (s > 0) s += Math.min(phrase.length, 40) * 8e-4;
				if (s > 0 && key.startsWith("custom.")) s = Math.min(s + .05, 1);
				if (s > keyScore) keyScore = s;
			}
			if (keyScore > 0 && (!best || keyScore > best.score)) best = {
				key,
				score: keyScore
			};
		}
		return best;
	}
	function scoreOptionSignal(d) {
		if (!d.options.length) return null;
		const opts = d.options.map((o) => normalize(o));
		const has = (re) => opts.filter((o) => re.test(o)).length;
		if (has(/\b(general|ur|unreserved|obc|sc|st|ews)\b/) >= 3) return {
			key: "personal.category",
			score: .9
		};
		if (opts.some((o) => /\bmale\b/.test(o)) && opts.some((o) => /\bfemale\b/.test(o))) return {
			key: "personal.gender",
			score: .9
		};
		if (opts.filter((o) => INDIAN_STATES.some((s) => o.includes(s))).length >= 5) return {
			key: "address.permanent.state",
			score: .82
		};
		if (opts.filter((o) => /\b(gmail|yahoo|hotmail|outlook|rediffmail|live|icloud|mail)\s+(com|in|co\s+in|org|net)\b/.test(o)).length >= 2) return {
			key: "contact.email",
			score: .85
		};
		return null;
	}
	function ruleFor(fingerprint, occurrence, rules) {
		return rules.find((r) => r.fingerprint === fingerprint && r.occurrence === occurrence) ?? rules.find((r) => r.fingerprint === fingerprint);
	}
	function matchAll(descriptors, rules) {
		const seen = new Map();
		return descriptors.map((d) => {
			const fingerprint = fingerprintOf(d);
			const occurrence = seen.get(fingerprint) ?? 0;
			seen.set(fingerprint, occurrence + 1);
			const rule = ruleFor(fingerprint, occurrence, rules);
			if (rule) return {
				descriptor: d,
				key: rule.key,
				confidence: 1,
				source: rule.source === "ai" ? "ai" : "teach",
				fingerprint,
				occurrence
			};
			const opt = scoreOptionSignal(d);
			const heur = scoreHeuristic(d);
			let chosen = null;
			let source = "heuristic";
			if (opt && (!heur || opt.score >= heur.score)) {
				chosen = opt;
				source = "option-signal";
			} else if (heur) {
				chosen = heur;
				source = "heuristic";
			}
			return {
				descriptor: d,
				key: chosen?.key ?? null,
				confidence: chosen?.score ?? 0,
				source: chosen ? source : null,
				fingerprint,
				occurrence
			};
		});
	}
	function get(data, key) {
		return (data[key] ?? "").trim();
	}
	function resolveValue(data, key) {
		if (key.startsWith("address.correspondence.") && key !== "address.correspondence.sameAsPermanent") {
			const same = get(data, "address.correspondence.sameAsPermanent").toLowerCase();
			if (same === "yes" || same === "true" || same === "1") return get(data, key.replace("address.correspondence.", "address.permanent."));
			return get(data, key);
		}
		const direct = get(data, key);
		if (direct) return direct;
		if (key === "personal.fullName") return [
			get(data, "personal.firstName"),
			get(data, "personal.middleName"),
			get(data, "personal.lastName")
		].filter(Boolean).join(" ");
		const full = get(data, "personal.fullName");
		if (full) {
			const parts = full.split(/\s+/);
			if (key === "personal.firstName") return parts[0] ?? "";
			if (key === "personal.lastName") return parts.length > 1 ? parts[parts.length - 1] : "";
			if (key === "personal.middleName") return parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
		}
		return "";
	}
	function parseDate(value) {
		const v = value.trim();
		let y, m, d;
		const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
		if (iso) [, y, m, d] = iso.map(Number);
		else if (dmy) [, d, m, y] = dmy.map(Number);
		else return null;
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return {
			day: pad(d),
			month: pad(m),
			year: String(y)
		};
	}
	function pad(n) {
		return String(n).padStart(2, "0");
	}
	function formatDate(p, fmt) {
		switch (fmt) {
			case "DD/MM/YYYY": return `${p.day}/${p.month}/${p.year}`;
			case "DD-MM-YYYY": return `${p.day}-${p.month}-${p.year}`;
			case "YYYY-MM-DD": return `${p.year}-${p.month}-${p.day}`;
			case "MM/DD/YYYY": return `${p.month}/${p.day}/${p.year}`;
		}
	}
	var enabled = false;
	var TAG = "[form-genie]";
	function setDebug(on) {
		enabled = on;
		if (!on) clearOverlay();
	}
	function log(...args) {
		if (enabled) console.log(TAG, ...args);
	}
	var OVERLAY_ID = "fg-debug-overlay";
	var OVERLAY_TTL = 15e3;
	var overlayTimer = null;
	function clearOverlay() {
		document.getElementById(OVERLAY_ID)?.remove();
		if (overlayTimer) {
			clearTimeout(overlayTimer);
			overlayTimer = null;
		}
	}
	function drawOverlay(matches) {
		if (!enabled) return;
		clearOverlay();
		const layer = document.createElement("div");
		layer.id = OVERLAY_ID;
		Object.assign(layer.style, {
			position: "absolute",
			left: "0",
			top: "0",
			width: "0",
			height: "0",
			overflow: "visible",
			zIndex: "2147483646",
			pointerEvents: "none"
		});
		for (const m of matches) {
			const rect = m.descriptor.unit.el.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) continue;
			const color = !m.key ? "#ef4444" : m.confidence >= .75 ? "#22c55e" : "#f59e0b";
			const box = document.createElement("div");
			Object.assign(box.style, {
				position: "absolute",
				left: `${rect.left + window.scrollX}px`,
				top: `${rect.top + window.scrollY}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
				border: `2px solid ${color}`,
				boxSizing: "border-box"
			});
			const tag = document.createElement("div");
			tag.textContent = m.key ? `${m.key} ${m.confidence.toFixed(2)}` : "unmatched";
			Object.assign(tag.style, {
				position: "absolute",
				top: "-14px",
				left: "0",
				font: "10px monospace",
				color: "#fff",
				background: color,
				padding: "0 3px",
				whiteSpace: "nowrap"
			});
			box.appendChild(tag);
			layer.appendChild(box);
		}
		document.documentElement.appendChild(layer);
		overlayTimer = setTimeout(clearOverlay, OVERLAY_TTL);
	}
	var CASCADE_TIMEOUT = 3e3;
	var EQUIV = [
		[/^obc/, [
			"obc",
			"other backward class",
			"other backward classes",
			"obc ncl",
			"backward"
		]],
		[/^(gen|general|ur|unreserved)/, [
			"general",
			"gen",
			"ur",
			"unreserved",
			"open"
		]],
		[/^male$/, ["male", "m"]],
		[/^female$/, ["female", "f"]]
	];
	async function fillAll(matches, data, opts) {
		const results = [];
		for (const m of matches) results.push(await fillOne(m, data, opts));
		return results;
	}
	async function fillOne(m, data, opts) {
		if (!m.key || m.confidence < .45) return {
			match: m,
			status: "unmatched"
		};
		const accepted = opts.acceptedFingerprints?.has(m.fingerprint) ?? false;
		if (m.confidence < .75 && !accepted) return {
			match: m,
			status: "suggested"
		};
		let value = resolveValue(data, m.key);
		if (!value) return {
			match: m,
			status: "skipped",
			reason: "no profile value"
		};
		try {
			const unit = m.descriptor.unit;
			if (unit.type === "select") await waitForOptions(unit.el);
			if ((m.key === "contact.email" || m.key === "contact.altEmail") && unit.type === "select" && value.includes("@")) value = value.slice(value.indexOf("@") + 1);
			if (m.key === "personal.dob" && unit.type === "select") {
				const dp = parseDate(value);
				if (dp) {
					const part = detectDobPart(unit.el);
					const sel = unit.el;
					let applied;
					if (part === "day") applied = selectByCandidates(m, sel, [String(parseInt(dp.day, 10)), dp.day], opts);
					else if (part === "month") applied = selectByCandidates(m, sel, getMonthEquivalences(dp.month), opts);
					else if (part === "year") applied = selectByCandidates(m, sel, [dp.year], opts);
					else return {
						match: m,
						status: "skipped",
						reason: "unknown DOB select part"
					};
					if (applied.status === "filled") highlight(unit.el);
					return applied;
				}
			}
			const applied = await applyValue(m, value, opts);
			if (applied.status === "filled") highlight(unit.el);
			return applied;
		} catch (e) {
			log("fill error", m.key, e);
			return {
				match: m,
				status: "error",
				reason: e.message
			};
		}
	}
	async function applyValue(m, value, opts) {
		const unit = m.descriptor.unit;
		const d = m.descriptor;
		if (unit.type === "select") return fillSelect(m, unit.el, value, opts);
		if (unit.type === "radio" || unit.type === "checkbox") return fillChoice(m, value, opts);
		const el = unit.el;
		const current = el.value.trim();
		if (unit.type === "date" || m.key === "personal.dob") {
			const dp = parseDate(value);
			if (dp) value = formatDate(dp, detectDateFormat(d.inputType, el.getAttribute("placeholder"), d.pattern));
		}
		value = formatForField(m.key ?? "", value, el, d.maxlength);
		if (d.maxlength && value.length > d.maxlength) return {
			match: m,
			status: "skipped",
			reason: `value exceeds maxlength ${d.maxlength}`
		};
		if (current && !opts.overwrite && current !== value) return {
			match: m,
			status: "skipped",
			reason: "already filled"
		};
		if (current === value) return {
			match: m,
			status: "skipped",
			reason: "already correct"
		};
		setNativeValue(el, value);
		fireEvents(el);
		return {
			match: m,
			status: "filled",
			value
		};
	}
	function fillSelect(m, sel, value, opts) {
		return selectByCandidates(m, sel, Array.from(expandEquiv(normalize(value))), opts);
	}
	function selectByCandidates(m, sel, candidates, opts) {
		if (sel.disabled) return {
			match: m,
			status: "skipped",
			reason: "options never loaded (still disabled)"
		};
		if (sel.value && !opts.overwrite) {
			const cur = sel.options[sel.selectedIndex];
			if (cur && cur.value && !/^(select|choose|--)/i.test(cur.text)) return {
				match: m,
				status: "skipped",
				reason: "already selected"
			};
		}
		const cands = Array.from(new Set(candidates.map(normalize))).filter(Boolean);
		const options = Array.from(sel.options);
		let idx = options.findIndex((o) => cands.includes(normalize(o.text)) || cands.includes(normalize(o.value)));
		if (idx < 0) idx = options.findIndex((o) => {
			const t = normalize(o.text);
			const v = normalize(o.value);
			return cands.some((c) => c.length > 1 && (t.length > 1 && (t.includes(c) || c.includes(t)) || v.length > 1 && (v.includes(c) || c.includes(v))));
		});
		if (idx < 0) return {
			match: m,
			status: "skipped",
			reason: `no option matches "${candidates.join(", ")}"`
		};
		sel.selectedIndex = idx;
		fireEvents(sel);
		return {
			match: m,
			status: "filled",
			value: sel.options[idx].text
		};
	}
	function fillChoice(m, value, opts) {
		const members = m.descriptor.unit.group;
		if (members.find((r) => r.checked) && !opts.overwrite) return {
			match: m,
			status: "skipped",
			reason: "already selected"
		};
		const target = normalize(value);
		const equiv = expandEquiv(target);
		const hit = members.find((r) => {
			const lbl = normalize(radioLabel(r));
			const val = normalize(r.value);
			return lbl === target || val === target || equiv.has(lbl) || equiv.has(val) || lbl.length > 1 && (lbl.includes(target) || target.includes(lbl));
		});
		if (!hit) return {
			match: m,
			status: "skipped",
			reason: `no option matches "${value}"`
		};
		if (!hit.checked) hit.click();
		return {
			match: m,
			status: "filled",
			value: radioLabel(hit)
		};
	}
	function expandEquiv(target) {
		const set = new Set([target]);
		for (const [re, group] of EQUIV) if (re.test(target) || group.includes(target)) group.forEach((g) => set.add(g));
		return set;
	}
	function detectDateFormat(inputType, placeholder, pattern) {
		if (inputType === "date") return "YYYY-MM-DD";
		const hay = `${placeholder ?? ""} ${pattern ?? ""}`.toLowerCase();
		if (/yyyy.?mm.?dd/.test(hay)) return "YYYY-MM-DD";
		if (/mm.?dd.?yyyy/.test(hay)) return "MM/DD/YYYY";
		if (/dd-mm/.test(hay) || hay.includes("dd-mm-yyyy")) return "DD-MM-YYYY";
		return "DD/MM/YYYY";
	}
	function formatForField(key, value, el, maxlength) {
		if (key === "contact.mobile" || key === "contact.altMobile") {
			let digits = value.replace(/[^\d]/g, "");
			if (digits.length > 10) digits = digits.slice(-10);
			if ((maxlength === 10 || el.type === "tel") && digits.length === 10) value = digits;
		}
		if ((key === "contact.email" || key === "contact.altEmail") && value.includes("@") && hasAdjacentAt(el)) value = value.slice(0, value.indexOf("@"));
		try {
			if (getComputedStyle(el).textTransform === "uppercase") value = value.toUpperCase();
		} catch {}
		return value;
	}
	function hasAdjacentAt(el) {
		const container = el.closest(".input-group, td, .form-group, .row") || el.parentElement;
		if (!container) return false;
		for (const child of container.querySelectorAll("*")) if ((child.textContent ?? "").trim() === "@") return true;
		return false;
	}
	function setNativeValue(el, value) {
		const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
		if (setter) setter.call(el, value);
		else el.value = value;
	}
	function fireEvents(el) {
		el.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
		el.dispatchEvent(new FocusEvent("blur", { bubbles: false }));
	}
	function waitForOptions(sel) {
		const hasReal = () => Array.from(sel.options).some((o) => o.value && !/^(select|choose|--)/i.test(o.text));
		if (hasReal()) return Promise.resolve();
		return new Promise((resolve) => {
			const obs = new MutationObserver(() => {
				if (hasReal()) {
					cleanup();
					resolve();
				}
			});
			obs.observe(sel, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["disabled"]
			});
			const timer = setTimeout(() => {
				cleanup();
				resolve();
			}, CASCADE_TIMEOUT);
			function cleanup() {
				obs.disconnect();
				clearTimeout(timer);
			}
		});
	}
	function highlight(el) {
		const prev = el.style.outline;
		const prevT = el.style.transition;
		el.style.transition = "outline 0.2s ease";
		el.style.outline = "2px solid #22c55e";
		setTimeout(() => {
			el.style.outline = prev;
			el.style.transition = prevT;
		}, 1200);
	}
	function detectDobPart(sel) {
		const opts = Array.from(sel.options).map((o) => normalize(o.text || o.value));
		const numericOpts = opts.map((o) => parseInt(o, 10)).filter((n) => !isNaN(n));
		if (numericOpts.some((n) => n >= 1900 && n <= 2100)) return "year";
		if (opts.includes("31") || numericOpts.some((n) => n > 12 && n <= 31)) return "day";
		const monthNames = opts.filter((o) => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(o)).length;
		if (sel.options.length <= 14 && (numericOpts.every((n) => n >= 1 && n <= 12) || monthNames >= 6)) return "month";
		const name = (sel.getAttribute("name") ?? "").toLowerCase();
		const id = (sel.getAttribute("id") ?? "").toLowerCase();
		if (name.includes("year") || id.includes("year") || name.includes("yr") || id.includes("yr")) return "year";
		if (name.includes("month") || id.includes("month") || name.includes("mon") || id.includes("mon")) return "month";
		if (name.includes("day") || id.includes("day")) return "day";
		return null;
	}
	function getMonthEquivalences(monthNumStr) {
		const m = parseInt(monthNumStr, 10);
		if (isNaN(m) || m < 1 || m > 12) return [];
		return [
			[
				"1",
				"01",
				"jan",
				"january"
			],
			[
				"2",
				"02",
				"feb",
				"february"
			],
			[
				"3",
				"03",
				"mar",
				"march"
			],
			[
				"4",
				"04",
				"apr",
				"april"
			],
			[
				"5",
				"05",
				"may"
			],
			[
				"6",
				"06",
				"jun",
				"june"
			],
			[
				"7",
				"07",
				"jul",
				"july"
			],
			[
				"8",
				"08",
				"aug",
				"august"
			],
			[
				"9",
				"09",
				"sep",
				"september",
				"sept"
			],
			[
				"10",
				"oct",
				"october"
			],
			[
				"11",
				"nov",
				"november"
			],
			[
				"12",
				"dec",
				"december"
			]
		][m - 1];
	}
	var ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
	var TIMEOUT = 15e3;
	var MAX_OPTIONS = 30;
	function getSystemPrompt() {
		return `You map web form fields to a fixed set of profile keys.
Given a JSON array of fields (index, descriptorText, type, options), return a JSON
array of {index, key} where key is EXACTLY one of the allowed keys or the string
"null" if no key fits. Only use allowed keys. Do not invent keys.
Allowed keys:
${ALL_KEYS.join("\n")}`;
	}
	var RESPONSE_SCHEMA = {
		type: "ARRAY",
		items: {
			type: "OBJECT",
			properties: {
				index: { type: "INTEGER" },
				key: { type: "STRING" }
			},
			required: ["index", "key"]
		}
	};
	async function mapWithAI(inputs, settings) {
		if (!settings.ai.enabled) return {
			ok: false,
			error: "AI tier disabled"
		};
		if (!settings.ai.apiKey) return {
			ok: false,
			error: "No API key set"
		};
		if (!inputs.length) return {
			ok: true,
			mapping: new Map()
		};
		const trimmed = inputs.map((i) => ({
			...i,
			options: i.options?.slice(0, MAX_OPTIONS)
		}));
		const body = JSON.stringify({
			system_instruction: { parts: [{ text: getSystemPrompt() }] },
			contents: [{ parts: [{ text: JSON.stringify(trimmed) }] }],
			generationConfig: {
				temperature: 0,
				responseMimeType: "application/json",
				responseSchema: RESPONSE_SCHEMA
			}
		});
		const url = `${ENDPOINT}/${encodeURIComponent(settings.ai.model)}:generateContent`;
		const first = await request(url, settings.ai.apiKey, body);
		if (!first.ok && first.retryable) {
			log("AI retrying after", first.error);
			return parseOrError(await request(url, settings.ai.apiKey, body));
		}
		return parseOrError(first);
	}
	function request(url, apiKey, body) {
		return new Promise((resolve) => {
			GM_xmlhttpRequest({
				method: "POST",
				url,
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": apiKey
				},
				data: body,
				timeout: TIMEOUT,
				onload: (res) => {
					const ok = res.status >= 200 && res.status < 300;
					resolve({
						ok,
						status: res.status,
						text: res.responseText,
						error: ok ? void 0 : httpError(res.status, res.responseText),
						retryable: res.status >= 500
					});
				},
				onerror: (res) => resolve({
					ok: false,
					status: res.status ?? 0,
					text: "",
					error: "network error",
					retryable: true
				}),
				ontimeout: () => resolve({
					ok: false,
					status: 0,
					text: "",
					error: "request timed out",
					retryable: true
				})
			});
		});
	}
	function httpError(status, text) {
		const msg = safeApiMessage(text);
		if (status === 401 || status === 403) return "invalid API key";
		if (status === 400) return msg ? `bad request: ${msg}` : "bad request (check the model name)";
		if (status === 404) return "model not found (check the model name)";
		if (status === 429) return "quota exceeded";
		return msg ? `Gemini ${status}: ${msg}` : `Gemini error ${status}`;
	}
	function safeApiMessage(text) {
		try {
			return JSON.parse(text)?.error?.message ?? "";
		} catch {
			return "";
		}
	}
	function parseOrError(r) {
		if (!r.ok) return {
			ok: false,
			error: r.error ?? "request failed"
		};
		try {
			const inner = JSON.parse(r.text)?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!inner) return {
				ok: false,
				error: "empty AI response"
			};
			const arr = JSON.parse(inner);
			const valid = new Set(ALL_KEYS);
			const mapping = new Map();
			for (const { index, key } of arr) if (key && key !== "null" && valid.has(key)) mapping.set(index, key);
			return {
				ok: true,
				mapping
			};
		} catch (e) {
			return {
				ok: false,
				error: `bad AI response: ${e.message}`
			};
		}
	}
	var STYLES = `
:host {
  all: initial;
  color-scheme: light;

  --paper: #f3efe4;
  --paper-2: #eae3d2;
  --ink: #191712;
  --ink-2: #56503f;
  --ink-3: #8a8168;
  --rule: #cfc6ae;
  --rule-strong: #b3a884;
  --spot: #cc3b1d;
  --ok: #3f7d4f;
  --warn: #b5791a;
  --miss: #cc3b1d;

  --serif: 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --shadow: 5px 5px 0 rgba(25,23,18,0.16);
  --shadow-sm: 3px 3px 0 rgba(25,23,18,0.20);

  font-family: var(--sans);
  color: var(--ink);
}
* { box-sizing: border-box; margin: 0; }
button { font: inherit; color: inherit; }

/* ---- FAB — an ink stamp ------------------------------------------------- */
.fab {
  position: fixed; z-index: 2147483647;
  display: flex; align-items: center; gap: 9px;
  height: 46px; padding: 0 18px 0 15px;
  background: var(--ink); color: var(--paper);
  border: 2px solid var(--ink); border-left: 5px solid var(--spot);
  border-radius: 2px; box-shadow: var(--shadow-sm);
  cursor: pointer; user-select: none; touch-action: none;
  font-family: var(--mono); font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.5px;
  transition: transform .08s ease, box-shadow .08s ease;
}
.fab:active { transform: translate(3px, 3px); box-shadow: 0 0 0 rgba(0,0,0,0); }
.fab svg { width: 16px; height: 16px; flex-shrink: 0; }

/* ---- Sheet -------------------------------------------------------------- */
.sheet {
  position: fixed; z-index: 2147483647;
  right: 18px; bottom: 74px; width: 384px; max-width: calc(100vw - 24px);
  max-height: 76vh; display: flex; flex-direction: column;
  background: var(--paper);
  border: 1.5px solid var(--ink); border-radius: 3px;
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: opacity .18s ease, transform .18s ease;
}
.sheet.hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }

@media (max-width: 520px) {
  .sheet {
    left: 0; right: 0; bottom: 0; width: 100%; max-width: 100%;
    max-height: 86vh; border-radius: 4px 4px 0 0; border-bottom: none;
    box-shadow: 0 -4px 0 rgba(25,23,18,0.12);
  }
}

/* ---- Masthead ----------------------------------------------------------- */
.head { position: relative; z-index: 1; padding: 15px 16px 0; }
.head .row1 { display: flex; align-items: flex-start; gap: 11px; }
.head .mono-mark {
  width: 30px; height: 30px; flex-shrink: 0; margin-top: 2px;
  display: flex; align-items: center; justify-content: center;
  background: var(--ink); color: var(--paper); border-radius: 2px;
  font-family: var(--serif); font-weight: 700; font-size: 16px;
}
.head .titles { flex: 1; min-width: 0; }
.head .title {
  font-family: var(--serif); font-size: 22px; font-weight: 700;
  line-height: 1; letter-spacing: -0.4px;
}
.head .sub {
  font-family: var(--mono); font-size: 10.5px; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.head .close {
  width: 26px; height: 26px; flex-shrink: 0; cursor: pointer;
  background: transparent; border: 1.5px solid var(--rule-strong); border-radius: 2px;
  color: var(--ink-2); font-size: 16px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
}
.head .close:hover { border-color: var(--ink); color: var(--ink); }
.masthead-rule { height: 3px; margin: 12px 16px 0; background: var(--ink);
  border-bottom: 1px solid var(--ink); box-shadow: 0 3px 0 var(--paper), 0 4px 0 var(--ink); }

/* ---- Tabs — underlined -------------------------------------------------- */
.tabs { position: relative; z-index: 1; display: flex; gap: 20px; padding: 14px 16px 0; }
.tab {
  padding: 0 0 8px; border: none; background: transparent; cursor: pointer;
  font-family: var(--mono); font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.2px; color: var(--ink-3);
  border-bottom: 2px solid transparent;
}
.tab:hover { color: var(--ink-2); }
.tab.active { color: var(--ink); border-bottom-color: var(--spot); }

/* ---- Body --------------------------------------------------------------- */
.body {
  position: relative; z-index: 1; flex: 1; overflow-y: auto;
  overscroll-behavior: contain; border-top: 1px solid var(--rule);
  padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 11px;
}
.body::-webkit-scrollbar { width: 6px; }
.body::-webkit-scrollbar-thumb { background: var(--rule-strong); border-radius: 0; }

/* ---- Buttons ------------------------------------------------------------ */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 11px 16px; border-radius: 2px; cursor: pointer;
  font-family: var(--mono); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  border: 1.5px solid var(--ink); transition: transform .08s ease, box-shadow .08s ease, background .12s ease;
}
.btn.primary { background: var(--ink); color: var(--paper); box-shadow: var(--shadow-sm); }
.btn.primary:active { transform: translate(3px,3px); box-shadow: 0 0 0 rgba(0,0,0,0); }
.btn.primary:disabled { opacity: .55; cursor: default; box-shadow: none; }
.btn.ghost { background: var(--paper); color: var(--ink); }
.btn.ghost:hover { background: var(--paper-2); }
.btn.ghost:active { transform: translate(2px, 2px); }
.btn.danger { background: var(--paper); color: var(--spot); border-color: var(--spot); }
.btn.danger:hover { background: var(--spot); color: var(--paper); }
.btn.danger:active { transform: translate(2px, 2px); }
.btn.full { width: 100%; }
.btn.sm { padding: 6px 9px; font-size: 11px; letter-spacing: .6px; }

/* ---- Form fields -------------------------------------------------------- */
.row { display: flex; gap: 8px; align-items: center; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label {
  font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: .8px;
}
input:not([type='checkbox']):not([type='radio']), select {
  width: 100%; padding: 9px 11px; border-radius: 2px; font-size: 13.5px;
  font-family: var(--sans); background: #fbf9f3; border: 1.5px solid var(--rule-strong);
  color: var(--ink); outline: none; appearance: none; -webkit-appearance: none;
  transition: border-color .12s ease;
}
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2356503f' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
input:not([type='checkbox']):not([type='radio'])::placeholder { color: var(--ink-3); }
input:not([type='checkbox']):not([type='radio']):focus, select:focus { border-color: var(--spot); }
input:not([type='checkbox']):not([type='radio']):disabled, select:disabled { opacity: 0.55; cursor: not-allowed; background: var(--paper-2); }

input[type='checkbox'] {
  width: 20px; height: 20px; appearance: none; cursor: pointer; flex-shrink: 0;
  border: 1.5px solid var(--ink); border-radius: 2px; background: #fbf9f3;
  position: relative; outline: none;
}
input[type='checkbox']:checked { background: var(--ink); }
input[type='checkbox']:checked::after {
  content: '✓'; position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; color: var(--paper); font-size: 13px; font-weight: 700;
}

/* Section title: label with a rule running to the edge */
.section-title {
  display: flex; align-items: center; gap: 10px; margin-top: 10px;
  font-family: var(--mono); font-size: 10.5px; font-weight: 700; color: var(--ink-2);
  text-transform: uppercase; letter-spacing: 1.4px; white-space: nowrap;
}
.section-title::after { content: ''; flex: 1; height: 1px; background: var(--rule); }
.section-title:first-child { margin-top: 0; }

/* ---- Profile Toolbar, Search & Subtabs ----------------------------------- */
.profile-toolbar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.profile-section { display: flex; flex-direction: column; gap: 8px; }
/* Each title is now :first-child of its section wrapper, which would zero the
   inter-section margin above — restore it (this rule must follow the
   .section-title:first-child rule to win the tie). */
.profile-section > .section-title { margin-top: 10px; }
.profile-search-wrap { position: relative; display: flex; align-items: center; width: 100%; }
.profile-search-input {
  width: 100%; padding: 8px 30px 8px 10px; border-radius: 2px; font-size: 12.5px;
  font-family: var(--sans); background: #fbf9f3; border: 1.5px solid var(--rule-strong);
  color: var(--ink); outline: none; transition: border-color .12s ease;
}
.profile-search-input:focus { border-color: var(--spot); }
.profile-search-clear {
  position: absolute; right: 8px; background: transparent; border: none;
  color: var(--ink-3); font-size: 14px; cursor: pointer; display: none;
  padding: 0 4px; line-height: 1;
}
.profile-search-clear.show { display: block; }
.profile-search-clear:hover { color: var(--ink); }

.profile-subtabs {
  display: flex; gap: 5px; overflow-x: auto; padding-bottom: 4px;
  scrollbar-width: none;
}
.profile-subtabs::-webkit-scrollbar { display: none; }
.profile-subtab {
  padding: 5px 9px; border: 1.5px solid var(--rule-strong); background: var(--paper);
  color: var(--ink-2); font-family: var(--mono); font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .8px; border-radius: 2px; cursor: pointer;
  white-space: nowrap; transition: all .1s ease;
}
.profile-subtab:hover { background: var(--paper-2); color: var(--ink); border-color: var(--ink); }
.profile-subtab.active {
  background: var(--ink); color: var(--paper); border-color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.search-summary {
  font-family: var(--mono); font-size: 10.5px; color: var(--spot); font-weight: 700;
  letter-spacing: .5px; padding: 2px 0;
}
.no-match-msg {
  font-family: var(--mono); font-size: 11.5px; color: var(--ink-3);
  text-align: center; padding: 20px 10px; border: 1px dashed var(--rule-strong);
}

/* ---- Sticky action footer (profile save) -------------------------------- */
.footbar {
  position: sticky; bottom: -16px; margin: 4px -16px -16px; padding: 12px 16px;
  background: var(--paper); border-top: 1.5px solid var(--ink);
}

/* ---- Report — a ledger -------------------------------------------------- */
.count-row { display: flex; gap: 14px; flex-wrap: wrap; padding-bottom: 3px;
  font-family: var(--mono); font-size: 11px; color: var(--ink-2); letter-spacing: .3px; }
.count-row b { color: var(--ink); font-weight: 700; }

.report-item {
  display: flex; gap: 10px; align-items: flex-start; padding: 8px 6px;
  border-radius: 2px; border-bottom: 1px solid var(--rule); font-size: 13px;
}
.report-item:last-child { border-bottom: none; }
.badge {
  flex-shrink: 0; font-family: var(--mono); font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .8px; padding: 2px 5px; border-radius: 2px;
  border: 1.5px solid currentColor; margin-top: 1px;
}
.badge.filled { color: var(--ok); }
.badge.skipped { color: var(--ink-3); }
.badge.suggested { color: var(--warn); }
.badge.unmatched, .badge.error { color: var(--miss); }
.report-item .name { font-family: var(--serif); font-size: 14px; line-height: 1.2; }
.report-item .meta { font-family: var(--mono); color: var(--ink-3); font-size: 10.5px; margin-top: 2px; word-break: break-word; }
.report-item.act { cursor: pointer; }
.report-item.act:hover { background: var(--paper-2); }

.muted { font-family: var(--sans); color: var(--ink-2); font-size: 12.5px; line-height: 1.55; }

/* ---- Teach tags & picker ------------------------------------------------ */
.teach-tag {
  position: fixed; z-index: 2147483646; background: var(--ink); color: var(--paper);
  font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; padding: 2px 6px; border-radius: 2px; cursor: pointer;
  pointer-events: auto; border-left: 3px solid var(--spot); box-shadow: var(--shadow-sm);
}
.picker {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: rgba(25,23,18,0.35);
}
.picker-box {
  width: 340px; max-width: 92vw; max-height: 70vh; display: flex; flex-direction: column;
  overflow: hidden; background: var(--paper); border: 1.5px solid var(--ink);
  border-radius: 3px; box-shadow: var(--shadow);
}
.picker-main { display: flex; flex-direction: column; width: 100%; }
.picker-box input, .picker-box select {
  width: calc(100% - 24px); margin: 8px 12px; padding: 9px 11px;
  border-radius: 2px; font-size: 13px; font-family: var(--sans);
  background: #fbf9f3; border: 1.5px solid var(--rule-strong);
  color: var(--ink); outline: none; appearance: none;
  transition: border-color .12s ease;
}
.picker-box input:focus, .picker-box select:focus { border-color: var(--spot); }
.picker-create { display: none; flex-direction: column; width: 100%; padding: 12px 0; }
.picker-create.show { display: flex; }
.picker-create-title {
  margin: 0 12px 8px; font-family: var(--mono); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px; color: var(--ink-2);
}
.picker-actions { display: flex; gap: 6px; margin: 8px 12px 0; }
.field-error {
  margin: 4px 12px 0; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: .3px; color: var(--spot);
}
.picker-list { overflow-y: auto; padding: 0 8px 10px; display: flex; flex-direction: column; }
.picker-opt { padding: 8px 10px; border-radius: 2px; cursor: pointer; border-bottom: 1px solid var(--rule); }
.picker-opt:last-child { border-bottom: none; }
.picker-opt:hover { background: var(--paper-2); }
.picker-opt .l { font-family: var(--serif); font-size: 14px; }
.picker-opt .k { font-family: var(--mono); font-size: 10px; color: var(--ink-3); }

/* ---- Toast — a rubber stamp --------------------------------------------- */
.toast {
  position: fixed; bottom: 132px; left: 50%; z-index: 2147483647;
  transform: translateX(-50%) rotate(-1.5deg);
  padding: 9px 16px; background: var(--paper); border: 2px solid var(--ink);
  border-radius: 2px; box-shadow: var(--shadow-sm);
  font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink);
  text-transform: uppercase; letter-spacing: .8px; white-space: nowrap;
  animation: fg-toast .18s ease;
}
@keyframes fg-toast { from { opacity: 0; transform: translateX(-50%) rotate(-1.5deg) translateY(5px); } }
`;
	function customFieldKey(label) {
		return "custom." + label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
	}
	function buildCustomField(input) {
		const label = input.label.trim();
		if (!label) return {
			ok: false,
			error: "Enter a field label."
		};
		const key = customFieldKey(label);
		if (key === "custom.") return {
			ok: false,
			error: "Label must contain letters or numbers."
		};
		if (FIELD_CATALOG[key] !== void 0) return {
			ok: false,
			error: "A field with this label already exists."
		};
		let options;
		if (input.kind === "select") {
			options = (input.optionsText ?? "").split(",").map((s) => s.trim()).filter(Boolean);
			if (!options.length) return {
				ok: false,
				error: "Enter at least one option for a choices field."
			};
		}
		return {
			ok: true,
			field: {
				key,
				label,
				kind: input.kind,
				options
			}
		};
	}
	var SUBTABS = [
		{
			id: "personal",
			label: "Personal",
			sectionIds: ["personal"]
		},
		{
			id: "family-contact",
			label: "Family & Contact",
			sectionIds: ["family", "contact"]
		},
		{
			id: "address",
			label: "Address",
			sectionIds: ["permanent", "correspondence"]
		},
		{
			id: "education",
			label: "Education",
			sectionIds: [
				"edu-tenth",
				"edu-twelfth",
				"edu-graduation",
				"edu-postgrad"
			]
		},
		{
			id: "identity",
			label: "Identity",
			sectionIds: ["ids"]
		},
		{
			id: "custom",
			label: "Custom",
			sectionIds: ["custom"]
		},
		{
			id: "all",
			label: "All",
			sectionIds: []
		}
	];
	function renderProfileEditor(data, onRefresh, save, initialTab = "personal") {
		const wrap = document.createElement("div");
		wrap.style.display = "flex";
		wrap.style.flexDirection = "column";
		wrap.style.gap = "8px";
		let customFieldsList = [];
		try {
			const raw = data._customFields;
			if (raw) customFieldsList = JSON.parse(raw);
		} catch {}
		let activeTabId = initialTab;
		const toolbar = document.createElement("div");
		toolbar.className = "profile-toolbar";
		const searchWrap = document.createElement("div");
		searchWrap.className = "profile-search-wrap";
		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.className = "profile-search-input";
		searchInput.placeholder = "Search fields (e.g. mobile, dob, aadhaar)";
		const clearBtn = document.createElement("button");
		clearBtn.type = "button";
		clearBtn.className = "profile-search-clear";
		clearBtn.textContent = "✕";
		clearBtn.title = "Clear search";
		searchWrap.append(searchInput, clearBtn);
		const subtabsContainer = document.createElement("div");
		subtabsContainer.className = "profile-subtabs";
		const subtabButtons = [];
		for (const tab of SUBTABS) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = `profile-subtab${tab.id === activeTabId ? " active" : ""}`;
			btn.textContent = tab.label;
			btn.dataset.tabId = tab.id;
			btn.addEventListener("click", () => {
				activeTabId = tab.id;
				if (searchInput.value) searchInput.value = "";
				updateView();
			});
			subtabButtons.push(btn);
			subtabsContainer.appendChild(btn);
		}
		const searchSummary = document.createElement("div");
		searchSummary.className = "search-summary";
		searchSummary.style.display = "none";
		toolbar.append(searchWrap, subtabsContainer, searchSummary);
		wrap.appendChild(toolbar);
		let sameSelect = null;
		const corrInputs = [];
		const renderedSections = [];
		for (const section of SECTIONS) {
			const sectionEl = document.createElement("div");
			sectionEl.className = "profile-section";
			const titleEl = document.createElement("div");
			titleEl.className = "section-title";
			titleEl.textContent = section.title;
			sectionEl.appendChild(titleEl);
			const fieldEntries = [];
			for (const f of section.fields) {
				const field = document.createElement("div");
				field.className = "field";
				const label = document.createElement("label");
				label.textContent = f.label;
				field.appendChild(label);
				let input;
				if (f.kind === "select" && f.options) {
					const sel = document.createElement("select");
					sel.appendChild(createOption("—", ""));
					for (const o of f.options) sel.appendChild(createOption(o, o));
					sel.value = data[f.key] ?? "";
					input = sel;
				} else {
					const inp = document.createElement("input");
					inp.type = f.sensitive ? "password" : f.kind === "date" ? "text" : f.kind === "number" ? "text" : f.kind;
					if (f.kind === "date") inp.placeholder = "YYYY-MM-DD";
					inp.value = data[f.key] ?? "";
					input = inp;
				}
				input.dataset.key = f.key;
				let controlEl = wrapSensitive(f.sensitive, input);
				if (f.key.startsWith("custom.")) {
					const row = document.createElement("div");
					row.className = "row";
					controlEl.style.flex = "1";
					const delBtn = document.createElement("button");
					delBtn.className = "btn danger sm";
					delBtn.style.height = "37px";
					delBtn.style.boxSizing = "border-box";
					delBtn.type = "button";
					delBtn.textContent = "✕";
					delBtn.addEventListener("click", () => {
						customFieldsList = customFieldsList.filter((x) => x.key !== f.key);
						const current = collect();
						delete current[f.key];
						registerCustomFields(customFieldsList);
						save(current);
						onRefresh(current, activeTabId);
					});
					row.appendChild(controlEl);
					row.appendChild(delBtn);
					controlEl = row;
				}
				field.appendChild(controlEl);
				sectionEl.appendChild(field);
				fieldEntries.push({
					key: f.key,
					label: f.label,
					el: field
				});
				if (f.key === "address.correspondence.sameAsPermanent") sameSelect = input;
				else if (f.key.startsWith("address.correspondence.")) corrInputs.push({
					inp: input,
					field
				});
			}
			wrap.appendChild(sectionEl);
			renderedSections.push({
				id: section.id,
				title: section.title,
				el: sectionEl,
				fieldEntries
			});
		}
		if (sameSelect) {
			const syncDisabled = () => {
				const off = sameSelect.value === "Yes";
				for (const { inp, field } of corrInputs) {
					inp.disabled = off;
					field.style.opacity = off ? "0.4" : "";
				}
			};
			sameSelect.addEventListener("change", syncDisabled);
			syncDisabled();
		}
		const addPanel = document.createElement("div");
		addPanel.style.borderTop = "1px dashed var(--rule-strong)";
		addPanel.style.paddingTop = "12px";
		addPanel.style.marginTop = "12px";
		addPanel.style.display = "flex";
		addPanel.style.flexDirection = "column";
		addPanel.style.gap = "8px";
		const addTitle = document.createElement("div");
		addTitle.className = "section-title";
		addTitle.textContent = "Add Custom Field";
		addPanel.appendChild(addTitle);
		const row1 = document.createElement("div");
		row1.className = "row";
		row1.style.gap = "6px";
		const labelInp = document.createElement("input");
		labelInp.placeholder = "Label (e.g. Aadhaar Virtual ID)";
		labelInp.style.flex = "2";
		labelInp.style.minWidth = "0";
		const typeSel = document.createElement("select");
		typeSel.style.flex = "1";
		typeSel.style.minWidth = "0";
		typeSel.appendChild(createOption("Text", "text"));
		typeSel.appendChild(createOption("Number", "number"));
		typeSel.appendChild(createOption("Date", "date"));
		typeSel.appendChild(createOption("Choices / Dropdown / Radio", "select"));
		row1.append(labelInp, typeSel);
		addPanel.appendChild(row1);
		const row2 = document.createElement("div");
		row2.className = "row";
		row2.style.gap = "6px";
		row2.style.display = "none";
		const optionsInp = document.createElement("input");
		optionsInp.placeholder = "Options (comma-separated, e.g. Yes, No)";
		optionsInp.style.flex = "1";
		optionsInp.style.minWidth = "0";
		row2.appendChild(optionsInp);
		addPanel.appendChild(row2);
		typeSel.addEventListener("change", () => {
			row2.style.display = typeSel.value === "select" ? "flex" : "none";
		});
		const errEl = document.createElement("div");
		errEl.className = "field-error";
		errEl.style.display = "none";
		addPanel.appendChild(errEl);
		const addBtn = document.createElement("button");
		addBtn.className = "btn ghost full";
		addBtn.type = "button";
		addBtn.textContent = "＋ Add Custom Field";
		addBtn.style.marginTop = "4px";
		addBtn.addEventListener("click", () => {
			const built = buildCustomField({
				label: labelInp.value,
				kind: typeSel.value,
				optionsText: optionsInp.value
			});
			if (!built.ok) {
				errEl.textContent = built.error;
				errEl.style.display = "block";
				return;
			}
			customFieldsList.push(built.field);
			const current = collect();
			registerCustomFields(customFieldsList);
			save(current);
			onRefresh(current, activeTabId === "all" ? "all" : "custom");
		});
		addPanel.appendChild(addBtn);
		wrap.appendChild(addPanel);
		const noMatchEl = document.createElement("div");
		noMatchEl.className = "no-match-msg";
		noMatchEl.style.display = "none";
		noMatchEl.textContent = "No matching fields found";
		wrap.appendChild(noMatchEl);
		const updateView = () => {
			const q = searchInput.value.trim().toLowerCase();
			clearBtn.classList.toggle("show", q.length > 0);
			for (const btn of subtabButtons) btn.classList.toggle("active", btn.dataset.tabId === activeTabId);
			const currentTabDef = SUBTABS.find((t) => t.id === activeTabId) ?? SUBTABS[0];
			let totalVisibleFields = 0;
			for (const section of renderedSections) {
				if (!(currentTabDef.id === "all" || q.length > 0 || currentTabDef.sectionIds.includes(section.id))) {
					section.el.style.display = "none";
					continue;
				}
				let sectionVisibleCount = 0;
				for (const field of section.fieldEntries) if (q.length === 0 || field.label.toLowerCase().includes(q) || field.key.toLowerCase().includes(q) || section.title.toLowerCase().includes(q)) {
					field.el.style.display = "";
					sectionVisibleCount++;
					totalVisibleFields++;
				} else field.el.style.display = "none";
				section.el.style.display = sectionVisibleCount > 0 ? "" : "none";
			}
			const showAddPanel = q.length === 0 && (activeTabId === "custom" || activeTabId === "all");
			addPanel.style.display = showAddPanel ? "flex" : "none";
			const searching = q.length > 0;
			searchSummary.style.display = searching && totalVisibleFields > 0 ? "block" : "none";
			if (searching) searchSummary.textContent = `Found ${totalVisibleFields} matching field${totalVisibleFields === 1 ? "" : "s"}`;
			noMatchEl.style.display = searching && totalVisibleFields === 0 ? "block" : "none";
		};
		searchInput.addEventListener("input", updateView);
		clearBtn.addEventListener("click", () => {
			searchInput.value = "";
			updateView();
		});
		updateView();
		const collect = () => {
			const out = {};
			wrap.querySelectorAll("[data-key]").forEach((el) => {
				const v = el.value.trim();
				if (v) out[el.dataset.key] = v;
			});
			if (customFieldsList.length > 0) out["_customFields"] = JSON.stringify(customFieldsList);
			return out;
		};
		return {
			el: wrap,
			collect
		};
	}
	function wrapSensitive(sensitive, input) {
		if (!sensitive) return input;
		const row = document.createElement("div");
		row.className = "row";
		input.style.flex = "1";
		const toggle = document.createElement("button");
		toggle.className = "btn ghost sm";
		toggle.style.height = "37px";
		toggle.style.boxSizing = "border-box";
		toggle.type = "button";
		toggle.textContent = "👁";
		toggle.addEventListener("click", () => {
			const inp = input;
			inp.type = inp.type === "password" ? "text" : "password";
		});
		row.appendChild(input);
		row.appendChild(toggle);
		return row;
	}
	function createOption(text, value) {
		const opt = document.createElement("option");
		opt.text = text;
		opt.value = value;
		return opt;
	}
	var BADGE = {
		filled: "Filled",
		skipped: "Skip",
		unmatched: "Miss",
		suggested: "Hint",
		error: "Err"
	};
	function renderReport(results, onAcceptSuggestion, onTeach) {
		const wrap = document.createElement("div");
		wrap.style.display = "flex";
		wrap.style.flexDirection = "column";
		wrap.style.gap = "6px";
		const counts = tally(results);
		const summary = document.createElement("div");
		summary.className = "count-row";
		summary.innerHTML = `<span><b>${counts.filled}</b> filled</span><span><b>${counts.skipped}</b> skipped</span><span><b>${counts.suggested}</b> suggested</span><span><b>${counts.unmatched}</b> unmatched</span>`;
		wrap.appendChild(summary);
		const order = [
			"suggested",
			"unmatched",
			"error",
			"filled",
			"skipped"
		];
		const sorted = [...results].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
		for (const r of sorted) {
			const item = document.createElement("div");
			item.className = "report-item" + (r.status === "suggested" || r.status === "unmatched" ? " act" : "");
			const badge = document.createElement("span");
			badge.className = `badge ${r.status}`;
			badge.textContent = BADGE[r.status] ?? "•";
			item.appendChild(badge);
			const label = r.match.key ? FIELD_CATALOG[r.match.key]?.label ?? r.match.key : "(unmatched)";
			const desc = r.match.descriptor.text.slice(0, 40) || "(no label)";
			const info = document.createElement("div");
			info.innerHTML = `<div class="name">${escapeHtml(label)}</div><div class="meta">${escapeHtml(desc)}${r.reason ? " · " + escapeHtml(r.reason) : ""}${r.status === "suggested" ? ` · ${r.match.confidence * 100 | 0}%` : ""}</div>`;
			item.appendChild(info);
			if (r.status === "suggested") {
				item.title = "Tap to accept this suggestion";
				item.addEventListener("click", () => onAcceptSuggestion(r.match.fingerprint));
			} else if (r.status === "unmatched") {
				item.title = "Tap to map this field (teach)";
				item.addEventListener("click", () => onTeach());
			}
			wrap.appendChild(item);
		}
		return wrap;
	}
	function tally(results) {
		const c = {
			filled: 0,
			skipped: 0,
			suggested: 0,
			unmatched: 0,
			error: 0
		};
		for (const r of results) c[r.status]++;
		return c;
	}
	function escapeHtml(s) {
		return s.replace(/[&<>"]/g, (ch) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;"
		})[ch]);
	}
	var K_PROFILE = "fg:profile";
	var K_SETTINGS = "fg:settings";
	var K_FAB = "fg:fab";
	var rulesKey = (host) => `fg:rules:${host}`;
	var DEFAULT_SETTINGS = {
		overwrite: false,
		debug: false,
		ai: {
			enabled: false,
			apiKey: "",
			model: "gemini-3.1-flash-lite"
		},
		enabledSites: []
	};
	function loadProfile() {
		const raw = GM_getValue(K_PROFILE, null);
		if (!raw || typeof raw !== "object") return emptyProfile();
		return migrateProfile(raw);
	}
	function saveProfile(data) {
		const clean = {};
		for (const [k, v] of Object.entries(data)) {
			const s = (v ?? "").toString().trim();
			if (s) clean[k] = s;
		}
		GM_setValue(K_PROFILE, {
			v: 1,
			data: clean
		});
	}
	function migrateProfile(p) {
		let cur = p;
		if (typeof cur.v !== "number") cur = {
			v: 1,
			data: cur.data ?? {}
		};
		return cur;
	}
	function loadSettings() {
		const raw = GM_getValue(K_SETTINGS, null);
		return {
			...DEFAULT_SETTINGS,
			...raw,
			ai: {
				...DEFAULT_SETTINGS.ai,
				...raw?.ai
			},
			enabledSites: raw?.enabledSites ?? []
		};
	}
	function saveSettings(s) {
		GM_setValue(K_SETTINGS, s);
	}
	function isSiteEnabled(host) {
		return loadSettings().enabledSites.includes(host);
	}
	function setSiteEnabled(host, enabled) {
		const s = loadSettings();
		const i = s.enabledSites.indexOf(host);
		if (enabled && i < 0) s.enabledSites.push(host);
		if (!enabled && i >= 0) s.enabledSites.splice(i, 1);
		saveSettings(s);
	}
	function loadRules(host) {
		return GM_getValue(rulesKey(host), []) ?? [];
	}
	function saveRules(host, rules) {
		GM_setValue(rulesKey(host), rules);
	}
	function upsertRule(host, rule) {
		const rules = loadRules(host);
		const i = rules.findIndex((r) => r.fingerprint === rule.fingerprint && r.occurrence === rule.occurrence);
		if (i >= 0) rules[i] = rule;
		else rules.push(rule);
		saveRules(host, rules);
	}
	function deleteRule(host, fingerprint, occurrence) {
		saveRules(host, loadRules(host).filter((r) => !(r.fingerprint === fingerprint && r.occurrence === occurrence)));
	}
	function loadFabPos() {
		return GM_getValue(K_FAB, null);
	}
	function saveFabPos(pos) {
		GM_setValue(K_FAB, pos);
	}
	function exportProfileJson() {
		return JSON.stringify({ profile: loadProfile() }, null, 2);
	}
	function validateProfile(data) {
		if (!data || typeof data !== "object" || Array.isArray(data)) return false;
		for (const [k, v] of Object.entries(data)) if (typeof k !== "string" || typeof v !== "string") return false;
		if ("_customFields" in data) try {
			const parsed = JSON.parse(data._customFields);
			if (!Array.isArray(parsed)) return false;
			for (const item of parsed) {
				if (!item || typeof item !== "object" || Array.isArray(item)) return false;
				if (typeof item.key !== "string" || typeof item.label !== "string" || typeof item.kind !== "string") return false;
				if (item.options !== void 0 && !Array.isArray(item.options)) return false;
			}
		} catch {
			return false;
		}
		return true;
	}
	function importBundle(json) {
		try {
			const parsed = JSON.parse(json);
			const data = parsed?.profile?.data ?? parsed?.data;
			if (!data || typeof data !== "object") return {
				ok: false,
				error: "No profile data found in file"
			};
			if (!validateProfile(data)) return {
				ok: false,
				error: "Invalid profile data schema"
			};
			saveProfile(data);
			return { ok: true };
		} catch (e) {
			return {
				ok: false,
				error: e.message
			};
		}
	}
	var TeachMode = class {
		shadow;
		host;
		getProfile;
		saveProfile;
		onSaved;
		layer = null;
		tags = [];
		active = false;
		reposition = () => this.layout();
		constructor(shadow, host, getProfile, saveProfile, onSaved) {
			this.shadow = shadow;
			this.host = host;
			this.getProfile = getProfile;
			this.saveProfile = saveProfile;
			this.onSaved = onSaved;
		}
		isActive() {
			return this.active;
		}
		start() {
			if (this.active) return;
			this.active = true;
			this.layer = document.createElement("div");
			this.layer.style.position = "fixed";
			this.layer.style.inset = "0";
			this.layer.style.zIndex = "2147483646";
			this.layer.style.pointerEvents = "none";
			this.shadow.appendChild(this.layer);
			const units = scan();
			const seen = new Map();
			for (const u of units) {
				const d = describe(u);
				if (isCaptchaLike(d)) continue;
				const fp = fingerprintOf(d);
				const occ = seen.get(fp) ?? 0;
				seen.set(fp, occ + 1);
				const tag = document.createElement("div");
				tag.className = "teach-tag";
				tag.textContent = "map";
				tag.addEventListener("click", (e) => {
					e.stopPropagation();
					this.openPicker(d, occ);
				});
				this.layer.appendChild(tag);
				this.tags.push({
					el: tag,
					descriptor: d,
					occurrence: occ
				});
			}
			this.layout();
			window.addEventListener("scroll", this.reposition, true);
			window.addEventListener("resize", this.reposition);
		}
		stop() {
			this.active = false;
			window.removeEventListener("scroll", this.reposition, true);
			window.removeEventListener("resize", this.reposition);
			this.layer?.remove();
			this.layer = null;
			this.tags = [];
		}
		layout() {
			for (const t of this.tags) {
				const r = t.descriptor.unit.el.getBoundingClientRect();
				if (r.width === 0 && r.height === 0) {
					t.el.style.display = "none";
					continue;
				}
				t.el.style.display = "block";
				t.el.style.left = `${r.left}px`;
				t.el.style.top = `${Math.max(0, r.top - 12)}px`;
			}
		}
		openPicker(d, occurrence) {
			const overlay = document.createElement("div");
			overlay.className = "picker";
			const box = document.createElement("div");
			box.className = "picker-box";
			const mainView = document.createElement("div");
			mainView.className = "picker-main";
			const search = document.createElement("input");
			search.placeholder = `Map "${d.text.slice(0, 30) || d.name || "field"}" to…`;
			const createBtn = document.createElement("button");
			createBtn.className = "btn ghost sm";
			createBtn.textContent = "＋ Create new custom field";
			createBtn.style.alignSelf = "flex-start";
			createBtn.style.margin = "0 12px 8px";
			const list = document.createElement("div");
			list.className = "picker-list";
			mainView.append(search, createBtn, list);
			const createView = document.createElement("div");
			createView.className = "picker-create";
			const createTitle = document.createElement("div");
			createTitle.className = "picker-create-title";
			createTitle.textContent = "Create Custom Field";
			const cLabel = document.createElement("input");
			cLabel.placeholder = "Field Label (e.g. Aadhaar Virtual ID)";
			cLabel.value = defaultLabelFrom(d);
			const cType = document.createElement("select");
			const addOpt = (t, v) => {
				const o = document.createElement("option");
				o.text = t;
				o.value = v;
				cType.appendChild(o);
			};
			addOpt("Text", "text");
			addOpt("Number", "number");
			addOpt("Date", "date");
			addOpt("Choices / Dropdown / Radio", "select");
			cType.value = defaultKindFrom(d.unit.type);
			const cOptions = document.createElement("input");
			cOptions.placeholder = "Options (comma-separated, e.g. Yes, No)";
			cOptions.style.display = cType.value === "select" ? "block" : "none";
			if (d.options.length) cOptions.value = d.options.join(", ");
			cType.addEventListener("change", () => {
				cOptions.style.display = cType.value === "select" ? "block" : "none";
			});
			const cError = document.createElement("div");
			cError.className = "field-error";
			cError.style.display = "none";
			const actions = document.createElement("div");
			actions.className = "picker-actions";
			const saveBtn = document.createElement("button");
			saveBtn.className = "btn primary sm";
			saveBtn.textContent = "Create & Map";
			saveBtn.style.flex = "1";
			const cancelBtn = document.createElement("button");
			cancelBtn.className = "btn ghost sm";
			cancelBtn.textContent = "Cancel";
			cancelBtn.style.flex = "1";
			actions.append(saveBtn, cancelBtn);
			createView.append(createTitle, cLabel, cType, cOptions, cError, actions);
			box.append(mainView, createView);
			overlay.appendChild(box);
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) overlay.remove();
			});
			this.shadow.appendChild(overlay);
			const showCreate = (on) => {
				createView.classList.toggle("show", on);
				mainView.style.display = on ? "none" : "flex";
				(on ? cLabel : search).focus();
			};
			createBtn.addEventListener("click", () => showCreate(true));
			cancelBtn.addEventListener("click", () => showCreate(false));
			saveBtn.addEventListener("click", () => {
				const built = buildCustomField({
					label: cLabel.value,
					kind: cType.value,
					optionsText: cOptions.value
				});
				if (!built.ok) {
					cError.textContent = built.error;
					cError.style.display = "block";
					return;
				}
				this.createAndMap(d, occurrence, built.field);
				overlay.remove();
			});
			const render = (q) => {
				list.innerHTML = "";
				const nq = q.toLowerCase();
				for (const key of ALL_KEYS) {
					const def = FIELD_CATALOG[key];
					const hay = `${def.label} ${key}`.toLowerCase();
					if (nq && !hay.includes(nq)) continue;
					const opt = document.createElement("div");
					opt.className = "picker-opt";
					const labelDiv = document.createElement("div");
					labelDiv.className = "l";
					labelDiv.textContent = def.label;
					const keyDiv = document.createElement("div");
					keyDiv.className = "k";
					keyDiv.textContent = key;
					opt.appendChild(labelDiv);
					opt.appendChild(keyDiv);
					opt.addEventListener("click", () => {
						this.mapTo(d, occurrence, key);
						overlay.remove();
					});
					list.appendChild(opt);
				}
			};
			search.addEventListener("input", () => render(search.value));
			render("");
			search.focus();
		}
		mapTo(d, occurrence, key) {
			upsertRule(this.host, {
				fingerprint: fingerprintOf(d),
				occurrence,
				key,
				source: "teach",
				ts: Date.now()
			});
			this.onSaved();
		}
		createAndMap(d, occurrence, field) {
			const profile = this.getProfile();
			let customFieldsList = [];
			try {
				if (profile._customFields) customFieldsList = JSON.parse(profile._customFields);
			} catch {}
			customFieldsList.push(field);
			profile._customFields = JSON.stringify(customFieldsList);
			const val = currentFieldValue(d);
			if (val) profile[field.key] = val;
			this.saveProfile(profile);
			this.mapTo(d, occurrence, field.key);
		}
	};
	function defaultLabelFrom(d) {
		const label = d.text.replace(/[*():.,/\\|#\-_]+/g, " ").replace(/\b(enter|select|input|mandatory|field|captcha|security|code)\b/gi, "").replace(/\s+/g, " ").trim();
		if (!label) return "Custom Field";
		return label.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
	}
	function defaultKindFrom(unitType) {
		if (unitType === "select" || unitType === "radio" || unitType === "checkbox") return "select";
		if (unitType === "date") return "date";
		if (unitType === "number") return "number";
		return "text";
	}
	function currentFieldValue(d) {
		const unit = d.unit;
		if (unit.type === "radio" || unit.type === "checkbox") {
			const active = unit.group.find((r) => r.checked);
			return active ? radioLabel(active).trim() : "";
		}
		return unit.el.value.trim();
	}
	var FormGeniePanel = class {
		ctl;
		shadow;
		container;
		fab;
		sheet;
		body;
		teach;
		tab = "fill";
		lastResults = [];
		constructor(ctl) {
			this.ctl = ctl;
			this.container = document.createElement("div");
			this.container.id = "form-genie-root";
			this.shadow = this.container.attachShadow({ mode: "closed" });
			const style = document.createElement("style");
			style.textContent = STYLES;
			this.shadow.appendChild(style);
			this.isolateEvents();
			this.teach = new TeachMode(this.shadow, ctl.host, () => ctl.getProfile(), (data) => ctl.saveProfile(data), () => this.toast("Mapping saved"));
			this.buildFab();
			this.buildSheet();
			document.documentElement.appendChild(this.container);
		}
		isolateEvents() {
			for (const evt of [
				"keydown",
				"keyup",
				"keypress",
				"input",
				"change",
				"paste",
				"copy",
				"cut",
				"contextmenu",
				"mousedown",
				"mouseup",
				"click",
				"dblclick",
				"pointerdown",
				"pointerup",
				"touchstart",
				"touchend",
				"focusin",
				"focusout",
				"wheel"
			]) this.container.addEventListener(evt, (e) => e.stopPropagation());
		}
		buildFab() {
			this.fab = document.createElement("button");
			this.fab.className = "fab";
			this.fab.innerHTML = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z\"/></svg><span>Fill</span>";
			const pos = loadFabPos();
			if (pos) {
				const w = 120, h = 46;
				const x = Math.max(0, Math.min(window.innerWidth - w, pos.x));
				const y = Math.max(0, Math.min(window.innerHeight - h, pos.y));
				this.fab.style.left = `${x}px`;
				this.fab.style.top = `${y}px`;
			} else {
				this.fab.style.right = "16px";
				this.fab.style.bottom = "16px";
			}
			this.enableDrag();
			this.shadow.appendChild(this.fab);
		}
		enableDrag() {
			let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, dragging = false;
			const onDown = (e) => {
				dragging = true;
				moved = false;
				const r = this.fab.getBoundingClientRect();
				ox = r.left;
				oy = r.top;
				sx = e.clientX;
				sy = e.clientY;
				this.fab.setPointerCapture(e.pointerId);
			};
			const onMove = (e) => {
				if (!dragging) return;
				const dx = e.clientX - sx, dy = e.clientY - sy;
				if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
				const x = Math.max(0, Math.min(window.innerWidth - this.fab.offsetWidth, ox + dx));
				const y = Math.max(0, Math.min(window.innerHeight - this.fab.offsetHeight, oy + dy));
				this.fab.style.left = `${x}px`;
				this.fab.style.top = `${y}px`;
				this.fab.style.right = "auto";
				this.fab.style.bottom = "auto";
			};
			const onUp = () => {
				if (!dragging) return;
				dragging = false;
				if (moved) {
					const r = this.fab.getBoundingClientRect();
					saveFabPos({
						x: r.left,
						y: r.top
					});
				} else this.toggleSheet();
			};
			this.fab.addEventListener("pointerdown", onDown);
			this.fab.addEventListener("pointermove", onMove);
			this.fab.addEventListener("pointerup", onUp);
		}
		buildSheet() {
			this.sheet = document.createElement("div");
			this.sheet.className = "sheet hidden";
			const head = document.createElement("div");
			head.className = "head";
			const row1 = document.createElement("div");
			row1.className = "row1";
			row1.innerHTML = `<div class="mono-mark">G</div><div class="titles"><div class="title">Form Genie</div><div class="sub">EST. ON — ${this.ctl.host}</div></div>`;
			const close = document.createElement("button");
			close.className = "close";
			close.textContent = "×";
			close.setAttribute("aria-label", "Close");
			close.addEventListener("click", () => this.toggleSheet());
			row1.appendChild(close);
			const rule = document.createElement("div");
			rule.className = "masthead-rule";
			head.append(row1, rule);
			const tabs = document.createElement("div");
			tabs.className = "tabs";
			[
				"fill",
				"profile",
				"settings"
			].forEach((t) => {
				const b = document.createElement("button");
				b.className = "tab" + (t === this.tab ? " active" : "");
				b.textContent = t[0].toUpperCase() + t.slice(1);
				b.dataset.tab = t;
				b.addEventListener("click", () => {
					this.tab = t;
					this.syncTabs();
					this.renderBody();
				});
				tabs.appendChild(b);
			});
			this.tabsEl = tabs;
			this.body = document.createElement("div");
			this.body.className = "body";
			this.sheet.append(head, tabs, this.body);
			this.shadow.appendChild(this.sheet);
		}
		tabsEl;
		syncTabs() {
			this.tabsEl.querySelectorAll(".tab").forEach((b) => {
				b.classList.toggle("active", b.dataset.tab === this.tab);
			});
		}
		toggleSheet() {
			if (!this.sheet.classList.toggle("hidden")) this.renderBody();
		}
		open() {
			this.sheet.classList.remove("hidden");
			this.renderBody();
		}
		renderBody() {
			this.body.innerHTML = "";
			if (this.tab === "fill") this.renderFill();
			else if (this.tab === "profile") this.renderProfile();
			else this.renderSettings();
		}
		renderFill() {
			const fillBtn = button("Fill this page", "primary full", async () => {
				fillBtn.textContent = "Filling…";
				fillBtn.disabled = true;
				try {
					this.lastResults = await this.ctl.runFill();
				} catch (e) {
					this.toast(`Fill failed: ${e.message}`);
					fillBtn.textContent = "Fill this page";
					fillBtn.disabled = false;
					return;
				}
				this.renderBody();
			});
			this.body.appendChild(fillBtn);
			const teachBtn = button(this.teach.isActive() ? "Stop teaching" : "Teach mode", "ghost full", () => {
				if (this.teach.isActive()) this.teach.stop();
				else {
					this.teach.start();
					this.sheet.classList.add("hidden");
				}
				this.renderBody();
			});
			this.body.appendChild(teachBtn);
			if (this.lastResults.length) this.body.appendChild(renderReport(this.lastResults, async (fp) => {
				try {
					this.lastResults = await this.ctl.runFill(new Set([fp]));
				} catch (e) {
					this.toast(`Fill failed: ${e.message}`);
					return;
				}
				this.renderBody();
			}, () => {
				this.teach.start();
				this.sheet.classList.add("hidden");
			}));
			else {
				const hint = document.createElement("div");
				hint.className = "muted";
				hint.textContent = "Tap “Fill this page” to fill recognised fields from your profile.";
				this.body.appendChild(hint);
			}
		}
		renderProfile(data = this.ctl.getProfile(), initialTab) {
			this.body.innerHTML = "";
			const handle = renderProfileEditor(data, (updatedData, activeTab) => this.renderProfile(updatedData, activeTab), (updatedData) => this.ctl.saveProfile(updatedData), initialTab);
			const footbar = document.createElement("div");
			footbar.className = "footbar";
			footbar.appendChild(button("Save profile", "primary full", () => {
				this.ctl.saveProfile(handle.collect());
				this.toast("Profile saved");
			}));
			this.body.append(handle.el, footbar);
		}
		renderSettings() {
			const s = this.ctl.getSettings();
			this.body.appendChild(sectionTitle("General"));
			this.body.appendChild(toggleRow("Overwrite existing values", s.overwrite, (v) => {
				s.overwrite = v;
				this.ctl.saveSettings(s);
			}));
			this.body.appendChild(toggleRow("Debug mode", s.debug, (v) => {
				s.debug = v;
				this.ctl.saveSettings(s);
			}));
			this.body.appendChild(sectionTitle("AI tier (Gemini)"));
			this.body.appendChild(toggleRow("Enable AI matching", s.ai.enabled, (v) => {
				s.ai.enabled = v;
				this.ctl.saveSettings(s);
			}));
			this.body.appendChild(textRow("API key", s.ai.apiKey, "password", (v) => {
				s.ai.apiKey = v;
				this.ctl.saveSettings(s);
			}));
			this.body.appendChild(textRow("Model", s.ai.model, "text", (v, input) => {
				s.ai.model = v.trim() || "gemini-3.1-flash-lite";
				input.value = s.ai.model;
				this.ctl.saveSettings(s);
			}));
			const note = document.createElement("div");
			note.className = "muted";
			note.textContent = "Only field labels are sent to Gemini — never your data. The API key is never included in exports.";
			this.body.appendChild(note);
			this.body.appendChild(sectionTitle("Data"));
			const row = document.createElement("div");
			row.className = "row";
			row.append(button("Export", "ghost", () => this.exportProfile()), button("Import", "ghost", () => this.importProfile()));
			this.body.appendChild(row);
			this.body.appendChild(sectionTitle(`Learned rules for ${this.ctl.host}`));
			this.renderRules();
		}
		renderRules() {
			const rules = this.ctl.getRules();
			if (!rules.length) {
				const m = document.createElement("div");
				m.className = "muted";
				m.textContent = "No learned rules yet. Use Teach mode to add some.";
				this.body.appendChild(m);
				return;
			}
			for (const r of rules) {
				const item = document.createElement("div");
				item.className = "report-item";
				item.style.alignItems = "center";
				const content = document.createElement("div");
				content.style.flex = "1";
				const label = document.createElement("div");
				label.textContent = FIELD_CATALOG[r.key]?.label ?? r.key;
				const meta = document.createElement("div");
				meta.className = "meta";
				meta.textContent = `${r.fingerprint.replace(/^[nih]:/, "")} · ${r.source}`;
				content.appendChild(label);
				content.appendChild(meta);
				item.appendChild(content);
				item.appendChild(button("✕", "danger sm", () => {
					this.ctl.deleteRule(r.fingerprint, r.occurrence);
					this.renderBody();
				}));
				this.body.appendChild(item);
			}
		}
		exportProfile() {
			const blob = new Blob([this.ctl.exportJson()], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "form-genie-profile.json";
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
		}
		importProfile() {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "application/json,.json";
			input.addEventListener("change", () => {
				const file = input.files?.[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onload = () => {
					const res = this.ctl.importJson(String(reader.result));
					this.toast(res.ok ? "Profile imported" : `Import failed: ${res.error}`);
					if (res.ok) this.renderBody();
				};
				reader.readAsText(file);
			});
			input.click();
		}
		toast(msg) {
			this.shadow.querySelectorAll(".toast").forEach((t) => t.remove());
			const t = document.createElement("div");
			t.className = "toast";
			t.textContent = msg;
			this.shadow.appendChild(t);
			setTimeout(() => t.remove(), 2200);
		}
	};
	function button(text, cls, onClick) {
		const b = document.createElement("button");
		b.className = `btn ${cls}`;
		b.textContent = text;
		b.addEventListener("click", onClick);
		return b;
	}
	function sectionTitle(text) {
		const d = document.createElement("div");
		d.className = "section-title";
		d.textContent = text;
		return d;
	}
	function toggleRow(label, value, onChange) {
		const row = document.createElement("label");
		row.className = "row";
		row.style.justifyContent = "space-between";
		const span = document.createElement("span");
		span.className = "muted";
		span.textContent = label;
		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.checked = value;
		cb.addEventListener("change", () => onChange(cb.checked));
		row.append(span, cb);
		return row;
	}
	function textRow(label, value, type, onChange) {
		const field = document.createElement("div");
		field.className = "field";
		const l = document.createElement("label");
		l.textContent = label;
		const inp = document.createElement("input");
		inp.type = type;
		inp.value = value;
		inp.addEventListener("change", () => onChange(inp.value, inp));
		field.append(l, inp);
		return field;
	}
	var host = location.hostname;
	function syncCustomFields(data) {
		const raw = data._customFields;
		if (raw) try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				registerCustomFields(parsed);
				return;
			}
		} catch {}
		registerCustomFields([]);
	}
	function boot() {
		if (!isSiteEnabled(host)) {
			GM_registerMenuCommand("✅ Enable Form Genie on this site", () => {
				setSiteEnabled(host, true);
				location.reload();
			});
			return;
		}
		setDebug(loadSettings().debug);
		syncCustomFields(loadProfile().data);
		let panel;
		panel = new FormGeniePanel({
			host,
			getProfile: () => loadProfile().data,
			saveProfile: (data) => {
				syncCustomFields(data);
				saveProfile(data);
			},
			getSettings: () => loadSettings(),
			saveSettings: (s) => {
				saveSettings(s);
				setDebug(s.debug);
			},
			getRules: () => loadRules(host),
			deleteRule: (fp, occ) => deleteRule(host, fp, occ),
			exportJson: () => exportProfileJson(),
			importJson: (json) => {
				const res = importBundle(json);
				if (res.ok) syncCustomFields(loadProfile().data);
				return res;
			},
			runFill: (accepted) => runFill(accepted, (m) => panel.toast(m))
		});
		GM_registerMenuCommand("Open Form Genie", () => panel.open());
		GM_registerMenuCommand("🚫 Disable Form Genie on this site", () => {
			setSiteEnabled(host, false);
			location.reload();
		});
		GM_registerMenuCommand("Toggle debug mode", () => {
			const s = loadSettings();
			s.debug = !s.debug;
			saveSettings(s);
			setDebug(s.debug);
			panel.toast(`Debug ${s.debug ? "on" : "off"}`);
		});
		log("Form Genie ready on", host);
	}
	async function runFill(accepted, notify) {
		const settings = loadSettings();
		setDebug(settings.debug);
		const profile = loadProfile();
		syncCustomFields(profile.data);
		const rules = loadRules(host);
		const matches = matchAll(scan().map(describe).filter((d) => !isCaptchaLike(d)), rules);
		if (settings.ai.enabled && settings.ai.apiKey) await applyAiTier(matches, settings, notify);
		if (accepted && accepted.size > 0) {
			for (const m of matches) if (accepted.has(m.fingerprint) && m.key) {
				upsertRule(host, {
					fingerprint: m.fingerprint,
					occurrence: m.occurrence,
					key: m.key,
					source: "teach",
					ts: Date.now()
				});
				m.source = "teach";
				m.confidence = 1;
			}
		}
		drawOverlay(matches);
		log("matched", matches.filter((m) => m.key).length, "of", matches.length, "fields");
		return fillAll(matches, profile.data, {
			overwrite: settings.overwrite,
			acceptedFingerprints: accepted
		});
	}
	async function applyAiTier(matches, settings, notify) {
		const inputs = [];
		matches.forEach((m, index) => {
			if (m.source === "teach" || m.source === "ai") return;
			if (m.confidence >= .45 && m.key) return;
			inputs.push({
				index,
				descriptorText: m.descriptor.text,
				type: m.descriptor.unit.type,
				options: m.descriptor.options
			});
		});
		if (!inputs.length) return;
		const res = await mapWithAI(inputs, settings);
		if (!res.ok) {
			notify(`AI: ${res.error}`);
			return;
		}
		const sent = new Set(inputs.map((i) => i.index));
		let applied = 0;
		for (const [index, key] of res.mapping) {
			if (!sent.has(index)) continue;
			const m = matches[index];
			if (!m) continue;
			matches[index] = {
				...m,
				key,
				confidence: .8,
				source: "ai"
			};
			upsertRule(host, {
				fingerprint: m.fingerprint,
				occurrence: m.occurrence,
				key,
				source: "ai",
				ts: Date.now()
			});
			applied++;
		}
		log("AI mapped", applied, "fields");
	}
	boot();
})();
