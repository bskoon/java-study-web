(function() {
    try {
        // Namespace definition
        window.GcSim = {
        init: init,
        reset: reset,
        handleResize: handleResize,
        createObject: createObject,
        toggleDisconnectMode: toggleDisconnectMode,
        runMinorGc: runMinorGc,
        runMajorGc: runMajorGc
    };

    // DOM Elements Cache
    let edenSpace, s0Space, s1Space, oldSpace, explanationBox;
    let btnDisconnect;

    // Simulation Data Model
    let objects = []; // Array of { id, name, age, location, reachable }
    let links = [];   // Array of { fromId, toId }
    let activeSurvivor = 's0'; // 's0' or 's1'. The other is the copy destination.
    let nodeCounter = 0;
    let disconnectMode = false;

    // Constants
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const MAX_NODES = 24;
    const PROMOTION_AGE = 3;

    function init() {
        edenSpace = document.getElementById('eden-space');
        s0Space = document.getElementById('s0-space');
        s1Space = document.getElementById('s1-space');
        oldSpace = document.getElementById('old-space');
        explanationBox = document.getElementById('gc-explanation');
        btnDisconnect = document.getElementById('btn-gc-disconnect');

        // Events
        document.getElementById('btn-gc-create').addEventListener('click', createObject);
        btnDisconnect.addEventListener('click', toggleDisconnectMode);
        document.getElementById('btn-gc-minor').addEventListener('click', runMinorGc);
        document.getElementById('btn-gc-major').addEventListener('click', runMajorGc);
        document.getElementById('btn-gc-reset').addEventListener('click', reset);

        reset();
    }

    function reset() {
        objects = [];
        links = [];
        activeSurvivor = 's0';
        nodeCounter = 0;
        disconnectMode = false;
        btnDisconnect.classList.remove('active');
        
        edenSpace.innerHTML = '';
        s0Space.innerHTML = '';
        s1Space.innerHTML = '';
        oldSpace.innerHTML = '';

        explanationBox.innerHTML = '초기 상태입니다. [객체 생성] 버튼을 눌러 Eden 영역에 메모리를 할당해 보세요.';
        explanationBox.className = 'explanation-box';

        clearGcArrows();
        window.App.log("[GC-Sim] 가비지 컬렉터 시뮬레이터가 초기화되었습니다.", "system");
    }

    function createObject() {
        if (disconnectMode) toggleDisconnectMode(); // Disarm disconnect mode on object creation

        if (objects.length >= MAX_NODES) {
            window.App.log("[GC-Sim] Heap 메모리가 가득 찼습니다. GC를 실행해 공간을 확보하세요.", "danger");
            explanationBox.innerHTML = "<span class='text-red'><strong>Out of Memory Warning!</strong></span><br>힙 영역에 객체가 가득 찼습니다. Minor GC 또는 Major GC를 실행하여 참조가 끊긴 객체를 정리하세요.";
            return;
        }

        const name = ALPHABET[nodeCounter % ALPHABET.length] + (nodeCounter >= ALPHABET.length ? Math.floor(nodeCounter/ALPHABET.length) : '');
        const id = `gc-node-${name}`;
        nodeCounter++;

        const newObj = {
            id: id,
            name: name,
            age: 0,
            location: 'eden',
            reachable: true
        };

        objects.push(newObj);

        // Define pointer link (Reachability assignment)
        // Check if root 1 is free
        const root1Linked = links.some(l => l.fromId === 'root-ref-1');
        const root2Linked = links.some(l => l.fromId === 'root-ref-2');

        if (!root1Linked) {
            links.push({ fromId: 'root-ref-1', toId: id });
            window.App.log(`[GC-Sim] 객체 ${name} 생성 -> rootVar1 참조 바인딩`, "success");
        } else if (!root2Linked) {
            links.push({ fromId: 'root-ref-2', toId: id });
            window.App.log(`[GC-Sim] 객체 ${name} 생성 -> rootVar2 참조 바인딩`, "success");
        } else {
            // 75% chance to chain to a random existing reachable object, 25% chance to be an orphan (garbage)
            const reachableObjects = getReachableNodeIds();
            if (reachableObjects.length > 0 && Math.random() < 0.75) {
                const parentId = reachableObjects[Math.floor(Math.random() * reachableObjects.length)];
                const parentObj = objects.find(o => o.id === parentId);
                links.push({ fromId: parentId, toId: id });
                window.App.log(`[GC-Sim] 객체 ${name} 생성 -> 기존 객체 ${parentObj.name}가 이를 참조`, "info");
            } else {
                window.App.log(`[GC-Sim] 객체 ${name} 생성 (참조 없음 - 발생 즉시 가비지 상태)`, "warning");
            }
        }

        // Add to DOM
        const nodeEl = createNodeDomElement(newObj);
        edenSpace.appendChild(nodeEl);

        // Trace reachability and redraw arrows
        updateReachability();
        updateExplanation();
    }

    function createNodeDomElement(obj) {
        const node = document.createElement('div');
        node.id = obj.id;
        node.className = 'gc-node';
        node.innerHTML = `
            <span class="gc-node-id">${obj.name}</span>
            <span class="gc-node-age">age: ${obj.age}</span>
        `;
        
        node.addEventListener('click', () => {
            if (disconnectMode) {
                disconnectNode(obj.id);
            }
        });

        return node;
    }

    function toggleDisconnectMode() {
        disconnectMode = !disconnectMode;
        if (disconnectMode) {
            btnDisconnect.classList.add('active');
            document.querySelectorAll('.gc-node').forEach(el => el.classList.add('disconnect-mode'));
            explanationBox.innerHTML = "<strong>참조 끊기 모드 활성화</strong><br>우측 메모리 맵에서 화살표 연결을 해제할 객체를 직접 클릭하세요. 클릭된 객체로 향하는 모든 참조 연결선이 유실됩니다.";
        } else {
            btnDisconnect.classList.remove('active');
            document.querySelectorAll('.gc-node').forEach(el => el.classList.remove('disconnect-mode'));
            updateExplanation();
        }
    }

    function disconnectNode(nodeId) {
        const obj = objects.find(o => o.id === nodeId);
        if (!obj) return;

        // Remove all links pointing TO this object
        const initialLen = links.length;
        links = links.filter(l => l.toId !== nodeId);

        if (links.length < initialLen) {
            window.App.log(`[GC-Sim] 객체 ${obj.name}로의 모든 참조를 끊었습니다.`, "warning");
        } else {
            window.App.log(`[GC-Sim] 객체 ${obj.name}는 이미 참조 링크가 없는 상태입니다.`, "info");
        }

        // Toggle back disconnect mode
        toggleDisconnectMode();
        
        // Compute new status
        updateReachability();
    }

    /* Traversal to check Reachability (Mark Phase) */
    function updateReachability() {
        // 1. Reset all reachability
        objects.forEach(o => o.reachable = false);

        // 2. Breadth-First Search (BFS) starting from Root Nodes
        const queue = ['root-ref-1', 'root-ref-2'];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            if (current !== 'root-ref-1' && current !== 'root-ref-2') {
                const obj = objects.find(o => o.id === current);
                if (obj) obj.reachable = true;
            }

            // Find all children
            const children = links.filter(l => l.fromId === current).map(l => l.toId);
            children.forEach(c => {
                if (!visited.has(c)) {
                    queue.push(c);
                }
            });
        }

        // 3. Update DOM styles based on reachability
        objects.forEach(obj => {
            const el = document.getElementById(obj.id);
            if (el) {
                if (obj.reachable) {
                    el.classList.remove('unreachable');
                } else {
                    el.classList.add('unreachable');
                }
            }
        });

        // 4. Redraw SVG arrows
        drawGcArrows();
    }

    function getReachableNodeIds() {
        return objects.filter(o => o.reachable).map(o => o.id);
    }

    /* GC Run Logic */
    function runMinorGc() {
        if (disconnectMode) toggleDisconnectMode();

        window.App.log("[GC-Sim] Minor GC 시작 (Eden & Survivor 영역 수거 대상)", "system");
        
        // --- 1. MARK PHASE ---
        // Color reachable nodes green, unreachable nodes red
        objects.forEach(obj => {
            const el = document.getElementById(obj.id);
            if (!el) return;
            
            if (obj.location === 'eden' || obj.location === 's0' || obj.location === 's1') {
                if (obj.reachable) {
                    el.classList.add('marked-alive');
                } else {
                    el.classList.add('marked-dead');
                }
            }
        });

        explanationBox.innerHTML = "<strong>Minor GC - 1단계: Mark (마킹)</strong><br>Root Set(Stack 변수)으로부터 참조 체인을 순회하여 살아있는 객체(초록색)와 더 이상 쓰이지 않는 가비지 객체(빨간색)를 식별합니다.";

        // Delay 1.2s to show Mark phase, then run Sweep/Copy
        setTimeout(() => {
            // --- 2. SWEEP & COPY PHASE ---
            // Unreachable nodes in Young Gen are swept (fade out)
            const deadYoungNodes = objects.filter(obj => !obj.reachable && (obj.location === 'eden' || obj.location === 's0' || obj.location === 's1'));
            
            deadYoungNodes.forEach(obj => {
                const el = document.getElementById(obj.id);
                if (el) {
                    el.classList.remove('marked-dead');
                    el.classList.add('sweeping');
                }
                // Delete references associated with this dead object
                links = links.filter(l => l.fromId !== obj.id && l.toId !== obj.id);
            });

            if (deadYoungNodes.length > 0) {
                window.App.log(`[GC-Sim] Garbage 수거: ${deadYoungNodes.map(o=>o.name).join(', ')} 객체 메모리 해제됨`, "danger");
            }

            // Determine copy destination Survivor space
            const oldSurvivor = activeSurvivor;
            const newSurvivor = (activeSurvivor === 's0') ? 's1' : 's0';
            const targetContainer = (newSurvivor === 's0') ? s0Space : s1Space;

            // Target surviving nodes to copy/move
            const survivors = objects.filter(obj => obj.reachable && (obj.location === 'eden' || obj.location === oldSurvivor));
            
            // Apply FLIP transitions for moving nodes
            const domNodesToMove = survivors.map(o => document.getElementById(o.id));
            
            applyFlipAnimation(domNodesToMove, () => {
                // Update internal states, increment age, promote if needed
                survivors.forEach(obj => {
                    obj.age++;
                    
                    // Age element update
                    const ageEl = document.querySelector(`#${obj.id} .gc-node-age`);
                    if (ageEl) ageEl.innerText = `age: ${obj.age}`;

                    const el = document.getElementById(obj.id);
                    el.classList.remove('marked-alive');

                    if (obj.age >= PROMOTION_AGE) {
                        // Promote to Old Generation
                        obj.location = 'old';
                        oldSpace.appendChild(el);
                        window.App.log(`[GC-Sim] 객체 ${obj.name} Promotion! (Age ${obj.age} 도달로 Old Generation 이동)`, "success");
                    } else {
                        // Move to new Survivor
                        obj.location = newSurvivor;
                        targetContainer.appendChild(el);
                    }
                });

                // Delete swept objects from our list
                objects = objects.filter(obj => obj.reachable || obj.location === 'old');
                activeSurvivor = newSurvivor;

                // Redraw arrows and re-assess reachability
                updateReachability();
                updateExplanation();
                
                window.App.log(`[GC-Sim] Minor GC 완료. Active Survivor 공간이 ${newSurvivor.toUpperCase()}로 토글되었습니다.`, "success");
            });

        }, 1200);
    }

    function runMajorGc() {
        if (disconnectMode) toggleDisconnectMode();

        window.App.log("[GC-Sim] Major GC 시작 (Old Generation 영역 수거 대상 - Full GC)", "system");

        // --- 1. MARK PHASE ---
        objects.forEach(obj => {
            const el = document.getElementById(obj.id);
            if (!el) return;

            if (obj.location === 'old') {
                if (obj.reachable) {
                    el.classList.add('marked-alive');
                } else {
                    el.classList.add('marked-dead');
                }
            }
        });

        explanationBox.innerHTML = "<strong>Major GC - 1단계: Mark (Old Generation)</strong><br>오랫동안 살아남아 Old 영역에 정착한 객체들 중 참조 유실 여부를 가려 마킹합니다.";

        setTimeout(() => {
            // --- 2. SWEEP PHASE ---
            const deadOldNodes = objects.filter(obj => !obj.reachable && obj.location === 'old');
            
            deadOldNodes.forEach(obj => {
                const el = document.getElementById(obj.id);
                if (el) {
                    el.classList.remove('marked-dead');
                    el.classList.add('sweeping');
                }
                links = links.filter(l => l.fromId !== obj.id && l.toId !== obj.id);
            });

            if (deadOldNodes.length > 0) {
                window.App.log(`[GC-Sim] Old Gen Garbage 수거: ${deadOldNodes.map(o=>o.name).join(', ')} 객체 메모리 소멸`, "danger");
            }

            setTimeout(() => {
                // Delete swept objects from list
                objects = objects.filter(obj => obj.reachable || obj.location !== 'old');
                
                // Clear marking styles for alive old nodes
                objects.forEach(obj => {
                    const el = document.getElementById(obj.id);
                    if (el) el.classList.remove('marked-alive');
                });

                updateReachability();
                updateExplanation();
                window.App.log("[GC-Sim] Major GC 완료. Old Generation의 단편화가 수거 및 정리되었습니다.", "success");
            }, 600); // Wait for sweep animation to finish

        }, 1200);
    }

    /* FLIP (First, Last, Invert, Play) Animation Handler */
    function applyFlipAnimation(nodes, action) {
        // 1. First: Record starting client rectangles
        const rects = nodes.map(node => {
            return {
                el: node,
                rect: node.getBoundingClientRect()
            };
        });

        // 2. Run DOM modifications
        action();

        // 3. Last & Invert: Record final states and apply offsets
        rects.forEach(item => {
            const el = item.el;
            const first = item.rect;
            const last = el.getBoundingClientRect();

            const dx = first.left - last.left;
            const dy = first.top - last.top;

            if (dx !== 0 || dy !== 0) {
                // Instantly teleport back to first position
                el.style.transition = 'none';
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                
                // Force a browser reflow (relayout)
                el.offsetWidth;

                // Let it slide to its new home using CSS Transition
                el.classList.add('gc-node-moving');
                el.style.transform = 'translate(0, 0)';
            }
        });

        // 4. Cleanup inline styles after transition finishes
        setTimeout(() => {
            nodes.forEach(el => {
                el.classList.remove('gc-node-moving');
                el.style.transform = '';
                el.style.transition = '';
            });
            // Re-draw connection lines
            drawGcArrows();
        }, 600);
    }

    /* SVG Connection Links Drawing */
    function clearGcArrows() {
        const svg = document.getElementById('svg-overlay');
        if (svg) {
            const paths = Array.from(svg.querySelectorAll('path')).filter(p => !p.closest('defs'));
            paths.forEach(p => p.remove());
        }
    }

    function drawGcArrows() {
        const svg = document.getElementById('svg-overlay');
        if (!svg) return;
        
        // Remove active path lines
        const paths = Array.from(svg.querySelectorAll('path')).filter(p => !p.closest('defs'));
        paths.forEach(p => p.remove());

        const svgRect = svg.getBoundingClientRect();

        links.forEach(link => {
            const fromEl = document.getElementById(link.fromId);
            const toEl = document.getElementById(link.toId);

            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            // From coordinates:
            // If from is a stack root, starting point is bottom center. Otherwise right center.
            const isRoot = link.fromId.includes('root-ref');
            const x1 = isRoot ? (fromRect.left + fromRect.right)/2 - svgRect.left : fromRect.right - svgRect.left;
            const y1 = isRoot ? fromRect.bottom - svgRect.top : (fromRect.top + fromRect.bottom)/2 - svgRect.top;

            // To coordinates: top center for objects
            const x2 = (toRect.left + toRect.right)/2 - svgRect.left;
            const y2 = toRect.top - svgRect.top;

            // Determine line color
            const targetObj = objects.find(o => o.id === link.toId);
            let strokeColor = "#6272a4"; // Default grey
            let markerId = "arrow";

            if (targetObj) {
                if (targetObj.reachable) {
                    strokeColor = isRoot ? "#8be9fd" : "#50fa7b"; // Cyan from root, Green from other objects
                    markerId = isRoot ? "arrow-cyan" : "arrow-green";
                } else {
                    strokeColor = "#ff5555"; // Red for unreachable link chains
                }
            }

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            
            // Draw smooth curve path
            const dy = Math.abs(y2 - y1);
            const controlY1 = y1 + dy * 0.5;
            const controlY2 = y2 - dy * 0.5;
            const d = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;

            path.setAttribute("d", d);
            path.setAttribute("stroke", strokeColor);
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("fill", "none");
            path.setAttribute("marker-end", `url(#${markerId})`);

            svg.appendChild(path);
        });
    }

    function updateExplanation() {
        const edenCount = objects.filter(o => o.location === 'eden').length;
        const s0Count = objects.filter(o => o.location === 's0').length;
        const s1Count = objects.filter(o => o.location === 's1').length;
        const oldCount = objects.filter(o => o.location === 'old').length;

        let html = `<strong>힙 상태 요약 (Heap Summary)</strong><br>`;
        html += `Eden: <code>${edenCount}개</code> | `;
        html += `Survivor 0 (S0): <code>${s0Count}개</code> ${activeSurvivor === 's0' ? '(활성)' : '(대기)'}<br>`;
        html += `Survivor 1 (S1): <code>${s1Count}개</code> ${activeSurvivor === 's1' ? '(활성)' : '(대기)'} | `;
        html += `Old Gen: <code>${oldCount}개</code><br><br>`;
        
        if (edenCount >= 4) {
            html += "<span class='text-orange'>⚠️ Eden 영역이 혼잡합니다. Minor GC를 실행하여 공간을 압축 및 정리하는 것이 좋습니다.</span>";
        } else {
            html += "객체를 생성한 후 <code>Disconnect(참조 끊기)</code> 버튼을 클릭해 참조 연결을 해제해 보세요. 해제된 객체는 GC 진행 시 가비지로 판정되어 안전하게 제거됩니다.";
        }

        explanationBox.innerHTML = html;
    }

    function handleResize() {
        if (links.length > 0) {
            drawGcArrows();
        }
    }
    } catch (e) {
        alert("gc-sim.js execution failed: " + e.message + "\nStack: " + e.stack);
    }
})();
