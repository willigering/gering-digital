#!/usr/bin/env python3
"""Lists a module's readable HTML prose by line so an editor can review it. Usage: redaktion_text.py <file> <from-line> <to-line>"""
import re,sys
f,a,b=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
for i,l in enumerate(open(f,encoding='utf8').read().split('\n'),1):
    if i<a or i>b or 'base64,' in l or '<td' in l or '<th' in l or 'class="ch-tile' in l or 'class="backtop' in l or 'KURZ-CHECK' in l: continue
    t=re.sub(r'<[^>]+>',' ',l);t=re.sub(r'\s+',' ',t).strip()
    if len(t)>25 and re.search(r'[a-zäöü]{3}',t): print(i,t)
