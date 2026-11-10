// Quantum Celular · CHAT (pedido do usuário em 10/11/2026): grupos privados com mensagens e fotos, sem cadastro (só um apelido).
// Cada aparelho gera o próprio código (fica só nele; o servidor guarda o sha256). Entrar num grupo: pelo LINK de convite (entra direto)
// ou pelo CÓDIGO curto do grupo (o dono aceita). Tudo pelas funções qt_chat_* (docs/supabase_chat.sql). Usa rpc, $, esc, toast e confirma do index.
(function () {
const CH = {tok: null, eu: null, grupos: [], g: null, info: null, msgs: [], fim: false, tela: 'lista', fotos: {}, enviando: false, t: null};
const LINK_APP = 'https://jeffschossler.github.io/quantum-releases/app/';
function token() {
 try { let t = localStorage.getItem('qc_chat_tok'); if (t && t.length >= 40) return t;
  const b = new Uint8Array(32); crypto.getRandomValues(b); t = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  localStorage.setItem('qc_chat_tok', t); return t; } catch (e) { return null; }
}
CH.tok = token();
// dentro da plataforma do PC (?pc=1): só o chat, sem o painel do celular; ?bg=1 = escondido, só conta as não lidas para o botão 💬 da plataforma
const PC = /[?&]pc=1/.test(location.search), BG = /[?&]bg=1/.test(location.search);
if (PC) document.documentElement.classList.add('pc-modo');
const avisaPai = d => { if (PC && parent !== window) try { parent.postMessage(Object.assign({qc_chat: 1}, d), '*'); } catch (e) {} };
// usar no celular o mesmo chat do PC (#eu=<código>, do QR code da plataforma): pergunta antes de trocar
try { const m = /[#&]eu=([^&]+)/.exec(location.hash); if (m) { localStorage.setItem('qc_chat_eu_novo', decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); } } catch (e) {}
// convite pelo link (#g=...): guarda e abre o chat
try { const m = /[#&]g=([^&]+)/.exec(location.hash); if (m) { localStorage.setItem('qc_chat_conv', decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); } } catch (e) {}
const r = (f, o) => rpc(f, Object.assign({p_token: CH.tok}, o || {}));
const quando = s => { const d = new Date(s), h = new Date(); const mesmo = d.toDateString() === h.toDateString();
 return mesmo ? d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}); };
const diaTxt = s => { const d = new Date(s), h = new Date(), on = new Date(h - 86400000);
 return d.toDateString() === h.toDateString() ? 'Hoje' : d.toDateString() === on.toDateString() ? 'Ontem' : d.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'}); };
const erro = e => toast('⚠ ' + String(e && e.message || e).replace(/^Error: /, ''));

// ---------- tela ----------
document.head.insertAdjacentHTML('beforeend', `<style>
#chat{position:fixed;inset:0;background:var(--bg);z-index:7;display:none;flex-direction:column}#chat.on{display:flex}
#chat header{position:static}#chVolta{background:none;border:0;color:var(--azul);font-size:22px;padding:0 6px 0 0;flex:none;width:auto}
#chTit{display:flex;flex-direction:column;min-width:0;flex:1}#chTit b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#chTit span{font-size:12px;color:var(--sub)}
#chAc{display:flex;gap:6px}#chAc button{flex:none;width:auto;padding:7px 10px;font-size:13px;background:#1e293b;color:#e2e8f0;border:1px solid #334155}
#chCorpo{flex:1;min-height:0;overflow-y:auto;padding:12px 14px;-webkit-overflow-scrolling:touch}
.ch-g{display:grid;grid-template-columns:44px 1fr auto;gap:2px 12px;align-items:center;padding:12px 4px;border-bottom:1px solid var(--borda);cursor:pointer}
.ch-av{width:44px;height:44px;border-radius:50%;background:#1e3a5f;color:#bae6fd;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;grid-row:1/3}
.ch-g b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch-g .ult{font-size:13px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-g .hr{font-size:11px;color:var(--sub);text-align:right}.ch-bad{background:var(--verde);color:#052e1a;border-radius:99px;font-size:11px;font-weight:800;padding:1px 7px;justify-self:end}
.ch-bad.am{background:var(--amar);color:#3a2e05}
.ch-dia{text-align:center;margin:10px 0}.ch-dia span{background:#1e293b;color:var(--sub);font-size:11.5px;padding:3px 10px;border-radius:99px}
.ch-sis{text-align:center;color:var(--sub);font-size:12px;margin:6px 0}
.ch-m{max-width:82%;margin:3px 0;padding:7px 10px 5px;border-radius:14px;background:#1e293b;word-wrap:break-word;white-space:pre-wrap;font-size:14.5px;position:relative}
.ch-m.eu{margin-left:auto;background:#0e4a6e;border-bottom-right-radius:4px}.ch-m.ele{border-bottom-left-radius:4px}
.ch-m .ap{display:block;font-size:12px;font-weight:700;color:var(--azul);margin-bottom:1px}.ch-m .hr{display:block;text-align:right;font-size:10.5px;color:#94a3b8;margin-top:2px}
.ch-m img{display:block;max-width:100%;max-height:300px;border-radius:9px;margin:2px 0 3px;cursor:pointer;background:#0b1220;min-width:120px;min-height:80px}
#chEnvio{display:none;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));border-top:1px solid var(--borda);background:#0d1526;align-items:flex-end}#chEnvio.on{display:flex}
#chTx{flex:1;background:#0b1220;color:var(--txt);border:1px solid #334155;border-radius:18px;padding:9px 14px;font:inherit;resize:none;max-height:120px;min-height:40px;overflow-y:hidden}
#chFoto,#chMand{flex:none;width:42px;height:42px;border-radius:50%;padding:0;font-size:19px}#chFoto{background:#1e293b;color:#e2e8f0}#chMand{background:var(--azul);color:#052e3d}
.ch-form{max-width:440px;margin:30px auto;text-align:center}.ch-form input{width:100%;background:#0b1220;color:var(--txt);border:1px solid #334155;border-radius:10px;padding:12px;font:inherit;margin:12px 0}
.ch-form p{color:var(--sub)}.ch-bt{background:var(--azul);color:#052e3d;width:100%}.ch-bt2{background:#1e293b;color:#e2e8f0;border:1px solid #334155;width:100%;margin-top:8px}
.ch-sec{background:var(--card);border:1px solid var(--borda);border-radius:14px;padding:12px 14px;margin-bottom:12px}.ch-sec h4{margin:0 0 8px;font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:.6px}
.ch-mb{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--borda)}.ch-mb:last-child{border:0}.ch-mb span{flex:1}.ch-mb button{flex:none;width:auto;padding:6px 10px;font-size:12.5px}
.ch-cod{font:700 20px monospace;letter-spacing:3px;color:var(--amar)}.ch-link{font-size:12px;color:var(--sub);word-break:break-all;margin:6px 0}
.ch-vazio{color:var(--sub);text-align:center;padding:30px 10px}
#chVer{position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:8;display:none;flex-direction:column}#chVer.on{display:flex}
#chVer img{flex:1;min-height:0;object-fit:contain;width:100%}#chVer div{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
#chVer button{background:#1e293b;color:#e2e8f0;border:1px solid #334155}
html.pc-modo body > header,html.pc-modo main,html.pc-modo nav{display:none!important}html.pc-modo #chat header{padding-top:8px}
nav b .ch-nb{position:absolute;margin:-4px 0 0 -6px;background:var(--verde);color:#052e1a;border-radius:99px;font-size:10px;font-weight:800;padding:0 5px;font-style:normal}
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div id="chat"><header><button id="chVolta" aria-label="Voltar">‹</button><div id="chTit"><b>Chat</b><span></span></div><div id="chAc"></div></header>
 <div id="chCorpo"></div>
 <div id="chEnvio"><button id="chFoto" title="Enviar foto">📷</button><input type="file" id="chArq" accept="image/*" style="display:none"><textarea id="chTx" rows="1" placeholder="Mensagem" maxlength="2000"></textarea><button id="chMand" title="Enviar">➤</button></div></div>
<div id="chVer"><img alt=""><div><button id="chBaixa">⬇ Baixar</button><button id="chApFoto">🗑 Apagar</button><button id="chFecha">✕ Fechar</button></div></div>`);
// aba no menu de baixo e botão na tela de conectar o PC (o chat funciona sem o PC)
const nav = $('nav'); nav.insertAdjacentHTML('beforeend', '<b data-chat="1"><span>💬</span>Chat</b>');
$('semCodigo').insertAdjacentHTML('beforeend', '<button class="ch-bt" id="chSemPc" style="max-width:320px;margin-top:18px">💬 Abrir o chat</button>');
$('chSemPc').onclick = () => abre();
nav.querySelector('[data-chat]').onclick = e => { e.stopPropagation(); abre(); };

function abre() { $('chat').classList.add('on'); CH.tela = 'lista'; inicio(); }
function fecha() { if (PC) return; $('chat').classList.remove('on'); clearTimeout(CH.t); CH.g = null; badgeNav(); }
$('chVolta').onclick = () => { if (CH.tela === 'conversa') lista(); else if (CH.tela === 'info') conversa(CH.g); else fecha(); };
function topo(tit, sub, acoes) { $('chVolta').style.visibility = PC && (CH.tela === 'lista' || (CH.tela === 'perfil' && !CH.eu)) ? 'hidden' : ''; $('chTit').firstElementChild.textContent = tit; $('chTit').lastElementChild.textContent = sub || ''; $('chAc').innerHTML = acoes || ''; }

async function inicio() {
 let novo = null; try { novo = localStorage.getItem('qc_chat_eu_novo'); } catch (e) {}
 if (novo) { try { localStorage.removeItem('qc_chat_eu_novo'); } catch (e) {}
  if (novo !== CH.tok && novo.length >= 40) { let p = null; try { p = await rpc('qt_chat_perfil', {p_token: novo}); } catch (e) {}
   if (p) return confirma('Usar o chat do PC neste aparelho?', `Você passa a ser "${p.apelido}", com os mesmos grupos e mensagens do PC.` + (CH.apelido ? ` O chat atual deste aparelho ("${CH.apelido}") fica para trás.` : ''),
    () => { try { localStorage.setItem('qc_chat_tok', novo); } catch (e) {} CH.tok = novo; CH.eu = null; inicio(); }); } }
 if (!CH.tok) { $('chCorpo').innerHTML = '<div class="ch-vazio">Este navegador não deixa guardar dados: o chat não funciona aqui.</div>'; return; }
 try { const p = await r('qt_chat_perfil'); if (!p) return perfil(); CH.eu = p.id; CH.apelido = p.apelido; }
 catch (e) { $('chCorpo').innerHTML = `<div class="ch-vazio">Não foi possível falar com o servidor (${esc(e.message)}).</div>`; return; }
 let conv = null; try { conv = localStorage.getItem('qc_chat_conv'); } catch (e) {}
 if (conv) { try { localStorage.removeItem('qc_chat_conv'); } catch (e) {} return entrar(conv); }
 lista();
}
function perfil(trocar) {
 CH.tela = 'perfil'; $('chEnvio').classList.remove('on'); topo(trocar ? 'Meu apelido' : 'Chat', '');
 $('chCorpo').innerHTML = `<div class="ch-form"><div style="font-size:46px">💬</div><h2>${trocar ? 'Trocar o apelido' : 'Como quer ser chamado?'}</h2>
  <p>Sem cadastro: escolha um apelido. É o nome que os outros veem nos grupos.</p><input id="chAp" maxlength="24" placeholder="Seu apelido" value="${esc(trocar ? CH.apelido : '')}">
  <button class="ch-bt" id="chApOk">${trocar ? 'Salvar' : 'Entrar no chat'}</button>${trocar ? '<button class="ch-bt2" id="chApVolta">Voltar</button><button class="ch-bt2" id="chOutro">📱 Usar este mesmo chat em outro aparelho</button><div id="chOutroTx"></div>' : ''}</div>`;
 const ok = async () => { const v = $('chAp').value.trim(); if (!v) return toast('Escreva um apelido');
  try { const p = await r('qt_chat_perfil', {p_apelido: v}); CH.eu = p.id; CH.apelido = p.apelido; inicio(); } catch (e) { erro(e); } };
 $('chApOk').onclick = ok; $('chAp').onkeydown = e => { if (e.key === 'Enter') ok(); };
 if (trocar) { $('chApVolta').onclick = lista;
  $('chOutro').onclick = () => { const l = LINK_APP + '#eu=' + encodeURIComponent(CH.tok);
   if (PC) return avisaPai({qr: l});                          // a plataforma mostra o QR code
   $('chOutroTx').innerHTML = `<p style="font-size:13px">Abra este link no outro aparelho (é a chave do seu chat: <b>não mande para ninguém</b>):</p><div class="ch-link">${esc(l)}</div><button class="ch-bt" id="chOutroCop">📋 Copiar</button>`;
   $('chOutroCop').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('Link copiado'), () => prompt('Copie:', l)); }; }
}

// ---------- lista de grupos ----------
async function lista() {
 CH.tela = 'lista'; CH.g = null; $('chEnvio').classList.remove('on'); clearTimeout(CH.t);
 topo('Chat', CH.apelido ? 'você: ' + CH.apelido : '', '<button id="chNovo">＋ Grupo</button><button id="chCodBt">🔑 Código</button><button id="chEuBt" title="Trocar o apelido">👤</button>');
 $('chNovo').onclick = novoGrupo; $('chCodBt').onclick = entrarCodigo; $('chEuBt').onclick = () => perfil(true);
 await carregaGrupos(); desenhaLista();
 CH.t = setTimeout(function loop() { if (CH.tela !== 'lista' || !$('chat').classList.contains('on')) return; carregaGrupos().then(desenhaLista); CH.t = setTimeout(loop, 8000); }, 8000);
}
async function carregaGrupos() { try { CH.grupos = await r('qt_chat_grupos') || []; } catch (e) { if (!/apelido/.test(e.message)) erro(e); } badgeNav(); }
function desenhaLista() {
 if (CH.tela !== 'lista') return;
 $('chCorpo').innerHTML = CH.grupos.length ? CH.grupos.map(g => {
  const u = g.ultima, txt = g.status === 'pendente' ? '⏳ Aguardando o dono aceitar a sua entrada' : u ? (u.apelido ? esc(u.apelido) + ': ' : '') + (u.img ? '📷 Foto ' : '') + esc(u.texto || '') : 'Sem mensagens';
  return `<div class="ch-g" data-g="${g.id}" data-st="${g.status}"><div class="ch-av">${esc((g.nome || '?').trim()[0].toUpperCase())}</div><b>${esc(g.nome)}${g.dono ? ' <span style="font-size:11px;color:var(--amar)">· dono</span>' : ''}</b>
   <span class="hr">${u ? quando(u.criado) : ''}</span><span class="ult">${txt}</span>${g.pendentes ? `<span class="ch-bad am" title="pedidos para entrar">${g.pendentes} pedido${g.pendentes > 1 ? 's' : ''}</span>` : g.nao_lidas ? `<span class="ch-bad">${g.nao_lidas}</span>` : '<span></span>'}</div>`; }).join('')
  : `<div class="ch-vazio"><div style="font-size:42px">💬</div><p>Você ainda não está em nenhum grupo.</p><p>Crie um grupo e mande o link de convite para quem quiser, ou entre num grupo pelo link ou pelo código que alguém te mandou.</p>
     <button class="ch-bt" id="chNovo2" style="max-width:300px">＋ Criar um grupo</button><button class="ch-bt2" id="chCod2" style="max-width:300px">🔑 Entrar com um código</button></div>`;
 const n2 = $('chNovo2'); if (n2) { n2.onclick = novoGrupo; $('chCod2').onclick = entrarCodigo; }
 $('chCorpo').querySelectorAll('.ch-g').forEach(el => el.onclick = () => { if (el.dataset.st === 'pendente') return toast('O dono do grupo ainda não aceitou a sua entrada'); conversa(+el.dataset.g); });
}
function badgeNav() {
 const n = CH.grupos.reduce((s, g) => s + (g.nao_lidas || 0) + (g.pendentes || 0), 0), b = nav.querySelector('[data-chat]');
 avisaPai({n, grupos: CH.grupos.map(g => ({id: g.id, nome: g.nome, nao: (g.nao_lidas || 0) + (g.pendentes || 0), ult: g.ultima ? (g.ultima.apelido || '') + ': ' + (g.ultima.img ? '📷 ' : '') + (g.ultima.texto || '') : ''}))});
 let i = b.querySelector('.ch-nb'); if (!n) { if (i) i.remove(); return; }
 if (!i) { i = document.createElement('i'); i.className = 'ch-nb'; b.firstElementChild.after(i); } i.textContent = n > 99 ? '99+' : n;
}
function pergunta(titulo, texto, rotulo, fn) {
 CH.tela = 'form'; $('chEnvio').classList.remove('on'); topo(titulo, '');
 $('chCorpo').innerHTML = `<div class="ch-form"><p>${texto}</p><input id="chIn" maxlength="${rotulo === 'Criar grupo' ? 40 : 80}"><button class="ch-bt" id="chInOk">${rotulo}</button><button class="ch-bt2" id="chInVolta">Voltar</button></div>`;
 const ok = () => { const v = $('chIn').value.trim(); if (v) fn(v); };
 $('chInOk').onclick = ok; $('chIn').onkeydown = e => { if (e.key === 'Enter') ok(); }; $('chInVolta').onclick = lista; $('chIn').focus();
}
function novoGrupo() { pergunta('Novo grupo', 'Nome do grupo (você será o dono: só você aceita pedidos, remove membros e apaga o grupo).', 'Criar grupo',
 async v => { try { const g = await r('qt_chat_criar', {p_nome: v}); toast('Grupo criado: mande o link de convite'); info(g.id); } catch (e) { erro(e); } }); }
function entrarCodigo() { pergunta('Entrar num grupo', 'Cole o link de convite (entra na hora) ou digite o código do grupo (o dono precisa aceitar).', 'Entrar', v => {
 const m = /[#&]g=([^&\s]+)/.exec(v); entrar(m ? decodeURIComponent(m[1]) : v); }); }
async function entrar(chave) {
 try { const x = await r('qt_chat_entrar', {p_chave: chave});
  if (x.status === 'ativo') { toast('Você entrou no grupo ' + x.nome); conversa(x.grupo); }
  else { toast('Pedido enviado: o dono de "' + x.nome + '" precisa aceitar'); lista(); } }
 catch (e) { erro(e); lista(); }
}

// ---------- conversa ----------
async function conversa(id) {
 CH.tela = 'conversa'; CH.g = id; CH.msgs = []; CH.fim = false; clearTimeout(CH.t);
 const g = CH.grupos.find(x => x.id === id); topo(g ? g.nome : 'Grupo', g ? g.membros + ' membro(s)' : '', '<button id="chInfo">⚙</button>');
 $('chInfo').onclick = () => info(id); $('chEnvio').classList.add('on');
 $('chCorpo').innerHTML = '<div class="ch-vazio">Carregando…</div>';
 try { const x = await r('qt_chat_msgs', {p_grupo: id}); CH.eu = x.eu; CH.msgs = x.msgs; CH.fim = x.msgs.length < 60; }
 catch (e) { erro(e); return lista(); }
 desenhaMsgs(true);
 if (!g) carregaGrupos().then(() => { const g2 = CH.grupos.find(x => x.id === id); if (g2 && CH.g === id) topo(g2.nome, g2.membros + ' membro(s)', '<button id="chInfo">⚙</button>'), $('chInfo').onclick = () => info(id); });
 CH.t = setTimeout(novas, 3000);
}
async function novas() {
 if (CH.tela !== 'conversa' || !$('chat').classList.contains('on')) return;
 const id = CH.g, ult = CH.msgs.length ? CH.msgs[CH.msgs.length - 1].id : 0;
 try { const x = await r('qt_chat_msgs', {p_grupo: id, p_depois: ult}); if (CH.g === id && x.msgs.length) { CH.msgs.push(...x.msgs.filter(m => m.id > ult)); desenhaMsgs(); } }
 catch (e) { if (/acesso/.test(e.message)) { toast('Você não está mais neste grupo'); return lista(); } }
 CH.t = setTimeout(novas, document.hidden ? 15000 : 3000);
}
async function anteriores() {
 const pri = CH.msgs.length ? CH.msgs[0].id : null; if (!pri) return;
 try { const x = await r('qt_chat_msgs', {p_grupo: CH.g, p_antes: pri}); const c = $('chCorpo'), h = c.scrollHeight;
  CH.msgs = x.msgs.concat(CH.msgs); CH.fim = x.msgs.length < 60; desenhaMsgs(); c.scrollTop = c.scrollHeight - h; } catch (e) { erro(e); }
}
function desenhaMsgs(desce) {
 const c = $('chCorpo'), noFim = desce || c.scrollHeight - c.scrollTop - c.clientHeight < 80, g = CH.grupos.find(x => x.id === CH.g), dono = g && g.dono;
 let dia = '', h = CH.fim ? '' : '<div style="text-align:center"><button class="ch-bt2" id="chAnt" style="width:auto">Carregar anteriores</button></div>';
 CH.msgs.forEach(m => {
  const d = diaTxt(m.criado); if (d !== dia) { dia = d; h += `<div class="ch-dia"><span>${d}</span></div>`; }
  if (m.sistema) { h += `<div class="ch-sis">${esc(m.texto)}</div>`; return; }
  const eu = m.uid === CH.eu;
  h += `<div class="ch-m ${eu ? 'eu' : 'ele'}" data-m="${m.id}" data-pode="${eu || dono ? 1 : 0}">${eu ? '' : `<span class="ap">${esc(m.apelido || '?')}</span>`}${m.img ? `<img data-img="${m.img}" alt="foto"${CH.fotos[m.img] ? ` src="${CH.fotos[m.img]}"` : ''}>` : ''}${m.texto ? esc(m.texto) : ''}<span class="hr">${new Date(m.criado).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span></div>`;
 });
 c.innerHTML = h || '<div class="ch-vazio">Nenhuma mensagem ainda. Diga oi! 👋</div>';
 const a = $('chAnt'); if (a) a.onclick = anteriores;
 c.querySelectorAll('img[data-img]').forEach(im => { if (!im.src) foto(+im.dataset.img).then(u => { if (u) { im.src = u; if (noFim) c.scrollTop = c.scrollHeight; } }); im.onclick = e => { e.stopPropagation(); ver(+im.dataset.img, +im.closest('.ch-m').dataset.m, im.closest('.ch-m').dataset.pode === '1'); }; });
 c.querySelectorAll('.ch-m[data-pode="1"]').forEach(el => el.onclick = () => confirma('Apagar a mensagem?', 'Ela some para todos do grupo.', () => apagar(+el.dataset.m)));
 if (noFim) c.scrollTop = c.scrollHeight;
}
async function foto(id) {
 if (CH.fotos[id]) return CH.fotos[id];
 try { const x = await r('qt_chat_foto', {p_img: id}); if (!x) return null; return CH.fotos[id] = 'data:' + x.tipo + ';base64,' + x.dados; } catch (e) { return null; }
}
async function apagar(id) { try { await r('qt_chat_apagar', {p_msg: id}); CH.msgs = CH.msgs.filter(m => m.id !== id); desenhaMsgs(); toast('Mensagem apagada'); } catch (e) { erro(e); } }
function ver(img, msg, pode) {
 const u = CH.fotos[img]; if (!u) return; $('chVer').querySelector('img').src = u; $('chVer').classList.add('on');
 $('chApFoto').style.display = pode ? '' : 'none';
 $('chBaixa').onclick = () => { const a = document.createElement('a'); a.href = u; a.download = 'quantum-chat-' + img + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); };
 $('chApFoto').onclick = () => confirma('Apagar a foto?', 'Ela some para todos do grupo.', () => { $('chVer').classList.remove('on'); apagar(msg); });
}
$('chFecha').onclick = () => $('chVer').classList.remove('on');
// enviar
async function envia(texto, img) {
 if (CH.enviando || !CH.g) return; CH.enviando = true; $('chMand').disabled = $('chFoto').disabled = true;
 try { await r('qt_chat_enviar', Object.assign({p_grupo: CH.g, p_texto: texto || null}, img ? {p_img: img.dados, p_tipo: img.tipo} : {}));
  clearTimeout(CH.t); await novas(); }
 catch (e) { erro(e); throw e; }
 finally { CH.enviando = false; $('chMand').disabled = $('chFoto').disabled = false; }
}
$('chMand').onclick = () => { const t = $('chTx').value.trim(); if (!t) return; envia(t).then(() => { $('chTx').value = ''; ajustaTx(); }, () => {}); };
const ajustaTx = () => { const t = $('chTx'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; t.style.overflowY = t.scrollHeight > 120 ? 'auto' : 'hidden'; };
$('chTx').oninput = ajustaTx;
$('chTx').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); $('chMand').click(); } };
$('chFoto').onclick = () => $('chArq').click();
$('chArq').onchange = async () => {
 const f = $('chArq').files[0]; $('chArq').value = ''; if (!f) return;
 try { toast('Enviando a foto…'); const img = await reduz(f); await envia($('chTx').value.trim(), img); $('chTx').value = ''; ajustaTx(); } catch (e) { if (e && e.message && !/servidor/.test(e.message)) erro(e); }
};
// reduz a foto no próprio celular (lado maior até 1600 px, JPEG) para caber no limite do servidor (~450 KB)
function reduz(f) {
 return new Promise((ok, falha) => {
  const u = URL.createObjectURL(f), im = new Image();
  im.onload = () => { URL.revokeObjectURL(u);
   let lado = 1600, q = 0.82, dados = '';
   for (let i = 0; i < 8; i++) {
    const k = Math.min(1, lado / Math.max(im.width, im.height)), cv = document.createElement('canvas');
    cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); const gx = cv.getContext('2d'); gx.fillStyle = '#fff'; gx.fillRect(0, 0, cv.width, cv.height); gx.drawImage(im, 0, 0, cv.width, cv.height);   // fundo branco: PNG transparente não fica preto
    dados = cv.toDataURL('image/jpeg', q).split(',')[1]; if (dados.length < 600000) return ok({dados, tipo: 'image/jpeg'});
    q = Math.max(0.5, q - 0.1); if (q <= 0.5) lado = Math.round(lado * 0.8);
   }
   falha(new Error('não consegui reduzir a foto'));
  };
  im.onerror = () => { URL.revokeObjectURL(u); falha(new Error('arquivo de imagem inválido')); };
  im.src = u;
 });
}

// ---------- dados do grupo (membros, convite, pedidos) ----------
async function info(id) {
 CH.tela = 'info'; CH.g = id; clearTimeout(CH.t); $('chEnvio').classList.remove('on');
 let x; try { x = await r('qt_chat_info', {p_grupo: id}); } catch (e) { erro(e); return lista(); }
 CH.info = x; CH.eu = x.eu; await carregaGrupos();
 topo(x.nome, 'dados do grupo', '');
 const link = LINK_APP + '#g=' + x.convite, ativos = x.membros.filter(m => m.status === 'ativo'), pend = x.membros.filter(m => m.status === 'pendente');
 $('chCorpo').innerHTML = `
  ${pend.length ? `<div class="ch-sec"><h4>Pedidos para entrar (${pend.length})</h4>${pend.map(m => `<div class="ch-mb"><span>${esc(m.apelido)}</span><button class="b-liga" data-ac="${m.id}">Aceitar</button><button class="b-enc" data-rc="${m.id}">Recusar</button></div>`).join('')}</div>` : ''}
  <div class="ch-sec"><h4>Convidar</h4>
   <div style="font-size:13px">Link de convite <span style="color:var(--sub)">(quem abrir entra na hora)</span></div><div class="ch-link">${esc(link)}</div>
   <div class="bts" style="margin-top:4px"><button class="ch-bt" id="chCop">📋 Copiar link</button>${navigator.share ? '<button class="ch-bt2" id="chComp" style="margin:0">↗ Compartilhar</button>' : ''}</div>
   <div style="font-size:13px;margin-top:12px">Código do grupo <span style="color:var(--sub)">(quem digitar pede para entrar; ${x.dono ? 'você aceita' : 'o dono aceita'})</span></div><div class="ch-cod">${esc(x.codigo)}</div>
   ${x.dono ? '<button class="ch-bt2" id="chNovoConv">🔄 Gerar link e código novos (os antigos param de funcionar)</button>' : ''}</div>
  <div class="ch-sec"><h4>Membros (${ativos.length})</h4>${ativos.map(m => `<div class="ch-mb"><span>${esc(m.apelido)}${m.id === x.eu ? ' (você)' : ''}${m.dono ? ' <b style="color:var(--amar);font-size:12px">· dono</b>' : ''}</span>${x.dono && !m.dono ? `<button class="b-enc" data-rm="${m.id}">Remover</button>` : ''}</div>`).join('')}</div>
  <div class="ch-sec">${x.dono ? '<button class="ch-bt2" id="chRen" style="margin-top:0">✎ Renomear o grupo</button><button class="b-enc" id="chApG" style="width:100%;margin-top:8px">🗑 Apagar o grupo</button>'
   : '<button class="b-enc" id="chSair" style="width:100%">Sair do grupo</button>'}</div>
  <button class="ch-bt2" id="chVoltaConv">‹ Voltar para a conversa</button>`;
 const c = $('chCorpo');
 $('chVoltaConv').onclick = () => conversa(id);
 $('chCop').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Link copiado'), () => { prompt('Copie o link:', link); }); };
 if ($('chComp')) $('chComp').onclick = () => navigator.share({title: 'Grupo ' + x.nome, text: 'Entre no grupo "' + x.nome + '" do Quantum:', url: link}).catch(() => {});
 c.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => r('qt_chat_aceitar', {p_grupo: id, p_usuario: +b.dataset.ac, p_sim: true}).then(() => info(id), erro));
 c.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => r('qt_chat_aceitar', {p_grupo: id, p_usuario: +b.dataset.rc, p_sim: false}).then(() => info(id), erro));
 c.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => confirma('Remover do grupo?', 'Ele deixa de ver o grupo. Pode voltar só com um convite novo.', () => r('qt_chat_remover', {p_grupo: id, p_usuario: +b.dataset.rm}).then(() => info(id), erro)));
 if ($('chNovoConv')) $('chNovoConv').onclick = () => confirma('Gerar link e código novos?', 'O link e o código antigos param de funcionar (quem já está no grupo continua).', () => r('qt_chat_grupo_editar', {p_grupo: id, p_novo_convite: true}).then(() => info(id), erro));
 if ($('chRen')) $('chRen').onclick = () => pergunta('Renomear o grupo', 'Nome novo do grupo:', 'Salvar', v => r('qt_chat_grupo_editar', {p_grupo: id, p_nome: v}).then(() => carregaGrupos().then(() => info(id)), erro));
 if ($('chApG')) $('chApG').onclick = () => confirma('Apagar o grupo "' + x.nome + '"?', 'Todas as mensagens e fotos são apagadas para todos. Não dá para desfazer.', () => r('qt_chat_apagar_grupo', {p_grupo: id}).then(() => { toast('Grupo apagado'); lista(); }, erro));
 if ($('chSair')) $('chSair').onclick = () => confirma('Sair do grupo?', 'Para voltar, você vai precisar de um convite.', () => r('qt_chat_remover', {p_grupo: id, p_usuario: x.eu}).then(() => { toast('Você saiu do grupo'); lista(); }, erro));
}

// mensagens novas com o chat fechado: número na aba (a cada 30 s, só se já tem apelido)
setInterval(() => { if (!$('chat').classList.contains('on') && CH.eu) carregaGrupos(); }, 30000);
r('qt_chat_perfil').then(p => { if (p) { CH.eu = p.id; CH.apelido = p.apelido; carregaGrupos(); } }, () => {});
let temConv = false; try { temConv = !!localStorage.getItem('qc_chat_conv'); } catch (e) {}
if (temConv || (PC && !BG)) abre();
window.QC_CHAT = CH;
})();
