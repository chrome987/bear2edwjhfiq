
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const effectCanvas = document.getElementById('effectCanvas');
const effectCtx = effectCanvas.getContext('2d');
effectCanvas.width = canvas.width;
effectCanvas.height = canvas.height;
document.body.appendChild(effectCanvas);

// Настройка холста и состояния
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

effectCanvas.width = window.innerWidth;
effectCanvas.height = window.innerHeight;

const gameFieldWidth = window.innerWidth * 5;
const gameFieldHeight = window.innerHeight * 5;

const pointsDensity = 0.0004;

const repulsionStrength = 5000
const repulsionRadius = 10

const spaceBuffer = 10;

const bearMargin = 400;
const fixedBearCount = 10;

// Константы
const STROKE_WIDTH = 15;  // Толщина линии штриха
const MAX_ANGLE_DEVIATION = Math.PI / 10;  // Максимальное отклонение от горизонтали (примерно 15 градусов)
const STROKE_GRID_SIZE = 90;  // Размер ячейки сетки
const SEGMENT_COUNT = 3;  // Количество сегментов в серии штрихов
const SEGMENT_LENGTH = 50;   // Длина каждого сегмента
const CURVATURE = 5;  // Сила кривизны для сегментов
const MAX_OFFSET = 15;   // Максимальное смещение от центра ячейки
const COLORS = ['#80bd5e', '#f7ee89'];  // Доступные цвета


const rotationMultiplier = 1;



export const sprites = [
    
    {
        imagePath: './images/Bear1.png',
        spawnRate: 10,
        scale: 0.3,
        isBear: true
    },
    {
        imagePath: './images/TreeEl.png',
        spawnRate: 3,
        scale: 0.5
    },
    {
        imagePath: './images/TreeDub.png',
        spawnRate: 3,
        scale: 0.5
    },
    {
        imagePath: './images/TreeBereza.png',
        spawnRate: 11,
        scale: 0.5
    },
    {
        imagePath: './images/Bush11.png',
        spawnRate: 11,
        scale: 0.4
    },
    {
        imagePath: './images/Bush12.png',
        spawnRate: 11,
        scale: 0.4
    },
    {
        imagePath: './images/Bush13.png',
        spawnRate: 11,
        scale: 0.5
    },
    {
        imagePath: './images/Stone11.png',
        spawnRate: 11,
        scale: 0.3
    },
    {
        imagePath: './images/Stone12.png',
        spawnRate: 1,
        scale: 0.3
    },
];


const canvasState = {
    sprites: [],
    points: [],
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    velocityX: 0,
    velocityY: 0,
    friction: 0.9,
    messages: [],
    effects: [],
    swirls: []
};

console.log("canvasState: ", canvasState);

// Загрузка спрайтов
loadSprites(sprites).then(loadedSprites => {
    canvasState.sprites = loadedSprites;

    showWelcomeMessage();

    generatePoints();
    initializeBackground();

    render();
});

