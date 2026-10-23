from pathlib import Path

from playwright.sync_api import FrameLocator, Page, expect


def check_ring_modes(page: Page, panel: FrameLocator, output: Path):
    page.evaluate(
        "sessionStorage.setItem('preferences', JSON.stringify({compactMode:true,quotaDisplay:'remaining'}))"
    )
    page.goto("http://127.0.0.1:58742/harness?surface=status")
    expect(panel.locator(".quota-list")).to_have_attribute("data-density", "medium")
    expect(panel.locator(".compact-account")).to_have_count(2)
    request_count = page.evaluate("window.requests.length")
    panel.get_by_role("tab", name="紧凑", exact=True).click()
    expect(panel.locator(".quota-ring")).to_have_count(2)
    expect(panel.locator(".ring-value")).to_have_text("63.6%")
    panel.get_by_role("button", name="剩余", exact=True).click()
    expect(panel.locator(".ring-value")).to_have_text("36.4%")
    assert (
        panel.locator(".quota-ring").first.evaluate(
            '(el) => el.style.getPropertyValue("--value")'
        )
        == "36.4"
    )
    page.wait_for_function('window.stored.quotaDisplay === "used"')
    panel.get_by_role("button", name="已用", exact=True).click()
    expect(panel.locator(".ring-value")).to_have_text("63.6%")
    expect(panel.locator('.quota-ring[data-tone="unknown"]')).to_have_count(1)
    expect(panel.locator(".quota-display")).to_have_count(0)
    assert page.evaluate("window.requests.length") == request_count
    assert panel.locator("#app").evaluate(
        '(el) => !el.innerHTML.includes("demo@example.invalid")'
    )
    before = panel.locator(".ring-account").first.bounding_box()["height"]
    panel.get_by_role("switch", name="显示账户名", exact=True).click()
    expect(panel.locator(".ring-heading .account-inline")).to_have_text(
        "demo@example.invalid"
    )
    assert panel.locator(".ring-account").first.bounding_box()["height"] == before
    assert panel.locator(".ring-heading").first.evaluate(
        '(el) => {const n=el.querySelector(".ring-name-text").getBoundingClientRect();const u=el.querySelector(".account-inline").getBoundingClientRect();return Math.abs(n.top-u.top)<5;}'
    )
    panel.get_by_role("switch", name="显示账户名", exact=True).click()
    panel.locator(".ring-summary").first.focus()
    page.keyboard.press("Enter")
    expect(panel.locator(".ring-detail").first).to_be_visible()
    expect(panel.locator(".ring-detail").first).to_contain_text("后重置")
    panel.get_by_role("button", name="刷新", exact=True).click()
    expect(panel.get_by_role("button", name="刷新", exact=True)).to_be_enabled()
    expect(panel.locator(".ring-detail").first).to_be_visible()
    panel.locator(".ring-summary").first.click()
    expect(panel.locator(".ring-detail").first).not_to_be_visible()
    page.reload()
    expect(panel.locator(".quota-list")).to_have_attribute("data-density", "compact")
    expect(panel.locator(".ring-value")).to_have_text("63.6%")
    page.set_viewport_size({"width": 380, "height": 1100})
    panel.locator("#app").screenshot(path=str(output / "magpie-rings-light.png"))
    page.evaluate("window.setDark()")
    expect(panel.locator("html")).to_have_attribute("data-oc-theme", "dark")
    panel.locator("#app").screenshot(path=str(output / "magpie-rings-dark.png"))
    page.evaluate("window.fail=true")
    panel.get_by_role("button", name="刷新", exact=True).click()
    expect(panel.get_by_text("额度读取失败", exact=True)).to_be_visible()
    expect(panel.locator(".quota-ring")).to_have_count(2)
    page.evaluate("window.fail=false")
    panel.get_by_role("button", name="刷新", exact=True).click()
    expect(panel.get_by_text("额度读取失败", exact=True)).to_have_count(0)
    for locale, label in [
        ("en-US", "Compact"),
        ("zh-Hant-HK", "精簡"),
        ("ja-JP", "コンパクト"),
    ]:
        page.evaluate("(locale) => window.setLocale(locale)", locale)
        expect(panel.get_by_role("tab", name=label, exact=True)).to_have_attribute(
            "aria-selected", "true"
        )
        expect(panel.locator(".ring-value")).to_have_text("63.6%")
    check_no_main_page(page, panel)
    page.goto("http://127.0.0.1:58742/harness")
    expect(panel.locator(".quota-list")).to_have_attribute("data-density", "compact")
    expect(panel.locator(".metric-value")).to_have_count(4)
    expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
    check_layouts(page, panel, output)
    check_many_accounts(page, panel, output)
    check_localized_controls(page, panel, output)


