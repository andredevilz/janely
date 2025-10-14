<?php
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
require __DIR__.'/_db.php';
$pdo = db();

$email = 'admin@demo.pt'; // ajusta se precisares
$new   = 'Abc12345';      // define a nova password (8 chars no teu caso)

$hash = password_hash($new, PASSWORD_DEFAULT);
$ok = $pdo->prepare('UPDATE users SET pass_hash=? WHERE email=?')->execute([$hash, strtolower($email)]);
echo $ok ? "OK: password reposta para {$email}\n" : "ERRO ao atualizar\n";