function generatePoints() {
    const area = gameFieldWidth * gameFieldHeight;
    const pointCount = Math.floor(area * pointsDensity);
    const totalSpawnRate = canvasState.sprites.reduce((sum, sprite) => sum + sprite.spawnRate, 0);

    let bearsGenerated = 0;

    for (let i = 0; i < pointCount; i++) {
        let randomValue = Math.random() * totalSpawnRate;
        let accumulatedRate = 0;

        for (let sprite of canvasState.sprites) {
            accumulatedRate += sprite.spawnRate;
            if (randomValue < accumulatedRate) {

                let minX, maxX, minY, maxY;

                // Применение отступов только для медведей
                if (sprite.isBear) {
                    if (bearsGenerated >= fixedBearCount) break; // Достаточно медведей

                    const spriteWidth = sprite.img.width * sprite.scale;
                    const spriteHeight = sprite.img.height * sprite.scale;

                    minX = bearMargin;
                    maxX = gameFieldWidth - bearMargin;
                    minY = bearMargin;
                    maxY = gameFieldHeight - bearMargin;

                    // Проверка на минимальное расстояние от краев локации
                    let isValidPosition = false;
                    let point;

                    for (let attempts = 0; attempts < 100; attempts++) {
                        const x = Math.random() * (maxX - minX) + minX;
                        const y = Math.random() * (maxY - minY) + minY;

                        // Проверка на минимальное расстояние до других медведей
                        isValidPosition = !canvasState.points.some(otherPoint => {
                            if (!otherPoint.sprite.isBear) return false;
                            const distance = Math.hypot(x - otherPoint.x, y - otherPoint.y);
                            return distance < 2 * spriteWidth; // Минимальное расстояние между медведями
                        });

                        if (isValidPosition) {
                            point = {
                                x,
                                y,
                                sprite: sprite,
                                flipped: Math.random() < 0.5,
                                rotationAngle: 0,
                                rotationSpeed: (Math.random() * 0.02 - 0.01) * rotationMultiplier,
                                jumpOffset: 0,
                                isJumping: false,
                                jumpDirection: 1,
                                jumpSpeed: 1,
                                hasJumped: false
                            };
                            break;
                        }
                    }

                    if (isValidPosition) {
                        canvasState.points.push(point);
                        bearsGenerated++;
                    }
                } else {
                    // Для остальных спрайтов используются стандартные границы
                    minX = 0;
                    maxX = gameFieldWidth;
                    minY = 0;
                    maxY = gameFieldHeight;

                    const point = {
                        x: Math.random() * (maxX - minX) + minX,
                        y: Math.random() * (maxY - minY) + minY,
                        sprite: sprite,
                        flipped: Math.random() < 0.5,
                        rotationAngle: 0,
                        rotationSpeed: 0,
                        jumpOffset: 0,
                        isJumping: false,
                        jumpDirection: 1,
                        jumpSpeed: 1,
                        hasJumped: false
                    };

                    canvasState.points.push(point);
                }
                break;
            }
        }
    }

    // Удаление медведей, находящихся слишком близко друг к другу
    canvasState.points = canvasState.points.filter((point, index, self) => {
        if (!point.sprite.isBear) return true;

        return !self.some((otherPoint, otherIndex) => {
            if (index === otherIndex || !otherPoint.sprite.isBear) return false;
            const distance = Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y);
            return distance < 2 * (point.sprite.img.width * point.sprite.scale);
        });
    });

    // Удаление деревьев, перекрывающих медведей
    const overlapThreshold = 0.8; // Пороговое значение перекрытия (0.3 означает 30%)

    canvasState.points = canvasState.points.filter((point, index, self) => {
        if (point.sprite.isBear) return true;
    
        return !self.some(bearPoint => {
            if (!bearPoint.sprite.isBear) return false;
    
            const bearWidth = bearPoint.sprite.img.width * bearPoint.sprite.scale;
            const bearHeight = bearPoint.sprite.img.height * bearPoint.sprite.scale;
            const treeWidth = point.sprite.img.width * point.sprite.scale;
            const treeHeight = point.sprite.img.height * point.sprite.scale;
    
            // Проверка на перекрытие
            const overlapX = Math.max(0, Math.min(bearPoint.x + bearWidth / 2, point.x + treeWidth / 2) - Math.max(bearPoint.x - bearWidth / 2, point.x - treeWidth / 2));
            const overlapY = Math.max(0, Math.min(bearPoint.y + bearHeight / 2, point.y + treeHeight / 2) - Math.max(bearPoint.y - bearHeight / 2, point.y - treeHeight / 2));
    
            const overlapArea = overlapX * overlapY;
            const bearArea = bearWidth * bearHeight;
    
            // Удаляем дерево, если перекрытие превышает заданный порог
            return overlapArea > overlapThreshold * bearArea;
        });
    });



    // Вывод оставшихся медведей
    console.log("Bears: ", canvasState.points.filter(point => point.sprite.isBear));
}