def check_no_main_page(page: Page, panel: FrameLocator):
    for mode in ["comfortable", "medium", "compact"]:
        page.evaluate(
            '(mode) => sessionStorage.setItem("preferences", JSON.stringify({displayMode:mode}))',
            mode,
        )
        page.goto("http://127.0.0.1:58742/harness?surface=page")
        page.wait_for_load_state("networkidle")
        expect(panel.locator("#app")).to_be_empty()
        assert page.evaluate("window.requests.length") == 0
    page.evaluate(
        'sessionStorage.setItem("preferences", JSON.stringify({displayMode:"compact"}))'
    )


def check_layouts(page: Page, panel: FrameLocator, output: Path):
    request_count = page.evaluate("window.requests.length")
    for width in [280, 380, 900]:
        page.set_viewport_size({"width": width, "height": 1200})
        positions = []
        baseline = panel.locator(".expanded").evaluate(
            '(el) => ({html:el.innerHTML, width:el.getBoundingClientRect().width, height:el.getBoundingClientRect().height, styles:[el,...el.querySelectorAll("*")].map(n => {const s=getComputedStyle(n);return [s.display,s.fontSize,s.padding,s.margin,s.color];})})'
        )
        for mode in ["宽松", "中等", "紧凑"]:
            panel.get_by_role("tab", name=mode, exact=True).click()
            expect(panel.get_by_role("tab", name=mode, exact=True)).to_be_focused()
            positions.append(
                panel.locator(".topline").evaluate(
                    "(el) => el.getBoundingClientRect().x"
                )
            )
            assert panel.locator("body").evaluate(
                "(el) => el.scrollWidth <= innerWidth"
            )
            assert panel.locator("#app").evaluate(
                '(el) => el.lastElementChild.classList.contains("preferences")'
            )
            panel.get_by_role("button", name="剩余", exact=True).click()
            expect(panel.get_by_text("36.4%", exact=True)).to_be_visible()
            panel.get_by_role("button", name="已用", exact=True).click()
            expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
            panel.get_by_role("switch", name="显示账户名", exact=True).click()
            actual = panel.locator(".expanded").evaluate(
                '(el) => ({html:el.innerHTML, width:el.getBoundingClientRect().width, height:el.getBoundingClientRect().height, styles:[el,...el.querySelectorAll("*")].map(n => {const s=getComputedStyle(n);return [s.display,s.fontSize,s.padding,s.margin,s.color];})})'
            )
            assert actual == baseline, f"Statistics changed in {mode} at {width}px"
            expect(panel.locator(".account-inline").first).to_be_visible()
            panel.get_by_role("switch", name="显示账户名", exact=True).click()
        assert len(set(positions)) == 1, positions
    assert page.evaluate("window.requests.length") == request_count
    page.set_viewport_size({"width": 380, "height": 1200})
    for mode, name in [("宽松", "relaxed"), ("中等", "medium"), ("紧凑", "compact")]:
        panel.get_by_role("tab", name=mode, exact=True).click()
        panel.locator("#app").screenshot(path=str(output / f"magpie-layout-{name}.png"))


