document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const body = document.body;
    const mobileToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const expandBtn = document.getElementById('desktop-expand-btn');

    // --- Mobile Menu Logic ---
    if(mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // --- Desktop Collapse Logic ---
    
    // 1. Check LocalStorage for saved preference
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        body.classList.add('collapsed');
    }

    // 2. Function to toggle sidebar
    function toggleSidebar() {
        body.classList.toggle('collapsed');
        
        // Save state
        const isCollapsed = body.classList.contains('collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed);
    }

    // 3. Add Event Listeners
    if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);
    if (expandBtn) expandBtn.addEventListener('click', toggleSidebar);

    // --- Dot Navigation Auto-Builder (grouped hierarchy with numbering) ---
    function buildDotNav() {
        // Respect pages that already declare their own dot nav
        if (document.getElementById('dot-nav')) return;
        // Capture h2, h3, h4 to build grouped hierarchical dot nav
        const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
        if (!headings.length) return;

        const dotNav = document.createElement('div');
        dotNav.id = 'dot-nav';

        let topIndex = 0;
        let subIndex = 0;
        let subSubIndex = 0;
        let currentGroup = null;
        let currentChildren = null;

        function makeDotLink(h, level, numText) {
            const a = document.createElement('a');
            a.href = h.id ? ('#' + h.id) : '#';
            a.className = 'dot-item level-' + level;

            const circle = document.createElement('div');
            circle.className = 'dot-circle';

            const num = document.createElement('span');
            num.className = 'dot-num';
            num.textContent = numText || '';

            const label = document.createElement('span');
            label.className = 'dot-label';
            label.textContent = h.textContent || '';

            a.appendChild(circle);
            a.appendChild(num);
            a.appendChild(label);
            return a;
        }

        headings.forEach(h => {
            const tag = h.tagName.toLowerCase();
            if (tag === 'h2') {
                topIndex++;
                subIndex = 0;
                subSubIndex = 0;

                // create a group container for this top-level
                currentGroup = document.createElement('div');
                currentGroup.className = 'dot-group';

                const parentLink = makeDotLink(h, 1, `${topIndex}`);
                currentGroup.appendChild(parentLink);

                currentChildren = document.createElement('div');
                currentChildren.className = 'dot-children';
                currentGroup.appendChild(currentChildren);

                dotNav.appendChild(currentGroup);
            } else if (tag === 'h3') {
                subIndex++;
                subSubIndex = 0;
                if (!currentGroup) {
                    // create a synthetic top group if missing
                    topIndex++;
                    currentGroup = document.createElement('div');
                    currentGroup.className = 'dot-group';
                    const parentLink = makeDotLink({id: '', textContent: ''}, 1, `${topIndex}`);
                    currentGroup.appendChild(parentLink);
                    currentChildren = document.createElement('div');
                    currentChildren.className = 'dot-children';
                    currentGroup.appendChild(currentChildren);
                    dotNav.appendChild(currentGroup);
                }

                const childLink = makeDotLink(h, 2, `${topIndex}.${subIndex}`);
                currentChildren.appendChild(childLink);
            } else if (tag === 'h4') {
                subSubIndex++;
                // attach under last child; if none, attach to currentChildren
                let parentChild = currentChildren && currentChildren.lastElementChild;
                if (parentChild) {
                    let nested = parentChild.querySelector('.dot-children');
                    if (!nested) {
                        nested = document.createElement('div');
                        nested.className = 'dot-children sub-level';
                        parentChild.appendChild(nested);
                    }
                    const subChildLink = makeDotLink(h, 3, `${topIndex}.${subIndex}.${subSubIndex}`);
                    nested.appendChild(subChildLink);
                } else {
                    // fallback: append as sub-item
                    const childLink = makeDotLink(h, 2, `${topIndex}.${subIndex}.${subSubIndex}`);
                    if (currentChildren) currentChildren.appendChild(childLink);
                }
            }
        });

        const main = document.querySelector('main');
        if (main && main.parentNode) main.parentNode.insertBefore(dotNav, main);
    }

    // --- Scroll Spy (Dot Nav) Logic ---
    function initScrollSpy() {
        const sections = document.querySelectorAll('h2[id], h3[id], h4[id], h5[id]');
        const navDots = document.querySelectorAll('.dot-item');
        if (navDots.length === 0 || sections.length === 0) return;

        function updateActive() {
            let current = '';
            // Build targets from the dot links (ensures we support h2, h3, divs, etc.)
            const targets = Array.from(navDots).map(dot => {
                const id = (dot.getAttribute('href') || '').replace('#','');
                const el = document.getElementById(id);
                return { id, el };
            }).filter(t => t.el);

            targets.forEach(t => {
                const sectionTop = t.el.getBoundingClientRect().top + window.scrollY;
                if (window.scrollY >= (sectionTop - 250)) {
                    current = t.id;
                }
            });

            navDots.forEach(dot => {
                dot.classList.toggle('active', dot.getAttribute('href') === '#' + current);
            });

            // --- Dynamic page theming for Tower floors ---
            try {
                const isTower = window.location.pathname.endsWith('tower.html') || document.body.classList.contains('tower-page');
                if (isTower) {
                    const floorColors = {
                        'f1': '#4ade80',
                        'f2': '#f472b6',
                        'f3': '#60a5fa',
                        'f4': '#16a34a',
                        'f5': '#dc2626'
                    };
                    const defaultColor = '#ffffff';
                    const newColor = floorColors[current] || defaultColor;
                    document.documentElement.style.setProperty('--theme-color', newColor);
                }
            } catch (e) { /* ignore errors */ }
        }

        window.addEventListener('scroll', updateActive);
        // Run once to set initial state
        updateActive();

        // Ensure clicks update the active state after jump
        navDots.forEach(dot => dot.addEventListener('click', () => setTimeout(updateActive, 100)));
    }

    // --- TOC generator helper (supports h2/h3/h4 numbering) ---
    function generateTOCList(headings) {
        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';

        let topIndex = 0;
        let subIndex = 0;
        let subSubIndex = 0;

        let currentTopLi = null;
        let currentSubLi = null;

        headings.forEach(h => {
            const tag = h.tagName.toLowerCase();
            if (tag === 'h2') {
                topIndex++;
                subIndex = 0;
                subSubIndex = 0;

                const li = document.createElement('li');
                li.className = 'toc-item toc-level-1';

                const num = document.createElement('span');
                num.className = 'toc-num';
                num.textContent = `${topIndex}. `;

                const a = document.createElement('a');
                a.href = '#' + h.id;
                a.appendChild(document.createTextNode(h.textContent));

                li.appendChild(num);
                li.appendChild(a);
                tocList.appendChild(li);
                currentTopLi = li;
                currentSubLi = null;
            } else if (tag === 'h3') {
                if (!currentTopLi) {
                    // no top yet, create synthetic top
                    topIndex++;
                    const topLi = document.createElement('li');
                    topLi.className = 'toc-item toc-level-1';
                    const ta = document.createElement('a');
                    ta.href = '#';
                    const tnum = document.createElement('span');
                    tnum.className = 'toc-num';
                    tnum.textContent = `${topIndex}. `;
                    ta.appendChild(tnum);
                    ta.appendChild(document.createTextNode('')); // empty title placeholder
                    topLi.appendChild(ta);
                    tocList.appendChild(topLi);
                    currentTopLi = topLi;
                }
                subIndex++;
                subSubIndex = 0;

                let subList = currentTopLi.querySelector('ul.sub-list');
                if (!subList) {
                    subList = document.createElement('ul');
                    subList.className = 'sub-list';
                    currentTopLi.appendChild(subList);
                }

                const li = document.createElement('li');
                li.className = 'toc-item toc-level-2';

                const num = document.createElement('span');
                num.className = 'toc-num';
                num.textContent = `${topIndex}.${subIndex} `;

                const a = document.createElement('a');
                a.href = '#' + h.id;
                a.appendChild(document.createTextNode(h.textContent));

                li.appendChild(num);
                li.appendChild(a);
                subList.appendChild(li);
                currentSubLi = li;
            } else if (tag === 'h4') {
                if (!currentTopLi) {
                    topIndex++;
                    const topLi = document.createElement('li');
                    topLi.className = 'toc-item toc-level-1';
                    const ta = document.createElement('a');
                    ta.href = '#';
                    const tnum = document.createElement('span');
                    tnum.className = 'toc-num';
                    tnum.textContent = `${topIndex}. `;
                    ta.appendChild(tnum);
                    ta.appendChild(document.createTextNode(''));
                    topLi.appendChild(ta);
                    tocList.appendChild(topLi);
                    currentTopLi = topLi;
                }
                if (!currentSubLi) {
                    // create a sub-list container if missing
                    let subList = currentTopLi.querySelector('ul.sub-list');
                    if (!subList) {
                        subList = document.createElement('ul');
                        subList.className = 'sub-list';
                        currentTopLi.appendChild(subList);
                    }
                    // increment subIndex because we will attach h4 under a newly created sub item
                    subIndex = (subIndex || 0) + 1;

                    // create a placeholder sub-li to attach sub-sub-list
                    currentSubLi = document.createElement('li');
                    currentSubLi.className = 'toc-item toc-level-2';
                    const pa = document.createElement('a');
                    pa.href = '#';
                    const pnum = document.createElement('span');
                    pnum.className = 'toc-num';
                    pnum.textContent = `${topIndex}.${subIndex} `;
                    pa.appendChild(pnum);
                    pa.appendChild(document.createTextNode(''));
                    currentSubLi.appendChild(pa);
                    currentTopLi.querySelector('ul.sub-list').appendChild(currentSubLi);
                }

                // find or create sub-sub-list
                let subSubList = currentSubLi.querySelector('ul.sub-list');
                if (!subSubList) {
                    subSubList = document.createElement('ul');
                    subSubList.className = 'sub-list';
                    currentSubLi.appendChild(subSubList);
                }

                subSubIndex++;
                const li = document.createElement('li');
                li.className = 'toc-item toc-level-3';

                const num = document.createElement('span');
                num.className = 'toc-num';
                num.textContent = `${topIndex}.${subIndex}.${subSubIndex} `;

                const a = document.createElement('a');
                a.href = '#' + h.id;
                a.appendChild(document.createTextNode(h.textContent));

                li.appendChild(num);
                li.appendChild(a);
                subSubList.appendChild(li);
            }
        });

        return tocList;
    }

    function buildTOC() {
        const container = document.querySelector('.guide-container');
        if (!container) return;
        if (container.querySelector('.toc-box')) return; // skip if page has its own TOC

        const headings = container.querySelectorAll('h2[id], h3[id], h4[id]');
        if (!headings.length) return;

        const tocBox = document.createElement('div');
        tocBox.className = 'toc-box';

        const tocTitle = document.createElement('div');
        tocTitle.className = 'toc-title';
        tocTitle.textContent = 'Table of Contents';
        tocBox.appendChild(tocTitle);

        const tocList = generateTOCList(headings);
        tocBox.appendChild(tocList);

        const credits = container.querySelector('.credits-box');
        if (credits && credits.parentNode === container) {
            container.insertBefore(tocBox, credits.nextSibling);
        } else {
            const firstH2 = container.querySelector('h2[id]');
            if (firstH2) container.insertBefore(tocBox, firstH2);
            else container.appendChild(tocBox);
        }
    }

    // Enhance existing manual TOC blocks (rebuild from actual headings)
    function enhanceExistingTOCs() {
        const boxes = document.querySelectorAll('.toc-box');
        boxes.forEach(box => {
            if (box.dataset.enhanced === 'true') return;
            // Find the nearest guide container (TOC should reflect the page content)
            const container = box.closest('.guide-container') || document;
            const headings = container.querySelectorAll('h2[id], h3[id], h4[id]');
            if (!headings.length) { box.dataset.enhanced = 'true'; return; }

            // Preserve existing title if present
            const title = box.querySelector('.toc-title');
            if (title) title.textContent = 'Table of Contents';
            else {
                const t = document.createElement('div');
                t.className = 'toc-title';
                t.textContent = 'Table of Contents';
                box.insertBefore(t, box.firstChild);
            }

            // Remove existing list (if any) and replace with generated one
            const old = box.querySelector('ul.toc-list');
            if (old) old.remove();
            const newList = generateTOCList(headings);
            box.appendChild(newList);

            box.dataset.enhanced = 'true';
        });
    }

    // Ensure existing dot nav items get level classes, bold labels and numbering (based on page headings)
    function enhanceExistingDotNav() {
        const existing = document.querySelectorAll('#dot-nav .dot-item');
        if (!existing.length) return;

        // build numbering map from headings
        const headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
        const numberMap = {};
        let tIndex = 0; let sIndex = 0; let ssIndex = 0;
        headings.forEach(h => {
            const tag = h.tagName.toLowerCase();
            if (tag === 'h2') { tIndex++; sIndex = 0; ssIndex = 0; numberMap[h.id] = `${tIndex}`; }
            else if (tag === 'h3') { sIndex++; ssIndex = 0; numberMap[h.id] = `${tIndex}.${sIndex}`; }
            else if (tag === 'h4') { ssIndex++; numberMap[h.id] = `${tIndex}.${sIndex}.${ssIndex}`; }
        });

        existing.forEach(item => {
            const href = item.getAttribute('href') || (item.querySelector('a') && item.querySelector('a').getAttribute('href')) || '';
            const id = (href || '').replace('#','');
            const target = document.getElementById(id);
            let level = 1;
            if (target) {
                const tag = target.tagName.toLowerCase();
                if (tag === 'h3') level = 2;
                else if (tag === 'h4') level = 3;
                else if (tag === 'h5') level = 4;
            }
            item.classList.remove('level-1','level-2','level-3','level-4');
            item.classList.add('level-' + level);

            // ensure number span exists
            let num = item.querySelector('.dot-num');
            const numText = numberMap[id] || '';
            if (!num) {
                num = document.createElement('span');
                num.className = 'dot-num';
                // insert after circle if present
                const circle = item.querySelector('.dot-circle');
                if (circle && circle.parentNode) circle.parentNode.insertBefore(num, circle.nextSibling);
                else item.insertBefore(num, item.firstChild);
            }
            num.textContent = numText;

            const label = item.querySelector('.dot-label');
            if (label) {
                label.style.fontFamily = "'Yuruka', 'Orbitron', sans-serif";
                label.style.fontWeight = '700';
            }
        });
    }

    // External Buttons (Wiki)
    function addExternalButtons() {
        if (!sidebar) return;
        if (sidebar.querySelector('.external-buttons')) return; // already added

        const container = document.createElement('div');
        container.className = 'external-buttons';

        const wiki = document.createElement('a');
        wiki.className = 'btn wiki';
        wiki.href = 'https://revolutionidle.wiki.gg';
        wiki.target = '_blank';
        wiki.rel = 'noopener noreferrer';
        const wikiImg = document.createElement('img');
        wikiImg.src = 'assets/img/Main.ico';
        wikiImg.alt = 'Wiki';
        wikiImg.className = 'btn-icon';
        wiki.appendChild(wikiImg);
        wiki.appendChild(document.createTextNode('Visit the Wiki!'));

        container.appendChild(wiki);

        const navEl = sidebar.querySelector('nav');
        if (navEl && navEl.parentNode) navEl.parentNode.insertBefore(container, navEl.nextSibling);
        else sidebar.appendChild(container);
    }

    buildTOC();
    enhanceExistingTOCs();
    buildDotNav();
    enhanceExistingDotNav();
    enhanceExistingTOCs();
    initScrollSpy();
    addExternalButtons();
    enhanceExistingDotNav();

    // --- Sidebar collapsible sections ---
    function makeSidebarSectionsCollapsible() {
        if (!sidebar) return;
        const nav = sidebar.querySelector('nav');
        if (!nav) return;

        // Avoid running twice
        if (nav.dataset.collapsible === 'true') return;
        nav.dataset.collapsible = 'true';

        // Build sections: group links between section-title nodes
        const children = Array.from(nav.children);
        const sections = [];
        const topLinks = [];
        let current = null;
        let firstSectionFound = false;

        function pushCurrent() {
            if (current) sections.push(current);
            current = null;
        }

        children.forEach(node => {
            if (node.classList && node.classList.contains('section-title')) {
                // start a new section
                firstSectionFound = true;
                pushCurrent();
                current = { titleNode: node, links: [] };
            } else if (node.tagName && node.tagName.toLowerCase() === 'a') {
                const text = (node.textContent || '').trim();
                // Keep Home and Tools links at the top (not collapsible)
                if (!firstSectionFound && (text === 'Home' || text.startsWith('Home') || text.includes('Tools'))) {
                    topLinks.push(node);
                } else {
                    if (!current) {
                        // If links appear before any section-title, create a default untitled section
                        current = { titleNode: null, links: [] };
                    }
                    current.links.push(node);
                }
            } else if (node.classList && node.classList.contains('external-buttons')) {
                // leave external buttons in place; push current then append as-is later
                pushCurrent();
                sections.push({ titleNode: null, links: [], extraNode: node });
            } else {
                // ignore other nodes
            }
        });
        pushCurrent();

        if (!sections.length && !topLinks.length) return;

        // Clear existing nav and rebuild grouped sections
        nav.innerHTML = ''; 
        // append Home/Tools top links first
        topLinks.forEach(n => nav.appendChild(n.cloneNode(true)));
        sections.forEach((sec, i) => {
            if (sec.extraNode) {
                // append the extra node (external buttons)
                nav.appendChild(sec.extraNode);
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'sidebar-section';

            const title = sec.titleNode ? sec.titleNode.cloneNode(true) : document.createElement('div');
            title.classList.add('section-title');
            if (!sec.titleNode) title.textContent = 'Links';
            title.setAttribute('role','button');
            title.setAttribute('tabindex','0');

            // Add semantic classes for coloring: w1, w2, bonus
            const titleText = (title.textContent || '').trim().toLowerCase();
            if (titleText.includes('world 1')) title.classList.add('w1');
            else if (titleText.includes('world 2')) title.classList.add('w2');
            else if (titleText.includes('bonus')) title.classList.add('bonus');

            // Add caret indicator
            const caret = document.createElement('span');
            caret.className = 'section-caret';
            caret.setAttribute('aria-hidden','true');
            title.appendChild(caret);

            const linksContainer = document.createElement('div');
            linksContainer.className = 'section-links';

            sec.links.forEach(a => linksContainer.appendChild(a.cloneNode(true)));

            wrapper.appendChild(title);
            wrapper.appendChild(linksContainer);
            nav.appendChild(wrapper);

            // initial state: closed unless user opened before
            const key = 'sidebar-section-open:' + (title.textContent || 'section-' + i).trim();
            const opened = localStorage.getItem(key) === 'true';
            if (opened) wrapper.classList.add('open');

            function setOpen(open) {
                if (open) wrapper.classList.add('open');
                else wrapper.classList.remove('open');
                localStorage.setItem(key, !!open);
            }

            // click / keyboard to toggle
            title.addEventListener('click', () => setOpen(!wrapper.classList.contains('open')));
            title.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!wrapper.classList.contains('open')); } });
        });
    }

    // Run the collapsible builder after other nav-adds (external buttons) so we group everything
    makeSidebarSectionsCollapsible();
});