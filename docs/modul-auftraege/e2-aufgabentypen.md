# E2 · Datenbanken & SQL

| ID | Aufgabentyp | Form | Stufe |
| --- | --- | --- | --- |
| `sys_dbms` | Datenbankmanagementsystem | `word` | 1 · Datenbank, DBMS und Geschichte |
| `sys_flow` | Weg einer Abfrage | `order` | 1 · Datenbank, DBMS und Geschichte |
| `sys_codd` | Codds Modell | `gap` | 1 · Datenbank, DBMS und Geschichte |
| `sys_separe` | Physische und logische Sicht | `mc` | 1 · Datenbank, DBMS und Geschichte |
| `sys_ims` | IBM IMS | `word` | 1 · Datenbank, DBMS und Geschichte |
| `sys_history` | Historische Reihenfolge | `order` | 1 · Datenbank, DBMS und Geschichte |
| `mod_local` | Eingebettetes SQLite | `word` | 2 · Datenbankmodelle auswählen |
| `mod_graph` | Kanten im Graphmodell | `gap` | 2 · Datenbankmodelle auswählen |
| `mod_document` | Dokumentmodell | `mc` | 2 · Datenbankmodelle auswählen |
| `mod_cache` | Cache mit Redis | `word` | 2 · Datenbankmodelle auswählen |
| `mod_olap` | OLAP erkennen | `gap` | 2 · Datenbankmodelle auswählen |
| `mod_choice` | Datenbank auswählen | `order` | 2 · Datenbankmodelle auswählen |
| `key_pk` | Primärschlüssel bestimmen | `word` | 3 · Tabellen und Schlüssel |
| `key_fk` | Fremdschlüssel ergänzen | `gap` | 3 · Tabellen und Schlüssel |
| `key_null` | Pflichtverweis prüfen | `out` | 3 · Tabellen und Schlüssel |
| `key_check` | CHECK korrigieren | `fix` | 3 · Tabellen und Schlüssel |
| `key_pair` | Zusammengesetzter Schlüssel | `mc` | 3 · Tabellen und Schlüssel |
| `key_insert` | Team vor Ticket anlegen | `order` | 3 · Tabellen und Schlüssel |
| `er_card` | Kardinalität Team–Ticket | `word` | 4 · ER-Modell und Kardinalitäten |
| `er_nm` | n:m erkennen | `gap` | 4 · ER-Modell und Kardinalitäten |
| `er_optional` | Mindestanzahl lesen | `out` | 4 · ER-Modell und Kardinalitäten |
| `er_fk` | Fremdschlüssel platzieren | `mc` | 4 · ER-Modell und Kardinalitäten |
| `er_11` | 1:1 mit UNIQUE | `gap` | 4 · ER-Modell und Kardinalitäten |
| `er_bridge` | Zwischentabelle anlegen | `order` | 4 · ER-Modell und Kardinalitäten |
| `norm_atom` | Erste Normalform | `word` | 5 · Normalformen 1 bis 3 |
| `norm_2` | Zweite Normalform | `gap` | 5 · Normalformen 1 bis 3 |
| `norm_move` | Attribut verschieben | `mc` | 5 · Normalformen 1 bis 3 |
| `norm_3` | Transitive Abhängigkeit | `word` | 5 · Normalformen 1 bis 3 |
| `norm_steps` | Normalformen anwenden | `order` | 5 · Normalformen 1 bis 3 |
| `norm_anomaly` | Änderungsanomalie | `out` | 5 · Normalformen 1 bis 3 |
| `sel_clause` | WHERE ergänzen | `gap` | 6 · SELECT, WHERE und ORDER BY |
| `sel_null` | NULL-Prüfung korrigieren | `fix` | 6 · SELECT, WHERE und ORDER BY |
| `sel_sort` | Absteigend sortieren | `gap` | 6 · SELECT, WHERE und ORDER BY |
| `sel_out` | Erste Zeile vorhersagen | `out` | 6 · SELECT, WHERE und ORDER BY |
| `sel_write` | SELECT mit Filter | `write` | 6 · SELECT, WHERE und ORDER BY |
| `sel_order` | SQL-Klauseln ordnen | `order` | 6 · SELECT, WHERE und ORDER BY |
| `grp_count` | COUNT(spalte) | `out` | 7 · Aggregation, GROUP BY und HAVING |
| `grp_having` | HAVING ergänzen | `gap` | 7 · Aggregation, GROUP BY und HAVING |
| `grp_avg` | AVG mit NULL | `out` | 7 · Aggregation, GROUP BY und HAVING |
| `grp_order` | Gruppen auswerten | `order` | 7 · Aggregation, GROUP BY und HAVING |
| `grp_fix` | Gruppenfilter korrigieren | `fix` | 7 · Aggregation, GROUP BY und HAVING |
| `grp_write` | COUNT mit GROUP BY | `write` | 7 · Aggregation, GROUP BY und HAVING |
| `join_left` | LEFT JOIN ergänzen | `gap` | 8 · INNER JOIN und LEFT JOIN |
| `join_inner` | INNER JOIN zählen | `out` | 8 · INNER JOIN und LEFT JOIN |
| `join_leftrows` | LEFT JOIN zählen | `out` | 8 · INNER JOIN und LEFT JOIN |
| `join_condition` | ON-Klausel schreiben | `write` | 8 · INNER JOIN und LEFT JOIN |
| `join_filter` | Rechte Zeilen filtern | `mc` | 8 · INNER JOIN und LEFT JOIN |
| `join_count` | COUNT im LEFT JOIN | `fix` | 8 · INNER JOIN und LEFT JOIN |
| `write_insert` | INSERT ergänzen | `gap` | 9 · INSERT, UPDATE und DELETE |
| `write_update` | UPDATE schreiben | `write` | 9 · INSERT, UPDATE und DELETE |
| `write_delete` | DELETE ohne Filter | `out` | 9 · INSERT, UPDATE und DELETE |
| `write_fix` | WHERE für UPDATE | `fix` | 9 · INSERT, UPDATE und DELETE |
| `write_rollback` | ROLLBACK einsetzen | `word` | 9 · INSERT, UPDATE und DELETE |
| `write_order` | Transaktion ordnen | `order` | 9 · INSERT, UPDATE und DELETE |
| `schema_create` | CREATE ergänzen | `gap` | 10 · CREATE, ALTER und Datenbankbetrieb |
| `schema_alter` | ALTER TABLE schreiben | `write` | 10 · CREATE, ALTER und Datenbankbetrieb |
| `schema_index` | Index auswählen | `word` | 10 · CREATE, ALTER und Datenbankbetrieb |
| `schema_restore` | Restore-Test planen | `order` | 10 · CREATE, ALTER und Datenbankbetrieb |
| `schema_replica` | Vor Löschung zurücksetzen | `mc` | 10 · CREATE, ALTER und Datenbankbetrieb |
| `schema_rights` | Leserecht vergeben | `gap` | 10 · CREATE, ALTER und Datenbankbetrieb |
