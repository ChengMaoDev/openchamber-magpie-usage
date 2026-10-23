from pathlib import Path

from playwright.sync_api import FrameLocator, Page, expect


def check_grouped_quotas(page: Page, panel: FrameLocator, output: Path):
    page.evaluate(
        'sessionStorage.setItem("preferences", JSON.stringify({displayMode:"compact",quotaDisplay:"remaining"}))'
    )
    page.goto("http://127.0.0.1:58742/harness?surface=status&grouped")
    expect(panel.locator(".quota-ring")).to_have_count(4)
    group = panel.locator('.ring-account[data-grouped="true"]').filter(
        has=panel.locator(".ring-name-text").get_by_text("Antigravity", exact=True)
    )
    studio = panel.locator('.ring-account[data-grouped="true"]').filter(
        has=panel.locator(".ring-name-text").get_by_text("Google AI Studio", exact=True)
    )
    expect(studio).to_have_count(1)
    expect(studio.locator(".ring-value")).to_have_text("100.0%")
    expect(studio.locator(".ring-group-count")).to_have_text("2 项额度")
    studio.focus()
    expect(panel.get_by_role("tooltip")).to_contain_text("代理出口")
    expect(panel.get_by_role("tooltip")).to_contain_text("管理页")
    page.keyboard.press("Escape")
    expect(group).to_have_count(1)
    expect(group.locator(".ring-value")).to_have_text("94.8%")
    expect(group.locator(".ring-window")).to_have_text("最低剩余")
    expect(group.locator(".ring-group-count")).to_have_text("4 项额度")
    expect(panel.locator(".ring-detail, details.ring-account")).to_have_count(0)
    requests = page.evaluate("window.requests.length")
    for width in [280, 380, 900]:
        page.set_viewport_size({"width": width, "height": 1000})
        assert panel.locator("body").evaluate("(el) => el.scrollWidth <= innerWidth")
        assert panel.locator("#app").evaluate("(el) => el.scrollHeight <= 320")
    page.set_viewport_size({"width": 380, "height": 1000})
    panel.locator("#app").screenshot(path=str(output / "magpie-grouped-collapsed.png"))
    layout_before = panel.locator(".quota-list").evaluate(
        "(el) => [...el.children].map(n => {const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})"
    )
    group.focus()
    page.keyboard.press("Enter")
    expect(panel.get_by_role("tooltip")).to_be_visible()
    expect(panel.get_by_role("tooltip")).to_contain_text("Gemini · 7 days")
    expect(panel.get_by_role("tooltip")).to_contain_text("Claude & GPT · 5 hours")
    expect(panel.get_by_role("tooltip")).to_contain_text("后重置")
    page.locator("iframe").evaluate('(el) => el.style.height = "240px"')
    panel.locator("body").evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    group.focus()
    page.keyboard.press("Escape")
    panel.get_by_role("button", name="刷新", exact=True).focus()
    group.focus()
    expect(panel.get_by_role("tooltip")).to_be_visible()
    assert panel.get_by_role("tooltip").evaluate(
        "(el) => { const r=el.getBoundingClientRect();return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }"
    )
    panel.get_by_role("tooltip").evaluate("(el) => el.scrollTop = el.scrollHeight")
    expect(panel.get_by_role("tooltip")).to_be_visible()
    page.keyboard.press("Escape")
    group.click()
    assert (
        panel.locator(".quota-list").evaluate(
            "(el) => [...el.children].map(n => {const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})"
        )
        == layout_before
    )
    panel.locator("#app").screenshot(path=str(output / "magpie-grouped-hover.png"))
    page.locator("iframe").evaluate('(el) => el.style.height = "1800px"')
    panel.get_by_role("button", name="剩余", exact=True).click()
    expect(group.locator(".ring-value")).to_have_text("5.2%")
    expect(group.locator(".ring-window")).to_have_text("最高已用")
    group.focus()
    expect(panel.get_by_role("tooltip")).to_contain_text("已用 5.2%")
    panel.get_by_role("button", name="已用", exact=True).click()
    panel.get_by_role("tab", name="中等", exact=True).click()
    expect(panel.locator(".compact-window")).to_have_count(8)
    panel.get_by_role("tab", name="宽松", exact=True).click()
    expect(panel.locator(".window")).to_have_count(8)
    panel.get_by_role("tab", name="紧凑", exact=True).click()
    expect(panel.locator(".ring-detail, details.ring-account")).to_have_count(0)
    assert page.evaluate("window.requests.length") == requests
    panel.get_by_role("button", name="刷新", exact=True).click()
    expect(panel.get_by_role("button", name="刷新", exact=True)).to_be_enabled()
    expect(panel.locator(".quota-ring")).to_have_count(4)
    for locale, label, count in [
        ("en-US", "Lowest left", "4 quotas"),
        ("zh-Hant-HK", "最低剩餘", "4 項額度"),
        ("ja-JP", "最少の残量", "4 件の上限"),
        ("zh-CN", "最低剩余", "4 项额度"),
    ]:
        page.evaluate("(locale) => window.setLocale(locale)", locale)
        expect(group.locator(".ring-window")).to_have_text(label)
        expect(group.locator(".ring-group-count")).to_have_text(count)
        group.focus()
        expect(panel.get_by_role("tooltip")).to_contain_text("Gemini · 7 days")
    panel.locator(".quota-list").evaluate("(el) => el.scrollTop=0")
    panel.get_by_role("button", name="刷新", exact=True).focus()
    page.mouse.move(0, 0)
    page.evaluate("window.setDark()")
    expect(panel.locator("html")).to_have_attribute("data-oc-theme", "dark")
    panel.locator("#app").screenshot(path=str(output / "magpie-grouped-dark.png"))
    page.goto("http://127.0.0.1:58742/harness?surface=status&grouped&partial")
    expect(group.locator(".ring-group-unknown")).to_have_text("1 项未知")
    expect(group.locator(".ring-value")).to_have_text("94.8%")
    page.goto("http://127.0.0.1:58742/harness?grouped")
    expect(panel.locator(".quota-ring")).to_have_count(4)
    expect(panel.locator(".metric-value")).to_have_count(4)
    group.click()
    expect(panel.locator(".ring-detail, details.ring-account")).to_have_count(0)
    expect(panel.get_by_role("tooltip")).to_contain_text("Claude & GPT · 7 days")
    assert panel.locator("body").evaluate("(el) => el.scrollWidth <= innerWidth")
