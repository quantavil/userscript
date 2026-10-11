/**
 * Synonym dictionary: maps each profile key to phrases that commonly label it
 * on forms — English plus transliterated Hindi terms seen on Indian gov portals.
 * The matcher scores a field's tokens against these.
 */
export const SYNONYMS: Record<string, string[]> = {
  'personal.firstName': ['first name', 'given name', 'fname', 'pratham naam'],
  'personal.middleName': ['middle name', 'mname'],
  'personal.lastName': ['last name', 'surname', 'family name', 'lname', 'upnaam'],
  // NOTE: no bare "your name" here — it false-positives on questions like
  // "Have you ever changed your name?".
  'personal.fullName': ["candidate name", 'full name', 'applicant name', 'name of candidate', 'naam', 'name of applicant', 'student name'],
  'personal.dob': ['date of birth', 'dob', 'birth date', 'birthdate', 'janm tithi', 'date birth'],
  'personal.gender': ['gender', 'sex', 'ling'],
  'personal.category': ['category', 'caste category', 'social category', 'reservation category', 'varg', 'community'],
  'personal.nationality': ['nationality', 'citizenship', 'rashtriyata'],
  'personal.religion': ['religion', 'dharm'],
  'personal.maritalStatus': ['marital status', 'married', 'vaivahik'],
  'personal.bloodGroup': ['blood group', 'blood', 'rakt samuh'],
  'personal.identificationMark1': ['identification mark', 'visible mark', 'pehchan chinh', 'identification mark 1'],
  'personal.identificationMark2': ['identification mark 2', 'second identification mark'],
  'personal.nameChanged': ['have you ever changed your name', 'ever changed your name', 'changed your name', 'name change', 'changed name', 'namechanged'],
  'personal.isPwd': ['person with benchmark disability', 'person with disability', 'pwbd', 'pwd', 'benchmark disability', 'differently abled', 'handicapped', 'disabled', 'disability of 40'],
  'personal.isExServiceman': ['ex serviceman', 'ex servicemen', 'esm', 'are you an ex serviceman', 'ex service'],
  'personal.isMinority': ['religious minority', 'minority community', 'religious minority community', 'minority'],
  'personal.isGovtEmployee': ['serving in govt', 'govt employee', 'public sector undertakings', 'serving in govt quasi govt', 'psu employee', 'bank employee'],

  'family.fatherName': ["father name", "father's name", 'fathers name', 'pita ka naam', 'pita name', "father husband name"],
  'family.motherName': ["mother name", "mother's name", 'mothers name', 'mata ka naam', 'mata name'],
  'family.guardianName': ['guardian name', "guardian's name", 'sanrakshak'],
  'family.hasTwin': ['twin', 'triplet', 'twin brother sister', 'quadruplet', 'twin triplet quadruplet'],

  'contact.email': ['email', 'e mail', 'email address', 'email id', 'e mail id'],
  'contact.altEmail': ['alternate email', 'alternative email', 'secondary email'],
  'contact.mobile': ['mobile', 'mobile number', 'phone', 'phone number', 'contact number', 'cell', 'mobile no', 'contact no'],
  'contact.altMobile': ['alternate mobile', 'alternative mobile', 'secondary mobile', 'landline', 'alternate number', 'alternative number', 'alternate contact number'],
  'contact.mobileBelongsTo': ['mobile number belongs to', 'mobile belongs to', 'confirm that the mobile number belongs to', 'phone belongs to'],

  'address.permanent.line1': ['permanent address', 'address line 1', 'address line', 'permanent address line 1', 'house no', 'street', 'address'],
  'address.permanent.line2': ['permanent address line 2', 'address line 2', 'locality', 'area'],
  'address.permanent.city': ['city', 'town', 'village', 'city town village', 'shahar'],
  'address.permanent.district': ['district', 'zila'],
  'address.permanent.state': ['state', 'rajya'],
  'address.permanent.pincode': ['pincode', 'pin code', 'postal code', 'zip', 'zip code', 'pin'],
  'address.permanent.country': ['country', 'desh'],

  'address.correspondence.sameAsPermanent': ['same as permanent', 'same as above'],
  'address.correspondence.line1': ['correspondence address', 'communication address', 'present address', 'mailing address', 'current address', 'correspondence address line 1'],
  'address.correspondence.line2': ['correspondence address line 2', 'communication address line 2'],
  'address.correspondence.city': ['correspondence city', 'communication city', 'present city'],
  'address.correspondence.district': ['correspondence district', 'communication district'],
  'address.correspondence.state': ['correspondence state', 'communication state', 'present state'],
  'address.correspondence.pincode': ['correspondence pincode', 'communication pincode', 'present pincode'],
  'address.correspondence.country': ['correspondence country', 'communication country'],
  'address.gstInvoicingAddress': ['address for gst invoicing', 'gst invoicing', 'gst address', 'invoicing address', 'choose the address for gst'],

  'ids.aadhaar': ['aadhaar', 'aadhar', 'aadhaar number', 'uid', 'uidai'],
  'ids.pan': ['pan', 'pan number', 'pan card', 'permanent account number'],
  'ids.voterId': ['voter id', 'epic', 'election card', 'voter card'],
  'ids.drivingLicence': ['driving licence', 'driving license', 'dl number', 'licence number'],
  'ids.passport': ['passport', 'passport number', 'passport no'],
};

function eduSyn(id: string, human: string): void {
  SYNONYMS[`education.${id}.board`] = [`${human} board`, `${human} university`, `${human} board university`];
  SYNONYMS[`education.${id}.rollNo`] = [`${human} roll number`, `${human} roll no`, `${human} registration number`];
  SYNONYMS[`education.${id}.passingYear`] = [`${human} passing year`, `${human} year of passing`, `${human} year`];
  SYNONYMS[`education.${id}.percentage`] = [`${human} percentage`, `${human} marks`, `${human} percent`, `${human} aggregate`];
  SYNONYMS[`education.${id}.cgpa`] = [`${human} cgpa`, `${human} gpa`, `${human} grade`];
  SYNONYMS[`education.${id}.subjectStream`] = [`${human} stream`, `${human} subject`, `${human} branch`, `${human} specialization`];
}

eduSyn('tenth', '10th');
SYNONYMS['education.tenth.board'].push('matriculation board', 'secondary board', 'ssc board', 'class 10 board');
eduSyn('twelfth', '12th');
SYNONYMS['education.twelfth.board'].push('intermediate board', 'higher secondary board', 'hsc board', 'class 12 board');
eduSyn('graduation', 'graduation');
SYNONYMS['education.graduation.board'].push('degree university', 'bachelor university', 'ug university');
eduSyn('postgrad', 'post graduation');
SYNONYMS['education.postgrad.board'].push('pg university', 'master university');

/** Indian states/UTs — used as an option-list signal for state fields. */
export const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir',
  'ladakh', 'puducherry', 'chandigarh',
];
