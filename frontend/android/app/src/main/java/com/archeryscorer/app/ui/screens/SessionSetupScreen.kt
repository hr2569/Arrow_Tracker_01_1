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

@Composable
fun SessionSetupScreen(
    bows: List<Bow>,
    onStartSession: (bowId: String?, bowName: String?, distance: String, targetType: TargetType) -> Unit,
    onBack: () -> Unit
) {
    var selectedBow by remember { mutableStateOf<Bow?>(null) }
    var selectedDistance by remember { mutableStateOf("18m") }
    var selectedTargetType by remember { mutableStateOf(TargetType.WA_STANDARD) }
    
    val distances = listOf("10m", "18m", "20m", "25m", "30m", "40m", "50m", "60m", "70m", "90m")
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        TopBar(
            title = "Session Setup",
            onBackClick = onBack
        )
        
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            contentPadding = PaddingValues(vertical = 20.dp)
        ) {
            // Target Type Selection
            item {
                SectionTitle("Target Type")
                Spacer(modifier = Modifier.height(12.dp))
                
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TargetType.entries.forEach { type ->
                        SelectableCard(
                            title = type.displayName,
                            selected = selectedTargetType == type,
                            onClick = { selectedTargetType = type }
                        )
                    }
                }
            }
            
            // Distance Selection
            item {
                SectionTitle("Distance")
                Spacer(modifier = Modifier.height(12.dp))
                
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    distances.forEach { distance ->
                        FilterChip(
                            selected = selectedDistance == distance,
                            onClick = { selectedDistance = distance },
                            label = { Text(distance) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Primary,
                                selectedLabelColor = Color.White,
                                containerColor = DarkSurface,
                                labelColor = DarkOnSurfaceVariant
                            )
                        )
                    }
                }
            }
            
            // Bow Selection
            item {
                SectionTitle("Bow (Optional)")
                Spacer(modifier = Modifier.height(12.dp))
                
                if (bows.isEmpty()) {
                    Text(
                        text = "No bows configured. Add bows in the Bows section.",
                        fontSize = 14.sp,
                        color = DarkOnSurfaceVariant
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectableCard(
                            title = "No bow selected",
                            selected = selectedBow == null,
                            onClick = { selectedBow = null }
                        )
                        
                        bows.forEach { bow ->
                            SelectableCard(
                                title = bow.name,
                                subtitle = BowType.fromString(bow.type).displayName,
                                selected = selectedBow?.id == bow.id,
                                onClick = { selectedBow = bow }
                            )
                        }
                    }
                }
            }
            
            // Start Button
            item {
                Spacer(modifier = Modifier.height(16.dp))
                
                PrimaryButton(
                    text = "Start Scoring",
                    onClick = {
                        onStartSession(
                            selectedBow?.id,
                            selectedBow?.name,
                            selectedDistance,
                            selectedTargetType
                        )
                    },
                    icon = Icons.Default.PlayArrow,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        color = Color.White
    )
}

@Composable
private fun SelectableCard(
    title: String,
    selected: Boolean,
    onClick: () -> Unit,
    subtitle: String? = null
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = if (selected) Primary else DarkSurface,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        fontSize = 13.sp,
                        color = if (selected) Color.White.copy(alpha = 0.8f) else DarkOnSurfaceVariant
                    )
                }
            }
            
            if (selected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRow(
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    verticalArrangement: Arrangement.Vertical = Arrangement.Top,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        horizontalArrangement = horizontalArrangement,
        verticalArrangement = verticalArrangement,
        content = { content() }
    )
}
