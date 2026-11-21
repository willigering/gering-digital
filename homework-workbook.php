<?php
declare(strict_types=1);
/** Private worksheet state and cached source-text search; no original is rewritten. */
function hw_workbook_schema(PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS workbook_state (module_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS workbook_search (module_id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, content TEXT NOT NULL)');
}
function hw_source_text(string $html): string {
    $clean='';$offset=0;
    while(preg_match('~<(script|style)\b[^>]*>~i',$html,$match,PREG_OFFSET_CAPTURE,$offset)){
        $start=$match[0][1];$clean.=substr($html,$offset,$start-$offset).' ';
        $close=stripos($html,'</'.$match[1][0],$start+strlen($match[0][0]));
        if($close===false){$offset=strlen($html);break;}
        $end=strpos($html,'>',$close);$offset=$end===false?strlen($html):$end+1;
    }
    $clean.=substr($html,$offset);
    $clean=preg_replace('~</(?:p|div|li|h[1-6]|tr|section)>|<br\s*/?>~i',' ',$clean)??$clean;
    $clean=html_entity_decode(strip_tags($clean),ENT_QUOTES|ENT_HTML5,'UTF-8');
    $clean=preg_replace('/\s+/u',' ',$clean)??$clean;
    return trim($clean);
}
function hw_index_module(PDO $db,string $id,string $source): string {
    $hash=hash('sha256',$source);
    $q=$db->prepare('SELECT content FROM workbook_search WHERE module_id=? AND source_hash=?');$q->execute([$id,$hash]);
    $text=$q->fetchColumn();if(is_string($text))return $text;
    $text=hw_source_text($source);
    $q=$db->prepare('INSERT INTO workbook_search(module_id,source_hash,content) VALUES(?,?,?) ON CONFLICT(module_id) DO UPDATE SET source_hash=excluded.source_hash,content=excluded.content');
    $q->execute([$id,$hash,$text]);return $text;
}
function hw_saved_workbook(PDO $db,string $id): array {
    $q=$db->prepare('SELECT state_json,revision FROM workbook_state WHERE module_id=?');$q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
    return $row?['fields'=>json_decode($row['state_json'],true,512,JSON_THROW_ON_ERROR),'revision'=>(int)$row['revision']]:['fields'=>[],'revision'=>0];
}
function hw_clean_fields(mixed $fields): array {
    if(!is_array($fields)||count($fields)>2000)throw new InvalidArgumentException('Zu viele Antwortfelder.');
    $clean=[];
    foreach($fields as $key=>$value){
        if(!is_string($key)||strlen($key)>180||!is_array($value))throw new InvalidArgumentException('Ungültiges Antwortfeld.');
        if(!isset($value['kind'])||!in_array($value['kind'],['text','check','select','editable'],true))throw new InvalidArgumentException('Ungültiger Antworttyp.');
        $entry=['kind'=>$value['kind']];
        if($value['kind']==='check')$entry['checked']=(bool)($value['checked']??false);
        elseif($value['kind']==='select'){
            if(!is_array($value['values']??null)||count($value['values'])>200)throw new InvalidArgumentException('Ungültige Auswahl.');
            $entry['values']=array_map(static fn($v)=>(string)$v,$value['values']);
            foreach($entry['values'] as $v)if(strlen($v)>20000)throw new InvalidArgumentException('Antwort zu lang.');
        }else{$entry['value']=(string)($value['value']??'');if(strlen($entry['value'])>30000)throw new InvalidArgumentException('Antwort zu lang.');}
        $clean[$key]=$entry;
    }
    if(strlen(json_encode($clean,JSON_THROW_ON_ERROR))>170000)throw new InvalidArgumentException('Antworten sind zu umfangreich.');
    return $clean;
}
function hw_workbook_runtime(string $id,array $state,bool $standalone=false,bool $blank=false): string {
    $config=['id'=>$id,'fields'=>$state['fields'],'revision'=>$state['revision'],'standalone'=>$standalone,'blank'=>$blank,'exportToken'=>$standalone?bin2hex(random_bytes(10)):null];
    $json=json_encode($config,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR);
    $css=file_get_contents(__DIR__.'/assets/homework-workbook.css');
    $js=file_get_contents(__DIR__.'/assets/homework-workbook.js');
    if($css===false||$js===false)throw new RuntimeException('Arbeitsblatt-Oberfläche fehlt.');
    return '<style id="hw-workbook-style">'.$css.'</style><script id="hw-workbook-config" type="application/json">'.$json.'</script><script id="hw-workbook-runtime">'.$js.'</script>';
}
function hw_inject_workbook(string $html,string $runtime): string {
    if(preg_match('~</body\s*>~i',$html))return preg_replace_callback('~</body\s*>~i',static fn($m)=>$runtime."\n".$m[0],$html,1)??$html.$runtime;
    return $html.$runtime;
}
