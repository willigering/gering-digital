# B4 IPv6 – Aufgabentypen

50 stabile IDs. Jede Aufgabe bewertet eine Antwort. Stufe zählt ab 1. `min` im Modul bezeichnet die minimale Generator-Schwierigkeit.

| ID | Name | Teilthema | Stufe |
| --- | --- | --- | --- |
| `b_total` | Adresslänge berechnen | 128 Bit & Hex | 1 |
| `b_block` | Bit pro Hex-Block | 128 Bit & Hex | 1 |
| `b_hex` | Hex-Block dezimal lesen | 128 Bit & Hex | 1 |
| `b_bytes` | Bytezahl einer Adresse | 128 Bit & Hex | 1 |
| `b_zeros` | Fehlende Blöcke zählen | 128 Bit & Hex | 1 |
| `s_short` | Adresse kanonisch kürzen | RFC 5952 kürzen | 2 |
| `s_tie` | Gleich lange Nullfolgen | RFC 5952 kürzen | 2 |
| `s_single` | Einzelnen Nullblock behandeln | RFC 5952 kürzen | 2 |
| `s_double` | Doppelter Doppelpunkt | RFC 5952 kürzen | 2 |
| `s_longest` | Längste Nullfolge wählen | RFC 5952 kürzen | 2 |
| `e_full` | Kurzform vollständig erweitern | Erweitern & prüfen | 3 |
| `e_end` | Nullfolge am Ende ergänzen | Erweitern & prüfen | 3 |
| `e_start` | Nullfolge am Anfang ergänzen | Erweitern & prüfen | 3 |
| `e_equal` | Gleichwertige Adressen erkennen | Erweitern & prüfen | 3 |
| `e_invalid` | Ungültige Hex-Ziffer finden | Erweitern & prüfen | 3 |
| `p_net` | Netzpräfix bestimmen | Präfix & Interface-ID | 4 |
| `p_iid` | Interface-ID aus /64 lesen | Präfix & Interface-ID | 4 |
| `p_rest` | Bits hinter dem Präfix | Präfix & Interface-ID | 4 |
| `p_same` | Gleiches /64-Netz prüfen | Präfix & Interface-ID | 4 |
| `p_zone` | Zone-ID deuten | Präfix & Interface-ID | 4 |
| `t_type` | Adresstyp am Beispiel | Adresstypen | 5 |
| `t_scope` | Link-Local über Router | Adresstypen | 5 |
| `t_group` | Alle Knoten oder Router | Adresstypen | 5 |
| `t_broadcast` | Broadcast in IPv6 | Adresstypen | 5 |
| `t_router` | fe80 ist kein Router | Adresstypen | 5 |
| `u_iid` | Modified EUI-64 bilden | Modified EUI-64 | 6 |
| `u_flip` | U/L-Bit kippen | Modified EUI-64 | 6 |
| `u_insert` | Eingefügte Bytes erkennen | Modified EUI-64 | 6 |
| `u_mac` | MAC aus Übungs-ID zurückgewinnen | Modified EUI-64 | 6 |
| `u_privacy` | MAC-basierte ID bewerten | Modified EUI-64 | 6 |
| `a_join` | SLAAC-Adresse zusammensetzen | SLAAC & RA | 7 |
| `a_flag` | Autonomous-Flag anwenden | SLAAC & RA | 7 |
| `a_dad` | Doppelbelegung erkennen | SLAAC & RA | 7 |
| `a_ra` | Standardrouter lernen | SLAAC & RA | 7 |
| `a_lifetime` | Router Lifetime null | SLAAC & RA | 7 |
| `d_order` | DHCPv6-Ablauf fortsetzen | DHCPv6 | 8 |
| `d_client` | DHCPv6-Client-Port | DHCPv6 | 8 |
| `d_server` | DHCPv6-Server-Port | DHCPv6 | 8 |
| `d_gateway` | DHCPv6 und Standardgateway | DHCPv6 | 8 |
| `d_stateless` | Stateless DHCPv6 einsetzen | DHCPv6 | 8 |
| `n_count` | Anzahl /64-Netze berechnen | IPv6-Subnetting | 9 |
| `n_nth` | n-tes /64-Subnetz bestimmen | IPv6-Subnetting | 9 |
| `n_number` | Subnetznummer zurückrechnen | IPv6-Subnetting | 9 |
| `n_need` | Passenden Block dimensionieren | IPv6-Subnetting | 9 |
| `n_last` | Letztes /64 im /48 bestimmen | IPv6-Subnetting | 9 |
| `v_dns` | Nachrichten zuordnen | Dual Stack & Diagnose | 10 |
| `v_stack` | Dual Stack erkennen | Dual Stack & Diagnose | 10 |
| `v_tunnel` | Tunnel von Dual Stack abgrenzen | Dual Stack & Diagnose | 10 |
| `v_nat` | IPv6 zu IPv4 übersetzen | Dual Stack & Diagnose | 10 |
| `v_zero` | Zu viele Nullen | Dual Stack & Diagnose | 10 |
