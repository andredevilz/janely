<?php
require __DIR__.'/db.php';

$email = trim($_POST['email'] ?? '');
$pass  = (string)($_POST['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'invalid_input']);
  exit;
}

$hash = password_hash($pass, PASSWORD_DEFAULT);
try {
  $stmt = $pdo->prepare('INSERT INTO users (email, pass_hash) VALUES (?,?)');
  $stmt->execute([$email, $hash]);
  $_SESSION['user_id'] = (int)$pdo->lastInsertId();
  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'email_in_use']);
}
