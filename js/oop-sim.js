(function() {
    // Namespace definition
    window.OopSim = {
        init: init,
        reset: reset,
        handleResize: handleResize,
        runStep: runStep,
        runAll: runAll,
        changePreset: changePreset
    };

    // DOM Elements Cache
    let presetSelect, codeDisplay, explanationBox, stackContainer, heapContainer, constantPool;
    
    // Internal Simulation State
    let currentPreset = 'polymorphism';
    let currentStepIndex = 0;
    let arrowsToDraw = [];

    // Presets Data
    const PRESETS = {
        'polymorphism': {
            code: [
                "// 1. 참조 변수 선언 (아직 가리키는 객체 없음)",
                "Parent p;",
                "// 2. Child 객체 생성 및 다형성 바인딩",
                "p = new Child();",
                "// 3. 재정의된 메서드 호출 (동적 바인딩)",
                "p.show();"
            ],
            steps: [
                {
                    line: 1,
                    explain: "<strong>Parent p;</strong><br>Stack 영역에 <code>Parent</code> 타입의 참조 변수 <code>p</code>가 생성되었습니다. 아직 객체가 생성되지 않았으므로 값은 <code>null</code> 상태입니다.",
                    action: function() {
                        createStackSlot("p", "Parent", "null", true);
                    }
                },
                {
                    line: 3,
                    explain: "<strong>p = new Child();</strong><br>Heap 영역에 <code>Child</code> 인스턴스가 100% 실체화(<code>@0x7a11</code>)되었습니다. Stack의 <code>p</code>는 이제 이 Child 인스턴스의 메모리 주소를 가리킵니다.<br><span class='text-cyan'>다형성: Parent 타입 변수가 하위 타입 Child의 인스턴스를 참조할 수 있습니다.</span>",
                    action: function() {
                        updateStackSlotValue("p", "@0x7a11", true);
                        createHeapObject("obj-child", "@0x7a11", "Child", {
                            "type": "Child",
                            "super": "Parent"
                        });
                        registerArrow("p-dot", "obj-child", "#ff79c6", "arrow");
                    }
                },
                {
                    line: 5,
                    explain: "<strong>p.show();</strong><br>JVM은 실행 시점에 <code>p</code>가 실제로 가리키는 인스턴스가 <code>Child</code>임을 확인하고, <code>Child</code> 클래스에 오버라이딩된 <code>show()</code> 메서드를 **동적 바인딩(Dynamic Binding)**으로 실행합니다.<br><span class='log-line success'>[Console Output] \"Child class method executed!\"</span>",
                    action: function() {
                        highlightHeapObject("obj-child");
                        window.App.log("[JVM Exec] p.show() 호출 -> 실객체 Child의 show() 오버라이딩 메서드 실행", "success");
                    }
                }
            ]
        },
        'string-literal': {
            code: [
                "// 1. String 리터럴 선언 -> Constant Pool 조회/등록",
                "String s1 = \"java\";",
                "// 2. 동일한 리터럴 선언 -> 상수 풀의 기존 참조 획득",
                "String s2 = \"java\";",
                "// 3. 주소 비교 (s1 == s2)",
                "boolean result = (s1 == s2);"
            ],
            steps: [
                {
                    line: 1,
                    explain: "<strong>String s1 = \"java\";</strong><br>문자열 리터럴 <code>\"java\"</code>가 Heap 내부의 **String Constant Pool**에 생성됩니다. Stack의 <code>s1</code>은 Pool 내부의 <code>\"java\"</code> 문자열 객체 주소를 가리킵니다.",
                    action: function() {
                        createStackSlot("s1", "String", "@0x501a", true);
                        createConstantPoolLiteral("literal-java", "\"java\"");
                        registerArrow("s1-dot", "literal-java", "#8be9fd", "arrow-cyan");
                    }
                },
                {
                    line: 3,
                    explain: "<strong>String s2 = \"java\";</strong><br>동일한 문자열 리터럴 <code>\"java\"</code>가 선언되었습니다. JVM은 String Constant Pool을 먼저 검색하여 이미 존재하므로 새 객체를 만들지 않고 **기존 리터럴의 참조 주소**를 <code>s2</code>에 대입합니다.",
                    action: function() {
                        createStackSlot("s2", "String", "@0x501a", true);
                        registerArrow("s2-dot", "literal-java", "#8be9fd", "arrow-cyan");
                    }
                },
                {
                    line: 5,
                    explain: "<strong>s1 == s2;</strong><br>두 변수 <code>s1</code>과 <code>s2</code>의 값을 <code>==</code> 연산자로 비교합니다. 두 변수 모두 같은 Constant Pool 주소(<code>@0x501a</code>)를 갖고 있으므로 비교 결과는 **<code>true</code>**가 됩니다.<br><span class='log-line success'>[Console Output] s1 == s2 : true</span>",
                    action: function() {
                        window.App.log("[String Test] s1(0x501a) == s2(0x501a) -> true", "success");
                    }
                }
            ]
        },
        'string-object': {
            code: [
                "// 1. String 리터럴 선언 (상수 풀 등록)",
                "String s1 = \"java\";",
                "// 2. new 연산자로 String 객체 강제 생성 (일반 Heap)",
                "String s2 = new String(\"java\");",
                "// 3. 주소 비교 (s1 == s2)",
                "boolean result = (s1 == s2);"
            ],
            steps: [
                {
                    line: 1,
                    explain: "<strong>String s1 = \"java\";</strong><br>문자열 리터럴 <code>\"java\"</code>가 String Constant Pool에 생성되고, <code>s1</code>은 Pool 내의 인스턴스를 참조합니다.",
                    action: function() {
                        createStackSlot("s1", "String", "@0x501a", true);
                        createConstantPoolLiteral("literal-java", "\"java\"");
                        registerArrow("s1-dot", "literal-java", "#8be9fd", "arrow-cyan");
                    }
                },
                {
                    line: 3,
                    explain: "<strong>String s2 = new String(\"java\");</strong><br><code>new</code> 연산자를 사용해 명시적으로 String 인스턴스를 생성했습니다. Constant Pool과 무관하게 **일반 Heap 영역에 새로운 String 객체**가 <code>@0x902f</code>에 할당됩니다. <code>s2</code>는 이 새 객체를 가리킵니다.",
                    action: function() {
                        createStackSlot("s2", "String", "@0x902f", true);
                        createHeapObject("obj-string-heap", "@0x902f", "String", {
                            "value": "\"java\" (in pool)"
                        });
                        registerArrow("s2-dot", "obj-string-heap", "#ff79c6", "arrow");
                        // string heap object points to constant pool literal
                        registerArrow("obj-string-heap", "literal-java", "#6272a4", "arrow");
                    }
                },
                {
                    line: 5,
                    explain: "<strong>s1 == s2;</strong><br>두 변수 <code>s1</code>(<code>@0x501a</code>)과 <code>s2</code>(<code>@0x902f</code>)의 주소를 비교합니다. 가리키는 인스턴스가 완전히 별개이므로 결과는 **<code>false</code>**가 됩니다. 문자열 값을 비교하려면 <code>equals()</code>를 써야 합니다.<br><span class='log-line danger'>[Console Output] s1 == s2 : false</span>",
                    action: function() {
                        window.App.log("[String Test] s1(0x501a) == s2(0x902f) -> false", "warning");
                    }
                }
            ]
        },
        'value-vs-ref': {
            code: [
                "// 1. 기본형(Primitive) 변수 선언",
                "int num = 100;",
                "// 2. 참조형(Reference) 변수 선언 및 객체 할당",
                "User u = new User(\"Alice\");"
            ],
            steps: [
                {
                    line: 1,
                    explain: "<strong>int num = 100;</strong><br><code>int</code>는 원시(Primitive) 타입입니다. Heap에 별도의 객체를 생성하지 않고 Stack 슬롯 안에 실제 데이터 값인 **<code>100</code>**이 직접 저장됩니다.",
                    action: function() {
                        createStackSlot("num", "int", "100", false);
                    }
                },
                {
                    line: 3,
                    explain: "<strong>User u = new User(\"Alice\");</strong><br><code>User</code>는 참조형 타입입니다. Stack의 <code>u</code>는 주소값(<code>@0x334a</code>)만 저장하며, 실제 사용자 데이터와 객체의 메타정보는 Heap 영역에 할당됩니다.",
                    action: function() {
                        createStackSlot("u", "User", "@0x334a", true);
                        createHeapObject("obj-user", "@0x334a", "User", {
                            "name": "\"Alice\"",
                            "age": "0"
                        });
                        registerArrow("u-dot", "obj-user", "#ff79c6", "arrow");
                    }
                }
            ]
        }
    };

    function init() {
        presetSelect = document.getElementById('oop-preset-select');
        codeDisplay = document.getElementById('oop-code-display');
        explanationBox = document.getElementById('oop-explanation');
        stackContainer = document.getElementById('oop-stack-slots');
        heapContainer = document.getElementById('oop-heap-objects');
        constantPool = document.getElementById('oop-constant-pool');

        // Events
        presetSelect.addEventListener('change', (e) => {
            changePreset(e.target.value);
        });

        document.getElementById('btn-oop-step').addEventListener('click', runStep);
        document.getElementById('btn-oop-run').addEventListener('click', runAll);
        document.getElementById('btn-oop-reset').addEventListener('click', reset);

        changePreset('polymorphism');
    }

    function changePreset(presetKey) {
        currentPreset = presetKey;
        reset();
    }

    function reset() {
        currentStepIndex = 0;
        stackContainer.innerHTML = '';
        heapContainer.innerHTML = '';
        constantPool.innerHTML = '';
        explanationBox.innerHTML = '아래 실행 버튼을 눌러 시뮬레이션을 시작하세요.';
        explanationBox.className = 'explanation-box';
        
        clearArrows();
        updateCodeDisplay();
        window.App.log(`[OOP-Sim] Preset '${currentPreset}' loaded & reset.`, 'system');
    }

    function updateCodeDisplay() {
        const preset = PRESETS[currentPreset];
        let highlightedCode = '';
        
        preset.code.forEach((line, index) => {
            // Find which step maps to this line index
            const stepObjIndex = preset.steps.findIndex(s => s.line === index);
            const isExecuted = stepObjIndex !== -1 && stepObjIndex < currentStepIndex;
            const isCurrent = stepObjIndex !== -1 && stepObjIndex === currentStepIndex;
            
            let classAttr = '';
            if (isCurrent) classAttr = 'class="current-exec-line"';
            else if (isExecuted) classAttr = 'class="executed-line"';
            
            highlightedCode += `<div ${classAttr}>${line}</div>`;
        });
        
        codeDisplay.innerHTML = highlightedCode;
    }

    function runStep() {
        const preset = PRESETS[currentPreset];
        if (currentStepIndex >= preset.steps.length) {
            window.App.log("[OOP-Sim] 모든 단계가 완료되었습니다. 초기화 후 다시 실행 가능합니다.", "warning");
            return;
        }

        const step = preset.steps[currentStepIndex];
        
        // Remove highlighting from previous step slots
        document.querySelectorAll('.stack-slot').forEach(el => el.classList.remove('highlight'));
        document.querySelectorAll('.heap-object').forEach(el => el.classList.remove('highlight'));

        // Execute current step action
        step.action();
        
        // Show explanation
        explanationBox.innerHTML = step.explain;
        if (currentPreset === 'string-literal' && currentStepIndex === 2) {
            explanationBox.classList.add('success-alert');
        } else if (currentPreset === 'string-object' && currentStepIndex === 2) {
            explanationBox.classList.add('warning-alert');
        }

        currentStepIndex++;
        updateCodeDisplay();
        
        // Re-draw arrows
        setTimeout(drawAllArrows, 50);
    }

    function runAll() {
        const preset = PRESETS[currentPreset];
        // Execute remaining steps
        while (currentStepIndex < preset.steps.length) {
            runStep();
        }
    }

    /* Helper functions to build the visual nodes */
    function createStackSlot(varName, type, val, isRef) {
        const slotId = `${varName}-slot`;
        // Check if already exists
        let slot = document.getElementById(slotId);
        if (!slot) {
            slot = document.createElement('div');
            slot.id = slotId;
            slot.className = 'stack-slot highlight';
            
            let valueHtml = '';
            if (isRef) {
                valueHtml = `<span class="slot-value-val" id="${varName}-val">${val}</span>
                             <span class="ref-pointer-dot" id="${varName}-dot"></span>`;
            } else {
                valueHtml = `<span class="slot-value-val" id="${varName}-val">${val}</span>`;
            }

            slot.innerHTML = `
                <div>
                    <span class="slot-var-name">${varName}</span>
                    <span class="slot-var-type">${type}</span>
                </div>
                <div class="slot-value-container">
                    ${valueHtml}
                </div>
            `;
            stackContainer.appendChild(slot);
        } else {
            slot.classList.add('highlight');
            updateStackSlotValue(varName, val, isRef);
        }
    }

    function updateStackSlotValue(varName, newVal, isRef) {
        const valEl = document.getElementById(`${varName}-val`);
        if (valEl) {
            valEl.innerText = newVal;
        }
    }

    function createHeapObject(objId, address, type, fields) {
        if (document.getElementById(objId)) return;
        
        const obj = document.createElement('div');
        obj.id = objId;
        obj.className = 'heap-object highlight';
        
        let fieldsHtml = '';
        for (const [fName, fVal] of Object.entries(fields)) {
            fieldsHtml += `
                <div class="object-field">
                    <span class="field-name">${fName}</span>
                    <span class="field-val">${fVal}</span>
                </div>
            `;
        }

        obj.innerHTML = `
            <div class="object-header">
                <span class="object-addr">${address}</span>
                <span class="object-type">${type}</span>
            </div>
            <div class="object-body">
                ${fieldsHtml}
            </div>
        `;
        heapContainer.appendChild(obj);
    }

    function highlightHeapObject(objId) {
        const obj = document.getElementById(objId);
        if (obj) {
            obj.classList.add('highlight');
        }
    }

    function createConstantPoolLiteral(litId, value) {
        if (document.getElementById(litId)) return;

        const lit = document.createElement('div');
        lit.id = litId;
        lit.className = 'pool-literal';
        lit.innerText = value;
        constantPool.appendChild(lit);
    }

    /* SVG Pointer Arrow System */
    function registerArrow(fromId, toId, color, markerId) {
        arrowsToDraw.push({ fromId, toId, color, markerId });
    }

    function clearArrows() {
        arrowsToDraw = [];
        const svg = document.getElementById('svg-overlay');
        if (svg) {
            // Remove all custom paths (keep defs)
            const paths = svg.querySelectorAll('path:not(defs path)');
            paths.forEach(p => p.remove());
        }
    }

    function drawAllArrows() {
        const svg = document.getElementById('svg-overlay');
        if (!svg) return;
        
        // Remove existing paths first
        const paths = svg.querySelectorAll('path:not(defs path)');
        paths.forEach(p => p.remove());

        const svgRect = svg.getBoundingClientRect();

        arrowsToDraw.forEach(arrow => {
            const fromEl = document.getElementById(arrow.fromId);
            const toEl = document.getElementById(arrow.toId);

            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            // Calculate center points
            // Draw starting from the right center of the dot (or object box)
            const x1 = fromRect.right - svgRect.left;
            const y1 = (fromRect.top + fromRect.bottom) / 2 - svgRect.top;

            // Draw to the left center of the destination box
            const x2 = toRect.left - svgRect.left;
            const y2 = (toRect.top + toRect.bottom) / 2 - svgRect.top;

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            
            // Nice cubic bezier curved arrow
            const dx = Math.abs(x2 - x1);
            const controlX1 = x1 + dx * 0.4;
            const controlX2 = x2 - dx * 0.4;
            const d = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;

            path.setAttribute("d", d);
            path.setAttribute("stroke", arrow.color);
            path.setAttribute("stroke-width", "2");
            path.setAttribute("fill", "none");
            path.setAttribute("marker-end", `url(#${arrow.markerId})`);

            svg.appendChild(path);
        });
    }

    function handleResize() {
        // Redraw active arrows on window resizing
        if (arrowsToDraw.length > 0) {
            drawAllArrows();
        }
    }
})();
