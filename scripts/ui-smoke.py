"""Exercise the bundled panel through the real SDK postMessage protocol."""

import importlib.util
import json
import tempfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

mode_spec = importlib.util.spec_from_file_location(
    "ui_modes", Path(__file__).with_name("ui-modes.py")
)
if mode_spec is None or mode_spec.loader is None:
    raise RuntimeError("Cannot load display mode browser checks")
mode_checks = importlib.util.module_from_spec(mode_spec)
mode_spec.loader.exec_module(mode_checks)

HARNESS = r"""<!doctype html><html><head><meta charset="UTF-8"></head><body style="margin:0">
<script>
window.requests = [];
window.fail = false;
window.stored = JSON.parse(sessionStorage.getItem('preferences') || '{}');
const tokens = {
  background:'#fdfcfa', elevated:'#f3f2f0', foreground:'#44443d', muted:'#696960',
  subtle:'#e9e8e5', border:'#d9d8d1', hover:'#eeede9', selection:'#f4e4d8',
  focus:'#b35017', primary:'#b35017', mutedSurface:'#f3f2f0', elevatedForeground:'#44443d',
  active:'#e4e1da', selectionForeground:'#44443d', primaryForeground:'#fff',
  primaryText:'#a14612', successText:'#517734', warningText:'#886914', errorText:'#b7493f',
  infoText:'#326f9b', success:'#517734', warning:'#886914', error:'#b7493f', info:'#326f9b',
  font:'-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono:'ui-monospace, monospace', radius:'.5625rem'
};
window.context = {
  theme:{mode:'light', tokens}, locale:new URLSearchParams(location.search).get('locale') || 'zh-CN', directory:null, session:null,
  surface:new URLSearchParams(location.search).get('surface') || 'panel',
  connection:{connected:false, account:''}, settings:{}, item:null
};
const envelope = {channel:'openchamber.sdk', v:1};
window.setLocale = locale => {
  window.context.locale=locale;
  document.querySelector('iframe').contentWindow.postMessage({...envelope,type:'ready',payload:window.context},'*');
};
window.setDark = () => {
  window.context.theme.mode='dark';
  Object.assign(window.context.theme.tokens, {background:'#1c1c1a',foreground:'#eeeee9',muted:'#aaa99f',mutedSurface:'#282825',border:'#45453e',hover:'#34342f',elevated:'#282825',elevatedForeground:'#eeeee9',primary:'#e6a16b',primaryText:'#e6a16b',primaryForeground:'#1c1c1a',selection:'#46372b',selectionForeground:'#eeeee9'});
  document.querySelector('iframe').contentWindow.postMessage({...envelope,type:'ready',payload:window.context},'*');
};
const counters = {calls:48,input:24000,output:6400,cache_read:92000,cache_write:4800,cost:1.23,unpriced:2};
const quotas = {data:[
  {provider:'codex',name:'Codex',user:'demo@example.invalid',plan:'Pro',last:true,
   readAt:new Date().toISOString(),windows:[{name:'7 days',used:36.4,remaining:63.6,
   resetsAt:new Date(Date.now()+40*3600000).toISOString()}]},
  {provider:'custom',name:'自定义服务',windows:[{name:'Credits',display:'余额待供应商提供'}]}
]};
if(new URLSearchParams(location.search).has('many')) quotas.data = [
  {...quotas.data[0], windows:[...quotas.data[0].windows, {name:'5 hours',remaining:8}]},
  {provider:'codex',name:'Codex',user:'second@example.invalid',windows:[{name:'7 days',used:100}]},
  {provider:'gateway',name:'很长的自定义网关名称用于检查窄面板',windows:[{name:'Weekly quota with a long model name',used:0}]},
  {provider:'unknown',name:'Unknown',windows:[]},
  {provider:'error',name:'Gateway',error:'无法获取额度，请在 Magpie 中重新连接账户',windows:[]},
  {provider:'balance',name:'Balance',balance:'$12.34',windows:[]},
];
if(new URLSearchParams(location.search).has('empty')) quotas.data = [];
window.addEventListener('message', async event => {
  const m = event.data;
  if(m.channel !== envelope.channel) return;
  const reply = payload => event.source.postMessage({...envelope,type:'result',id:m.id,ok:true,payload},'*');
  if(m.type === 'hello') event.source.postMessage({...envelope,type:'ready',payload:window.context},'*');
  else if(m.type === 'storage') {
    if(m.payload.op === 'get') reply({storage:true,op:'get',found:m.payload.key in window.stored,value:window.stored[m.payload.key]});
    if(m.payload.op === 'set') { window.stored[m.payload.key]=m.payload.value; sessionStorage.setItem('preferences',JSON.stringify(window.stored)); reply({storage:true,op:'set'}); }
  } else if(m.type === 'service-request') {
    window.requests.push(m.payload);
    if(window.fail) return reply({status:502,body:JSON.stringify({code:'unreachable'})});
    const period = m.payload.query?.period || 'today';
    const body = m.payload.path === '/quotas' ? quotas : {
      ...counters, calls:period === 'week' ? 336 : 48, period, since:'2026-10-22T00:00:00Z',
      agents:[{id:'opencode',name:'OpenCode',...counters}],
      models:[{id:'demo/model',name:'演示模型',...counters}]
    };
    reply({status:200,body:JSON.stringify(body)});
  } else if(m.id) reply({});
});
</script>
<iframe title="Magpie 用量" src="/panel/index.html" sandbox="allow-scripts" style="border:0;width:100%;height:1800px"></iframe>
</body></html>"""


