<?php
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/_db.php';

try {
  $pdo = db();
  echo "LIGACAO OK\n";

  // lista tabelas
  $rs = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_NUM);
  foreach ($rs as $r) echo "- {$r[0]}\n";
} catch (Throwable $e) {
  echo "ERRO: ".$e->getMessage()."\n";
}
