// ==========================================================================
// CORE PHYSICS ENGINE - REFINED VERSION (核心物理引擎 - 丝滑线条与固态锚点版)
// ==========================================================================

const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector;

let engine, render, runner;
let canvas, ctx;
let currentLevelData = null;

let playerLines = [];      
let liquidParticles = [];  
let staticAnchors = [];   // Array to hold fixed pillars for lines to grip (存放固定固体的数组)

let isDrawing = false;
let lastPointerPos = null;

// Ink constraint limits (画线墨水长度限制参数)
const MAX_INK_LENGTH = 1000; 
let currentInkLeft = MAX_INK_LENGTH;

function initPhysicsWorld() {
    canvas = document.getElementById('physics-canvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    engine = Engine.create({ gravity: { y: 1.0, x: 0 } });

    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false, 
            background: 'transparent'
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    setupInteractionListeners();
    Events.on(engine, 'collisionStart', handleColorBlending);

    // Spawn the solid anchor automatically for testing (关卡自动生成供线条抓取的固定固体)
    spawnSolidAnchors();
}

/**
 * Spawns an indestructible solid pillar in space for lines to cling onto
 * 在关卡中间孵化一个无法被摧毁的固定固体（黄铜锚点），供线条抓取防塌陷
 */
function spawnSolidAnchors() {
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2 - 30;

    // Create a metallic static brass ring/peg (创建一个固定的圆形金属桩)
    let anchor = Bodies.circle(centerX, centerY, 25, {
        isStatic: true, 
        label: 'solid_anchor',
        // Restored: Added deep royal glowing aesthetic
        // 恢复：注入黄铜古董发光特效，让线挂上去时更有高级感
        render: {
            fillStyle: '#c9a054',
            strokeStyle: '#ffdf7a',
            lineWidth: 3,
            shadowBlur: 20,
            shadowColor: '#ffdf7a'
        }
    });
    staticAnchors.push(anchor);
    Composite.add(engine.world, anchor);
}

function startDrawingLine(x, y) {
    if (currentInkLeft <= 0) return;
    isDrawing = true;
    lastPointerPos = { x: x, y: y };
}

/**
 * Advanced continuous tracing algorithm - completely eradicates the "bead/dotting" issue
 * 高级连续循迹算法：计算精准物理角度旋转贴合，彻底消灭“一粒一粒”问题
 */
function continueDrawingLine(x, y) {
    if (!isDrawing || !lastPointerPos || currentInkLeft <= 0) return;

    let currentPos = { x: x, y: y };
    let dist = Vector.magnitude(Vector.sub(currentPos, lastPointerPos));
    
    // Check segment movement distance
    if (dist > 4) {
        // Cost ink dynamically (扣除对应的墨水长度)
        currentInkLeft -= dist;
        if (currentInkLeft < 0) currentInkLeft = 0;
        
        // Update the UI ink bar dynamically (实时更新网页上的进度条)
        let percentage = (currentInkLeft / MAX_INK_LENGTH) * 100;
        document.getElementById('ink-bar-fill').style.width = percentage + "%";

        // Calculate trigonometry to stitch rectangular plates with perfect seamless overlap
        // 计算完美的几何中点与正切角度，用无缝交错的方式拼合，呈现真正的一条线
        let midPoint = Vector.div(Vector.add(lastPointerPos, currentPos), 2);
        let angle = Math.atan2(currentPos.y - lastPointerPos.y, currentPos.x - lastPointerPos.x);
        
        let lineSegment = Bodies.rectangle(midPoint.x, midPoint.y, dist + 4, 12, {
            isStatic: false, // Lines can still fall or rest beautifully on the solid anchor!
            density: 0.08,
            friction: 0.3,   // Increased friction so it grips tightly onto the static anchor
            angle: angle,    // Apply rotation angle (应用旋转角，使其丝滑无缝成一条线)
            label: 'player_line',
            render: { fillStyle: '#ebd59b' }
        });

        playerLines.push(lineSegment);
        Composite.add(engine.world, lineSegment);

        lastPointerPos = currentPos;
    }
}

function stopDrawingLine() {
    isDrawing = false;
    lastPointerPos = null;
}

function handleColorBlending(event) {
    let pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
        let bodyA = pairs[i].bodyA;
        let bodyB = pairs[i].bodyB;

        if ((bodyA.label === 'element_blue' && bodyB.label === 'element_yellow') || 
            (bodyA.label === 'element_yellow' && bodyB.label === 'element_blue')) {
            
            let clashX = (bodyA.position.x + bodyB.position.x) / 2;
            let clashY = (bodyA.position.y + bodyB.position.y) / 2;

            removeParticle(bodyA);
            removeParticle(bodyB);
            spawnGreenPotion(clashX, clashY);
        }
    }
}

