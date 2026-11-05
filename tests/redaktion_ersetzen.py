#!/usr/bin/env python3
"""Applies editorial replacements. Usage: redaktion_ersetzen.py <module.html> <edits.json> ([[old,new],...]); every old must occur."""
import json,sys
f,e=sys.argv[1],sys.argv[2]
s=open(f,encoding='utf8',newline='').read();n=0
for a,b in json.load(open(e,encoding='utf8')):
    c=s.count(a)
    if c<1: sys.exit('NICHT GEFUNDEN: '+a[:90])
    s=s.replace(a,b);n+=c
open(f,'w',encoding='utf8',newline='').write(s);print(f,'Ersetzungen:',n)
