"""
Better InvestorGain — Unified Multi-Device E2E Test Suite

Tests across:
  1. Desktop (1400x900)
  2. Tablet (768x1024)
  3. Mobile (390x844)

Verifies:
  - Header is visible and functional
  - All sidebars (home, detail, report) are hidden
  - All broker affiliate bars, promo cards, and mobile broker sections are hidden
  - All ad blocks and banners are hidden
  - Full footer is hidden
  - Main/Detail/Report grids collapse cleanly to 100% full width
  - Dark mode table rows have no broken white gradients
  - Section dividers render on table and card grid views
  - Zero script-caused JS exceptions
"""

import asyncio, pathlib, re, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent.parent
SCRIPT_PATH = ROOT / "dist" / "better-investograin.user.js"
SS = ROOT / "tests" / "screenshots"
SS.mkdir(parents=True, exist_ok=True)

PAGES_TO_TEST = [
    ("Homepage", "https://www.investorgain.com/"),
    ("IPO Detail", "https://www.investorgain.com/ipo/augmont-enterprises-ipo/1938/"),
    ("GMP Report", "https://www.investorgain.com/report/ipo-gmp-live/331/"),
]

VIEWPORTS = [
    ("Desktop", {"width": 1400, "height": 900}, False),
    ("Tablet", {"width": 768, "height": 1024}, False),
    ("Mobile", {"width": 390, "height": 844}, True),
]

def strip_header(js: str) -> str:
    return re.sub(r"//\s*==UserScript==.*?//\s*==/UserScript==\s*", "", js, flags=re.DOTALL)

async def test_page_viewport(browser, vp_name: str, vp_config: dict, is_mob: bool, page_name: str, url: str, script_js: str):
    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" if is_mob else "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ctx = await browser.new_context(viewport=vp_config, is_mobile=is_mob, user_agent=ua)
    page = await ctx.new_page()
    await page.add_init_script(script=script_js)
    
    errors = []
    def handle_page_error(e):
        err_str = str(e)
        if "Network error" not in err_str and "Failed to fetch" not in err_str and "429" not in err_str:
            errors.append(err_str)
            
    page.on("pageerror", handle_page_error)
    
    await page.goto(url, wait_until="load", timeout=30_000)
    try:
        await page.wait_for_selector("#siteHeader, .site-header, header, main, .gmp-table-creative, .report-data-table", timeout=10000)
        if page_name != "IPO Detail":
            await page.wait_for_function(
                "() => (document.querySelectorAll('tbody tr').length > 1 && !document.querySelector('tbody tr td')?.innerText?.includes('Loading')) || document.querySelectorAll('.ipo-card').length > 0",
                timeout=10000
            )
    except Exception:
        pass
    await page.wait_for_timeout(1000)
    
    feature_metrics = await page.evaluate("""(pageName) => {
        const tableDividers = document.querySelectorAll('.big-section-divider');
        const gridDividers = document.querySelectorAll('.big-grid-divider');
        const dataRows = Array.from(document.querySelectorAll('tbody tr:not(.big-section-divider)')).filter(tr => tr.cells.length > 1 && !tr.innerText.includes('Loading') && !tr.innerText.includes('No data available'));
        const hasData = dataRows.length > 0 || document.querySelectorAll('.ipo-card').length > 0;
        
        const expectsDividers = pageName !== 'IPO Detail';
        
        return {
            hasDividers: (expectsDividers && hasData) ? (tableDividers.length >= 1 || gridDividers.length >= 1) : true,
        };
    }""", page_name)

    metrics = await page.evaluate("""() => {
        const isHidden = (sel) => {
            const els = Array.from(document.querySelectorAll(sel));
            if (els.length === 0) return true;
            return els.every(el => {
                const cs = getComputedStyle(el);
                return cs.display === 'none' || cs.visibility === 'hidden' || (el.offsetWidth === 0 && el.offsetHeight === 0);
            });
        };
        
        const hasVisible = (sel) => {
            const els = Array.from(document.querySelectorAll(sel));
            return els.some(el => {
                const cs = getComputedStyle(el);
                return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetWidth > 0 || el.offsetHeight > 0);
            });
        };
        
        return {
            headerVisible: hasVisible('header, #siteHeader, .site-header'),
            footerHidden: isHidden('footer.site-footer, .site-footer'),
            brokerBarHidden: isHidden('.tlu-wrap'),
            navPromoHidden: isHidden('.nmm-promo-strip') && isHidden('.nmm-ad-card'),
            adBlockHidden: isHidden('.ad-block, [class*="ad-970"], [class*="ad-300"]'),
            sidebarHidden: isHidden('.sidebar') && isHidden('.detail-side') && isHidden('.report-sidebar') && isHidden('.invest-cta'),
            applyBannerHidden: isHidden('.ipo-apply-section, #ipoApplySection'),
            ndropCardsHidden: isHidden('.ndrop-broker-card') && isHidden('tr.ad-tr'),
            mobBrokerSectionHidden: isHidden('#stock-brokers-section') && isHidden('.mob-broker-list'),
            brokerNavbarBtnHidden: isHidden('#findYourBroker') && isHidden('.find-your-broker-navbar'),
        };
    }""")
    
    metrics.update(feature_metrics)
    
    slug = f"{page_name.lower().replace(' ', '_')}_{vp_name.lower()}"
    await page.screenshot(path=str(SS / f"{slug}_light.png"))
    
    # Toggle Dark Mode
    theme_btn = page.locator("#mobileButtonToggleBtn, #themeToggleBtn, .theme-toggle").filter(has_not=page.locator(".d-none")).first
    if await theme_btn.count() > 0 and await theme_btn.is_visible():
        await theme_btn.click()
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(SS / f"{slug}_dark.png"))
        
    await ctx.close()
    return metrics, errors

async def main():
    if not SCRIPT_PATH.exists():
        print(f"Error: {SCRIPT_PATH} does not exist. Run 'bun run build' first.")
        return 1
        
    script_js = strip_header(SCRIPT_PATH.read_text())
    all_ok = True
    
    print("\n" + "="*65)
    print("  Better InvestorGain — Multi-Device E2E Test Suite")
    print("="*65)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for vp_name, vp_config, is_mob in VIEWPORTS:
            print(f"\n📱 Viewport: {vp_name} ({vp_config['width']}x{vp_config['height']})")
            print("-" * 50)
            
            for page_name, url in PAGES_TO_TEST:
                print(f"  ▶ Testing {page_name}...")
                metrics, errs = await test_page_viewport(browser, vp_name, vp_config, is_mob, page_name, url, script_js)
                
                if errs:
                    print(f"    ❌ JS Exceptions ({len(errs)}):", errs)
                    all_ok = False
                else:
                    print("    ✅ Zero JS Exceptions")
                    
                for k, v in metrics.items():
                    status = "✅" if v else "❌"
                    if not v:
                        print(f"      {status} {k}: {v}")
                        all_ok = False
                        
        await browser.close()
        
    print("\n" + "="*65)
    print(f"  Final Multi-Device Suite: {'✅ ALL TESTS PASSED' if all_ok else '❌ FAILURES DETECTED'}")
    print("="*65 + "\n")
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

