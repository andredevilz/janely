<?php require __DIR__.'/api/_session.php'; if (current_user_id()) { header('Location: /'); exit; } ?>
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Login</title>
  <link rel="stylesheet" href="/assets/css/styles.css?v=1">
  <style>
    body{display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f6f7fb}
    .card{max-width:420px;width:100%}
    .note{white-space:pre-wrap}
  </style>
</head>
<body>
  <div class="card">
    <div class="hd"><h2>Entrar</h2></div>
    <div class="section">
      <form id="loginForm">
        <div class="field"><label>Email</label><input type="email" id="email" required></div>
        <div class="field"><label>Password</label><input type="password" id="password" required></div>
        <button class="btn primary" type="submit">Entrar</button>
      </form>
      <div id="msg" class="note" style="margin-top:10px"></div>
    </div>
  </div>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = 'A autenticar…';
  try{
    const res = await fetch('/api/login.php', {
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({email, password})
    });
    const ct = res.headers.get('Content-Type') || '';
    let json=null, text=null;
    if (ct.includes('application/json')) json = await res.json(); else text = await res.text();
    if (json && json.ok) { location.href = '/'; }
    else { msg.textContent = (json && (json.error || json.msg)) || text || 'Credenciais inválidas.'; }
  }catch(err){
    msg.textContent = 'Erro de rede.';
  }
});
</script>
</body>
</html>
