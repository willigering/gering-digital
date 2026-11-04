<?php
// One switch for both the Early Access UI and the submission endpoint.
const DTP_FEEDBACK_ENABLED = true;

function dtp_feedback_assets(): string {
    if (!DTP_FEEDBACK_ENABLED) return '';
    return '<link rel="stylesheet" href="/dau-to-pro/feedback.css?v='.filemtime(__DIR__.'/feedback.css').'">'
        .'<script defer src="/dau-to-pro/feedback.js?v='.filemtime(__DIR__.'/feedback.js').'"></script>';
}

function dtp_feedback_button(): string {
    return DTP_FEEDBACK_ENABLED
        ? '<button type="button" class="dtp-feedback-button" aria-haspopup="dialog" aria-controls="dtp-feedback-dialog" hidden>Feedback geben</button>'
        : '';
}

function dtp_feedback_dialog(string $source): string {
    if (!DTP_FEEDBACK_ENABLED) return '';
    ob_start();
    ?>
<dialog id="dtp-feedback-dialog" aria-labelledby="dtp-feedback-title">
    <form action="/dau-to-pro/api/feedback.php" method="post">
        <div class="dtp-feedback-heading">
            <div><small>EARLY ACCESS</small><h2 id="dtp-feedback-title">Feedback geben</h2></div>
            <button type="button" data-feedback-close aria-label="Feedback schließen">×</button>
        </div>
        <p>Was läuft gut, wo hakt’s? Schreib mir, was dir aufgefallen ist.</p>
        <input type="hidden" name="csrf" value="<?=e(csrf())?>">
        <input type="hidden" name="source" value="<?=e($source)?>">
        <label hidden>Website <input name="website" autocomplete="off" tabindex="-1"></label>
        <label>Betreff <input name="subject" maxlength="120" required autofocus></label>
        <label>Dein Feedback <textarea name="message" rows="5" maxlength="3000" required></textarea></label>
        <p class="dtp-feedback-note">Ohne Anmeldung. Bitte keine persönlichen Daten eintragen. <a href="/datenschutz.php#feedback">Datenschutz</a></p>
        <button type="submit">Feedback senden</button>
        <p role="status" class="dtp-feedback-status"></p>
    </form>
</dialog>
    <?php
    return (string)ob_get_clean();
}
