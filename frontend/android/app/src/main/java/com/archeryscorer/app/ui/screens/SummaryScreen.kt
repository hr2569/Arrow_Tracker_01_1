package com.archeryscorer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
fun SummaryScreen(
    session: Session,
    onDone: () -> Unit,
    onNewRound: () -> Unit
) {
    val totalArrows = session.rounds.sumOf { it.shots.size }
    val avgPerArrow = if (totalArrows > 0) {
        String.format("%.1f", session.totalScore.toFloat() / totalArrows)
    } else "0.0"
    val avgPerRound = if (session.rounds.isNotEmpty()) {
        session.totalScore / session.rounds.size
    } else 0
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        TopBar(title = "Session Summary")
        
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 20.dp)
        ) {
            // Total Score Card
            item {
                Surface(
                    color = DarkSurface,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Total Score",
                            fontSize = 16.sp,
                            color = DarkOnSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = session.totalScore.toString(),
                            fontSize = 64.sp,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = session.name,
                            fontSize = 14.sp,
                            color = DarkOnSurfaceVariant
                        )
                    }
                }
            }
            
            // Stats Grid
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatBox(
                        label = "Rounds",
                        value = session.rounds.size.toString(),
                        modifier = Modifier.weight(1f)
                    )
                    StatBox(
                        label = "Arrows",
                        value = totalArrows.toString(),
                        modifier = Modifier.weight(1f)
                    )
                    StatBox(
                        label = "Avg/Arrow",
                        value = avgPerArrow,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            // Session Info
            item {
                Surface(
                    color = DarkSurface,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        if (session.bowName != null) {
                            InfoRow(
                                icon = Icons.Default.Sports,
                                label = "Bow",
                                value = session.bowName
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        if (session.distance != null) {
                            InfoRow(
                                icon = Icons.Default.Straighten,
                                label = "Distance",
                                value = session.distance
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        InfoRow(
                            icon = Icons.Default.Adjust,
                            label = "Target",
                            value = TargetType.fromString(session.targetType).displayName
                        )
                    }
                }
            }
            
            // Round Details
            item {
                Text(
                    text = "Round Details",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            
            items(session.rounds) { round ->
                RoundCard(round = round)
            }
            
            // Action Buttons
            item {
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SecondaryButton(
                        text = "Add Round",
                        onClick = onNewRound,
                        icon = Icons.Default.Add,
                        modifier = Modifier.weight(1f)
                    )
                    PrimaryButton(
                        text = "Done",
                        onClick = onDone,
                        icon = Icons.Default.Check,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun StatBox(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = DarkSurface,
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = value,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = label,
                fontSize = 12.sp,
                color = DarkOnSurfaceVariant
            )
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            fontSize = 14.sp,
            color = DarkOnSurfaceVariant,
            modifier = Modifier.width(80.dp)
        )
        Text(
            text = value,
            fontSize = 14.sp,
            color = Color.White,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun RoundCard(round: Round) {
    Surface(
        color = DarkSurface,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "R${round.roundNumber}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = DarkOnSurfaceVariant,
                modifier = Modifier.width(40.dp)
            )
            
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                round.shots.forEach { shot ->
                    ShotBadge(score = shot.ring)
                }
            }
            
            Text(
                text = round.totalScore.toString(),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Primary
            )
        }
    }
}
