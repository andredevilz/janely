<?php
// /pvc_demo/api/db.php
declare(strict_types=1);
session_start();

$DB_HOST = 'localhost';
$DB_NAME = 'janely_cool';
$DB_USER = 'janely_cool';
$DB_PASS = 'P%KxuVcSYMox';

try {
  $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'DB connection failed']);
  exit;
}

function require_login(): int {
  if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'not_authenticated']);
    exit;
  }
  return (int)$_SESSION['user_id'];
}

header('Content-Type: application/json');
