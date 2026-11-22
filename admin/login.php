<?php require __DIR__.'/../lib.php'; if(logged()){header('Location: index.php');exit;} $error=''; if($_SERVER['REQUEST_METHOD']==='POST'){check_csrf();$u=trim($_POST['username']??'');$p=$_POST['password']??'';$row=db()->prepare("SELECT * FROM users WHERE username=?");$row->execute([$u]);$user=$row->fetch();if($user&&password_verify($p,$user['password_hash'])){session_regenerate_id(true);$_SESSION['admin_id']=$user['id'];header('Location: index.php');exit;}$error='Login fehlgeschlagen.';} ?>
<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Login</title><link rel="stylesheet" href="../style.css"><style>
/* ===== Admin area – readable dark UI ===== */
.admin-page{background:#090806;color:#fffaf0;min-height:100vh}
.admin-page .nav{background:rgba(5,13,22,.96);border-bottom:1px solid rgba(218,168,64,.28)}
.admin-page .brand{color:#fffaf0}
.admin-page .admin{padding:55px 0 80px}
.admin-page .adminbar h1{color:#fffaf0;margin:0}
.admin-page .eyebrow{color:#ffc95c}
.admin-page .panel{background:#1f180d;border:1px solid rgba(166,210,229,.18);box-shadow:0 18px 50px rgba(0,0,0,.28);color:#e8dcc5}
.admin-page .panel h2{color:#f5f8fc;margin-top:0}
.admin-page .panel label{display:block;color:#c5b79b;font-size:13px;font-weight:700;margin:0 0 14px}
.admin-page .panel input,.admin-page .panel textarea,.admin-page .panel select{display:block;width:100%;box-sizing:border-box;margin-top:7px;background:#171108!important;color:#fffaf0!important;border:1px solid rgba(218,168,64,.28)!important;border-radius:10px;padding:12px 13px;outline:none}
.admin-page .panel input::placeholder,.admin-page .panel textarea::placeholder{color:#7e96a8}
.admin-page .panel input:focus,.admin-page .panel textarea:focus,.admin-page .panel select:focus{border-color:#ffc95c!important;box-shadow:0 0 0 3px rgba(255,201,92,.12)}
.admin-page .panel input[type=file]{padding:9px;background:#171108!important}
.admin-page .panel input[type=number]{max-width:180px}
.admin-page .admin table{color:#e8dcc5}
.admin-page .admin th{color:#a18c68;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
.admin-page .admin td{color:#e8dcc5;border-bottom-color:rgba(166,210,229,.12)}
.admin-page .admin a:not(.btn){color:#ffc95c}
.admin-page .admin .danger{color:#ff9a8f!important}
.admin-page .pill{background:rgba(255,201,92,.12);color:#ffe09a}
.admin-page .btn{color:#090806}

/* Login */
.admin-login{background:#090806;color:#fffaf0;min-height:100vh;display:grid;place-items:center}
.admin-login .admin-login-card{background:#1f180d;border:1px solid rgba(166,210,229,.18);border-radius:22px;padding:34px;box-shadow:0 25px 70px rgba(0,0,0,.35)}
.admin-login h1{color:#fffaf0;margin-top:0}
.admin-login .eyebrow{color:#ffc95c}
.admin-login .form label{display:block;color:#c5b79b;font-size:13px;font-weight:700;margin:0 0 16px}
.admin-login .form input{display:block;width:100%;box-sizing:border-box;margin-top:7px;background:#171108!important;color:#fffaf0!important;border:1px solid rgba(218,168,64,.28)!important;border-radius:10px;padding:12px 13px}
.admin-login .form input:focus{border-color:#ffc95c!important;box-shadow:0 0 0 3px rgba(255,201,92,.12);outline:none}
</style></head><body class="admin-login"><main><div class="wrap" style="max-width:520px"><div class="admin-login-card"><p class="eyebrow">GERING APPS</p><h1>Admin Login</h1><?php if($error): ?><p style="color:#b42318"><?=e($error)?></p><?php endif; ?><form method="post" class="form"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><label>Benutzername<input name="username" autocomplete="username" required></label><label>Passwort<input type="password" name="password" autocomplete="current-password" required></label><button class="btn">Anmelden</button></form></div></div></main></body></html>