// ==UserScript==
// @name         Filter Github comments
// @namespace    me
// @version      0.1
// @description  Filter comments
// @author       You
// @match        https://github.com/*/issues/*
// @match        https://github.com/*/pull/*
// @grant        none
// ==/UserScript==

const roleToAriaLabel = {
  author: '"This user is the author of this "',
  owner: '"This user is the owner of the "',
  member: '"This user is a member of the "',
  contributor: '"This user has previously committed to the "',
  rando: null,
};

const roleToDisplayName = {
  author: 'Author',
  owner: 'Owner',
  member: 'Member',
  contributor: 'Contributor',
  rando: 'Rando',
};

function createBox({ direction = 'row' } = {}) {
  const box = document.createElement('div');
  box.style.display = 'flex';
  box.style['align-items'] = 'center';
  box.style['flex-direction'] = direction;
  return box;
}

function renderCheckboxes({ root }) {
  const box = createBox();
  box.style.margin = '0 24px';
  box.style.width = '100%';

  const checkboxes = Object.keys(roleToDisplayName).map(role => {
    const checkbox = document.createElement('input');
    checkbox.style['margin-right'] = '4px';
    checkbox.type = 'checkbox';
    checkbox.name = 'role';
    checkbox.value = role;
    checkbox.checked = true;
    checkbox.onchange = () => updateVisibleComments({
      roles: checkboxes
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value)
    });

    return checkbox;
  });

  const labels = checkboxes.map(checkbox => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style['align-items'] = 'center';
    label.style.padding = '0 4px';
    label.style['font-weight'] = 'normal';

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(roleToDisplayName[checkbox.value]));
    return label;
  });

  labels.forEach(label => box.append(label));
  root.appendChild(box);
}

function partitionComments({ allComments, role }) {
  const ariaLabel = roleToAriaLabel[role];

  if (ariaLabel === null) {
    const hidden = [];
    const shown = [];
    for (const comment of allComments) {
      if (comment.querySelector('.timeline-comment-label')) {
        hidden.push(comment);
      } else {
        shown.push(comment);
      }
    }

    return { hidden, shown };
  }

  const validComments = new Set(Array.from(document.querySelectorAll(
    `[aria-label*=${ariaLabel}]`
  )).map(element => element.closest('.js-timeline-item')));

  return {
    hidden: allComments.filter(comment => !validComments.has(comment)),
    shown: validComments,
  };
}

function updateVisibleComments({ roles }) {
  let remainingComments = Array.from(document.querySelectorAll('.js-timeline-item'));

  const shownComments = [];

  for (const role of roles) {
    ({ hidden: remainingComments, shown } =
      partitionComments({ allComments: remainingComments, role }));

    shownComments.push(...shown);
  }

  for (const comment of shownComments) {
    comment.style.transition = 'height 0.5s linear, opacity 0.5s ease-in';
    comment.style.height = '100%';
    comment.style.opacity = 1;
    comment.style.overflow = 'hidden'
  }

  for (const comment of remainingComments) {
    comment.style.transition = 'height 0.5s ease-in, opacity 0.5s linear';
    comment.style.height = 0;
    comment.style.opacity = 0;
    comment.style.overflow = 'hidden'
  }

  const observer = new MutationObserver(() => {
    updateVisibleComments({ roles });
    observer.disconnect();
  });

  document
    .querySelectorAll('#js-progressive-timeline-item-container')
    .forEach(container => {
      observer.observe(container, { childList: true });
    });
}

function renderControls() {
  const box = createBox({ direction: 'column' });
  box.style['justify-content'] = 'center';
  box.style['vertical-align'] = 'middle'
  box.style.display = 'inline-flex';

  const title = document.createElement('div');
  title.appendChild(document.createTextNode('Show comments by:'));
  title.style.width = '100%';
  title.style.padding = '0 2px';
  title.style['font-weight'] = '500';

  box.appendChild(title);
  renderCheckboxes({ root: box });
  return box;
}

(function() {
  'use strict';

  updateVisibleComments({ roles: Object.keys(roleToDisplayName) });

  const header = document.querySelector('.sticky-content');
  header.firstElementChild.style.setProperty('display', 'inline-flex', 'important');

  header.appendChild(renderControls());


  document.querySelector('#partial-discussion-header').appendChild(renderControls());
})();