def check_many_accounts(page: Page, panel: FrameLocator, output: Path):
    page.goto("http://127.0.0.1:58742/harness?surface=status&many")
    expect(panel.locator(".quota-ring")).to_have_count(7)
    expect(panel.locator(".ring-account")).to_have_count(7)
    expect(panel.locator(".ring-name-text").first).to_have_text("Codex 1")
    expect(panel.locator(".ring-name-text").nth(2)).to_have_text("Codex 2")
    expect(panel.locator(".ring-value").nth(1)).to_have_text("8.0%")
    expect(panel.locator(".quota-ring").nth(1)).to_have_attribute("data-tone", "error")
    assert panel.locator('.quota-ring[data-empty="true"] .ring-fill').evaluate_all(
        '(els) => els.every(el => getComputedStyle(el).display === "none")'
    )
    for width in [280, 380, 900]:
        page.set_viewport_size({"width": width, "height": 1200})
        for mode, selector in [
            ("宽松", ".quota"),
            ("中等", ".compact-account"),
            ("紧凑", ".ring-account"),
        ]:
            panel.get_by_role("tab", name=mode, exact=True).click()
            expect(panel.locator(selector)).to_have_count(7 if mode == "紧凑" else 6)
            assert panel.locator("body").evaluate(
                "(el) => el.scrollWidth <= innerWidth"
            )
            assert panel.locator("#app").evaluate("(el) => el.scrollHeight <= 320")
            assert panel.locator(".preferences").evaluate(
                "(el) => el.getBoundingClientRect().bottom <= 320"
            )
            expect(panel.get_by_role("tab", name=mode, exact=True)).to_be_focused()
    page.set_viewport_size({"width": 380, "height": 1200})
    panel.get_by_role("switch", name="显示账户名", exact=True).click()
    for mode, name in [("宽松", "relaxed"), ("中等", "medium"), ("紧凑", "compact")]:
        panel.get_by_role("tab", name=mode, exact=True).click()
        panel.locator(".quota-list").evaluate("(el) => el.scrollTop=0")
        panel.locator("#app").screenshot(path=str(output / f"magpie-many-{name}.png"))
    panel.locator(".ring-summary").first.click()
    expect(panel.locator(".ring-detail").first).to_be_visible()
    panel.get_by_role("tab", name="中等", exact=True).click()
    panel.get_by_role("tab", name="紧凑", exact=True).click()
    expect(panel.locator(".ring-detail").first).to_be_visible()
    page.goto("http://127.0.0.1:58742/harness?surface=status&empty")
    for mode in ["宽松", "中等", "紧凑"]:
        panel.get_by_role("tab", name=mode, exact=True).click()
        expect(panel.get_by_text("暂无额度数据", exact=True)).to_be_visible()
        assert panel.locator(".quota-list").evaluate(
            '(el) => getComputedStyle(el).display === "block"'
        )


def check_localized_controls(page: Page, panel: FrameLocator, output: Path):
    page.wait_for_function('window.stored.displayMode === "compact"')
    page.goto("http://127.0.0.1:58742/harness?surface=status&many")
    expect(panel.locator(".quota-ring")).to_have_count(7)
    for locale, modes, remaining, used in [
        ("en-US", ["Relaxed", "Medium", "Compact"], "Remaining", "Used"),
        ("zh-CN", ["宽松", "中等", "紧凑"], "剩余", "已用"),
        ("zh-Hant-HK", ["寬鬆", "中等", "精簡"], "剩餘", "已用"),
        ("ja-JP", ["ゆったり", "標準", "コンパクト"], "残り", "使用済み"),
    ]:
        page.evaluate("(locale) => window.setLocale(locale)", locale)
        for width in [280, 380, 900]:
            page.set_viewport_size({"width": width, "height": 1200})
            for mode in modes:
                panel.get_by_role("tab", name=mode, exact=True).click()
                panel.get_by_role("button", name=remaining, exact=True).click()
                expect(
                    panel.get_by_role("button", name=used, exact=True)
                ).to_be_focused()
                expect(panel.get_by_text("36.4%", exact=True)).to_be_visible()
                panel.get_by_role("button", name=used, exact=True).click()
                expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
                assert panel.locator("body").evaluate(
                    "(el) => el.scrollWidth <= innerWidth"
                )
                assert panel.locator(".header-actions").evaluate(
                    "(el) => el.getBoundingClientRect().right <= innerWidth"
                )
                height = panel.locator("#app").evaluate("(el) => el.scrollHeight")
                assert height <= 320, (locale, width, mode, height)
        if locale == "ja-JP":
            page.set_viewport_size({"width": 280, "height": 1200})
            panel.locator("#app").screenshot(path=str(output / "magpie-ja-narrow.png"))
    page.evaluate('window.setLocale("zh-CN")')
    page.set_viewport_size({"width": 380, "height": 1200})
    panel.locator("#app").screenshot(path=str(output / "magpie-release-status.png"))
    page.goto("http://127.0.0.1:58742/harness")
    expect(panel.locator(".metric-value")).to_have_count(4)
    panel.locator("#app").screenshot(path=str(output / "magpie-release-light.png"))
    page.evaluate("window.setDark()")
    expect(panel.locator("html")).to_have_attribute("data-oc-theme", "dark")
    panel.locator("#app").screenshot(path=str(output / "magpie-release-dark.png"))
