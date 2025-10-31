(function(){
  const startBtn = document.getElementById('start');
  const quitBtn = document.getElementById('quit');
  const corridor = document.querySelector('.corridor');
  const player = document.querySelector('.player');

  let running = false;
  let pos = { x: 24, y: 24 };

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function loop(){
    if(!running) return;
    // Simple random ambient shake for tension placeholder
    if(Math.random() < 0.008){
      corridor.classList.add('shake');
      setTimeout(()=>corridor.classList.remove('shake'), 520);
    }
    requestAnimationFrame(loop);
  }

  function onKey(e){
    if(!running) return;
    const step = 6;
    if(['ArrowLeft','q','Q','a','A'].includes(e.key)) pos.x -= step;
    if(['ArrowRight','d','D'].includes(e.key)) pos.x += step;
    if(['ArrowUp','z','Z','w','W'].includes(e.key)) pos.y += step;
    if(['ArrowDown','s','S'].includes(e.key)) pos.y -= step;

    const rect = corridor.getBoundingClientRect();
    const maxX = rect.width - 48 - 24;
    const maxY = rect.height - 64 - 24;
    pos.x = clamp(pos.x, 24, maxX);
    pos.y = clamp(pos.y, 24, maxY);
    player.style.left = pos.x + 'px';
    player.style.bottom = pos.y + 'px';
  }

  startBtn?.addEventListener('click', ()=>{
    running = true;
    window.addEventListener('keydown', onKey);
    loop();
  });

  quitBtn?.addEventListener('click', ()=>{
    running = false;
    window.removeEventListener('keydown', onKey);
  });
})();
