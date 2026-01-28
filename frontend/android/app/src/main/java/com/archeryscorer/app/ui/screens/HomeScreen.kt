package com.archeryscorer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.archeryscorer.app.ui.theme.*

@Composable
fun HomeScreen(
    onNewSession: () -> Unit,
    onHistory: () -> Unit,
    onBows: () -> Unit,
    onSettings: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(24.dp)
    ) {
        // Header with settings
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Archery",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Scorer",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
            }
            
            IconButton(
                onClick = onSettings,
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = DarkSurface,
                        shape = RoundedCornerShape(12.dp)
                    )
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Settings",
                    tint = Color.White
                )
            }
        }
        
        Spacer(modifier = Modifier.height(48.dp))
        
        // Main action button
        HomeMenuButton(
            icon = Icons.Default.Add,
            title = "New Session",
            subtitle = "Start scoring your arrows",
            onClick = onNewSession,
            isPrimary = true,
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Secondary buttons row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            HomeMenuButton(
                icon = Icons.Default.History,
                title = "History",
                subtitle = "View past sessions",
                onClick = onHistory,
                modifier = Modifier.weight(1f)
            )
            
            HomeMenuButton(
                icon = Icons.Default.Sports,
                title = "Bows",
                subtitle = "Manage equipment",
                onClick = onBows,
                modifier = Modifier.weight(1f)
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Footer
        Text(
            text = "Manual scoring for archery training",
            fontSize = 14.sp,
            color = DarkOnSurfaceVariant,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}

@Composable
private fun HomeMenuButton(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isPrimary: Boolean = false
) {
    Surface(
        modifier = modifier
            .clickable(onClick = onClick),
        color = if (isPrimary) Primary else DarkSurface,
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = if (isPrimary) Color.White.copy(alpha = 0.2f) else Primary.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(12.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isPrimary) Color.White else Primary,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = subtitle,
                    fontSize = 13.sp,
                    color = if (isPrimary) Color.White.copy(alpha = 0.8f) else DarkOnSurfaceVariant
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = if (isPrimary) Color.White.copy(alpha = 0.7f) else DarkOnSurfaceVariant
            )
        }
    }
}
