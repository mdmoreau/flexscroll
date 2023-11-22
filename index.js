export default (root) => {
  const frame = root.querySelector('[data-flexscroll-frame]');
  const viewport = root.querySelector('[data-flexscroll-viewport]');
  const items = root.querySelectorAll('[data-flexscroll-item]');
  const prev = root.querySelector('[data-flexscroll-prev]');
  const next = root.querySelector('[data-flexscroll-next]');
  const pages = root.querySelectorAll('[data-flexscroll-page]');

  let active = [];

  const getAlignment = () => {
    return getComputedStyle(items[0]).getPropertyValue('scroll-snap-align');
  };

  const getCenter = () => {
    const direction = getDirection();
    const style = getComputedStyle(viewport);
    const rtl = direction === 'row' && style.getPropertyValue('direction') === 'rtl';

    let current, start, end, offset, target;

    if (direction === 'row') {
      current = viewport.scrollLeft;
      start = parseInt(style.getPropertyValue('scroll-padding-inline-start'), 10) || 0;
      end = parseInt(style.getPropertyValue('scroll-padding-inline-end'), 10) || 0;
      offset = (viewport.offsetWidth - start - end) / 2;
    }

    if (direction === 'column') {
      current = viewport.scrollTop;
      start = parseInt(style.getPropertyValue('scroll-padding-block-start'), 10) || 0;
      end = parseInt(style.getPropertyValue('scroll-padding-block-end'), 10) || 0;
      offset = (viewport.offsetHeight - start - end) / 2;
    }

    target = current + (rtl ? end : start) + offset;

    return getClosest(target);
  };

  const getClosest = (target) => {
    const direction = getDirection();

    const proximities = active.map((index) => {
      const item = items[index];

      let center, proximity;

      if (direction === 'row') {
        center = item.offsetLeft + item.offsetWidth / 2;
      }

      if (direction === 'column') {
        center = item.offsetTop + item.offsetHeight / 2;
      }

      proximity = Math.abs(center - target);

      return { index, proximity };
    });

    return proximities.sort((a, b) => a.proximity - b.proximity)[0]?.index;
  };

  const getDirection = () => {
    return getComputedStyle(viewport).getPropertyValue('flex-direction');
  };

  const getIndex = () => {
    const alignment = getAlignment();

    if (alignment === 'start') return active[0];
    if (alignment === 'end') return active[active.length - 1];
    if (alignment === 'center') return getCenter();
  };

  const getPosition = (index) => {
    const alignment = getAlignment();
    const direction = getDirection();
    const item = items[index];
    const style = getComputedStyle(viewport);
    const rtl = direction === 'row' && style.getPropertyValue('direction') === 'rtl';

    let target, offset, start, end;

    if (direction === 'row') {
      target = item.offsetLeft;
      start = parseInt(style.getPropertyValue('scroll-padding-inline-start'), 10) || 0;
      end = parseInt(style.getPropertyValue('scroll-padding-inline-end'), 10) || 0;
      offset = viewport.offsetWidth - item.offsetWidth + (rtl ? end - start : start - end);
    }

    if (direction === 'column') {
      target = item.offsetTop;
      start = parseInt(style.getPropertyValue('scroll-padding-block-start'), 10) || 0;
      end = parseInt(style.getPropertyValue('scroll-padding-block-end'), 10) || 0;
      offset = viewport.offsetHeight - item.offsetHeight + start - end;
    }

    if (alignment === 'start') return rtl ? target + end - offset : target - start;
    if (alignment === 'end') return rtl ? target - start : target + end - offset;
    if (alignment === 'center') return target - offset / 2;
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

    return Math.round(current / max * 100) / 100;
  };

  const setDisabled = () => {
    const progress = getProgress();

    prev?.toggleAttribute('disabled', progress === 0);
    next?.toggleAttribute('disabled', progress === 1);
  };

  const setScroll = (index) => {
    const item = items[index];

    if (item) {
      const direction = getDirection();
      const position = getPosition(index);
      const x = direction === 'row' ? position : 0;
      const y = direction === 'column' ? position : 0;

      viewport.scroll(x, y);
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const { target, isIntersecting } = entry;
      const index = [...items].indexOf(target);

      if (isIntersecting) {
        active.push(index);
        target.removeAttribute('inert');
        target.setAttribute('data-flexscroll-item', 'active');
        pages[index]?.setAttribute('data-flexscroll-page', 'active');
      } else {
        active = active.filter((i) => i !== index);
        target.setAttribute('inert', '');
        target.setAttribute('data-flexscroll-item', '');
        pages[index]?.setAttribute('data-flexscroll-page', '');
      }

      active = [...new Set(active)].sort((a, b) => a - b);

      root.dispatchEvent(new CustomEvent('change', {
        detail: {
          items,
          active,
        },
      }));
    });
  }, {
    root: frame || viewport,
    rootMargin: '1px',
    threshold: 1,
  });

  items.forEach((item) => {
    observer.observe(item);
  });

  if (prev) {
    prev.addEventListener('click', () => {
      const index = getIndex() - 1;
      setScroll(index);
    });
  }

  if (next) {
    next.addEventListener('click', () => {
      const index = getIndex() + 1;
      setScroll(index);
    });
  }

  if (prev || next) {
    setDisabled();
    viewport.addEventListener('scroll', setDisabled);
  }

  pages.forEach((page, index) => {
     page.addEventListener('click', () => {
       setScroll(index);
     });
  });
};