function createCurveSegment(path, currentX, currentY, angle, segmentLength, curvature, isTight) {
    const radius = isTight ? segmentLength * 0.75 : segmentLength;

    // Генерация контрольных точек для кубической кривой Безье
    const controlX1 = currentX + Math.cos(angle) * (radius / 2) + curvature * Math.cos(angle + Math.PI / 4);
    const controlY1 = currentY + Math.sin(angle) * (radius / 2) + curvature * Math.sin(angle + Math.PI / 4);

    const controlX2 = currentX + Math.cos(angle) * (radius / 2) + curvature * Math.cos(angle - Math.PI / 4);
    const controlY2 = currentY + Math.sin(angle) * (radius / 2) + curvature * Math.sin(angle - Math.PI / 4);

    const endX = currentX + Math.cos(angle) * radius;
    const endY = currentY + Math.sin(angle) * radius;

    // Используем кубическую кривую Безье для большей плавности
    path.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);

    return { endX, endY };
}



function generateStrokeWithType(x, y, type = 'default') {
    const path = new Path2D();
    path.moveTo(x, y);

    let currentX = x;
    let currentY = y;
    let previousAngle = 0;  // Начинаем с горизонтального направления
    let flip = true; // Переключатель направления для параллельных линий

    for (let i = 0; i < SEGMENT_COUNT; i++) {
        let angle;
        let isTight = false;

        if (type === 'tight') {
            // Для "узелка" используем более крутые повороты и уменьшаем радиус
            angle = previousAngle + (Math.random() * MAX_ANGLE_DEVIATION * 2 - MAX_ANGLE_DEVIATION);
            isTight = true;
        } else {
            // Обычная серия штрихов
            angle = previousAngle + (Math.random() * MAX_ANGLE_DEVIATION * 2 - MAX_ANGLE_DEVIATION);
        }

        const { endX, endY } = createCurveSegment(path, currentX, currentY, angle, SEGMENT_LENGTH, CURVATURE, isTight);

        currentX = endX;
        currentY = endY;
        previousAngle = angle;
    }

    return path;
}





function generateStroke(x, y) {
    const types = ['default', 'tight'];
    const type = types[Math.floor(Math.random() * types.length)];

    return generateStrokeWithType(x, y, type);
}






function initializeBackground() {
    const cols = Math.ceil(gameFieldWidth / STROKE_GRID_SIZE);
    const rows = Math.ceil(gameFieldHeight / STROKE_GRID_SIZE);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const baseX = col * STROKE_GRID_SIZE + STROKE_GRID_SIZE / 2;
            const baseY = row * STROKE_GRID_SIZE + STROKE_GRID_SIZE / 2;

            const offsetX = (Math.random() * 2 - 1) * MAX_OFFSET;
            const offsetY = (Math.random() * 2 - 1) * MAX_OFFSET;

            const x = baseX + offsetX;
            const y = baseY + offsetY;

            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const path = generateStroke(x, y);

            canvasState.swirls.push({ x, y, path, color });
        }
    }
}









function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvasState.swirls.forEach(stroke => {
        ctx.save();
        ctx.translate(stroke.x - canvasState.offsetX, stroke.y - canvasState.offsetY);

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = STROKE_WIDTH;
        ctx.lineCap = "round";
        ctx.stroke(stroke.path);

        ctx.restore();
    });
}







