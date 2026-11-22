"""Gemeinsame Helfer für die CS1-Inhalte: Hervorhebung und geprüfte Codeblöcke (tests/cs_verify.cjs)."""
import html
import re
from textwrap import dedent

SNIPPETS = []
KW = r'\b(?:using|namespace|class|interface|public|private|protected|static|void|int|double|decimal|string|char|bool|var|const|new|return|if|else|switch|case|default|break|continue|for|foreach|in|while|do|try|catch|finally|throw|true|false|null|this|base|override|virtual|abstract|async|await|get|set)\b'
TOKEN = re.compile(r'(?P<com>//[^\n]*)|(?P<str>\$?"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\])\')|(?P<kw>' + KW + r')|(?P<num>\b\d+(?:\.\d+)?[mMfF]?\b)|(?P<typ>\b[A-Z][A-Za-z0-9]*\b)')


def hl(code):
    out, last = [], 0
    for m in TOKEN.finditer(code):
        out.append(html.escape(code[last:m.start()], quote=False))
        out.append(f'<span class="t-{m.lastgroup}">{html.escape(m.group(), quote=False)}</span>')
        last = m.end()
    out.append(html.escape(code[last:], quote=False))
    return ''.join(out)


def _code(code, **meta):
    code = dedent(code).strip('\n')
    SNIPPETS.append({'code': code, **meta})
    return code


def C(code, input=None, out=None):
    """Lauffähiger Beispielcode. out=None prüft nur das Kompilieren."""
    return '<pre class="cs" tabindex="0">' + hl(_code(code, input=input, out=out)) + '</pre>'


def B(code):
    """Absichtlich fehlerhafter Code: Der Compiler muss ihn ablehnen."""
    return '<pre class="cs bad" tabindex="0">' + hl(_code(code, bad=True)) + '</pre>'


def T(code, steps, input=None):
    """Schritt-für-Schritt-Ablauf: [Zeile, Variablen, Ausgabe, Erklärung]."""
    code = _code(code, input=input, out=' '.join(s[2] for s in steps if s[2]))
    return {'code': code, 'html': [hl(l) for l in code.split('\n')], 'steps': steps}
