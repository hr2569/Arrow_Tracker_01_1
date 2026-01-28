package com.archeryscorer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HistoryScreen(
    sessions: List<Session>,
    isLoading: Boolean,
    onSessionClick: (Session) -> Unit,
    onDeleteSession: (String) -> Unit,
    onBack: () -> Unit,
    onRefresh: () -> Unit
) {
    var expandedSessionId by remember { mutableStateOf<String?>(null) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        TopBar(
            title = "Score History",
            onBackClick = onBack
        )
        
        if (isLoading) {
            LoadingIndicator(text = "Loading sessions...")
        } else if (sessions.isEmpty()) {
            EmptyState(
                icon = Icons.Default.History,
                title = "No Sessions Yet",
                message = "Start a new scoring session to track your progress!"
            )
        } else {
            // Stats Overview
            val totalSessions = sessions.size
            val totalRounds = sessions.sumOf { it.rounds.size }
            val totalPoints = sessions.sumOf { it.totalScore }
            
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Overview Card
                item {
                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatCard(value = totalSessions.toString(), label = "Sessions")
                            Divider(
                                modifier = Modifier
                                    .height(40.dp)
                                    .width(1.dp),
                                color = Color(0xFF333333)
                            )
                            StatCard(value = totalRounds.toString(), label = "Rounds")
                            Divider(
                                modifier = Modifier
                                    .height(40.dp)
                                    .width(1.dp),
                                color = Color(0xFF333333)
                            )
                            StatCard(value = totalPoints.toString(), label = "Total Pts")
                        }
                    }
                }
                
                // Session Cards
                items(sessions.sortedByDescending { it.createdAt }) { session ->
                    SessionCard(
                        session = session,
                        isExpanded = expandedSessionId == session.id,
                        onClick = { expandedSessionId = if (expandedSessionId == session.id) null else session.id },
                        onDelete = { onDeleteSession(session.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SessionCard(
    session: Session,
    isExpanded: Boolean,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = DarkSurface,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = formatDate(session.createdAt),
                        fontSize = 12.sp,
                        color = DarkOnSurfaceVariant
                    )
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = session.totalScore.toString(),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    Text(
                        text = "pts",
                        fontSize = 12.sp,
                        color = DarkOnSurfaceVariant
                    )
                }
            }
            
            // Session info row
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (session.bowName != null) {
                    InfoChip(
                        icon = Icons.Default.Sports,
                        text = session.bowName
                    )
                }
                if (session.distance != null) {
                    InfoChip(
                        icon = Icons.Default.Straighten,
                        text = session.distance
                    )
                }
                InfoChip(
                    icon = Icons.Default.Layers,
                    text = "${session.rounds.size} rounds"
                )
            }
            
            // Expanded content
            if (isExpanded) {
                Spacer(modifier = Modifier.height(16.dp))
                Divider(color = Color(0xFF333333))
                Spacer(modifier = Modifier.height(16.dp))
                
                // Round details
                session.rounds.forEach { round ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "R${round.roundNumber}",
                            fontSize = 12.sp,
                            color = DarkOnSurfaceVariant,
                            modifier = Modifier.width(32.dp)
                        )
                        
                        Row(
                            modifier = Modifier.weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            round.shots.forEach { shot ->
                                ShotBadge(score = shot.ring)
                            }
                        }
                        
                        Text(
                            text = round.totalScore.toString(),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Delete button
                TextButton(
                    onClick = { showDeleteDialog = true },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Error
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Delete Session")
                }
            }
            
            // Expand indicator
            Icon(
                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = null,
                tint = DarkOnSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
    
    // Delete confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Session?") },
            text = { Text("This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteDialog = false
                    }
                ) {
                    Text("Delete", color = Error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            },
            containerColor = DarkSurface
        )
    }
}

@Composable
private fun InfoChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        modifier = Modifier
            .background(
                color = Primary.copy(alpha = 0.15f),
                shape = RoundedCornerShape(8.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Primary,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            fontSize = 12.sp,
            color = Primary,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM d, yyyy h:mm a", Locale.getDefault())
        val date = inputFormat.parse(dateString.substringBefore("."))
        date?.let { outputFormat.format(it) } ?: dateString
    } catch (e: Exception) {
        dateString
    }
}