function spawnGreenPotion(x, y) {
    let greenBall = Bodies.circle(x, y, 7, {
        friction: 0.02,
        restitution: 0.4, 
        label: 'element_green',
        // Restored: Epic high-end chemical glowing filters
        // 恢复：绿色高级魔法发光滤镜，绝不偷工减料
        render: { 
            fillStyle: '#52d69b',
            strokeStyle: '#a9f5d4',
            lineWidth: 1,
            shadowBlur: 15,
            shadowColor: '#52d69b'
        }
    });
    liquidParticles.push(greenBall);
    Composite.add(engine.world, greenBall);
}

function removeParticle(body) {
    Composite.remove(engine.world, body);
    let idx = liquidParticles.indexOf(body);
    if (idx > -1) liquidParticles.splice(idx, 1);
}

function setupInteractionListeners() {
    canvas.addEventListener('mousedown', (e) => startDrawingLine(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => continueDrawingLine(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', () => stopDrawingLine());

    canvas.addEventListener('touchstart', (e) => {
        let touch = e.touches[0];
        startDrawingLine(touch.clientX, touch.clientY);
    });
    canvas.addEventListener('touchmove', (e) => {
        let touch = e.touches[0];
        continueDrawingLine(touch.clientX, touch.clientY);
    });
    canvas.addEventListener('touchend', () => stopDrawingLine());
}

function clearAllDrawnLines() {
    playerLines.forEach(line => Composite.remove(engine.world, line));
    playerLines = [];
    
    // Restore ink to full when line is wiped (重置线时自动恢复满能量条)
    currentInkLeft = MAX_INK_LENGTH;
    document.getElementById('ink-bar-fill').style.width = "100%";
      // Hook into Matter.js render pipeline to overlay a perfectly smooth canvas curve
// 挂载到 Matter.js 渲染管线，在底层方块上方实时渲染一条真正丝滑无缝、带圆头的完美物理线条
Events.on(render, 'afterRender', () => {
    if (playerLines.length === 0) return;

    let c = render.canvas;
    let context = c.getContext('2d');

    context.beginPath();
    context.lineWidth = 14;          // Match the physical body thickness (匹配物理方块的厚度)
    context.strokeStyle = '#ebd59b';  // Golden vine aesthetic color (金色笔迹颜色)
    context.lineCap = 'round';       // Force round caps to smooth corners (强制圆角过渡，消灭锯齿)
    context.lineJoin = 'round';      // Smooth out sharp bend joints (丝滑连接弯折处)

    // Move to the start position of the first drawn segment
    // 移至第一段画线物理方块的起点位置
    context.moveTo(playerLines[0].position.x, playerLines[0].position.y);

    // Smoothly draw lines across all rigid segment midpoints
    // 顺着所有物理方块的中心点，用 Canvas 连成一条绝对光滑的实线
    for (let i = 1; i < playerLines.length; i++) {
        context.lineTo(playerLines[i].position.x, playerLines[i].position.y);
    }
    context.stroke();
}，

