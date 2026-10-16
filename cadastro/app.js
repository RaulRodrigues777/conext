(() => {
  'use strict';
  const form = document.getElementById('registration');
  const steps = [...document.querySelectorAll('.form-step')];
  const nav = [...document.querySelectorAll('.step-nav li')];
  const error = document.getElementById('formError');
  const next = document.getElementById('next');
  const submit = document.getElementById('submit');
  const previous = document.getElementById('previous');
  const progress = document.querySelector('[role=progressbar]');
  const params = new URLSearchParams(location.search);
  let current = 0, sending = false, sent = false;
  const requestId = crypto.randomUUID();
  const digits = value => value.replace(/\D/g, '');
  const value = name => form.elements.namedItem(name).value.trim();
  const equipmentValues = () => [...form.querySelectorAll('[name=equipamentos]:checked')].map(input => input.value);
  const channel = (params.get('canal') || 'Lead MPT').replace(/[\x00-\x1f]/g, '').slice(0, 100);
  const attribution = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => { attribution[key] = (params.get(key) || '').slice(0, 180); });
  const page = location.origin + location.pathname;
  fetch('/api/cadastro', {cache:'no-store'}).then(r => r.json()).then(result => {
    if (result.disponivel !== true) document.getElementById('availability').hidden = false;
  }).catch(() => { document.getElementById('availability').hidden = false; });
  function showError(message) { error.textContent = message; error.hidden = !message; }
  function address() { return `${value('logradouro')}, ${value('numero')}${value('complemento') ? ', ' + value('complemento') : ''} | ${value('bairro')} | ${value('cidade')}/${value('uf')} | CEP ${value('cep')}`; }
  function review() {
    const rows = [ ['Contato', `${value('nome')} · ${value('whatsapp')}`], ['E-mail', value('email')], ['Empresa / responsável', value('razao_social')], ['CPF / CNPJ', value('documento').replace(/.(?=.{4})/g, '•')], ['Equipamentos', equipmentValues().join(', ')], ['Endereço', address()], ['Canal', channel] ];
    document.getElementById('reviewData').replaceChildren(...rows.flatMap(([label, text]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = text; return [dt, dd]; }));
  }
  function showStep(index) {
    current = index;
    steps.forEach((step, i) => { step.hidden = i !== index; });
    nav.forEach((item, i) => { item.classList.toggle('current', i === index); item.classList.toggle('complete', i < index); if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
    previous.hidden = index === 0; next.hidden = index === 3; submit.hidden = index !== 3;
    const percent = (index + 1) * 25;
    document.getElementById('stepLabel').textContent = `ETAPA 0${index + 1} DE 04`;
    document.getElementById('stepPercent').textContent = `${percent}%`;
    document.getElementById('progressFill').style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    showError(''); if (index === 3) review();
    document.querySelector('.form-shell').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    document.getElementById(`title${index}`).focus({ preventScroll: true });
  }
  function validate(index) {
    const phone = form.elements.whatsapp;
    const normalizedPhone = digits(phone.value).replace(/^55(?=\d{10,11}$)/, '');
    phone.setCustomValidity(/^\d{10,11}$/.test(normalizedPhone) ? '' : 'Informe um telefone com DDD.');
    const doc = form.elements.documento;
    const normalizedDoc = doc.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    doc.setCustomValidity(/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(normalizedDoc) ? '' : 'Confira o CPF (11 dígitos) ou CNPJ (14 caracteres).');
    form.elements.cep.setCustomValidity(/^\d{8}$/.test(digits(value('cep'))) ? '' : 'Informe o CEP completo, com 8 dígitos.');
    for (const input of steps[index].querySelectorAll('input, select, textarea')) { if (!input.checkValidity()) { input.reportValidity(); input.focus(); return false; } }
    if (index === 1 && !equipmentValues().length) { showError('Selecione pelo menos um equipamento para continuar.'); form.querySelector('[name=equipamentos]').focus(); return false; }
    return true;
  }
  next.addEventListener('click', () => { if (validate(current)) showStep(current + 1); });
  previous.addEventListener('click', () => showStep(current - 1));
  document.getElementById('reviewEdit').addEventListener('click', () => showStep(0));
  form.addEventListener('input', event => { if (event.target.setCustomValidity) event.target.setCustomValidity(''); showError(''); });
  document.getElementById('equipmentGrid').addEventListener('change', () => { const count = equipmentValues().length; document.getElementById('selectionCount').textContent = count ? `${count} tecnologia${count > 1 ? 's' : ''} selecionada${count > 1 ? 's' : ''}` : 'Nenhuma tecnologia selecionada'; });
  form.elements.whatsapp.addEventListener('blur', () => { const d = digits(value('whatsapp')).replace(/^55(?=\d{10,11}$)/, ''); if (d.length === 10 || d.length === 11) form.elements.whatsapp.value = `(${d.slice(0,2)}) ${d.slice(2,-4)}-${d.slice(-4)}`; });
  form.elements.cep.addEventListener('input', () => { const d = digits(value('cep')).slice(0,8); form.elements.cep.value = d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d; });
  form.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') { event.preventDefault(); if (current < 3) next.click(); } });
  const privacy = document.getElementById('privacy');
  document.getElementById('privacyOpen').addEventListener('click', () => privacy.showModal());
  document.getElementById('privacyClose').addEventListener('click', () => privacy.close());
  privacy.addEventListener('click', event => { if (event.target === privacy) { const r = privacy.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) privacy.close(); } });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (sending || sent) return;
    if (current < 3) { if (validate(current)) showStep(current + 1); return; }
    for (let i = 0; i < steps.length; i++) { if (!validate(i)) { if (i !== current) showStep(i); return; } }
    const payload = Object.fromEntries(new FormData(form));
    payload.equipamentos = equipmentValues(); payload.documento = value('documento').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    payload.whatsapp = digits(value('whatsapp')).replace(/^55(?=\d{10,11}$)/, '');
    payload.canal = channel; payload.request_id = requestId; payload.pagina = page; payload.atribuicao = attribution;
    sending = true; submit.disabled = true; previous.disabled = true; submit.textContent = 'Enviando seu cadastro…'; showError('');
    try {
      const response = await fetch('/api/cadastro', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), signal: AbortSignal.timeout(45000) });
      const result = await response.json();
      if (!response.ok || result.sucesso !== true || !result.idCadastro) throw new Error(result.mensagem || 'Não foi possível confirmar o cadastro. Tente novamente.');
      sent = true; form.hidden = true;
      document.getElementById('protocol').textContent = `Protocolo ${result.idCadastro}`;
      document.getElementById('successWhatsApp').href = `https://wa.me/5511991787873?text=${encodeURIComponent(`Olá! Sou ${value('nome')}. Concluí meu cadastro de primeira reserva na CO NEXT. Protocolo: ${result.idCadastro}. Tenho interesse em ${equipmentValues().join(', ')}.`)}`;
      document.getElementById('success').hidden = false; document.getElementById('successTitle').focus();
      document.getElementById('stepLabel').textContent = 'CADASTRO RECEBIDO';
    } catch (err) {
      showError(err.name === 'TimeoutError' ? 'A confirmação demorou mais que o esperado. Tente novamente sem fechar esta página; o mesmo protocolo evita duplicidade.' : err.message || 'Não conseguimos confirmar o envio. Verifique sua conexão e tente novamente.');
      const help = document.createElement('a'); help.href = 'https://wa.me/5511991787873'; help.target = '_blank'; help.rel = 'noopener'; help.textContent = ' Falar com a equipe pelo WhatsApp ↗'; error.append(help);
    } finally { sending = false; if (!sent) { submit.disabled = false; previous.disabled = false; submit.textContent = 'Enviar meu cadastro ↗'; } }
  });
})();