// Отрисовка на холсте
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    // Координаты центра экрана
    const centerX = canvas.width / 2 + canvasState.offsetX;
    const centerY = canvas.height / 2 + canvasState.offsetY;

    // Увеличение области для реакции медведей
    const triggerRadius = 100; // Радиус триггерной области

    canvasState.points.sort((a, b) => {
        const aBottom = a.y + (a.sprite.img.height * a.sprite.scale) / 2;
        const bBottom = b.y + (b.sprite.img.height * b.sprite.scale) / 2;
        return aBottom - bBottom;
    });

    let remainingBears = 0;

    for (let point of canvasState.points) {
        const { x, y, sprite, flipped, jumpOffset, isJumping, jumpDirection, jumpSpeed, hasJumped } = point;

        if (sprite.isBear) {
            remainingBears++;
            // Обновляем угол поворота для медведей
            point.rotationAngle += point.rotationSpeed;

            // Ограничиваем угол в пределах -10 до 10 градусов (примерно -0.1745 до 0.1745 радиан)
            const maxAngle = Math.PI / 18; // 10 градусов в радианах
            if (point.rotationAngle > maxAngle) {
                point.rotationAngle = maxAngle;
                point.rotationSpeed *= -1; // Меняем направление вращения
            } else if (point.rotationAngle < -maxAngle) {
                point.rotationAngle = -maxAngle;
                point.rotationSpeed *= -1; // Меняем направление вращения
            }

            // Проверяем расстояние до центра экрана
            const distanceToCenter = Math.hypot(centerX - x, centerY - y);

            if (distanceToCenter <= triggerRadius && !hasJumped) {
                point.isJumping = true; // Инициализируем прыжок
                point.hasJumped = true; // Отмечаем, что медведь уже прыгал
            } else if (distanceToCenter > triggerRadius) {
                // Сбрасываем флаг, если медведь вышел за пределы области
                point.hasJumped = false;
            }

            // Обработка подпрыгивания для медведей
            if (isJumping) {
                point.jumpOffset += jumpDirection * jumpSpeed;

                // Если медведь достиг максимальной высоты или вернулся на землю
                if (point.jumpOffset >= 10) {  // Скорректируйте значение для нужной высоты
                    point.jumpDirection = -1; // Начинаем опускание
                } else if (point.jumpOffset <= 0) {
                    point.jumpOffset = 0;
                    point.isJumping = false; // Завершаем прыжок
                    point.jumpDirection = 1; // Сбрасываем направление прыжка
                }
            }
        }

        ctx.save(); // Сохраняем текущую матрицу трансформации

        // Перемещаемся в точку центра спрайта
        ctx.translate(x - canvasState.offsetX, y - canvasState.offsetY - (sprite.isBear ? jumpOffset : 0));

        // Поворачиваем на заданный угол только для медведей
        if (sprite.isBear) {
            ctx.rotate(point.rotationAngle);
        }

        // Отображаем спрайт с учетом зеркальности
        if (flipped) {
            ctx.scale(-1, 1);
        }

        ctx.drawImage(
            sprite.img,
            - (sprite.img.width * sprite.scale) / 2,
            - (sprite.img.height * sprite.scale) / 2,
            sprite.img.width * sprite.scale,
            sprite.img.height * sprite.scale
        );

        ctx.restore(); // Восстанавливаем матрицу трансформации
    }

    // Обновляем счетчик медведей
    document.getElementById('bearCount').innerText = remainingBears;

    // Остальная часть функции render
    // Отрисовка сообщений
    for (let message of canvasState.messages) {
        ctx.save();
        ctx.globalAlpha = message.opacity;
        ctx.font = "bold 36px Arial";

        const textWidth = ctx.measureText(message.text).width;

        ctx.fillStyle = "#FFF";
        ctx.fillText(
            message.text,
            message.x - canvasState.offsetX - textWidth / 2,
            message.y - canvasState.offsetY + message.offsetY
        );

        // Настройка обводки текста
        ctx.strokeStyle = "#FFF3"; // цвет обводки, выберите нужный
        ctx.lineWidth = 0.5; // ширина линии обводки
        ctx.strokeText(
            message.text,
            message.x - canvasState.offsetX - textWidth / 2,
            message.y - canvasState.offsetY + message.offsetY
        );
        ctx.restore();
    }

    if (!canvasState.dragging) {
        canvasState.offsetX -= canvasState.velocityX;
        canvasState.offsetY -= canvasState.velocityY;

        // Применяем трение для затухания скорости
        canvasState.velocityX *= canvasState.friction;
        canvasState.velocityY *= canvasState.friction;

        // Если скорость практически равна нулю, обнуляем её
        if (Math.abs(canvasState.velocityX) < 0.1) canvasState.velocityX = 0;
        if (Math.abs(canvasState.velocityY) < 0.1) canvasState.velocityY = 0;
    }

    // Проверка границ игрового мира
    const worldWidth = gameFieldWidth;  // Ширина виртуального мира
    const worldHeight = gameFieldHeight;  // Высота виртуального мира

    // Ограничиваем смещение по X
    if (canvasState.offsetX < 0) {
        canvasState.offsetX = 0;
        canvasState.velocityX = 0;
    } else if (canvasState.offsetX > worldWidth - canvas.width) {
        canvasState.offsetX = worldWidth - canvas.width;
        canvasState.velocityX = 0;
    }

    // Ограничиваем смещение по Y
    if (canvasState.offsetY < 0) {
        canvasState.offsetY = 0;
        canvasState.velocityY = 0;
    } else if (canvasState.offsetY > worldHeight - canvas.height) {
        canvasState.offsetY = worldHeight - canvas.height;
        canvasState.velocityY = 0;
    }
    requestAnimationFrame(render);
}




