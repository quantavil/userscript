import { describe, it, expect, beforeEach } from 'bun:test';
import { scan } from '../src/engine/scan';
import { describe as describeField } from '../src/engine/describe';
import { matchAll } from '../src/engine/match';
import { fillAll } from '../src/engine/fill';
import { registerCustomFields, ProfileData } from '../src/profile/schema';
import { renderProfileEditor } from '../src/ui/profileEditor';
import { TeachMode } from '../src/ui/teach';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('scan', () => {
  beforeEach(() => setBody(''));

  it('skips password, hidden, and captcha/OTP fields', () => {
    setBody(`
      <input name="email" type="email">
      <input name="pw" type="password">
      <input name="csrf" type="hidden">
      <input name="otp" placeholder="Enter OTP">
      <input name="captcha">
    `);
    const names = scan().map((u) => u.el.getAttribute('name'));
    expect(names).toContain('email');
    expect(names).not.toContain('pw');
    expect(names).not.toContain('csrf');
    expect(names).not.toContain('otp');
    expect(names).not.toContain('captcha');
  });

  it('groups radios by name', () => {
    setBody(`
      <label><input type="radio" name="g" value="Male">Male</label>
      <label><input type="radio" name="g" value="Female">Female</label>
    `);
    const units = scan();
    const radio = units.find((u) => u.type === 'radio');
    expect(radio?.group.length).toBe(2);
  });
});

describe('describe — table layout labels', () => {
  it('reads label from preceding table cell', () => {
    setBody(`<table><tr><td>Father's Name</td><td><input name="fn"></td></tr></table>`);
    const unit = scan()[0];
    const d = describeField(unit);
    expect(d.text).toContain('father');
  });
});

