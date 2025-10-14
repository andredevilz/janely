<?php
declare(strict_types=1);
require __DIR__.'/_db.php';
require __DIR__.'/_session.php';
require_login_json();

header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();

// cria estado vazio caso não exista
$st = db()->prepare('SELECT json_state, updated_at FROM user_state WHERE user_id = ? LIMIT 1');
$st->execute([$uid]);
$row = $st->fetch();

if (!$row) {
  echo json_encode(['ok'=>true, 'state'=>['config'=>null,'company'=>null,'proposal'=>null,'items'=>[]], 'updated_ts'=>null]);
  exit;
}

echo json_encode([
  'ok'=>true,
  'state'=> json_decode($row['json_state'], true),
  'updated_ts'=> $row['updated_at']
]);
