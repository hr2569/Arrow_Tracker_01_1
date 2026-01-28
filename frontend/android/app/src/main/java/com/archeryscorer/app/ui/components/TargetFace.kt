package com.archeryscorer.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.archeryscorer.app.data.model.Shot
import com.archeryscorer.app.data.model.TargetType
import com.archeryscorer.app.ui.theme.*
import kotlin.math.sqrt

data class SpotCenter(val x: Float, val y: Float)

@Composable
fun TargetFace(
    modifier: Modifier = Modifier,
    targetType: TargetType = TargetType.WA_STANDARD,
    shots: List<Shot> = emptyList(),
    onTap: ((Float, Float, Int) -> Unit)? = null,
    showShots: Boolean = true
) {
    val ringColors = listOf(
        RingWhite, RingWhite,      // 1-2
        RingBlack, RingBlack,      // 3-4
        RingBlue, RingBlue,        // 5-6
        RingRed, RingRed,          // 7-8
        RingGold, RingGold         // 9-10
    )

    Canvas(
        modifier = modifier
            .aspectRatio(1f)
            .pointerInput(targetType) {
                detectTapGestures { offset ->
                    onTap?.let { callback ->
                        val normalizedX = offset.x / size.width
                        val normalizedY = offset.y / size.height
                        val ring = calculateRing(normalizedX, normalizedY, targetType)
                        callback(normalizedX, normalizedY, ring)
                    }
                }
            }
    ) {
        when (targetType) {
            TargetType.WA_STANDARD -> drawWAStandardTarget(ringColors)
            TargetType.VEGAS_3SPOT -> drawVegas3SpotTarget()
            TargetType.NFAA_INDOOR -> drawNFAAIndoorTarget()
        }
        
        if (showShots) {
            shots.forEach { shot ->
                drawShot(shot, targetType)
            }
        }
    }
}

private fun DrawScope.drawWAStandardTarget(ringColors: List<Color>) {
    val centerX = size.width / 2
    val centerY = size.height / 2
    val maxRadius = size.minDimension / 2 * 0.9f
    
    // Draw rings from outside to inside
    for (ring in 1..10) {
        val radiusPercent = (11 - ring) / 10f
        val radius = maxRadius * radiusPercent
        val color = ringColors[ring - 1]
        
        drawCircle(
            color = color,
            radius = radius,
            center = Offset(centerX, centerY)
        )
        
        // Draw ring border
        val borderColor = when {
            ring <= 2 -> Color(0xFFCCCCCC)
            ring <= 4 -> Color(0xFF444444)
            ring <= 6 -> Color(0xFF0077B3)
            ring <= 8 -> Color(0xFFB31217)
            else -> Color(0xFFCCAA00)
        }
        drawCircle(
            color = borderColor,
            radius = radius,
            center = Offset(centerX, centerY),
            style = Stroke(width = 1.dp.toPx())
        )
    }
    
    // Draw center X mark
    val crossSize = 8.dp.toPx()
    drawLine(
        color = Color(0xFF333333),
        start = Offset(centerX - crossSize, centerY),
        end = Offset(centerX + crossSize, centerY),
        strokeWidth = 2.dp.toPx()
    )
    drawLine(
        color = Color(0xFF333333),
        start = Offset(centerX, centerY - crossSize),
        end = Offset(centerX, centerY + crossSize),
        strokeWidth = 2.dp.toPx()
    )
}

private fun DrawScope.drawVegas3SpotTarget() {
    val spotRadius = size.minDimension * 0.19f
    
    // Inverted triangle: 1 on top, 2 on bottom
    val spotCenters = listOf(
        SpotCenter(0.5f, 0.28f),   // Top center
        SpotCenter(0.29f, 0.72f),  // Bottom left
        SpotCenter(0.71f, 0.72f)   // Bottom right
    )
    
    spotCenters.forEach { spot ->
        drawSingleSpot(
            centerX = size.width * spot.x,
            centerY = size.height * spot.y,
            radius = spotRadius
        )
    }
}

private fun DrawScope.drawNFAAIndoorTarget() {
    val spotRadius = size.minDimension * 0.14f
    
    // Vertical stack: 3 targets
    val spotCenters = listOf(
        SpotCenter(0.5f, 0.17f),   // Top
        SpotCenter(0.5f, 0.5f),    // Middle
        SpotCenter(0.5f, 0.83f)    // Bottom
    )
    
    spotCenters.forEach { spot ->
        drawSingleSpot(
            centerX = size.width * spot.x,
            centerY = size.height * spot.y,
            radius = spotRadius
        )
    }
}

