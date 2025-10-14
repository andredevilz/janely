<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/_session.php';   // sessão segura
require __DIR__ . '/_db.php';        // PDO central
$pdo = db();                         // liga à BD

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
  }

  // Aceita form-data (login.php) ou JSON
  $email = $_POST['email'] ?? null;
  $password = $_POST['password'] ?? null;

  if ($email === null || $password === null) {
    $raw = file_get_contents('php://input');
    if ($raw) {
      $j = json_decode($raw, true);
      if (is_array($j)) {
        $email = $email ?? ($j['email'] ?? null);
        $password = $password ?? ($j['password'] ?? null);
      }
    }
  }

  $email = is_string($email) ? trim($email) : '';
  $password = is_string($password) ? $password : '';

  if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing_email_or_password']);
    exit;
  }

  $stmt = $pdo->prepare('SELECT id, pass_hash, is_admin FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$email]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row || !password_verify($password, $row['pass_hash'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'invalid_credentials']);
    exit;
  }

  // Sessão ok
  $_SESSION['user_id'] = (int)$row['id'];
  $_SESSION['is_admin'] = (int)$row['is_admin'];

  echo json_encode(['ok' => true, 'user_id' => (int)$row['id']]);
} catch (Throwable $e) {
  // Loga para o error_log do cPanel e devolve erro genérico
  error_log('[login.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'exception']);
}
