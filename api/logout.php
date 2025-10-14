<?php
declare(strict_types=1);
require __DIR__ . '/_session.php'; // usa o mesmo basePath e params do login

// Limpa a sessão em memória
$_SESSION = [];

// Destroi a sessão no servidor (se existir)
if (session_status() === PHP_SESSION_ACTIVE) {
  session_destroy();
}

// Apaga o cookie da sessão no browser com os MESMOS parâmetros
$cp = session_get_cookie_params();
setcookie(session_name(), '', [
  'expires'  => time() - 3600,
  'path'     => $cp['path']     ?: '/',           // ex.: '/' ou '/pvc_demo/'
  'domain'   => $cp['domain']   ?: '',            // ex.: janely.pt
  'secure'   => (bool)$cp['secure'],              // true se usas HTTPS
  'httponly' => true,
  'samesite' => 'Lax',
]);

// Redireciona para o login na MESMA base (raiz ou subpasta)
$basePath = $GLOBALS['basePath'] ?? '/';          // define em _session.php
header('Location: ' . rtrim($basePath, '/') . '/login.php', true, 303);
exit;