def main():
    output = Path(tempfile.gettempdir()) / "opencode"
    output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 380, "height": 1100})
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route(
            "**/harness*",
            lambda route: route.fulfill(body=HARNESS, content_type="text/html"),
        )
        page.goto("http://127.0.0.1:58742/harness")
        page.wait_for_load_state("networkidle")
        panel = page.frame_locator("iframe")
        expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
        expect(panel.get_by_text("额度未知", exact=True)).to_be_visible()
        expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
        assert panel.locator(".quota").evaluate_all(
            '(cards) => cards.every(card => { const s = getComputedStyle(card); return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].every(width => width === "1px"); })'
        )
        expect(panel.get_by_text("demo@example.invalid", exact=True)).to_have_count(0)
        panel.get_by_role("switch", name="显示账户名", exact=True).click()
        expect(panel.get_by_text("demo@example.invalid", exact=True)).to_be_visible()
        panel.get_by_role("switch", name="显示账户名", exact=True).click()
        expect(panel.locator(".oc-sdk-progress-label")).not_to_be_visible()
        normal_height = panel.locator("#app").evaluate(
            "(el) => el.getBoundingClientRect().height"
        )
        requests_before_density = page.evaluate("window.requests.length")
        panel.get_by_role("tab", name="中等", exact=True).click()
        expect(panel.locator(".quota-list")).to_have_attribute("data-density", "medium")
        assert (
            panel.locator("#app").evaluate("(el) => el.getBoundingClientRect().height")
            < normal_height
        )
        assert page.evaluate("window.requests.length") == requests_before_density
        assert page.evaluate("window.stored.displayMode") == "medium"
        expect(panel.locator(".quota")).to_have_count(0)
        expect(panel.locator(".compact-account")).to_have_count(2)
        assert panel.locator(".quota-list").evaluate(
            '(el) => { const s = getComputedStyle(el); return s.borderTopWidth === "1px" && s.borderBottomWidth === "1px"; }'
        )
        expect(panel.locator(".metric-value")).to_have_count(4)
        assert panel.locator("#app").evaluate(
            '(el) => el.lastElementChild.classList.contains("preferences")'
        )
        expect(panel.get_by_text("读取时间", exact=True)).to_have_count(0)
        expect(panel.get_by_text("额度读取于", exact=False)).to_have_count(0)
        expect(panel.locator(".status")).to_contain_text("已更新")
        expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_role("button", name="刷新", exact=True)).to_be_enabled()
        expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
        expect(panel.locator(".metric-value")).to_have_count(4)
        page.reload()
        expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
        expect(panel.get_by_role("tab", name="中等", exact=True)).to_have_attribute(
            "aria-selected", "true"
        )
        expect(panel.locator(".quota-list")).to_have_attribute("data-density", "medium")
        for width in [280, 380, 900]:
            page.set_viewport_size({"width": width, "height": 1100})
            assert panel.locator("body").evaluate(
                "(el) => el.scrollWidth <= window.innerWidth"
            )
        page.set_viewport_size({"width": 380, "height": 1100})
        panel.locator("#app").screenshot(path=str(output / "magpie-usage-compact.png"))
        page.evaluate("window.fail=true")
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_text("额度读取失败", exact=True)).to_be_visible()
        expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
        page.evaluate("window.fail=false")
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_text("额度读取失败", exact=True)).to_have_count(0)
        panel.get_by_role("tab", name="宽松", exact=True).click()
        expect(panel.locator(".quota-list")).to_have_attribute(
            "data-density", "comfortable"
        )
        assert panel.locator("#app").evaluate(
            '(el) => el.lastElementChild.classList.contains("preferences")'
        )
        expect(panel.locator(".metric-detail").first).to_be_visible()
        panel.get_by_role("tab", name="7 天", exact=True).click()
        expect(panel.locator(".metric-value").first).to_have_text("336")
        assert page.evaluate("window.stored.period") == "week"
        page.screenshot(path=str(output / "magpie-usage-panel.png"), full_page=True)
        page.evaluate("window.fail=true")
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_text("额度读取失败", exact=True)).to_be_visible()
        expect(panel.get_by_text("消耗读取失败", exact=True)).to_be_visible()
        expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
        expect(panel.locator(".metric-value").first).to_have_text("336")
        panel.get_by_role("tab", name="30 天", exact=True).click()
        expect(panel.get_by_text("消耗读取失败", exact=True)).to_be_visible()
        expect(panel.locator(".metric-value")).to_have_count(0)
        page.evaluate("window.fail=false")
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_text("消耗读取失败", exact=True)).to_have_count(0)
        expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
        initial_requests = page.evaluate("window.requests.length")
        for locale, title, remaining, refresh, error in [
            (
                "en-US",
                "Magpie Usage",
                "63.6%",
                "Refresh",
                "Could not read quotas",
            ),
            ("zh-Hant-HK", "Magpie 用量", "63.6%", "重新整理", "無法讀取額度"),
            (
                "ja-JP",
                "Magpie 使用量",
                "63.6%",
                "更新",
                "上限を取得できませんでした",
            ),
            (
                "fr-FR",
                "Magpie Usage",
                "63.6%",
                "Refresh",
                "Could not read quotas",
            ),
        ]:
            page.evaluate("(locale) => window.setLocale(locale)", locale)
            expect(panel.get_by_role("heading", name=title, exact=True)).to_be_visible()
            expect(panel.get_by_text(remaining, exact=True)).to_be_visible()
            compact_label = {
                "en-US": "Compact",
                "zh-Hant-HK": "精簡",
                "ja-JP": "コンパクト",
                "fr-FR": "Compact",
            }[locale]
            expect(
                panel.get_by_role("tab", name=compact_label, exact=True)
            ).to_be_visible()
        assert page.evaluate("window.requests.length") == initial_requests
        page.evaluate("window.fail=true")
        panel.get_by_role("button", name="Refresh", exact=True).click()
        expect(panel.get_by_text("Could not read quotas", exact=True)).to_be_visible()
        expect(
            panel.get_by_text(
                "Cannot connect to local Magpie. Start Magpie, then refresh.",
                exact=False,
            ).first
        ).to_be_visible()
        page.evaluate("window.fail=false")
        panel.get_by_role("button", name="Refresh", exact=True).click()
        expect(panel.get_by_text("Could not read quotas", exact=True)).to_have_count(0)
        for width in [280, 380, 900]:
            page.set_viewport_size({"width": width, "height": 1100})
            assert panel.locator("body").evaluate(
                "(el) => el.scrollWidth <= window.innerWidth"
            )
        page.set_viewport_size({"width": 380, "height": 1000})
        panel.locator("#app").screenshot(path=str(output / "magpie-usage-en.png"))
        page.evaluate("window.setDark()")
        expect(panel.locator("html")).to_have_attribute("data-oc-theme", "dark")
        assert panel.locator(".quota").evaluate_all(
            '(cards) => cards.length === 2 && cards.every(card => getComputedStyle(card).borderTopWidth === "1px" && getComputedStyle(card).borderBottomWidth === "1px")'
        )
        panel.locator("#app").screenshot(path=str(output / "magpie-usage-dark.png"))
        panel.get_by_role("tab", name="Medium", exact=True).click()
        expect(panel.locator(".compact-account")).to_have_count(2)
        panel.locator("#app").screenshot(
            path=str(output / "magpie-usage-compact-dark.png")
        )
        for locale, label in [
            ("zh-Hant-HK", "中等"),
            ("ja-JP", "標準"),
            ("en-US", "Medium"),
        ]:
            page.evaluate("(locale) => window.setLocale(locale)", locale)
            expect(panel.get_by_role("tab", name=label, exact=True)).to_have_attribute(
                "aria-selected", "true"
            )
            for width in [280, 380, 900]:
                page.set_viewport_size({"width": width, "height": 1100})
                assert panel.locator("body").evaluate(
                    "(el) => el.scrollWidth <= window.innerWidth"
                )
        page.evaluate("sessionStorage.removeItem('preferences')")
        page.goto("http://127.0.0.1:58742/harness?surface=status")
        expect(panel.get_by_text("63.6%", exact=True)).to_be_visible()
        expect(panel.get_by_text("消耗统计", exact=True)).not_to_be_visible()
        assert page.evaluate("window.requests.every(r => r.path === '/quotas')")
        panel.get_by_role("tab", name="宽松", exact=True).click()
        expect(panel.locator(".quota")).to_have_count(2)
        for width in [280, 380, 900]:
            page.set_viewport_size({"width": width, "height": 1100})
            assert panel.locator(".quota").evaluate_all(
                "(cards) => cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom >= 10"
            )
        page.evaluate("window.setDark()")
        expect(panel.locator("html")).to_have_attribute("data-oc-theme", "dark")
        assert panel.locator(".quota").evaluate_all(
            "(cards) => cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom >= 10"
        )
        page.set_viewport_size({"width": 380, "height": 1100})
        panel.locator("#app").screenshot(
            path=str(output / "magpie-work-status-cards.png")
        )
        panel.get_by_role("tab", name="中等", exact=True).click()
        expect(panel.locator(".compact-account")).to_have_count(2)
        assert (
            panel.locator(".compact-account")
            .nth(1)
            .evaluate(
                '(el) => getComputedStyle(el).borderTopWidth === "1px" && parseFloat(getComputedStyle(el).paddingTop) >= 10'
            )
        )
        mode_checks.check_ring_modes(page, panel, output)
        assert not errors, errors
        print(
            json.dumps(
                {
                    "sdk_bridge": "pass",
                    "period_switch": "pass",
                    "failure_recovery": "pass",
                    "responsive_widths": [280, 380, 900],
                    "status_section": "pass",
                    "status_card_spacing": "pass",
                    "live_locales": [
                        "en-US",
                        "zh-CN",
                        "zh-Hant-HK",
                        "ja-JP",
                        "fr-FR fallback",
                    ],
                    "account_privacy": "pass",
                    "theme_switch": "pass",
                    "compact_mode_and_persistence": "pass",
                    "compact_disclosures_and_refresh": "pass",
                    "remaining_used_and_layout_continuity": "pass",
                    "console_errors": errors,
                    "screenshot": str(output / "magpie-usage-panel.png"),
                },
                ensure_ascii=False,
            )
        )
        browser.close()


if __name__ == "__main__":
    main()
