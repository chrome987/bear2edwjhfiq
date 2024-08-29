export function showBearFoundEffect(x, y, canvasState, canvas, ctx, effectCanvas, effectCtx) {
    const smallerSide = Math.min(effectCanvas.width, effectCanvas.height);
    const speedPercentage = 0.10;  // 5% от меньшей стороны экрана
    const speed = smallerSide * speedPercentage;

    const effect = {
        rectColor: 'rgba(0, 0, 0, 0.9)', // Цвет затемнения
        maskSize: { width: smallerSide, height: smallerSide },
        maskTargetSize: { width: 200, height: 200 },
        maskPosition: { x: 0, y: 0 },
        maskTargetPosition: { x: x - canvasState.offsetX - 100, y: y - canvasState.offsetY - 100 }, // Используем реальные игровые координаты с учетом смещения холста
        flashOpacity: 0,
        phase: 'shrink', // Начинаем с сжатия маски
        speed: speed // Добавляем скорость как свойство эффекта
    };

    canvasState.effects.push(effect);
    requestAnimationFrame(() => animateEffect(effect, canvasState, canvas, ctx, effectCanvas, effectCtx));
}

function animateEffect(effect, canvasState, canvas, ctx, effectCanvas, effectCtx) {
    if (effect.phase === 'shrink') {
        // Сжимаем маску к целевой области
        effect.maskSize.width -= effect.speed;
        effect.maskSize.height -= effect.speed;

        // Пересчитываем позицию маски, чтобы центр оставался на месте клика
        effect.maskPosition.x = (canvas.width - effect.maskSize.width) / 2;
        effect.maskPosition.y = (canvas.height - effect.maskSize.height) / 2;

        if (effect.maskSize.width <= effect.maskTargetSize.width || effect.maskSize.height <= effect.maskTargetSize.height) {
            effect.phase = 'flash';
            effect.flashOpacity = 1;
        }
    } else if (effect.phase === 'flash') {
        // Вспышка
        effect.flashOpacity -= 0.1;
        if (effect.flashOpacity <= 0) {
            effect.phase = 'expand';
        }
    } else if (effect.phase === 'expand') {
        // Расширяем маску обратно на весь холст
        effect.maskSize.width += effect.speed * 2;
        effect.maskSize.height += effect.speed * 2;

        // Пересчитываем позицию маски, чтобы она расширялась от центра
        effect.maskPosition.x = (canvas.width - effect.maskSize.width) / 2;
        effect.maskPosition.y = (canvas.height - effect.maskSize.height) / 2;

        if (effect.maskSize.width >= effectCanvas.width && effect.maskSize.height >= effectCanvas.height) {
            // Удаляем эффект после завершения анимации
            const index = canvasState.effects.indexOf(effect);
            if (index > -1) {
                canvasState.effects.splice(index, 1);
            }
            return;
        }
    }

    drawEffectLayer(effect, effectCanvas, effectCtx);
    requestAnimationFrame(() => animateEffect(effect, canvasState, canvas, ctx, effectCanvas, effectCtx));
}

function drawEffectLayer(effect, effectCanvas, effectCtx) {
    // Очистка холста эффекта
    effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);

    // Сначала рисуем затемнение
    effectCtx.fillStyle = effect.rectColor;
    effectCtx.fillRect(0, 0, effectCanvas.width, effectCanvas.height);

    // Рисуем область, где затемнение будет прозрачным
    effectCtx.globalCompositeOperation = 'destination-out'; // Режим удаления
    effectCtx.beginPath();
    effectCtx.ellipse(
        effect.maskTargetPosition.x + effect.maskTargetSize.width / 2,
        effect.maskTargetPosition.y + effect.maskTargetSize.height / 2,
        effect.maskSize.width / 2,
        effect.maskSize.height / 2,
        0,
        0,
        2 * Math.PI
    );
    effectCtx.fill();
    effectCtx.globalCompositeOperation = 'source-over'; // Возвращаем нормальный режим

    // Отрисовка вспышки снизу
    if (effect.phase === 'flash' && effect.flashOpacity > 0) {
        effectCtx.fillStyle = `rgba(255, 255, 255, ${effect.flashOpacity})`;
        effectCtx.fillRect(0, effectCanvas.height - 50, effectCanvas.width, 50); // Вспышка снизу
    }
}

export function drawEffects(canvasState, canvas, ctx, effectCanvas, effectCtx) {
    canvasState.effects.forEach(effect => {
        drawEffectLayer(effect, effectCanvas, effectCtx);
    });

    // Рисуем эффекты поверх основного контента
    ctx.drawImage(effectCanvas, 0, 0);
}