describe('fill — framework-safe + constraints', () => {
  it('fills text input and fires input/change events', async () => {
    setBody(`<label for="fn">Full Name</label><input id="fn" name="fn">`);
    const el = document.getElementById('fn') as HTMLInputElement;
    let inputFired = false, changeFired = false;
    el.addEventListener('input', () => (inputFired = true));
    el.addEventListener('change', () => (changeFired = true));

    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'personal.fullName': 'Ravi Sharma' }, { overwrite: false });

    expect(el.value).toBe('Ravi Sharma');
    expect(inputFired).toBe(true);
    expect(changeFired).toBe(true);
  });

  it('selects a matching option (OBC equivalence)', async () => {
    setBody(`
      <label for="c">Category</label>
      <select id="c" name="c">
        <option value="">Select</option>
        <option>General</option><option>OBC-NCL</option><option>SC</option>
      </select>`);
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'personal.category': 'OBC' }, { overwrite: false });
    expect((document.getElementById('c') as HTMLSelectElement).value).toBe('OBC-NCL');
  });

  it('skips values exceeding maxlength instead of truncating', async () => {
    setBody(`<label for="p">PIN Code</label><input id="p" name="p" maxlength="6">`);
    const matches = matchAll(scan().map(describeField), []);
    const results = await fillAll(matches, { 'address.permanent.pincode': '1234567' }, { overwrite: false });
    const el = document.getElementById('p') as HTMLInputElement;
    expect(el.value).toBe('');
    expect(results.find((r) => r.match.key === 'address.permanent.pincode')?.status).toBe('skipped');
  });

  it('strips +91 from mobile when maxlength is 10', async () => {
    setBody(`<label for="m">Mobile Number</label><input id="m" name="m" maxlength="10">`);
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'contact.mobile': '+91 98765 43210' }, { overwrite: false });
    expect((document.getElementById('m') as HTMLInputElement).value).toBe('9876543210');
  });

  it('waits for cascading child options before filling (state → district)', async () => {
    setBody(`
      <label for="s">State</label>
      <select id="s" name="s"><option value="">Select</option><option>Bihar</option><option>Delhi</option></select>
      <label for="d">District</label>
      <select id="d" name="d" disabled><option value="">Select</option></select>`);
    const s = document.getElementById('s') as HTMLSelectElement;
    const d = document.getElementById('d') as HTMLSelectElement;
    s.addEventListener('change', () => {
      setTimeout(() => {
        d.innerHTML = '<option value="">Select</option><option>Central</option><option>North</option>';
        d.disabled = false;
      }, 150);
    });
    // District maps to permanent district; parent state fills first, then we wait.
    const rules = [{ fingerprint: 'n:d', occurrence: 0, key: 'address.permanent.district', source: 'teach' as const, ts: 0 }];
    const matches = matchAll(scan().map(describeField), rules);
    await fillAll(matches, { 'address.permanent.state': 'Bihar', 'address.permanent.district': 'North' }, { overwrite: false });
    expect(s.value).toBe('Bihar');
    expect(d.value).toBe('North');
  });

  it('fills only local part of email in split-email layouts', async () => {
    setBody(`
      <label for="txtemail">Email ID  <sup class="error">*</sup></label>
      <div class="input-group">
          <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
          </div>
          <input class="form-control valid_error" id="txtemail" maxlength="29" size="12" name="txtemail" value="" autocomplete="off">

          <div class="input-group col pl-0">
              <div class="input-group-prepend">
                  <div class="input-group-text" style="background-color: #e9ecef; color: #495057;">@</div>
              </div>
              <select class="custom-select dynamic-valid-input" size="1" name="seldomain" id="seldomain">
                  <option value="" selected="selected">Domain Names</option>
                  <option value="gmail.com">gmail.com</option>
              </select>
          </div>
      </div>`);
    const em = document.getElementById('txtemail') as HTMLInputElement;
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'contact.email': 'karanrawat2q@gmail.com' }, { overwrite: false });
    expect(em.value).toBe('karanrawat2q');
  });

  it('fills nameChanged field', async () => {
    setBody(`
      <div>Have you ever changed your name?</div>
      <input type="radio" id="ny" name="namechange" value="Yes"><label for="ny">Yes</label>
      <input type="radio" id="nn" name="namechange" value="No"><label for="nn">No</label>
    `);
    const ny = document.getElementById('ny') as HTMLInputElement;
    const nn = document.getElementById('nn') as HTMLInputElement;
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'personal.nameChanged': 'No' }, { overwrite: false });
    expect(nn.checked).toBe(true);
    expect(ny.checked).toBe(false);
  });

  it('handles custom fields registration, UI rendering, collection, choices, and teach mode creation', async () => {
    // 1. Register a custom field with options (select kind)
    const customList = [
      { key: 'custom.my_aadhaar_vid', label: 'My Aadhaar VID', kind: 'text' as const },
      { key: 'custom.mobile_belongs', label: 'Mobile number belongs to', kind: 'select' as const, options: ['Self', 'Parents/Relatives'] }
    ];
    registerCustomFields(customList);

    // 2. Test filling select-kind custom field on radios
    setBody(`
      <label>I confirm that the mobile number belongs to</label>
      <input type="radio" value="Y" name="mobileno_agree" id="m1"><label for="m1">Self</label>
      <input type="radio" value="N" name="mobileno_agree" id="m2"><label for="m2">Parents/Relatives</label>
    `);
    const m1 = document.getElementById('m1') as HTMLInputElement;
    const m2 = document.getElementById('m2') as HTMLInputElement;

    // The synonym for custom.mobile_belongs is registered automatically
    const matches = matchAll(scan().map(describeField), []);
    expect(matches[0].key).toBe('custom.mobile_belongs');

    await fillAll(matches, { 'custom.mobile_belongs': 'Parents/Relatives' }, { overwrite: false });
    expect(m2.checked).toBe(true);

    // 3. Test UI collection and rendering
    const handle = renderProfileEditor({
      'custom.my_aadhaar_vid': '9999-8888-7777',
      'custom.mobile_belongs': 'Parents/Relatives',
      '_customFields': JSON.stringify(customList)
    }, () => {}, () => {});
    const collected = handle.collect();
    expect(collected['custom.my_aadhaar_vid']).toBe('9999-8888-7777');
    expect(collected['custom.mobile_belongs']).toBe('Parents/Relatives');
    expect(collected['_customFields']).toBe(JSON.stringify(customList));

    // 4. Test Teach Mode picker creation flow
    // Setup another field: a radio question "Are you married?"
    setBody(`
      <label>Are you married?</label>
      <input type="radio" value="Yes" name="mar" id="mar1"><label for="mar1">Yes</label>
      <input type="radio" value="No" name="mar" id="mar2" checked><label for="mar2">No</label>
    `);

    let savedProfile: ProfileData = { _customFields: '[]' };
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'open' });

    // We instantiate TeachMode
    const teach = new TeachMode(
      shadow,
      'test.com',
      () => savedProfile,
      (data) => { savedProfile = data; },
      () => {}
    );

    const descriptor = describeField(scan()[0]);
    // Trigger openPicker manually
    (teach as any).openPicker(descriptor, 0);

    // The picker should be added to the shadow root
    const picker = shadow.querySelector('.picker') as HTMLElement;
    expect(picker).toBeTruthy();

    // Verify type auto-detection: since it's radio, cType should default to 'select'
    const cType = picker.querySelector('select') as HTMLSelectElement;
    expect(cType.value).toBe('select');

    // Verify option auto-detection: since it's radio group, cOptions should have "Yes, No"
    const inputs = picker.querySelectorAll('input');
    // cLabel is index 1, cOptions is index 2 (search is index 0)
    const cLabel = inputs[1];
    const cOptions = inputs[2];
    expect(cOptions.value).toBe('Yes, No');

    // Fill label and click create
    cLabel.value = 'Are Married';

    const saveBtn = picker.querySelector('.btn.primary') as HTMLButtonElement;
    saveBtn.click();

    // Verify custom field created
    const parsedCustom = JSON.parse(savedProfile._customFields);
    expect(parsedCustom[0].key).toBe('custom.are_married');
    expect(parsedCustom[0].label).toBe('Are Married');
    expect(parsedCustom[0].kind).toBe('select');
    expect(parsedCustom[0].options).toEqual(['Yes', 'No']);

    // Verify auto-prefilled value from the checked radio input
    expect(savedProfile['custom.are_married']).toBe('No');
  });
});

