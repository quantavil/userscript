/** True inside an iframe. Image-grid captchas (reCAPTCHA, hCaptcha) render their challenge in one. */
export const IN_FRAME = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true; // cross-origin access to `top` threw: definitely framed
  }
})();