// Обработчики событий мыши для перемещения
canvas.addEventListener('mousedown', (e) => {
    canvasState.dragging = true;
    canvasState.lastMouseX = e.clientX;
    canvasState.lastMouseY = e.clientY;

    canvasState.velocityX = 0;
    canvasState.velocityY = 0;
});

canvas.addEventListener('mousemove', (e) => {
    if (canvasState.dragging) {
        const deltaX = e.clientX - canvasState.lastMouseX;
        const deltaY = e.clientY - canvasState.lastMouseY;

        canvasState.offsetX = Math.min(Math.max(canvasState.offsetX - deltaX, 0), gameFieldWidth - canvas.width);
        canvasState.offsetY = Math.min(Math.max(canvasState.offsetY - deltaY, 0), gameFieldHeight - canvas.height);

        canvasState.velocityX = deltaX;
        canvasState.velocityY = deltaY;

        canvasState.lastMouseX = e.clientX;
        canvasState.lastMouseY = e.clientY;
    }
});

canvas.addEventListener('mouseup', () => {
    canvasState.dragging = false;
});

canvas.addEventListener('mouseleave', () => {
    canvasState.dragging = false;
});



// Загрузка спрайтов
function loadSprites(sprites) {
    return Promise.all(sprites.map(sprite => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = sprite.imagePath;
            img.onload = () => resolve({ ...sprite, img });
            img.onerror = reject;
        });
    }));
}



function showBearFoundMessage(x, y) {
    const message = {
        text: "+1 очко",
        x: x,
        y: y,
        opacity: 1,
        offsetY: 0
    };

    canvasState.messages.push(message);

    const animateMessage = () => {
        message.offsetY -= 1;  // Поднимаем текст вверх
        message.opacity -= 0.01;  // Уменьшаем прозрачность

        if (message.opacity <= 0) {
            // Удаляем сообщение, когда оно стало полностью прозрачным
            const index = canvasState.messages.indexOf(message);
            if (index > -1) {
                canvasState.messages.splice(index, 1);
            }
        } else {
            requestAnimationFrame(animateMessage);
        }
    };

    requestAnimationFrame(animateMessage);
}










canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const touchX = touch.clientX + canvasState.offsetX;
    const touchY = touch.clientY + canvasState.offsetY;

    let bearClicked = false;

    if (!bearClicked) {
        // Начинаем отслеживание для свайпа
        canvasState.dragging = true;
        canvasState.lastMouseX = touch.clientX;
        canvasState.lastMouseY = touch.clientY;
        canvasState.velocityX = 0; // Обнуляем скорость при новом касании
        canvasState.velocityY = 0;
    }
});




