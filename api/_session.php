<?php
// api/_session.php
declare(strict_types=1);

// Detecta HTTPS e domínio atual
$isHttps  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';

// Se a tua app estiver na RAIZ do domínio, usa '/'. Se estiver em subpasta, mete '/pvc_demo'
$basePath = '/'; // <-- ALTERA para a subpasta certa se necessário

// Cookie da sessão bem definido para o domínio todo
$cookieParams = [
  'lifetime' => 0,                        // sessão de browser
  'path'     => $basePath,                // muito importante: '/' se estiver na raiz
  'domain'   => (strpos($host, ':') !== false) ? explode(':', $host)[0] : $host, // sem porto
  'secure'   => $isHttps,                 // true em HTTPS
  'httponly' => true,
  'samesite' => 'Lax',                    // Lax é o mais seguro/compatível aqui
];

if (PHP_VERSION_ID >= 70300) {
  session_set_cookie_params($cookieParams);
} else {
  // fallback PHP<7.3 (sem samesite nativo)
  session_set_cookie_params(
    $cookieParams['lifetime'],
    $cookieParams['path'].'; samesite='.$cookieParams['samesite'],
    $cookieParams['domain'],
    $cookieParams['secure'],
    $cookieParams['httponly']
  );
}

session_name('PHPSESSID');
if (session_status() !== PHP_SESSION_ACTIVE) {
  @session_start();
}

// Helpers
function current_user_id(): ?int {
  return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}
function require_login_json(): void {
  if (!current_user_id()) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'not_authenticated']);
    exit;
  }
}
function require_login_page(): void {
  if (!current_user_id()) {
    // redireciona para login mantendo a URL pedida
    $qs = isset($_SERVER['REQUEST_URI']) ? urlencode($_SERVER['REQUEST_URI']) : '';
    header('Location: '.$GLOBALS['basePath'].'login.php?next='.$qs);
    exit;
  }
}
