"""Exercise the bundled panel through the real SDK postMessage protocol."""

import json
import tempfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

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
  Object.assign(window.context.theme.tokens, {background:'#1c1c1a',foreground:'#eeeee9',muted:'#aaa99f',mutedSurface:'#282825',primary:'#e6a16b',primaryText:'#e6a16b'});
  document.querySelector('iframe').contentWindow.postMessage({...envelope,type:'ready',payload:window.context},'*');
};
const counters = {calls:48,input:24000,output:6400,cache_read:92000,cache_write:4800,cost:1.23,unpriced:2};
const quotas = {data:[
  {provider:'codex',name:'Codex',user:'demo@example.invalid',plan:'Pro',last:true,
   readAt:new Date().toISOString(),windows:[{name:'7 days',used:36.4,remaining:63.6,
   resetsAt:new Date(Date.now()+40*3600000).toISOString()}]},
  {provider:'custom',name:'自定义服务',windows:[{name:'Credits',display:'余额待供应商提供'}]}
]};
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
        browser = playwright.chromium.launch(headless=True, channel="chrome")
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
        expect(panel.get_by_text("剩余 63.6%")).to_be_visible()
        expect(panel.get_by_text("额度未知", exact=True)).to_be_visible()
        expect(panel.get_by_text("演示模型", exact=True)).to_be_visible()
        expect(panel.get_by_text("demo@example.invalid", exact=True)).to_have_count(0)
        panel.get_by_role("switch", name="显示账户名", exact=True).click()
        expect(panel.get_by_text("demo@example.invalid", exact=True)).to_be_visible()
        panel.get_by_role("switch", name="显示账户名", exact=True).click()
        expect(panel.locator(".oc-sdk-progress-label")).not_to_be_visible()
        normal_height = panel.locator("#app").evaluate(
            "(el) => el.getBoundingClientRect().height"
        )
        requests_before_density = page.evaluate("window.requests.length")
        panel.get_by_role("switch", name="紧凑模式", exact=True).click()
        expect(panel.locator("#app")).to_have_attribute("data-density", "compact")
        assert (
            panel.locator("#app").evaluate("(el) => el.getBoundingClientRect().height")
            < normal_height
        )
        assert page.evaluate("window.requests.length") == requests_before_density
        assert page.evaluate("window.stored.compactMode") is True
        expect(panel.locator(".metric-detail").first).not_to_be_visible()
        page.reload()
        expect(panel.get_by_text("剩余 63.6%")).to_be_visible()
        expect(panel.get_by_role("switch", name="紧凑模式", exact=True)).to_be_checked()
        expect(panel.locator("#app")).to_have_attribute("data-density", "compact")
        for width in [280, 380, 900]:
            page.set_viewport_size({"width": width, "height": 1100})
            assert panel.locator("body").evaluate(
                "(el) => el.scrollWidth <= window.innerWidth"
            )
        page.set_viewport_size({"width": 380, "height": 1100})
        panel.locator("#app").screenshot(path=str(output / "magpie-usage-compact.png"))
        panel.get_by_role("switch", name="紧凑模式", exact=True).click()
        expect(panel.locator("#app")).to_have_attribute("data-density", "comfortable")
        expect(panel.locator(".metric-detail").first).to_be_visible()
        panel.get_by_role("tab", name="7 天", exact=True).click()
        expect(panel.locator(".metric-value").first).to_have_text("336")
        assert page.evaluate("window.stored.period") == "week"
        page.screenshot(path=str(output / "magpie-usage-panel.png"), full_page=True)
        page.evaluate("window.fail=true")
        panel.get_by_role("button", name="刷新", exact=True).click()
        expect(panel.get_by_text("额度读取失败", exact=True)).to_be_visible()
        expect(panel.get_by_text("消耗读取失败", exact=True)).to_be_visible()
        expect(panel.get_by_text("剩余 63.6%")).to_be_visible()
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
                "63.6% remaining",
                "Refresh",
                "Could not read quotas",
            ),
            ("zh-Hant-HK", "Magpie 用量", "剩餘 63.6%", "重新整理", "無法讀取額度"),
            (
                "ja-JP",
                "Magpie 使用量",
                "残り 63.6%",
                "更新",
                "上限を取得できませんでした",
            ),
            (
                "fr-FR",
                "Magpie Usage",
                "63.6% remaining",
                "Refresh",
                "Could not read quotas",
            ),
        ]:
            page.evaluate("(locale) => window.setLocale(locale)", locale)
            expect(panel.get_by_role("heading", name=title, exact=True)).to_be_visible()
            expect(panel.get_by_text(remaining, exact=True)).to_be_visible()
            compact_label = {
                "en-US": "Compact mode",
                "zh-Hant-HK": "精簡模式",
                "ja-JP": "コンパクト表示",
                "fr-FR": "Compact mode",
            }[locale]
            expect(
                panel.get_by_role("switch", name=compact_label, exact=True)
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
        panel.locator("#app").screenshot(path=str(output / "magpie-usage-dark.png"))
        page.evaluate("sessionStorage.removeItem('preferences')")
        page.goto("http://127.0.0.1:58742/harness?surface=status")
        expect(panel.get_by_text("剩余 63.6%")).to_be_visible()
        expect(panel.get_by_text("消耗统计", exact=True)).not_to_be_visible()
        assert page.evaluate("window.requests.every(r => r.path === '/quotas')")
        assert not errors, errors
        print(
            json.dumps(
                {
                    "sdk_bridge": "pass",
                    "period_switch": "pass",
                    "failure_recovery": "pass",
                    "responsive_widths": [280, 380, 900],
                    "status_section": "pass",
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
                    "console_errors": errors,
                    "screenshot": str(output / "magpie-usage-panel.png"),
                },
                ensure_ascii=False,
            )
        )
        browser.close()


if __name__ == "__main__":
    main()