canvas.addEventListener('touchmove', (e) => {
    if (!canvasState.dragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - canvasState.lastMouseX;
    const deltaY = touch.clientY - canvasState.lastMouseY;

    // Обновляем смещение холста
    canvasState.offsetX -= deltaX;
    canvasState.offsetY -= deltaY;

    // Ограничиваем смещение, чтобы не выходить за границы игрового поля
    const maxOffsetX = gameFieldWidth - canvas.width;
    const maxOffsetY = gameFieldHeight - canvas.height;

    canvasState.offsetX = Math.max(0, Math.min(canvasState.offsetX, maxOffsetX));
    canvasState.offsetY = Math.max(0, Math.min(canvasState.offsetY, maxOffsetY));

    // Обновляем скорость для инерции
    canvasState.velocityX = deltaX;
    canvasState.velocityY = deltaY;

    canvasState.lastMouseX = touch.clientX;
    canvasState.lastMouseY = touch.clientY;

    // Предотвращение стандартного поведения браузера при свайпе
    e.preventDefault();
});


canvas.addEventListener('touchend', () => {
    canvasState.dragging = false;
});

function applyInertia() {
    if (!canvasState.dragging) {
        // Применение инерции
        canvasState.offsetX -= canvasState.velocityX;
        canvasState.offsetY -= canvasState.velocityY;

        // Применяем трение для затухания скорости
        canvasState.velocityX *= canvasState.friction;
        canvasState.velocityY *= canvasState.friction;

        // Ограничиваем смещение, чтобы не выходить за границы игрового поля
        const maxOffsetX = gameFieldWidth - canvas.width;
        const maxOffsetY = gameFieldHeight - canvas.height;

        canvasState.offsetX = Math.max(0, Math.min(canvasState.offsetX, maxOffsetX));
        canvasState.offsetY = Math.max(0, Math.min(canvasState.offsetY, maxOffsetY));

        // Если скорость практически равна нулю, обнуляем её
        if (Math.abs(canvasState.velocityX) < 0.1) canvasState.velocityX = 0;
        if (Math.abs(canvasState.velocityY) < 0.1) canvasState.velocityY = 0;
    }

    requestAnimationFrame(applyInertia);
}


// Запуск инерции
applyInertia();






document.getElementById('checkCenterButton').addEventListener('click', () => {
    // Координаты центра экрана
    const centerX = canvas.width / 2 + canvasState.offsetX;
    const centerY = canvas.height / 2 + canvasState.offsetY;

    let bearFound = false;

    // Допустимое расширение области проверки (в пикселях)
    const tolerance = 50;

    // Проверка наличия медведя в расширенной области центра экрана
    for (let i = 0; i < canvasState.points.length; i++) {
        const point = canvasState.points[i];
        const { x, y, sprite } = point;

        const spriteWidth = sprite.img.width * sprite.scale;
        const spriteHeight = sprite.img.height * sprite.scale;

        // Корректировка хитбокса с учетом зеркальности спрайта
        const hitboxX = x - spriteWidth / 2;
        const hitboxY = y - spriteHeight / 2;

        // Проверяем, находится ли центр экрана (с допуском) внутри хитбокса медведя
        if (
            centerX >= hitboxX - tolerance &&
            centerX <= hitboxX + spriteWidth + tolerance &&
            centerY >= hitboxY - tolerance &&
            centerY <= hitboxY + spriteHeight + tolerance &&
            sprite.isBear
        ) {
            bearFound = true;
            showBearFoundMessage(centerX, centerY);
            canvasState.points.splice(i, 1); // Удаляем найденного медведя из массива
            triggerFlashEffect(); // Вызов эффекта вспышки
            break;
        }
    }

    if (!bearFound) {
        triggerRedBorderEffect(); // Вызов эффекта красной границы
    } else {
        setTimeout(checkIfAllBearsFound, 300);
    }
});

function triggerFlashEffect() {
    const flash = document.createElement('div');
    flash.className = 'flash-effect';
    document.body.appendChild(flash);

    flash.addEventListener('animationend', () => {
        document.body.removeChild(flash);
    });
}

function triggerRedBorderEffect() {
    const border = document.createElement('div');
    border.className = 'red-border';
    document.body.appendChild(border);

    border.addEventListener('animationend', () => {
        document.body.removeChild(border);
    });
}















function checkIfAllBearsFound() {
    const bearsLeft = canvasState.points.filter(point => point.sprite.isBear).length;
    if (bearsLeft === 0) {
        showWinMessage();
    }
}

function createModal(messageText, buttonText, buttonCallback) {
    // Создаем overlay для затемнения фона
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'block';

    // Создаем контейнер модального окна
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <p class="modal-text">${messageText}</p>
        <button class="modal-button">${buttonText}</button>
    `;

    document.body.appendChild(modal);

    // Обработчик клика по кнопке
    const button = modal.querySelector('.modal-button');
    button.addEventListener('click', () => {
        document.body.removeChild(modal);
        overlay.style.display = 'none'; // Убираем затемнение
        if (typeof buttonCallback === 'function') {
            buttonCallback();
        }
    });
}

function showWelcomeMessage() {
    createModal('Фотографируй медведей!', 'Старт', function () {});
}

function showWinMessage() {
    createModal('Поздравляем! Вы нашли всех медведей!', 'Перезапустить игру', restartGame);
}



function restartGame() {
    canvasState.points = [];
    generatePoints();
}