private fun DrawScope.drawSingleSpot(centerX: Float, centerY: Float, radius: Float) {
    // Blue outer ring
    drawCircle(
        color = RingBlue,
        radius = radius,
        center = Offset(centerX, centerY)
    )
    drawCircle(
        color = Color(0xFF0077B3),
        radius = radius,
        center = Offset(centerX, centerY),
        style = Stroke(width = 1.dp.toPx())
    )
    
    // Red middle ring
    drawCircle(
        color = RingRed,
        radius = radius * 0.65f,
        center = Offset(centerX, centerY)
    )
    drawCircle(
        color = Color(0xFFB31217),
        radius = radius * 0.65f,
        center = Offset(centerX, centerY),
        style = Stroke(width = 1.dp.toPx())
    )
    
    // Gold center
    drawCircle(
        color = RingGold,
        radius = radius * 0.35f,
        center = Offset(centerX, centerY)
    )
    drawCircle(
        color = Color(0xFFCCAA00),
        radius = radius * 0.35f,
        center = Offset(centerX, centerY),
        style = Stroke(width = 1.dp.toPx())
    )
}

private fun DrawScope.drawShot(shot: Shot, targetType: TargetType) {
    val x = shot.x * size.width
    val y = shot.y * size.height
    val dotRadius = 8.dp.toPx()
    
    val color = when {
        shot.ring >= 9 -> RingGold
        shot.ring >= 7 -> Color(0xFFFF6B6B)
        shot.ring >= 5 -> Color(0xFF4ECDC4)
        shot.ring >= 3 -> Color(0xFF45B7D1)
        else -> Color(0xFF888888)
    }
    
    // Draw shot dot
    drawCircle(
        color = color,
        radius = dotRadius,
        center = Offset(x, y)
    )
    drawCircle(
        color = Color.Black,
        radius = dotRadius,
        center = Offset(x, y),
        style = Stroke(width = 1.dp.toPx())
    )
}

private fun calculateRing(normalizedX: Float, normalizedY: Float, targetType: TargetType): Int {
    return when (targetType) {
        TargetType.WA_STANDARD -> calculateWARing(normalizedX, normalizedY)
        TargetType.VEGAS_3SPOT -> calculateMultiSpotRing(normalizedX, normalizedY, getVegasSpotCenters(), 0.19f)
        TargetType.NFAA_INDOOR -> calculateMultiSpotRing(normalizedX, normalizedY, getNFAASpotCenters(), 0.14f)
    }
}

private fun calculateWARing(normalizedX: Float, normalizedY: Float): Int {
    val centerX = 0.5f
    val centerY = 0.5f
    val distance = sqrt((normalizedX - centerX) * (normalizedX - centerX) + 
                        (normalizedY - centerY) * (normalizedY - centerY))
    
    val maxRadius = 0.45f // 90% of half width
    val normalizedDistance = distance / maxRadius
    
    return when {
        normalizedDistance > 1.0f -> 0 // Miss
        else -> (10 - (normalizedDistance * 10).toInt()).coerceIn(0, 10)
    }
}

private fun calculateMultiSpotRing(
    normalizedX: Float,
    normalizedY: Float,
    spotCenters: List<SpotCenter>,
    spotRadius: Float
): Int {
    var minDistance = Float.MAX_VALUE
    var closestSpot: SpotCenter? = null
    
    spotCenters.forEach { spot ->
        val distance = sqrt((normalizedX - spot.x) * (normalizedX - spot.x) + 
                            (normalizedY - spot.y) * (normalizedY - spot.y))
        if (distance < minDistance) {
            minDistance = distance
            closestSpot = spot
        }
    }
    
    closestSpot?.let { spot ->
        val distance = sqrt((normalizedX - spot.x) * (normalizedX - spot.x) + 
                            (normalizedY - spot.y) * (normalizedY - spot.y))
        val normalizedDistance = distance / spotRadius
        
        return when {
            normalizedDistance > 1.0f -> 0 // Miss
            normalizedDistance <= 0.35f -> 10 // X/10 (gold)
            normalizedDistance <= 0.65f -> 9 // 9 (red)
            else -> 8 // 8 (blue)
        }
    }
    
    return 0
}

private fun getVegasSpotCenters() = listOf(
    SpotCenter(0.5f, 0.28f),
    SpotCenter(0.29f, 0.72f),
    SpotCenter(0.71f, 0.72f)
)

private fun getNFAASpotCenters() = listOf(
    SpotCenter(0.5f, 0.17f),
    SpotCenter(0.5f, 0.5f),
    SpotCenter(0.5f, 0.83f)
)
