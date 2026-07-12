export interface ModalFocusOptions {
  initialFocus?: HTMLElement | (() => HTMLElement | null) | null;
  onEscape: (() => void) | null;
  onKeyDown?: (event: KeyboardEvent) => void;
  restoreFocus?: boolean;
}

interface ModalEntry {
  root: HTMLElement;
  options: ModalFocusOptions;
  previouslyFocused: HTMLElement | null;
  background: HTMLElement[];
  revealedBranch: HTMLElement[];
}

interface BackgroundState {
  count: number;
  inert: boolean;
  ariaHidden: string | null;
}

interface RevealedState {
  count: number;
  inert: boolean;
  ariaHidden: string | null;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const activeModals: ModalEntry[] = [];
const backgroundStates = new Map<HTMLElement, BackgroundState>();
const revealedStates = new Map<HTMLElement, RevealedState>();
let listenerInstalled = false;

function visibleFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => (
    element.getClientRects().length > 0
    && element.getAttribute('aria-hidden') !== 'true'
    && !element.closest('[inert]')
  ));
}

function resolveInitialFocus(entry: ModalEntry): HTMLElement {
  const requested = typeof entry.options.initialFocus === 'function'
    ? entry.options.initialFocus()
    : entry.options.initialFocus;
  const candidate = requested ?? visibleFocusableElements(entry.root)[0] ?? entry.root;
  if (candidate === entry.root && !entry.root.hasAttribute('tabindex')) {
    entry.root.tabIndex = -1;
  }
  return candidate;
}

function collectBackground(root: HTMLElement): HTMLElement[] {
  const background = new Set<HTMLElement>();
  let branch: HTMLElement | null = root;

  while (branch?.parentElement) {
    const parent: HTMLElement = branch.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
      if (['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) continue;
      background.add(sibling);
    }
    if (parent === document.body) break;
    branch = parent;
  }

  return Array.from(background);
}

function isolateBackground(elements: HTMLElement[]): void {
  for (const element of elements) {
    const existing = backgroundStates.get(element);
    if (existing) {
      existing.count += 1;
      continue;
    }

    backgroundStates.set(element, {
      count: 1,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden'),
    });
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
  }
}

function restoreBackground(elements: HTMLElement[]): void {
  for (const element of elements) {
    const state = backgroundStates.get(element);
    if (!state) continue;
    state.count -= 1;
    if (state.count > 0) continue;

    if (!revealedStates.has(element)) {
      element.inert = state.inert;
      if (state.ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', state.ariaHidden);
      }
    }
    backgroundStates.delete(element);
  }
}

function revealModalBranch(root: HTMLElement): HTMLElement[] {
  const revealed: HTMLElement[] = [];
  let branch: HTMLElement | null = root;

  while (branch && branch !== document.body) {
    const backgroundState = backgroundStates.get(branch);
    if (backgroundState) {
      const revealedState = revealedStates.get(branch);
      if (revealedState) {
        revealedState.count += 1;
      } else {
        revealedStates.set(branch, {
          count: 1,
          inert: backgroundState.inert,
          ariaHidden: backgroundState.ariaHidden,
        });
      }
      branch.inert = false;
      branch.setAttribute('aria-hidden', 'false');
      revealed.push(branch);
    }
    branch = branch.parentElement;
  }

  return revealed;
}

function restoreRevealedBranch(elements: HTMLElement[]): void {
  for (const element of elements) {
    const revealedState = revealedStates.get(element);
    if (!revealedState) continue;
    revealedState.count -= 1;
    if (revealedState.count > 0) continue;

    if (backgroundStates.has(element)) {
      // A lower modal still owns this element as background.
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    } else {
      // The lower modal closed while this one was on top. Restore the baseline
      // captured before either modal changed the branch.
      element.inert = revealedState.inert;
      if (revealedState.ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', revealedState.ariaHidden);
      }
    }
    revealedStates.delete(element);
  }
}

function trapTab(entry: ModalEntry, event: KeyboardEvent): void {
  const focusable = visibleFocusableElements(entry.root);
  event.preventDefault();

  if (focusable.length === 0) {
    resolveInitialFocus(entry).focus();
    return;
  }

  const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
  const nextIndex = activeIndex < 0
    ? (event.shiftKey ? focusable.length - 1 : 0)
    : (activeIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
  focusable[nextIndex].focus();
}

function handleModalKeydown(event: KeyboardEvent): void {
  const entry = activeModals[activeModals.length - 1];
  if (!entry) return;

  // Keep every game-level shortcut behind the topmost modal while preserving
  // native key behavior for the modal controls themselves.
  event.stopImmediatePropagation();

  if (event.key === 'Tab') {
    trapTab(entry, event);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    entry.options.onEscape?.();
    return;
  }

  entry.options.onKeyDown?.(event);
}

export function activateModal(root: HTMLElement, options: ModalFocusOptions): () => void {
  if (!listenerInstalled) {
    document.addEventListener('keydown', handleModalKeydown);
    listenerInstalled = true;
  }

  const entry: ModalEntry = {
    root,
    options,
    previouslyFocused: document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
    background: collectBackground(root),
    revealedBranch: revealModalBranch(root),
  };

  activeModals.push(entry);
  isolateBackground(entry.background);

  queueMicrotask(() => {
    if (activeModals[activeModals.length - 1] !== entry || !entry.root.isConnected) return;
    resolveInitialFocus(entry).focus();
  });

  let active = true;
  return () => {
    if (!active) return;
    active = false;

    const index = activeModals.indexOf(entry);
    if (index >= 0) activeModals.splice(index, 1);
    restoreBackground(entry.background);
    restoreRevealedBranch(entry.revealedBranch);

    if (options.restoreFocus === false) return;
    const restoreTarget = entry.previouslyFocused;
    if (
      restoreTarget?.isConnected
      && !restoreTarget.closest('[inert]')
      && restoreTarget.getClientRects().length > 0
    ) {
      restoreTarget.focus();
      return;
    }

    const nextModal = activeModals[activeModals.length - 1];
    if (nextModal) resolveInitialFocus(nextModal).focus();
  };
}
