package com.archeryscorer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.archeryscorer.app.ui.theme.*

data class Arrow(val score: Int, val color: Color)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoringScreen(
    onBack: () -> Unit,
    onFinish: () -> Unit
) {
    var arrows by remember { mutableStateOf(listOf<Arrow>()) }
    val scores = listOf(10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0)
    val scoreColors = mapOf(
        10 to Color(0xFFFFD700),
        9 to Color(0xFFFFD700),
        8 to Color(0xFFFF0000),
        7 to Color(0xFFFF0000),
        6 to Color(0xFF0066FF),
        5 to Color(0xFF0066FF),
        4 to Color(0xFF000000),
        3 to Color(0xFF000000),
        2 to Color(0xFFFFFFFF),
        1 to Color(0xFFFFFFFF),
        0 to Color(0xFF888888)
    )
    
    val totalScore = arrows.sumOf { it.score }
    val avgScore = if (arrows.isNotEmpty()) totalScore.toFloat() / arrows.size else 0f
    
    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Score Arrows", color = TextPrimary) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Score Summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("$totalScore", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                        Text("Total", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${arrows.size}", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                        Text("Arrows", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("%.1f".format(avgScore), style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                        Text("Avg", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Arrows List
            if (arrows.isNotEmpty()) {
                Text("Arrows", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(arrows.withIndex().toList()) { (index, arrow) ->
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(arrow.color)
                                .border(2.dp, if (arrow.score <= 1) Color.Gray else Color.Transparent, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "${arrow.score}",
                                color = if (arrow.score in 2..5) Color.White else Color.Black,
                                style = MaterialTheme.typography.titleMedium
                            )
                        }
                    }
                    item {
                        if (arrows.isNotEmpty()) {
                            IconButton(
                                onClick = { arrows = arrows.dropLast(1) },
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(DarkSurface)
                            ) {
                                Icon(Icons.Default.Delete, "Remove last", tint = DarkRed)
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Score Buttons
            Text("Tap to add score", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Spacer(modifier = Modifier.height(12.dp))
            
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Gold row (10, 9)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(10, 9).forEach { score ->
                        ScoreButton(
                            score = score,
                            color = scoreColors[score]!!,
                            modifier = Modifier.weight(1f),
                            onClick = { arrows = arrows + Arrow(score, scoreColors[score]!!) }
                        )
                    }
                }
                // Red row (8, 7)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(8, 7).forEach { score ->
                        ScoreButton(
                            score = score,
                            color = scoreColors[score]!!,
                            modifier = Modifier.weight(1f),
                            onClick = { arrows = arrows + Arrow(score, scoreColors[score]!!) }
                        )
                    }
                }
                // Blue row (6, 5)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(6, 5).forEach { score ->
                        ScoreButton(
                            score = score,
                            color = scoreColors[score]!!,
                            modifier = Modifier.weight(1f),
                            onClick = { arrows = arrows + Arrow(score, scoreColors[score]!!) }
                        )
                    }
                }
                // Black row (4, 3)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(4, 3).forEach { score ->
                        ScoreButton(
                            score = score,
                            color = scoreColors[score]!!,
                            modifier = Modifier.weight(1f),
                            onClick = { arrows = arrows + Arrow(score, scoreColors[score]!!) }
                        )
                    }
                }
                // White & Miss row (2, 1, M)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(2, 1, 0).forEach { score ->
                        ScoreButton(
                            score = score,
                            color = scoreColors[score]!!,
                            modifier = Modifier.weight(1f),
                            onClick = { arrows = arrows + Arrow(score, scoreColors[score]!!) },
                            label = if (score == 0) "M" else null
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Finish Button
            Button(
                onClick = onFinish,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DarkRed),
                enabled = arrows.isNotEmpty()
            ) {
                Icon(Icons.Default.Check, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Finish Round", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

@Composable
private fun ScoreButton(
    score: Int,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    label: String? = null
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color),
        contentPadding = PaddingValues(0.dp)
    ) {
        Text(
            text = label ?: "$score",
            style = MaterialTheme.typography.titleLarge,
            color = if (score in 2..5) Color.White else Color.Black
        )
    }
}
