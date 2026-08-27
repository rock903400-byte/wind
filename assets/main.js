(function(){
  // 這裡刻意不用 IntersectionObserver。快速捲動時元素可能在一個 frame 內
  // 從「視窗下方」跳到「視窗上方」，兩端狀態都是未相交 —— IO 不會觸發，
  // 那些元素就永遠停在 opacity:0，捲回上面是一片空白。實測 23 個有 19 個中招。
  // 改用 rAF 節流的掃描：只問「有沒有到過視窗內」，不管中間怎麼跳。

  // CSS 的 @media(prefers-reduced-motion) 蓋不掉 JS 顯式傳入的 behavior:'smooth'
  // (html{scroll-behavior} 只管 CSS 觸發的捲動)，這裡自己讀一次偏好。
  var SCROLL_BEHAVIOR = (window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

  var pending = [].slice.call(document.querySelectorAll('.reveal'));

  // 同一列的卡片錯開進場，整塊一起蹦出來沒有節奏可言。
  // 欄數在 reveal 當下才從 computed style 讀 —— grid 用 auto-fill，欄數隨寬度變。
  function stagger(el){
    var grid = el.parentElement;
    if(!grid || !/works-grid|strengths-grid/.test(grid.className)) return 0;
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    return ([].indexOf.call(grid.children, el) % cols) * 90;
  }

  var ticking = false;
  function sweep(){
    ticking = false;
    for(var i = pending.length - 1; i >= 0; i--){
      var el = pending[i];
      var r = el.getBoundingClientRect();
      // 收折或被篩選掉的卡是 display:none，rect 全 0 會被誤判成「已進場」而提前消耗掉，
      // 之後展開就沒有淡入。跳過它們，改由 revealNow() 在真正露出的當下處理。
      if(!r.height) continue;
      if(r.top < window.innerHeight * 0.9){
        el.style.transitionDelay = stagger(el) + 'ms';
        el.classList.add('visible');
        pending.splice(i, 1);
      }
    }
    if(!pending.length){           // 全部揭示後自己拆掉監聽，不留成本
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }
  function onScroll(){
    if(!ticking){ ticking = true; requestAnimationFrame(sweep); }
  }

  // 從 display:none 變回可見的卡，補一次進場動畫（略帶錯開）
  function revealNow(el, delay){
    var i = pending.indexOf(el);
    if(i > -1) pending.splice(i, 1);
    el.style.transitionDelay = (delay || 0) + 'ms';
    void el.offsetWidth;          // 強制 reflow，transition 才會從 opacity:0 起跑
    el.classList.add('visible');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});

  // 鼠標動態 Spotlight 光影追蹤
  var spotlightCards = document.querySelectorAll('.work-card, .strength-card');
  spotlightCards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    });
  });

  // 回到頂部 (Back to Top) 懸浮按鈕與 Footer 連結
  var btt = document.getElementById('backToTop');
  var footerBtt = document.getElementById('footerBackToTop');
  
  function scrollToTop(e){
    if(e) e.preventDefault();
    window.scrollTo({top: 0, behavior: SCROLL_BEHAVIOR});
  }

  if(btt){
    window.addEventListener('scroll', function(){
      if(window.scrollY > 300){
        btt.classList.add('show');
      } else {
        btt.classList.remove('show');
      }
    }, {passive:true});
    btt.addEventListener('click', scrollToTop);
  }
  if(footerBtt){
    footerBtt.addEventListener('click', scrollToTop);
  }

  // 作品篩選 × 收折：預設只顯示 9 張（3 張旗艦 + 6 張），其餘帶 .extra
  var filterBtns = document.querySelectorAll('.filter-row .filter-btn');
  var workCards = [].slice.call(document.querySelectorAll('.work-card'));
  var grid = document.getElementById('worksGrid');
  var showAllBtn = document.getElementById('showAllWorks');
  var showAllWrap = document.getElementById('showAllWrap');
  var countEl = document.getElementById('filterCount');
  var currentCat = 'all';
  var expanded = false;

  function applyView(animate){
    // 收折只在「全部」時有意義；選了分類就一律全顯示，否則會出現
    // 「只剩 2 張卻還掛著『顯示全部 19 項』」這種鬼畫面
    var collapsed = (currentCat === 'all') && !expanded;
    grid.classList.toggle('collapsed', collapsed);

    var shown = 0;
    workCards.forEach(function(card){
      var match = (currentCat === 'all') || (card.getAttribute('data-cat') === currentCat);
      card.classList.toggle('hidden', !match);
      if(match && !(collapsed && card.classList.contains('extra'))){
        if(animate) revealNow(card, (shown % 3) * 70);
        shown++;
      }
    });

    if(countEl) countEl.textContent = '顯示 ' + shown + ' / ' + workCards.length + ' 項作品';
    if(showAllWrap) showAllWrap.hidden = (currentCat !== 'all');
    if(showAllBtn){
      showAllBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      showAllBtn.textContent = expanded
        ? '收合作品列表 ↑'
        : '顯示全部 ' + workCards.length + ' 項作品 ↓';
    }
  }
  // 首次只設定計數與收折狀態，不強制揭示 —— 讓 .reveal 照常做捲動進場
  applyView(false);

  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      currentCat = btn.getAttribute('data-cat');
      filterBtns.forEach(function(b){
        var on = (b === btn);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyView(true);            // expanded 刻意不重設：手動展開過就記住
    });
  });

  if(showAllBtn){
    showAllBtn.addEventListener('click', function(){
      expanded = !expanded;
      applyView(true);
      // 收合時人可能已經捲到很下面，收完會停在半空中 → 拉回作品區開頭
      if(!expanded) document.getElementById('works').scrollIntoView({behavior:SCROLL_BEHAVIOR, block:'start'});
    });
  }

  // 服務卡「看案例」：直接觸發對應的篩選鈕，不另寫一套篩選邏輯
  document.querySelectorAll('.svc-jump[data-jump]').forEach(function(b){
    b.addEventListener('click', function(){
      var target = document.querySelector('.filter-btn[data-cat="' + b.getAttribute('data-jump') + '"]');
      if(target) target.click();
      document.getElementById('works').scrollIntoView({behavior:SCROLL_BEHAVIOR, block:'start'});
    });
  });

  // 卡片整卡可點：點到非連結區域 → 以卡片內 btn-demo 的目標開新分頁
  grid.addEventListener('click', function(e){
    if(e.target.closest('a')) return;
    // 拖曳選取卡片文字，放開滑鼠一樣會派送 click —— 不擋掉會變成「想複製卻被開新分頁」
    var sel = window.getSelection && window.getSelection();
    if(sel && !sel.isCollapsed && sel.toString().length) return;
    var card = e.target.closest('.work-card');
    if(!card) return;
    var demo = card.querySelector('.btn-demo');
    var href = demo && demo.getAttribute('href');
    if(!href) return;
    // window.open(url,'_blank',features) 帶 features 字串會被部分瀏覽器當彈窗擋掉，
    // 改用暫時 anchor 觸發，走的是一般連結路徑。
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  });
  // 鍵盤支援：work-card 有 role="link" tabindex="0"，需支援 Enter / Space 開啟
  grid.addEventListener('keydown', function(e){
    var card = e.target.closest('.work-card');
    if(!card) return;
    if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    var demo = card.querySelector('.btn-demo');
    var href = demo && demo.getAttribute('href');
    if(!href) return;
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  });

  // ---- Scrollspy 導覽列即時錨點連動 ----
  var spyLinks = [].slice.call(document.querySelectorAll('.site-links a[href^="#"]'));
  var spySections = spyLinks.map(function(link){
    var id = link.getAttribute('href').slice(1);
    return document.getElementById(id);
  }).filter(Boolean);
  var siteLinksNav = document.querySelector('.site-links');
  var activeSpyLink = null;
  var spyTicking = false;

  function updateScrollspy(){
    spyTicking = false;
    var scrollPos = window.scrollY + 140; // 配合 sticky nav 高度與頂部緩衝
    var current = null;

    for(var i = 0; i < spySections.length; i++){
      var sec = spySections[i];
      if(sec.offsetTop <= scrollPos){
        current = sec;
      }
    }

    spyLinks.forEach(function(link){
      var isMatch = current && (link.getAttribute('href') === '#' + current.id);
      link.classList.toggle('active', isMatch);
      if(isMatch && link !== activeSpyLink){
        activeSpyLink = link;
        // 手機版導覽橫向捲動時，自動將 Active 項目平滑置中
        if(siteLinksNav && window.innerWidth <= 820){
          var linkLeft = link.offsetLeft;
          var linkWidth = link.offsetWidth;
          var navWidth = siteLinksNav.offsetWidth;
          siteLinksNav.scrollTo({
            left: linkLeft - (navWidth / 2) + (linkWidth / 2),
            behavior: SCROLL_BEHAVIOR
          });
        }
      }
    });

    if(!current && activeSpyLink){
      activeSpyLink = null;
      spyLinks.forEach(function(l){ l.classList.remove('active'); });
    }
  }

  function onSpyScroll(){
    if(!spyTicking){
      spyTicking = true;
      requestAnimationFrame(updateScrollspy);
    }
  }

  window.addEventListener('scroll', onSpyScroll, {passive:true});
  window.addEventListener('resize', onSpyScroll, {passive:true});
  updateScrollspy();
})();
