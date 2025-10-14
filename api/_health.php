<?php
declare(strict_types=1);
ini_set('display_errors','1'); error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

require __DIR__.'/_session.php';
require __DIR__.'/_db.php';

echo "session_name=".session_name()."\n";
echo "session_id=".session_id()."\n";

$pdo = db();
$db  = $pdo->query("SELECT DATABASE()")->fetchColumn();
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo "BD: $db\n";
echo "Tabelas: ".implode(', ', $tables)."\n";
