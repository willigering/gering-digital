"""Embed the common module theme without external CSS dependencies."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
START = '<!-- DTP-MODULDESIGN START -->'
END = '<!-- DTP-MODULDESIGN END -->'

def apply_theme(html):
    html = html.replace('Offline · ohne Login', 'Lernen · Üben · Verstehen')
    html = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', html, flags=re.S)
    css = (ROOT / 'tools/module-theme.css').read_text()
    block = START + '\n<style>\n' + css.rstrip() + '\n</style>\n' + END + '\n'
    start = '<!-- DTP-UEBUNGSFOKUS START -->'
    end = '<!-- DTP-UEBUNGSFOKUS END -->'
    html = re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\n?', '', html, flags=re.S)
    focus_css = (ROOT / 'tools/module-focus.css').read_text()
    focus_js = (ROOT / 'tools/module-focus.js').read_text()
    block += start + '\n<style>\n' + focus_css.rstrip() + '\n</style>\n<script>\n' + focus_js.rstrip() + '\n</script>\n' + end + '\n'
    entry_start = '<!-- DTP-MODULEINSTIEG START -->'
    entry_end = '<!-- DTP-MODULEINSTIEG END -->'
    html = re.sub(re.escape(entry_start) + r'.*?' + re.escape(entry_end) + r'\n?', '', html, flags=re.S)
    entry_js = (ROOT / 'tools/module-entry.js').read_text()
    block += entry_start + '\n<script>\n' + entry_js.rstrip() + '\n</script>\n' + entry_end + '\n'
    calc_start = '<!-- DTP-TASCHENRECHNER START -->'
    calc_end = '<!-- DTP-TASCHENRECHNER END -->'
    html = re.sub(re.escape(calc_start) + r'.*?' + re.escape(calc_end) + r'\n?', '', html, flags=re.S)
    calc_css = (ROOT / 'dau-to-pro/module-calculator.css').read_text()
    calc_js = (ROOT / 'dau-to-pro/module-calculator.js').read_text()
    block += calc_start + '\n<style>\n' + calc_css.rstrip() + '\n</style>\n<script>\n' + calc_js.rstrip() + '\n</script>\n' + calc_end + '\n'
    return apply_wrong_answers(apply_mobile(html.replace('</head>', block + '</head>', 1)))

MOBILE_START = '<!-- DTP-HANDY START -->'
MOBILE_END = '<!-- DTP-HANDY END -->'

def apply_mobile(html):
    """Embed the shared phone layer last, so it overrides module and theme styles."""
    html = re.sub(re.escape(MOBILE_START) + r'.*?' + re.escape(MOBILE_END) + r'\n?', '', html, flags=re.S)
    css = (ROOT / 'tools/module-mobile.css').read_text().rstrip()
    js = (ROOT / 'tools/module-mobile.js').read_text().rstrip().replace('</script', '<\\/script')
    block = MOBILE_START + '\n<style>\n' + css + '\n</style>\n<script>\n' + js + '\n</script>\n' + MOBILE_END + '\n'
    return html.replace('</head>', block + '</head>', 1)

WRONG_START = '<!-- DTP-FEHLERSPRUECHE START -->'
WRONG_END = '<!-- DTP-FEHLERSPRUECHE END -->'

def apply_wrong_answers(html):
    """Share the Klausur feedback in standalone modules and refresh it on rebuild."""
    html = re.sub(re.escape(WRONG_START) + r'.*?' + re.escape(WRONG_END) + r'\n?', '', html, flags=re.S)
    js = (ROOT / 'tools/module-wrong-answer.js').read_text().rstrip()
    block = WRONG_START + '\n<script>\n' + js + '\n</script>\n' + WRONG_END + '\n'
    return html.replace('</head>', block + '</head>', 1)

if __name__ == '__main__':
    import sys
    fn = apply_mobile if '--nur-handy' in sys.argv else apply_theme
    for path in sorted((ROOT / 'lernmodule').glob('*.html')):
        path.write_text(fn(path.read_text()))
        print(path.name)

