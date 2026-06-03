(function() {
    // Namespace definition
    window.JvmMem = {
        init: init,
        reset: reset,
        switchThread: switchThread,
        methodCall: methodCall,
        methodReturn: methodReturn
    };

    // DOM Elements Cache
    let stackFramesEl, pcValueEl, nativeStatusEl, threadBadgeEl, explanationBox;
    let btnThread1, btnThread2;

    // Simulation State for Threads
    let activeThread = 1; // 1 or 2
    
    // Hardcoded Method Call Sequences per Thread to demonstrate independent execution paths
    const THREAD_STATES = {
        1: {
            stack: [
                {
                    name: "main(String[] args)",
                    pc: "0x004A",
                    locals: { "args": "@0x102e", "port": "8080" }
                }
            ],
            pc: "0x004A",
            nativeStatus: "[Idle]",
            callSequenceIndex: 0
        },
        2: {
            stack: [
                {
                    name: "run()",
                    pc: "0x01B0",
                    locals: { "threadId": "12", "active": "true" }
                }
            ],
            pc: "0x01B0",
            nativeStatus: "[Idle]",
            callSequenceIndex: 0
        }
    };

    // Method chains to simulate when "Method Call" is clicked
    const METHOD_CHAINS = {
        1: [
            {
                name: "fetchUserData(String userId)",
                pc: "0x009F",
                locals: { "userId": "\"user_99\"", "dbRetry": "3" }
            },
            {
                name: "executeQuery(String query)",
                pc: "0x00F8",
                locals: { "query": "\"SELECT * FROM users\"", "timeout": "30s" }
            },
            {
                name: "getConnection()",
                pc: "0x012C",
                locals: { "pool": "@0x55d0", "driver": "\"MySQL\"" }
            }
        ],
        2: [
            {
                name: "processQueue()",
                pc: "0x02D5",
                locals: { "batchSize": "100", "processed": "0" }
            },
            {
                name: "parseJson(String raw)",
                pc: "0x0310",
                locals: { "raw": "\"{\\\"id\\\":10}\"", "len": "15" }
            }
        ]
    };

    function init() {
        stackFramesEl = document.getElementById('jvm-stack-frames');
        pcValueEl = document.getElementById('jvm-pc-value');
        nativeStatusEl = document.getElementById('jvm-native-status');
        threadBadgeEl = document.getElementById('thread-area-badge');
        explanationBox = document.getElementById('jvm-explanation');

        btnThread1 = document.getElementById('btn-thread-1');
        btnThread2 = document.getElementById('btn-thread-2');

        // Events
        btnThread1.addEventListener('click', () => switchThread(1));
        btnThread2.addEventListener('click', () => switchThread(2));

        document.getElementById('btn-jvm-method-call').addEventListener('click', methodCall);
        document.getElementById('btn-jvm-method-exit').addEventListener('click', methodReturn);
        document.getElementById('btn-jvm-reset').addEventListener('click', reset);

        // Load Initial UI
        renderThreadState();
        updateExplanation();
    }

    function reset() {
        // Reset Thread 1
        THREAD_STATES[1] = {
            stack: [
                {
                    name: "main(String[] args)",
                    pc: "0x004A",
                    locals: { "args": "@0x102e", "port": "8080" }
                }
            ],
            pc: "0x004A",
            nativeStatus: "[Idle]",
            callSequenceIndex: 0
        };

        // Reset Thread 2
        THREAD_STATES[2] = {
            stack: [
                {
                    name: "run()",
                    pc: "0x01B0",
                    locals: { "threadId": "12", "active": "true" }
                }
            ],
            pc: "0x01B0",
            nativeStatus: "[Idle]",
            callSequenceIndex: 0
        };

        renderThreadState();
        updateExplanation();
        window.App.log("[JVM-Mem] 스레드 스택 프레임 및 PC 레지스터 상태가 초기화되었습니다.", "system");
    }

    function switchThread(threadId) {
        if (activeThread === threadId) return;
        activeThread = threadId;

        // UI buttons toggle
        if (threadId === 1) {
            btnThread1.classList.add('active');
            btnThread2.classList.remove('active');
        } else {
            btnThread2.classList.add('active');
            btnThread1.classList.remove('active');
        }

        renderThreadState();
        updateExplanation();
        window.App.log(`[JVM-Mem] 활성 스레드를 Thread-${threadId}로 전환했습니다. 스택 영역과 PC 레지스터가 해당 스레드의 상태로 독립 교체됩니다.`, "info");
    }

    function renderThreadState() {
        const state = THREAD_STATES[activeThread];
        
        // Update PC Register View
        pcValueEl.innerText = `PC: ${state.pc}`;
        
        // Update Native Stack View
        nativeStatusEl.innerText = state.nativeStatus;
        
        // Update Badge text
        threadBadgeEl.innerText = `스레드 전용 (Thread-${activeThread})`;

        // Render Stack Frames (Bottom up, top frame is most recently called)
        stackFramesEl.innerHTML = '';
        if (state.stack.length === 0) {
            stackFramesEl.innerHTML = '<div class="placeholder-msg" style="padding-top: 15px;">스택이 비어 있습니다.</div>';
            return;
        }

        // Render in reverse order so newest frame is visual top
        for (let i = state.stack.length - 1; i >= 0; i--) {
            const frame = state.stack[i];
            const isTop = (i === state.stack.length - 1);
            
            const frameEl = document.createElement('div');
            frameEl.className = `jvm-frame ${isTop ? 'highlight-frame' : ''}`;
            if (isTop) {
                frameEl.style.borderColor = 'var(--pink)';
                frameEl.style.boxShadow = '0 0 8px rgba(255, 121, 198, 0.2)';
            } else {
                frameEl.style.borderColor = 'var(--border-color)';
                frameEl.style.opacity = '0.7';
            }

            let localsHtml = '';
            for (const [name, val] of Object.entries(frame.locals)) {
                localsHtml += `
                    <div class="jvm-frame-local">
                        <span style="color: var(--yellow);">${name}</span>
                        <span style="color: var(--orange);">${val}</span>
                    </div>
                `;
            }

            frameEl.innerHTML = `
                <div class="jvm-frame-header" style="background-color: ${isTop ? 'rgba(255, 121, 198, 0.15)' : 'var(--bg-lighter)'};">
                    <span style="font-family: var(--font-code); font-weight: bold;">${frame.name}</span>
                    <span style="color: var(--comment); font-size: 10px;">PC: ${frame.pc}</span>
                </div>
                <div class="jvm-frame-body">
                    <div style="font-weight: 600; color: var(--fg-muted); font-size: 10px; margin-bottom: 4px; text-transform: uppercase;">Local Variables</div>
                    ${localsHtml || '<div style="color: var(--comment); font-style: italic;">No locals</div>'}
                </div>
            `;
            stackFramesEl.appendChild(frameEl);
        }
    }

    function methodCall() {
        const state = THREAD_STATES[activeThread];
        const chain = METHOD_CHAINS[activeThread];
        
        if (state.callSequenceIndex >= chain.length) {
            window.App.log(`[JVM-Mem] Thread-${activeThread} Stack Overflow 에러 발생 가능 (가상 깊이 제한 도달)`, "danger");
            alert("Stack Overflow: 시뮬레이션 제한 깊이에 도달했습니다. 메서드 종료(Return)를 수행하세요.");
            return;
        }

        const nextFrame = chain[state.callSequenceIndex];
        state.stack.push(nextFrame);
        state.pc = nextFrame.pc;
        state.callSequenceIndex++;

        // For demo: if getConnection is called, trigger native stack mock
        if (nextFrame.name.includes("getConnection")) {
            state.nativeStatus = "[Native Execution]\nExecuting db socket C library call...";
            window.App.log(`[JVM-Mem] Thread-${activeThread}이 Native Method(C/C++)인 getConnection()을 호출하여 Native Method Stack으로 프레임을 분기합니다.`, "warning");
        } else {
            state.nativeStatus = "[Idle]";
        }

        renderThreadState();
        updateExplanation();
        window.App.log(`[JVM-Mem] Thread-${activeThread} 메서드 호출: ${nextFrame.name} -> PC ${nextFrame.pc}로 이동`, "success");
    }

    function methodReturn() {
        const state = THREAD_STATES[activeThread];
        if (state.stack.length <= 1) {
            window.App.log(`[JVM-Mem] Thread-${activeThread}의 루트 메서드는 종료할 수 없습니다. (초기화 필요)`, "warning");
            return;
        }

        const popped = state.stack.pop();
        state.callSequenceIndex--;
        
        // Restore PC to the new top frame's PC
        const topFrame = state.stack[state.stack.length - 1];
        state.pc = topFrame.pc;
        state.nativeStatus = "[Idle]";

        renderThreadState();
        updateExplanation();
        window.App.log(`[JVM-Mem] Thread-${activeThread} 메서드 종료: ${popped.name} 프레임 pop -> PC ${state.pc}로 복귀`, "info");
    }

    function updateExplanation() {
        const state = THREAD_STATES[activeThread];
        const topFrame = state.stack[state.stack.length - 1];
        
        let html = `<strong>활성 스레드: Thread-${activeThread}</strong><br>`;
        html += `현재 실행중인 메서드: <code>${topFrame ? topFrame.name : '없음'}</code><br>`;
        html += `현재 PC 주소: <code class="text-cyan">${state.pc}</code><br><br>`;
        
        if (activeThread === 1) {
            html += "Thread-1은 메인 스레드로 데이터베이스 연동 조회를 순차 수행 중입니다. Stack에 프레임이 추가될 때마다 PC 주소가 변하고, 로컬 변수 영역이 캡슐화되어 프레임 내에 보존되는 모습을 확인할 수 있습니다.";
        } else {
            html += "Thread-2는 별도의 백그라운드 큐 처리 스레드입니다. Thread-1과 메모리(Method, Heap)는 공유하지만 Stack 공간과 PC Register는 완전히 독립되어 동시 동작하고 있습니다.";
        }
        
        explanationBox.innerHTML = html;
    }
})();
