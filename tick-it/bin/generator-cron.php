<?php
/** STRATO-Cronjob (CLI), z.B. jede Minute aufrufen. Keine Tokens in der Cron-Kommandozeile. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {http_response_code(403);exit;}
require_once dirname(__DIR__).'/app/generator.php';
try {echo 'Tick-It: '.generator_tick().' neue Übungstickets'.PHP_EOL;}
catch (Throwable $e) {error_log('Tick-It generator cron: '.$e->getMessage());exit(1);}
