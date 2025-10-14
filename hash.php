<?php
// mude a senha aqui:
$plain = 'shark123';
// gera bcrypt ($2y$...)
$hash = password_hash($plain, PASSWORD_BCRYPT);
echo "PASSWORD: $plain<br>HASH: $hash";
