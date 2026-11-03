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
    return html.replace('</head>', block + '</head>', 1)

if __name__ == '__main__':
    for path in sorted((ROOT / 'lernmodule').glob('*.html')):
        path.write_text(apply_theme(path.read_text()))
        print(path.name)
