<?php
// Focused regression checks for the SharpLab download UI and matrix animation.
declare(strict_types=1);
$page=file_get_contents(__DIR__.'/../sharplab/index.php');
$css=file_get_contents(__DIR__.'/../sharplab/sharplab.css');
$js=file_get_contents(__DIR__.'/../assets/sharplab-matrix.js');
if (!is_string($page)||!is_string($css)||!is_string($js)) throw new RuntimeException('Missing SharpLab assets');
if (substr_count($page,'class="portable-action" href="<?=e($portable)?>"') !== 2) {
  throw new RuntimeException('Both portable links must be yellow buttons.');
}
if (substr_count($page,'class="primary-action" href="<?=e($download)?>"') !== 2) {
  throw new RuntimeException('Installer links must be green buttons in every content section.');
}
if (!str_contains($page,'class="sl-runtime-action"') ||
    str_contains($page,'class="sl-portable"') || str_contains($page,'<a href="<?=e($portable)?>"')) {
  throw new RuntimeException('A download link is missing its button styling.');
}
if (str_contains($page,'<header class="nav glass-nav">') ||
    str_contains($page,'sl-nav-installer') ||
    str_contains($css,'.sharplab-page .sl-nav-installer')) {
  throw new RuntimeException('SharpLab must not show the Gering Digital top navigation.');
}
if (!str_contains($css,'pointer-events:none;opacity:.27;mix-blend-mode:screen;')) {
  throw new RuntimeException('Matrix opacity must be 15 percentage points lower than before.');
}
if (!str_contains($css,'grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);') ||
    !str_contains($page,'aria-label="SharpLab-Vorschau in voller Größe öffnen"')) {
  throw new RuntimeException('The preview must sit beside the introduction and open at full resolution.');
}
if (!str_contains($css,'.sharplab-page .portable-action{color:#161406;background:#f2cc47') ||
    !str_contains($css,'sl-runtime-action')) {
  throw new RuntimeException('Download button styles missing.');
}
if (!str_contains($page,'class="sl-back-button" href="../#apps">← Zurück</a>') ||
    str_contains($page,'sl-credits') || !str_contains($css,'.sharplab-page .sl-back-button{')) {
  throw new RuntimeException('The former license section must be replaced with one Back button.');
}
if (!str_contains($js,"stream.glyphs.push({") ||
    !str_contains($js,'character.age += dt') ||
    !str_contains($js,"stream.phase = 'fading'") ||
    !str_contains($js,'(character.row + 0.5) * cell - scroll')) {
  throw new RuntimeException('Matrix must draw stationary document-space characters and fade them individually.');
}
echo "SharpLab matrix and download UI checks passed.\n";
