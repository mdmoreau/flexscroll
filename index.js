export default (root) => {
  const frame = root.querySelector('[data-flexscroll-frame]');
  const viewport = root.querySelector('[data-flexscroll-viewport]');
  const prev = root.querySelector('[data-flexscroll-prev]');
  const next = root.querySelector('[data-flexscroll-next]');

  let active = [];
  let items, gotos;

  const getIndex = (type) => {
    const min = 0;
    const max = items.length - 1;

    if (type === 'prev') {
      const target = active[0] - 1;
      return Number.isInteger(target) ? (target >= min ? target : min) : false;
    }

    if (type === 'next') {
      const target = active[active.length - 1] + 1;
      return Number.isInteger(target) ? (target <= max ? target : max) : false;
    }
  };

  const getDirection = () => {
    return getComputedStyle(viewport).getPropertyValue('flex-direction');
  };

  const getPositions = (index) => {
    const direction = getDirection();
    const item = items[index];
    const styles = getComputedStyle(viewport);
    const rtl = direction === 'row' && styles.getPropertyValue('direction') === 'rtl';

    let target, offset, start, end;

    if (direction === 'row') {
      target = item.offsetLeft;
      start = parseInt(styles.getPropertyValue('scroll-padding-inline-start'), 10) || 0;
      end = parseInt(styles.getPropertyValue('scroll-padding-inline-end'), 10) || 0;
      offset = viewport.offsetWidth - item.offsetWidth + (rtl ? end - start : start - end);
    }

    if (direction === 'column') {
      target = item.offsetTop;
      start = parseInt(styles.getPropertyValue('scroll-padding-block-start'), 10) || 0;
      end = parseInt(styles.getPropertyValue('scroll-padding-block-end'), 10) || 0;
      offset = viewport.offsetHeight - item.offsetHeight + start - end;
    }

    return {
      start: rtl ? target + end - offset : target - start,
      end: rtl ? target - start : target + end - offset,
      center: target - offset / 2,
    }
  };

  const getLoop = () => {
    return getComputedStyle(viewport).getPropertyValue('--flexscroll-loop');
  };

  const getMove = () => {
    return getComputedStyle(viewport).getPropertyValue('--flexscroll-move');
  };

  const getAlign = (index) => {
    return getComputedStyle(items[index]).getPropertyValue('scroll-snap-align');
  };

  const getProgress = () => {
    const direction = getDirection();

    let current, max;

    if (direction === 'row') {
      current = Math.abs(viewport.scrollLeft);
      max = viewport.scrollWidth - viewport.clientWidth;
    }

    if (direction === 'column') {
      current = viewport.scrollTop;
      max = viewport.scrollHeight - viewport.clientHeight;
    }

    return max === 0 ? -1 : Math.round(current / max * 100) / 100;
  };

  const setScroll = (index, type = null) => {
    const direction = getDirection();
    const positions = getPositions(index);
    const move = getMove();

    let align = getAlign(index);

    if (move && type === 'prev') {
      if (move === 'one') {
        align = 'start';
      }

      if (move === 'all') {
        align = 'end';
      }
    }

    if (move && type === 'next') {
      if (move === 'one') {
        align = 'end';
      }

      if (move === 'all') {
        align = 'start';
      }
    }

    const x = direction === 'row' ? positions[align] : 0;
    const y = direction === 'column' ? positions[align] : 0;

    viewport.scroll(x, y);
  };

  const setDisabled = () => {
    const progress = getProgress();
    const loop = getLoop();
    const start = progress === 0 || progress === -1;
    const end = progress === 1 || progress === -1;

    if (loop === 'true') {
      prev?.removeAttribute('disabled');
      next?.removeAttribute('disabled');
      prev?.setAttribute('data-flexscroll-prev', start ? 'loop' : '');
      next?.setAttribute('data-flexscroll-next', end ? 'loop' : '');
    } else {
      prev?.toggleAttribute('disabled', start);
      next?.toggleAttribute('disabled', end);
      prev?.setAttribute('data-flexscroll-prev', '');
      next?.setAttribute('data-flexscroll-next', '');
    }
  };

  const init = () => {
    items = root.querySelectorAll('[data-flexscroll-item]');
    gotos = root.querySelectorAll('[data-flexscroll-goto]');

    for (const item of items) {
      observer.observe(item);
    }
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const { target, isIntersecting } = entry;
      const index = [...items].indexOf(target);

      if (isIntersecting) {
        active.push(index);
        target.removeAttribute('inert');
        gotos[index]?.setAttribute('data-flexscroll-goto', '');
      } else {
        active = active.filter((i) => i !== index);
        target.setAttribute('inert', '');
        gotos[index]?.setAttribute('data-flexscroll-goto', 'inert');
      }

      active = [...new Set(active)].sort((a, b) => a - b);

      root.dispatchEvent(new CustomEvent('change', {
        detail: {
          items,
          active,
        },
      }));

      setDisabled();
    }
  }, {
    root: frame || viewport,
    rootMargin: '1px',
    threshold: 1,
  });

  if (prev) {
    prev.addEventListener('click', () => {
      const loop = prev.getAttribute('data-flexscroll-prev') === 'loop';

      if (loop) {
        setScroll(items.length - 1);
      } else {
        const index = getIndex('prev');
        Number.isInteger(index) && setScroll(index, 'prev');
      }
    });
  }

  if (next) {
    next.addEventListener('click', () => {
      const loop = next.getAttribute('data-flexscroll-next') === 'loop';

      if (loop) {
        setScroll(0);
      } else {
        const index = getIndex('next');
        Number.isInteger(index) && setScroll(index, 'next');
      }
    });
  }

  if (prev || next) {
    viewport.addEventListener('scroll', setDisabled);
    setDisabled();
  }

  root.addEventListener('click', (e) => {
    const { target } = e;

    if (target.hasAttribute('data-flexscroll-goto')) {
      const index = [...gotos].indexOf(target);
      setScroll(index);
    }
  });

  root.addEventListener('update', init);
  init();
};
