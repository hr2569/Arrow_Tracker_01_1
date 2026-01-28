package com.archeryscorer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.archeryscorer.app.data.model.*
import com.archeryscorer.app.ui.components.*
import com.archeryscorer.app.ui.theme.*

@Composable
fun ScoringScreen(
    session: Session?,
    targetType: TargetType,
    currentRound: Int,
    currentShots: List<Shot>,
    onShotAdded: (Float, Float, Int) -> Unit,
    onUndoShot: () -> Unit,
    onFinishRound: () -> Unit,
    onEndSession: () -> Unit,
    onBack: () -> Unit
) {
    val arrowsPerRound = 3
    val roundScore = currentShots.sumOf { it.ring }
    val totalScore = (session?.totalScore ?: 0) + roundScore
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        TopBar(
            title = "Round $currentRound",
            onBackClick = onBack,
            actions = {
                TextButton(onClick = onEndSession) {
                    Text("End Session", color = Primary)
                }
            }
        )
        
        // Score display
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Round",
                    fontSize = 12.sp,
                    color = DarkOnSurfaceVariant
                )
                Text(
                    text = roundScore.toString(),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Total",
                    fontSize = 12.sp,
                    color = DarkOnSurfaceVariant
                )
                Text(
                    text = totalScore.toString(),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
        
        // Shot indicators
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            currentShots.forEachIndexed { index, shot ->
                ShotBadge(
                    score = shot.ring,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
            }
            
            // Empty slots
            repeat(arrowsPerRound - currentShots.size) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(32.dp)
                        .background(
                            color = DarkSurface,
                            shape = RoundedCornerShape(16.dp)
                        )
                )
            }
        }
        
        // Target Face
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            TargetFace(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                targetType = targetType,
                shots = currentShots,
                onTap = if (currentShots.size < arrowsPerRound) {
                    { x, y, ring -> onShotAdded(x, y, ring) }
                } else null
            )
        }
        
        // Instructions
        Text(
            text = if (currentShots.size < arrowsPerRound) {
                "Tap where your arrow landed (${currentShots.size}/$arrowsPerRound)"
            } else {
                "Round complete! Finish round to continue."
            },
            fontSize = 14.sp,
            color = DarkOnSurfaceVariant,
            modifier = Modifier
                .padding(horizontal = 20.dp)
                .align(Alignment.CenterHorizontally)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Action buttons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onUndoShot,
                enabled = currentShots.isNotEmpty(),
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Undo,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Undo")
            }
            
            Button(
                onClick = onFinishRound,
                enabled = currentShots.size == arrowsPerRound,
                modifier = Modifier.weight(2f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Primary
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Finish Round")
            }
        }
    }
}
