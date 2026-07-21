/**
 * Profile schema: the canonical catalog of fillable data.
 *
 * Data is authored/stored as a flat map of dot-keys (`personal.firstName`) so
 * the matcher works against a single key space. `SECTIONS` drives the editor UI
 * grouping and `FIELD_CATALOG` describes every key once (label + input kind).
 */

export type FieldKind =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'number'
  | 'select';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Fixed option set for select-like values (category, gender, ...). */
  options?: string[];
  /** Marks values that should be masked in the editor. */
  sensitive?: boolean;
  placeholder?: string;
}

export interface SectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

const GENDER = ['Male', 'Female', 'Transgender'];
const CATEGORY = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const SECTIONS: SectionDef[] = [
  {
    id: 'personal',
    title: 'Personal',
    fields: [
      { key: 'personal.firstName', label: 'First name', kind: 'text' },
      { key: 'personal.middleName', label: 'Middle name', kind: 'text' },
      { key: 'personal.lastName', label: 'Last name', kind: 'text' },
      { key: 'personal.fullName', label: 'Full name', kind: 'text' },
      { key: 'personal.dob', label: 'Date of birth', kind: 'date' },
      { key: 'personal.gender', label: 'Gender', kind: 'select', options: GENDER },
      { key: 'personal.category', label: 'Category', kind: 'select', options: CATEGORY },
      { key: 'personal.nationality', label: 'Nationality', kind: 'text' },
      { key: 'personal.religion', label: 'Religion', kind: 'text' },
      { key: 'personal.maritalStatus', label: 'Marital status', kind: 'select', options: MARITAL },
      { key: 'personal.bloodGroup', label: 'Blood group', kind: 'select', options: BLOOD },
      { key: 'personal.identificationMark1', label: 'Identification mark 1', kind: 'text' },
      { key: 'personal.identificationMark2', label: 'Identification mark 2', kind: 'text' },
      { key: 'personal.nameChanged', label: 'Have you ever changed name', kind: 'select', options: ['Yes', 'No'] },
      { key: 'personal.isPwd', label: 'Person with Benchmark Disability (PwBD)', kind: 'select', options: ['Yes', 'No'] },
      { key: 'personal.isExServiceman', label: 'Ex-Serviceman status', kind: 'select', options: ['Yes', 'No'] },
      { key: 'personal.isMinority', label: 'Religious minority community', kind: 'select', options: ['Yes', 'No'] },
      { key: 'personal.isGovtEmployee', label: 'Serving in Govt / PSU / Bank', kind: 'select', options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'family',
    title: 'Family',
    fields: [
      { key: 'family.fatherName', label: "Father's name", kind: 'text' },
      { key: 'family.motherName', label: "Mother's name", kind: 'text' },
      { key: 'family.guardianName', label: "Guardian's name", kind: 'text' },
      { key: 'family.hasTwin', label: 'Twin / Triplet brother or sister', kind: 'select', options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { key: 'contact.email', label: 'Email', kind: 'email' },
      { key: 'contact.altEmail', label: 'Alternate email', kind: 'email' },
      { key: 'contact.mobile', label: 'Mobile', kind: 'tel' },
      { key: 'contact.altMobile', label: 'Alternate mobile', kind: 'tel' },
      { key: 'contact.mobileBelongsTo', label: 'Mobile number belongs to', kind: 'select', options: ['Self', 'Parents/Relatives'] },
    ],
  },
  {
    id: 'permanent',
    title: 'Permanent address',
    fields: [
      { key: 'address.permanent.line1', label: 'Address line 1', kind: 'text' },
      { key: 'address.permanent.line2', label: 'Address line 2', kind: 'text' },
      { key: 'address.permanent.city', label: 'City / Town / Village', kind: 'text' },
      { key: 'address.permanent.district', label: 'District', kind: 'text' },
      { key: 'address.permanent.state', label: 'State', kind: 'text' },
      { key: 'address.permanent.pincode', label: 'PIN code', kind: 'text' },
      { key: 'address.permanent.country', label: 'Country', kind: 'text' },
    ],
  },
  {
    id: 'correspondence',
    title: 'Correspondence address',
    fields: [
      { key: 'address.correspondence.sameAsPermanent', label: 'Same as permanent', kind: 'select', options: ['Yes', 'No'] },
      { key: 'address.correspondence.line1', label: 'Address line 1', kind: 'text' },
      { key: 'address.correspondence.line2', label: 'Address line 2', kind: 'text' },
      { key: 'address.correspondence.city', label: 'City / Town / Village', kind: 'text' },
      { key: 'address.correspondence.district', label: 'District', kind: 'text' },
      { key: 'address.correspondence.state', label: 'State', kind: 'text' },
      { key: 'address.correspondence.pincode', label: 'PIN code', kind: 'text' },
      { key: 'address.correspondence.country', label: 'Country', kind: 'text' },
      { key: 'address.gstInvoicingAddress', label: 'Address for GST Invoicing', kind: 'select', options: ['Correspondence Address', 'Permanent Address'] },
    ],
  },
  ...educationSection('tenth', '10th / Matriculation'),
  ...educationSection('twelfth', '12th / Intermediate'),
  ...educationSection('graduation', 'Graduation'),
  ...educationSection('postgrad', 'Post-graduation'),
  {
    id: 'ids',
    title: 'Identity documents',
    fields: [
      { key: 'ids.aadhaar', label: 'Aadhaar number', kind: 'text', sensitive: true },
      { key: 'ids.pan', label: 'PAN', kind: 'text', sensitive: true },
      { key: 'ids.voterId', label: 'Voter ID', kind: 'text', sensitive: true },
      { key: 'ids.drivingLicence', label: 'Driving licence', kind: 'text', sensitive: true },
      { key: 'ids.passport', label: 'Passport number', kind: 'text', sensitive: true },
    ],
  },
];

function educationSection(id: string, title: string): SectionDef[] {
  return [
    {
      id: `edu-${id}`,
      title,
      fields: [
        { key: `education.${id}.board`, label: 'Board / University', kind: 'text' },
        { key: `education.${id}.rollNo`, label: 'Roll number', kind: 'text' },
        { key: `education.${id}.passingYear`, label: 'Passing year', kind: 'number' },
        { key: `education.${id}.percentage`, label: 'Percentage', kind: 'number' },
        { key: `education.${id}.cgpa`, label: 'CGPA', kind: 'number' },
        { key: `education.${id}.subjectStream`, label: 'Subject / Stream', kind: 'text' },
      ],
    },
  ];
}

/** Flat lookup of every field definition by key. */
export const FIELD_CATALOG: Record<string, FieldDef> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]),
);