describe('IBPS page integration', () => {
  beforeEach(() => setBody(''));

  it('handles the full IBPS basic-details form layout', async () => {
    setBody(`
      <form id="reg_frm" autocomplete="off">
        <!-- First Name + Confirm First Name -->
        <div class="form-group col-sm-6 col-md-6">
          <label for="fullname">First Name <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
            </div>
            <input class="form-control" id="fullname" maxlength="35" name="fullname" value="" autocomplete="off">
          </div>
        </div>
        <div class="form-group col-sm-6 col-md-6">
          <label for="cfullname">Confirm First Name <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
            </div>
            <input class="form-control" id="cfullname" maxlength="35" name="cfullname" value="" autocomplete="off">
          </div>
        </div>

        <!-- Middle Name -->
        <div class="form-group col-sm-6 col-md-6">
          <label for="middlename">Middle Name</label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
            </div>
            <input class="form-control" id="middlename" maxlength="35" name="middlename" value="" autocomplete="off">
          </div>
        </div>

        <!-- Last Name -->
        <div class="form-group col-sm-6 col-md-6">
          <label for="lastname">Last Name</label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
            </div>
            <input class="form-control" id="lastname" maxlength="35" name="lastname" value="" autocomplete="off">
          </div>
        </div>

        <!-- Full Name (readonly + disabled — MUST be skipped) -->
        <div class="form-group col-md-12">
          <label for="fmlname">Full Name (as per the 10th std., certificate/DOB proof)</label>
          <input class="form-control" id="fmlname" maxlength="105" name="fmlname" value="  " readonly disabled autocomplete="off">
        </div>

        <!-- Have you ever changed your name? -->
        <div class="form-group col-md-12">
          <label>Have you ever changed your name ?<sup class="error">*</sup></label>
          <div class="custom-control custom-radio custom-control-inline">
            <input type="radio" value="Y" name="namechange" id="namechange1" class="custom-control-input">
            <label class="custom-control-label" for="namechange1">Yes</label>
          </div>
          <div class="custom-control custom-radio custom-control-inline">
            <input type="radio" value="N" name="namechange" id="namechange2" class="custom-control-input">
            <label class="custom-control-label" for="namechange2">No</label>
          </div>
        </div>

        <!-- Updated names (hidden — must be skipped) -->
        <div class="form-group col-sm-6 col-md-6 hide" id="div_fullname_updated" style="display:none">
          <label for="fullname_updated">Updated First Name <sup class="error">*</sup></label>
          <input class="form-control" id="fullname_updated" maxlength="35" name="fullname_updated" value="" autocomplete="off">
        </div>

        <!-- Mobile Number with +91 prepend -->
        <div class="form-group col-sm-6 col-md-4">
          <label for="txtmobile">Mobile Number <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <div class="input-group-text">+91</div>
            </div>
            <input name="txtmobile" class="form-control" id="txtmobile" maxlength="10" value="" autocomplete="off">
          </div>
        </div>

        <!-- Confirm Mobile Number -->
        <div class="form-group col-sm-6 col-md-4">
          <label for="txtcmobile">Confirm Mobile Number <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <div class="input-group-text">+91</div>
            </div>
            <input name="txtcmobile" class="form-control" id="txtcmobile" maxlength="10" value="" autocomplete="off">
          </div>
        </div>

        <!-- Split Email: input + @ + domain select in nested input-groups -->
        <div class="form-group col-sm-6 col-md-8 mailid_details">
          <label for="txtemail">Email ID  <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
            </div>
            <input class="form-control" id="txtemail" maxlength="29" name="txtemail" value="" autocomplete="off">
            <div class="input-group col pl-0">
              <div class="input-group-prepend">
                <div class="input-group-text" style="background-color: #e9ecef;">@</div>
              </div>
              <select class="custom-select" name="seldomain" id="seldomain">
                <option value="" selected>Domain Names</option>
                <option value="gmail.com">gmail.com</option>
                <option value="yahoo.com">yahoo.com</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Confirm Email (full address, NO split) -->
        <div class="form-group col-sm-6 col-md-4">
          <label for="txtcemail">Confirm Email ID <sup class="error">*</sup></label>
          <div class="input-group">
            <div class="input-group-prepend">
              <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
            </div>
            <input class="form-control" id="txtcemail" maxlength="60" name="txtcemail" value="" autocomplete="off">
          </div>
        </div>

        <!-- Security Code (captcha — MUST be skipped) -->
        <div class="form-group security col-md-12">
          <label for="txtCode">Security Code <sup class="error">*</sup></label>
          <div class="row">
            <div class="col-auto">
              <div class="input-group">
                <input name="txtCode" type="text" id="txtCode" class="form-control" autocomplete="off">
              </div>
              <small class="form-text text-muted">Enter the Word in the textbox as in the image</small>
            </div>
          </div>
        </div>
      </form>
    `);

    const profile = {
      'personal.firstName': 'Karan',
      'personal.middleName': '',
      'personal.lastName': 'Rawat',
      'personal.nameChanged': 'No',
      'contact.mobile': '+91 98765 43210',
      'contact.email': 'karanrawat2q@gmail.com',
    };

    const units = scan();
    const descriptors = units.map(describeField);

    // 1. Verify readonly/disabled fmlname is NOT scanned.
    const fmlScanned = units.find(u => (u.el as HTMLInputElement).id === 'fmlname');
    expect(fmlScanned).toBeUndefined();

    // 2. Verify hidden updated-name fields are NOT scanned.
    const updScanned = units.find(u => (u.el as HTMLInputElement).id === 'fullname_updated');
    expect(updScanned).toBeUndefined();

    // 3. Verify Security Code (captcha) is excluded.
    const matches = matchAll(descriptors.filter(d => {
      // Inline isCaptchaLike check to match main.ts pipeline
      return !/captcha|\botp\b|one time password|verification code|security code|word in the textbox|as in the image|image code/.test(d.text);
    }), []);
    const captchaMatch = matches.find(m => m.descriptor.name === 'txtCode');
    expect(captchaMatch).toBeUndefined();

    // 4. Fill all fields.
    const results = await fillAll(matches, profile, { overwrite: false });

    // 5. Verify split-email: txtemail gets only local part.
    const emailEl = document.getElementById('txtemail') as HTMLInputElement;
    expect(emailEl.value).toBe('karanrawat2q');

    // 6. Verify confirm email gets full address (no adjacent @).
    const cEmailEl = document.getElementById('txtcemail') as HTMLInputElement;
    const cEmailResult = results.find(r => r.match.descriptor.name === 'txtcemail');
    // Confirm email should map to contact.email and fill the FULL address.
    expect(cEmailResult?.status).toBe('filled');
    expect(cEmailEl.value).toBe('karanrawat2q@gmail.com');

    // 7. Verify mobile strips +91 (maxlength=10).
    const mobileEl = document.getElementById('txtmobile') as HTMLInputElement;
    expect(mobileEl.value).toBe('9876543210');

    // 8. Verify First Name fills.
    expect((document.getElementById('fullname') as HTMLInputElement).value).toBe('Karan');

    // 9. Verify Confirm First Name also fills to the same value.
    const cFullname = document.getElementById('cfullname') as HTMLInputElement;
    const cFullResult = results.find(r => r.match.descriptor.name === 'cfullname');
    expect(cFullResult?.status).toBe('filled');
    expect(cFullname.value).toBe('Karan');

    // 10. Verify nameChanged radio selects "No".
    const nc2 = document.getElementById('namechange2') as HTMLInputElement;
    expect(nc2.checked).toBe(true);
  });

  it('fills split email domain select', async () => {
    setBody(`
      <label for="txtemail">Email ID</label>
      <input id="txtemail" name="txtemail">
      <span>@</span>
      <select id="seldomain" name="seldomain">
        <option value="">Domain</option>
        <option value="gmail.com">gmail.com</option>
        <option value="yahoo.com">yahoo.com</option>
      </select>
    `);
    const matches = matchAll(scan().map(describeField), []);
    const domainMatch = matches.find(m => m.descriptor.name === 'seldomain');
    expect(domainMatch?.key).toBe('contact.email');

    await fillAll(matches, { 'contact.email': 'karanrawat2q@gmail.com' }, { overwrite: false });
    expect((document.getElementById('txtemail') as HTMLInputElement).value).toBe('karanrawat2q');
    expect((document.getElementById('seldomain') as HTMLSelectElement).value).toBe('gmail.com');
  });

  it('fills split DOB day/month/year selects', async () => {
    setBody(`
      <label>Date of Birth</label>
      <select id="dob_d" name="dob_d">
        <option value="">Day</option>
        ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
      </select>
      <select id="dob_m" name="dob_m">
        <option value="">Month</option>
        <option value="1">Jan</option>
        <option value="2">Feb</option>
        <option value="3">Mar</option>
        <option value="4">Apr</option>
        <option value="5">May</option>
      </select>
      <select id="dob_y" name="dob_y">
        <option value="">Year</option>
        <option value="1995">1995</option>
        <option value="1996">1996</option>
      </select>
    `);
    const matches = matchAll(scan().map(describeField), []);
    
    const dMatch = matches.find(m => m.descriptor.name === 'dob_d');
    const mMatch = matches.find(m => m.descriptor.name === 'dob_m');
    const yMatch = matches.find(m => m.descriptor.name === 'dob_y');
    expect(dMatch?.key).toBe('personal.dob');
    expect(mMatch?.key).toBe('personal.dob');
    expect(yMatch?.key).toBe('personal.dob');

    await fillAll(matches, { 'personal.dob': '1995-05-24' }, { overwrite: false });
    expect((document.getElementById('dob_d') as HTMLSelectElement).value).toBe('24');
    expect((document.getElementById('dob_m') as HTMLSelectElement).value).toBe('5');
    expect((document.getElementById('dob_y') as HTMLSelectElement).value).toBe('1995');
  });
});