export const ALL_KEYS: string[] = Object.keys(FIELD_CATALOG);

export type ProfileData = Record<string, string>;

export interface StoredProfile {
  v: number;
  data: ProfileData;
}

export const PROFILE_VERSION = 1;

export function emptyProfile(): StoredProfile {
  return { v: PROFILE_VERSION, data: {} };
}

let customFieldsCallback: ((fields: FieldDef[]) => void) | null = null;
export function setCustomFieldsCallback(cb: (fields: FieldDef[]) => void): void {
  customFieldsCallback = cb;
}

export function registerCustomFields(customFields: FieldDef[]): void {
  const existingIdx = SECTIONS.findIndex((s) => s.id === 'custom');
  if (!customFields.length) {
    // Drop the section entirely when empty so the editor shows no stray header.
    if (existingIdx >= 0) SECTIONS.splice(existingIdx, 1);
  } else if (existingIdx >= 0) {
    SECTIONS[existingIdx].fields = customFields;
  } else {
    SECTIONS.push({ id: 'custom', title: 'Custom fields', fields: customFields });
  }

  // Rebuild catalog and keys in-place to preserve references
  const newCatalog = Object.fromEntries(
    SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]),
  );
  for (const k of Object.keys(FIELD_CATALOG)) {
    delete FIELD_CATALOG[k];
  }
  Object.assign(FIELD_CATALOG, newCatalog);

  ALL_KEYS.length = 0;
  ALL_KEYS.push(...Object.keys(FIELD_CATALOG));

  if (customFieldsCallback) {
    customFieldsCallback(customFields);
  }
}

